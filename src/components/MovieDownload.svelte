<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { DownloadMovieRequest } from '$lib/types';

	let {
		downloadMovie,
		downloading,
		movieList
	}: {
		downloadMovie: DownloadMovieRequest;
		downloading: boolean;
		movieList: string[];
	} = $props();

	const dispatch = createEventDispatcher();

	const movieDownload = () => {
		dispatch('moviedownload');
	};

	const changeTab = (tab: string) => {
		dispatch('changetab', { tab });
	};
</script>

<!-- 動画ダウンロード表示時のヘッダー -->
<div class="flex justify-center py-2">
	<h3 class="text-lg">Movie Download</h3>
</div>

<!-- 動画ダウンロードフォーム -->
<div class="flex justify-center py-6">
	<div class="card bg-base-200 w-full max-w-lg shadow-sm">
		<div class="card-body">
			<div>
				<div class="form-control w-full">
					<label class="label">
						<span class="label-text">動画URL</span>
					</label>
					<input
						type="text"
						class="input input-bordered w-full"
						disabled={downloading}
						placeholder="YouTubeなどの動画URL"
						bind:value={downloadMovie.url}
					/>
					<label class="label">
						<span class="label-text-alt">YouTubeやVimeoなどの動画URLを入力</span>
					</label>
				</div>

				<div class="form-control mt-2 w-full">
					<label class="label">
						<span class="label-text">ダウンロードオプション</span>
					</label>
					<input
						type="text"
						class="input input-bordered w-full"
						disabled={downloading}
						placeholder="-f bestvideo[height=720]"
						bind:value={downloadMovie.args}
					/>
					<label class="label">
						<span class="label-text-alt"
							>例: -f bestvideo[height=720] (720p), -f bestvideo[height=1080] (1080p)</span
						>
					</label>
				</div>
			</div>
			<div class="card-actions mt-4 justify-end">
				<button
					class="btn btn-primary"
					disabled={downloading || !downloadMovie.url}
					on:click={movieDownload}
				>
					{#if downloading}
						<span class="loading loading-spinner"></span>
						ダウンロード中...
					{:else}
						ダウンロード
					{/if}
				</button>
			</div>

			{#if movieList.length > 0}
				<div class="divider my-2">または</div>
				<button class="btn btn-outline w-full" on:click={() => changeTab('movies')}>
					動画リストに戻る
				</button>
			{/if}
		</div>
	</div>
</div>
