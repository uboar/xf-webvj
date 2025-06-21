export type DownloadMovieRequest = {
  url: string
  args: string
  output?: string
}

export type DeckType = {
  prefix: string
  movie: string
  playing: boolean
  length?: number
  position?: number
  rate?: number
  opacity?: number
  repeat?: boolean
}

export type WSMessage = {
  to: string
  function: string
  body?: object
}

export type OpacityState = {
  deck1BaseOpacity: number
  deck2BaseOpacity: number
  crossfadeValue: number
}

export type OpacityControlMessage = {
  type: 'deck' | 'crossfade'
  deckIndex?: number
  opacity: number
}

// Web MIDI API types
declare namespace WebMidi {
  interface MIDIOptions {
    sysex?: boolean;
    software?: boolean;
  }

  interface MIDIInputMap {
    [key: string]: MIDIInput;
    entries(): IterableIterator<[string, MIDIInput]>;
    forEach(callback: (value: MIDIInput, key: string, map: MIDIInputMap) => void): void;
    get(key: string): MIDIInput | undefined;
    has(key: string): boolean;
    keys(): IterableIterator<string>;
    size: number;
    values(): IterableIterator<MIDIInput>;
  }

  interface MIDIOutputMap {
    [key: string]: MIDIOutput;
    entries(): IterableIterator<[string, MIDIOutput]>;
    forEach(callback: (value: MIDIOutput, key: string, map: MIDIOutputMap) => void): void;
    get(key: string): MIDIOutput | undefined;
    has(key: string): boolean;
    keys(): IterableIterator<string>;
    size: number;
    values(): IterableIterator<MIDIOutput>;
  }

  interface MIDIAccess extends EventTarget {
    inputs: MIDIInputMap;
    outputs: MIDIOutputMap;
    onstatechange: ((this: MIDIAccess, ev: MIDIConnectionEvent) => any) | null;
    sysexEnabled: boolean;
  }

  interface MIDIPort extends EventTarget {
    connection: MIDIPortConnectionState;
    id: string;
    manufacturer?: string;
    name?: string;
    onmidimessage: ((this: MIDIPort, ev: MIDIMessageEvent) => any) | null;
    onstatechange: ((this: MIDIPort, ev: MIDIConnectionEvent) => any) | null;
    state: MIDIPortDeviceState;
    type: MIDIPortType;
    version?: string;
    close(): Promise<void>;
    open(): Promise<void>;
  }

  interface MIDIInput extends MIDIPort {
    onmidimessage: ((this: MIDIInput, ev: MIDIMessageEvent) => any) | null;
  }

  interface MIDIOutput extends MIDIPort {
    send(data: Uint8Array | number[], timestamp?: number): void;
    clear(): void;
  }

  interface MIDIMessageEvent extends Event {
    data: Uint8Array;
  }

  interface MIDIConnectionEvent extends Event {
    port: MIDIPort;
  }

  type MIDIPortConnectionState = 'open' | 'closed' | 'pending';
  type MIDIPortDeviceState = 'connected' | 'disconnected';
  type MIDIPortType = 'input' | 'output';
}

interface Navigator {
  requestMIDIAccess(options?: WebMidi.MIDIOptions): Promise<WebMidi.MIDIAccess>;
}