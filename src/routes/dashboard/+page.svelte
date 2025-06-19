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

	let movieList: string[] = $state([]);
	let wsClient: WSClientConnection | undefined = $state();

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

	// タブ切り替え用の状態
	let activeTab = $state('movies'); // 'movies' または 'download'

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
		await wsClient.connect;
		wsClient.send({ to: 'server', function: 'get-deck-state' });
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
</script>

<svelte:head>
	<title>xf-webvj dashboard</title>
</svelte:head>
<div class="w-screen">
	{#if decks.length >= 2}
		<div class="grid grid-cols-5 gap-4">
			<div class="col-span-2">
				{#if wsClient}
					<Deck
						bind:deckInfo={decks[0]}
						{wsClient}
						senddeck={() => {
							sendDeckState();
						}}
					></Deck>
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
			<div class="py-4">
				<div class="mb-2 text-center text-sm">Crossfade</div>
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
				{#if wsClient}
					<Deck
						bind:deckInfo={decks[1]}
						{wsClient}
						senddeck={() => {
							sendDeckState();
						}}
					></Deck>
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
