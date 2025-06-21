# xf-webvj

クロスフェード機能を備えたWeb VJアプリケーション

## 概要

xf-webvjは、Webブラウザ上で動作するVJ（ビジュアルジョッキー）アプリケーションです。2つのデッキ間でのクロスフェード、動画の再生速度調整、透明度制御などの機能を備え、ライブパフォーマンスやイベントでの視覚効果の演出に最適です。

主な特徴:
- 2つの独立したデッキによる動画再生
- デッキ間のスムーズなクロスフェード
- 再生速度の調整（BPM同期機能付き）
- 各デッキの透明度制御
- 動画のダウンロードと管理
- リアルタイムプレビュー
- WebSocketによるダッシュボードと出力画面の同期

## デモ

ダッシュボード画面: `/dashboard`  
出力画面: `/output`

## 必要条件

- Node.js 18以上
- pnpm
- Python 3
- ffmpeg
- yt-dlp（動画ダウンロード機能を使用する場合）

## インストールと実行方法

### Dockerを使用する場合（推奨）

```bash
# リポジトリをクローン
git clone https://github.com/uboar/xf-webvj.git
cd xf-webvj

# 動画保存用のディレクトリを作成
mkdir -p videos

# Dockerイメージをビルド
docker build -t xf-webvj .

# コンテナを実行
docker run -p 4173:4173 -p 5901:5901 -v $(pwd)/videos:/app/static/videos xf-webvj
```

または、Docker Hubから直接イメージを取得して実行:

```bash
docker run -p 4173:4173 -p 5901:5901 -v $(pwd)/videos:/app/static/videos uboar/xf-webvj
```

### ローカル環境での実行

```bash
# リポジトリをクローン
git clone https://github.com/uboar/xf-webvj.git
cd xf-webvj

# 依存関係のインストール
npm install -g pnpm
pnpm install

# 環境変数の設定
cp .env.example .env
# 必要に応じて.envファイルを編集

# 動画保存用のディレクトリを作成
mkdir -p static/videos

# アプリケーションのビルド
pnpm build

# アプリケーションの実行
pnpm preview
```

## 使い方

1. ブラウザで `http://localhost:4173/dashboard` にアクセスしてダッシュボードを開きます
2. 別のウィンドウまたはモニターで `http://localhost:4173/output` にアクセスして出力画面を開きます
3. 「動画ダウンロード」タブから動画をダウンロードするか、`static/videos` ディレクトリに直接動画ファイルを配置します
4. 「動画リスト」タブから各デッキに動画をロードします
5. 再生、停止、速度調整などの操作を行います
6. クロスフェーダーを使用して2つのデッキ間の映像をミックスします

## 開発環境のセットアップ

```bash
# 依存関係のインストール
pnpm install

# 開発サーバーの起動
pnpm dev

# 型チェック
pnpm check

# テストの実行
pnpm test

# コードのフォーマット
pnpm format
```

## 主要な技術スタック

- [SvelteKit](https://kit.svelte.dev/) - Webアプリケーションフレームワーク
- [Svelte 5](https://svelte.dev/) - UIコンポーネントライブラリ
- [TypeScript](https://www.typescriptlang.org/) - 型安全なJavaScript
- [TailwindCSS](https://tailwindcss.com/) - ユーティリティファーストCSSフレームワーク
- [DaisyUI](https://daisyui.com/) - TailwindCSSコンポーネントライブラリ
- [WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API) - リアルタイム通信
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) - 動画ダウンロードツール
- [ffmpeg](https://ffmpeg.org/) - 動画処理ツール

## プロジェクト構造

```
src/
├── app.css                # グローバルスタイル
├── app.html               # HTMLテンプレート
├── components/            # 共通コンポーネント
│   ├── Deck.svelte        # デッキコンポーネント
│   ├── DeckPreview.svelte # デッキプレビューコンポーネント
│   ├── MovieDownload.svelte # 動画ダウンロードコンポーネント
│   ├── MovieList.svelte   # 動画リストコンポーネント
│   ├── RenameModal.svelte # 名前変更モーダル
│   └── TabNavigation.svelte # タブナビゲーション
├── lib/                   # ユーティリティと型定義
│   ├── types.d.ts         # 型定義
│   ├── ws-client.ts       # WebSocketクライアント
│   └── ws-server.ts       # WebSocketサーバー
└── routes/                # アプリケーションルート
    ├── +layout.svelte     # 共通レイアウト
    ├── +page.svelte       # ホームページ
    ├── api/               # APIエンドポイント
    │   ├── delete-movie/  # 動画削除API
    │   ├── download-movie/ # 動画ダウンロードAPI
    │   ├── get-movie/     # 動画取得API
    │   ├── get-movie-list/ # 動画リスト取得API
    │   └── rename-movie/  # 動画名変更API
    ├── dashboard/         # ダッシュボード画面
    │   └── +page.svelte
    └── output/            # 出力画面
        └── +page.svelte
```

## APIエンドポイント

- `POST /api/download-movie`: 動画のダウンロード
- `GET /api/get-movie?video={filename}`: 指定した動画ファイルの取得
- `GET /api/get-movie-list`: 利用可能な動画のリスト取得
- `POST /api/rename-movie`: 動画ファイルの名前変更
- `POST /api/delete-movie`: 動画ファイルの削除

## WebSocket通信

WebSocketサーバーはポート5901（デフォルト）で実行され、ダッシュボードと出力画面間の通信を処理します。

主な通信内容:
- デッキの状態（再生/停止、位置、速度など）
- 透明度とクロスフェード値
- 動画読み込み状態
- 出力ページの接続状態

## 環境変数

`.env`ファイルで以下の環境変数を設定できます:

- `PUBLIC_WS_SERVER_PORT`: WebSocketサーバーのポート番号（デフォルト: 5901）
- `PUBLIC_MOVIE_PATH`: 動画ファイルの保存パス（デフォルト: ./static/videos）

## ライセンス

MIT

## 貢献

バグ報告や機能リクエストは、GitHubのIssueで受け付けています。プルリクエストも歓迎します。

## 作者

[uboar](https://github.com/uboar)