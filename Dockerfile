# Stage 1: Build
FROM node:24-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the project
RUN npm run build

# Stage 2: Production
FROM node:24-slim AS runner

WORKDIR /app

# Set default environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Copy package files for production
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy built files from the builder stage
COPY --from=builder /app/dist ./dist

# Start the application
CMD ["npm", "start"]
