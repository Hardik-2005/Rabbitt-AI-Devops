import { GoogleGenerativeAI } from "@google/generative-ai";

// ── Prompt builder ────────────────────────────────────────────────────────────
const buildPrompt = (insights) => {
  const regionLines = Object.entries(insights.revenueByRegion)
    .sort((a, b) => b[1] - a[1])
    .map(([r, v]) => `  - ${r}: $${v.toLocaleString()}`)
    .join("\n") || "  - No region data available";

  const trendLines = Object.entries(insights.monthlyTrend)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([m, v]) => `  - ${m}: $${v.toLocaleString()}`)
    .join("\n") || "  - No date data available";

  return `
Generate a concise executive sales report for leadership based on the following sales insights.
Highlight revenue performance, top regions, product trends, and operational insights.
Use a professional, data-driven tone suitable for a C-suite audience.

Sales Insights:
- Total Revenue: $${insights.totalRevenue.toLocaleString()}
- Total Units Sold: ${insights.totalUnitsSold.toLocaleString()}
- Top Product Category: ${insights.topCategory}
- Cancelled Orders: ${insights.cancelledOrders}

Revenue by Region:
${regionLines}

Monthly Revenue Trend:
${trendLines}

Provide a structured report with the following sections:
1. Executive Summary (2-3 sentences)
2. Revenue Performance
3. Regional Analysis
4. Product Insights
5. Operational Highlights
6. Strategic Recommendations (2-3 bullet points)
`.trim();
};

// ── Public API ────────────────────────────────────────────────────────────────
// IMPORTANT: GoogleGenerativeAI is instantiated HERE (inside the function),
// not at module load time. ES module imports are hoisted and evaluated before
// dotenv.config() runs in server.js, so reading process.env.GEMINI_API_KEY at
// the top level would always yield undefined → API_KEY_INVALID.
export const generateSummary = async (insights) => {
  const apiKey = process.env.GEMINI_API_KEY;

  // Safe debug log: shows presence and masked prefix, never the full key
  if (!apiKey) {
    console.error("[aiService] GEMINI_API_KEY is not set. Check your .env file and ensure dotenv.config() runs before this call.");
    throw new Error("GEMINI_API_KEY environment variable is not set.");
  }
  console.log(`[aiService] GEMINI_API_KEY loaded (length: ${apiKey.length}, prefix: ${apiKey.slice(0, 4)}***)`);

  const genAI = new GoogleGenerativeAI(apiKey);
  const prompt = buildPrompt(insights);

  // Fallback chain: if a model's daily quota is exhausted, try the next one.
  const MODEL_FALLBACKS = [
    "gemini-2.5-flash",
    "gemini-2.0-flash-lite",
    "gemini-1.5-flash",
  ];

  let lastError;

  for (const modelName of MODEL_FALLBACKS) {
    const isQuotaError = (msg) =>
      msg.includes("429") ||
      msg.includes("Too Many Requests") ||
      msg.includes("quota") ||
      msg.includes("RESOURCE_EXHAUSTED");

    try {
      console.log(`[aiService] Trying model: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result   = await model.generateContent(prompt);
      const text     = result.response.text();

      if (!text) throw new Error("Gemini returned an empty response.");
      console.log(`[aiService] Success with model: ${modelName}`);
      return text;
    } catch (error) {
      const detail = error?.message || String(error);
      lastError = error;

      // Hard failures — don't try other models
      if (detail.includes("API_KEY_INVALID") || detail.includes("API key not valid")) {
        throw new Error("Gemini API key is invalid. Verify GEMINI_API_KEY in your .env file.");
      }

      // Quota / rate-limit — skip to next model in fallback chain
      if (isQuotaError(detail)) {
        console.warn(`[aiService] Quota exhausted for ${modelName}, trying next model...`);
        continue;
      }

      // Unexpected error — log and try next model
      console.error(`[aiService] Error with model ${modelName}:`, detail);
    }
  }

  // All models exhausted
  const detail = lastError?.message || String(lastError);
  if (detail.includes("429") || detail.includes("quota") || detail.includes("RESOURCE_EXHAUSTED")) {
    throw new Error(
      "All Gemini models have exceeded their free-tier daily quota. " +
      "Options: (1) Wait until midnight Pacific time for quota reset, " +
      "(2) Enable billing on your Google Cloud project at console.cloud.google.com."
    );
  }
  throw new Error(`Failed to generate AI summary: ${detail}`);
};