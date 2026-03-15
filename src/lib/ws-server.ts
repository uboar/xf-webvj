import { WebSocketServer, WebSocket } from 'ws';
import type {
	DeckType,
	OpacityControlMessage,
	OpacityState,
	WSClientRole,
	WSMessage
} from './types';

type WebSocketServerType = {
	wss?: WebSocketServer;
	start: (port: number) => WebSocketServer;
};

type ConnectionStatusBody = {
	connected: boolean;
	count: number;
};

let decksSrvState: DeckType[] = [
	{
		prefix: '1',
		movie: '',
		playing: false,
		opacity: 1.0,
		repeat: false
	},
	{
		prefix: '2',
		movie: '',
		playing: false,
		opacity: 1.0,
		repeat: false
	}
];

let opacityState: OpacityState = {
	deck1BaseOpacity: 1.0,
	deck2BaseOpacity: 1.0,
	crossfadeValue: 0.5
};

let videoLoadingStates = [false, false];

const clientRoles = new Map<WebSocket, WSClientRole>();

const getRenderedDeckOpacities = () => ({
	deck1: opacityState.deck1BaseOpacity * (1 - opacityState.crossfadeValue),
	deck2: opacityState.deck2BaseOpacity * opacityState.crossfadeValue
});

const getRoleClientCount = (role: WSClientRole) =>
	Array.from(clientRoles.values()).filter((clientRole) => clientRole === role).length;

const getOutputConnectionStatus = (): ConnectionStatusBody => {
	const count = getRoleClientCount('output');
	return {
		connected: count > 0,
		count
	};
};

const sendToRole = (role: WSClientRole, message: WSMessage) => {
	webSocketServer.wss?.clients.forEach((client) => {
		if (client.readyState !== WebSocket.OPEN) {
			return;
		}

		if (clientRoles.get(client) !== role) {
			return;
		}

		client.send(JSON.stringify(message));
	});
};

const sendToClient = (client: WebSocket, message: WSMessage) => {
	if (client.readyState !== WebSocket.OPEN) {
		return;
	}

	client.send(JSON.stringify(message));
};

const syncOutputConnectionStatus = () => {
	sendToRole('dashboard', {
		to: 'dashboard',
		function: 'output-connection-status',
		body: getOutputConnectionStatus()
	});
};

const syncDeckState = () => {
	sendToRole('dashboard', {
		to: 'dashboard',
		function: 'get-deck-state',
		body: decksSrvState
	});
	sendToRole('output', {
		to: 'output',
		function: 'get-deck-state',
		body: decksSrvState
	});
};

const syncLoadingState = () => {
	sendToRole('dashboard', {
		to: 'dashboard',
		function: 'video-loading-status',
		body: { loadingStates: videoLoadingStates }
	});
};

const syncOpacityState = () => {
	const renderedOpacities = getRenderedDeckOpacities();

	sendToRole('output', {
		to: 'output',
		function: 'update-opacity',
		body: {
			deck1: renderedOpacities.deck1,
			deck2: renderedOpacities.deck2,
			opacityState
		}
	});
	sendToRole('dashboard', {
		to: 'dashboard',
		function: 'opacity-state-sync',
		body: opacityState
	});
};

const syncStateToClient = (client: WebSocket, role?: WSClientRole) => {
	switch (role) {
		case 'dashboard':
			sendToClient(client, {
				to: 'dashboard',
				function: 'get-deck-state',
				body: decksSrvState
			});
			sendToClient(client, {
				to: 'dashboard',
				function: 'video-loading-status',
				body: { loadingStates: videoLoadingStates }
			});
			sendToClient(client, {
				to: 'dashboard',
				function: 'output-connection-status',
				body: getOutputConnectionStatus()
			});
			sendToClient(client, {
				to: 'dashboard',
				function: 'opacity-state-sync',
				body: opacityState
			});
			break;
		case 'output': {
			const renderedOpacities = getRenderedDeckOpacities();
			sendToClient(client, {
				to: 'output',
				function: 'get-deck-state',
				body: decksSrvState
			});
			sendToClient(client, {
				to: 'output',
				function: 'update-opacity',
				body: {
					deck1: renderedOpacities.deck1,
					deck2: renderedOpacities.deck2,
					opacityState
				}
			});
			break;
		}
	}
};

const updateOpacityState = (message: OpacityControlMessage) => {
	if (message.type === 'deck' && message.deckIndex !== undefined) {
		if (message.deckIndex === 0) {
			opacityState.deck1BaseOpacity = message.opacity;
			decksSrvState[0].opacity = message.opacity;
		} else if (message.deckIndex === 1) {
			opacityState.deck2BaseOpacity = message.opacity;
			decksSrvState[1].opacity = message.opacity;
		}
		return;
	}

	if (message.type === 'crossfade') {
		opacityState.crossfadeValue = message.opacity;
	}
};

const handle = (ws: WebSocket, message: WSMessage) => {
	if (message.to !== 'server') {
		return;
	}

	switch (message.function) {
		case 'register-client': {
			const role = (message.body as { role?: WSClientRole } | undefined)?.role;
			if (!role) {
				return;
			}

			clientRoles.set(ws, role);
			syncStateToClient(ws, role);
			if (role === 'output') {
				syncOutputConnectionStatus();
			}
			break;
		}
		case 'get-deck-state': {
			const role = clientRoles.get(ws);
			if (role) {
				syncStateToClient(ws, role);
			} else {
				syncDeckState();
				syncOutputConnectionStatus();
				syncLoadingState();
				syncOpacityState();
			}
			break;
		}
		case 'update-deck-state':
			if (message.body) {
				decksSrvState = message.body as DeckType[];
			}
			sendToRole('output', {
				to: 'output',
				function: 'get-deck-state',
				body: decksSrvState
			});
			break;
		case 'update-movie-state':
			if (message.body) {
				decksSrvState = message.body as DeckType[];
			}
			sendToRole('dashboard', {
				to: 'dashboard',
				function: 'get-deck-state',
				body: decksSrvState
			});
			break;
		case 'update-opacity':
			if (message.body) {
				updateOpacityState(message.body as OpacityControlMessage);
				syncOpacityState();
			}
			break;
		case 'update-loading-state':
			if (message.body) {
				videoLoadingStates = (message.body as { loadingStates: boolean[] }).loadingStates;
				syncLoadingState();
			}
			break;
	}
};

export const webSocketServer: WebSocketServerType = {
	start: (port) => {
		if (webSocketServer.wss) {
			return webSocketServer.wss;
		}

		const wss = new WebSocketServer({ port });

		wss.on('connection', (ws) => {
			ws.on('message', (messageData) => {
				try {
					handle(ws, JSON.parse(messageData.toString()) as WSMessage);
				} catch (error) {
					console.error('Invalid WebSocket message:', error);
				}
			});

			ws.on('close', () => {
				const role = clientRoles.get(ws);
				clientRoles.delete(ws);
				if (role === 'output') {
					syncOutputConnectionStatus();
				}
			});

			ws.on('error', (error) => {
				console.error('WebSocket Error:', error);
			});
		});

		webSocketServer.wss = wss;
		console.log('WebSocket Server Launched');
		return wss;
	}
};

export const send = (message: WSMessage) => {
	webSocketServer.wss?.clients.forEach((client) => {
		if (client.readyState === WebSocket.OPEN) {
			client.send(JSON.stringify(message));
		}
	});
};
