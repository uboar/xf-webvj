<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	let {
		playlist,
		movieList
	}: {
		playlist: string[];
		movieList: string[];
	} = $props();

	const dispatch = createEventDispatcher<{
		loadmovie: { deck: number; movie: string };
		reorderitem: { fromIndex: number; toIndex: number };
		removeitem: { index: number };
		downloadplaylist: void;
		importplaylist: { file: File };
		clearplaylist: void;
	}>();

	let dragIndex = $state<number | null>(null);
	let dropIndex = $state<number | null>(null);

	const isAvailableMovie = (movie: string) => movieList.includes(movie);

	const getParentPath = (moviePath: string) => {
		const lastSlashIndex = moviePath.lastIndexOf('/');
		return lastSlashIndex === -1 ? '' : moviePath.slice(0, lastSlashIndex);
	};

	const getMovieName = (moviePath: string) => moviePath.split('/').pop() ?? moviePath;

	const handleImport = (event: Event) => {
		const input = event.currentTarget as HTMLInputElement;
		const [file] = input.files ?? [];

		if (!file) return;

		dispatch('importplaylist', { file });
		input.value = '';
	};

	const handleDragStart = (index: number, event: DragEvent) => {
		dragIndex = index;

		if (event.dataTransfer) {
			event.dataTransfer.effectAllowed = 'move';
			event.dataTransfer.setData('text/plain', String(index));
		}
	};

	const handleDragOver = (index: number, event: DragEvent) => {
		event.preventDefault();
		dropIndex = index;

		if (event.dataTransfer) {
			event.dataTransfer.dropEffect = 'move';
		}
	};

	const handleDrop = (index: number, event: DragEvent) => {
		event.preventDefault();

		if (dragIndex === null || dragIndex === index) {
			dragIndex = null;
			dropIndex = null;
			return;
		}

		dispatch('reorderitem', { fromIndex: dragIndex, toIndex: index });
		dragIndex = null;
		dropIndex = null;
	};

	const handleDragEnd = () => {
		dragIndex = null;
		dropIndex = null;
	};
</script>

<div class="flex flex-col gap-4 p-4">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<div>
			<h3 class="text-md">Playlist</h3>
			<p class="text-base-content/60 text-sm">動画リストから追加した順番をここで管理します。</p>
		</div>
		<div class="flex flex-wrap items-center gap-2">
			<label class="btn btn-outline btn-sm rounded-full">
				JSONを読み込む
				<input type="file" class="hidden" accept="application/json,.json" onchange={handleImport} />
			</label>
			<button class="btn btn-outline btn-sm rounded-full" onclick={() => dispatch('downloadplaylist')}>
				JSONを保存
			</button>
			<button class="btn btn-outline btn-error btn-sm rounded-full" onclick={() => dispatch('clearplaylist')}>
				クリア
			</button>
		</div>
	</div>

	{#if playlist.length === 0}
		<div class="border-base-300 text-base-content/70 rounded-box border border-dashed p-8 text-center">
			プレイリストは空です。動画リストタブから追加してください。
		</div>
	{:else}
		<div class="overflow-x-auto">
			<table class="table-sm border-base-300 table w-full border-y">
				<thead>
					<tr>
						<th class="w-20 sm:w-auto whitespace-nowrap">Deck 1</th>
						<th>Name</th>
						<th class="w-20 sm:w-auto whitespace-nowrap">Deck 2</th>
					</tr>
				</thead>
				<tbody>
					{#each playlist as movie, index (`${movie}-${index}`)}
						<tr
							class={`${!isAvailableMovie(movie) ? 'bg-warning/10' : ''} ${dropIndex === index ? 'ring-primary ring-1' : ''} ${dragIndex === index ? 'opacity-60' : ''}`}
							draggable="true"
							ondragstart={(event) => handleDragStart(index, event)}
							ondragover={(event) => handleDragOver(index, event)}
							ondrop={(event) => handleDrop(index, event)}
							ondragend={handleDragEnd}
						>
							<td class="px-1 sm:px-4">
								<button
									class="btn btn-xs sm:btn-sm btn-outline w-full rounded-full"
									onclick={() => dispatch('loadmovie', { deck: 0, movie })}
									disabled={!isAvailableMovie(movie)}
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										fill="none"
										viewBox="0 0 24 24"
										stroke-width="1.5"
										stroke="currentColor"
										class="w-4 sm:w-6"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
										/>
									</svg>
								</button>
							</td>
							<td class="px-1 sm:px-4">
								<div
									class="hover:bg-base-200 flex max-w-sm cursor-grab items-start gap-2 rounded px-2 py-1 text-xs sm:max-w-none sm:text-sm active:cursor-grabbing"
									title="ドラッグして並び替え"
								>
									<span class="text-base-content/50 mt-0.5 shrink-0 text-[11px] sm:text-xs">
										{index + 1}.
									</span>
									<span class="text-base-content/60 pt-0.5">⋮⋮</span>
									<span class="min-w-0">
										<span class="block truncate">{getMovieName(movie)}</span>
										{#if getParentPath(movie)}
											<span class="text-base-content/50 block truncate text-[11px] sm:text-xs">
												{getParentPath(movie)}
											</span>
										{/if}
										{#if !isAvailableMovie(movie)}
											<span class="text-warning block text-[11px] sm:text-xs">
												現在の動画リストに存在しません
											</span>
										{/if}
									</span>
									<button
										class="btn btn-xs btn-ghost btn-error ml-auto shrink-0"
										onclick={() => dispatch('removeitem', { index })}
										aria-label="remove-item"
									>
										削除
									</button>
								</div>
							</td>
							<td class="px-1 sm:px-4">
								<button
									class="btn btn-xs sm:btn-sm btn-outline w-full rounded-full"
									onclick={() => dispatch('loadmovie', { deck: 1, movie })}
									disabled={!isAvailableMovie(movie)}
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										fill="none"
										viewBox="0 0 24 24"
										stroke-width="1.5"
										stroke="currentColor"
										class="w-4 sm:w-6"
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
		</div>
	{/if}
</div>
