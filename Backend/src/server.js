import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { fileURLToPath } from "url";
import path from "path";
import uploadRouter from "./routes/upload.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.get("/", (req, res) => {
  res.send("Rabbit AI DevOps Backend Running 🚀");
});
// ── Swagger / OpenAPI docs ────────────────────────────────────────────────────
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Sales Insight Automator API",
      version: "1.0.0",
      description:
        "Upload a sales CSV/XLSX file, generate an AI-powered executive summary via Google Gemini, and email the report to a specified recipient.",
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 5000}`,
        description: "Development server",
      },
    ],
  },
  apis: [path.join(__dirname, "./routes/*.js")],
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api", uploadRouter);

// ── Global error handler ──────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error("[Global Error]", err.message || err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || "Internal server error" });
});

// ── Start server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running  → http://localhost:${PORT}`);
  console.log(`Swagger docs   → http://localhost:${PORT}/docs`);

  // Safe startup check — confirms dotenv loaded secrets without printing them
  const keyLoaded = !!process.env.GEMINI_API_KEY;
  console.log(`[Startup] GEMINI_API_KEY ${keyLoaded ? `loaded ✓ (length: ${process.env.GEMINI_API_KEY.length})` : "NOT SET ✗ — add it to your .env file"}`);
  if (!process.env.SMTP_HOST) console.warn("[Startup] SMTP_HOST not set — email sending will fail");
});