import { WebSocketServer, WebSocket } from 'ws';
import type { DeckType, OpacityControlMessage, OpacityState, WSMessage } from './types';

type webSocketServerType = {
	wss?: WebSocketServer;
	start: (port: number) => WebSocketServer;
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
let outputPageConnected = false;

const syncOutputConnectionStatus = () => {
	send({
		to: 'dashboard',
		function: 'output-connection-status',
		body: { connected: outputPageConnected }
	});
};

const syncDeckState = () => {
	send({
		to: 'dashboard',
		function: 'get-deck-state',
		body: decksSrvState
	});
	send({
		to: 'output',
		function: 'get-deck-state',
		body: decksSrvState
	});
};

const syncLoadingState = () => {
	send({
		to: 'dashboard',
		function: 'video-loading-status',
		body: { loadingStates: videoLoadingStates }
	});
};

const syncOpacityState = () => {
	send({
		to: 'output',
		function: 'update-opacity',
		body: {
			deck1: opacityState.deck1BaseOpacity,
			deck2: opacityState.deck2BaseOpacity * opacityState.crossfadeValue,
			opacityState
		}
	});
	send({
		to: 'dashboard',
		function: 'opacity-state-sync',
		body: opacityState
	});
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

const handle = (message: WSMessage) => {
	if (message.to !== 'server') {
		return;
	}

	switch (message.function) {
		case 'output-page-connected':
			outputPageConnected = message.body
				? (message.body as { connected: boolean }).connected
				: false;
			syncOutputConnectionStatus();
			break;
		case 'get-deck-state':
			syncDeckState();
			syncOutputConnectionStatus();
			syncLoadingState();
			syncOpacityState();
			break;
		case 'update-deck-state':
			if (message.body) {
				decksSrvState = message.body as DeckType[];
			}
			send({
				to: 'output',
				function: 'get-deck-state',
				body: decksSrvState
			});
			break;
		case 'update-movie-state':
			if (message.body) {
				decksSrvState = message.body as DeckType[];
			}
			send({
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

export const webSocketServer: webSocketServerType = {
	start: (port) => {
		if (webSocketServer.wss) {
			return webSocketServer.wss;
		}

		const wss = new WebSocketServer({ port });

		wss.on('connection', (ws) => {
			ws.on('message', (messageData) => {
				try {
					handle(JSON.parse(messageData.toString()) as WSMessage);
				} catch (error) {
					console.error('Invalid WebSocket message:', error);
				}
			});

			ws.on('error', (error) => {
				console.error('WebSocket Error:', error);
			});

			syncDeckState();
			syncLoadingState();
			syncOutputConnectionStatus();
			syncOpacityState();
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
