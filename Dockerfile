FROM node:20 AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
RUN corepack prepare pnpm@latest --activate
RUN apt-get update && apt-get install build-essential jq moreutils -y
RUN curl -sL https://sentry.io/get-cli/ | SENTRY_CLI_VERSION="2.21.1" sh
COPY . /app
WORKDIR /app

FROM base AS prod-deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile
RUN pnpm prisma generate

FROM base AS build
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm run build

FROM base
COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=build /app/build /app/build
RUN jq '.main = "build/index.js"' package.json | sponge package.json
CMD ["pnpm", "start"]