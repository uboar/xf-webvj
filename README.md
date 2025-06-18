# xf-webvj

## Run Docker
```bash
docker run -p 4173:4173 -p 5901:5901 -v $(pwd)/videos:/app/static/videos uboar/xf-webvj
```

## 概要

xf-webvjは、SvelteKitで構築された動画関連のWebアプリケーションです。動画のダウンロード、取得、リスト表示、ダッシュボード、出力などの機能を提供します。WebSocketを使用したリアルタイム通信機能も備えています。

## 機能

*   動画ダウンロード
*   動画取得
*   動画リスト表示
*   ダッシュボード
*   出力
*   リアルタイム通信 (WebSocket)

## APIエンドポイント

*   `/api/download-movie`: 動画ダウンロード
*   `/api/get-movie`: 動画取得
*   `/api/get-movie-list`: 動画リスト取得

## ディレクトリ構造

```
src/
├── app.css
├── app.d.ts
├── app.html
├── components/
│   └── Deck.svelte
├── hooks.server.ts
├── lib/
│   ├── types.d.ts
│   ├── ws-client.ts
│   └── ws-server.ts
├── routes/
│   ├── +layout.svelte
│   ├── +page.svelte
│   ├── api/
│   │   ├── download-movie/
│   │   │   └── +server.ts
│   │   ├── get-movie/
│   │   │   └── +server.ts
│   │   └── get-movie-list/
│   │       └── +server.ts
│   ├── dashboard/
│   │   └── +page.svelte
│   └── output/
│       └── +page.svelte
└── static/
    └── favicon.png
```

## Run Local
```bash
npm install -g pnpm
pnpm install
pnpm build
pnpm preview
```
