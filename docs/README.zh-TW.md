<h1 align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="images/nococrm-logo-dark.svg">
    <img src="images/nococrm-logo.svg" width="240" alt="NocoCRM">
  </picture>
</h1>

<p align="center"><strong>給你的業務，配一支 7×24 的 Agent 團隊。</strong></p>

<p align="center">開源 B2B 銷售 CRM · 基於 NocoBase 建構</p>

<p align="center">
  <a href="../LICENSE.txt"><img src="https://img.shields.io/badge/license-NocoBase-blue" alt="NocoBase License"></a>
  <a href="https://github.com/nocobase/NocoCRM/tags"><img src="https://img.shields.io/github/v/tag/nocobase/NocoCRM?label=version&sort=semver&include_prereleases" alt="version"></a>
  <a href="https://www.nocobase.com"><img src="https://img.shields.io/badge/built%20on-NocoBase-1f6feb" alt="Built on NocoBase"></a>
</p>

<p align="center">
  <a href="https://solutions.nocobase.com/crm/"><strong>線上體驗</strong></a> · <a href="https://www.nocobase.com/zh-TW/solution-crm/">官網介紹</a>
</p>

<p align="center">
  <a href="../README.MD">English</a> · <a href="README.zh-CN.md">简体中文</a> · <strong>繁體中文</strong> · <a href="README.ja-JP.md">日本語</a> · <a href="README.ko-KR.md">한국어</a> · <a href="README.de-DE.md">Deutsch</a> · <a href="README.fr-FR.md">Français</a> · <a href="README.es-ES.md">Español</a> · <a href="README.pt-BR.md">Português</a> · <a href="README.ru-RU.md">Русский</a> · <a href="README.id-ID.md">Bahasa Indonesia</a> · <a href="README.vi-VN.md">Tiếng Việt</a>
</p>

NocoCRM 是基於 [NocoBase](https://www.nocobase.com) 的開源 B2B 銷售 CRM。它內建 6 個銷售 Agent，並整合郵箱與 WhatsApp：自動跟進線索與商機，即時回覆來信，審批時幫你分析。Agent 給建議，人來拍板。

https://github.com/user-attachments/assets/4175b47a-484e-4482-a319-e74e04898222

## 功能

- **自動跟進。** 新線索、新商機、客戶回信、任務完成、每天早上的巡檢，Agent 都會自動觸發，讀完上下文後把下一步建議送進收件匣，寫明結論、把握和依據。只有你採納後才會修改記錄。
- **所有管道歸到一條時間線。** 每個人連接自己的郵箱（Gmail、Microsoft 365 或任何 IMAP/SMTP 郵箱），公司連接 WhatsApp Business 號碼。來信自動對應到線索和聯絡人，回覆已起草好，由你的帳號發出。
- **6 個銷售 Agent。** 每個頁面都能對話的銷售專家，加上在背景工作的跟進線索、跟進商機、審批輔助、任務準備和公司情報，各有觸發條件、技能和執行記錄。
- **智慧建檔。** 貼上一封郵件、一段聊天或一張名片，AI 對照現有記錄，整理成線索或商機，由你確認後儲存；新增公司只要寫上名稱，AI 會上網補齊公司資料。重複的線索會被找出並合併。
- **公司動態。** 每天早上，公司情報上網查找有進行中商機或被關注的公司的新聞：融資、招聘、高層異動、業務動向和風險，附上來源。重要的動態會觸發這些商機的跟進。
- **審批不再卡關。** 審批 Agent 對照你的規則和過往同類案例，核算折扣和條款，為審批人起草建議和審批意見。
- **從線索到成交。** 線索、公司、聯絡人、商機、任務、審批和報表，附商機看板、任務日曆和涵蓋所有記錄的搜尋（⌘K / Ctrl+K），依角色由伺服器逐筆控制記錄權限。
- **依你的方式客製。** 用幾句話把價格、折扣上限和跟進節奏寫進業務指導，每個 Agent 都照著做；每個 Agent 的工作方法是一個可以修改的技能。原始碼開放，其餘的交給程式設計 Agent 來改。
- **自行部署。** 資料留在你自己的伺服器上，模型自己選：DeepSeek、OpenAI、Claude、Gemini、通義千問等。

## 快速開始

只想先看看？[線上體驗](https://solutions.nocobase.com/crm/)：開啟即以示範帳號登入，所有資料都是虛構的。

### 1. 安裝

**用程式設計 Agent 安裝。** 最簡單的方式。在要放 NocoCRM 的目錄裡打開 Claude Code、Codex 或 Cursor，告訴它：

```text
從 https://github.com/nocobase/NocoCRM 安裝 NocoCRM 並啟動，依照儲存庫的 AGENTS.md 和 README 操作。
```

**手動安裝。** 需要 Node.js 24 或更新版本和 pnpm 11（`corepack enable`）。資料預設存在一個 SQLite 檔案裡，也可以用 PostgreSQL 和 MySQL。

```bash
git clone https://github.com/nocobase/NocoCRM.git
cd NocoCRM
pnpm install
pnpm nocobase config init --dialect sqlite
pnpm dev
```

### 2. 登入

打開 `pnpm dev` 印出的 `Local:` 位址（通常是 `http://127.0.0.1:13000/main/`），用 `nocobase` 和密碼 `admin123` 登入。

### 3. 匯入示範資料

頁面頂部的橫幅會提示匯入，也可以打開 **設定 → 示範資料**。它會加入一個銷售團隊，帶有客戶、商機、任務、審批、郵件和對話；正式使用前在同一頁移除。

### 4. 設定 AI 模型

在 **Agent 團隊 → 模型** 裡新增一個模型服務並填入金鑰，例如 DeepSeek、OpenAI、Claude、Gemini 或通義千問。助手和各個 Agent 需要它，其他功能都不需要。

[使用指南](guide.md)（英文）介紹後續步驟、示範帳號、角色、設定（AI、郵件、WhatsApp、資料庫）、部署和開發。

正式部署見[部署](guide.md#deployment)；使用 PostgreSQL 或 MySQL 見[設定](guide.md#configuration)。

## 授權條款

NocoCRM 基於 NocoBase 建構，以 [NocoBase 授權協議](../LICENSE.txt)發布。
