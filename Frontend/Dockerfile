# ── Stage: runtime ────────────────────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# Install dependencies first (leverages Docker layer cache)
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

EXPOSE 5173

# Vite must bind to 0.0.0.0 inside a container so the mapped port is reachable
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
