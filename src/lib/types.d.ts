export type DownloadMovieRequest = {
  url: string
  args: string
  output?: string
}

export type DownloadStatus = {
  url: string
  index: number
  state: 'pending' | 'downloading' | 'complete' | 'error'
  message: string
  fileName?: string
}

export type DeckSourceType = 'local' | 'youtube'

export type DeckType = {
  prefix: string
  movie: string
  sourceType?: DeckSourceType
  title?: string
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

export type WSClientRole = 'dashboard' | 'output'

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

export type PlaylistFile = {
  version: 1
  items: string[]
}

declare global {
  namespace WebMidi {
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

  namespace YT {
    interface PlayerOptions {
      videoId?: string;
      width?: string | number;
      height?: string | number;
      playerVars?: Record<string, string | number>;
      events?: {
        onReady?: (event: PlayerEvent) => void;
        onStateChange?: (event: OnStateChangeEvent) => void;
        onError?: (event: OnErrorEvent) => void;
      };
    }

    interface PlayerEvent {
      target: Player;
    }

    interface OnStateChangeEvent extends PlayerEvent {
      data: number;
    }

    interface OnErrorEvent extends PlayerEvent {
      data: number;
    }

    interface Player {
      destroy(): void;
      playVideo(): void;
      pauseVideo(): void;
      mute(): void;
      getDuration(): number;
      getCurrentTime(): number;
      seekTo(seconds: number, allowSeekAhead?: boolean): void;
      setPlaybackRate(suggestedRate: number): void;
      getPlaybackRate(): number;
      getPlayerState(): number;
      loadVideoById(videoId: string): void;
      cueVideoById(videoId: string): void;
    }

    const Player: {
      new (element: string | HTMLElement, options?: PlayerOptions): Player;
    };

    const PlayerState: {
      UNSTARTED: -1;
      ENDED: 0;
      PLAYING: 1;
      PAUSED: 2;
      BUFFERING: 3;
      CUED: 5;
    };
  }

  interface Window {
    YT?: typeof YT;
    onYouTubeIframeAPIReady?: (() => void) | undefined;
  }
}
