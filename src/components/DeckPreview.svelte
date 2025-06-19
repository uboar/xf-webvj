<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { DeckType } from '$lib/types';
	import type { WSClientConnection } from '$lib/ws-client';

	let {
		decks = $bindable(),
		wsClient = $bindable()
	}: {
		decks: DeckType[];
		wsClient: WSClientConnection;
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
		
		// 各デッキに対応するビデオ要素の初期化
		videoRefs = Array(decks.length).fill(null);
		videoSources = Array(decks.length).fill('');
		videoLoading = Array(decks.length).fill(false);
		
		// 各デッキの動画ファイルをロード
		loadVideos();
	};

	// 動画ファイルのロード
	const loadVideos = async () => {
		if (!decks || decks.length === 0) return;

		for (let i = 0; i < decks.length; i++) {
			if (decks[i].movie) {
				videoLoading[i] = true;
				try {
					// 動画ファイルのURLを取得
					const response = await fetch(`/api/get-movie?video=${encodeURIComponent(decks[i].movie)}`);
					if (response.ok) {
						const blob = await response.blob();
						videoSources[i] = URL.createObjectURL(blob);
					} else {
						console.error(`Failed to load video for deck ${i + 1}`);
					}
				} catch (error) {
					console.error(`Error loading video for deck ${i + 1}:`, error);
				} finally {
					videoLoading[i] = false;
				}
			}
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
				video.play().catch(err => console.error('Video play error:', err));
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

	// デッキの状態が変更されたときに呼び出される関数
	$effect(() => {
		if (decks) {
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
		videoSources.forEach(src => {
			if (src) URL.revokeObjectURL(src);
		});
	});

	// デッキの動画が変更されたときに再ロード
	$effect(() => {
		if (decks) {
			const movieNames = decks.map(deck => deck.movie);
			loadVideos();
		}
	});
</script>

<div class="p-4">
	<h2 class="text-xl font-bold mb-4">デッキプレビュー</h2>
	
	<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
		{#each decks as deck, i}
			<div class="border rounded-lg p-4 bg-base-200">
				<h3 class="text-lg font-semibold mb-2">Deck {deck.prefix}</h3>
				
				{#if deck.movie}
					<div class="relative aspect-video bg-black rounded-md overflow-hidden">
						{#if videoLoading[i]}
							<div class="absolute inset-0 flex items-center justify-center">
								<span class="loading loading-spinner loading-lg"></span>
							</div>
						{/if}
						
						{#if videoSources[i]}
							<video
								bind:this={videoRefs[i]}
								src={videoSources[i]}
								class="w-full h-full object-contain"
								preload="auto"
							></video>
						{:else}
							<div class="absolute inset-0 flex items-center justify-center text-gray-400">
								動画をロード中...
							</div>
						{/if}
					</div>
					
					<div class="mt-2 text-sm">
						<p class="truncate"><strong>ファイル名:</strong> {deck.movie}</p>
						<p><strong>再生状態:</strong> {deck.playing ? '再生中' : '停止'}</p>
						<p><strong>再生速度:</strong> {deck.rate?.toFixed(2) || '1.00'}x</p>
						<p><strong>不透明度:</strong> {deck.opacity !== undefined ? `${deck.opacity}%` : '100%'}</p>
						{#if deck.position !== undefined && deck.length !== undefined}
							<p><strong>再生位置:</strong> {formatTime(deck.position)} / {formatTime(deck.length)}</p>
						{/if}
					</div>
				{:else}
					<div class="aspect-video bg-gray-800 rounded-md flex items-center justify-center text-gray-400">
						動画がロードされていません
					</div>
				{/if}
			</div>
		{/each}
	</div>
</div>

<script context="module">
	// 時間のフォーマット関数
	function formatTime(seconds: number): string {
		const minutes = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
	}
</script>