# Bend / Tetris

Bend で定義したテトロミノ形状・通常／Tスピンのスコア・レベル・落下速度・乱数規則を、ブラウザの Canvas UI から呼び出すテトリスです。通常のソロプレイに加え、TypeSafe AI の Jev が盤面ごとに合法手を選ぶ「VS JEV」モードを搭載しています。

`LAWS.bend` にゲーム規則の契約を、`PROOF.bend` にその証明を定義しています。
証明は通常／Tスピンの全スコア表と10ラインごとのレベル進行、落下速度の全区間、全7種の時計回りの形状・4セルの保存・回転の周期性を対象とします。
形状はビットマップ表の転記ではなく、初期座標と回転中心から定義しています（I/Oは `(1.5, 1.5)`、その他は `(1, 1)`）。
回転は全U32入力、スコアは全U32レベルを対象とし、スコアの桁あふれはU32の剰余演算に従います。
形状の不正なピースIDと乱数の品質は証明対象外です。
`npm run build` は最初に証明を検査し、契約を満たさない場合は失敗します。

## 実行

```sh
npm run build
TYPESAFE_API_KEY="your-api-key" npm run serve
```

ブラウザで <http://localhost:4173> を開いてください。ポートを変更する場合は `PORT=8080` のように指定できます。

### Jev API キー

[TypeSafe AI Console](https://console.typesafe.ai/) で API キーを発行し、サーバー起動時の環境変数 `TYPESAFE_API_KEY` に設定してください。

```sh
export TYPESAFE_API_KEY="your-api-key"
npm run build
npm run serve
```

API キーは Node.js サーバーから Jev API を呼び出すためだけに使われ、ブラウザには送信されません。キーが未設定の場合はソロモードのみプレイできます。

## VS JEV モード

画面上部の `VS JEV` を選んでゲームを開始します。プレイヤーと Jev は、それぞれ独立したシードの7-bagから生成される異なるピース列でプレイします。Jev は現在の盤面について全合法配置から Choice 型の判断を行い、返された信頼度も盤面下部に表示します。相手が先にトップアウトするか、ゲーム終了時に高いスコアを持つ側が勝者です。

## 操作

- `←` / `→`: 移動
- `↑` / `X`: 右回転
- `Z`: 左回転
- `↓`: ソフトドロップ
- `Space`: ハードドロップ
- `C`: ホールド
- `P` / `Esc`: ポーズ

スマートフォンでは画面下部のタッチボタンを使用できます。
接地後は500msの操作猶予があり、その間の移動・回転で固定タイマーが更新されます（最大15回）。

## テスト

Bendの証明はJavaScriptの盤面探索、Tスピン判定、接地タイマーやブラウザとの接続を保証しません。
既存の単体テストとE2Eテストはこれらを検証するため、引き続き実行します。

```sh
npm run test:proof
npm run test:unit
npm install
npx playwright install chromium
npm run test:e2e
```
