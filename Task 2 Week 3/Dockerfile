# Multi-stage Dockerfile for the FlyRank To-Do API
#
# Stage 1: Install production dependencies only.
# Using npm ci (clean install) is faster and more reproducible than npm install
# because it reads package-lock.json and refuses to run if the lockfile is
# out of sync with package.json.
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Stage 2: Copy source code and run the application.
# We copy only the files needed at runtime (no tests, no docs).
FROM node:20-alpine AS runner
WORKDIR /app

# Create a non-root user for security. Running as root in containers is
# discouraged because a container escape would give root on the host.
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy production dependencies from the deps stage.
COPY --from=deps /app/node_modules ./node_modules
# Copy application source.
COPY src ./src
# Copy package.json for metadata (version, scripts, etc.).
COPY package.json ./

# Switch to the non-root user.
USER appuser

# The API listens on this port. Compose maps it to the host.
EXPOSE 3000

# Use node --env-file so the .env file (mounted by compose) is loaded
# without needing a separate dotenv package.
CMD ["node", "--env-file=.env", "src/server.js"]