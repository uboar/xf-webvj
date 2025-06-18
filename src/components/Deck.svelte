<script lang="ts">
	import type { DeckType } from '$lib/types';
	import type { WSClientConnection } from '$lib/ws-client';

	let {
		senddeck,
		deckInfo = $bindable(),
		wsClient = $bindable()
	}: {
		senddeck: any;
		deckInfo: DeckType;
		wsClient: WSClientConnection;
	} = $props();

	let deckBuffer = $derived(deckInfo);
	let currentBPM = $state(180);
	let baseBPM = $state(180);
	let cueStartPos = $state(0);

	const updateSpeed = (speed: number) => {
		deckInfo.rate = speed;
		senddeck();
	};

	const calcBPM = () => {
		deckInfo.rate = Math.round((currentBPM / baseBPM) * 1000) / 1000;
		senddeck();
	};

	const durFormat = (time: number) => {
		const minutes = ('00' + Math.floor(time / 60)).slice(-2);
		const seconds = ('00' + Math.ceil(time % 60)).slice(-2);
		return `${minutes}:${seconds}`;
	};
</script>

<div class="border-base-300 col-span-2 border-x">
	<div class="text-center">Deck {deckInfo.prefix}</div>
	{#if deckInfo.movie !== ''}
		<div>
			<div class="flex">
				<div class="border-base-300 flex flex-col gap-4 border-r px-4">
					<button
						class="btn btn-warning btn-circle btn-outline btn-xl"
						onmousedown={() => {
							deckInfo.playing = true;
							cueStartPos = (deckInfo.position != undefined) ? deckInfo.position : 0;
							senddeck();
						}}
						onmouseup={() => {
							deckInfo.playing = false;
							deckInfo.position = cueStartPos;
							senddeck();
						}}>CUE</button
					>
					{#if deckInfo.playing}
						<button
							class="btn btn-error btn-circle btn-outline btn-xl"
							aria-label="stop-button"
							onclick={() => {
								deckInfo.playing = false;
								senddeck();
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
									d="M15.75 5.25v13.5m-7.5-13.5v13.5"
								/>
							</svg>
						</button>
					{:else}
						<button
							class="btn btn-success btn-circle btn-xl"
							aria-label="play-button"
							onclick={() => {
								deckInfo.playing = true;
								senddeck();
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
									d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z"
								/>
							</svg>
						</button>
					{/if}
				</div>
				<div class="p-4">
					<h4 class="mb-2 h-14 text-sm">
						{deckInfo.movie}
					</h4>
					<input
						type="range"
						min="0"
						max={deckBuffer.length}
						bind:value={deckInfo.position}
						class="range my-2 w-full"
						oninput={senddeck()}
					/>
					<div class="flex justify-between">
						<div class="text-xl">
							{deckBuffer.position != undefined ? durFormat(deckBuffer.position) : 'XX'} ／ {deckBuffer.length !=
							undefined
								? durFormat(deckBuffer.length)
								: 'XX:XX'}
						</div>
						<div>
							<label class="input input-sm">
								<input
									type="number"
									class="w-12"
									bind:value={deckInfo.rate}
									min="0.0"
									max="2.0"
									step="0.1"
									oninput={senddeck()}
								/>
							</label>
						</div>
						<div class="text-xl">
							{deckBuffer.position != undefined && deckBuffer.length != undefined
								? durFormat(deckBuffer.length - deckBuffer.position)
								: 'XX:XX'}
						</div>
					</div>
					<h4 class="border-base-300 my-2 w-full border-t-2">Speed Control</h4>
					<div class="flex-between flex gap-2">
						<button
							class="btn btn-sm btn-neutral w-8 rounded-full"
							onclick={() => {
								updateSpeed(0.5);
							}}>0.5</button
						>
						<button
							class="btn btn-sm btn-neutral w-8 rounded-full"
							onclick={() => {
								updateSpeed(0.75);
							}}>0.75</button
						>
						<button
							class="btn btn-sm btn-neutral w-8 rounded-full"
							onclick={() => {
								updateSpeed(1.0);
							}}>1</button
						>
						<button
							class="btn btn-sm btn-neutral w-8 rounded-full"
							onclick={() => {
								updateSpeed(1.25);
							}}>1.25</button
						>
						<button
							class="btn btn-sm btn-neutral w-8 rounded-full"
							onclick={() => {
								updateSpeed(1.5);
							}}>1.5</button
						>
						<div class="join">
							<div>
								<label class="input input-sm join-item">
									<input type="number" min="0" bind:value={currentBPM} />
									<span class="label">／</span>
									<input type="number" min="1" bind:value={baseBPM} />
								</label>
							</div>
							<button class="btn btn-sm btn-neutral join-item" onclick={() => calcBPM()}>=</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	{:else}
		<div class="my-16 p-4">Movie not loaded.</div>
	{/if}
</div>
