# Plan 002: Jev API キーを使うサーバーの利用範囲を制限する

> **Executor instructions**: この計画だけで作業できる。各段階の検証を実行する。STOP 条件に該当したら作業を止めて報告する。
> **Drift check (first)**: `git diff --stat 55d4db0..HEAD -- server.mjs tests/server.test.mjs README.md`。変更があれば以下の抜粋と現行コードを照合し、食い違えば停止する。

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED（外部端末からの利用可否が変わる）
- **Depends on**: `plans/001-confine-static-files.md`（同じサーバーテスト基盤を使う）
- **Category**: security
- **Planned at**: commit `55d4db0`, 2026-09-24

## Why this matters

API キーを設定したサーバーは、認証なしの `/api/jev/move` を上流の Jev API に転送する。`server.listen(port)` はホストを指定せず待ち受けるため、意図しない端末からも利用できる構成になりうる。README は `localhost` での実行だけを案内している。既定のローカル利用を明確にし、外部公開時は呼び出し制御を明示的に要求する。

## Current state

- `server.mjs:5-7`: ポートと `TYPESAFE_API_KEY` を環境変数から読む。
- `server.mjs:24-48`: `/api/jev/move` の POST はキー設定と簡単なサイズ・型確認だけで上流へ `fetch` する。リクエスト元、回数、同時実行数を制限しない。
- `server.mjs:64`: `server.listen(port)`。ホストを指定しない。
- `README.md:12-31`: `npm run serve` と `http://localhost:4173` を案内する。
- `tests/smoke.spec.js:76-92`: ブラウザの Jev 応答は Playwright でモックされ、実サーバーの制限を検査しない。
- `CONTEXT.md` の「プレイヤーの進行」はゲーム状態を指す。この計画は API の提供範囲だけを扱う。

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Unit tests | `npm run test:unit` | exit 0、全件成功 |
| Proof | `npm run test:proof` | exit 0 |
| Build | `npm run build` | exit 0 |
| E2E | `npm run test:e2e` | exit 0、Playwright が導入済みの場合 |

## Scope

**In scope**: `server.mjs`, `tests/server.test.mjs`, `README.md`。

**Out of scope**: ブラウザの対戦規則、`main.js`、Bend ファイル、TypeSafe AI のモデル指定、課金体系の推測。

## Git workflow

- ブランチを切るなら `advisor/002-limit-jev-api-use`。
- Conventional Commits を使用。例: `fix: limit access to Jev API proxy`。
- 指示がなければ push と PR 作成はしない。

## Steps

### Step 1: 現在の公開範囲をテストに固定する

`tests/server.test.mjs` の子プロセス起動ヘルパーを使い、キー設定時に `/api/jev/move` が認証なしで上流へ到達しうる経路を確認する。実 API キーと実ネットワークは使わず、子プロセスが読み込むテスト用 `fetch` スタブで呼び出し回数を観測する。既存テストの構造が異なる場合は、同等の隔離方法で行う。

**Verify**: `npm run test:unit` → 追加した現状確認テストが成功。

### Step 2: 既定の待ち受けをローカルに限定する

`server.mjs` の `listen` に既定 `127.0.0.1` のホストを指定する。外部公開が必要な場合だけ明示的な `HOST` 環境変数を使えるようにする。`README.md` に既定ホスト、外部公開時に追加のアクセス制御が必要なこと、`HOST` の設定方法を記す。ログの URL 表示も実際のホストに合わせる。

**Verify**: `npm run test:unit` → 既定ローカル待ち受けと明示ホスト設定のテストが成功。

### Step 3: Jev 呼び出し量を制限する

`/api/jev/move` に同時実行数と一定時間当たりの回数上限を設け、超過時は上流を呼ばず 429 または 503 を返す。制限値は小規模ローカルゲームに十分な定数として名前付きで置く。成功・失敗の両方で同時実行カウンタを `finally` で戻す。`readJson` の前に拒否できる構造にする。README に制限の存在と、複数人向け公開サーバーには別途認証・リバースプロキシ等が必要なことを記す。

**Verify**: `npm run test:unit` → 上限内、超過、失敗後の再利用で全件成功。`npm run build` → 成功。

## Test plan

- `tests/server.test.mjs` で実 API を呼ばず、スタブの上流呼び出し回数が上限を超えないことを検査する。
- README の `HOST` 例と既定動作が一致することを確認する。
- `tests/jev-ai.test.mjs` の `node:test` / `assert` 書式に合わせる。

## Done criteria

- [ ] 既定ホストは `127.0.0.1`。外部ホストは明示設定が必要。
- [ ] 上限超過時は上流 `fetch` が呼ばれないとテストで確認される。
- [ ] `npm run test:unit`、`npm run test:proof`、`npm run build` が成功。
- [ ] `git status --short` で変更は in scope と `plans/README.md` の状態行だけ。
- [ ] `plans/README.md` の状態を更新。

## STOP conditions

- 現行コードが上記抜粋と食い違う。
- 実運用で複数端末公開が必須という新しい要件が判明し、ローカル既定化が適切でない。
- 制限値の決定に課金契約の事実確認が必要になる。
- out of scope の変更が必要、または妥当な修正後も検証が2回失敗する。

## Maintenance notes

プロセス内の回数制限は複数インスタンス間では共有されない。公開運用に変わる際は認証と共有レート制限を設計する。レビューでは制限を迂回する別経路や、失敗後に同時実行枠が戻るかを確認する。
