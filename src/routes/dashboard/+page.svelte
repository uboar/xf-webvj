<script lang="ts">
	import { onMount } from 'svelte';
	import Deck from '../../components/Deck.svelte';
	import type { DeckType, DownloadMovieRequest } from '$lib/types';
	import { WSClientConnection } from '$lib/ws-client';
	import MovieList from '../../components/MovieList.svelte';
	import MovieDownload from '../../components/MovieDownload.svelte';
	import RenameModal from '../../components/RenameModal.svelte';
	import TabNavigation from '../../components/TabNavigation.svelte';
	import DeckPreview from '../../components/DeckPreview.svelte';
	import MidiSettings from '../../components/MidiSettings.svelte';
	import { onXfdChange, onDeck1OpacityChange, onDeck2OpacityChange, updateCurrentValues } from '$lib/midi';

	let movieList: string[] = $state([]);
	let wsClient: WSClientConnection | undefined = $state();

	let downloadMovie = $state<DownloadMovieRequest>({
		url: '',
		args: '-f bestvideo[height=720]'
	});

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

	// タブ切り替え用の状態
	let activeTab = $state('movies'); // 'movies' または 'download'

	let decks: DeckType[] = $state([]);

	let xfd = $state(50);
	let deck1Opacity = $state(100);
	let deck2Opacity = $state(100);

	// クロスフェーダーの調整ステップ（キーボード操作時）
	const xfdStep = 1;
	
	
	// 動画読み込み状態
	let videoLoadingStates = $state([false, false]);
	
	// 出力ページの接続状態
	let outputPageConnected = $state(false);

	onMount(() => {
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
					const opacityState = body as {
						deck1BaseOpacity: number;
						deck2BaseOpacity: number;
						crossfadeValue: number;
					};
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
		
		
		// 動画読み込み状態を監視
		wsClient.attachEvent({
			to: 'dashboard',
			function: 'video-loading-status',
			event: (ws, body) => {
				if (body) {
					const status = body as { loadingStates: boolean[] };
					videoLoadingStates = status.loadingStates;
				}
			}
		});
		
		// 出力ページの接続状態を監視
		wsClient.attachEvent({
			to: 'dashboard',
			function: 'output-connection-status',
			event: (ws, body) => {
				if (body) {
					const status = body as { connected: boolean };
					outputPageConnected = status.connected;
				}
			}
		});
		
		// WebSocket接続を確立し、接続後の処理を行う
		wsClient?.connect.then(() => {
			wsClient?.send({ to: 'server', function: 'get-deck-state' });
		});

		// キーボードイベントリスナーを追加
		window.addEventListener('keydown', handleKeyDown);

		// コンポーネントのアンマウント時にイベントリスナーを削除
		return () => {
			window.removeEventListener('keydown', handleKeyDown);
		};
	});

	// MIDIコールバックを設定
	onMount(() => {
		onXfdChange.set((value) => {
			xfd = value;
			sendXFD();
		});
		onDeck1OpacityChange.set((value) => {
			deck1Opacity = value;
			sendDeck1Opacity();
		});
		onDeck2OpacityChange.set((value) => {
			deck2Opacity = value;
			sendDeck2Opacity();
		});
	});

	// 値の変更を監視してMIDIライブラリの現在値を更新
	$effect(() => {
		updateCurrentValues({
			xfd: xfd,
			deck1Opacity: deck1Opacity,
			deck2Opacity: deck2Opacity
		});
	});

	const sendDeckState = () => {
		if (!wsClient) return;
		wsClient.send({
			to: 'server',
			function: 'update-deck-state',
			body: decks
		});
	};

	const sendXFD = () => {
		if (!wsClient) return;
		wsClient.send({
			to: 'server',
			function: 'update-opacity',
			body: { type: 'crossfade', opacity: xfd * 0.01 }
		});
	};
	
	const sendDeck1Opacity = () => {
		if (!wsClient) return;
		sendDeckOpacity(0, deck1Opacity);
	};
	
	const sendDeck2Opacity = () => {
		if (!wsClient) return;
		sendDeckOpacity(1, deck2Opacity);
	};

	const sendDeckOpacity = (deckIndex: number, opacity: number) => {
		if (!wsClient) return;
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
					decks[0].movie = '';
					decks[0].playing = false;
					decks[0].length = undefined;
					decks[0].position = undefined;
					sendDeckState();
				}
				if (decks[1].movie === selectedMovie) {
					decks[1].movie = '';
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


	// キーボードの矢印キーでクロスフェーダーを操作する
	const handleKeyDown = (event: KeyboardEvent) => {
		// テキスト入力フィールドでの操作は無視
		if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
			return;
		}

		// 左矢印キー: クロスフェーダーを左に移動（値を減少）
		if (event.key === 'ArrowLeft') {
			event.preventDefault();

			// 値を更新
			xfd = Math.max(0, xfd - xfdStep);

			sendXFD();
		}
		// 右矢印キー: クロスフェーダーを右に移動（値を増加）
		else if (event.key === 'ArrowRight') {
			event.preventDefault();

			// 値を更新
			xfd = Math.min(100, xfd + xfdStep);

			sendXFD();
		}
	};
