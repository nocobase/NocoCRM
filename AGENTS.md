# Application Development Guidelines

This repository is a NocoBase Solution. The NocoSolution repository is cloned into `nocosolution/`, which this repository ignores: `nocosolution/guidelines/` holds the series-wide guidelines, starting with the guideline `solution-guideline.md`, and `nocosolution/NocoCRM/` holds this Solution's plans and phase documents. NocoSolution is a private, internal repository, so the clone is optional: code, builds, tests and CI never depend on it. Without access to it, `nocosolution/` does not exist, and every instruction below that refers to it is skipped.

- At the start of work, run `git pull && { if [ -e nocosolution/.git ]; then git -C nocosolution pull --ff-only || true; else GIT_TERMINAL_PROMPT=0 git clone --quiet --sparse https://github.com/nocobase/NocoSolution.git nocosolution 2>/dev/null && git -C nocosolution sparse-checkout set guidelines NocoCRM || true; fi; }`. The first run clones NocoSolution with only `guidelines/` and `NocoCRM/` checked out; later runs pull it. Without access to NocoSolution the clone fails silently and leaves nothing behind; that is expected and not an error. It is a separate repository, not a submodule, so nothing here records which of its commits is checked out. To read another Solution's documents, for cross-Solution integration, run `git -C nocosolution sparse-checkout add <OtherSolution>`; `git -C nocosolution sparse-checkout disable` restores the full tree.
- Before drafting or revising a plan, changing the skeleton, adding a temporary implementation, or designing cross-Solution integration, read the whole guideline `nocosolution/guidelines/solution-guideline.md`.
- Every other file in `nocosolution/guidelines/` states at its top what it covers and when it applies; before a task, check them and follow the ones that apply to it.
- Do not edit anything in `nocosolution/guidelines/`; in `nocosolution/`, change only `nocosolution/NocoCRM/`. When a plan departs from the guideline or needs something it does not cover, mark it in the plan as a departure from guideline section X.Y with the reason, or as a proposal for the guideline; the guideline's maintainer decides whether to update it.
- Changes to `nocosolution/NocoCRM/` are commits to NocoSolution, not to this repository: make them on a branch in `nocosolution/`, push it and merge it through a NocoSolution pull request, then switch `nocosolution/` back to `main` so the start-of-work command keeps it current. When a change here needs a document change there, open both and link each from the other.
- Never copy text from `nocosolution/` into this repository; write English documentation here instead.

This is a NocoBase 3 application. Do not apply globally installed NocoBase 2 Skills. You are building the application itself — its pages, its API, its database tables. Everything under this directory is application-owned source code that you may edit directly.

Do not create a plugin to add a feature. Plugins are separately published packages for capabilities shared across several applications; building one for this application's own feature adds a package boundary, a version, and a release process to work that belongs in `client/` and `server/`. Create one only when the user explicitly asks for a reusable published package.

The Workflow plugin is not a dependency of this application: template 1.0.0-beta.60 removed it and `server/config/workflow.ts`, and the CRM's notifications are its own code (see [the CRM server rules](.agents/rules/crm-server.md)); a database from before keeps the plugin's tables, which nothing reads. Nor is the AI Employee plugin: the CRM's AI (its assistant, follow-ups, approval reviews, task preparation and captures) is built on the Agents plugin, and `server/config/ai.ts` is the application's own section, holding the model services that plugin is given.

## Default template scope

Default is the clean application starting point. It registers product capabilities but no `app-plugin-*-example` plugins, example pages, application sample services, or sample APIs. Keep runnable demonstrations in `app-template-examples`. Application-owned business server routes start empty; Users supplies the standard Permission Set role scope. Application-owned pages include the localized homepage and inbox; prepared user/role administration modules are unregistered in the bare template and enabled as business capabilities are developed.

