import { PUBLIC_WS_SERVER_PORT } from '$env/static/public';
import type { WSMessage } from './types';

type WSEvent = {
	to: string;
	function: string;
	event: (self: WSClientConnection, body?: object) => void;
};

const getEventKey = (event: Pick<WSEvent, 'to' | 'function'>) => `${event.to}:${event.function}`;

export class WSClientConnection {
	public ws: WebSocket;
	public connect: Promise<void>;
	private events = new Map<string, Set<WSEvent>>();

	constructor() {
		this.ws = new WebSocket(`ws://${window.location.hostname}:${PUBLIC_WS_SERVER_PORT}`);
		this.connect = new Promise((resolve, reject) => {
			this.ws.onmessage = (event) => {
				const req = JSON.parse(event.data) as WSMessage;
				const handlers = this.events.get(getEventKey(req));

				handlers?.forEach((handler) => {
					handler.event(this, req.body);
				});
			};

			this.ws.onopen = () => {
				resolve();
			};

			this.ws.onerror = (error) => {
				reject(error);
			};
		});
	}

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
		this.events.clear();
		if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
			this.ws.close();
		}
	};
}
