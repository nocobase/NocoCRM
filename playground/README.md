# Docker Compose playground

Run the published NocoCRM image (`ghcr.io/nocobase/crm:latest`) with SQLite and a named volume for its database and uploads. This directory has its own `.env` and editable `config.yml`; it does not mount the application's root configuration or local data. Run the commands below from `playground/`.

## Start

Copy `.env.example` to `.env`, preserving an existing file. Generate two secrets and fill in `AUTH_SECRET` and `SESSION_SECRET` before starting:

```bash
cp -n .env.example .env
openssl rand -hex 32
openssl rand -hex 32
# Edit .env and paste the generated values into AUTH_SECRET and SESSION_SECRET.
docker compose config --quiet
docker compose pull
docker compose up -d --wait
docker compose logs -f app
```

Open <http://localhost:13000/main/>. Compose refuses to start when either secret is empty. Keep both secrets unchanged across restarts and image updates.

If GHCR returns `unauthorized`, run `docker login ghcr.io -u <github-username>` and enter a classic personal access token with `read:packages` and access to this package. Public packages support anonymous pulls. The CI's `GITHUB_TOKEN` only authenticates publishing inside Actions.

## Configuration

Edit `playground/config.yml` for application settings such as the title, language, appearance, notifications, and database configuration. Compose mounts it read-only at `/app/config.yml` and sets `APP_CONFIG_FILE` to that path. The file must exist and be readable by the image's `node` user (UID 1000); Compose will fail instead of creating a directory when it is missing.

`config.yml` is committed with no credentials. Keep the authentication and session secrets in `playground/.env`; Compose supplies them as environment variables, which take precedence over the file. The SQLite filename points into the persistent storage volume.

After changing configuration, recreate the container to load it, including when an editor replaces the file during an atomic save:

```bash
docker compose up -d --force-recreate --wait
```

Edit `playground/.env` for container settings and secrets:

| Variable                        | Purpose                                                                         |
| ------------------------------- | ------------------------------------------------------------------------------- |
| `NOCOBASE_IMAGE`                | Published image; use a `sha-...` tag to pin a build.                            |
| `NOCOBASE_BIND_HOST`            | Defaults to `127.0.0.1`; use `0.0.0.0` to expose the port on other interfaces.  |
| `NOCOBASE_PORT`                 | Host port, default `13000`.                                                     |
| `APP_PUBLIC_ORIGIN`             | Browser-facing origin without `/main`; update when changing the port or domain. |
| `AUTH_SECRET`, `SESSION_SECRET` | Stable random secrets generated before first startup.                           |

Remote production access needs HTTPS through a reverse proxy. The published image uses `/main`; changing only a runtime environment variable cannot relocate the built client. The image targets `linux/amd64`, so ARM hosts need Docker's platform emulation.

The root [config.example.yml](../config.example.yml) documents additional application settings. If a setting references another environment variable, explicitly pass that variable through the service's `environment` section; Compose's `.env` file alone does not inject every value into the container.

## Update and stop

```bash
docker compose pull
docker compose up -d --wait
docker compose down
```

The named volume at `/app/dist/storage` survives container replacement and `docker compose down`. Adding `--volumes` deletes the database and uploaded files.

The Compose project name is `nococrm`, keeping its volume separate from other NocoBase playgrounds. For multiple independent playgrounds, give each one its own project name and host port. If port 13000 is already in use, change both `NOCOBASE_PORT` and `APP_PUBLIC_ORIGIN` in `.env`.
