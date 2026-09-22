# Bend / Tetris

Bend で定義したテトロミノ形状・スコア・レベル・落下速度・乱数規則を、ブラウザの Canvas UI から呼び出すテトリスです。

`LAWS.bend` にゲーム規則の契約を、`PROOF.bend` にその証明を定義しています。

## 実行

```sh
bend index.html -o dist
python3 -m http.server 8080 -d dist
```

ブラウザで <http://localhost:8080> を開いてください。

## 操作

- `←` / `→`: 移動
- `↑` / `Z`: 回転
- `↓`: ソフトドロップ
- `Space`: ハードドロップ
- `C`: ホールド
- `P` / `Esc`: ポーズ

スマートフォンでは画面下部のタッチボタンを使用できます。

## テスト

```sh
npm run test:proof
npm install
npx playwright install chromium
npm run test:e2e
```
