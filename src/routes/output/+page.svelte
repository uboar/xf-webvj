<script lang="ts">
	import { onMount } from 'svelte';
	import { WSClientConnection } from '$lib/ws-client';
	import type { DeckType } from '$lib/types';

	let deckElement: HTMLVideoElement[] = [];
	let decks: DeckType[] = [];
	let wsClient: WSClientConnection;
	
	// 動画読み込み状態の追跡
	let loadingStates = [false, false];

	// ページが閉じられる前に接続解除を通知する関数
	const notifyDisconnection = () => {
		if (wsClient) {
			wsClient.send({ 
				to: 'server', 
				function: 'output-page-connected', 
				body: { connected: false } 
			});
		}
	};

	onMount(() => {
		deckElement[0].style.opacity = '1.0';
		deckElement[1].style.opacity = '0.5';
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
		
		// WebSocket接続を確立し、接続後の処理を行う
		wsClient.connect.then(() => {
			// 出力ページが接続されたことを通知
			wsClient.send({ 
				to: 'server', 
				function: 'output-page-connected', 
				body: { connected: true } 
			});
			
			wsClient.send({ to: 'server', function: 'get-deck-state' });
		});
		
		// beforeunloadイベントリスナーを追加
		window.addEventListener('beforeunload', notifyDisconnection);
		
		// コンポーネントのアンマウント時にイベントリスナーを削除
		return () => {
			window.removeEventListener('beforeunload', notifyDisconnection);
			notifyDisconnection(); // アンマウント時にも接続解除を通知
		};
	});

	// ロード状態をダッシュボードに通知する
	const sendLoadingState = () => {
		if (wsClient) {
			wsClient.send({
				to: 'server',
				function: 'update-loading-state',
				body: { loadingStates }
			});
		}
	};
	
	const updateDeck = (resDeck: DeckType[]) => {
		if (resDeck.length >= 2 && decks.length == 0) {
			decks = resDeck;
			
			// 初期ロード時に動画があれば読み込み状態を設定
			if (decks[0].movie) {
				loadingStates[0] = true;
				sendLoadingState();
				deckElement[0].src = '/api/get-movie?video=' + encodeURIComponent(decks[0].movie);
			}
			
			if (decks[1].movie) {
				loadingStates[1] = true;
				sendLoadingState();
				deckElement[1].src = '/api/get-movie?video=' + encodeURIComponent(decks[1].movie);
			}
		}

		if (resDeck.length >= 2) {
			for (let i = 0; i < 2; i++) {
				if (resDeck[i].movie != decks[i].movie) {
					// 新しい動画が読み込まれる場合、読み込み状態を設定
					if (resDeck[i].movie) {
						loadingStates[i] = true;
						sendLoadingState();
					}
					deckElement[i].src = '/api/get-movie?video=' + encodeURIComponent(resDeck[i].movie);
				}
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

		// 読み込み完了を設定
		loadingStates[prefix] = false;
		sendLoadingState();

		wsClient.send({ to: 'server', function: 'update-movie-state', body: decks });
	};

	const timeUpdate = (prefix: number) => {
		decks[prefix].position = deckElement[prefix].currentTime;

		wsClient.send({ to: 'server', function: 'update-movie-state', body: decks });
	};
	
	// 動画が最後まで再生されたときの処理
	const handleVideoEnded = (prefix: number) => {
		// リピートモードが有効な場合は最初から再生を継続
		if (decks[prefix].repeat) {
			// 現在の位置を0に戻す
			deckElement[prefix].currentTime = 0;
			decks[prefix].position = 0;
			
			// 再生を継続
			deckElement[prefix].play();
			
			// サーバーに状態変更を通知
			wsClient.send({ to: 'server', function: 'update-movie-state', body: decks });
			
			console.log(`Output: Deck ${decks[prefix].prefix} playback ended, restarting (repeat mode).`);
		} else {
			// リピートモードが無効な場合は停止
			if (decks[prefix].playing) {
				decks[prefix].playing = false;
				
				// サーバーに状態変更を通知
				wsClient.send({ to: 'server', function: 'update-movie-state', body: decks });
				
				console.log(`Output: Deck ${decks[prefix].prefix} playback ended, stopped automatically.`);
			}
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
		onerror={() => {
			// 読み込みエラー時も状態をリセット
			loadingStates[0] = false;
			sendLoadingState();
			console.error('Deck 1: Video loading error');
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
		onerror={() => {
			// 読み込みエラー時も状態をリセット
			loadingStates[1] = false;
			sendLoadingState();
			console.error('Deck 2: Video loading error');
		}}
	></video>
</div>
