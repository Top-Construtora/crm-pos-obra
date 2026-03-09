FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace root files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy backend package.json
COPY backend/package.json ./backend/

# Copy frontend package.json (needed for pnpm workspace resolution)
COPY frontend/package.json ./frontend/

# Install pnpm and dependencies
RUN corepack enable && pnpm install --frozen-lockfile

# Copy backend source
COPY backend/ ./backend/

# Build backend
RUN cd backend && pnpm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

RUN corepack enable && pnpm install --frozen-lockfile --prod

COPY --from=builder /app/backend/dist ./backend/dist

WORKDIR /app/backend

EXPOSE 3333

CMD ["node", "dist/app.js"]