</script>

<svelte:head>
	<title>xf-webvj dashboard</title>
</svelte:head>
<div class="w-full max-w-screen overflow-x-hidden px-2 sm:px-4">
	{#if !outputPageConnected}
		<div class="alert alert-warning shadow-lg mb-4">
			<div>
				<svg xmlns="http://www.w3.org/2000/svg" class="stroke-current flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
				<div>
					<span class="font-bold">警告:</span> 出力ページが開かれていません。
					<a href="/output" target="_blank" class="btn btn-xs btn-primary ml-2">出力ページを開く</a>
				</div>
			</div>
		</div>
	{/if}
	
	{#if decks.length >= 2}
		<div class="grid grid-cols-1 md:grid-cols-5 gap-4">
			<div class="md:col-span-2">
				{#if wsClient}
					<div class="relative">
						<Deck
							bind:deckInfo={decks[0]}
							{wsClient}
							senddeck={() => {
								sendDeckState();
							}}
						></Deck>
						
						{#if videoLoadingStates[0]}
							<div class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 z-10">
								<div class="text-center">
									<div class="loading loading-spinner loading-lg text-warning mb-2"></div>
									<div class="text-warning font-bold">動画読み込み中...</div>
								</div>
							</div>
						{/if}
					</div>
				{/if}
				<div class="border-base-300 border-t p-4">
					<div class="mb-2 text-center text-sm">Deck 1 Opacity</div>
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
					<div class="mt-1 text-center text-xs">{deck1Opacity}%</div>
				</div>
			</div>
			<div class="py-4 md:col-span-1">
				<div class="mb-2 text-center text-sm">Crossfade</div>
				<input
					type="range"
					min="0"
					max="100"
					class="range range-primary range-lg w-full [--range-fill:0]"
					bind:value={xfd}
					oninput={() => {
						sendXFD();
					}}
				/>
			</div>
			<div class="md:col-span-2">
				{#if wsClient}
					<div class="relative">
						<Deck
							bind:deckInfo={decks[1]}
							{wsClient}
							senddeck={() => {
								sendDeckState();
							}}
						></Deck>
						
						{#if videoLoadingStates[1]}
							<div class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 z-10">
								<div class="text-center">
									<div class="loading loading-spinner loading-lg text-warning mb-2"></div>
									<div class="text-warning font-bold">動画読み込み中...</div>
								</div>
							</div>
						{/if}
					</div>
				{/if}
				<div class="border-base-300 border-t p-4">
					<div class="mb-2 text-center text-sm">Deck 2 Opacity</div>
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
					<div class="mt-1 text-center text-xs">{deck2Opacity}%</div>
				</div>
			</div>
		</div>
	{/if}

	<div class="border-base-300 border-y-2">
		<TabNavigation {activeTab} on:changetab={(e) => (activeTab = e.detail.tab)} />
	</div>

	{#if activeTab === 'movies'}
		<MovieList
			{movieList}
			bind:searchQuery
			on:loadmovie={(e) => loadMovie(e.detail.deck, e.detail.movie)}
			on:openrenamemodal={(e) => openRenameModal(e.detail.movie)}
			on:getmovielist={getMovieList}
			on:changetab={(e) => (activeTab = e.detail.tab)}
		/>
	{:else if activeTab === 'preview'}
		{#if wsClient && decks.length >= 2}
			<DeckPreview
				{decks}
				{wsClient}
				sendDeckState={() => {
					sendDeckState();
				}}
			/>
		{:else}
			<div class="p-4 text-center">
				<p>デッキの情報を読み込み中...</p>
			</div>
		{/if}
	{:else if activeTab === 'midi'}
		<MidiSettings 
			bind:xfd
			bind:deck1Opacity
			bind:deck2Opacity
		/>
	{:else}
		<MovieDownload
			{downloadMovie}
			{downloading}
			{movieList}
			on:moviedownload={movieDownload}
			on:changetab={(e) => (activeTab = e.detail.tab)}
		/>
	{/if}

	<RenameModal
		bind:renameModalOpen
		bind:selectedMovie
		bind:newMovieName
		bind:renamingInProgress
		bind:deletingInProgress
		bind:showDeleteConfirm
		on:renamemovie={renameMovie}
		on:deletemovie={deleteMovie}
		on:closemodal={() => (renameModalOpen = false)}
		on:setshowdeleteconfirm={(e) => (showDeleteConfirm = e.detail.value)}
	/>
</div>
