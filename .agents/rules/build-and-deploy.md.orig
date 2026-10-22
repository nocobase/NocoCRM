# Building and deploying this application

Read this before changing the build, packing a deployment archive, setting `CDN_BASE_URL`, or building for another platform. The deployment process itself is in the [deployment Skill](../skills/nocobase-deployment/SKILL.md), and dependency placement and the build failure table are in [where to declare a dependency](../skills/nocobase-app-development/references/dependencies.md).

## CDN assets at build time

`CDN_BASE_URL` sets Vite's `base` only during a production build: `CDN_BASE_URL=https://cdn.example.com/my-app/v1/ pnpm build`. Use a full HTTPS URL ending in `/`; unset, empty or whitespace-only values keep the default `./`. `pnpm build` reads it from the process environment, then `.env.local`, then `.env`; development ignores it and continues using `APP_BASE_PATH`. It is a build parameter, absent from `config variables` and `dist/variables.json`, with no `config.yml` setting. Changing it requires rebuilding.

Upload the static files from `dist/client/` to that CDN prefix with their directory structure preserved, and enable CORS for the application's origin. Keep `index.html` and the complete client tree on the application server so it can inject runtime configuration into HTML and serve files still addressed there. Use `resolveAssetUrl('/assets/logo.png')` from `@nocobase/app-client` for a file shipped as `dist/client/assets/logo.png`; the NocoCRM wordmark and the sign-in logo use this helper. It reads Vite's build-time `BASE_URL`, uses an absolute HTTP(S) CDN base when configured, and otherwise falls back to the runtime mount path. Keep API paths, page links and runtime-generated files on `resolveAppUrl`. Vite does not rewrite arbitrary URL strings. The README's CDN section describes deployment.

## Packing the build for a deployment

`pnpm build --tar` writes `storage/exports/dist.tar.gz` after the build. The archive holds `dist/` as a directory next to `config.example.yml`, so extracting it produces exactly those two paths rather than scattering `server/` and `node_modules/` into whatever directory you unpacked in.

`config.example.yml` travels with it because a deployment has to write a `config.yml` before it can start — `pnpm nocobase config init`, run inside `dist/`, does that from the example, in place, and `pnpm nocobase config check` there verifies it, database connection included, before the first start — and the example is the only statement of what may go in it. Directories of executable shims are left out: a `.bin` entry points at a path on the machine that installed it, and a dangling one makes `pnpm install` in the extracted tree report a corrupt store rather than repair it.

Without `--tar` no archive is produced, which is what you want when the build is only going to be run locally.

## No Docker image

This application is deployed through NocoBase Studio from the archive `pnpm build --tar` writes, not as a Docker image: it keeps no `Dockerfile`, `.dockerignore`, image workflow, image smoke test or Compose playground, and the template's `Dockerfile` and `Dockerfile.dockerignore` are left out. Leave them out on a template upgrade unless a Docker deployment is wanted again.

A release is deployed to the application `crm` in three NocoBase Studios — internal (studio.v2.test.nocobase.com), cn (solutions-cn.nocobase.com) and global (solutions.nocobase.com) — by `.github/workflows/deploy-studio.yml`, which a release tag starts. A release is a commit `Release <version>` on `main` that sets `version` in `package.json`, pushed with the tag `v<version>` on it; before tagging, run the checks `pnpm check` runs, without its local build: `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test`, and go no further while one fails. The workflow runs the same checks once more, builds once with `pnpm build --target linux-x64 --node-version 24 --tar`, then deploys the archive to each Studio in parallel through `scripts/ci/deploy-studio.mjs`: `nb-studio deploy` (`@nocobase/studio-cli`), waiting for the deployment, checking `/api/healthz` answers as the CRM, and checking the application's address serves the build's own `assets/index-*.js`, since a healthy server can still serve another build's page. Each Studio is a GitHub environment, `studio-internal`, `studio-cn` and `studio-global`, holding the variables `NB_STUDIO_SERVER` (the Studio's address, such as `https://studio.v2.test.nocobase.com/main`) and `STUDIO_APP_URL` (the CRM's address there, such as `https://studio.v2.test.nocobase.com/crm/`) and the secret `NB_STUDIO_API_KEY`; a Studio that fails does not stop the others, and running the workflow by hand on a release tag deploys that release again. To deploy by hand instead, build the same archive and run `nb-studio --profile <profile> deploy --app crm --repository nocobase/nococrm --sha <commit> --file storage/exports/dist.tar.gz --json`, always naming the profile, since the CLI's current profile may be another Studio.

## Building for another platform

`pnpm build --help` (or `-h`) lists build options and exits without loading build dependencies, running hooks, or modifying `dist/`. Every successful build records `nocobase.buildTarget` in `dist/package.json`, including builds with no native modules: `platform`, `arch`, `libc`, `nodeMajor`, and `nodeAbi`. Use `libc` only for Linux; its value on other platforms is a compatibility placeholder. Deployment checks should compare these fields with the host runtime and also respect `engines.node`. With `--target current` (the default), the Node version and ABI come from the running process; an explicit platform target defaults to Node 24 unless `--node-version` is supplied.

`pnpm build` targets the machine it runs on, so `pnpm build && pnpm start` works. A deployment build says where it is going: `--target linux-x64`, `--target linux-arm64`, `--target linux-x64-musl`, plus `--node-version` when the server's Node major differs. Every build prints the platform it produced and records it in `dist/package.json` under `nocobase.buildTarget`.

A `.node` binary must match the target platform, architecture, and C library; addons using the Node ABI must also match its version. `better-sqlite3` 13 uses N-API and bundles its platform binaries, so cross-platform builds retain the target's binary, including the separate `linuxmusl` build for Alpine. `pg`, `mysql2`, and `tedious` are plain JavaScript, so an application using only those is portable as built.

## Compiled migration and seed manifests

The application build generates `.manifest.json` in each compiled migrations and seeds directory after server compilation, path rewriting, and `afterServerBuild` hooks. Keep the manifest generator in the build when customizing it. Plugins generate their own manifests when built; an application must not regenerate manifests for installed dependencies.

TypeScript and compiled JavaScript use the same source checksum for migration history, while the loader separately verifies emitted JavaScript. Marked JavaScript requires its manifest. For a database with old raw JavaScript checksums, first run the compiled representation with matching original output; verified legacy hashes are converted under the task lock. Unreproducible old output remains an error. Never edit historical migrations, and never edit the history table by hand, to resolve an upgrade failure; `pnpm nocobase db repair` is the supported way to realign a checksum you can account for, and `pnpm nocobase db redo` the way to re-run a migration whose branch is still unmerged.

## Server start log

`pnpm dev` owns the ready banner and public URL; `APP_SERVER_START_LOG=false` suppresses the underlying listener announcement through the `env` of `server/config/server.ts`. Keep that mapping when editing deployment environment settings. Request starts, request headers and config diagnostics use DEBUG; the normal INFO output contains completion summaries. See the shared application development Skill for hosted logging and upgrade limits.
