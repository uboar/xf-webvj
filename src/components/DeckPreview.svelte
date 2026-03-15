<script lang="ts">
	import { onDestroy, onMount, tick } from 'svelte';
	import type { DeckType } from '$lib/types';
	import type { WSClientConnection } from '$lib/ws-client';
	import { extractYouTubeVideoId, loadYouTubeIframeApi } from '$lib/youtube';

	let {
		decks = $bindable(),
		wsClient = $bindable(),
		sendDeckState = $bindable()
	}: {
		decks: DeckType[];
		wsClient: WSClientConnection;
		sendDeckState?: () => void;
	} = $props();

	let videoRefs = $state<Array<HTMLVideoElement | null>>([]);
	let youtubeContainers = $state<Array<HTMLDivElement | null>>([]);
	let localVideoSources = $state<string[]>([]);
	let videoLoading = $state<boolean[]>([]);
	let youtubePlayers: Array<YT.Player | null> = [];
	let previousDeckKeys: string[] = [];

	const initializeDeckArrays = () => {
		if (!decks || decks.length === 0) return;

		if (videoRefs.length !== decks.length) {
			videoRefs = Array(decks.length).fill(null);
			youtubeContainers = Array(decks.length).fill(null);
			localVideoSources = Array(decks.length).fill('');
			videoLoading = Array(decks.length).fill(false);
			youtubePlayers = Array(decks.length).fill(null);
			previousDeckKeys = Array(decks.length).fill('');
		}
	};

	const notifyDeckState = () => {
		if (sendDeckState) {
			sendDeckState();
			return;
		}

		wsClient?.send({
			to: 'output',
			function: 'update-deck-state',
			body: decks
		});
	};

	const cleanupDeckMedia = (deckIndex: number) => {
		if (localVideoSources[deckIndex]) {
			URL.revokeObjectURL(localVideoSources[deckIndex]);
			localVideoSources[deckIndex] = '';
		}

		youtubePlayers[deckIndex]?.destroy();
		youtubePlayers[deckIndex] = null;
	};

	const updateYoutubeMetadata = (deckIndex: number) => {
		const deck = decks[deckIndex];
		const player = youtubePlayers[deckIndex];
		if (!deck || !player) return;

		deck.length = player.getDuration() || undefined;
		deck.position = player.getCurrentTime() || 0;
		deck.rate = player.getPlaybackRate() || deck.rate || 1;
	};

	const handleVideoEnded = (deckIndex: number) => {
		if (!decks || deckIndex >= decks.length) return;

		if (decks[deckIndex].repeat) {
			const video = videoRefs[deckIndex];
			const player = youtubePlayers[deckIndex];

			if (video) {
				video.currentTime = 0;
				void video.play().catch((error) => console.error('Video replay error:', error));
			} else if (player) {
				player.seekTo(0, true);
				player.playVideo();
			}

			decks[deckIndex].position = 0;
			notifyDeckState();
			return;
		}

		if (decks[deckIndex].playing) {
			decks[deckIndex].playing = false;
			notifyDeckState();
		}
	};

	const updateDeckPlayback = (deckIndex: number) => {
		const deck = decks[deckIndex];
		if (!deck) return;

		if ((deck.sourceType ?? 'local') === 'youtube') {
			const player = youtubePlayers[deckIndex];
			if (!player) return;

			const currentTime = player.getCurrentTime();
			const currentRate = player.getPlaybackRate();
			const playerState = player.getPlayerState();

			if (deck.position !== undefined && Math.abs(currentTime - deck.position) > 0.75) {
				player.seekTo(deck.position, true);
			}

			if (deck.rate !== undefined && Math.abs(currentRate - deck.rate) > 0.01) {
				player.setPlaybackRate(deck.rate);
			}

			if (deck.playing && playerState !== YT.PlayerState.PLAYING) {
				player.playVideo();
			} else if (!deck.playing && playerState === YT.PlayerState.PLAYING) {
				player.pauseVideo();
			}

			return;
		}

		const video = videoRefs[deckIndex];
		if (!video) return;

		if (deck.playing && video.paused) {
			void video.play().catch((error) => console.error('Video play error:', error));
		} else if (!deck.playing && !video.paused) {
			video.pause();
		}

		if (deck.position !== undefined && Math.abs(video.currentTime - deck.position) > 0.5) {
			video.currentTime = deck.position;
		}

		if (deck.rate !== undefined && video.playbackRate !== deck.rate) {
			video.playbackRate = deck.rate;
		}
	};

	const updateAllPlayback = () => {
		decks.forEach((_, index) => updateDeckPlayback(index));
	};

	const loadLocalVideo = async (deckIndex: number, movieName: string) => {
		videoLoading[deckIndex] = true;
		cleanupDeckMedia(deckIndex);

		try {
			const response = await fetch(`/api/get-movie?video=${encodeURIComponent(movieName)}`);
			if (!response.ok) {
				throw new Error(`Failed to load local video: ${response.status}`);
			}

			const blob = await response.blob();
			localVideoSources[deckIndex] = URL.createObjectURL(blob);
		} catch (error) {
			console.error(`Error loading local video for deck ${deckIndex + 1}:`, error);
		} finally {
			videoLoading[deckIndex] = false;
		}
	};

	const loadYoutubeVideo = async (deckIndex: number, movieUrl: string) => {
		const videoId = extractYouTubeVideoId(movieUrl);
		if (!videoId) {
			console.error(`Invalid YouTube URL for deck ${deckIndex + 1}:`, movieUrl);
			return;
		}

		videoLoading[deckIndex] = true;
		cleanupDeckMedia(deckIndex);
		await tick();

		const container = youtubeContainers[deckIndex];
		if (!container) {
			videoLoading[deckIndex] = false;
			return;
		}

		try {
			const YTApi = await loadYouTubeIframeApi();
			youtubePlayers[deckIndex] = new YTApi.Player(container, {
				width: '100%',
				height: '100%',
				videoId,
				playerVars: {
					autoplay: 0,
					controls: 0,
					disablekb: 1,
					modestbranding: 1,
					playsinline: 1,
					rel: 0
				},
				events: {
					onReady: (event: YT.PlayerEvent) => {
						event.target.mute();
						videoLoading[deckIndex] = false;
						updateYoutubeMetadata(deckIndex);
						updateDeckPlayback(deckIndex);
					},
					onStateChange: (event: YT.OnStateChangeEvent) => {
						if (event.data === YT.PlayerState.ENDED) {
							handleVideoEnded(deckIndex);
							return;
						}

						if (
							event.data === YT.PlayerState.PLAYING ||
							event.data === YT.PlayerState.PAUSED ||
							event.data === YT.PlayerState.CUED
						) {
							updateYoutubeMetadata(deckIndex);
						}
					},
					onError: (event: YT.OnErrorEvent) => {
						videoLoading[deckIndex] = false;
						console.error(`YouTube player error on deck ${deckIndex + 1}:`, event.data);
					}
				}
			});
		} catch (error) {
			videoLoading[deckIndex] = false;
			console.error(`Error loading YouTube video for deck ${deckIndex + 1}:`, error);
		}
	};

	const syncDeckSources = async () => {
		if (!decks || decks.length === 0) return;
		initializeDeckArrays();

		for (let i = 0; i < decks.length; i++) {
			const deck = decks[i];
			const sourceType = deck.sourceType ?? 'local';
			const deckKey = `${sourceType}:${deck.movie}`;

			if (!deck.movie) {
				cleanupDeckMedia(i);
				previousDeckKeys[i] = '';
				continue;
			}

			if (previousDeckKeys[i] === deckKey) {
				continue;
			}

			previousDeckKeys[i] = deckKey;

			if (sourceType === 'youtube') {
				await loadYoutubeVideo(i, deck.movie);
			} else {
				await loadLocalVideo(i, deck.movie);
			}
		}
	};

	onMount(() => {
		initializeDeckArrays();
		void syncDeckSources();
	});

	onDestroy(() => {
		localVideoSources.forEach((source) => {
			if (source) {
				URL.revokeObjectURL(source);
			}
		});

		youtubePlayers.forEach((player) => player?.destroy());
	});

	$effect(() => {
		if (decks?.length) {
			void syncDeckSources();
		}
	});

	$effect(() => {
		if (decks?.length) {
			decks.map((deck) => ({
				movie: deck.movie,
				sourceType: deck.sourceType ?? 'local',
				playing: deck.playing,
				position: deck.position,
				rate: deck.rate
			}));

			updateAllPlayback();
		}
	});
