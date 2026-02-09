# Build stage
FROM node:20-bookworm-slim AS build

WORKDIR /usr/src/app

# Install build dependencies
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

# Production stage
FROM node:20-bookworm-slim

WORKDIR /usr/src/app

# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml ./
# Install only production dependencies
RUN pnpm install --prod --frozen-lockfile

# Copy compiled code from build stage
COPY --from=build /usr/src/app/dist ./dist
# Copy essential files
COPY --from=build /usr/src/app/static ./static

EXPOSE 3000

# The command is specified in heroku.yml, but adding a default here
CMD ["pnpm", "run", "start"]
