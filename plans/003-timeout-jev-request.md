# Plan 003: Jev 応答が止まったときローカル代替へ進む

> **Executor instructions**: この計画だけで作業できる。各段階の検証を実行する。STOP 条件に該当したら作業を止めて報告する。
> **Drift check (first)**: `git diff --stat 55d4db0..HEAD -- server.mjs main.js tests/server.test.mjs tests/smoke.spec.js`。変更があれば以下の抜粋と現行コードを照合し、食い違えば停止する。

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW（遅い正常応答が代替になる可能性がある）
- **Depends on**: `plans/002-limit-jev-api-use.md`（同じ上流 fetch とサーバーテストに触る）
- **Category**: bug
- **Planned at**: commit `55d4db0`, 2026-09-24

## Why this matters

Jev の上流 `fetch` に期限がない。応答が止まると `main.js` の `jevBusy` が true のままになり、ローカル代替への `catch` にも到達しない。一定時間で要求を中断し、プレイを継続できるようにする。

## Current state

- `server.mjs:34-49`: 上流へ `fetch` して JSON 応答を待つ。`AbortSignal` や期限はない。
- `server.mjs:52-54`: 失敗は 502 の JSON として返す。
- `main.js:205-235`: `jevBusy = true` にして `/api/jev/move` を待ち、失敗した場合 `fallbackPlacement(candidates)` を使う。
- `main.js:238-256`: 応答後に実行 ID と pause を確認し、盤面を更新して次の手を予約する。
- `tests/smoke.spec.js:76-92`: 即時に返るモック応答のみ確認する。
- `CONTEXT.md` の「プレイヤーの進行」はプレイヤー側の状態名。Jev 側の応答制御を混同しない。

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Unit tests | `npm run test:unit` | exit 0、全件成功 |
| Proof | `npm run test:proof` | exit 0 |
| Build | `npm run build` | exit 0 |
| E2E | `npm run test:e2e` | exit 0、Playwright が導入済みの場合 |

## Scope

**In scope**: `server.mjs`, `tests/server.test.mjs`, `tests/smoke.spec.js`。`main.js` はサーバー側期限だけでローカル代替が成立しない場合に限る。

**Out of scope**: Jev の評価基準、盤面探索、Bend 規則、ネットワーク再試行の追加。

## Git workflow

- ブランチを切るなら `advisor/003-timeout-jev-request`。
- Conventional Commits を使用。例: `fix: fall back when Jev request times out`。
- 指示がなければ push と PR 作成はしない。

## Steps

### Step 1: 停止する上流応答のテストを作る

`tests/server.test.mjs` の上流 `fetch` スタブで、Abort まで解決しない Promise を作る。期限後にサーバーが非 2xx の JSON を返し、上流 signal が abort 済みになることを確認する。実際の長時間待機を避けるため期限値をテストで短く設定できる形にする。

**Verify**: `npm run test:unit` → 追加テストは現行コードで失敗する。

### Step 2: 上流の応答期限を設ける

`server.mjs` の上流 `fetch` に `AbortSignal.timeout` など Node 26 で使える機構を設定する。JSON ボディの読取も同じ期限内に収める。タイムアウトの応答には内部エラーメッセージを露出せず、既存のクライアントが `response.ok` で失敗と扱えるステータスを返す。タイムアウト値は名前付き定数にし、短縮できるテスト用の設定経路は本番の外部入力に開放しない。

**Verify**: `npm run test:unit` → 停止応答、正常応答、上流エラーのテストが成功。

### Step 3: ブラウザ側の代替を確認する

`tests/smoke.spec.js` に `/api/jev/move` が非 2xx を返すケースを追加し、`LOCAL FALLBACK` または `FALLBACK` 表示と Jev の盤面更新を確認する。`main.js` の変更はこのテストが実際に失敗し、サーバー側だけでは解決できない場合に限る。

**Verify**: `npm run test:e2e` → 全件成功。`npm run build` → 成功。

## Test plan

- サーバー単体テスト: 停止、正常、上流失敗をカバーする。
- Playwright: 失敗応答でも Jev の手が継続することを確認する。既存の `tests/smoke.spec.js:76-92` を書式の手本にする。

## Done criteria

- [ ] 停止した上流要求が有限時間で中断されるとテストで確認される。
- [ ] ブラウザでローカル代替が動く。
- [ ] `npm run test:unit`、`npm run test:proof`、`npm run build`、導入済みなら `npm run test:e2e` が成功。
- [ ] `git status --short` で変更は in scope と `plans/README.md` の状態行だけ。
- [ ] `plans/README.md` の状態を更新。

## STOP conditions

- 現行コードが上記抜粋と食い違う。
- 期限設定により正規の Jev 呼び出しが継続的に失敗する実測がある。
- out of scope の変更が必要、または妥当な修正後も検証が2回失敗する。

## Maintenance notes

API の通常遅延を観測して期限値を調整する。レビューでは上流接続だけでなく JSON 読取も期限対象か、タイムアウト後に同時実行枠が解放されるかを確認する。
