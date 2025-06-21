<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { createEventDispatcher } from 'svelte';

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

	// State
	let midiAccess = $state<WebMidi.MIDIAccess | null>(null);
	let midiInputs = $state<WebMidi.MIDIInput[]>([]);
	let selectedInput = $state('');
	let midiStatus = $state('未接続');
	let lastMidiMessage = $state('');
	let isMidiAvailable = $state(false);
	let midiConnected = $state(false);
	
	// MIDI CC設定
	// クロスフェーダー
	let midiChannel = $state(0); // デフォルトはチャンネル1 (0-based)
	let midiCC = $state(31); // デフォルトはCC#31
	
	// デッキ1の透明度
	let deck1Channel = $state(0); // デフォルトはチャンネル1 (0-based)
	let deck1CC = $state(32); // デフォルトはCC#32
	
	// デッキ2の透明度
	let deck2Channel = $state(0); // デフォルトはチャンネル1 (0-based)
	let deck2CC = $state(33); // デフォルトはCC#33

	const dispatch = createEventDispatcher();

	// MIDIアクセスをリクエスト
	const requestMidiAccess = async () => {
		try {
			if (navigator.requestMIDIAccess) {
				midiAccess = await navigator.requestMIDIAccess();
				isMidiAvailable = true;
				midiStatus = 'MIDI接続が許可されました';
				updateMidiInputs();
			} else {
				midiStatus = 'お使いのブラウザはWeb MIDI APIをサポートしていません';
				isMidiAvailable = false;
			}
		} catch (error) {
			midiStatus = `MIDI接続エラー: ${error}`;
			isMidiAvailable = false;
		}
	};

	// MIDI入力デバイスのリストを更新
	const updateMidiInputs = () => {
		if (!midiAccess) return;

		midiInputs = Array.from(midiAccess.inputs.values());
		
		// 既に選択されているデバイスが存在するか確認
		if (selectedInput && !midiInputs.some(input => input.id === selectedInput)) {
			selectedInput = '';
		}
	};

	// MIDI入力デバイスを選択
	const selectMidiInput = (inputId: string) => {
		// 前の接続を解除
		disconnectMidiInput();

		// 新しい入力を選択
		selectedInput = inputId;
		
		// 選択したデバイスに接続
		if (selectedInput) {
			const input = midiInputs.find(input => input.id === selectedInput);
			if (input) {
				input.onmidimessage = handleMidiMessage;
				midiConnected = true;
				midiStatus = `${input.name}に接続しました`;
			}
		}
	};

	// MIDI入力デバイスの接続を解除
	const disconnectMidiInput = () => {
		if (selectedInput) {
			const input = midiInputs.find(input => input.id === selectedInput);
			if (input) {
				input.onmidimessage = null;
			}
			midiConnected = false;
			midiStatus = 'MIDI接続が解除されました';
		}
	};

	// MIDIメッセージを処理
	const handleMidiMessage = (message: WebMidi.MIDIMessageEvent) => {
		const data = message.data;
		
		// MIDIメッセージの種類を判断
		const [status, data1, data2] = data;
		
		// チャンネル番号を取得 (下位4ビット)
		const channel = status & 0x0F;
		
		// メッセージタイプを取得 (上位4ビット)
		const type = status & 0xF0;
		
		// コントロールチェンジメッセージ (0xB0)
		if (type === 0xB0) {
			// CC値を0-127から0-100に変換
			const value = Math.round((data2 / 127) * 100);
			
			// クロスフェーダー
			if (channel === midiChannel && data1 === midiCC) {
				xfd = value;
				dispatch('xfdchange', { value });
				lastMidiMessage = `クロスフェーダー: CH:${channel+1} CC#${midiCC}: ${data2} (${value}%)`;
			}
			// デッキ1の透明度
			else if (channel === deck1Channel && data1 === deck1CC) {
				deck1Opacity = value;
				dispatch('deck1opacitychange', { value });
				lastMidiMessage = `デッキ1透明度: CH:${channel+1} CC#${deck1CC}: ${data2} (${value}%)`;
			}
			// デッキ2の透明度
			else if (channel === deck2Channel && data1 === deck2CC) {
				deck2Opacity = value;
				dispatch('deck2opacitychange', { value });
				lastMidiMessage = `デッキ2透明度: CH:${channel+1} CC#${deck2CC}: ${data2} (${value}%)`;
			}
			// その他のCCメッセージ
			else {
				lastMidiMessage = `CC: CH:${channel+1} CC#${data1}: ${data2}`;
			}
		} else {
			// その他のMIDIメッセージ
			lastMidiMessage = `CH:${channel+1} Type:${type.toString(16)} Data:${data1},${data2}`;
		}
	};

	// MIDI接続状態の変更を監視
	const handleMidiStateChange = (event: WebMidi.MIDIConnectionEvent) => {
		updateMidiInputs();
		
		// 接続が切断された場合
		if (event.port.type === 'input' && event.port.id === selectedInput && event.port.state === 'disconnected') {
			midiConnected = false;
			midiStatus = `${event.port.name}が切断されました`;
			selectedInput = '';
		}
	};

	// 設定を保存する関数
	const saveMidiSettings = () => {
		if (typeof localStorage !== 'undefined') {
			const settings = {
				// クロスフェーダー
				midiChannel,
				midiCC,
				// デッキ1
				deck1Channel,
				deck1CC,
				// デッキ2
				deck2Channel,
				deck2CC
			};
			localStorage.setItem('midi-settings', JSON.stringify(settings));
		}
	};
	
	// 設定を読み込む関数
	const loadMidiSettings = () => {
		if (typeof localStorage !== 'undefined') {
			const settingsStr = localStorage.getItem('midi-settings');
			if (settingsStr) {
				try {
					const settings = JSON.parse(settingsStr);
					// クロスフェーダー
					if (settings.midiChannel !== undefined) midiChannel = settings.midiChannel;
					if (settings.midiCC !== undefined) midiCC = settings.midiCC;
					// デッキ1
					if (settings.deck1Channel !== undefined) deck1Channel = settings.deck1Channel;
					if (settings.deck1CC !== undefined) deck1CC = settings.deck1CC;
					// デッキ2
					if (settings.deck2Channel !== undefined) deck2Channel = settings.deck2Channel;
					if (settings.deck2CC !== undefined) deck2CC = settings.deck2CC;
				} catch (e) {
					console.error('MIDI設定の読み込みに失敗しました:', e);
				}
			}
		}
	};

	onMount(() => {
		// コンポーネントマウント時に設定を読み込む
		loadMidiSettings();
		
		// コンポーネントマウント時にMIDIアクセスを自動的にリクエストしない
		// ユーザーがボタンをクリックしたときにリクエストする
	});

	onDestroy(() => {
		// コンポーネント破棄時にMIDI接続を解除
		disconnectMidiInput();
		
		// MIDIアクセスのイベントリスナーを削除
		if (midiAccess) {
			midiAccess.onstatechange = null;
		}
	});

	// MIDIアクセスが取得できたらstatechangeイベントを監視
	$effect(() => {
		if (midiAccess) {
			midiAccess.onstatechange = handleMidiStateChange;
		}
	});
	
	// MIDI設定が変更されたら保存
	$effect(() => {
		if (midiConnected && (midiChannel !== undefined || midiCC !== undefined)) {
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
			disabled={isMidiAvailable && midiInputs.length > 0}
		>
			MIDI機器に接続
		</button>
		
		<div class="alert mb-4 {isMidiAvailable ? 'alert-success' : 'alert-warning'}">
			<div>
				<svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
				<span>{midiStatus}</span>
			</div>
		</div>
	</div>

	{#if isMidiAvailable && midiInputs.length > 0}
		<div class="mb-6">
			<h3 class="text-lg font-semibold mb-2">MIDI入力デバイス</h3>
			<select 
				class="select select-bordered w-full max-w-md mb-2" 
				bind:value={selectedInput}
				on:change={() => selectMidiInput(selectedInput)}
			>
				<option value="">-- デバイスを選択 --</option>
				{#each midiInputs as input}
					<option value={input.id}>{input.name}</option>
				{/each}
			</select>
			
			{#if selectedInput}
				<button 
					class="btn btn-sm btn-outline btn-error" 
					on:click={disconnectMidiInput}
				>
					接続解除
				</button>
			{/if}
		</div>
		
		{#if midiConnected}
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
									bind:value={midiChannel}
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
									bind:value={midiCC}
								/>
							</div>
						</div>
						
						<div class="alert alert-info mb-2">
							<div>
								<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
								<span>チャンネル{midiChannel + 1}のCC#{midiCC}がクロスフェーダーに割り当てられています</span>
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
									bind:value={deck1Channel}
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
									bind:value={deck1CC}
								/>
							</div>
						</div>
						
						<div class="alert alert-info mb-2">
							<div>
								<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
								<span>チャンネル{deck1Channel + 1}のCC#{deck1CC}がデッキ1透明度に割り当てられています</span>
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
									bind:value={deck2Channel}
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
									bind:value={deck2CC}
								/>
							</div>
						</div>
						
						<div class="alert alert-info mb-2">
							<div>
								<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
								<span>チャンネル{deck2Channel + 1}のCC#{deck2CC}がデッキ2透明度に割り当てられています</span>
							</div>
						</div>
					</div>
				</div>
				
				<div class="alert alert-info mb-4">
					<div>
						<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
						<div>
							<p>最後に受信したMIDIメッセージ: {lastMidiMessage || 'なし'}</p>
						</div>
					</div>
				</div>
			</div>
			
			{#if midiConnected}
				<div class="mb-6">
					<h3 class="text-lg font-semibold mb-2">クロスフェーダー値</h3>
					<div class="flex items-center gap-4">
						<input
							type="range"
							min="0"
							max="100"
							class="range range-primary range-lg w-full"
							bind:value={xfd}
						/>
						<span class="text-lg font-bold w-12 text-center">{xfd}%</span>
					</div>
				</div>
				
				<div class="mb-6">
					<h3 class="text-lg font-semibold mb-2">MIDIモニター</h3>
					<div class="bg-base-300 p-3 rounded-lg">
						<p class="font-mono text-sm">{lastMidiMessage || 'メッセージを待機中...'}</p>
					</div>
				</div>
			{/if}
		{/if}
	{/if}
</div>