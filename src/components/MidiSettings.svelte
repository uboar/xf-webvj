<script lang="ts">
	import {
		midiInputs,
		selectedInputId,
		midiStatus,
		lastMidiMessage,
		isMidiAvailable,
		midiConnected,
		midiSettings,
		requestMidiAccess,
		selectMidiInput,
		disconnectMidiInput,
		saveMidiSettings
	} from '$lib/midi';

	// Props
	let { 
		xfd = $bindable(),
		deck1Opacity = $bindable(),
		deck2Opacity = $bindable()
	}: { 
		xfd: number,
		deck1Opacity: number,
		deck2Opacity: number
	} = $props();

	// MIDI設定が変更されたら保存
	$effect(() => {
		if ($midiConnected) {
			saveMidiSettings();
		}
	});
</script>

<div class="p-4">
	<h2 class="text-xl font-bold mb-4">MIDI設定</h2>
	
	<div class="mb-6">
		<button 
			class="btn btn-primary mb-4" 
			on:click={requestMidiAccess}
			disabled={$isMidiAvailable && $midiInputs.length > 0}
		>
			MIDI機器に接続
		</button>
		
		<div class="alert mb-4 {$isMidiAvailable ? 'alert-success' : 'alert-warning'}">
			<div>
				<svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
				<span>{$midiStatus}</span>
			</div>
		</div>
	</div>

	{#if $isMidiAvailable && $midiInputs.length > 0}
		<div class="mb-6">
			<h3 class="text-lg font-semibold mb-2">MIDI入力デバイス</h3>
			<select 
				class="select select-bordered w-full max-w-md mb-2" 
				bind:value={$selectedInputId}
				on:change={() => selectMidiInput($selectedInputId)}
			>
				<option value={null}>-- デバイスを選択 --</option>
				{#each $midiInputs as input}
					<option value={input.id}>{input.name}</option>
				{/each}
			</select>
			
			{#if $selectedInputId}
				<button 
					class="btn btn-sm btn-outline btn-error" 
					on:click={disconnectMidiInput}
				>
					接続解除
				</button>
			{/if}
		</div>
		
		{#if $midiConnected}
			<div class="mb-6">
				<h3 class="text-lg font-semibold mb-2">MIDI割り当て</h3>
				
				<div class="card bg-base-200 shadow-md mb-4">
					<div class="card-body p-4">
						<div class="overflow-x-auto">
							<table class="table table-compact w-full">
								<thead>
									<tr>
										<th>機能</th>
										<th>タイプ</th>
										<th>チャンネル</th>
										<th>CC/ノート</th>
									</tr>
								</thead>
								<tbody>
									<!-- クロスフェーダー -->
									<tr>
										<td>クロスフェーダー</td>
										<td>CC</td>
										<td>
											<select 
												class="select select-bordered select-sm w-full" 
												bind:value={$midiSettings.midiChannel}
											>
												{#each Array(16).fill(0).map((_, i) => i) as ch}
													<option value={ch}>{ch + 1}</option>
												{/each}
											</select>
										</td>
										<td>
											<input 
												type="number" 
												class="input input-bordered input-sm w-20" 
												min="0" 
												max="127" 
												bind:value={$midiSettings.midiCC}
											/>
										</td>
									</tr>
									
									<!-- デッキ1透明度 -->
									<tr>
										<td>デッキ1透明度</td>
										<td>CC</td>
										<td>
											<select 
												class="select select-bordered select-sm w-full" 
												bind:value={$midiSettings.deck1Channel}
											>
												{#each Array(16).fill(0).map((_, i) => i) as ch}
													<option value={ch}>{ch + 1}</option>
												{/each}
											</select>
										</td>
										<td>
											<input 
												type="number" 
												class="input input-bordered input-sm w-20" 
												min="0" 
												max="127" 
												bind:value={$midiSettings.deck1CC}
											/>
										</td>
									</tr>
									
									<!-- デッキ2透明度 -->
									<tr>
										<td>デッキ2透明度</td>
										<td>CC</td>
										<td>
											<select 
												class="select select-bordered select-sm w-full" 
												bind:value={$midiSettings.deck2Channel}
											>
												{#each Array(16).fill(0).map((_, i) => i) as ch}
													<option value={ch}>{ch + 1}</option>
												{/each}
											</select>
										</td>
										<td>
											<input 
												type="number" 
												class="input input-bordered input-sm w-20" 
												min="0" 
												max="127" 
												bind:value={$midiSettings.deck2CC}
											/>
										</td>
									</tr>
									
									<!-- デッキ1再生/停止 -->
									<tr>
										<td>デッキ1再生/停止</td>
										<td>ノート</td>
										<td>
											<select 
												class="select select-bordered select-sm w-full" 
												bind:value={$midiSettings.deck1PlayChannel}
											>
												{#each Array(16).fill(0).map((_, i) => i) as ch}
													<option value={ch}>{ch + 1}</option>
												{/each}
											</select>
										</td>
										<td>
											<input 
												type="number" 
												class="input input-bordered input-sm w-20" 
												min="0" 
												max="127" 
												bind:value={$midiSettings.deck1PlayNote}
											/>
										</td>
									</tr>
									
									<!-- デッキ2再生/停止 -->
									<tr>
										<td>デッキ2再生/停止</td>
										<td>ノート</td>
										<td>
											<select 
												class="select select-bordered select-sm w-full" 
												bind:value={$midiSettings.deck2PlayChannel}
											>
												{#each Array(16).fill(0).map((_, i) => i) as ch}
													<option value={ch}>{ch + 1}</option>
												{/each}
											</select>
										</td>
										<td>
											<input 
												type="number" 
												class="input input-bordered input-sm w-20" 
												min="0" 
												max="127" 
												bind:value={$midiSettings.deck2PlayNote}
											/>
										</td>
									</tr>
									
									<!-- デッキ1 CUE -->
									<tr>
										<td>デッキ1 CUE</td>
										<td>ノート</td>
										<td>
											<select 
												class="select select-bordered select-sm w-full" 
												bind:value={$midiSettings.deck1CueChannel}
											>
												{#each Array(16).fill(0).map((_, i) => i) as ch}
													<option value={ch}>{ch + 1}</option>
												{/each}
											</select>
										</td>
										<td>
											<input 
												type="number" 
												class="input input-bordered input-sm w-20" 
												min="0" 
												max="127" 
												bind:value={$midiSettings.deck1CueNote}
											/>
										</td>
									</tr>
									
									<!-- デッキ2 CUE -->
									<tr>
										<td>デッキ2 CUE</td>
										<td>ノート</td>
										<td>
											<select 
												class="select select-bordered select-sm w-full" 
												bind:value={$midiSettings.deck2CueChannel}
											>
												{#each Array(16).fill(0).map((_, i) => i) as ch}
													<option value={ch}>{ch + 1}</option>
												{/each}
											</select>
										</td>
										<td>
											<input 
												type="number" 
												class="input input-bordered input-sm w-20" 
												min="0" 
												max="127" 
												bind:value={$midiSettings.deck2CueNote}
											/>
										</td>
									</tr>
								</tbody>
							</table>
						</div>
					</div>
				</div>
			</div>
			
			<div class="mb-6">
				<h3 class="text-lg font-semibold mb-2">MIDIモニター</h3>
				<div class="bg-base-300 p-3 rounded-lg">
					<p class="font-mono text-sm">{$lastMidiMessage || 'メッセージを待機中...'}</p>
				</div>
			</div>
		{/if}
	{/if}
</div>
