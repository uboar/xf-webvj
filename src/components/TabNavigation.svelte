<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	let { activeTab }: { activeTab: string } = $props();

	const dispatch = createEventDispatcher();

	const changeTab = (tab: string) => {
		dispatch('changetab', { tab });
	};
</script>

<div class="tabs tabs-box tabs-sm my-2 justify-center bg-transparent flex flex-wrap">
	<button
		class={`tab ${activeTab === 'movies' ? 'tab-active' : ''}`}
		on:click={() => changeTab('movies')}
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
			stroke-width="1.5"
			stroke="currentColor"
			class="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z"
			/>
		</svg>
		<span class="text-xs sm:text-sm">動画リスト</span>
	</button>
	<button
		class={`tab ${activeTab === 'preview' ? 'tab-active' : ''}`}
		on:click={() => changeTab('preview')}
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
			stroke-width="1.5"
			stroke="currentColor"
			class="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
			/>
		</svg>
		<span class="text-xs sm:text-sm">プレビュー</span>
	</button>
	<button
		class={`tab ${activeTab === 'download' ? 'tab-active' : ''}`}
		on:click={() => changeTab('download')}
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
			stroke-width="1.5"
			stroke="currentColor"
			class="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
			/>
		</svg>
		<span class="text-xs sm:text-sm">動画ダウンロード</span>
	</button>
	<button
		class={`tab ${activeTab === 'midi' ? 'tab-active' : ''}`}
		on:click={() => changeTab('midi')}
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
			stroke-width="1.5"
			stroke="currentColor"
			class="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z"
			/>
		</svg>
		<span class="text-xs sm:text-sm">MIDI設定</span>
	</button>
</div>
