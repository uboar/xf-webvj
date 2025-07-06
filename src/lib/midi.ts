import { writable, get } from 'svelte/store';

// CC制御モードの型定義
export type CCControlMode = 'absolute' | 'relative';

// MIDI設定の型定義
export interface MidiSettings {
	midiChannel: number;
	midiCC: number;
	deck1Channel: number;
	deck1CC: number;
	deck2Channel: number;
	deck2CC: number;
	deck1PlayChannel: number;
	deck1PlayNote: number;
	deck2PlayChannel: number;
	deck2PlayNote: number;
	deck1CueChannel: number;
	deck1CueNote: number;
	deck2CueChannel: number;
	deck2CueNote: number;
	// CC制御モード設定
	xfdMode: CCControlMode;
	deck1OpacityMode: CCControlMode;
	deck2OpacityMode: CCControlMode;
	// 相対的変化の感度設定（0.1〜5.0）
	xfdRelativeSensitivity: number;
	deck1OpacityRelativeSensitivity: number;
	deck2OpacityRelativeSensitivity: number;
}

// ストアの定義
export const midiAccess = writable<any | null>(null);
export const midiInputs = writable<any[]>([]);
export const selectedInputId = writable<string | null>(null);
export const midiStatus = writable('未接続');
export const lastMidiMessage = writable('');
export const isMidiAvailable = writable(false);
export const midiConnected = writable(false);

// MIDI CC設定のストア
export const midiSettings = writable<MidiSettings>({
	midiChannel: 0,
	midiCC: 31,
	deck1Channel: 0,
	deck1CC: 32,
	deck2Channel: 0,
	deck2CC: 33,
	deck1PlayChannel: 0,
	deck1PlayNote: 60, // C4
	deck2PlayChannel: 0,
	deck2PlayNote: 62, // D4
	deck1CueChannel: 0,
	deck1CueNote: 64, // E4
	deck2CueChannel: 0,
	deck2CueNote: 65,  // F4
	// デフォルトは絶対値モード
	xfdMode: 'absolute',
	deck1OpacityMode: 'absolute',
	deck2OpacityMode: 'absolute',
	// 相対的変化の感度（デフォルト: 1.0）
	xfdRelativeSensitivity: 1.0,
	deck1OpacityRelativeSensitivity: 1.0,
	deck2OpacityRelativeSensitivity: 1.0
});

// 現在値を保持するストア（相対的変化モード用）
export const currentValues = writable({
	xfd: 50,
	deck1Opacity: 100,
	deck2Opacity: 100
});

// イベントディスパッチャーの代わりとなるコールバックストア
export const onXfdChange = writable<(value: number) => void>(() => {});
export const onDeck1OpacityChange = writable<(value: number) => void>(() => {});
export const onDeck2OpacityChange = writable<(value: number) => void>(() => {});
export const onDeck1PlayToggle = writable<() => void>(() => {});
export const onDeck2PlayToggle = writable<() => void>(() => {});
export const onDeck1CueDown = writable<() => void>(() => {});
export const onDeck1CueUp = writable<() => void>(() => {});
export const onDeck2CueDown = writable<() => void>(() => {});
export const onDeck2CueUp = writable<() => void>(() => {});

// MIDIアクセスをリクエスト
export const requestMidiAccess = async () => {
	try {
		if (navigator.requestMIDIAccess) {
			const access = await navigator.requestMIDIAccess();
			midiAccess.set(access);
			isMidiAvailable.set(true);
			midiStatus.set('MIDI接続が許可されました');
			updateMidiInputs();
			access.onstatechange = handleMidiStateChange;
		} else {
			midiStatus.set('お使いのブラウザはWeb MIDI APIをサポートしていません');
			isMidiAvailable.set(false);
		}
	} catch (error) {
		midiStatus.set(`MIDI接続エラー: ${error}`);
		isMidiAvailable.set(false);
	}
};

