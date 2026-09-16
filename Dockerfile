# syntax=docker/dockerfile:1
ARG NODE_VERSION=24.15.0
ARG PNPM_VERSION=11.7.0

FROM node:${NODE_VERSION}-bookworm AS build
ARG PNPM_VERSION
RUN npm install --global pnpm@${PNPM_VERSION} \
    && pnpm config set store-dir /pnpm/store \
    && pnpm config set @nocobase:registry https://npm.nocobase.ai/

WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,target=/pnpm/store pnpm install --frozen-lockfile

COPY . .
ARG APP_BASE_PATH=/main
ENV APP_BASE_PATH=${APP_BASE_PATH}
# The existing build installs and verifies dist/node_modules, including native modules.
RUN --mount=type=cache,target=/pnpm/store pnpm build \
    && node scripts/utils/prepare-container-dist.mjs

FROM node:${NODE_VERSION}-bookworm-slim AS runtime
ARG PNPM_VERSION
RUN npm install --global pnpm@${PNPM_VERSION} && npm cache clean --force

ARG APP_BASE_PATH=/main
# pnpm 11 otherwise tries to reinstall the already packaged, pruned dependencies on start.
# Its built-in shell lets the server receive stop signals without an intermediate /bin/sh.
ENV NODE_ENV=production \
    pnpm_config_verify_deps_before_run=false \
    pnpm_config_shell_emulator=true \
    APP_SERVER_HOST=0.0.0.0 \
    APP_SERVER_PORT=13000 \
    APP_BASE_PATH=${APP_BASE_PATH}

# Keep the dist directory name: the runtime uses it to resolve built client paths.
WORKDIR /app/dist
COPY --from=build --chown=node:node /app/dist/ ./
RUN mkdir -p storage && chown node:node storage
USER node
EXPOSE 13000
CMD ["pnpm", "start"]
