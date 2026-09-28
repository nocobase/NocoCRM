# NocoCRM

A CRM built as a NocoBase 3 application: leads, accounts, contacts, opportunities, activities, approvals, a team workspace, in-app notifications, and an AI assistant that reads the records a user may see and proposes changes as confirmable action cards. The server runs on `@nocobase/app-server` and the browser client is React with Refine, shadcn/ui, and Tailwind CSS.

`SPEC.md` is the product specification the application implements. Everything in this directory is application-owned source code: pages, API routes, database tables, and business logic live here, not in a plugin.

## Getting started

Use Node 24 or later and the pnpm version pinned in `package.json`. Configure the application, then start the development server:

```bash
pnpm install
pnpm config:init
pnpm config:check
pnpm dev
```

`pnpm config:init` writes `config.yml` from `config.example.yml`, keeping its comments and filling in `auth.secret` and `session.secret`. It is only needed once; `pnpm dev` and `pnpm start` refuse to run until it has been. `pnpm config:check` loads the configuration the way a start would, connects to any database other than SQLite, and reports what would stop the application from starting or quietly misbehave.

`pnpm dev` starts the API server and the Vite client together, picks free ports if the defaults are taken, and prints the URL to open, `http://127.0.0.1:13000/main/` by default. Use the printed URL rather than assuming a port; `APP_SERVER_PORT` moves the server when the default is taken by something else. Keep the terminal running; `Ctrl+C` stops the development server.

The database is `storage/crm.sqlite` and uploads use the configured local drive. Run only one development instance against that file at a time, and back up the database and uploads together. Pending migrations are applied on startup; `pnpm db:apply` applies them without restarting. Applied migration files are checksummed, so never reformat them.

The interface follows the browser language on a first visit and remembers whatever language the visitor picks in the account menu. The server's own default and fallback language is English; set `i18n.defaultLocale` in `config.yml` to change it, as shown in `config.example.yml`.

### Accounts and roles

Accounts are created, disabled, given new passwords, and assigned their CRM role by an administrator in **Settings → Users**; there is no self-registration (the sign-up endpoint is disabled) and no forgot-password link on the login page, since passwords are reset there by the administrator. The installer account holds the administrator role, which is the authorization plugin's own **System administrator** (root) set. Every other account needs a role before it can use the CRM, and each user holds exactly one:

| Role          | What it can do                                                                                      |
| ------------- | --------------------------------------------------------------------------------------------------- |
| Administrator | Configures the CRM and sees everything, but owns no records and never acts as an approver           |
| Sales manager | Manages all sales data, assigns owners, approves requests, exports; deletes only records it created |
| Salesperson   | Reads shared sales data, edits and deletes its own records, raises approvals; cannot export         |

Disabling a user ends their sign-in, and they stop being offered as an owner or approver. The last administrator can neither be disabled nor lose the role. The three roles are permission sets of the authorization plugin, shown in full on **Settings → Permission Sets**: every object with its view, create, edit and delete operations and their record scopes (all records, records I own, records I created), the assign, approve and export capabilities under Administration, and the pages a role may enter. The table above is the initial configuration; an administrator can change a role's operations and scopes there, and the APIs enforce the result independently of navigation. What each operation does, and which scopes it offers, is defined in code.

### Demo data

**Settings → System settings → Demo data** imports a Chinese dataset for a fictional consulting firm (云策数字咨询): related leads, accounts, contacts, opportunities across six months, activities including some due today, and approvals raised by their applicants. Dates are relative to the day of the import, in the business time zone. The import creates the demo accounts when they do not exist and gives each its role; the password is the username followed by `123`, such as `liming123`. The administrator who runs the import owns nothing:

| Username                                     | Name                   | Role          |
| -------------------------------------------- | ---------------------- | ------------- |
| `liming`, `zhaomin`                          | 李明, 赵敏             | Sales manager |
| `wangxiaofang`, `chenxiaohao`, `liuxiaoyang` | 王小芳, 陈小浩, 刘小洋 | Salesperson   |

The import runs once; **Remove demo data** on the same page deletes exactly the records it created, using the manifest it keeps in the settings table, and leaves the accounts and anything created by hand. The server side lives in `server/providers/crm/demo.ts`.

