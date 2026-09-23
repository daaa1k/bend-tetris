# Plan 001: 静的ファイルを dist 内だけから配信する

> **Executor instructions**: この計画だけで作業できる。各段階の検証を実行する。STOP 条件に該当したら作業を止めて報告する。
> **Drift check (first)**: `git diff --stat 55d4db0..HEAD -- server.mjs tests/server.test.mjs`。変更があれば以下の抜粋と現行コードを照合し、食い違えば停止する。

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW（正規の静的 URL が変わらないことをテストする）
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `55d4db0`, 2026-09-24

## Why this matters

静的配信のパス境界が文字列接頭辞で判定されている。`dist` の隣に `dist-backup` など同じ接頭辞のディレクトリがあると、その中のファイルも配信できる。配信範囲をパスの要素単位で `dist` 内に限定する。

## Current state

- `server.mjs:6` は `root = join(process.cwd(), "dist")` とする。
- `server.mjs:57-61` は `pathname` から `normalize(join(root, pathname))` を作り、`file.startsWith(root)` と `existsSync(file)` で判定する。`/../dist-backup/private.txt` は兄弟パスになっても接頭辞判定を通る。
- `tests/smoke.spec.js:76-92` は Jev のブラウザ動作をテストするが、サーバーの静的配信境界は直接テストしていない。
- サーバーは `node:http` を使う小規模な ESM ファイル。既存の単体テストは `node --test tests/*.test.mjs` で実行する。新テストも `node:test` と `node:assert/strict` を使い、`tests/jev-ai.test.mjs` の書式に合わせる。
- `CONTEXT.md` は「プレイヤーの進行」を定義する。この変更はそのゲーム状態に触れない。

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Unit tests | `npm run test:unit` | exit 0、全テスト成功 |
| Proof | `npm run test:proof` | exit 0 |
| Build | `npm run build` | exit 0 |
| E2E | `npm run test:e2e` | exit 0、Playwright が導入済みの場合 |

## Scope

**In scope**: `server.mjs`, `tests/server.test.mjs`（新規）。

**Out of scope**: `main.js`、Bend ファイル、Jev API の認証・呼び出し制御、既存レスポンスの MIME 対応。

## Git workflow

- ブランチを切るなら `advisor/001-confine-static-files`。
- コミットは Conventional Commits。例: `fix: confine static serving to dist`。
- 指示がなければ push と PR 作成はしない。

## Steps

### Step 1: サーバー境界の回帰テストを追加する

`tests/server.test.mjs` で一時ディレクトリを作り、`dist/index.html` と兄弟 `dist-backup/private.txt` を配置する。子プロセスで `server.mjs` をそのディレクトリから起動し、空いているポートを指定して HTTP リクエストする。`/` は 200、`/../dist-backup/private.txt` は 404、存在しないファイルは 404 を期待する。サーバーを `finally` で終了し、一時ディレクトリを削除する。既存の `process.cwd()` 依存を維持する。

**Verify**: `npm run test:unit` → 新テストの兄弟パスケースが現行コードで失敗する。

### Step 2: 配信パスを境界内に限定する

`server.mjs` で `root` からの相対パスを `relative` など `node:path` API で判定する。相対パスが `..` または `..` と区切り文字で始まる場合、もしくは絶対パスなら 404。単純な `startsWith(root)` は使わない。`dist` 自体はファイル配信せず、通常の `/` と静的アセット URL は維持する。シンボリックリンク経由で root 外に出られる場合もテストで確認し、必要なら `realpath` で実体パスを検証する。

**Verify**: `npm run test:unit` → 全件成功。続けて `npm run build` → 成功。

## Test plan

- `tests/server.test.mjs` に通常 URL、兄弟ディレクトリ、欠損ファイル、シンボリックリンクのケースを追加する。シンボリックリンクを作れない環境では理由付きでそのケースのみ skip する。
- `tests/jev-ai.test.mjs` の `node:test` スタイルを使う。

## Done criteria

- [ ] `npm run test:unit`、`npm run test:proof`、`npm run build` が成功。
- [ ] 正常ファイルは 200、root 外の兄弟パスとシンボリックリンク先は 404 とテストされる。
- [ ] `git status --short` で変更は in scope のファイルと `plans/README.md` の状態行だけ。
- [ ] `plans/README.md` の状態を更新。

## STOP conditions

- 現行コードが上記抜粋と食い違う。
- 正常な Bend ビルド成果物が新しい境界判定で配信できない。
- out of scope のファイルを変更する必要がある。
- 検証が妥当な修正後も2回失敗する。

## Maintenance notes

新しい静的ディレクトリを追加するときは、配信ルートの境界テストも更新する。レビューではエンコード済みパスとシンボリックリンクの扱いを確認する。
