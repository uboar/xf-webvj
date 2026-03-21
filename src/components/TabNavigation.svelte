<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let activeTab: string;
	export let wsConnected: boolean;
	export let outputPageConnected: boolean;
	export let onreconnect: () => void;
	export let onrefresh: () => void;

	const dispatch = createEventDispatcher();

	const changeTab = (tab: string) => {
		dispatch('changetab', { tab });
	};
</script>

<div class="flex items-center gap-1 px-1 py-1 min-w-0">
	<div class="tabs tabs-box tabs-sm bg-transparent flex flex-nowrap overflow-x-auto sm:flex-wrap flex-1 min-w-0">
		<button
			class={`tab shrink-0 ${activeTab === 'deck' ? 'tab-active' : ''}`}
			onclick={() => changeTab('deck')}
			title="Deck"
		>
			<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4 sm:mr-1.5">
				<path stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
			</svg>
			<span class="hidden sm:inline text-sm">Deck</span>
		</button>
		<button
			class={`tab shrink-0 ${activeTab === 'movies' ? 'tab-active' : ''}`}
			onclick={() => changeTab('movies')}
			title="動画リスト"
		>
			<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4 sm:mr-1.5">
				<path stroke-linecap="round" stroke-linejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
			</svg>
			<span class="hidden sm:inline text-sm">動画リスト</span>
		</button>
		<button
			class={`tab shrink-0 ${activeTab === 'youtube' ? 'tab-active' : ''}`}
			onclick={() => changeTab('youtube')}
			title="YouTube"
		>
			<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4 sm:mr-1.5">
				<path stroke-linecap="round" stroke-linejoin="round" d="M10.5 15.75 15.75 12 10.5 8.25v7.5Z" />
				<path stroke-linecap="round" stroke-linejoin="round" d="M21 7.5c0-1.657-1.343-3-3-3H6c-1.657 0-3 1.343-3 3v9c0 1.657 1.343 3 3 3h12c1.657 0 3-1.343 3-3v-9Z" />
			</svg>
			<span class="hidden sm:inline text-sm">YouTube</span>
		</button>
		<button
			class={`tab shrink-0 ${activeTab === 'playlist' ? 'tab-active' : ''}`}
			onclick={() => changeTab('playlist')}
			title="プレイリスト"
		>
			<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4 sm:mr-1.5">
				<path stroke-linecap="round" stroke-linejoin="round" d="M9 6.75h11.25M9 12h11.25m-11.25 5.25h11.25M3.75 6.75h.008v.008H3.75V6.75Zm0 5.25h.008v.008H3.75V12Zm0 5.25h.008v.008H3.75v-.008Z" />
			</svg>
			<span class="hidden sm:inline text-sm">プレイリスト</span>
		</button>
		<button
			class={`tab shrink-0 ${activeTab === 'preview' ? 'tab-active' : ''}`}
			onclick={() => changeTab('preview')}
			title="プレビュー"
		>
			<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4 sm:mr-1.5">
				<path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
			</svg>
			<span class="hidden sm:inline text-sm">プレビュー</span>
		</button>
		<button
			class={`tab shrink-0 ${activeTab === 'download' ? 'tab-active' : ''}`}
			onclick={() => changeTab('download')}
			title="動画ダウンロード"
		>
			<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4 sm:mr-1.5">
				<path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
			</svg>
			<span class="hidden sm:inline text-sm">動画ダウンロード</span>
		</button>
		<button
			class={`tab shrink-0 ${activeTab === 'midi' ? 'tab-active' : ''}`}
			onclick={() => changeTab('midi')}
			title="MIDI設定"
		>
			<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4 sm:mr-1.5">
				<path stroke-linecap="round" stroke-linejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
			</svg>
			<span class="hidden sm:inline text-sm">MIDI設定</span>
		</button>
	</div>

	<div class="flex items-center gap-1 shrink-0">
		{#if !outputPageConnected}
			<a href="/output" target="_blank" class="btn btn-xs btn-warning gap-1" title="出力ページが未接続 - クリックで開く">
				<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
				<span class="hidden sm:inline text-xs">出力</span>
			</a>
		{/if}
		{#if !wsConnected}
			<button class="btn btn-xs btn-error gap-1" onclick={onreconnect} title="サーバー切断中 - クリックで再接続">
				<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
				<span class="hidden sm:inline text-xs">再接続</span>
			</button>
		{:else}
			<div class="w-2 h-2 rounded-full bg-success shrink-0" title="WS接続中"></div>
		{/if}
		<button class="btn btn-xs btn-ghost p-1 shrink-0" onclick={onrefresh} title="情報更新">
			<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
		</button>
	</div>
</div>
