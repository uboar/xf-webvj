<script lang="ts">
	import { onMount } from 'svelte';
	import { WSClientConnection } from '$lib/ws-client';
	import type { DeckType } from '$lib/types';

	let deckElement: HTMLVideoElement[] = [];
	let decks: DeckType[] = [];
	let wsClient: WSClientConnection;

	onMount(async () => {
		deckElement[0].style.opacity = '1.0';
		deckElement[1].style.opacity = '1.0';
		wsClient = new WSClientConnection();
		wsClient.attachEvent({
			to: 'output',
			function: 'update-deck-state',
			event: (ws, body) => {
				updateDeck(body as DeckType[]);
			}
		});
		wsClient.attachEvent({
			to: 'output',
			function: 'opacity-xfd',
			event: (ws, body) => {
				updateOpacityXfd(body as { opacity: number });
			}
		});
		wsClient.attachEvent({
			to: 'output',
			function: 'update-deck-opacity',
			event: (ws, body) => {
				updateDeckOpacity(body as { deckIndex: number; opacity: number });
			}
		});
		wsClient.attachEvent({
			to: 'output',
			function: 'get-deck-state',
			event: (ws, body) => {
				if (body) {
					updateDeck(body as DeckType[]);
				}
			}
		});
		await wsClient.connect;
		wsClient.send({ to: 'server', function: 'get-deck-state' });
	});

	const updateDeck = (resDeck: DeckType[]) => {
		if (resDeck.length >= 2 && decks.length == 0) {
			decks = resDeck;
			deckElement[0].src = '/api/get-movie?video=' + encodeURIComponent(decks[0].movie);
			deckElement[1].src = '/api/get-movie?video=' + encodeURIComponent(decks[1].movie);
		}

		if (resDeck.length >= 2) {
			for (let i = 0; i < 2; i++) {
				if (resDeck[i].movie != decks[i].movie)
					deckElement[i].src = '/api/get-movie?video=' + encodeURIComponent(resDeck[i].movie);
				if (resDeck[i].position != undefined) {
					deckElement[i].currentTime = resDeck[i].position!;
				}
				if (resDeck[i].rate != undefined) {
					deckElement[i].playbackRate = resDeck[i].rate!;
				}
				if (resDeck[i].playing != decks[i].playing) {
					if (resDeck[i].playing) {
						deckElement[i].play();
					} else {
						deckElement[i].pause();
					}
				}
			}

			decks = resDeck;
		}
	};

	const updateOpacityXfd = (data: { opacity: number }) => {
		deckElement[1].style.opacity = data.opacity.toString();
	};

	const updateDeckOpacity = (data: { deckIndex: number; opacity: number }) => {
		if (data.deckIndex >= 0 && data.deckIndex < deckElement.length) {
			deckElement[data.deckIndex].style.opacity = data.opacity.toString();
		}
	};

	const loadedMovie = (prefix: number) => {
		decks[prefix].length = deckElement[prefix].duration;
		decks[prefix].position = 0;
		decks[prefix].rate = 1.0;
		decks[prefix].playing = false;

		deckElement[prefix].currentTime = 0;
		deckElement[prefix].playbackRate = 1.0;

		wsClient.send({ to: 'server', function: 'update-movie-state', body: decks });
	};

	const timeUpdate = (prefix: number) => {
		decks[prefix].position = deckElement[prefix].currentTime;

		wsClient.send({ to: 'server', function: 'update-movie-state', body: decks });
	};
</script>


<svelte:head>
  <title>xf-webvj output</title>
</svelte:head>

<div class="h-screen w-screen bg-black">
	<video
		bind:this={deckElement[0]}
		preload="auto"
		muted
		class="fixed z-0 w-full transition-all duration-75"
		onloadeddata={() => {
			loadedMovie(0);
		}}
		ontimeupdate={() => {
			timeUpdate(0);
		}}
	></video>
	<video
		bind:this={deckElement[1]}
		preload="auto"
		muted
		class="fixed z-10 w-full transition-all duration-75"
		onloadeddata={() => {
			loadedMovie(1);
		}}
		ontimeupdate={() => {
			timeUpdate(1);
		}}
	></video>
</div>
