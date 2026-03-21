import { PUBLIC_WS_SERVER_PORT } from '$env/static/public';
import type { WSMessage } from './types';

type WSEvent = {
	to: string;
	function: string;
	event: (self: WSClientConnection, body?: object) => void;
};

const getEventKey = (event: Pick<WSEvent, 'to' | 'function'>) => `${event.to}:${event.function}`;

export class WSClientConnection {
	public ws!: WebSocket;
	public connect!: Promise<void>;
	private events = new Map<string, Set<WSEvent>>();
	private reconnectAttempts = 0;
	private readonly maxReconnectDelay = 30000;
	private destroyed = false;

	public onDisconnect: (() => void) | null = null;
	public onReconnect: ((ws: WSClientConnection) => void) | null = null;

	constructor() {
		this.connect = this.createConnection();
	}

	private createConnection(): Promise<void> {
		this.ws = new WebSocket(`ws://${window.location.hostname}:${PUBLIC_WS_SERVER_PORT}`);
		return new Promise((resolve, reject) => {
			this.ws.onmessage = (event) => {
				const req = JSON.parse(event.data) as WSMessage;
				const handlers = this.events.get(getEventKey(req));
				handlers?.forEach((handler) => {
					handler.event(this, req.body);
				});
			};

			this.ws.onopen = () => {
				this.reconnectAttempts = 0;
				resolve();
			};

			this.ws.onerror = (error) => {
				reject(error);
			};

			this.ws.onclose = () => {
				this.onDisconnect?.();
				if (!this.destroyed) {
					this.scheduleReconnect();
				}
			};
		});
	}

	private scheduleReconnect(): void {
		const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), this.maxReconnectDelay);
		this.reconnectAttempts++;
		setTimeout(() => {
			if (!this.destroyed) {
				this.connect = this.createConnection();
				this.connect
					.then(() => {
						this.onReconnect?.(this);
					})
					.catch(() => {
						// onclose → scheduleReconnect で再試行
					});
			}
		}, delay);
	}

	public reconnect = (): void => {
		if (this.destroyed) return;
		this.reconnectAttempts = 0;
		if (
			this.ws.readyState === WebSocket.OPEN ||
			this.ws.readyState === WebSocket.CONNECTING
		) {
			// onclose が scheduleReconnect を呼ぶので close するだけでよい
			this.ws.close();
		} else {
			this.connect = this.createConnection();
			this.connect
				.then(() => {
					this.onReconnect?.(this);
				})
				.catch(() => {
					// onclose → scheduleReconnect で再試行
				});
		}
	};

	public send = (req: WSMessage) => {
		if (this.ws.readyState !== WebSocket.OPEN) {
			return;
		}

		this.ws.send(JSON.stringify(req));
	};

	public attachEvent = (event: WSEvent) => {
		const key = getEventKey(event);
		const currentEvents = this.events.get(key) ?? new Set<WSEvent>();
		currentEvents.add(event);
		this.events.set(key, currentEvents);
	};

	public detachEvent = (event: WSEvent) => {
		const key = getEventKey(event);
		const currentEvents = this.events.get(key);
		if (!currentEvents) {
			return;
		}

		currentEvents.delete(event);
		if (currentEvents.size === 0) {
			this.events.delete(key);
		}
	};

	public destroy = () => {
		this.destroyed = true;
		this.events.clear();
		if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
			this.ws.close();
		}
	};
}
