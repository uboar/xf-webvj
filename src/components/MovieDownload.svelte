<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { DownloadMovieRequest, DownloadStatus } from '$lib/types';

	let {
		downloadMovie,
		downloading,
		movieList,
		downloadStatuses,
		downloadSummary
	}: {
		downloadMovie: DownloadMovieRequest;
		downloading: boolean;
		movieList: string[];
		downloadStatuses: DownloadStatus[];
		downloadSummary: string;
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
						<span class="label-text-alt">複数URLは改行で区切り</span>
					</label>
					<textarea
						class="textarea textarea-bordered w-full"
						rows="4"
						disabled={downloading}
						placeholder="YouTubeなどの動画URLを入力&#10;複数URLを改行で区切って一括ダウンロード可能"
						bind:value={downloadMovie.url}
					></textarea>
					<label class="label">
						<span class="label-text-alt">YouTubeやniconicoなどの動画URLを入力</span>
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

			<!-- ダウンロード進捗表示 -->
			{#if downloadStatuses.length > 0}
				<div class="divider my-2">ダウンロード状況</div>
				<div class="space-y-2 max-h-64 overflow-y-auto">
					{#each downloadStatuses as status}
						<div class="bg-base-300 rounded-lg p-3">
							<div class="flex items-center gap-2 mb-1">
								{#if status.state === 'pending'}
									<span class="badge badge-ghost badge-sm">待機中</span>
								{:else if status.state === 'downloading'}
									<span class="loading loading-spinner loading-xs"></span>
									<span class="badge badge-info badge-sm">ダウンロード中</span>
								{:else if status.state === 'complete'}
									<span class="badge badge-success badge-sm">完了</span>
								{:else if status.state === 'error'}
									<span class="badge badge-error badge-sm">エラー</span>
								{/if}
								<span class="text-xs truncate flex-1" title={status.url}>{status.url}</span>
							</div>
							<div class="text-xs opacity-70 truncate" title={status.message}>
								{status.message}
							</div>
							{#if status.fileName}
								<div class="text-xs text-success mt-1 truncate" title={status.fileName}>
									{status.fileName}
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{/if}

			<!-- 完了サマリー -->
			{#if downloadSummary}
				<div class="alert alert-info mt-2">
					<span>{downloadSummary}</span>
				</div>
			{/if}

			{#if movieList.length > 0}
				<div class="divider my-2">または</div>
				<button class="btn btn-outline w-full" on:click={() => changeTab('movies')}>
					動画リストに戻る
				</button>
			{/if}
		</div>
	</div>
</div>
