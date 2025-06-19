<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	let { activeTab }: { activeTab: string } = $props();

	const dispatch = createEventDispatcher();

	const changeTab = (tab: string) => {
		dispatch('changetab', { tab });
	};
</script>

<div class="tabs tabs-box tabs-sm my-2 justify-center bg-transparent">
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
			class="mr-2 h-5 w-5"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z"
			/>
		</svg>
		動画リスト
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
			class="mr-2 h-5 w-5"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
			/>
		</svg>
		動画ダウンロード
	</button>
</div>
