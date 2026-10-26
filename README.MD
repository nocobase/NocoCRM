# NocoCRM

English | [中文](README.zh-CN.md)

NocoCRM is a CRM for B2B sales teams, built on [NocoBase 3](https://www.nocobase.com). It keeps leads, companies, contacts, opportunities, tasks and approvals, and gives the team a set of AI agents: an assistant to talk to, and agents that follow up leads and deals, review approvals, prepare tasks and watch customers' companies. Every agent works within the permissions of the person it works for, and every change it suggests waits for a person to accept it.

## Getting started

You need nothing but Node.js and pnpm to run NocoCRM on your own computer: it keeps its data in a SQLite file by default (PostgreSQL and MySQL work too), and every feature except the AI works without any account or key. Install it with a coding agent, or by hand in about ten minutes; then sign in and take the first steps.

### Install with a coding agent

The easiest way is to let a coding agent do it. Open Claude Code, Codex, Cursor or another coding agent in the folder where NocoCRM should go, and give it this:

```text
Install NocoCRM from https://github.com/nocobase/NocoCRM on this computer and start it.
Clone it into a NocoCRM folder, make sure Node.js 24 or later and pnpm 11 are available,
then follow the repository's AGENTS.md and README.
Database: the default, SQLite.
Start it with pnpm dev, then tell me the Local: address and how to sign in.
```

For PostgreSQL or MySQL, change the database line to its connection, for example: `Database: PostgreSQL, host localhost, port 5432, database nococrm, username postgres; I'll give you the password separately.`

The repository's `AGENTS.md` guides the agent, so later on you can ask the same agent to connect a model service or mail, or to change the application itself. Then go on with [Sign in](#sign-in).

### Install by hand

#### 1. Install the tools

- **Node.js 24 or later.** Check with `node -v`.
- **pnpm 11.** Run `corepack enable` once and pnpm uses the version `package.json` pins; or install it with `npm install -g pnpm@11`.
- **Optional: an API key for a large-model service**, which the assistant and the AI agents need, such as DeepSeek, OpenAI, Claude, Gemini or Qwen. You add it once the application runs (see [First steps](#first-steps)).

#### 2. Get the code

```bash
git clone https://github.com/nocobase/NocoCRM.git
cd NocoCRM
pnpm install
```

#### 3. Create the configuration

```bash
pnpm nocobase config init --dialect sqlite
```

This writes the configuration file `config.yml`, whose `secrets` section holds a generated key that encrypts the model keys, mailbox passwords and the like the application saves. `config.yml` is not committed to Git. `--dialect sqlite` keeps the data in a file; to run on PostgreSQL or MySQL instead, see [Database](#configuration) under Configuration.

#### 4. Start the application

```bash
pnpm dev
```

The first start creates the database, `storage/crm.sqlite`, and sets it up. When it is ready, it prints a `Local:` address, normally `http://127.0.0.1:13000/main/`. Open that address; if port 13000 is taken, the next free port is used, so always use the address it prints.

### Sign in

Sign in as the first administrator: username `nocobase` (or email `admin@nocobase.com`), password `admin123`. Once signed in, you can change the password on **Settings → Users**. There is no self-registration: the administrator creates every other account.

The interface starts in English; switch the language from the avatar menu at the top right.

### First steps

1. **Look around with the demo data.** The banner at the top offers it, or open **Settings → Demo data**, choose English or Chinese and import it. It adds a sales team with customers, deals, tasks, approvals, mail and conversations (see [Demo data](#demo-data) below).
2. **Add your team.** Create accounts or send invitations on **Settings → Users**, and give each person a role (see [Roles](#roles) below). What each role may do is set on **Settings → Roles**.
3. **Connect mail and WhatsApp** when you need them (see [Configuration](#configuration)).
4. **Use the AI.** First add a model service with its key on **Agent team → Models** (DeepSeek, OpenAI, Claude, Gemini, Qwen and others all work). Then you can talk to the assistant in the box on the overview; describe what you sell, your editions and prices and your rules on **Agent team → Business guidance**, so the agents know your business; and switch the background agents on or off on **Agent team → Agent work**. Without a model, everything but the AI works.
5. **Start for real.** Remove the demo data on **Settings → Demo data**; your own records stay.

### Demo data

A banner offers the **demo data**, imported and removed on **Settings → Demo data**, in English or Chinese. It brings sales accounts whose password is the username followed by `123`:

| Language | Sales managers      | Salespeople                   |
| -------- | ------------------- | ----------------------------- |
| English  | `daniel`, `emily`   | `sophie`, `oliver`            |
| Chinese  | `liming`, `zhaomin` | `wangxiaofang`, `chenxiaohao` |

The administrator who imports it becomes a sales manager too, with records, approvals, AI suggestions and conversations of their own. Each account gets a demo mailbox (`<username>@demo.example`) holding the dataset's customer conversations, and a demo WhatsApp number holds a few customer chats, so mail and WhatsApp can be tried without connecting anything. Demo mail is never delivered outside the dataset's `.example` addresses. Removing the demo data removes all of it and disables the demo accounts. The demo amounts are in yuan, so the import sets the currency to CNY; after removing the demo data, change it on **Settings → General** if you use another currency.

### Roles

Accounts are created on **Settings → Users**, each with one or more roles; there is no self-registration.

| Role          | What it can do                                                                                              |
| ------------- | ----------------------------------------------------------------------------------------------------------- |
| Administrator | Configures the CRM, its agents and its integrations, and sees everything                                    |
| Sales manager | Views and edits all sales records, assigns owners, decides approvals and exports; deletes what they created |
| Salesperson   | Views the team's records, edits their own and raises approvals                                              |

### Common problems

| What you see                                         | What to do                                                                                                                                                                                                          |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install` refuses to run or fails on the engine | Use Node.js 24 or later and pnpm 11 (see [Install the tools](#1-install-the-tools)).                                                                                                                                |
| The page does not open                               | Use the `Local:` address `pnpm dev` printed, including `/main/`. Only one `pnpm dev` runs per folder; stop the other one first.                                                                                     |
| "The assistant is not available"                     | No model is connected yet. Add a model service with its key on **Agent team → Models**.                                                                                                                             |
| Forgot the administrator password                    | Another administrator resets it on **Settings → Users**. On a local copy you can also start over (below) with a new password in `config.yml`.                                                                       |
| Saved keys or mailboxes stopped working              | `config.yml` was lost or generated again. Restore the backed-up `config.yml`, or enter the keys and reconnect the mailboxes again.                                                                                  |
| You want to start over with an empty database        | Stop `pnpm dev`, delete `storage/crm.sqlite`, `storage/objects/` and `storage/ai-files/`, and start again. This deletes all local data.                                                                             |
| You want the newest version                          | `git pull`, then `pnpm install` and `pnpm dev`. Database changes are applied when the application starts; back up `storage/` first if the data matters to you.                                                      |
| The start warns of a migration's checksum mismatch   | A release reworded a migration your database already ran, without changing what it did (so that it runs on PostgreSQL and MySQL too). Run `pnpm nocobase db repair` once, in a terminal, to record the new wording. |

## Agents

All of the CRM's AI is built on the Agents plugin, and runs on the model services configured for the application (see [Configuration](#configuration)).

**Sales Expert.** A conversation box floats at the bottom of every page, the overview opens with one, and past conversations are on the Conversations page. Sales Expert answers from the records the person may read, reads attached files, and knows the record the person is looking at. When something should change, it proposes a plan (create a task, update a deal, move a lead on) that the person confirms step by step. It writes as that person and never beyond their permissions.

**Agent work.** Five agents work in the background, each started by events and switched on or off by an administrator:

| Agent                 | Started by                                                                                                       | What it produces                                                                                                  |
| --------------------- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Lead follow-up        | A new lead, a completed task, a customer's reply, a change at the company, a merge, and a daily check            | The next step, a grade, the gaps, fields to fill, an email draft, or a recommendation to convert                  |
| Opportunity follow-up | A new deal, a completed task, a decided approval, a customer's reply, and a daily check                          | The next step, the stage it should move to, its likelihood, and the terms that need approval                      |
| Approval review       | A submitted approval                                                                                             | A review for the approver: what is asked, against the business guidance, with a suggested decision                |
| Task preparation      | A daily check of the coming tasks                                                                                | A brief for each meeting or call: who takes part, what happened before, what to ask                               |
| Company research      | A new company; a morning check of the companies with open deals or marked as watched, and Check now on a company | A new company's particulars; news found on the web: funding, hiring, leadership changes, business moves and risks |

The follow-ups, reviews and briefs land in the owner's **Inbox → AI suggestions**, where each is accepted, edited or dismissed; nothing changes until the owner decides. A company signal is kept on the company's Signals tab and timeline and its owners are notified; an important one starts the follow-up of the company's open deals.

**Records from any text.** Paste an email, a chat or a business card, and **Organise with AI** checks it against existing records, then turns it into new leads or an opportunity for you to review and save.

**Making it yours.** The method each agent follows is a skill, edited on **Agent team → Skills**; the company's own facts (what it sells, its editions and prices, when to follow up, what needs approval) are the **business guidance** on **Agent team → Business guidance**. The agents, their models and the token usage are on **Agent team → Agents**, **Models** and **Usage**. What the agents write on their own follows the **AI working language** setting (English or Chinese); the assistant answers in the language it is asked in.

## Other features

- **Records.** Leads, companies, contacts, opportunities, tasks and approvals. Lists, boards, record pages and drawers, a timeline with comments and @-mentions, attachments and the change history.
- **Overview.** Today's and overdue work, the pipeline and the latest conversations, for the reader's own records or the team's.
- **Inbox.** AI suggestions waiting on the reader and the notifications: assignments, approvals, mentions, comments and task reminders, each kind switchable in the settings.
- **Reports.** Key figures, revenue and forecast, losses and pace, lead sources and the team's results.
- **Global search.** ⌘K / Ctrl+K searches every kind of record, and hands a question to the assistant.
- **Leads.** Conversion into a company, a contact and an opportunity, checked against existing ones; duplicate leads found and merged.
- **Mail.** Each person connects their own mailbox and sends and receives mail in the CRM; the conversations with a customer show on its records.
- **WhatsApp.** The company's WhatsApp Business number is connected, and customers' messages are matched to leads and contacts and shown on their records.
- **Approvals.** Who may decide approvals can be set.
- **Roles.** Administrator, sales manager and salesperson, enforced per record by the server and adjustable on **Settings → Roles**.
- **LinkedIn.** Leads, contacts and companies keep a LinkedIn address, used to find duplicates and filled by the AI when pasted text includes one.
- **Languages.** The interface is in 12 languages: English, Simplified Chinese, Traditional Chinese, Japanese, Korean, German, French, Spanish, Brazilian Portuguese, Russian, Indonesian and Vietnamese. The demo data and the AI working language are English or Chinese.

## Configuration

`config.yml` holds the secrets and is not committed; `config.example.yml` documents every option. Change a value with `pnpm nocobase config set key=value`.

**AI.** Give DeepSeek, the default model service, its key through the environment: `DEEPSEEK_API_KEY`. The service is declared in `server/config/ai.ts`; without its key it is left out, and with no service the AI is off. On start, a service not yet on **Agent team → Models** is created there, and the page manages it afterwards. Other providers, such as OpenAI, Anthropic (Claude), Google (Gemini) and Qwen, are added on that page with their key (or declared under `ai.llmServices` in `config.yml`); then choose the model each agent uses with **Set its model and instructions** on **Agent team → Agent work**. The assistant and the follow-up agents use DeepSeek first. Company research searches the web with its model, which must be one that can search: DeepSeek, OpenAI, Anthropic (Claude), Google (Gemini) or Qwen.

**Notifications.** The in-app inbox needs the channel `inbox` (`notification.channels.inbox: { type: in-app }`, already in `config.example.yml`). Each kind can be switched off on **Settings → General → Reminders**.

**Mail.** Declare the mail servers people may connect under `mail.providers` (examples in `config.example.yml`); each person connects their mailbox from **Mailbox → Manage mail accounts**. Gmail and Microsoft 365 also need an OAuth client, with `<origin><base path>/mail/oauth/callback` as its redirect URL.

**WhatsApp.** An administrator connects the company's number from **WhatsApp → Manage WhatsApp connection**, with the Meta app's secret and the number's access token, and registers the webhook address and verify token shown there in the Meta app.

**Where it is served.** `APP_BASE_PATH` is the mount path (`/main` by default) and `APP_PUBLIC_ORIGIN` the public origin without the path.

**Database.** SQLite at `storage/crm.sqlite` by default; migrations run on start. NocoCRM also runs on PostgreSQL and MySQL (MariaDB uses the MySQL driver). Their drivers are installed for development and tests only, so a build carries SQLite alone; to run on one of them:

1. Move its driver into the dependencies a build carries with `pnpm add --save-prod @nocobase/db-postgres` (or `@nocobase/db-mysql`).
2. Create an empty database (for MySQL with the `utf8mb4` character set) and a user that may create tables in it.
3. Write the configuration for it with `pnpm nocobase config init --dialect postgres` (or `mysql`; add `--force` to replace an existing `config.yml`), set the connection with `pnpm nocobase config set database.connections.main.host=… database.connections.main.port=… database.connections.main.database=… database.connections.main.username=…` and its password with `pnpm nocobase config set --from-env database.connections.main.password=<variable>`, and check it with `pnpm nocobase config check`.
4. Start with `pnpm dev`, or build and deploy as below: the first start creates the tables. On PostgreSQL it also adds two small functions, and the `LIKE` operators between `json` and `text` that use them, to the connection's schema, so that the CRM can match JSON columns there as it does on SQLite and MySQL.

The environment variables `DB_DIALECT`, `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME` and `DB_PASSWORD` override `config.yml`. Changing the database does not move data: the new one starts empty, and **Settings → Demo data** can fill it. The tests run on SQLite; `NOCOBASE_TEST_DB_DIALECT=postgres` runs the database tests on a PostgreSQL server (read from `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD` and `PGDATABASE`, each test in a schema of its own), and `NOCOBASE_TEST_DB_DIALECT=mysql` on a MySQL server (`MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_ADMIN_USER` and `MYSQL_ADMIN_PASSWORD`, each test in a database of its own).

## Built on NocoBase 3

NocoBase 3 is an application foundation for building business software with coding agents. Its App Foundation provides the infrastructure every business application needs, so an application does not build it again. NocoCRM is a NocoBase Solution: a complete application generated from the NocoBase application template, with its own data model, services, API and pages on top of the foundation.

| From NocoBase 3                                      | What NocoCRM uses it for                                                                                                                |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Application server, database layer and CLI           | The server, migrations and seeds, configuration, builds and deployment                                                                  |
| Application template and UI Library                  | Layouts, routing, themes, sign-in pages, and the components every page is built from                                                    |
| Authentication, users and API keys                   | Sign-in, user accounts and personal API keys                                                                                            |
| Authorization (permission sets, record access rules) | The three roles, each record's visibility and edit rights, page grants, and the Roles settings                                          |
| Agents plugin                                        | Agents, conversations, skills, model services, usage, and the CRM's own commands for agents                                             |
| Notification plugins                                 | The in-app inbox                                                                                                                        |
| Lifecycle library                                    | The approvals' states and transitions, what each transition sets off, the approver rule, and the diagram on Settings → Approval process |
| Scheduler                                            | The daily follow-up checks, task preparation and company signal checks                                                                  |
| Mail plugin                                          | Each user's mailbox: sync, reading, writing and sending                                                                                 |
| File and i18n plugins                                | Attachments and their previews, the 12 interface languages                                                                              |
| Database Explorer                                    | Read-only browsing of the application's collections                                                                                     |

## Deployment

Build an archive for the server. It holds the code and its production dependencies, but no configuration, database or uploads:

```bash
pnpm build --target linux-x64 --tar   # writes storage/exports/dist.tar.gz
```

- **With the NocoBase app-installer (recommended).** The server needs Node.js 24 and a global pm2. The installer unpacks the archive, writes `config.yml`, applies the migrations and runs the application under pm2; an upgrade backs up the SQLite databases first and rolls back if the new release fails to start.

  ```bash
  npx @nocobase/app-installer@beta install /srv/nocobase/crm --archive dist.tar.gz --origin https://crm.example.com --base-path /crm
  npx @nocobase/app-installer@beta upgrade --dir /srv/nocobase/crm --archive dist.tar.gz
  ```

- **By hand.** Unpack the archive, run `pnpm nocobase config init` (with `--dialect` when the build carries more than one database driver) and `pnpm nocobase config check` inside `dist/`, and run `node ./dist/server/standalone.js` under a service manager, keeping `config.yml` and `storage/` beside `dist/` across updates.

To serve the client's static files from a CDN, build with `CDN_BASE_URL=https://cdn.example.com/crm/v1/ pnpm build`, upload `dist/client/` there with its paths and CORS allowed for the application's origin, and keep `dist/client/` on the server too, which still serves the HTML.

Behind a reverse proxy, keep the public host and protocol and pass WebSocket upgrades. After deploying, set the AI keys and check `<base path>/api/healthz`. Back up the database and `storage/` before upgrading.

## Development

`AGENTS.md` is the guide for working on the code, with Claude Code or any other coding agent. The main commands:

| Command                  | What it does                                |
| ------------------------ | ------------------------------------------- |
| `pnpm dev`               | Run the server and client with hot reload   |
| `pnpm build`             | Build into `dist/`                          |
| `pnpm start`             | Run the build                               |
| `pnpm test`              | Run the tests in `tests/`                   |
| `pnpm typecheck`         | Type-check the client and server            |
| `pnpm lint`              | Lint                                        |
| `pnpm check`             | Everything above plus a build               |
| `pnpm nocobase db apply` | Apply pending migrations without restarting |
| `pnpm nocobase --help`   | List every other command                    |

## License

MIT