// MIDI入力デバイスのリストを更新
const updateMidiInputs = () => {
	const access = get(midiAccess);
	if (!access) return;

	const inputs = Array.from(access.inputs.values());
	midiInputs.set(inputs);

	const currentSelectedId = get(selectedInputId);
	if (currentSelectedId && !inputs.some((input: any) => input.id === currentSelectedId)) {
		selectedInputId.set(null);
	}
};

// MIDI入力デバイスを選択
export const selectMidiInput = (inputId: string | null) => {
	disconnectMidiInput();

	selectedInputId.set(inputId);

	if (inputId) {
		const inputs = get(midiInputs);
		const input = inputs.find(i => i.id === inputId);
		if (input) {
			input.onmidimessage = handleMidiMessage;
			midiConnected.set(true);
			midiStatus.set(`${input.name}に接続しました`);
		}
	}
};

// MIDI入力デバイスの接続を解除
export const disconnectMidiInput = () => {
	const currentSelectedId = get(selectedInputId);
	if (currentSelectedId) {
		const inputs = get(midiInputs);
		const input = inputs.find(i => i.id === currentSelectedId);
		if (input) {
			input.onmidimessage = null;
		}
		midiConnected.set(false);
		midiStatus.set('MIDI接続が解除されました');
	}
};

// MIDIメッセージを処理
const handleMidiMessage = (message: any) => {
	const [status, data1, data2] = message.data;
	const channel = status & 0x0f;
	const type = status & 0xf0;
	const settings = get(midiSettings);
	const current = get(currentValues);

	if (type === 0xb0) { // コントロールチェンジ
		if (channel === settings.midiChannel && data1 === settings.midiCC) {
			let value: number;
			if (settings.xfdMode === 'absolute') {
				value = Math.round((data2 / 127) * 100);
			} else {
				// 相対的変化モード: 64が中心、63以下は減少、65以上は増加
				const delta = (data2 - 64) * settings.xfdRelativeSensitivity;
				value = Math.max(0, Math.min(100, current.xfd + delta));
				currentValues.update(v => ({ ...v, xfd: value }));
			}
			get(onXfdChange)(value);
			lastMidiMessage.set(`クロスフェーダー: CH:${channel + 1} CC#${settings.midiCC}: ${data2} (${Math.round(value)}%)`);
		} else if (channel === settings.deck1Channel && data1 === settings.deck1CC) {
			let value: number;
			if (settings.deck1OpacityMode === 'absolute') {
				value = Math.round((data2 / 127) * 100);
			} else {
				const delta = (data2 - 64) * settings.deck1OpacityRelativeSensitivity;
				value = Math.max(0, Math.min(100, current.deck1Opacity + delta));
				currentValues.update(v => ({ ...v, deck1Opacity: value }));
			}
			get(onDeck1OpacityChange)(value);
			lastMidiMessage.set(`デッキ1透明度: CH:${channel + 1} CC#${settings.deck1CC}: ${data2} (${Math.round(value)}%)`);
		} else if (channel === settings.deck2Channel && data1 === settings.deck2CC) {
			let value: number;
			if (settings.deck2OpacityMode === 'absolute') {
				value = Math.round((data2 / 127) * 100);
			} else {
				const delta = (data2 - 64) * settings.deck2OpacityRelativeSensitivity;
				value = Math.max(0, Math.min(100, current.deck2Opacity + delta));
				currentValues.update(v => ({ ...v, deck2Opacity: value }));
			}
			get(onDeck2OpacityChange)(value);
			lastMidiMessage.set(`デッキ2透明度: CH:${channel + 1} CC#${settings.deck2CC}: ${data2} (${Math.round(value)}%)`);
		} else {
			lastMidiMessage.set(`CC: CH:${channel + 1} CC#${data1}: ${data2}`);
		}
	} else if (type === 0x90) { // ノートオン
		if (data2 > 0) { // ベロシティ > 0 (Note On)
			if (channel === settings.deck1PlayChannel && data1 === settings.deck1PlayNote) {
				get(onDeck1PlayToggle)();
				lastMidiMessage.set(`デッキ1再生/停止: CH:${channel + 1} Note:${data1}`);
			} else if (channel === settings.deck2PlayChannel && data1 === settings.deck2PlayNote) {
				get(onDeck2PlayToggle)();
				lastMidiMessage.set(`デッキ2再生/停止: CH:${channel + 1} Note:${data1}`);
			} else if (channel === settings.deck1CueChannel && data1 === settings.deck1CueNote) {
				get(onDeck1CueDown)();
				lastMidiMessage.set(`デッキ1 CUE Down: CH:${channel + 1} Note:${data1}`);
			} else if (channel === settings.deck2CueChannel && data1 === settings.deck2CueNote) {
				get(onDeck2CueDown)();
				lastMidiMessage.set(`デッキ2 CUE Down: CH:${channel + 1} Note:${data1}`);
			} else {
				lastMidiMessage.set(`Note On: CH:${channel + 1} Note:${data1} Vel:${data2}`);
			}
		} else { // ベロシティ = 0 (Note Off)
			if (channel === settings.deck1CueChannel && data1 === settings.deck1CueNote) {
				get(onDeck1CueUp)();
				lastMidiMessage.set(`デッキ1 CUE Up: CH:${channel + 1} Note:${data1}`);
			} else if (channel === settings.deck2CueChannel && data1 === settings.deck2CueNote) {
				get(onDeck2CueUp)();
				lastMidiMessage.set(`デッキ2 CUE Up: CH:${channel + 1} Note:${data1}`);
			}
		}
	} else if (type === 0x80) { // ノートオフ
		if (channel === settings.deck1CueChannel && data1 === settings.deck1CueNote) {
			get(onDeck1CueUp)();
			lastMidiMessage.set(`デッキ1 CUE Up: CH:${channel + 1} Note:${data1}`);
		} else if (channel === settings.deck2CueChannel && data1 === settings.deck2CueNote) {
			get(onDeck2CueUp)();
			lastMidiMessage.set(`デッキ2 CUE Up: CH:${channel + 1} Note:${data1}`);
		} else {
			lastMidiMessage.set(`Note Off: CH:${channel + 1} Note:${data1}`);
		}
	} else {
		lastMidiMessage.set(`CH:${channel + 1} Type:${type.toString(16)} Data:${data1},${data2}`);
	}
};

