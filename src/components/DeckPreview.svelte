<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { DeckType } from '$lib/types';
	import type { WSClientConnection } from '$lib/ws-client';

	let {
		decks = $bindable(),
		wsClient = $bindable(),
		sendDeckState = $bindable()
	}: {
		decks: DeckType[];
		wsClient: WSClientConnection;
		sendDeckState?: () => void;
	} = $props();

	// プレビュー用のビデオ要素への参照
	let videoRefs: HTMLVideoElement[] = [];
	// 各デッキのビデオソースURL
	let videoSources = $state<string[]>([]);
	// ビデオロード状態
	let videoLoading = $state<boolean[]>([]);

	// ビデオ要素の初期化
	const initializeVideoElements = () => {
		if (!decks || decks.length === 0) return;

		// 各デッキに対応するビデオ要素の初期化（一度だけ）
		if (videoRefs.length === 0) {
			videoRefs = Array(decks.length).fill(null);
			videoSources = Array(decks.length).fill('');
			videoLoading = Array(decks.length).fill(false);

			// 初回のみ全ての動画をロード
			loadVideos();
		}
	};

	// 動画ファイルのロード（すべてのデッキ）
	const loadVideos = async () => {
		if (!decks || decks.length === 0) return;

		for (let i = 0; i < decks.length; i++) {
			if (decks[i].movie) {
				await loadSingleVideo(i, decks[i].movie);
			}
		}
	};

	// 単一の動画をロード
	const loadSingleVideo = async (deckIndex: number, movieName: string) => {
		if (!movieName) return;

		// 既に同じ動画がロードされている場合はスキップ
		if (videoSources[deckIndex] && previousMovieNames[deckIndex] === movieName) {
			return;
		}

		// 古いBlobを解放
		if (videoSources[deckIndex]) {
			URL.revokeObjectURL(videoSources[deckIndex]);
		}

		videoLoading[deckIndex] = true;
		try {
			// 動画ファイルのURLを取得
			const response = await fetch(`/api/get-movie?video=${encodeURIComponent(movieName)}`);
			if (response.ok) {
				const blob = await response.blob();
				videoSources[deckIndex] = URL.createObjectURL(blob);
			} else {
				console.error(`Failed to load video for deck ${deckIndex + 1}`);
			}
		} catch (error) {
			console.error(`Error loading video for deck ${deckIndex + 1}:`, error);
		} finally {
			videoLoading[deckIndex] = false;
		}
	};

	// 選択的に動画をロード（変更があった動画のみ）
	const loadVideosSelectively = async (currentMovieNames: string[]) => {
		if (!decks || decks.length === 0) return;

		for (let i = 0; i < decks.length; i++) {
			// 初回ロード時または動画が変更された場合のみロード
			if (
				decks[i].movie &&
				(previousMovieNames.length === 0 || previousMovieNames[i] !== decks[i].movie)
			) {
				await loadSingleVideo(i, decks[i].movie);
			}
		}
	};

	// 動画が最後まで再生されたときの処理
	const handleVideoEnded = (deckIndex: number) => {
		if (!decks || deckIndex >= decks.length) return;

		// デッキの再生状態を停止に設定
		if (decks[deckIndex].playing) {
			decks[deckIndex].playing = false;

			// 親コンポーネントに状態変更を通知
			if (sendDeckState) {
				sendDeckState();
			} else {
				// sendDeckState関数が提供されていない場合はWebSocketで直接送信
				if (wsClient) {
					wsClient.send({
						to: 'output',
						function: 'update-deck-state',
						body: decks
					});
				}
			}

			console.log(`Deck ${decks[deckIndex].prefix} playback ended, stopped automatically.`);
		}
	};

	// デッキの状態が変更されたときに動画の再生状態を更新
	const updateVideoPlayback = () => {
		if (!decks || !videoRefs) return;

		decks.forEach((deck, index) => {
			const video = videoRefs[index];
			if (!video) return;

			// 再生状態の同期
			if (deck.playing && video.paused) {
				video.play().catch((err) => console.error('Video play error:', err));
			} else if (!deck.playing && !video.paused) {
				video.pause();
			}

			// 再生位置の同期
			if (deck.position !== undefined && Math.abs(video.currentTime - deck.position) > 0.5) {
				video.currentTime = deck.position;
			}

			// 再生速度の同期
			if (deck.rate !== undefined && video.playbackRate !== deck.rate) {
				video.playbackRate = deck.rate;
			}
		});
	};

	// デッキの再生状態、位置、速度が変更されたときだけ更新
	$effect(() => {
		if (decks && videoRefs.some((ref) => ref !== null)) {
			// 監視する必要のあるプロパティのみを抽出
			const playbackStates = decks.map((deck) => ({
				playing: deck.playing,
				position: deck.position,
				rate: deck.rate
			}));

			// 再生状態の更新
			updateVideoPlayback();
		}
	});

	// コンポーネントがマウントされたときの処理
	onMount(() => {
		initializeVideoElements();
	});

	// コンポーネントが破棄されるときの処理
	onDestroy(() => {
		// Blobの解放
		videoSources.forEach((src) => {
			if (src) URL.revokeObjectURL(src);
		});
	});

	// 前回の動画ファイル名を保存
	let previousMovieNames: string[] = [];

	// デッキの動画が変更されたときだけ再ロード
	$effect(() => {
		if (decks && decks.length > 0) {
			const currentMovieNames = decks.map((deck) => deck.movie);

			// 動画ファイル名が変更されたかチェック
			const hasMovieChanged = currentMovieNames.some(
				(name, index) => previousMovieNames[index] !== name && name !== ''
			);

			// 初回ロード時または動画が変更されたときだけロード
			if (previousMovieNames.length === 0 || hasMovieChanged) {
				// 変更があった動画だけをロード
				loadVideosSelectively(currentMovieNames);
				previousMovieNames = [...currentMovieNames];
			}
		}
	});
</script>

<div class="p-4">
	<h2 class="mb-4 text-xl font-bold">デッキプレビュー</h2>

	<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
		{#each decks as deck, i}
			<div class="bg-base-200 rounded-lg border p-4">
				<h3 class="mb-2 text-lg font-semibold">Deck {deck.prefix}</h3>

				{#if deck.movie}
					<div class="relative aspect-video overflow-hidden rounded-md bg-black">
						{#if videoLoading[i]}
							<div class="absolute inset-0 flex items-center justify-center">
								<span class="loading loading-spinner loading-lg"></span>
							</div>
						{/if}

						{#if videoSources[i]}
							<video
								bind:this={videoRefs[i]}
								src={videoSources[i]}
								class="h-full w-full object-contain"
								preload="auto"
								on:loadedmetadata={() => {
									// 動画がロードされたら再生状態を同期
									updateVideoPlayback();
								}}
								on:ended={() => {
									// 動画が最後まで再生されたら停止状態に更新
									handleVideoEnded(i);
								}}
							></video>
						{:else}
							<div class="absolute inset-0 flex items-center justify-center text-gray-400">
								動画をロード中...
							</div>
						{/if}
					</div>
				{:else}
					<div
						class="flex aspect-video items-center justify-center rounded-md bg-gray-800 text-gray-400"
					>
						動画がロードされていません
					</div>
				{/if}
			</div>
		{/each}
	</div>
</div>