### Configure AI

No model credentials are bundled. Declare an LLM service under `ai.llmServices` in `config.yml` (`config.example.yml` shows the shape, with the API key read from an environment variable); the AI Employee plugin lists it under **Settings → AI Employees → LLM services**, and the **Enabled** switch of the NocoCRM employee on its **Settings → AI Employees** page shows or hides the assistant: the header button, the page shortcuts and the panel.

The assistant is the plugin's chat talking to the CRM's own employee, NocoCRM (**Settings → AI Employees**, where its role, including the deployment's business guidance, is visible read-only). It reads authorized records through tools, counts and totals them for analysis, builds reports with charts that the user previews, downloads as HTML or prints to PDF, and proposes creates, updates, deletions, lead conversions and approval actions as confirmation cards in the conversation; nothing is written until the user confirms a card, and every write runs as that user through the same service the pages use, so a change they could not make in the UI is refused and the reason shown. Model-generated dates, amounts and identities still need review.

### Notifications

In-app notifications for assignments, activity participation, activity reminders, and approvals are queued in an outbox and delivered every 30 seconds. Delivery needs an in-app Channel named `inbox` under `notification.channels` in `config.yml` (`inbox: { provider: in-app }`, as in `config.example.yml`); without it every queued event fails with the notification service's unknown-Channel error, recorded on the outbox row. Outbox states are `pending`, `sending`, `submitted`, and `failed`. A crashed process can leave `sending` rows that an operator reconciles against the notification service before retrying; they are not blindly resent.

### Review your configuration

`pnpm config:init` wrote `config.yml` from `config.example.yml`, with `auth.secret` and `session.secret` filled in. It gets you running on SQLite; adjust it for your situation:

- **Database.** SQLite needs no server and works as it is. Another one means installing its driver first — `pnpm add @nocobase/db-postgres`, and `pnpm remove @nocobase/db-sqlite` if nothing else uses SQLite — then `pnpm config:init --dialect postgres --force` to rewrite the connection, and `pnpm config:set` for its settings, with `--from-env` for the password so it stays out of the shell history. Which dialects the application can run on is decided by what it depends on, not by this file: a driver it does not have cannot be introduced from here.
- **Change a value** with `pnpm config:set key=value`, which keeps the comments and refuses a section the application does not know. Values that differ per machine — `APP_SERVER_PORT`, `APP_SERVER_HOST`, `APP_PUBLIC_ORIGIN` — are better set in the environment, which is applied over this file; `config:set` says when an environment variable overrides what it wrote.
- **Where the application is served.** `APP_BASE_PATH` is the public mount path, `/main` by default, so the development URL looks like `http://127.0.0.1:13000/main/`. `APP_SERVER_PORT` and `APP_SERVER_HOST` change what the server binds to.
- **Anything a feature you enable requires** — AI services, mail delivery, IM webhooks, storage. `config.example.yml` documents every available option, including sections your `config.yml` does not yet have.

`config.yml` is gitignored because it holds your `auth.secret` and API keys. Deploy it through your secret management rather than committing it.

To run against a production build instead:

```bash
pnpm build
pnpm start
```

Build targets the local platform by default; use `pnpm build --target linux-x64 --node-version 24` (or your actual target) for deployment elsewhere, as described under [Deploying to a different machine](#deploying-to-a-different-machine). Supply production configuration separately and never run development and production against the same SQLite database at once. External mail and calendar integrations and automatic lead ingestion are outside this implementation.

## Container image and GitHub Actions

### Run the published image with Compose

The [playground](playground/README.md) contains `docker-compose.yml`, an editable `config.yml`, and `.env.example` for running the published image with SQLite and a persistent volume. Its configuration is separate from the application's root files; Compose mounts `playground/config.yml` read-only and injects secrets from `playground/.env`.

```bash
cd playground
cp -n .env.example .env
openssl rand -hex 32
openssl rand -hex 32
# Edit .env and fill in AUTH_SECRET and SESSION_SECRET before continuing.
docker compose config --quiet
docker compose pull
docker compose up -d --wait
docker compose logs -f app
```

Open `http://localhost:13000/main/`. See the [playground instructions](playground/README.md) for registry login, configuration, updates, and data persistence.

### Build and publish

`.github/workflows/docker.yml` builds a `linux/amd64` image for pull requests to `main`, pushes to `main`, `v*` tags, and manual runs. Every image must pass a container smoke test covering startup on a fresh SQLite database, the health endpoint, rejection of anonymous CRM API requests, client JavaScript and CSS, and shutdown. Only successful builds on `main` or a `v*` tag are published to `ghcr.io/nocobase/nococrm`; other manual runs and pull requests only validate the image.

Published images have a `sha-<full-commit-sha>` tag. Builds from `main` also update `latest`; release tags retain their Git name, such as `v1.0.0`. Publishing uses the repository's `GITHUB_TOKEN` with `packages: write`, so no registry password or SSH key is needed. The organization must allow Actions to publish packages; an existing package must grant this repository write access.

The Dockerfile configures `@nocobase:registry=https://npm.nocobase.ai/`, then runs `pnpm install --frozen-lockfile` and `pnpm build` in a Node 24 Debian build stage. The same registry configuration applies when the build installs production dependencies inside `dist`. The runtime stage contains Node, pnpm, and the complete `/app/dist`, including production dependencies, and runs `pnpm start` as the `node` user. Both stages use the same Node version and Debian release for native module compatibility. Keep the `dist` directory name because the runtime uses it to locate client assets. The build's production dependency installation currently resolves transitive dependencies without a lockfile; deployment reproducibility is limited by that existing behavior.

The container build also prepares plugin database tasks for this version of the runtime: it verifies the compiled JavaScript exists, then removes TypeScript task directories that would otherwise take precedence inside the deployment's dependencies. Development dependencies and migration source files in this checkout are unchanged.

Build and verify locally:

```bash
docker build --platform linux/amd64 -t nococrm:local .
node e2e/docker-smoke.mjs nococrm:local
```

The smoke test uses a disposable container and temporary secrets; it never mounts the application's local database or configuration. Production configuration is supplied at runtime. Create `config.yml` from `config.example.yml`, set unique authentication and session secrets, and run:

```bash
docker run --detach --name nococrm \
  --publish 13000:13000 \
  --mount type=bind,src="$(pwd)/config.yml",dst=/app/config.yml,readonly \
  --mount type=volume,src=nococrm-storage,dst=/app/storage \
  --env APP_CONFIG_FILE=/app/config.yml \
  --env APP_PUBLIC_ORIGIN=https://apps.example.com \
  nococrm:local
```

Use the actual public origin and configure HTTPS at the reverse proxy. The container listens on `0.0.0.0:13000` and defaults to the `/main` mount path. To use another mount path, build with `--build-arg APP_BASE_PATH=/crm`; the image uses that value for both the client build and server runtime. Do not change only the runtime path. Configuration must be readable, and storage writable, by the image's `node` user (UID 1000). Keep the storage volume across container replacements; it holds the default SQLite database, uploaded files, sessions, logs and workflow artifacts. Storage sits one level above the compiled code at `/app/storage`, so replacing the image never touches it.

`.dockerignore` excludes local environment files, credentials, configuration, database files, and storage from the build context. Do not put production secrets into build arguments or the image. `pnpm build` already installs the production dependencies inside `dist`; the runtime disables pnpm's automatic dependency check/install before scripts so `pnpm start` runs this packaged tree without reinstalling it. It also enables pnpm's built-in shell so container stop signals reach the server without an intermediate `/bin/sh`.

## Project structure

```text
client/                  Browser application
├── routes.ts            Your page routes
├── pages/               Your page components
├── components/          Your components
│   └── ui/              shadcn/ui primitives
├── layouts/             App, Settings and Dev layouts
│   └── components/      Layout containers, navigation, branding and account controls
├── routing/             Route rendering, access checks, loading and error UI
├── locales/             Your translated strings
├── theme/               App-wide theme and light/dark selector
├── extensions/          Application-owned copies of plugin-published UI
├── plugins.ts           Which plugins the browser loads
├── react-providers.ts   Your React context providers
├── service-provider.ts  Your client startup logic
└── runtime.ts           Composition root tying the above together

server/                  API server
├── routes/              Your HTTP endpoints
├── providers/           Your services and their lifecycle
├── config/              Application configuration composition
├── plugins.ts           Which plugins the server loads
├── app.ts               Application assembly
├── runtime.ts           Composition root
├── standalone.ts        Node entry point
└── embedded.ts          Entry point when a host process mounts it

database/
└── main/
    ├── migrations/      CRM schema history; applied files are checksummed, never reformat them
    └── seeds/           Required initial data

tests/                   Unit and integration tests
e2e/                     Browser tests needing a real server
storage/                 SQLite database and uploads; gitignored
config.yml               Your configuration, written by pnpm config:init; gitignored
config.example.yml       Documented configuration template
SPEC.md                  Product specification the CRM implements
```

The three files named `runtime.ts`, `plugins.ts`, and `routes.ts` are composition roots: they list what the application is made of. Reading them tells you what is loaded and in what order.

## Scripts

### Everyday development

| Script             | What it does                                                                         |
| ------------------ | ------------------------------------------------------------------------------------ |
| `pnpm dev`         | Start the API server and client with hot reload                                      |
| `pnpm build`       | Build the client and server into `dist/`                                             |
| `pnpm start`       | Run the built server; requires `pnpm build` first                                    |
| `pnpm build --tar` | Build, then pack `dist/` and `config.example.yml` into `storage/exports/dist.tar.gz` |

### Database

| Script                      | What it does                                                                                                                                                                                        |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm db:apply`             | Apply pending migrations from your `database/main/migrations/` and from every registered plugin, then pending seeds from `database/main/seeds/` and from those plugins                              |
| `pnpm db:reset`             | Destructive: drop every managed schema object, then rerun all migrations and seeds from empty; asks first, and needs `--force` in CI                                                                |
| `pnpm db:repair`            | Realign recorded migration and seed checksums with the current sources; `--dry-run` reports without writing                                                                                         |
| `pnpm collections:generate` | Write `collection.json`, `metadata.json` and `schema.json` for every Collection under `database/<connection>/collections/`, plus a `_manifest.json`; `--check` fails when the files are out of date |

Migrations and seeds also run automatically on startup while `database.connections.main.migrations.autoRun` is `true` in `config.yml`. Run `pnpm db:apply` explicitly when you want to apply a change without restarting. Both halves run only what is pending, so running it on an already-migrated database applies seeds alone.

Database tasks support `--connection <name>` and `--all`; no argument targets `database.default`. Per-connection source and upgrade rules are documented in [migrations and seeds](.agents/skills/nocobase-app-development/references/migrations.md).

### Checks

| Script               | What it does                                                 |
| -------------------- | ------------------------------------------------------------ |
| `pnpm test`          | Run the test suite once                                      |
| `pnpm test:watch`    | Re-run tests as files change                                 |
| `pnpm test:coverage` | Run tests and write a coverage report                        |
| `pnpm typecheck`     | Typecheck the client, tooling, and server                    |
| `pnpm lint`          | Report lint problems                                         |
| `pnpm fix`           | Fix lint problems, then format                               |
| `pnpm check`         | Everything above plus a build; what to run before committing |

`pnpm nocobase app i18n:check` reports a language declared in `client/locales/` but not `server/locales/`, or the reverse, and exits nonzero until the lists align. The browser builds its language picker from the client list, so a client-only language still works in the interface; server messages fall back to English and the language control explains that fallback. Add the matching server locale when server-produced text should use the same language.

### Plugins

Plugins add features to your application. Let these commands edit `package.json`, `client/plugins.ts`, and `server/plugins.ts` for you rather than editing those files by hand.

| Script                          | What it does                                                |
| ------------------------------- | ----------------------------------------------------------- |
| `pnpm plugin:register <name>`   | Install a plugin and wire it into the client and server     |
| `pnpm plugin:unregister <name>` | Remove a plugin and its wiring                              |
| `pnpm plugin:update [name]`     | Upgrade one or all registered plugins and re-sync skills    |
| `pnpm plugin:inspect <name>`    | Report a plugin's registration state; read-only             |
| `pnpm package:remove <name>`    | Remove a direct NocoBase package and its synchronized Skill |
| `pnpm skills:sync`              | Sync direct NocoBase package Skills into `.agents/skills/`  |

`pnpm install` automatically runs `pnpm skills:sync` through the application's `postinstall` hook. Run `pnpm skills:sync` manually when install scripts were disabled or Skills need refreshing. The CLI retains `nocobase plugin skills sync` for older applications, but new templates do not provide a separate script alias.

Use a full package name, as with `plugin:register` and `plugin:unregister`; short names such as `authentication` also work. The optional name is a positional argument, not `--plugin`.

```bash
pnpm plugin:update @nocobase/app-plugin-authentication  # Update one registered plugin
pnpm plugin:update authentication                      # Equivalent short name
pnpm plugin:update                                     # Update all registered plugins
pnpm plugin:update @nocobase/app-plugin-authentication --dry-run  # Preview only
```

Without a name, the command collects registered plugins from `client/plugins.ts`, `server/plugins.ts`, and `cli/plugins.ts`. It uses the application's package manager; with pnpm, `update` follows the declared version ranges without `--latest`. An unregistered name is rejected, and an application with no registered plugins is left unchanged. After a successful package update, all registered plugins' agent skills are re-synchronized, even when only one package was selected.

Ordering in `client/plugins.ts` and `server/plugins.ts` is contribution order, and a plugin is enabled by appearing in the array. Reorder entries or pass a plugin its options by hand; leave adding and removing entries to the commands.

### Removing a NocoBase package

Before removing a direct `@nocobase/*` dependency, search the application's imports, plugin registrations, routes, services, configuration keys, tests, and build scripts for references to it. Migrate or remove those references first. The removal command updates package metadata and synchronized Skills; it does not rewrite application source or configuration and cannot decide whether the capability is still required.

```bash
pnpm package:remove @nocobase/example
pnpm package:remove @nocobase/example --dry-run
pnpm package:remove @nocobase/example --json
```

For an ordinary package, the command uses the application's package manager to remove the dependency and update both `package.json` and the lockfile, then removes only the Skill directories recorded as owned by that package. For an `@nocobase/app-plugin-*` package, it reuses the `plugin:unregister` workflow so Client, Server, and CLI registrations are removed together with the dependency and its Skills. `pnpm plugin:unregister <name>` remains available when the task is specifically expressed as unregistering a plugin.

An older application with the new CLI but without the script can run `pnpm nocobase package remove @nocobase/example`. If the installed CLI does not provide `package remove`, update `@nocobase/nb3-cli` first; as a compatibility fallback on a version that already provides `skills:sync`, remove the dependency with the package manager and then run `pnpm skills:sync`. With the current CLI, after an interrupted or manual removal, make sure the manifest no longer declares the package and run a full `pnpm skills:sync` to reconcile stale package-owned output. Passing a package already absent from the manifest to `package:remove` can clean its recorded historical Skill ownership without uninstalling any other package.

### Diagnostics

| Script                      | What it does                                                                                |
| --------------------------- | ------------------------------------------------------------------------------------------- |
| `pnpm server:deps:retarget` | Replace native binaries with the target platform's; part of `pnpm build`                    |
| `pnpm server:deps:verify`   | Check that everything your server and CLI import reaches a deployment; part of `pnpm build` |

#### Deploying to a different machine

`pnpm build` produces `dist/`, which is the whole deployment: copy it to a server and run it. The build already ran `pnpm install --prod` inside `dist/`, so the tree ships with its `node_modules` and needs no install step on the server. It also keeps its own `package.json`, so `pnpm install --prod` run inside `dist/` on the server reinstalls exactly the same set: useful when `node_modules` was left out of a copy, never required after a normal build.

Client packages are not among them. Plugins declare what their browser code needs as peer dependencies, so your application installs one shared copy for its Vite build, while `dist/` opts out of peer installation entirely — `lucide-react`, `@base-ui/react`, `sonner` and the rest never reach a server that has no browser in it.

**The build targets the machine you run it on**, so `pnpm build && pnpm start` works. Deploying elsewhere means saying where:

```bash
pnpm build --help                                 # all build options
pnpm build                                        # this machine
pnpm build --target linux-x64                     # most Linux servers
pnpm build --target linux-arm64                   # ARM servers, Graviton
pnpm build --target linux-x64-musl                # Alpine, and most slim container images
pnpm build --target linux-x64 --node-version 24   # explicitly target Node 24
```

A `.node` binary is compiled for one platform, architecture, C library, and Node version at once, so a build made on a Mac installs binaries a Linux server cannot load. `--target` sets platform, architecture, and C library together, because they are chosen together: `linux-x64` and `linux-x64-musl` are different binaries, and Alpine needs the musl one. If you are unsure, `ldd --version` on the server prints `musl` for musl and `GNU libc` otherwise.

`--node-version` takes the major version your server runs, separately, because the same Linux host may run any of several. The binary retargeter knows ABI mappings for 20, 22, 24, and 26; the application itself requires Node >=24.

`pnpm build --help` (or `-h`) lists build options and exits without loading build dependencies, running hooks, or modifying `dist/`. Every successful build records `nocobase.buildTarget` in `dist/package.json`, including builds with no native modules: `platform`, `arch`, `libc`, `nodeMajor`, and `nodeAbi`. Use `libc` only for Linux; its value on other platforms is a compatibility placeholder. Deployment checks should compare these fields with the host runtime and also respect `engines.node`. With `--target current` (the default), the Node version and ABI come from the running process; an explicit platform target defaults to Node 24 unless `--node-version` is supplied.

For example, `pnpm build --target linux-x64 --node-version 24` produces:

```json
{
  "nocobase": {
    "buildTarget": {
      "platform": "linux",
      "arch": "x64",
      "libc": "glibc",
      "nodeMajor": 24,
      "nodeAbi": 137
    }
  }
}
```

`nodeMajor` describes the target runtime, not the Node version used to run the build. No target patch version is implied. These fields provide platform and Node ABI checks for Hub deployment; they do not describe system libraries, CPU instruction requirements, or other runtime prerequisites.

If your application has no native modules — `pg`, `mysql2`, and `tedious` are all plain JavaScript — no platform-specific binaries need retargeting. The build still records the selected target, and the deployment runtime must satisfy `engines.node`.

#### Packing the build

`pnpm build --tar` writes `storage/exports/dist.tar.gz`, the artifact you upload to a Hub to deploy this application.

The archive has two levels: `config.example.yml` and `dist/` sit at the root, and the build is inside `dist/`. What `dist/` holds varies with the application; this is the shape:

```text
dist.tar.gz
├── config.example.yml
└── dist/
    ├── cli/
    ├── client/
    ├── node_modules/
    ├── server/
    ├── package.json
    └── pnpm-workspace.yaml
```

Combine it with `--target` when the archive is for another machine:

```bash
pnpm build --target linux-x64 --tar
```

#### Adding a dependency

Where a package goes depends on which half of your application imports it.

| Imported from                     | Declare it in     |
| --------------------------------- | ----------------- |
| `server/`, `database/`, or `cli/` | `dependencies`    |
| `client/`, build tooling, tests   | `devDependencies` |

`dist/package.json` is generated from `dependencies` and is what a server installs, so a package in `devDependencies` is missing there however well it works locally. Client packages need nothing at runtime — Vite resolves and inlines them into `dist/client` while building.

Plugins' browser packages need nothing from you: a plugin declares those as peer dependencies, so installing the plugin brings one shared copy into your application, and `dist/` never installs them.

`pnpm build` verifies the server half and fails the build if something is missing, naming the package. One case it cannot check is an import whose name is assembled while the program runs:

```ts
await import(`${name}/index.js`);
```

Nothing can tell in advance which package that names, so declare it in `dependencies` when you write the code.

#### When the build or the deployment goes wrong

**`Cannot find module` on the server, but it runs locally.** The package is in `devDependencies`, which `dist/package.json` is not generated from. Move it to `dependencies` and rebuild.

**A browser package fails to resolve while building your application.** A plugin declares it as a peer dependency and something has to provide it. Add it to your `devDependencies`.

**`Error loading shared library`, `invalid ELF header`, or a bare reference to a `.node` file at startup.** The binary does not match the server. Compare what the build targeted against the server:

```bash
node -e "console.log(require('./dist/package.json').nocobase.buildTarget)"
node -p "process.platform + '-' + process.arch"   # on the server
node -p "process.versions.modules"                # on the server: the ABI
```

Rebuild with a matching `--target` and `--node-version`. ABI 115 is Node 20, 127 is Node 22, 137 is Node 24, 147 is Node 26.

**`no prebuilt binary for <target>` during the build.** The package publishes no build for that combination. Check whether the version you depend on supports the target, and whether a musl build exists if you asked for one — musl coverage is thinner than glibc.

## Strict startup verification

Set `NOCOBASE_STRICT_STARTUP=true` when running `pnpm dev` or `pnpm start` in automated verification. Startup failures, including job import failures, exit nonzero after resource cleanup. Strict dev runs the server without watch mode so a failed server cannot remain hidden behind a watcher; restart the command after server or configuration changes. Client HMR remains available. Omit the variable or set it to `false` for normal development with server hot reload. Request errors and individual job execution failures do not terminate the application.

## Configuration

`server/config/` and `client/config/` contain editable TypeScript defaults. `config.yml` holds environment-specific overrides, written by `pnpm config:init` and yours to edit from there. It is gitignored because it carries your `auth.secret`; deploy it through your secret management rather than committing it. It is generated from `config.example.yml`, which is kept beside it as the reference for every option.

Two settings decide where the application is reachable:

- `APP_BASE_PATH` is the public path the application is mounted at, `/main` by default. The browser API base URL is derived from it as `<APP_BASE_PATH>/api`.
- `APP_PUBLIC_ORIGIN` is the external origin used to build callback and redirect URLs. Set it in production. It must not repeat the base path — the runtime joins the two.

Configuration is resolved from the file, environment variables, and defaults in that order of precedence.

## Testing

Tests live in `tests/`, never beside the source they cover. Put logic and integration tests under `tests/logic/` and component tests under `tests/components/`. Tests needing a real server, real authentication, or a real database belong in `e2e/`.

### AI server end-to-end testing

`pnpm test:e2e` discovers the source workspace’s optional AI server test and skips it unless `AI_LOCAL_E2E=1`. Build first and use a dedicated, installed test application database with a configured LLM service and an API key belonging to a test user. Set `AI_E2E_LLM_SERVICE`, `AI_E2E_MODEL`, and `AI_E2E_API_KEY`; `AI_E2E_EMPLOYEE` defaults to `viz`. The test starts the compiled local server, makes a real model request, and removes its conversation afterward. Never point it at production data. Generated applications ship the Playwright configuration but no template tests, so an empty run succeeds.

### Notification testing

After signing in with the `notification:test` `send` permission, use the
notification logs settings page to send a real message through the durable
Notification Manager. The form is generated from safe Channel test metadata;
Email tests require an address and IM tests use the configured logical target.
The button remains visible so configuration problems are discoverable. The
server enforces the `notification:test` `send` permission only when the message
is submitted.

## Working with an AI agent

`AGENTS.md` describes how to build features here, and `.agents/skills/` contains package-owned guidance generated by `pnpm skills:sync`. If you use Claude Code, `CLAUDE.md` points at the same guidance. Keep application-specific rules in committed `AGENTS.md` files because synchronization replaces package-owned Skill directories.

## License

MIT

## Publish to an application Hub

### Create a publishing key

`HUB_API_KEY` is a Hub publishing key, created in Hub rather than in this application. Open **API Keys** in the Hub navigation (`<HUB_URL>/api-keys`); reaching that page requires `hub.app / manage-api-keys`, granted to `hub-administrator` and `hub-operator` by default. In **Create API Key**, select this application under **Applications**, or **All applications (including future apps)**, then grant the permissions the commands below need: **Upload release** for `pnpm run upload`, and both **Upload release** and **Deploy release** for `pnpm run upload --deploy` or `pnpm run deploy`.

The plaintext key is shown once at creation; while the key stays active its creator can copy it again from the same page. Bound applications and granted permissions cannot be changed afterwards, so a key created without `Deploy release` has to be deleted and recreated rather than edited. A key never exceeds its creator's current permissions, so uploads fail if the creator later loses access to the bound application. See [Publish applications with Hub](https://docs.nocobase.com/deployment/hub-publishing) for the console walkthrough.

### Upload and deploy

The Default template includes `upload` and `deploy` scripts. Run `pnpm run upload` or `pnpm run deploy` from the App root; these forward all arguments to the `app upload` and `app deploy` commands of the application's own CLI, respectively. Use `pnpm run deploy` explicitly because `pnpm deploy` is also a pnpm built-in command. Existing applications need to add these scripts if they already have the publishing CLI but predate the shortcuts.

```bash
pnpm run upload
pnpm run upload --deploy --json
pnpm run upload --deploy --no-wait --json
pnpm run deploy --release-id <releaseId> --json
```

Build with `pnpm build --tar`, then run `pnpm nocobase app upload`. Set `HUB_URL` (including the Hub mount path, such as `https://hub.example/main`), `HUB_APP_ID`, and `HUB_API_KEY`, or supply the corresponding `--hub`, `--app-id`, and `--api-key` flags. Prefer environment variables for secrets.

Both commands read `HUB_URL`, `HUB_APP_ID`, and `HUB_API_KEY` from the App root `.env` as defaults. Precedence is command flags > process environment (terminal or CI) > `.env`, resolved separately for each value. The file is optional, supports quoted values and comments, and does not modify the process environment. Only `.env` is loaded; `.env.local` and mode-specific files are not loaded. Keep `.env` out of version control because it contains credentials.

```dotenv
HUB_URL=http://127.0.0.1:13000/main
HUB_APP_ID=crm
HUB_API_KEY=your-publishing-key
```

Use `app upload --deploy --json` to upload and deploy, or omit `--deploy` to upload only. Hub has no automatic/manual deployment setting; scripts decide which commands to run. `--file` defaults to `storage/exports/dist.tar.gz`; `--timeout` defaults to 600 seconds. `app deploy --release-id <id> --json` deploys an existing Release. Uploads default to checksum-based retry identity; deploys default to an App/Release digest. Use the same `--idempotency-key` after a failed connection and a fresh key when intentionally redeploying the same Release. Exit codes are 0 for success/acceptance, 1 for a Hub rejection or failed deployment, 2 for invalid local input, and 3 for an unconfirmed outcome caused by a connection failure, timeout, malformed response, or unknown deployment status. Exit 3 does not mean the deployment failed or was cancelled: inspect the deployment in Hub and retry with the same idempotency key if necessary. `--no-wait` validates the deployment acceptance response too; it never treats an unknown status as successful acceptance.

Publishing keys reuse Hub's `upload-release` and `deploy` actions and remain restricted to their selected Apps and their owner's current permissions. Uploading with deployment needs both permissions; waiting uses a minimal deployment status endpoint under `deploy`. These commands call Hub over HTTP and never load this application's server or connect directly to Host.

Both `app deploy --release-id <id> --config ./runtime.yml` and `app upload --deploy --config ./runtime.yml` accept an optional runtime YAML file (non-empty UTF-8, at most 1 MiB). Paths resolve from the App root. Omitting `--config` reuses the current Hub configuration; on first deployment, the existing Release-template initialization still applies. Supplied configuration replaces the configuration document through the existing Hub secret handling and YAML validation; it is not merged with arbitrary existing fields and never changes the Release template or archive. `app upload --config` without `--deploy` is rejected. Use `app deploy` to apply a different configuration to an already uploaded Release; configured upload retries reuse only the originally supplied configuration. Default deployment retry identity includes supplied configuration content. Configuration content is never printed in CLI results.

Deployment commands (`app deploy` and `app upload --deploy`) wait for the final result by default. Use `--no-wait` to return after acceptance; acceptance does not mean deployment succeeded. Explicit `--wait` remains supported. Upload without `--deploy` only waits for the upload. `--timeout` defaults to 600 seconds; a timeout leaves the deployment outcome unconfirmed and does not cancel it.

## Runtime paths and application creation

`runtime.paths`, configuration context `paths`, and `app.paths` share one resolved `AppPaths` object. Use `paths.storage('...')`, `paths.database('...')`, or the corresponding directory fields. `AppPathOptions` is input only; application path policies run before the final object is created and configuration is loaded. Standalone entries declare the deployment root in `server/runtime.ts` so the server and CLI share persistent storage outside the compiled code directory.

`server/app.ts` calls `createAppFromRuntime(runtime)` to transfer configuration, paths, mode and Host logging policy and bind `runtime.app`. Keep Provider, middleware and route registration explicit and ordered; `startApplicationInScope` owns startup and shutdown binding.
