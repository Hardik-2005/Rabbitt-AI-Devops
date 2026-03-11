# Sales Insight Automator

Upload a sales CSV or XLSX file, generate an AI-powered executive summary via Google Gemini, and email the report to a specified recipient.

## Tech Stack

| Layer    | Technology                                    |
| -------- | --------------------------------------------- |
| Frontend | React 19 + Vite                               |
| Backend  | Node.js 18 + Express                          |
| AI       | Google Gemini (`@google/generative-ai`)       |
| Email    | Nodemailer (SMTP)                             |
| Docs     | Swagger UI at `/docs`                         |

---

## Local Development (no Docker)

### 1. Configure environment variables

```bash
cp Backend/.env.example Backend/.env
# Fill in GEMINI_API_KEY, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
```

### 2. Start the backend

```bash
cd Backend
npm install
npm run dev
# → http://localhost:5000
# → http://localhost:5000/docs  (Swagger)
```

### 3. Start the frontend

```bash
cd Frontend
npm install
npm run dev
# → http://localhost:5173
```

---

## Docker

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) ≥ 24
- `Backend/.env` must exist with real values (see `.env.example`)

### File structure added

```
Rabbitt/
├── docker-compose.yml
├── Backend/
│   ├── Dockerfile
│   └── .dockerignore
└── Frontend/
    ├── Dockerfile
    └── .dockerignore
```

### Environment variables inside Docker

| Variable           | Where set                    | Purpose                                    |
| ------------------ | ---------------------------- | ------------------------------------------ |
| `PORT`             | `Backend/.env`               | Express server port (default 5000)         |
| `GEMINI_API_KEY`   | `Backend/.env`               | Google Gemini API key                      |
| `SMTP_*`           | `Backend/.env`               | Nodemailer SMTP credentials                |
| `VITE_API_BASE_URL`| `docker-compose.yml`         | Overrides `localhost:5000` → `backend:5000`|

> **Note:** `VITE_API_BASE_URL` is a Vite build-time variable. It is baked into
> the frontend bundle at `docker-compose build` time via the `environment` block
> in `docker-compose.yml`. You do **not** need to add it to any `.env` file.

### Build containers

```bash
# From the project root (where docker-compose.yml lives)
docker-compose build
```

### Run containers

```bash
docker-compose up
```

Both services start. The frontend waits for the backend health-check to pass before it comes up.

| Service  | URL                                 |
| -------- | ----------------------------------- |
| Frontend | http://localhost:5173               |
| Backend  | http://localhost:5000               |
| API Docs | http://localhost:5000/docs          |

### Run in the background (detached)

```bash
docker-compose up -d
```

### Stop containers

```bash
docker-compose down
```

### Rebuild after code changes

```bash
docker-compose up --build
```

### View logs

```bash
# All services
docker-compose logs -f

# Backend only
docker-compose logs -f backend

# Frontend only
docker-compose logs -f frontend
```

---

## API Reference

Full interactive docs available at **http://localhost:5000/docs** (Swagger UI).

### `POST /api/upload`

Upload a sales file and receive an AI summary by email.

**Request** — `multipart/form-data`

| Field   | Type   | Description                     |
| ------- | ------ | ------------------------------- |
| `file`  | File   | `.csv` or `.xlsx`, max 5 MB     |
| `email` | string | Recipient email address         |

**Response `200`**

```json
{ "message": "Sales summary generated and sent successfully" }
```
