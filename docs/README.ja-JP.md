<h1 align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="images/nococrm-logo-dark.svg">
    <img src="images/nococrm-logo.svg" width="240" alt="NocoCRM">
  </picture>
</h1>

<p align="center"><strong>営業チームに、24 時間働くエージェントチームを。</strong></p>

<p align="center">オープンソースの B2B 営業 CRM · NocoBase で構築</p>

<p align="center">
  <a href="../LICENSE.txt"><img src="https://img.shields.io/badge/license-NocoBase-blue" alt="NocoBase License"></a>
  <a href="https://github.com/nocobase/NocoCRM/tags"><img src="https://img.shields.io/github/v/tag/nocobase/NocoCRM?label=version&sort=semver&include_prereleases" alt="version"></a>
  <a href="https://www.nocobase.com"><img src="https://img.shields.io/badge/built%20on-NocoBase-1f6feb" alt="Built on NocoBase"></a>
</p>

<p align="center">
  <a href="https://solutions.nocobase.com/crm/"><strong>オンラインで試す</strong></a> · <a href="https://www.nocobase.com/ja-JP/solution-crm/">公式サイト</a>
</p>

<p align="center">
  <a href="../README.MD">English</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.zh-TW.md">繁體中文</a> · <strong>日本語</strong> · <a href="README.ko-KR.md">한국어</a> · <a href="README.de-DE.md">Deutsch</a> · <a href="README.fr-FR.md">Français</a> · <a href="README.es-ES.md">Español</a> · <a href="README.pt-BR.md">Português</a> · <a href="README.ru-RU.md">Русский</a> · <a href="README.id-ID.md">Bahasa Indonesia</a> · <a href="README.vi-VN.md">Tiếng Việt</a>
</p>

NocoCRM は [NocoBase](https://www.nocobase.com) で構築されたオープンソースの B2B 営業 CRM です。6 種の営業エージェントを搭載し、メールと WhatsApp に連携します。リードや商談を自動でフォローし、届いたメッセージにすぐ返信し、承認では一緒に検討します。エージェントが提案し、人が判断します。

https://github.com/user-attachments/assets/575c9b19-4437-47a8-9c59-d428f90efa5a

## 機能

- **自動フォローアップ。** 新しいリードや商談、顧客からの返信、タスクの完了、毎朝のチェックをきっかけに、エージェントが経緯をすべて読み、判断・確度・理由を添えて次の一手を受信トレイに届けます。レコードが変わるのは、あなたが採用したときだけです。
- **すべてのチャネルを 1 本のタイムラインに。** メールボックス（Gmail、Microsoft 365、任意の IMAP/SMTP サーバー）は各自が、WhatsApp Business の番号は会社が接続します。メッセージはリードや連絡先に自動でひも付き、返信の下書きはあなた自身のアカウントから送信されます。
- **6 種の営業エージェント。** どのページからでも話せる Sales Expert に加え、バックグラウンドで働くリードのフォローアップ、商談のフォローアップ、承認レビュー、タスクの準備、企業リサーチ。それぞれにトリガー、スキル、実行記録があります。
- **スマート登録。** メール、チャット、名刺を貼り付けると、AI が既存のレコードと照らし合わせてリードや商談にまとめ、あなたが確認してから保存します。新しい会社は名前を入れるだけで、AI がウェブから会社情報を補います。重複したリードは見つけて統合できます。
- **企業の動き。** 毎朝、企業リサーチが、進行中の商談がある会社やウォッチ中の会社のニュースをウェブで探します。資金調達、採用、経営陣の交代、事業の動き、リスクを出典付きで届け、重要な動きがあればその会社の商談のフォローアップが始まります。
- **承認が止まらない。** 承認エージェントが値引きや条件をあなたのルールや過去の判断と照らし合わせ、承認者のために推奨とコメントを下書きします。
- **営業サイクル全体を。** リード、会社、連絡先、商談、タスク、承認、レポート。商談ボード、タスクカレンダー、すべてのレコードを横断する検索（⌘K / Ctrl+K）を備え、ロールに応じた権限はサーバーがレコードごとに適用します。
- **自由にカスタマイズ。** 価格、値引きの上限、フォローの頻度を業務ガイダンスに平易な文章で書けば、すべてのエージェントがそれに従います。各エージェントの進め方は編集できるスキルです。ソースコードは公開されているので、それ以外はコーディングエージェントに変更させられます。
- **セルフホスト。** データは自社のサーバーに置いたまま、モデルも自由に選べます：DeepSeek、OpenAI、Claude、Gemini、Qwen など。

## クイックスタート

まずは見てみたい方は[オンラインで試す](https://solutions.nocobase.com/crm/)：デモアカウントでログインした状態で開き、データはすべて架空のものです。

### 1. インストール

**コーディングエージェントでインストール。** いちばん簡単な方法です。NocoCRM を置くフォルダで Claude Code、Codex または Cursor を開き、次のように伝えます。

```text
https://github.com/nocobase/NocoCRM から NocoCRM をインストールして起動してください。リポジトリの AGENTS.md と README に従ってください。
```

**手動でインストール。** Node.js 24 以降と pnpm 11（`corepack enable`）が必要です。データは既定で SQLite ファイルに保存されます。PostgreSQL と MySQL も使えます。

```bash
git clone https://github.com/nocobase/NocoCRM.git
cd NocoCRM
pnpm install
pnpm nocobase config init --dialect sqlite
pnpm dev
```

### 2. サインイン

`pnpm dev` が表示する `Local:` のアドレス（通常は `http://127.0.0.1:13000/main/`）を開き、ユーザー名 `nocobase`、パスワード `admin123` でサインインします。

### 3. デモデータをインポート

画面上部のバナーから、または **設定 → デモデータ** からインポートします。顧客、商談、タスク、承認、メール、会話を持つ営業チームが追加されます。本番運用を始めるときは同じページで削除します。

### 4. AI モデルを設定

**Agent チーム → モデル** で、DeepSeek、OpenAI、Claude、Gemini、Qwen などのモデルサービスをキーとともに追加します。アシスタントとエージェントに必要です。それ以外の機能はなくても動きます。

[ガイド](guide.md)（英語）では、その後の手順、デモアカウント、ロール、設定（AI、メール、WhatsApp、データベース）、デプロイ、開発を説明しています。

本番環境へのデプロイは[デプロイ](guide.md#deployment)、PostgreSQL や MySQL で動かす場合は[設定](guide.md#configuration)を参照してください。

## ライセンス

NocoCRM は NocoBase で構築され、[NocoBase ライセンス](../LICENSE.txt)で公開されています。
