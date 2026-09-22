# Bend / Tetris

Bend で定義したテトロミノ形状・通常／Tスピンのスコア・レベル・落下速度・乱数規則を、ブラウザの Canvas UI から呼び出すテトリスです。

`LAWS.bend` にゲーム規則の契約を、`PROOF.bend` にその証明を定義しています。

## 実行

```sh
bend index.html -o dist
python3 -m http.server 8080 -d dist
```

ブラウザで <http://localhost:8080> を開いてください。

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

```sh
npm run test:proof
npm run test:unit
npm install
npx playwright install chromium
npm run test:e2e
```
