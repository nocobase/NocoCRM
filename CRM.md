# CRM

Application implementation of `spec.md` on NocoBase 3, with persistent SQLite storage and the existing authentication, authorization, file repository, AI and in-app notification packages.

## Run locally

Use Node 24 or later and the project's pnpm version:

```sh
pnpm install
pnpm dev
```

Open <http://127.0.0.1:13001/main/> and sign in with your existing account. Keep the terminal running; `Ctrl+C` stops the development server. Start only one development instance against this SQLite file. The database is `storage/crm.sqlite`; uploaded files use the configured local drive. Back up both database and uploads together.

`pnpm migrate` applies the application migrations. Development startup also applies pending migrations. Applied migration sources must remain byte-for-byte unchanged because NocoBase verifies their checksums.

## Available workflows

- Dashboard with personal work, overdue activities, approvals, risks, sales funnel, currency-separated amounts, conversion counts, source effectiveness, and team performance.
- Leads, accounts, contacts, opportunities, activities and approval lists, details, filters, CSV import/export, attachment uploads, history, and contextual creation. Status boards and an activity calendar complement lists.
- Atomic lead conversion with duplicate suggestions and explicit merge choices. Converted leads remain read-only; earlier activities gain the converted account/contact/opportunity links.
- Opportunity stages, weighted values, required lost/pause reasons, close dates, contact roles, and customer promotion on winning. Reopening preserves history and customer status.
- Applicant-controlled draft/submission/withdrawal and assigned-approver decisions. Applicants cannot approve themselves. Approved/rejected requests remain locked.
- Durable in-app notifications for assignment, participants, activity reminders and time changes, and approvals. The application checks for reminders every 30 seconds. Recipient language is remembered from CRM usage; content follows current record visibility. Delivery needs the in-app channel enabled in `config.yml` (`notification.channels`, as in `config.example.yml`); without it every queued event fails with `Notification Channel "in-app" is not enabled`, recorded on the outbox row.
- Global AI panel and a persistent action center. Every suggested mutation requires an explicit confirmation, checks current permissions, and records execution. Assumptions remain visible.
- English/Chinese labels, existing light/dark themes, business timezone/currency and options, reminder settings, account disabling and role assignment.

## Initial access

The existing single installer account is assigned the CRM system administrator preset. New accounts require a role assignment in **Settings → CRM settings → Users**. Presets are sales representative, sales manager and system administrator. Representatives can read shared sales data and edit their own; managers can manage all sales data. An applicant can delete their own draft or withdrawn approval.

Use the installed **Authorization → Permission Sets** pages to customize roles, record and field permissions. APIs enforce these independently of navigation. Disabling a user in CRM denies the CRM APIs; authentication account management remains with the authentication plugin.

## Configure AI

No model credentials are bundled. Configure an enabled LLM service using the installed AI package's settings/configuration (`config.example.yml` documents `ai.llmServices`), then select its service and model in **CRM settings → AI configuration**. Until configured, the panel reports that a model is required. Credentials belong in private server configuration, never in client code.

CRM AI reads authorized records and drafts recommendations. The current integration has no outgoing email or external company-research tool; it explains this and can prepare drafts from the available context. Model-generated dates, amounts, and identities still need review. Very large installations should replace the current complete relationship lookups and exports with server-side search/streaming; AI context is bounded to 200 recent records per object.

## Operations and deployment

Core synchronous rules run as typed domain transactions. Approval state, AI execution state, history and notification outbox are durable application tables. This avoids depending on a human-wait node absent from the installed workflow engine.

Notification outbox states are `pending`, `sending`, `submitted`, and `failed`. A crashed process can leave `sending` work requiring operator reconciliation against the notification service before retrying; it is not blindly resent. External mail/calendar integrations and automatic lead ingestion are outside this implementation.

```sh
pnpm typecheck
pnpm test
pnpm lint
pnpm build
pnpm start
```

Build targets the local platform by default. Use `pnpm build --target linux-x64 --node-version 24` (or your actual target) for deployment elsewhere. Supply production configuration separately; don't run development and production against the same SQLite database at once.

Tests cover the real SQLite schema up/down, authenticated and denied HTTP access, row and field permissions, attachments, conversion rollback, stage/customer transitions, approvals, statistics, AI confirmation boundaries, CSV and form behavior. Model responses require a configured live provider and are not validated by the offline test suite.
