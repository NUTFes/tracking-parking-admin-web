# Tracking-Parking — Admin Web (tracking-parking-admin-web)

React + Vite + MUI 製の管理コンソール。駐車場・エッジデバイスの登録／編集／削除、
デバイス再起動コマンドの発行など、操作系の機能をまとめて持つ。ユーザー認証で保護されており、
不特定多数に公開する [web](https://github.com/NUTFes/tracking-parking-web)（空き状況の閲覧のみ）
とは別サービスに分けている。

[tracking-parking-center](https://github.com/NUTFes/tracking-parking-center) から
`services/admin-web` としてcloneして使う想定（プロジェクト全体のセットアップ手順・
管理者アカウントの作成方法はそちらを参照）。

## フロントエンド開発

```bash
cp .env.example .env   # VITE_API_BASE_URL（既定: http://localhost:8000）
npm install
npm run dev -- --port 5174   # vite.config.tsのデフォルト5173との混同に注意し--portを指定
npm run build                 # 型チェック + 本番ビルド
```

`web` とは別々の Vite プロジェクトで、`src/api` 配下のAPIクライアントなどのコードは
意図的に重複させている（2画面だけの規模でモノレポの共有パッケージ化をするほどではないため）。
API のレスポンス型を変更した場合は `web` 側にも反映すること。

## 認証（クライアント側の実装）

サーバー側のトークン発行・検証ロジックは
[api リポジトリ](https://github.com/NUTFes/tracking-parking-api) 側にある。ここではフロントエンド
（`src/auth/AuthContext.tsx`・`src/api/client.ts`）が担う部分だけ説明する。

- アクセストークン（AT）は **メモリ上（JSのモジュール変数）にのみ保持**し、localStorageや
  Cookieなど永続化できる場所には一切書き込まない。ページをリロードするとATは消える。
- ページを開いたとき、フロントエンドはATを持っていない（メモリがリセットされている）ため、
  まず `POST /api/v1/auth/refresh` をCookie任せで呼び、有効なリフレッシュトークンがあれば
  ATを再発行してログイン状態を復元する（サイレントログイン）。無効/失効していればログイン
  画面を表示する。
- 通常のAPIリクエストがAT切れで401になった場合、フロントエンドが自動的に一度だけ
  `/auth/refresh` を呼んでATを取り直し、元のリクエストをリトライする（`src/api/client.ts`）。

## License

MIT License. 詳細は [LICENSE](LICENSE) を参照。
