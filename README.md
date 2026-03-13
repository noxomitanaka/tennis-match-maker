# Tennis Match Maker 🎾

**テニス大会の組み合わせ・スコア・順位を管理するWebアプリ**
Tennis tournament management app — Swiss Draw / Single Elimination / Round Robin

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/tests-84%20passed-brightgreen.svg)](tests/)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org)

> サーバー不要。ブラウザだけで動作。データはローカルに自動保存。
> No server required. Works entirely in the browser. Data saved locally.

**[▶ デモを試す / Try Demo](https://tennis-match-maker.vercel.app)**

---

## 特徴 / Features

- **3形式の大会**: スイスドロー / シングルエリミネーション / ラウンドロビン→ノックアウト
- **3参加形態**: シングルス / ダブルス / 団体戦（サブマッチ付き）
- **テニス特化スコア管理**: セット・ゲーム・タイブレーク対応、棄権・失格・雨天中断などの特殊結果
- **自動ペアリング**: スイス方式（再戦回避バックトラッキング）。固定ペア指定にも対応
- **順位計算**: 勝数→セット率→ゲーム率→直接対決→ブッフホルツなど複数タイブレーク基準
- **欠席・棄権対応**: 当日欠席（影響プレビュー付き）と途中棄権を区別。全形式で不戦勝処理を自動化
- **データ永続化**: localStorage自動保存。JSON形式でのエクスポート・インポートも可能
- **オフライン動作**: バックエンド・インターネット接続一切不要
- **印刷対応**: A4縦 / A4横で対戦表・順位表をPDF出力

---

## クイックスタート

### 方法1: ブラウザで試す（インストール不要）

[https://tennis-match-maker.vercel.app](https://tennis-match-maker.vercel.app) にアクセス。

### 方法2: 自分でホスト（Vercel・無料）

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/noxomitanaka/tennis-match-maker)

### 方法3: ローカルで起動

```bash
git clone https://github.com/noxomitanaka/tennis-match-maker
cd tennis-match-maker
npm install
npm run dev
# → http://localhost:5173 でHMR付き開発サーバーが起動
```

### ビルド＆プレビュー

```bash
npm run build
npm run preview
# → http://localhost:4173
```

### テスト

```bash
npm test           # 全テスト実行（84テスト）
npm run test:watch # ウォッチモード
```

---

## 大会の流れ

1. **大会作成** — 形式（スイスドロー等）・種別（シングルス等）・スコアルール（セット数・ゲーム数）を設定
2. **参加者登録** — 名前を入力して追加。ダブルスはペア名、団体はチーム名＋メンバー
3. **対戦生成** — 形式に応じて自動ペアリング or ブラケット生成
4. **スコア入力** — セット単位でゲーム数を入力。タイブレーク自動判定
5. **順位確定** — タイブレーク基準に基づき自動計算

---

## 技術スタック

| 領域 | 技術 |
|------|------|
| UI | React 19 + TypeScript 5.9 |
| スタイリング | Tailwind CSS 4 |
| 状態管理 | Zustand（localStorage永続化） |
| ルーティング | React Router 7（ハッシュルーター） |
| ビルド | Vite 7 |
| テスト | Vitest + Testing Library + jsdom |

---

## アーキテクチャ

```
src/
├── types/index.ts              # 型定義（Tournament, Match, Participant等）
├── store/tournament-store.ts   # Zustand ストア（全状態 + CRUD操作）
├── lib/                        # コアロジック（UIに依存しない純粋関数）
│   ├── swiss-pairing.ts        #   スイスドロー対戦組み合わせ
│   ├── standings-calculator.ts #   順位計算（複数タイブレーク基準）
│   ├── score-calculator.ts     #   セット・マッチ勝者判定
│   ├── score-validator.ts      #   スコア入力バリデーション
│   ├── knockout-bracket.ts     #   シングルエリミネーション・ブラケット生成
│   ├── group-generator.ts      #   グループ分け + ラウンドロビン日程生成
│   ├── absence-handler.ts      #   欠席処理（全形式対応の不戦勝ロジック）
│   ├── import-validator.ts     #   JSONインポートのスキーマ検証
│   └── participant-utils.ts    #   参加者表示名ヘルパー
├── pages/                      # ルートごとのページコンポーネント
└── components/                 # UIコンポーネント
    ├── ui/                     #   汎用プリミティブ（Button, Card, Badge等）
    ├── bracket/                #   トーナメントブラケット表示
    ├── standings/              #   順位表
    └── ...

tests/lib/                      # lib/ の単体テスト（9スイート・84テスト）
```

**設計上の特徴:**
- `lib/` のコアロジックはReactに依存しない純粋関数 → テスト容易・移植性高
- `Tournament` 型が全形式を包含 → 形式固有ロジックは `lib/` 内に分離
- Zustandの `persist` ミドルウェアでバックエンド不要の永続化を実現

---

## 拡張ポイント

### 新しい大会形式を追加する

1. `types/index.ts` に `TournamentFormat` リテラルを追加
2. `lib/` に対戦生成ロジックを新規作成
3. `store/tournament-store.ts` に該当アクションを追加
4. ページ・コンポーネントで形式に応じたUIを分岐

### バックエンド連携（将来）

Zustand storeのpersist設定を変更するだけで任意のストレージバックエンドに切り替え可能（REST API / Firebase / Supabase等）。

---

## 対応環境

- **ブラウザ**: Chrome / Safari / Firefox / Edge（最新版）
- **Node.js**: 20以上（開発時）

---

## Related

- **[Tenit](https://github.com/noxomitanaka/tenit)** — テニスクラブ・スクール管理の統合OSS（会員管理・コート予約・振替レッスン）。このアプリの大会管理機能をサブ機能として統合予定。

---

## Contributing

Issue・PR歓迎です。

- バグ報告: GitHub Issues
- 機能要望: GitHub Issues（`enhancement` ラベル）
- PR: `main` ブランチへのPRをお送りください

---

## ライセンス / License

[MIT](LICENSE) © 2026 Nozomi Tanaka

---

## English Summary

Tennis Match Maker is a browser-based tennis tournament management app. No server, no installation — just open it and run your tournament.

**Supported formats:**
- Swiss Draw (with rematch-avoidance backtracking)
- Single Elimination (with optional consolation bracket)
- Round Robin → Knockout

**Participant types:** Singles / Doubles / Team (with sub-matches)

**Score management:** Set/game/tiebreak scoring, special results (forfeit, disqualification, rain delay, injury, walkover)

**All logic is pure TypeScript** with 84 unit tests. Zero backend dependency.
