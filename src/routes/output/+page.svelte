<script lang="ts">
	import { onDestroy, onMount, tick } from 'svelte';
	import { WSClientConnection } from '$lib/ws-client';
	import type { DeckType } from '$lib/types';
	import { extractYouTubeVideoId, loadYouTubeIframeApi } from '$lib/youtube';
	import { isImageFile } from '$lib/media-utils';

	let localVideoElements: Array<HTMLVideoElement | null> = [];
	let localImageElements: Array<HTMLImageElement | null> = [];
	let youtubeContainers: Array<HTMLDivElement | null> = [];
	let deckLayers: Array<HTMLDivElement | null> = [];
	let youtubePlayers: Array<YT.Player | null> = [null, null];
	let decks: DeckType[] = [];
	let wsClient: WSClientConnection;
	let loadingStates = [false, false];
	let youtubePositionSnapshot = [0, 0];
	let youtubeSyncTimer: number | undefined;

	const getSourceType = (deck?: DeckType) => deck?.sourceType ?? 'local';

	const sendLoadingState = () => {
		wsClient?.send({
			to: 'server',
			function: 'update-loading-state',
			body: { loadingStates }
		});
	};

	const sendMovieState = () => {
		wsClient?.send({ to: 'server', function: 'update-movie-state', body: decks });
	};

	const setDeckOpacity = (deckIndex: number, opacity: number) => {
		const layer = deckLayers[deckIndex];
		if (layer) {
			layer.style.opacity = opacity.toString();
		}
	};

	const cleanupYoutubePlayer = (deckIndex: number) => {
		youtubePlayers[deckIndex]?.destroy();
		youtubePlayers[deckIndex] = null;
		youtubePositionSnapshot[deckIndex] = 0;
	};

	const handlePlaybackEnded = (deckIndex: number) => {
		const deck = decks[deckIndex];
		if (!deck) return;

		if (deck.repeat) {
			if (getSourceType(deck) === 'youtube') {
				youtubePlayers[deckIndex]?.seekTo(0, true);
				youtubePlayers[deckIndex]?.playVideo();
			} else if (localVideoElements[deckIndex]) {
				localVideoElements[deckIndex]!.currentTime = 0;
				void localVideoElements[deckIndex]!.play().catch((error) =>
					console.error('Local video replay error:', error)
				);
			}

			deck.position = 0;
			sendMovieState();
			return;
		}

		if (deck.playing) {
			deck.playing = false;
			sendMovieState();
		}
	};

	const applyDeckState = (deckIndex: number, nextDeck: DeckType) => {
		if (getSourceType(nextDeck) === 'youtube') {
			const player = youtubePlayers[deckIndex];
			if (!player) return;

			const currentTime = player.getCurrentTime();
			const currentRate = player.getPlaybackRate();
			const playerState = player.getPlayerState();

			if (nextDeck.position !== undefined && Math.abs(currentTime - nextDeck.position) > 0.75) {
				player.seekTo(nextDeck.position, true);
			}

			if (nextDeck.rate !== undefined && Math.abs(currentRate - nextDeck.rate) > 0.01) {
				player.setPlaybackRate(nextDeck.rate);
			}

			if (nextDeck.playing && playerState !== YT.PlayerState.PLAYING) {
				player.playVideo();
			} else if (!nextDeck.playing && playerState === YT.PlayerState.PLAYING) {
				player.pauseVideo();
			}

			return;
		}

		const video = localVideoElements[deckIndex];
		if (!video) return;

		if (nextDeck.position !== undefined && Math.abs(video.currentTime - nextDeck.position) > 0.5) {
			video.currentTime = nextDeck.position;
		}

		if (nextDeck.rate !== undefined && video.playbackRate !== nextDeck.rate) {
			video.playbackRate = nextDeck.rate;
		}

		if (nextDeck.playing && video.paused) {
			void video.play().catch((error) => console.error('Local video play error:', error));
		} else if (!nextDeck.playing && !video.paused) {
			video.pause();
		}
	};

	const loadLocalVideo = (deckIndex: number, moviePath: string) => {
		cleanupYoutubePlayer(deckIndex);
		loadingStates[deckIndex] = true;
		sendLoadingState();

		if (isImageFile(moviePath)) {
			const img = localImageElements[deckIndex];
			if (!img) return;
			img.src = '/api/get-movie?video=' + encodeURIComponent(moviePath);
			return;
		}

		const video = localVideoElements[deckIndex];
		if (!video) return;
		video.src = '/api/get-movie?video=' + encodeURIComponent(moviePath);
		video.load();
	};

	const loadYoutubeVideo = async (deckIndex: number, movieUrl: string) => {
		const videoId = extractYouTubeVideoId(movieUrl);
		if (!videoId) {
			console.error(`Invalid YouTube URL for deck ${deckIndex + 1}:`, movieUrl);
			loadingStates[deckIndex] = false;
			sendLoadingState();
			return;
		}

		loadingStates[deckIndex] = true;
		sendLoadingState();
		cleanupYoutubePlayer(deckIndex);
		await tick();

		const container = youtubeContainers[deckIndex];
		if (!container) {
			loadingStates[deckIndex] = false;
			sendLoadingState();
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
						decks[deckIndex].length = event.target.getDuration() || undefined;
						decks[deckIndex].position = 0;
						decks[deckIndex].rate = decks[deckIndex].rate ?? 1;
						loadingStates[deckIndex] = false;
						sendLoadingState();
						sendMovieState();
						applyDeckState(deckIndex, decks[deckIndex]);
					},
					onStateChange: (event: YT.OnStateChangeEvent) => {
						if (event.data === YT.PlayerState.ENDED) {
							handlePlaybackEnded(deckIndex);
							return;
						}

						if (
							event.data === YT.PlayerState.PLAYING ||
							event.data === YT.PlayerState.PAUSED ||
							event.data === YT.PlayerState.CUED
						) {
							decks[deckIndex].length = event.target.getDuration() || undefined;
						}
					},
					onError: (event: YT.OnErrorEvent) => {
						loadingStates[deckIndex] = false;
						sendLoadingState();
						console.error(`YouTube player error on deck ${deckIndex + 1}:`, event.data);
					}
				}
			});
		} catch (error) {
			loadingStates[deckIndex] = false;
			sendLoadingState();
			console.error(`Failed to initialize YouTube player for deck ${deckIndex + 1}:`, error);
		}
	};

	const updateDeck = async (nextDecks: DeckType[]) => {
		if (nextDecks.length < 2) return;

		const previousDecks = decks;
		const isInitialLoad = previousDecks.length === 0;
		decks = nextDecks;
		await tick();

		if (decks.length === 0) {
			return;
		}

		for (let i = 0; i < 2; i++) {
			const sourceChanged =
				isInitialLoad ||
				nextDecks[i].movie !== previousDecks[i]?.movie ||
				getSourceType(nextDecks[i]) !== getSourceType(previousDecks[i]);

			if (sourceChanged) {
				if (!nextDecks[i].movie) {
					cleanupYoutubePlayer(i);
					if (localVideoElements[i]) {
						localVideoElements[i]!.removeAttribute('src');
						localVideoElements[i]!.load();
					}
					if (localImageElements[i]) {
						localImageElements[i]!.removeAttribute('src');
					}
				} else if (getSourceType(nextDecks[i]) === 'youtube') {
					void loadYoutubeVideo(i, nextDecks[i].movie);
				} else {
					loadLocalVideo(i, nextDecks[i].movie);
				}
			}

			applyDeckState(i, nextDecks[i]);
		}
	};

	const updateUnifiedOpacity = (data: { deck1: number; deck2: number }) => {
		setDeckOpacity(0, data.deck1);
		setDeckOpacity(1, data.deck2);
	};

	const loadedLocalMovie = (deckIndex: number) => {
		const video = localVideoElements[deckIndex];
		if (!video || !decks[deckIndex]) return;

		decks[deckIndex].length = video.duration || undefined;
		decks[deckIndex].position = 0;
		decks[deckIndex].rate = decks[deckIndex].rate ?? 1;
		decks[deckIndex].playing = false;

		video.currentTime = 0;
		video.playbackRate = decks[deckIndex].rate ?? 1;

		loadingStates[deckIndex] = false;
		sendLoadingState();
		sendMovieState();
	};

	const loadedLocalImage = (deckIndex: number) => {
		if (!decks[deckIndex]) return;

		decks[deckIndex].length = undefined;
		decks[deckIndex].position = undefined;
		decks[deckIndex].rate = 1;
		decks[deckIndex].playing = false;

		loadingStates[deckIndex] = false;
		sendLoadingState();
		sendMovieState();
	};

	const localTimeUpdate = (deckIndex: number) => {
		const video = localVideoElements[deckIndex];
		if (!video || !decks[deckIndex]) return;

		decks[deckIndex].position = video.currentTime;
		sendMovieState();
	};

	const syncYoutubePositions = () => {
		let changed = false;

		for (let i = 0; i < 2; i++) {
			if (getSourceType(decks[i]) !== 'youtube') continue;

			const player = youtubePlayers[i];
			const deck = decks[i];
			if (!player || !deck) continue;

			const playerState = player.getPlayerState();
			if (
				playerState !== YT.PlayerState.PLAYING &&
				playerState !== YT.PlayerState.PAUSED &&
				playerState !== YT.PlayerState.BUFFERING &&
				playerState !== YT.PlayerState.CUED
			) {
				continue;
			}

			const nextPosition = player.getCurrentTime();
			const nextDuration = player.getDuration() || undefined;
			const nextRate = player.getPlaybackRate();

			if (Math.abs(youtubePositionSnapshot[i] - nextPosition) > 0.25) {
				youtubePositionSnapshot[i] = nextPosition;
				deck.position = nextPosition;
				changed = true;
			}

			if (deck.length !== nextDuration) {
				deck.length = nextDuration;
				changed = true;
			}

			if (deck.rate !== nextRate) {
				deck.rate = nextRate;
				changed = true;
			}
		}

		if (changed) {
			sendMovieState();
		}
	};

	onMount(() => {
		setDeckOpacity(0, 0.5);
		setDeckOpacity(1, 0.5);

		wsClient = new WSClientConnection();
		wsClient.attachEvent({
			to: 'output',
			function: 'update-deck-state',
			event: (_ws, body) => {
				void updateDeck(body as DeckType[]);
			}
		});
		wsClient.attachEvent({
			to: 'output',
			function: 'update-opacity',
			event: (_ws, body) => updateUnifiedOpacity(body as { deck1: number; deck2: number })
		});
		wsClient.attachEvent({
			to: 'output',
			function: 'get-deck-state',
			event: (_ws, body) => {
				if (body) {
					void updateDeck(body as DeckType[]);
				}
			}
		});

		const registerOutput = () => {
			wsClient.send({
				to: 'server',
				function: 'register-client',
				body: { role: 'output' }
			});
			wsClient.send({ to: 'server', function: 'get-deck-state' });
		};

		wsClient.onReconnect = () => {
			registerOutput();
		};

		wsClient.connect.then(() => {
			registerOutput();
		});

		youtubeSyncTimer = window.setInterval(syncYoutubePositions, 250);
	});

	onDestroy(() => {
		if (youtubeSyncTimer) {
			window.clearInterval(youtubeSyncTimer);
		}

		youtubePlayers.forEach((player) => player?.destroy());
		wsClient?.destroy();
	});
