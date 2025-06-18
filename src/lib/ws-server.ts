import { WebSocketServer, WebSocket } from 'ws';
import type { DeckType, WSMessage } from './types';

type webSocketServerType = {
  wss?: WebSocketServer;
  start: (port: number) => WebSocketServer;
}

let wssList: WebSocketServer[] = [];
let decksSrvState: DeckType[] = [
  {
    prefix: "1",
    movie: "",
    playing: false,
    opacity: 1.0,
  },
  {
    prefix: "2",
    movie: "",
    playing: false,
    opacity: 1.0,
  }
]

const handle = (message: WSMessage) => {
  if (message.to === "server") {
    switch (message.function) {
      case "get-deck-state":
        send({
          to: "dashboard",
          function: "get-deck-state",
          body: decksSrvState
        })
        send({
          to: "output",
          function: "get-deck-state",
          body: decksSrvState
        })
        break;
      case "update-deck-state":
        if (message.body) {
          decksSrvState = message.body as DeckType[]
        }
        send({
          to: "output",
          function: "get-deck-state",
          body: decksSrvState
        })
        break;
      case "update-movie-state":
        if (message.body) {
          decksSrvState = message.body as DeckType[]
        }
        send({
          to: "dashboard",
          function: "get-deck-state",
          body: decksSrvState
        })
        break;
      case "update-xfd":
        send({
          to: "output",
          function: "update-xfd",
          body: message.body
        })
        break;
      case "update-deck-opacity":
        send({
          to: "output",
          function: "update-deck-opacity",
          body: message.body
        })
        break;
    }
  }
}

export const webSocketServer: webSocketServerType = {
  start: (port) => {
    const wss = new WebSocketServer({ port });

    wss.on('connection', ws => {
      wssList.push(wss);

      ws.on('message', messageData => {
        const message = JSON.parse(messageData.toString()) as WSMessage;
        handle(message)
      });

      ws.on('close', () => {
        wssList = wssList.filter(item => item !== wss);
      });

      ws.on('error', error => {
        console.error('WebSocket Error:', error);
      })
    });

    console.log('WebSocket Server Launched');
    return wss;
  }
};

export const send = (message: WSMessage) => {
  wssList.forEach(server => {
    server.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  });
}