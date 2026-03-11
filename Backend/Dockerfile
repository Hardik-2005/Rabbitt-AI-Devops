# ── Stage: runtime ────────────────────────────────────────────────────────────
FROM node:20-alpine

# Install dependencies needed by some native npm packages (e.g. xlsx)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Install dependencies first (leverages Docker layer cache)
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

# Create uploads directory at build time so multer can write files
RUN mkdir -p uploads

EXPOSE 5000

# Use `start` (node) in production-style containers; nodemon is for local dev
CMD ["npm", "run", "start"]