</script>

<svelte:head>
	<title>xf-webvj output</title>
</svelte:head>

<div class="h-screen w-screen bg-black">
	{#each [0, 1] as deckIndex}
		<div
			bind:this={deckLayers[deckIndex]}
			class={`fixed inset-0 ${deckIndex === 0 ? 'z-0' : 'z-10'} transition-all duration-75`}
		>
			{#key `${deckIndex}:${decks[deckIndex]?.sourceType ?? 'local'}:${decks[deckIndex]?.movie ?? ''}`}
				{#if (decks[deckIndex]?.sourceType ?? 'local') === 'youtube'}
					<div bind:this={youtubeContainers[deckIndex]} class="h-full w-full"></div>
				{:else if decks[deckIndex]?.movie && isImageFile(decks[deckIndex].movie)}
					<img
						bind:this={localImageElements[deckIndex]}
						alt=""
						class="h-full w-full object-contain"
						onload={() => loadedLocalImage(deckIndex)}
						onerror={() => {
							loadingStates[deckIndex] = false;
							sendLoadingState();
							console.error(`Deck ${deckIndex + 1}: Image loading error`);
						}}
					/>
				{:else}
					<!-- svelte-ignore a11y_media_has_caption -->
					<video
						bind:this={localVideoElements[deckIndex]}
						preload="auto"
						muted
						class="h-full w-full object-contain"
						onloadeddata={() => loadedLocalMovie(deckIndex)}
						ontimeupdate={() => localTimeUpdate(deckIndex)}
						onended={() => handlePlaybackEnded(deckIndex)}
						onerror={() => {
							loadingStates[deckIndex] = false;
							sendLoadingState();
							console.error(`Deck ${deckIndex + 1}: Video loading error`);
						}}
					></video>
				{/if}
			{/key}
		</div>
	{/each}
</div>