// MIDI接続状態の変更を監視
const handleMidiStateChange = (event: any) => {
	updateMidiInputs();

	if (event.port.type === 'input' && event.port.id === get(selectedInputId) && event.port.state === 'disconnected') {
		midiConnected.set(false);
		midiStatus.set(`${event.port.name}が切断されました`);
		selectedInputId.set(null);
	}
};

// 設定を保存
export const saveMidiSettings = () => {
	if (typeof localStorage !== 'undefined') {
		localStorage.setItem('midi-settings', JSON.stringify(get(midiSettings)));
	}
};

// 設定を読み込み
export const loadMidiSettings = () => {
	if (typeof localStorage !== 'undefined') {
		const settingsStr = localStorage.getItem('midi-settings');
		if (settingsStr) {
			try {
				const loadedSettings = JSON.parse(settingsStr);
				midiSettings.set({ ...get(midiSettings), ...loadedSettings });
			} catch (e) {
				console.error('MIDI設定の読み込みに失敗しました:', e);
			}
		}
	}
};

// 現在値を更新する関数（外部から呼び出し可能）
export const updateCurrentValues = (values: Partial<{ xfd: number; deck1Opacity: number; deck2Opacity: number }>) => {
	currentValues.update(current => ({ ...current, ...values }));
};

// アプリケーション初期化時に設定を読み込む
if (typeof window !== 'undefined') {
	loadMidiSettings();
}
