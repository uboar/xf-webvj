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
						<h4 class="card-title text-base mb-2">クロスフェーダー設定</h4>
						
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
							<div>
								<label class="label">
									<span class="label-text">MIDIチャンネル</span>
								</label>
								<select 
									class="select select-bordered w-full" 
									bind:value={$midiSettings.midiChannel}
								>
									{#each Array(16).fill(0).map((_, i) => i) as ch}
										<option value={ch}>チャンネル {ch + 1}</option>
									{/each}
								</select>
							</div>
							
							<div>
								<label class="label">
									<span class="label-text">CC番号</span>
								</label>
								<input 
									type="number" 
									class="input input-bordered w-full" 
									min="0" 
									max="127" 
									bind:value={$midiSettings.midiCC}
								/>
							</div>
						</div>
						
					</div>
				</div>
				
				<div class="card bg-base-200 shadow-md mb-4">
					<div class="card-body p-4">
						<h4 class="card-title text-base mb-2">デッキ1透明度設定</h4>
						
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
							<div>
								<label class="label">
									<span class="label-text">MIDIチャンネル</span>
								</label>
								<select 
									class="select select-bordered w-full" 
									bind:value={$midiSettings.deck1Channel}
								>
									{#each Array(16).fill(0).map((_, i) => i) as ch}
										<option value={ch}>チャンネル {ch + 1}</option>
									{/each}
								</select>
							</div>
							
							<div>
								<label class="label">
									<span class="label-text">CC番号</span>
								</label>
								<input 
									type="number" 
									class="input input-bordered w-full" 
									min="0" 
									max="127" 
									bind:value={$midiSettings.deck1CC}
								/>
							</div>
						</div>
						
					</div>
				</div>
				
				<div class="card bg-base-200 shadow-md mb-4">
					<div class="card-body p-4">
						<h4 class="card-title text-base mb-2">デッキ2透明度設定</h4>
						
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
							<div>
								<label class="label">
									<span class="label-text">MIDIチャンネル</span>
								</label>
								<select 
									class="select select-bordered w-full" 
									bind:value={$midiSettings.deck2Channel}
								>
									{#each Array(16).fill(0).map((_, i) => i) as ch}
										<option value={ch}>チャンネル {ch + 1}</option>
									{/each}
								</select>
							</div>
							
							<div>
								<label class="label">
									<span class="label-text">CC番号</span>
								</label>
								<input 
									type="number" 
									class="input input-bordered w-full" 
									min="0" 
									max="127" 
									bind:value={$midiSettings.deck2CC}
								/>
							</div>
						</div>
						
					</div>
				</div>
			</div>
			
			{#if $midiConnected}
				<div class="mb-6">
					<h3 class="text-lg font-semibold mb-2">MIDIモニター</h3>
					<div class="bg-base-300 p-3 rounded-lg">
						<p class="font-mono text-sm">{$lastMidiMessage || 'メッセージを待機中...'}</p>
					</div>
				</div>
			{/if}
		{/if}
	{/if}
</div>
