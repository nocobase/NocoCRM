<h1 align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/images/nococrm-logo-dark.svg">
    <img src="docs/images/nococrm-logo.svg" width="240" alt="NocoCRM">
  </picture>
</h1>

<p align="center"><strong>Your sales team just gained a 24/7 agent team.</strong></p>

<p align="center">Open-source B2B sales CRM · Built on NocoBase</p>

<p align="center">
  <a href="LICENSE.txt"><img src="https://img.shields.io/badge/license-NocoBase-blue" alt="NocoBase License"></a>
  <a href="https://github.com/nocobase/NocoCRM/tags"><img src="https://img.shields.io/github/v/tag/nocobase/NocoCRM?label=version&sort=semver&include_prereleases" alt="version"></a>
  <a href="https://www.nocobase.com"><img src="https://img.shields.io/badge/built%20on-NocoBase-1f6feb" alt="Built on NocoBase"></a>
</p>

<p align="center">
  <a href="https://solutions.nocobase.com/crm/"><strong>Try it online</strong></a> · <a href="https://www.nocobase.com/solution-crm/">Website</a>
</p>

<p align="center">
  <strong>English</strong> · <a href="docs/README.zh-CN.md">简体中文</a> · <a href="docs/README.zh-TW.md">繁體中文</a> · <a href="docs/README.ja-JP.md">日本語</a> · <a href="docs/README.ko-KR.md">한국어</a> · <a href="docs/README.de-DE.md">Deutsch</a> · <a href="docs/README.fr-FR.md">Français</a> · <a href="docs/README.es-ES.md">Español</a> · <a href="docs/README.pt-BR.md">Português</a> · <a href="docs/README.ru-RU.md">Русский</a> · <a href="docs/README.id-ID.md">Bahasa Indonesia</a> · <a href="docs/README.vi-VN.md">Tiếng Việt</a>
</p>

NocoCRM is an open-source B2B sales CRM built on [NocoBase](https://www.nocobase.com). It comes with 6 sales agents and integrates your email and WhatsApp: following up on leads and opportunities, replying to messages right away, and reviewing approvals with you. Agents suggest; you decide.

https://github.com/user-attachments/assets/b251f2d2-ed55-43e8-8526-507c1130eb5c

## Features

- **Automatic follow-up.** A new lead or deal, a customer's reply, a completed task, the morning check: an agent reads the whole context and puts the next step in your inbox, with the call, its confidence and its reasons. Records change only when you accept.
- **Every channel on one timeline.** Each person connects their own mailbox (Gmail, Microsoft 365 or any IMAP/SMTP server), and the company its WhatsApp Business number. Messages are matched to leads and contacts, and replies are drafted to go out from your own account.
- **6 sales agents.** Sales Expert to talk to on every page, plus five that work in the background: lead follow-up, opportunity follow-up, approval review, task preparation and company research, each with its triggers, skills and a record of runs.
- **Smart capture.** Paste an email, a chat or a business card, and AI turns it into leads or an opportunity, checked against existing records, for you to review before saving. For a new company the name is enough: AI fills in its particulars from the web. Duplicate leads are found and merged.
- **Company signals.** Every morning, company research searches the web for news about the companies with open deals or on your watch list: funding, hiring, leadership changes, business moves and risks, with sources. An important one starts the follow-up of their open deals.
- **Approvals stop stalling.** The approval agent checks a discount or a term against your rules and past decisions, and drafts a recommendation and a comment for the approver.
- **The full sales cycle.** Leads, companies, contacts, opportunities, tasks, approvals and reports, with a pipeline board, a task calendar, search across every record (⌘K / Ctrl+K) and roles enforced per record by the server.
- **Customizable.** Write your prices, discount limits and follow-up cadence as business guidance in plain text, and every agent follows it; each agent's method is a skill you can edit. The source is open, so a coding agent can change the rest.
- **Self-hosted.** Your data stays on your servers, with the models of your choice: DeepSeek, OpenAI, Claude, Gemini, Qwen and more.

## Quick start

Just want a look? [Try it online](https://solutions.nocobase.com/crm/): you're signed in to a demo account, and all the data is made up.

### 1. Install

**With a coding agent.** The easiest way. Open Claude Code, Codex or Cursor where NocoCRM should go, and give it this:

```text
Install NocoCRM from https://github.com/nocobase/NocoCRM and start it, following its AGENTS.md and README.
```

**By hand.** You need Node.js 24 or later and pnpm 11 (`corepack enable`). The data goes into a SQLite file by default; PostgreSQL and MySQL work too.

```bash
git clone https://github.com/nocobase/NocoCRM.git
cd NocoCRM
pnpm install
pnpm nocobase config init --dialect sqlite
pnpm dev
```

### 2. Sign in

Open the `Local:` address `pnpm dev` prints, normally `http://127.0.0.1:13000/main/`, and sign in as `nocobase` with the password `admin123`.

### 3. Import the demo data

The banner at the top offers it, or open **Settings → Demo data**. It brings a sales team with customers, deals, tasks, approvals, mail and conversations; remove it there when you start for real.

### 4. Set up an AI model

Add a model service with its key on **Agent team → Models**, such as DeepSeek, OpenAI, Claude, Gemini or Qwen. The assistant and the agents need it; everything else works without it.

The [guide](docs/guide.md) covers the first steps, the demo accounts, roles, configuration (AI, mail, WhatsApp, databases), deployment and development.

For production, see [Deployment](docs/guide.md#deployment); to run on PostgreSQL or MySQL, see [Configuration](docs/guide.md#configuration).

## License

NocoCRM is built on NocoBase and released under the [NocoBase License](LICENSE.txt).
