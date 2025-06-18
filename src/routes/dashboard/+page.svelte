<script lang="ts">
	import { onMount } from 'svelte';
	import Deck from '../../components/Deck.svelte';
	import type { DeckType, DownloadMovieRequest } from '$lib/types';
	import { WSClientConnection } from '$lib/ws-client';

	let movieList: string[] = $state([]);
	let wsClient: WSClientConnection = $state();

	let downloadMovie: DownloadMovieRequest = {
		url: '',
		args: '-f bestvideo[height=720]'
	};

	let downloading = $state(false);

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
					// デッキの透明度をUIに反映
					if (decks[0]?.opacity !== undefined) {
						deck1Opacity = Math.round(decks[0].opacity * 100);
					}
					if (decks[1]?.opacity !== undefined) {
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
					const opacityState = body as { deck1BaseOpacity: number; deck2BaseOpacity: number; crossfadeValue: number };
					deck1Opacity = Math.round(opacityState.deck1BaseOpacity * 100);
					deck2Opacity = Math.round(opacityState.deck2BaseOpacity * 100);
					xfd = Math.round(opacityState.crossfadeValue * 100);
				}
			}
		});
		await wsClient.connect;
		wsClient.send({ to: 'server', function: 'get-deck-state' });
	});

	const sendDeckState = () => {
		wsClient.send({
			to: 'server',
			function: 'update-deck-state',
			body: decks
		});
	};

	const sendXFD = () => {
		wsClient.send({
			to: 'server',
			function: 'update-opacity',
			body: { type: 'crossfade', opacity: xfd * 0.01 }
		});
	};

	const sendDeckOpacity = (deckIndex: number, opacity: number) => {
		// デッキの状態も更新
		if (decks[deckIndex]) {
			decks[deckIndex].opacity = opacity * 0.01;
		}
		
		wsClient.send({
			to: 'server',
			function: 'update-opacity',
			body: { type: 'deck', deckIndex, opacity: opacity * 0.01 }
		});
		
		// デッキ状態も送信して同期を保つ
		sendDeckState();
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
</script>

<svelte:head>
  <title>xf-webvj dashboard</title>
</svelte:head>
<div class="w-screen">
	{#if decks.length >= 2}
		<div class="grid grid-cols-5 gap-4">
			<div class="col-span-2">
				<Deck
					bind:deckInfo={decks[0]}
					{wsClient}
					senddeck={() => {
						sendDeckState();
					}}
				></Deck>
				<div class="p-4 border-t border-base-300">
					<div class="text-center text-sm mb-2">Deck 1 Opacity</div>
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
					<div class="text-center text-xs mt-1">{deck1Opacity}%</div>
				</div>
			</div>
			<div class="py-4">
				<div class="text-center text-sm mb-2">Crossfade</div>
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
				<Deck
					bind:deckInfo={decks[1]}
					{wsClient}
					senddeck={() => {
						sendDeckState();
					}}
				></Deck>
				<div class="p-4 border-t border-base-300">
					<div class="text-center text-sm mb-2">Deck 2 Opacity</div>
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
					<div class="text-center text-xs mt-1">{deck2Opacity}%</div>
				</div>
			</div>
		</div>
	{/if}

	<div class="flex gap-4 py-2 justify-center border-y-2 border-base-300">
		<h3 class="text-lg">Movies</h3>
		<button class="btn btn-outline btn-info btn-sm rounded-full" onclick={()=>{getMovieList()}}>sync</button>
	</div>
	<table class="table w-full border-b-2 border-base-300">
		<thead>
			<tr>
				<th>Deck 1</th>
				<th>Name</th>
				<th>Deck 2</th>
			</tr>
		</thead>
		<tbody>
			{#each movieList as movie}
				<tr>
					<td>
						<button
							class="btn btn-outline w-full rounded-full"
							aria-label="deck1_load"
							onclick={() => {
								loadMovie(0, movie);
							}}
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								stroke-width="1.5"
								stroke="currentColor"
								class="w-6"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
								/>
							</svg>
						</button>
					</td>
					<td>
						{movie}
					</td>
					<td>
						<button
							class="btn btn-outline w-full rounded-full"
							aria-label="deck2_load"
							onclick={() => {
								loadMovie(1, movie);
							}}
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								stroke-width="1.5"
								stroke="currentColor"
								class="w-6"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
								/>
							</svg>
						</button>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>

	<div class="flex justify-center">
		<div class="card bg-base-200 w-96 shadow-sm">
			<div class="card-body">
				<div class="card-title">Movie Download</div>
				<div>
					<label class="input my-2">
						<input
							type="text"
							disabled={downloading}
							placeholder="Movie URL"
							bind:value={downloadMovie.url}
						/>
					</label>
					<textarea
						class="textarea my-2"
						disabled={downloading}
						placeholder="yt-dlp args"
						bind:value={downloadMovie.args}
					></textarea>
				</div>
				<div class="card-actions justify-end">
					<button
						class="btn btn-primary"
						disabled={downloading}
						onclick={() => {
							movieDownload();
						}}>Download</button
					>
				</div>
			</div>
		</div>
	</div>
</div>
