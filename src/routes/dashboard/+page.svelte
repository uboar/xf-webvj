<script lang="ts">
	import { onMount } from 'svelte';
	import Deck from '../../components/Deck.svelte';
	import type { DeckType, DownloadMovieRequest } from '$lib/types';
	import { WSClientConnection } from '$lib/ws-client';

	let movieList: string[] = $state([]);
	let wsClient: WSClientConnection = $state();

	let downloadMovie: DownloadMovieRequest = {
		url: '',
		args: '-f bestvideo[height=720]'
	};

	let downloading = $state(false);
	
	// 名前変更・削除用の状態
	let renameModalOpen = $state(false);
	let selectedMovie = $state('');
	let newMovieName = $state('');
	let renamingInProgress = $state(false);
	let deletingInProgress = $state(false);
	let showDeleteConfirm = $state(false);
	
	// 検索機能用の状態
	let searchQuery = $state('');
	let filteredMovieList = $derived(
		searchQuery 
			? movieList.filter(movie => 
				movie.toLowerCase().includes(searchQuery.toLowerCase())
			)
			: movieList
	);
	
	// 検索語句をハイライト表示する関数
	const highlightSearchTerm = (text: string, query: string) => {
		if (!query) return text;
		
		const lowerText = text.toLowerCase();
		const lowerQuery = query.toLowerCase();
		const index = lowerText.indexOf(lowerQuery);
		
		if (index === -1) return text;
		
		const before = text.substring(0, index);
		const match = text.substring(index, index + query.length);
		const after = text.substring(index + query.length);
		
		return `${before}<span class="bg-warning/30 font-semibold">${match}</span>${after}`;
	};

	let decks: DeckType[] = $state([]);

	let xfd = $state(50);
	let deck1Opacity = $state(100);
	let deck2Opacity = $state(100);

	onMount(async () => {
		getMovieList();
		wsClient = new WSClientConnection();
		wsClient.attachEvent({
			to: 'dashboard',
			function: 'get-deck-state',
			event: (ws, body) => {
				if (body) {
					decks = body as DeckType[];
					// 初期化時のみデッキの透明度をUIに反映
					if (decks[0]?.opacity !== undefined && deck1Opacity === 100) {
						deck1Opacity = Math.round(decks[0].opacity * 100);
					}
					if (decks[1]?.opacity !== undefined && deck2Opacity === 100) {
						deck2Opacity = Math.round(decks[1].opacity * 100);
					}
				}
			}
		});
		wsClient.attachEvent({
			to: 'dashboard',
			function: 'opacity-state-sync',
			event: (ws, body) => {
				if (body) {
					const opacityState = body as { deck1BaseOpacity: number; deck2BaseOpacity: number; crossfadeValue: number };
					// サーバーからの同期は、ユーザーが操作中でない場合のみ適用
					const newDeck1Opacity = Math.round(opacityState.deck1BaseOpacity * 100);
					const newDeck2Opacity = Math.round(opacityState.deck2BaseOpacity * 100);
					const newXfd = Math.round(opacityState.crossfadeValue * 100);
					
					// 値が実際に変更された場合のみ更新（無限ループを防ぐ）
					if (Math.abs(deck1Opacity - newDeck1Opacity) > 1) {
						deck1Opacity = newDeck1Opacity;
					}
					if (Math.abs(deck2Opacity - newDeck2Opacity) > 1) {
						deck2Opacity = newDeck2Opacity;
					}
					if (Math.abs(xfd - newXfd) > 1) {
						xfd = newXfd;
					}
				}
			}
		});
		await wsClient.connect;
		wsClient.send({ to: 'server', function: 'get-deck-state' });
	});

	const sendDeckState = () => {
		wsClient.send({
			to: 'server',
			function: 'update-deck-state',
			body: decks
		});
	};

	const sendXFD = () => {
		wsClient.send({
			to: 'server',
			function: 'update-opacity',
			body: { type: 'crossfade', opacity: xfd * 0.01 }
		});
	};

	const sendDeckOpacity = (deckIndex: number, opacity: number) => {
		// デッキの状態も更新（透明度のみ）
		if (decks[deckIndex]) {
			decks[deckIndex].opacity = opacity * 0.01;
		}
		
		wsClient.send({
			to: 'server',
			function: 'update-opacity',
			body: { type: 'deck', deckIndex, opacity: opacity * 0.01 }
		});
		
		// 透明度変更時はデッキ状態の送信を行わない（再生状態を保持）
		// sendDeckState(); // この行をコメントアウト
	};
	const getMovieList = async () => {
		const res = await fetch('/api/get-movie-list');
		movieList = await res.json();
	};

	const loadMovie = (deck: number, name: string) => {
		decks[deck].movie = name;
		decks[deck].playing = false;
		decks[deck].length = undefined;
		decks[deck].position = undefined;
		decks[deck].rate = undefined;
		sendDeckState();
	};

	const movieDownload = async () => {
		downloading = true;
		await fetch('/api/download-movie', { method: 'POST', body: JSON.stringify(downloadMovie) });
		await getMovieList();
		downloading = false;
		downloadMovie.url = '';
	};
	
	// 名前変更モーダルを開く
	const openRenameModal = (movie: string) => {
		selectedMovie = movie;
		newMovieName = movie;
		renameModalOpen = true;
	};
	
	// ファイル名を変更する
	const renameMovie = async () => {
		try {
			renamingInProgress = true;
			
			const response = await fetch('/api/rename-movie', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					oldName: selectedMovie,
					newName: newMovieName
				})
			});
			
			const result = await response.json();
			
			if (response.ok) {
				// デッキに読み込まれている場合は更新
				if (decks[0].movie === selectedMovie) {
					decks[0].movie = newMovieName;
					sendDeckState();
				}
				if (decks[1].movie === selectedMovie) {
					decks[1].movie = newMovieName;
					sendDeckState();
				}
				
				// リストを更新
				await getMovieList();
				renameModalOpen = false;
			} else {
				alert(`エラー: ${result.error}`);
			}
		} catch (error) {
			console.error('Failed to rename movie:', error);
			alert('ファイル名の変更に失敗しました。詳細はコンソールを確認してください。');
		} finally {
			renamingInProgress = false;
		}
	};
	
	// 動画ファイルを削除する
	const deleteMovie = async () => {
		try {
			deletingInProgress = true;
			
			const response = await fetch('/api/delete-movie', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					fileName: selectedMovie
				})
			});
			
			const result = await response.json();
			
			if (response.ok) {
				// デッキに読み込まれている場合はクリア
				if (decks[0].movie === selectedMovie) {
					decks[0].movie = "";
					decks[0].playing = false;
					decks[0].length = undefined;
					decks[0].position = undefined;
					sendDeckState();
				}
				if (decks[1].movie === selectedMovie) {
					decks[1].movie = "";
					decks[1].playing = false;
					decks[1].length = undefined;
					decks[1].position = undefined;
					sendDeckState();
				}
				
				// リストを更新
				await getMovieList();
				renameModalOpen = false;
				showDeleteConfirm = false;
			} else {
				alert(`エラー: ${result.error}`);
			}
		} catch (error) {
			console.error('Failed to delete movie:', error);
			alert('ファイルの削除に失敗しました。詳細はコンソールを確認してください。');
		} finally {
			deletingInProgress = false;
		}
	};