`database/main/` contains required permission initialization only; application-owned business migrations and seeds start empty. Do not add article history, demo seeds, or compatibility copies from Examples to this template. Existing installations retain their own executed migration sources when upgrading; see the [upgrade migration rules](.agents/skills/nocobase-app-upgrade/references/edge-cases.md#migrations).

## Keeping this file small

This file stays at most 32 KB and must not grow without bound, because every agent loads it on every start. It holds only the rules that apply everywhere and an index of where the detail lives.

- Application-specific guidance — including what a change to this application's structure, shell or conventions needs the next agent to know — goes in `.agents/rules/<topic>.md`. Update the relevant file, or add one, and add or update its entry in the [index](#index) below rather than writing the detail here.
- Framework-wide guidance lives in the synchronized Skills under `.agents/skills/`. Link to it, never copy it here; when it is wrong for every application, correct it upstream in `@nocobase/app-skills`.
- `tests/logic/agents-md.test.ts` enforces the size limit and checks that the links here and in `.agents/rules/` resolve.

## Load the development skills

`pnpm install` runs `pnpm nocobase skills sync` through the application's `postinstall` hook. If `.agents/skills/nocobase-app-development/` is missing, install dependencies from the application root; if install scripts were disabled or synchronized Skills are stale, run `pnpm nocobase skills sync` explicitly.

[`.agents/skills/nocobase-app-development/SKILL.md`](.agents/skills/nocobase-app-development/SKILL.md) holds the detailed guidance behind this file. Read it first — it routes to the reference that matches your task. Read the one page your task needs, not the whole directory.

`.agents/skills/nocobase-app-upgrade/` is a separate Skill for a separate job: merging a newer release of the template this application was generated from. Read it when the task is upgrading the template rather than building a feature — including when the user asks to upgrade NocoBase or its core version, because a newer template release is how this application moves to a newer NocoBase — and read it before touching anything — an upgrade done by copying the newest template over this application destroys the work that made it this application.

`.agents/skills/nocobase-deployment/` covers moving this application from source to a production server: building for the target platform, what the archive does and does not carry, migrations and business data, production configuration, and what to verify afterwards. Read it before building for deployment, and when an application starts in production but does not work.

## Where things go

Business code goes in these places. This is where you work, and where you should stay unless the task genuinely requires otherwise:

```text
client/routes.ts          Declare a page route
client/pages/             The page component; a folder when a page has children or files of its own
client/components/        Your components
client/components/ui/     shadcn/ui primitives; add with the CLI, never hand-write or edit
client/hooks/             Hooks shared across features
client/locales/           Every user-visible string; system/ holds the template's copy
client/service-provider.ts Client startup: services that boot with the application
server/routes/            HTTP endpoints
server/providers/         Services and their lifecycle
database/main/migrations/      Schema changes
database/main/seeds/           Required initial data
database/main/collections/     Generated Collection artifacts; regenerate, never edit
cli/commands/             Commands this application owns
tests/                    Tests; never beside the source
```

A feature with a page and an API touches five places: a migration for the table, a route in `server/routes/`, a page in `client/pages/` declared in `client/routes.ts`, navigation on the page route, and strings in `client/locales/`. A page with children or page-local helpers uses a folder with `index.tsx`; child folders mirror route paths. [Application structure](.agents/skills/nocobase-app-development/references/app-structure.md) explains how the runtime composes these pieces, where configuration and its environment variables are declared, and the runtime paths.

## Rules that apply everywhere

### Pages and routes

Declare every page in `client/routes.ts` with `defineAppRoutes()` and keep its component behind a lazy `componentLoader` whose module default-exports it. Never write the deployment base path such as `/main` into a route — the runtime restores it. `auth` controls browser navigation only and is not server security. Declare `navigation` on the route to put it in a menu, and always declare `authz` on the first page of every path; the page id identifies stored page grants, so changing it requires migrating the grants that reference it. Read [pages and routes](.agents/skills/nocobase-app-development/references/frontend/references/page.md), and [overlays](.agents/skills/nocobase-app-development/references/frontend/references/overlay.md) before implementing dialogs, drawers or close guards.

### Components and styling

Import with the package-local `#components/...` and `#extensions/...` specifiers; never add a Vite alias or TypeScript `paths` mapping for them. Use shadcn/ui: check `client/components/ui/` first and add a missing primitive with `yes n | pnpm exec shadcn add <name>` rather than writing your own. Style only with the semantic Tailwind tokens, never hard-coded colors, and keep visual consistency application-wide: change the design tokens in `client/theme/themes/*.css` rather than restyling one page. This template's components, primitives and styling details are in [.agents/rules/components.md](.agents/rules/components.md).

### Server routes and the API document

Every `/api` route follows [HTTP API design](.agents/skills/nocobase-app-development/references/http-api.md): camelCase paths, `{ data }` on success, `ApiError` on failure, input validated through `apiValidator()`, and a `describeRoute()` declaration; never write an error body by hand. **Every route owns its own security**: mounting under `/api` authenticates nothing, so install `auth.required()` and an explicit authorization check on the paths the route owns. Scope middleware to those paths, never `router.use('*', ...)`. A public webhook still verifies a signature, timestamp, or one-time state. Keep domain logic in a service under `server/providers/`. See [server routes](.agents/skills/nocobase-app-development/references/server-routes.md).

**Learn the available endpoints from the API document instead of reading route sources.** The running application serves it at `<APP_BASE_PATH>/api/swagger`, readable with a signed-in session or an `x-api-key` the user gives you; ask the user for a key rather than creating one, and fetch it again after registering a plugin or changing a Collection. See [the API document](.agents/skills/nocobase-app-development/references/http-api.md#api-documentation).

### Database

Schema changes are migrations under `database/main/migrations/`; required data is a seed under `database/main/seeds/`. **A migration is immutable history and must be self-contained**: spell out every field, index and constraint, never import an evolving definition, and write `down` as the explicit reverse. Edit an existing migration only while the branch that introduced it is unmerged; once merged, every correction is a new migration. The exported `name` must match the filename. Never edit `database/<connection>/collections/`; it is regenerated. Read [migrations and seeds](.agents/skills/nocobase-app-development/references/migrations.md), [database and data access](.agents/skills/nocobase-app-development/references/database-and-data.md) and [database connections](.agents/skills/nocobase-app-development/references/database-connections.md).

### User-facing text

Every string a user reads goes through a translation key. Write the application's copy in `client/locales/en-US.ts` and `zh-CN.ts`, never in `client/locales/system/`, which a template upgrade replaces; extend a shared group by spreading it first. To reword a plugin's string, add an `overrides` block keyed by that plugin's package name in your locale file; do not edit the plugin. See [frontend copy](.agents/skills/nocobase-app-development/references/frontend/references/i18n.md) and [internationalization](.agents/skills/nocobase-app-development/references/i18n.md).

### The command line

`pnpm nocobase <topic> <command>` runs this application's CLI; only `pnpm dev`, `pnpm build`, `pnpm start` and the quality scripts are scripts. Read [the command line](.agents/skills/nocobase-app-development/references/cli.md) before running a command: `db reset`, `db rollback`, `db redo` and `db repair` refuse to run without `--force` outside a terminal, and that refusal is not something to work around. Commands this application owns live in `cli/commands/`; see [adding an application command](.agents/skills/nocobase-app-development/references/commands.md).

### Dependencies

Put a package your **server** code (`server/`, `database/`, `cli/`) imports in `dependencies`, and everything your **client** code imports — along with build tooling, tests, and type-only imports — in `devDependencies`. Keep `@nocobase/db` in `dependencies` alongside the database driver. Remove a direct `@nocobase/*` dependency only with `pnpm nocobase package remove` after reviewing its usage. See [where to declare a dependency](.agents/skills/nocobase-app-development/references/dependencies.md).

### Plugins

**Read a plugin's Skill before building what it already does.** Building a permission system, a notification sender, or a job scheduler by hand when a registered plugin already provides one is the most expensive mistake available here. Register and update plugins with `pnpm nocobase plugin register` and `pnpm nocobase plugin update`; customize a plugin's page through its options, a source extension or `client/route-overrides.ts`, never by redeclaring its route. `.agents/skills/` is generated output; never edit a file there. See [plugins](.agents/skills/nocobase-app-development/references/plugins.md).

### Running the application

When reporting or opening this application's address, use the `Local:` URL printed by `pnpm dev`, including the application base path, and never infer it from defaults or Vite's port. See [the development server](.agents/skills/nocobase-app-development/references/dev-server.md) for restarts, file watching and developing against another backend.

### Before you finish

Scope all verification — formatting, lint, type checking, tests, builds and runtime checks — to the affected files, projects, or packages and their affected consumers. Do not run full-application or workspace-wide checks, or an aggregate `pnpm check`, as a routine step after each edit. Documentation-only changes need formatting and link checks for the changed documents, not type checking, runtime tests, or builds. Report which checks ran, their scope, and any unverified behavior.

Add tests for what you changed — a route's authenticated, unauthenticated, and unauthorized responses; a migration's `up` and `down` against a real database; a page's actual behavior — in `tests/`, never beside the source; browser tests go in `tests/playwright/`. Start page tests from `tests/components/page-harness.test.tsx`, which keeps application hooks real and supplies external responses through the test fixture. See [testing and verification](.agents/skills/nocobase-app-development/references/testing.md).

For any UI work, start with [the frontend workflow](.agents/skills/nocobase-app-development/references/frontend/ui-workflow.md), which decides the workflow and routes to the styling rules, the theme token contract and the rest.

## Changing the framework structure

`client/routing/`, `client/layouts/`, `client/theme/`, the server entry points, the `package.json` scripts that call `nocobase`, and the tsconfigs are the scaffolding the template provides. It is still this application's own source — it shipped to the user and they may change it — but it is the part the template evolves, so an edit there is what a future upgrade has to reconcile.

Prefer the mechanism the system already provides. Declare a page in `client/routes.ts` and add `navigation` when it needs a menu entry; pages load data through `useApiClient`. A page uses `authz` to restrict access; a plugin page is customized through an option or an override. Before editing the shell to add a menu, check the route and its `navigation` declaration.

When the built-in mechanism genuinely cannot express what is being asked, changing this structure is a legitimate answer — not a last resort to apologize for. Do it deliberately, and leave the next agent enough to work with:

- Comment what you changed and why the built-in path did not fit. On upgrade, an agent reconciling the template's version needs to know whether your change is still needed.
- Record what the next agent needs to know in the matching `.agents/rules/` file, or a new one linked from the index below, so the guidance describes the application as it actually is without growing this file. If the framework's shared guidance is wrong for every application, update the source `@nocobase/app-skills` package instead of editing its synchronized copy.

## Index

| Read                                                                               | When                                                                                                                                        |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| [.agents/rules/components.md](.agents/rules/components.md)                         | Adding or changing a component, a shadcn primitive, a UI Library item, or the visual design                                                 |
| [.agents/rules/shell.md](.agents/rules/shell.md)                                   | Changing layouts, the header, sidebar, breadcrumbs, the account menu or loading indicators                                                  |
| [.agents/rules/build-and-deploy.md](.agents/rules/build-and-deploy.md)             | Changing the build, packing a deployment, `CDN_BASE_URL`, or building for another platform                                                  |
| [.agents/rules/crm-overview.md](.agents/rules/crm-overview.md)                     | Any change to NocoCRM: specification, languages, navigation and settings, record links, conventions                                         |
| [.agents/rules/crm-look.md](.agents/rules/crm-look.md)                             | The CRM's colours, theme presets, tags, status colours, record forms, date and time inputs                                                  |
| [.agents/rules/crm-record-pages.md](.agents/rules/crm-record-pages.md)             | A record's page or drawer, its particulars, the timeline, comments, change history                                                          |
| [.agents/rules/crm-tasks.md](.agents/rules/crm-tasks.md)                           | Tasks, the task list and calendar, reminders, what counts as contact                                                                        |
| [.agents/rules/crm-inbox-and-overview.md](.agents/rules/crm-inbox-and-overview.md) | The inbox, AI suggestions, notifications, the overview, reports, menu counts                                                                |
| [.agents/rules/crm-assistant.md](.agents/rules/crm-assistant.md)                   | The assistant, its dock and panel, conversations, business guidance, plans, agents calling the CRM                                          |
| [.agents/rules/crm-ai-follow-ups.md](.agents/rules/crm-ai-follow-ups.md)           | Lead and deal follow-ups, approval review, task preparation, the background model                                                           |
| [.agents/rules/crm-agents-and-search.md](.agents/rules/crm-agents-and-search.md)   | The Agent work page and its switches, the global search                                                                                     |
| [.agents/rules/crm-capture-and-merge.md](.agents/rules/crm-capture-and-merge.md)   | AI capture of leads, opportunities and companies, duplicate leads and merging                                                               |
| [.agents/rules/crm-mail.md](.agents/rules/crm-mail.md)                             | Mailbox pages, a record's Mail tab, sending mail, mail in follow-ups                                                                        |
| [.agents/rules/crm-permissions.md](.agents/rules/crm-permissions.md)               | Roles, permission sets, resources, page grants, capabilities                                                                                |
| [.agents/rules/crm-server.md](.agents/rules/crm-server.md)                         | HTTP routes and errors, migrations, PostgreSQL and MySQL, model services, notifications, attachments, titles, approval lifecycle, approvers |
| [.agents/rules/crm-demo.md](.agents/rules/crm-demo.md)                             | The demo dataset, its mail, import and removal, the demo banner                                                                             |
| [.agents/rules/crm-signals.md](.agents/rules/crm-signals.md)                       | Company signals: the web search, the daily check, the Signals tab, signal notices and timeline lines                                        |
| [.agents/rules/crm-whatsapp.md](.agents/rules/crm-whatsapp.md)                     | WhatsApp: the webhook, conversations, a record's WhatsApp tab and timeline lines, what follow-ups read, its settings                        |

## Visible and manageable role assignments

Assign business roles to explicitly identified users through Settings → Users, where the CRM shows and changes each person's roles. Never seed a business permission set onto `authenticated:*`, broaden the inherited platform `member` role, or write startup reconciliation that grants access to everyone merely to make a feature usable. Unchecked actions in one role do not revoke grants inherited from another. If the user explicitly requests a global default role, first deliver a permission-protected administration control that shows its recipients and allows changing or removing the assignment; show inherited roles and their source in user access details. Without that UI, use explicit user assignments and explain the limitation. Keep page access independent from business operations.

Run `pnpm exec vitest run tests/logic/authorization-assignment-safety.test.ts` after permission initialization changes and before delivery. It boots the real application on an isolated database and inspects initialized wildcard assignments and the inherited member role. An intentional global default requires explicit user authorization, a working administration surface and corresponding acceptance tests before deliberately updating the expected baseline; do not delete, skip or loosen the guard to make tests pass. Test an ordinary user with only the configured role: inspect all effective grant sources and verify both hidden buttons and rejected direct API calls.
