FROM node:18.16.1 AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
WORKDIR /app
COPY . .
RUN corepack enable && \
    corepack prepare pnpm@8.10.5 --activate && \
    apt-get update && apt-get install -y build-essential jq moreutils && \
    rm -rf /var/lib/apt/lists/*

FROM base AS prod-deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile && \
    pnpm prisma generate

FROM base AS build
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile && \
    pnpm run build

FROM base
COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=build /app/build /app/build
RUN jq '.main = "build/index.js"' package.json | sponge package.json
CMD ["pnpm", "start"]