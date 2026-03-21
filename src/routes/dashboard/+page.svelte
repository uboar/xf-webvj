<script lang="ts">
	import { onMount } from 'svelte';
	import Deck from '../../components/Deck.svelte';
	import type { DeckType, DownloadMovieRequest, DownloadStatus } from '$lib/types';
	import { WSClientConnection } from '$lib/ws-client';
	import { extractYouTubeVideoId } from '$lib/youtube';
	import MovieList from '../../components/MovieList.svelte';
	import MovieDownload from '../../components/MovieDownload.svelte';
	import RenameModal from '../../components/RenameModal.svelte';
	import TabNavigation from '../../components/TabNavigation.svelte';
	import DeckPreview from '../../components/DeckPreview.svelte';
	import MidiSettings from '../../components/MidiSettings.svelte';
	import PlaylistManager from '../../components/PlaylistManager.svelte';
	import { onXfdChange, onDeck1OpacityChange, onDeck2OpacityChange, updateCurrentValues } from '$lib/midi';
	import type { PlaylistFile } from '$lib/types';

	let movieList: string[] = $state([]);
	let wsClient: WSClientConnection | undefined = $state();

	let downloadMovie = $state<DownloadMovieRequest>({
		url: '',
		args: '-f bestvideo[height=720]'
	});

	let downloading = $state(false);
	let downloadStatuses = $state<DownloadStatus[]>([]);
	let downloadSummary = $state('');

	// 名前変更・削除用の状態
	let renameModalOpen = $state(false);
	let selectedMovie = $state('');
	let newMovieName = $state('');
	let renamingInProgress = $state(false);
	let deletingInProgress = $state(false);
	let showDeleteConfirm = $state(false);

	// 検索機能用の状態
	let searchQuery = $state('');
	let youtubeUrls = $state(['', '']);

	// タブ切り替え用の状態
	let activeTab = $state('deck');
	let playlist = $state<string[]>([]);

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

	// WebSocket接続状態
	let wsConnected = $state(false);

	const registerAndSync = () => {
		wsClient?.send({
			to: 'server',
			function: 'register-client',
			body: { role: 'dashboard' }
		});
		wsClient?.send({ to: 'server', function: 'get-deck-state' });
	};

	const refreshInfo = () => {
		getMovieList();
		registerAndSync();
	};

	onMount(() => {
		getMovieList();
		wsClient = new WSClientConnection();
		wsClient.onDisconnect = () => {
			wsConnected = false;
		};
		wsClient.onReconnect = () => {
			wsConnected = true;
			registerAndSync();
		};
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
					const status = body as { connected: boolean; count?: number };
					outputPageConnected = status.connected;
				}
			}
		});
		
		// WebSocket接続を確立し、接続後の処理を行う
		wsClient?.connect.then(() => {
			wsConnected = true;
			registerAndSync();
		});

		// キーボードイベントリスナーを追加
		window.addEventListener('keydown', handleKeyDown);

		// コンポーネントのアンマウント時にイベントリスナーを削除
		return () => {
			window.removeEventListener('keydown', handleKeyDown);
			wsClient?.destroy();
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

	const getParentPath = (moviePath: string) => {
		const lastSlashIndex = moviePath.lastIndexOf('/');
		return lastSlashIndex === -1 ? '' : moviePath.slice(0, lastSlashIndex);
	};

	const getMovieList = async () => {
		const res = await fetch('/api/get-movie-list');
		movieList = await res.json();
	};

	const addToPlaylist = (movie: string) => {
		playlist = [...playlist, movie];
	};

	const reorderPlaylistItem = (fromIndex: number, toIndex: number) => {
		if (fromIndex < 0 || fromIndex >= playlist.length) return;
		if (toIndex < 0 || toIndex >= playlist.length) return;
		if (fromIndex === toIndex) return;

		const nextPlaylist = [...playlist];
		const [item] = nextPlaylist.splice(fromIndex, 1);
		nextPlaylist.splice(toIndex, 0, item);
		playlist = nextPlaylist;
	};

	const removePlaylistItem = (index: number) => {
		playlist = playlist.filter((_, itemIndex) => itemIndex !== index);
	};

	const clearPlaylist = () => {
		playlist = [];
	};

	const downloadPlaylist = () => {
		const payload: PlaylistFile = {
			version: 1,
			items: playlist
		};
		const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement('a');
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

		anchor.href = url;
		anchor.download = `playlist-${timestamp}.json`;
		anchor.click();
		URL.revokeObjectURL(url);
	};

	const importPlaylist = async (file: File) => {
		try {
			const text = await file.text();
			const parsed = JSON.parse(text) as Partial<PlaylistFile> | string[];
			const items = Array.isArray(parsed)
				? parsed
				: Array.isArray(parsed.items)
					? parsed.items
					: null;

			if (!items || !items.every((item) => typeof item === 'string')) {
				alert('プレイリストJSONの形式が不正です。');
				return;
			}

			playlist = [...items];
			activeTab = 'playlist';
		} catch (error) {
			console.error('Failed to import playlist:', error);
			alert('プレイリストJSONの読み込みに失敗しました。');
		}
	};

	const loadMovie = (deck: number, name: string) => {
		decks[deck].movie = name;
		decks[deck].sourceType = 'local';
		decks[deck].title = undefined;
		decks[deck].playing = false;
		decks[deck].length = undefined;
		decks[deck].position = undefined;
		decks[deck].rate = undefined;
		sendDeckState();
	};

	const loadYoutubeMovie = async (deck: number) => {
		const value = youtubeUrls[deck]?.trim() ?? '';
		const videoId = extractYouTubeVideoId(value);
		if (!videoId) {
			alert('有効な YouTube URL または動画IDを入力してください。');
			return;
		}

		decks[deck].movie = value;
		decks[deck].sourceType = 'youtube';
		decks[deck].title = undefined;
		decks[deck].playing = false;
		decks[deck].length = undefined;
		decks[deck].position = undefined;
		decks[deck].rate = 1;
		youtubeUrls[deck] = '';
		sendDeckState();

		try {
			const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
			const res = await fetch(oembedUrl);
			if (res.ok) {
				const data = await res.json();
				decks[deck].title = data.title;
				sendDeckState();
			}
		} catch {
			// タイトル取得失敗は無視
		}
	};

	const movieDownload = async () => {
		downloading = true;
		downloadStatuses = [];
		downloadSummary = '';

		// Parse URLs to initialize statuses
		const urls = downloadMovie.url
			.split(/[\n\r]+/)
			.map((line) => line.trim())
			.filter((line) => line.length > 0 && !line.startsWith('#'));

		downloadStatuses = urls.map((url, index) => ({
			url,
			index,
			state: 'pending' as const,
			message: '待機中...'
		}));

		try {
			const response = await fetch('/api/download-movie', {
				method: 'POST',
				body: JSON.stringify(downloadMovie)
			});

			if (!response.ok || !response.body) {
				downloadSummary = 'ダウンロードリクエストに失敗しました';
				downloading = false;
				return;
			}

			const reader = response.body.getReader();
			const decoder = new TextDecoder();
			let buffer = '';

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split('\n\n');
				buffer = lines.pop() ?? '';

				for (const block of lines) {
					const dataLine = block.trim();
					if (!dataLine.startsWith('data: ')) continue;
					const json = dataLine.slice(6);
					try {
						const event = JSON.parse(json);
						if (event.type === 'progress' && event.index < downloadStatuses.length) {
							downloadStatuses[event.index] = {
								...downloadStatuses[event.index],
								state: 'downloading',
								message: event.message
							};
						} else if (event.type === 'complete' && event.index < downloadStatuses.length) {
							downloadStatuses[event.index] = {
								...downloadStatuses[event.index],
								state: 'complete',
								message: 'ダウンロード完了',
								fileName: event.fileName
							};
						} else if (event.type === 'error' && event.index < downloadStatuses.length) {
							downloadStatuses[event.index] = {
								...downloadStatuses[event.index],
								state: 'error',
								message: event.message
							};
						} else if (event.type === 'done') {
							if (event.failed === 0) {
								downloadSummary = `全${event.total}件のダウンロードが完了しました`;
							} else {
								downloadSummary = `${event.total}件中 ${event.success}件成功, ${event.failed}件失敗`;
							}
						}
					} catch {
						// ignore parse errors
					}
				}
			}
		} catch (error) {
			downloadSummary = 'ダウンロード中にエラーが発生しました';
		}

		await getMovieList();
		downloading = false;
		downloadMovie.url = '';
	};

	// 名前変更モーダルを開く
	const openRenameModal = (movie: string) => {
		selectedMovie = movie;
		newMovieName = movie.split('/').pop() ?? movie;
		renameModalOpen = true;
	};

	// ファイル名を変更する
	const renameMovie = async () => {
		try {
			renamingInProgress = true;
			const parentDir = getParentPath(selectedMovie);
			const targetMovieName =
				parentDir && !newMovieName.includes('/') ? `${parentDir}/${newMovieName}` : newMovieName;

			const response = await fetch('/api/rename-movie', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					oldName: selectedMovie,
					newName: targetMovieName
				})
			});

			const result = await response.json();

			if (response.ok) {
				// デッキに読み込まれている場合は更新
				if (decks[0].movie === selectedMovie) {
					decks[0].movie = targetMovieName;
					sendDeckState();
				}
				if (decks[1].movie === selectedMovie) {
					decks[1].movie = targetMovieName;
					sendDeckState();
				}
				playlist = playlist.map((movie) => (movie === selectedMovie ? targetMovieName : movie));

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
				playlist = playlist.filter((movie) => movie !== selectedMovie);

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
	<div class="border-base-300 border-y-2">
		<TabNavigation
			{activeTab}
			{wsConnected}
			{outputPageConnected}
			onreconnect={() => wsClient?.reconnect()}
			onrefresh={refreshInfo}
			on:changetab={(e) => (activeTab = e.detail.tab)}
		/>
	</div>

	{#if activeTab === 'deck'}
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
		{:else}
			<div class="p-4 text-center">
				<p>デッキの情報を読み込み中...</p>
			</div>
		{/if}
	{:else if activeTab === 'movies'}
		<MovieList
			{movieList}
			bind:searchQuery
			on:loadmovie={(e) => loadMovie(e.detail.deck, e.detail.movie)}
			on:addtoplaylist={(e) => addToPlaylist(e.detail.movie)}
			on:openrenamemodal={(e) => openRenameModal(e.detail.movie)}
			on:getmovielist={getMovieList}
			on:changetab={(e) => (activeTab = e.detail.tab)}
		/>
	{:else if activeTab === 'youtube'}
		<div class="border-base-300 border-b px-4 py-4">
			<div class="mb-3 flex items-center justify-between gap-2">
				<h3 class="text-md font-semibold">YouTube埋め込み</h3>
				<span class="text-base-content/70 text-xs">URL または動画IDを各デッキへ直接ロード</span>
			</div>
			<div class="grid grid-cols-1 gap-3 md:grid-cols-2">
				{#each [0, 1] as deckIndex}
					<div class="bg-base-200 rounded-lg border p-3">
						<div class="mb-2 text-sm font-medium">Deck {deckIndex + 1}</div>
						<div class="flex gap-2">
							<input
								type="text"
								class="input input-bordered w-full"
								placeholder="https://www.youtube.com/watch?v=..."
								bind:value={youtubeUrls[deckIndex]}
								onkeydown={(event) => {
									if (event.key === 'Enter') {
										loadYoutubeMovie(deckIndex);
									}
								}}
							/>
							<button class="btn btn-primary shrink-0 rounded-full" onclick={() => loadYoutubeMovie(deckIndex)}>
								Load
							</button>
						</div>
						<div class="text-base-content/60 mt-2 text-xs">
							埋め込み再生のため、YouTube側の制約で一部動画は再生できない場合があります。
						</div>
					</div>
				{/each}
			</div>
		</div>
	{:else if activeTab === 'playlist'}
		<PlaylistManager
			{playlist}
			{movieList}
			on:loadmovie={(e) => loadMovie(e.detail.deck, e.detail.movie)}
			on:reorderitem={(e) => reorderPlaylistItem(e.detail.fromIndex, e.detail.toIndex)}
			on:removeitem={(e) => removePlaylistItem(e.detail.index)}
			on:downloadplaylist={downloadPlaylist}
			on:importplaylist={(e) => importPlaylist(e.detail.file)}
			on:clearplaylist={clearPlaylist}
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
			{downloadStatuses}
			{downloadSummary}
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
