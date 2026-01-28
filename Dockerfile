# Build stage for client
FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Production stage
FROM node:20-alpine
WORKDIR /app

# Copy server package files and install
COPY package*.json ./
RUN npm ci --production

# Copy server source
COPY src/ ./src/

# Copy built client
COPY --from=client-builder /app/client/dist ./client/dist

# Expose port
EXPOSE 5050

# Start server
CMD ["npm", "start"]