</script>

<div class="p-4">
	<h2 class="mb-4 text-xl font-bold">デッキプレビュー</h2>

	<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
		{#each decks as deck, i}
			<div class="bg-base-200 rounded-lg border p-4">
				<div class="mb-2 flex items-center justify-between gap-2">
					<h3 class="text-lg font-semibold">Deck {deck.prefix}</h3>
					<span class="badge badge-outline">
						{(deck.sourceType ?? 'local') === 'youtube' ? 'YouTube' : 'Local'}
					</span>
				</div>

				{#if deck.movie}
					<div class="relative aspect-video overflow-hidden rounded-md bg-black">
						{#if videoLoading[i]}
							<div class="absolute inset-0 z-10 flex items-center justify-center bg-black/60">
								<span class="loading loading-spinner loading-lg"></span>
							</div>
						{/if}

						{#key `${i}:${deck.sourceType ?? 'local'}:${deck.movie}`}
							{#if (deck.sourceType ?? 'local') === 'youtube'}
								<div bind:this={youtubeContainers[i]} class="h-full w-full"></div>
							{:else if localVideoSources[i]}
								<!-- svelte-ignore a11y_media_has_caption -->
								<video
									bind:this={videoRefs[i]}
									src={localVideoSources[i]}
									class="h-full w-full object-contain"
									preload="auto"
									onloadedmetadata={() => {
										deck.length = videoRefs[i]?.duration || undefined;
										updateDeckPlayback(i);
									}}
									onended={() => handleVideoEnded(i)}
								></video>
							{:else}
								<div class="absolute inset-0 flex items-center justify-center text-gray-400">
									動画をロード中...
								</div>
							{/if}
						{/key}
					</div>
				{:else}
					<div class="flex aspect-video items-center justify-center rounded-md bg-gray-800 text-gray-400">
						動画がロードされていません
					</div>
				{/if}
			</div>
		{/each}
	</div>
</div>
