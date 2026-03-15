<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	type MovieTreeNode = {
		name: string;
		path: string;
		type: 'folder' | 'file';
		children?: MovieTreeNode[];
	};

	type MovieTreeRow = {
		type: 'folder' | 'file';
		name: string;
		path: string;
		depth: number;
	};

	let {
		movieList,
		searchQuery = $bindable('')
	}: {
		movieList: string[];
		searchQuery: string;
	} = $props();

	const dispatch = createEventDispatcher();
	let expandedFolders = $state(new Set<string>());
	let folderStateInitialized = $state(false);

	let filteredMovieList = $derived.by(() => {
		if (!searchQuery) return movieList;
		return movieList.filter((movie) => movie.toLowerCase().includes(searchQuery.toLowerCase()));
	});

	const sortNodes = (nodes: MovieTreeNode[]) =>
		nodes.sort((a, b) => {
			if (a.type !== b.type) {
				return a.type === 'folder' ? -1 : 1;
			}

			return a.name.localeCompare(b.name);
		});

	const buildMovieTree = (movies: string[]) => {
		const rootNodes: MovieTreeNode[] = [];
		const folderMap = new Map<string, MovieTreeNode>();

		for (const movie of movies) {
			const segments = movie.split('/');
			let currentNodes = rootNodes;
			let currentPath = '';

			for (const [index, segment] of segments.entries()) {
				currentPath = currentPath ? `${currentPath}/${segment}` : segment;
				const isFile = index === segments.length - 1;

				if (isFile) {
					currentNodes.push({
						name: segment,
						path: currentPath,
						type: 'file'
					});
					continue;
				}

				let folderNode = folderMap.get(currentPath);

				if (!folderNode) {
					folderNode = {
						name: segment,
						path: currentPath,
						type: 'folder',
						children: []
					};
					folderMap.set(currentPath, folderNode);
					currentNodes.push(folderNode);
				}

				currentNodes = folderNode.children ?? [];
			}
		}

		const sortTree = (nodes: MovieTreeNode[]) => {
			sortNodes(nodes);
			for (const node of nodes) {
				if (node.children) {
					sortTree(node.children);
				}
			}
		};

		sortTree(rootNodes);
		return rootNodes;
	};

	const collectFolderPaths = (nodes: MovieTreeNode[]): string[] =>
		nodes.flatMap((node) =>
			node.type === 'folder' ? [node.path, ...collectFolderPaths(node.children ?? [])] : []
		);

	const collectRootFolderPaths = (nodes: MovieTreeNode[]) =>
		nodes.filter((node) => node.type === 'folder').map((node) => node.path);

	const flattenMovieTree = (
		nodes: MovieTreeNode[],
		depth = 0,
		rows: MovieTreeRow[] = []
	): MovieTreeRow[] => {
		for (const node of nodes) {
			rows.push({
				type: node.type,
				name: node.name,
				path: node.path,
				depth
			});

			if (
				node.type === 'folder' &&
				node.children &&
				(searchQuery || expandedFolders.has(node.path))
			) {
				flattenMovieTree(node.children, depth + 1, rows);
			}
		}

		return rows;
	};

	let movieTree = $derived.by(() => buildMovieTree(filteredMovieList));
	let visibleRows = $derived.by(() => flattenMovieTree(movieTree));

	$effect(() => {
		const folderPaths = collectFolderPaths(movieTree);
		const nextExpandedFolders = new Set(
			[...expandedFolders].filter((folderPath) => folderPaths.includes(folderPath))
		);

		if (!folderStateInitialized && folderPaths.length > 0) {
			for (const folderPath of collectRootFolderPaths(movieTree)) {
				nextExpandedFolders.add(folderPath);
			}

			folderStateInitialized = true;
			expandedFolders = nextExpandedFolders;
			return;
		}

		const hasChanged =
			nextExpandedFolders.size !== expandedFolders.size ||
			[...nextExpandedFolders].some((folderPath) => !expandedFolders.has(folderPath));

		if (hasChanged) {
			expandedFolders = nextExpandedFolders;
		}
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

	const addToPlaylist = (movie: string) => {
		dispatch('addtoplaylist', { movie });
	};

	const getMovieList = () => {
		dispatch('getmovielist');
	};

	const changeTab = (tab: string) => {
		dispatch('changetab', { tab });
	};

	const toggleFolder = (folderPath: string) => {
		const nextExpandedFolders = new Set(expandedFolders);

		if (nextExpandedFolders.has(folderPath)) {
			nextExpandedFolders.delete(folderPath);
		} else {
			nextExpandedFolders.add(folderPath);
		}

		expandedFolders = nextExpandedFolders;
	};

	const getParentPath = (moviePath: string) => {
		const lastSlashIndex = moviePath.lastIndexOf('/');
		return lastSlashIndex === -1 ? '' : moviePath.slice(0, lastSlashIndex);
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
<div class="overflow-x-auto">
	<table class="table-sm border-base-300 table w-full border-b-2">
		<thead>
			<tr>
				<th class="w-20 sm:w-auto whitespace-nowrap">Deck 1</th>
				<th>Name</th>
				<th class="w-24 sm:w-auto whitespace-nowrap">Playlist</th>
				<th class="w-20 sm:w-auto whitespace-nowrap">Deck 2</th>
			</tr>
		</thead>
		<tbody>
			{#if filteredMovieList.length === 0}
				<tr>
					<td colspan="4" class="text-base-content/70 py-8 text-center">
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
				{#each visibleRows as row}
					{#if row.type === 'folder'}
						<tr class="bg-base-200/40">
							<td colspan="4" class="px-1 sm:px-4">
								<button
									class="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-xs sm:text-sm"
									on:click={() => toggleFolder(row.path)}
								>
									<span class="inline-flex w-4 justify-center">
										{#if searchQuery || expandedFolders.has(row.path)}
											▾
										{:else}
											▸
										{/if}
									</span>
									<span
										class="text-base-content/60"
										style={`padding-left: ${row.depth * 1.25}rem`}
									>
										[dir]
									</span>
									<span class="font-medium">
										{#if searchQuery}
											{@html highlightSearchTerm(row.name, searchQuery ?? '')}
										{:else}
											{row.name}
										{/if}
									</span>
								</button>
							</td>
						</tr>
					{:else}
						<tr>
							<td class="px-1 sm:px-4">
								<button
									class="btn btn-xs sm:btn-sm btn-outline w-full rounded-full"
									aria-label="deck1_load"
									on:click={() => loadMovie(0, row.path)}
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
								<span
									class="hover:bg-base-200 block max-w-sm cursor-pointer rounded px-2 py-1 text-xs sm:max-w-none sm:text-sm"
									on:dblclick={() => openRenameModal(row.path)}
									title="ダブルクリックして名前を変更"
								>
									<span
										class="flex items-start gap-2"
										style={`padding-left: ${row.depth * 1.25}rem`}
									>
										<span class="text-base-content/60 pt-0.5">•</span>
										<span class="min-w-0">
											<span class="block truncate">
												{#if searchQuery}
													{@html highlightSearchTerm(row.name, searchQuery ?? '')}
												{:else}
													{row.name}
												{/if}
											</span>
											{#if getParentPath(row.path)}
												<span class="text-base-content/50 block truncate text-[11px] sm:text-xs">
													{getParentPath(row.path)}
												</span>
											{/if}
										</span>
									</span>
								</span>
							</td>
							<td class="px-1 sm:px-4">
								<button
									class="btn btn-xs sm:btn-sm btn-primary w-full rounded-full"
									on:click={() => addToPlaylist(row.path)}
								>
									追加
								</button>
							</td>
							<td class="px-1 sm:px-4">
								<button
									class="btn btn-xs sm:btn-sm btn-outline w-full rounded-full"
									aria-label="deck2_load"
									on:click={() => loadMovie(1, row.path)}
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
					{/if}
				{/each}
			{/if}
		</tbody>
	</table>
</div>
