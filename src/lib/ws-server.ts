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

// 統合された透明度状態管理
let opacityState = {
  deck1BaseOpacity: 1.0,
  deck2BaseOpacity: 1.0,
  crossfadeValue: 0.5
}
// 動画読み込み状態の追跡
let videoLoadingStates = [false, false];

// 出力ページの接続状態を追跡
let outputPageConnected = false;

const handle = (message: WSMessage) => {
  if (message.to === "server") {
    switch (message.function) {
      case "output-page-connected":
        // 出力ページの接続状態を更新
        outputPageConnected = message.body ? (message.body as { connected: boolean }).connected : false;
        
        // ダッシュボードに接続状態を通知
        send({
          to: "dashboard",
          function: "output-connection-status",
          body: { connected: outputPageConnected }
        });
        break;
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
        
        // 接続状態も送信
        send({
          to: "dashboard",
          function: "output-connection-status",
          body: { connected: outputPageConnected }
        });
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
      case "update-opacity":
        if (message.body) {
          const opacityMsg = message.body as { type: string; deckIndex?: number; opacity: number };
          
          // 透明度状態を更新
          if (opacityMsg.type === 'deck' && opacityMsg.deckIndex !== undefined) {
            if (opacityMsg.deckIndex === 0) {
              opacityState.deck1BaseOpacity = opacityMsg.opacity;
              // サーバー側のデッキ状態も更新（透明度のみ）
              decksSrvState[0].opacity = opacityMsg.opacity;
            } else if (opacityMsg.deckIndex === 1) {
              opacityState.deck2BaseOpacity = opacityMsg.opacity;
              // サーバー側のデッキ状態も更新（透明度のみ）
              decksSrvState[1].opacity = opacityMsg.opacity;
            }
          } else if (opacityMsg.type === 'crossfade') {
            opacityState.crossfadeValue = opacityMsg.opacity;
          }
          
          // 最終透明度を計算
          const finalOpacities = {
            deck1: opacityState.deck1BaseOpacity,
            deck2: opacityState.deck2BaseOpacity * opacityState.crossfadeValue,
            opacityState: opacityState
          };
          
          // 出力画面に送信（透明度のみ更新）
          send({
            to: "output",
            function: "update-opacity",
            body: finalOpacities
          });
          
          // ダッシュボードにも状態を同期（透明度のみ）
          send({
            to: "dashboard",
            function: "opacity-state-sync",
            body: opacityState
          });
        }
        break;
      case "update-loading-state":
        if (message.body) {
          const loadingState = message.body as { loadingStates: boolean[] };
          videoLoadingStates = loadingState.loadingStates;
          
          // ダッシュボードに読み込み状態を通知
          send({
            to: "dashboard",
            function: "video-loading-status",
            body: { loadingStates: videoLoadingStates }
          });
        }
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
    
    // 初期状態でダッシュボードに読み込み状態を送信
    send({
      to: "dashboard",
      function: "video-loading-status",
      body: { loadingStates: videoLoadingStates }
    });
    
    // 初期状態でダッシュボードに出力ページの接続状態を送信
    send({
      to: "dashboard",
      function: "output-connection-status",
      body: { connected: outputPageConnected }
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