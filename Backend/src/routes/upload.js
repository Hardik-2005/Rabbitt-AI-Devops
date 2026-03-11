import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { parseFile } from "../services/parserService.js";
import { generateSummary } from "../services/aiService.js";
import { sendSummaryEmail } from "../services/emailService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Uploads directory ─────────────────────────────────────────────────────────
const UPLOADS_DIR = path.join(__dirname, "../../uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// ── Multer configuration ──────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}${path.extname(file.originalname).toLowerCase()}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const allowed = [".csv", ".xlsx"];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Only .csv and .xlsx files are allowed."), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

// ── Helpers ───────────────────────────────────────────────────────────────────
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const cleanupFile = (filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    fs.unlink(filePath, (err) => {
      if (err) console.error("[Cleanup] Failed to remove temp file:", err.message);
    });
  }
};

// ── Router ────────────────────────────────────────────────────────────────────
const router = express.Router();

/**
 * @swagger
 * /api/upload:
 *   post:
 *     summary: Upload a sales file and receive an AI executive summary by email
 *     tags:
 *       - Sales
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *               - email
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Sales data file (.csv or .xlsx, max 5 MB)
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Recipient email address for the summary report
 *     responses:
 *       200:
 *         description: Summary generated and emailed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Sales summary generated and sent successfully
 *       400:
 *         description: Bad request – missing file, invalid email, or unsupported format
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.post(
  "/upload",
  // Run multer, then convert its errors into HTTP responses
  (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        const msg =
          err.code === "LIMIT_FILE_SIZE"
            ? "File size exceeds the 5 MB limit."
            : err.message;
        return res.status(400).json({ error: msg });
      }
      if (err) return res.status(400).json({ error: err.message });
      next();
    });
  },
  async (req, res) => {
    const filePath = req.file?.path;

    try {
      // ── Input validation ────────────────────────────────────────────────────
      if (!req.file) {
        return res.status(400).json({ error: "A sales file (.csv or .xlsx) is required." });
      }

      const { email } = req.body;
      if (!email || !isValidEmail(email)) {
        cleanupFile(filePath);
        return res.status(400).json({ error: "A valid recipient email address is required." });
      }

      console.log(`[Upload] Received: ${req.file.originalname} → ${email}`);

      // ── Step 1: Parse & extract insights ───────────────────────────────────
      const insights = await parseFile(filePath, req.file.originalname);
      console.log("[Upload] Insights extracted.");

      // ── Step 2: Generate AI summary ─────────────────────────────────────────
      const summary = await generateSummary(insights);
      console.log("[Upload] AI summary generated.");

      // ── Step 3: Send email ──────────────────────────────────────────────────
      await sendSummaryEmail(email, summary);
      console.log(`[Upload] Email sent to ${email}.`);

      cleanupFile(filePath);
      return res.status(200).json({ message: "Sales summary generated and sent successfully" });
    } catch (error) {
      console.error("[Upload] Error:", error.message);
      cleanupFile(filePath);
      return res.status(500).json({ error: error.message || "An unexpected error occurred." });
    }
  }
);

export default router;