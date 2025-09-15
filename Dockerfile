# Use the official Bun image
FROM oven/bun:1.1-alpine

# Set working directory
WORKDIR /app

# Install docker CLI and docker-compose (needed to execute docker-compose commands on host)
RUN apk add --no-cache docker-cli docker-compose

# Copy package files
COPY package.json bun.lockb* ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build the TypeScript code
RUN bun run build

# Expose port (if needed for health checks)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD pgrep -f "dist/index.js" || exit 1

# Start the bot
CMD ["node", "dist/index.js"]
