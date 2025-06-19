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
			function: 'update-opacity',
			event: (ws, body) => {
				updateUnifiedOpacity(body as { deck1: number; deck2: number; opacityState: any });
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

	const updateUnifiedOpacity = (data: { deck1: number; deck2: number; opacityState: any }) => {
		if (deckElement[0] && deckElement[1]) {
			// 現在の再生状態を保存
			const deck1Playing = !deckElement[0].paused;
			const deck2Playing = !deckElement[1].paused;
			const deck1CurrentTime = deckElement[0].currentTime;
			const deck2CurrentTime = deckElement[1].currentTime;
			
			// 透明度のみを更新（再生状態に影響しない）
			deckElement[0].style.opacity = data.deck1.toString();
			deckElement[1].style.opacity = data.deck2.toString();
			
			// 再生状態が変わっていないことを確認（念のため）
			if (deck1Playing && deckElement[0].paused) {
				deckElement[0].currentTime = deck1CurrentTime;
				deckElement[0].play();
			}
			if (deck2Playing && deckElement[1].paused) {
				deckElement[1].currentTime = deck2CurrentTime;
				deckElement[1].play();
			}
			
			// デバッグ用（必要に応じてコメントアウト）
			// console.log('Opacity updated (playback preserved):', { 
			//	deck1: data.deck1, 
			//	deck2: data.deck2,
			//	deck1Playing,
			//	deck2Playing
			// });
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
	
	// 動画が最後まで再生されたときの処理
	const handleVideoEnded = (prefix: number) => {
		// 再生状態を停止に設定
		if (decks[prefix].playing) {
			decks[prefix].playing = false;
			
			// サーバーに状態変更を通知
			wsClient.send({ to: 'server', function: 'update-movie-state', body: decks });
			
			console.log(`Output: Deck ${decks[prefix].prefix} playback ended, stopped automatically.`);
		}
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
		onended={() => {
			handleVideoEnded(0);
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
		onended={() => {
			handleVideoEnded(1);
		}}
	></video>
</div>
