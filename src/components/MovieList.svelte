<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	let {
		movieList,
		searchQuery = $bindable()
	}: {
		movieList: string[];
		searchQuery?: string;
	} = $props();

	const dispatch = createEventDispatcher();

	let filteredMovieList = $derived.by(() => {
		if (!searchQuery) return movieList;
		return movieList.filter((movie) => movie.toLowerCase().includes(searchQuery.toLowerCase()));
	});

	const highlightSearchTerm = (text: string, query: string) => {
		if (!query) return text;

		const lowerText = text.toLowerCase();
		const lowerQuery = query.toLowerCase();
		const index = lowerText.indexOf(lowerQuery);

		if (index === -1) return text;

		const before = text.substring(0, index);
		const match = text.substring(index, index + query.length);
		const after = text.substring(index + query.length);

		return `${before}<span class="bg-warning/30 font-semibold">${match}</span>${after}`;
	};

	const loadMovie = (deck: number, movie: string) => {
		dispatch('loadmovie', { deck, movie });
	};

	const openRenameModal = (movie: string) => {
		dispatch('openrenamemodal', { movie });
	};

	const getMovieList = () => {
		dispatch('getmovielist');
	};

	const changeTab = (tab: string) => {
		dispatch('changetab', { tab });
	};
</script>

<!-- 動画リスト表示時のヘッダー -->
<div class="flex flex-wrap items-center justify-between gap-4 px-4 py-2">
	<div class="flex items-center gap-4">
		<h3 class="text-md">Movies</h3>
		<button class="btn btn-outline btn-info btn-xs rounded-full" on:click={getMovieList}>sync</button>
	</div>
	<div class="max-w-md flex-grow">
		<div class="relative">
			<input
				type="text"
				class="input input-bordered w-full pr-10"
				placeholder="動画を検索..."
				bind:value={searchQuery}
			/>
			{#if searchQuery}
				<button
					class="btn btn-ghost btn-xs btn-circle absolute top-1/2 right-2 -translate-y-1/2"
					on:click={() => (searchQuery = '')}
					title="検索をクリア"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						stroke-width="1.5"
						stroke="currentColor"
						class="h-4 w-4"
					>
						<path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
					</svg>
				</button>
			{:else}
				<div class="absolute top-1/2 right-3 -translate-y-1/2 opacity-50">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						stroke-width="1.5"
						stroke="currentColor"
						class="h-5 w-5"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
						/>
					</svg>
				</div>
			{/if}
		</div>
	</div>
</div>

<!-- 動画リスト表示 -->
<table class="table-sm border-base-300 table w-full border-b-2">
	<thead>
		<tr>
			<th>Deck 1</th>
			<th>Name</th>
			<th>Deck 2</th>
		</tr>
	</thead>
	<tbody>
		{#if filteredMovieList.length === 0}
			<tr>
				<td colspan="3" class="text-base-content/70 py-8 text-center">
					{#if searchQuery}
						<div class="flex flex-col items-center gap-2">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								stroke-width="1.5"
								stroke="currentColor"
								class="h-6 w-6"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
								/>
							</svg>
							<p>「{searchQuery}」に一致する動画が見つかりません</p>
							<button class="btn btn-sm btn-ghost" on:click={() => (searchQuery = '')}>検索をクリア</button>
						</div>
					{:else}
						<div class="flex flex-col items-center gap-2">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								stroke-width="1.5"
								stroke="currentColor"
								class="h-6 w-6"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z"
								/>
							</svg>
							<p>動画がありません</p>
							<button class="btn btn-sm btn-primary mt-2" on:click={() => changeTab('download')}>
								動画をダウンロードする
							</button>
						</div>
					{/if}
				</td>
			</tr>
		{:else}
			{#each filteredMovieList as movie}
				<tr>
					<td>
						<button
							class="btn btn-sm btn-outline w-full rounded-full"
							aria-label="deck1_load"
							on:click={() => loadMovie(0, movie)}
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
						<span
							class="hover:bg-base-200 max-w-xs cursor-pointer truncate rounded px-2 py-1"
							on:dblclick={() => openRenameModal(movie)}
							title="ダブルクリックして名前を変更"
						>
									{#if searchQuery}
										{@html highlightSearchTerm(movie, searchQuery ?? '')}
									{:else}
										{movie}
									{/if}
						</span>
					</td>
					<td>
						<button
							class="btn btn-sm btn-outline w-full rounded-full"
							aria-label="deck2_load"
							on:click={() => loadMovie(1, movie)}
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
		{/if}
	</tbody>
</table>
