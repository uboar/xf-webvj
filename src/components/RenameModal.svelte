<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	let {
		renameModalOpen = $bindable(),
		selectedMovie = $bindable(),
		newMovieName = $bindable(),
		renamingInProgress = $bindable(),
		deletingInProgress = $bindable(),
		showDeleteConfirm = $bindable()
	}: {
		renameModalOpen?: boolean;
		selectedMovie?: string;
		newMovieName?: string;
		renamingInProgress?: boolean;
		deletingInProgress?: boolean;
		showDeleteConfirm?: boolean;
	} = $props();

	const dispatch = createEventDispatcher();

	const renameMovie = () => {
		dispatch('renamemovie');
	};

	const deleteMovie = () => {
		dispatch('deletemovie');
	};

	const closeModal = () => {
		dispatch('closemodal');
	};

	const setShowDeleteConfirm = (value: boolean) => {
		dispatch('setshowdeleteconfirm', { value });
	};
</script>

{#if renameModalOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
		on:click={(e) => {
			// モーダル外をクリックした場合は閉じる
			if (e.target === e.currentTarget) closeModal();
		}}
	>
		<div class="bg-base-100 mx-4 w-full max-w-md rounded-lg p-6 shadow-xl">
			{#if showDeleteConfirm}
				<!-- 削除確認画面 -->
				<h3 class="text-error mb-4 text-lg font-bold">ファイルを削除しますか？</h3>
				<div class="py-2">
					<p class="mb-4">「{selectedMovie}」を削除します。この操作は元に戻せません。</p>
					<div class="bg-base-200 mb-2 rounded-lg p-3 text-sm">
						<p class="font-semibold">注意:</p>
						<ul class="list-inside list-disc">
							<li>デッキに読み込まれている場合、デッキからも削除されます</li>
							<li>ファイルは完全に削除され、復元できません</li>
						</ul>
					</div>
				</div>
				<div class="modal-action">
					<button
						class="btn btn-ghost btn-sm"
						on:click={() => setShowDeleteConfirm(false)}
						disabled={deletingInProgress}
					>
						キャンセル
					</button>
					<button class="btn btn-error btn-sm" on:click={deleteMovie} disabled={deletingInProgress}>
						{#if deletingInProgress}
							<span class="loading loading-spinner loading-xs"></span>
							削除中...
						{:else}
							削除する
						{/if}
					</button>
				</div>
			{:else}
				<!-- 名前変更画面 -->
				<h3 class="mb-4 text-lg font-bold">ファイル名の変更</h3>
				<div class="py-2">
					<input
						type="text"
						class="input input-bordered w-full"
						bind:value={newMovieName}
						placeholder="新しいファイル名を入力"
						autofocus
						on:keydown={(e) => {
							if (e.key === 'Enter' && newMovieName && newMovieName !== selectedMovie) {
								renameMovie();
							} else if (e.key === 'Escape') {
								closeModal();
							}
						}}
					/>
					<p class="text-base-content/70 mt-2 text-xs">元のファイル名: {selectedMovie}</p>
				</div>
				<div class="modal-action flex justify-between">
					<button
						class="btn btn-error btn-sm"
						on:click={() => setShowDeleteConfirm(true)}
						disabled={renamingInProgress}
					>
						削除
					</button>

					<div>
						<button
							class="btn btn-ghost btn-sm"
							on:click={closeModal}
							disabled={renamingInProgress}
						>
							キャンセル
						</button>
						<button
							class="btn btn-primary btn-sm ml-2"
							on:click={renameMovie}
							disabled={!newMovieName || newMovieName === selectedMovie || renamingInProgress}
						>
							{#if renamingInProgress}
								<span class="loading loading-spinner loading-xs"></span>
								処理中...
							{:else}
								変更
							{/if}
						</button>
					</div>
				</div>
			{/if}
		</div>
	</div>
{/if}