</script>

<svelte:head>
  <title>xf-webvj dashboard</title>
</svelte:head>
<div class="w-screen">
	{#if decks.length >= 2}
		<div class="grid grid-cols-5 gap-4">
			<div class="col-span-2">
				<Deck
					bind:deckInfo={decks[0]}
					{wsClient}
					senddeck={() => {
						sendDeckState();
					}}
				></Deck>
				<div class="p-4 border-t border-base-300">
					<div class="text-center text-sm mb-2">Deck 1 Opacity</div>
					<input
						type="range"
						min="0"
						max="100"
						class="range range-sm w-full"
						bind:value={deck1Opacity}
						oninput={() => {
							sendDeckOpacity(0, deck1Opacity);
						}}
					/>
					<div class="text-center text-xs mt-1">{deck1Opacity}%</div>
				</div>
			</div>
			<div class="py-4">
				<div class="text-center text-sm mb-2">Crossfade</div>
				<input
					type="range"
					min="0"
					max="100"
					class="range w-full [--range-fill:0]"
					bind:value={xfd}
					oninput={() => {
						sendXFD();
					}}
				/>
			</div>
			<div class="col-span-2">
				<Deck
					bind:deckInfo={decks[1]}
					{wsClient}
					senddeck={() => {
						sendDeckState();
					}}
				></Deck>
				<div class="p-4 border-t border-base-300">
					<div class="text-center text-sm mb-2">Deck 2 Opacity</div>
					<input
						type="range"
						min="0"
						max="100"
						class="range range-sm w-full"
						bind:value={deck2Opacity}
						oninput={() => {
							sendDeckOpacity(1, deck2Opacity);
						}}
					/>
					<div class="text-center text-xs mt-1">{deck2Opacity}%</div>
				</div>
			</div>
		</div>
	{/if}

	<div class="flex flex-wrap gap-4 py-2 justify-between items-center border-y-2 border-base-300 px-4">
		<div class="flex gap-4 items-center">
			<h3 class="text-lg">Movies</h3>
			<button class="btn btn-outline btn-info btn-sm rounded-full" onclick={()=>{getMovieList()}}>sync</button>
		</div>
		<div class="flex-grow max-w-md">
			<div class="relative">
				<input 
					type="text" 
					class="input input-bordered w-full pr-10" 
					placeholder="動画を検索..." 
					bind:value={searchQuery}
				/>
				{#if searchQuery}
					<button 
						class="absolute right-2 top-1/2 -translate-y-1/2 btn btn-ghost btn-xs btn-circle"
						onclick={() => searchQuery = ''}
						title="検索をクリア"
					>
						<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
							<path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
						</svg>
					</button>
				{:else}
					<div class="absolute right-3 top-1/2 -translate-y-1/2 opacity-50">
						<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
							<path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
						</svg>
					</div>
				{/if}
			</div>
		</div>
	</div>
	<table class="table table-sm w-full border-b-2 border-base-300">
		<thead>
			<tr>
				<th>Deck 1</th>
				<th>Name</th>
				<th>Deck 2</th>
			</tr>
		</thead>
		<tbody>
			{#if filteredMovieList.length === 0}
				<tr>
					<td colspan="3" class="text-center py-8 text-base-content/70">
						{#if searchQuery}
							<div class="flex flex-col items-center gap-2">
								<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
									<path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
								</svg>
								<p>「{searchQuery}」に一致する動画が見つかりません</p>
								<button class="btn btn-sm btn-ghost" onclick={() => searchQuery = ''}>検索をクリア</button>
							</div>
						{:else}
							<div class="flex flex-col items-center gap-2">
								<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
									<path stroke-linecap="round" stroke-linejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
								</svg>
								<p>動画がありません</p>
								<p class="text-sm">下部の「Movie Download」から動画をダウンロードしてください</p>
							</div>
						{/if}
					</td>
				</tr>
			{:else}
				{#each filteredMovieList as movie}
					<tr>
						<td>
							<button
								class="btn btn-sm btn-outline w-full rounded-full"
								aria-label="deck1_load"
								onclick={() => {
									loadMovie(0, movie);
								}}
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
									stroke-width="1.5"
									stroke="currentColor"
									class="w-6"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
									/>
								</svg>
							</button>
						</td>
						<td>
							<span 
								class="truncate max-w-xs cursor-pointer hover:bg-base-200 px-2 py-1 rounded"
								ondblclick={() => openRenameModal(movie)}
								title="ダブルクリックして名前を変更"
							>
								{#if searchQuery}
									{@html highlightSearchTerm(movie, searchQuery)}
								{:else}
									{movie}
								{/if}
							</span>
						</td>
						<td>
							<button
								class="btn btn-sm btn-outline w-full rounded-full"
								aria-label="deck2_load"
								onclick={() => {
									loadMovie(1, movie);
								}}
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
									stroke-width="1.5"
									stroke="currentColor"
									class="w-6"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
									/>
								</svg>
							</button>
						</td>
					</tr>
				{/each}
			{/if}
		</tbody>
	</table>

	<div class="flex justify-center">
		<div class="card bg-base-200 w-96 shadow-sm">
			<div class="card-body">
				<div class="card-title">Movie Download</div>
				<div>
					<label class="input my-2">
						<input
							type="text"
							disabled={downloading}
							placeholder="Movie URL"
							bind:value={downloadMovie.url}
						/>
					</label>
					<textarea
						class="textarea my-2"
						disabled={downloading}
						placeholder="yt-dlp args"
						bind:value={downloadMovie.args}
					></textarea>
				</div>
				<div class="card-actions justify-end">
					<button
						class="btn btn-primary"
						disabled={downloading}
						onclick={() => {
							movieDownload();
						}}>Download</button
					>
				</div>
			</div>
		</div>
	</div>
</div>

<!-- 名前変更モーダル -->
{#if renameModalOpen}
<div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onclick={(e) => {
	// モーダル外をクリックした場合は閉じる
	if (e.target === e.currentTarget) renameModalOpen = false;
}}>
	<div class="bg-base-100 rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
		{#if showDeleteConfirm}
			<!-- 削除確認画面 -->
			<h3 class="font-bold text-lg mb-4 text-error">ファイルを削除しますか？</h3>
			<div class="py-2">
				<p class="mb-4">「{selectedMovie}」を削除します。この操作は元に戻せません。</p>
				<div class="bg-base-200 p-3 rounded-lg text-sm mb-2">
					<p class="font-semibold">注意:</p>
					<ul class="list-disc list-inside">
						<li>デッキに読み込まれている場合、デッキからも削除されます</li>
						<li>ファイルは完全に削除され、復元できません</li>
					</ul>
				</div>
			</div>
			<div class="modal-action">
				<button 
					class="btn btn-ghost btn-sm" 
					onclick={() => showDeleteConfirm = false}
					disabled={deletingInProgress}
				>
					キャンセル
				</button>
				<button 
					class="btn btn-error btn-sm" 
					onclick={deleteMovie}
					disabled={deletingInProgress}
				>
					{#if deletingInProgress}
						<span class="loading loading-spinner loading-xs"></span>
						削除中...
					{:else}
						削除する
					{/if}
				</button>
			</div>
		{:else}
			<!-- 名前変更画面 -->
			<h3 class="font-bold text-lg mb-4">ファイル名の変更</h3>
			<div class="py-2">
				<input 
					type="text" 
					class="input input-bordered w-full" 
					bind:value={newMovieName}
					placeholder="新しいファイル名を入力"
					autofocus
					onkeydown={(e) => {
						if (e.key === 'Enter' && newMovieName && newMovieName !== selectedMovie) {
							renameMovie();
						} else if (e.key === 'Escape') {
							renameModalOpen = false;
						}
					}}
				/>
				<p class="text-xs text-base-content/70 mt-2">元のファイル名: {selectedMovie}</p>
			</div>
			<div class="modal-action flex justify-between">
				<button 
					class="btn btn-error btn-sm" 
					onclick={() => showDeleteConfirm = true}
					disabled={renamingInProgress}
				>
					削除
				</button>
				
				<div>
					<button 
						class="btn btn-ghost btn-sm" 
						onclick={() => renameModalOpen = false}
						disabled={renamingInProgress}
					>
						キャンセル
					</button>
					<button 
						class="btn btn-primary btn-sm ml-2" 
						onclick={renameMovie}
						disabled={!newMovieName || newMovieName === selectedMovie || renamingInProgress}
					>
						{#if renamingInProgress}
							<span class="loading loading-spinner loading-xs"></span>
							処理中...
						{:else}
							変更
						{/if}
					</button>
				</div>
			</div>
		{/if}
		
	</div>
</div>
{/if}
