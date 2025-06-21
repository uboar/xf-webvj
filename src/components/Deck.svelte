<script lang="ts">
	import type { DeckType } from '$lib/types';
	import type { WSClientConnection } from '$lib/ws-client';
	import { onMount } from 'svelte';
	import { onDeck1PlayToggle, onDeck2PlayToggle } from '$lib/midi';

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
	
	// 再生/停止を切り替える関数
	const togglePlay = () => {
		deckInfo.playing = !deckInfo.playing;
		senddeck();
	};
	
	onMount(() => {
		// デッキ番号に応じてMIDIコールバックを設定
		if (deckInfo.prefix === '1') {
			onDeck1PlayToggle.set(togglePlay);
		} else if (deckInfo.prefix === '2') {
			onDeck2PlayToggle.set(togglePlay);
		}
		
		return () => {
			// コンポーネントのアンマウント時にコールバックをリセット
			if (deckInfo.prefix === '1') {
				onDeck1PlayToggle.set(() => {});
			} else if (deckInfo.prefix === '2') {
				onDeck2PlayToggle.set(() => {});
			}
		};
	});
</script>

<div class="border-base-300 border-x">
	<div class="text-center">Deck {deckInfo.prefix}</div>
	{#if deckInfo.movie !== ''}
		<div>
			<div class="flex flex-col sm:flex-row">
				<div class="border-base-300 flex flex-row sm:flex-col gap-4 sm:border-r px-4 py-2 justify-center">
					<button
						class="btn btn-warning btn-circle btn-outline btn-md sm:btn-xl"
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
							class="btn btn-error btn-circle btn-outline btn-md sm:btn-xl"
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
								class="w-5 sm:w-6"
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
							class="btn btn-success btn-circle btn-md sm:btn-xl"
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
								class="w-5 sm:w-6"
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
				<div class="p-2 sm:p-4 w-full">
					<h4 class="mb-2 h-10 sm:h-14 text-sm overflow-hidden text-ellipsis">
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
					<div class="flex flex-wrap justify-between text-sm sm:text-base">
						<div class="text-md sm:text-xl">
							{deckBuffer.position != undefined ? durFormat(deckBuffer.position) : 'XX'} ／ {deckBuffer.length !=
							undefined
								? durFormat(deckBuffer.length)
								: 'XX:XX'}
						</div>
						<div>
							<label class="input input-xs sm:input-sm">
								<input
									type="number"
									class="w-10 sm:w-12"
									bind:value={deckInfo.rate}
									min="0.0"
									max="2.0"
									step="0.1"
									oninput={senddeck()}
								/>
							</label>
						</div>
						<div class="text-md sm:text-xl">
							{deckBuffer.position != undefined && deckBuffer.length != undefined
								? durFormat(deckBuffer.length - deckBuffer.position)
								: 'XX:XX'}
						</div>
					</div>
					<h4 class="border-base-300 my-2 w-full border-t-2">Speed Control</h4>
					<div class="flex flex-wrap justify-center sm:justify-between gap-1 sm:gap-2">
						<button
							class="btn btn-xs sm:btn-sm btn-neutral w-6 sm:w-8 rounded-full"
							onclick={() => {
								updateSpeed(0.5);
							}}>0.5</button
						>
						<button
							class="btn btn-xs sm:btn-sm btn-neutral w-6 sm:w-8 rounded-full"
							onclick={() => {
								updateSpeed(0.75);
							}}>0.75</button
						>
						<button
							class="btn btn-xs sm:btn-sm btn-neutral w-6 sm:w-8 rounded-full"
							onclick={() => {
								updateSpeed(1.0);
							}}>1</button
						>
						<button
							class="btn btn-xs sm:btn-sm btn-neutral w-6 sm:w-8 rounded-full"
							onclick={() => {
								updateSpeed(1.25);
							}}>1.25</button
						>
						<button
							class="btn btn-xs sm:btn-sm btn-neutral w-6 sm:w-8 rounded-full"
							onclick={() => {
								updateSpeed(1.5);
							}}>1.5</button
						>
						<div class="join mt-2 sm:mt-0">
							<div>
								<label class="input input-xs sm:input-sm join-item">
									<input type="number" min="0" class="w-12 sm:w-16" bind:value={currentBPM} />
									<span class="label">／</span>
									<input type="number" min="1" class="w-12 sm:w-16" bind:value={baseBPM} />
								</label>
							</div>
							<button class="btn btn-xs sm:btn-sm btn-neutral join-item" onclick={() => calcBPM()}>=</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	{:else}
		<div class="my-8 sm:my-16 p-4 text-center">Movie not loaded.</div>
	{/if}
</div>
