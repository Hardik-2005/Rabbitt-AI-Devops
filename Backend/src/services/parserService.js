import fs from "fs";
import path from "path";
import csvParser from "csv-parser";
import XLSX from "xlsx";

// ── Column-name aliases ───────────────────────────────────────────────────────
// Maps a semantic field to the set of lowercase column names that represent it.
const ALIASES = {
  revenue:  ["revenue", "sale_amount", "amount", "total", "sales", "total_revenue", "sales_amount", "price"],
  region:   ["region", "area", "location", "territory", "zone", "zones"],
  units:    ["units_sold", "units", "quantity", "qty", "quantity_sold", "num_units"],
  category: ["product_category", "category", "product", "type", "item_type", "product_type"],
  status:   ["status", "order_status", "order_type", "state"],
  date:     ["date", "order_date", "sale_date", "month", "purchase_date", "transaction_date"],
};

// ── Utility helpers ───────────────────────────────────────────────────────────
const normalizeKey = (key) => key.trim().toLowerCase().replace(/\s+/g, "_");

const findColumn = (normalizedRow, aliases) => {
  for (const alias of aliases) {
    if (normalizedRow[alias] !== undefined) return normalizedRow[alias];
  }
  return undefined;
};

const toNumber = (val) => {
  if (val === undefined || val === null || val === "") return 0;
  const parsed = parseFloat(String(val).replace(/[,$]/g, ""));
  return isNaN(parsed) ? 0 : parsed;
};

const extractMonth = (dateVal) => {
  if (!dateVal) return "Unknown";
  // Handle Excel serial date numbers
  if (typeof dateVal === "number") {
    const d = XLSX.SSF.parse_date_code(dateVal);
    if (d) {
      return `${d.y}-${String(d.m).padStart(2, "0")}`;
    }
  }
  const d = new Date(dateVal);
  if (!isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
  return String(dateVal).trim().substring(0, 7) || "Unknown";
};

// ── Parsers ───────────────────────────────────────────────────────────────────
const parseCSV = (filePath) =>
  new Promise((resolve, reject) => {
    const rows = [];
    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on("data", (row) => rows.push(row))
      .on("end", () => resolve(rows))
      .on("error", reject);
  });

const parseExcel = (filePath) => {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });
};

// ── Insights extraction ───────────────────────────────────────────────────────
const extractInsights = (rows) => {
  if (!rows.length) throw new Error("The uploaded file contains no data rows.");

  // Normalize all row keys once up-front
  const normalizedRows = rows.map((row) => {
    const out = {};
    for (const key of Object.keys(row)) {
      out[normalizeKey(key)] = row[key];
    }
    return out;
  });

  let totalRevenue = 0;
  let totalUnitsSold = 0;
  let cancelledOrders = 0;
  const revenueByRegion = {};
  const revenueByCategory = {};
  const monthlyTrend = {};

  for (const row of normalizedRows) {
    const revenue  = toNumber(findColumn(row, ALIASES.revenue));
    const units    = toNumber(findColumn(row, ALIASES.units));
    const region   = String(findColumn(row, ALIASES.region)   ?? "Unknown").trim() || "Unknown";
    const category = String(findColumn(row, ALIASES.category) ?? "Unknown").trim() || "Unknown";
    const status   = String(findColumn(row, ALIASES.status)   ?? "").trim().toLowerCase();
    const dateVal  = findColumn(row, ALIASES.date);
    const month    = extractMonth(dateVal);

    totalRevenue    += revenue;
    totalUnitsSold  += units;

    if (status === "cancelled" || status === "canceled") cancelledOrders++;

    revenueByRegion[region]     = (revenueByRegion[region]     || 0) + revenue;
    revenueByCategory[category] = (revenueByCategory[category] || 0) + revenue;
    monthlyTrend[month]         = (monthlyTrend[month]         || 0) + revenue;
  }

  const topCategory =
    Object.entries(revenueByCategory).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "N/A";

  return {
    totalRevenue:    Math.round(totalRevenue   * 100) / 100,
    revenueByRegion,
    topCategory,
    totalUnitsSold,
    cancelledOrders,
    monthlyTrend,
  };
};

// ── Public API ────────────────────────────────────────────────────────────────
export const parseFile = async (filePath, originalName) => {
  const ext = path.extname(originalName).toLowerCase();
  let rows;

  if (ext === ".csv") {
    rows = await parseCSV(filePath);
  } else if (ext === ".xlsx") {
    rows = parseExcel(filePath);
  } else {
    throw new Error(`Unsupported file format: ${ext}. Only .csv and .xlsx are accepted.`);
  }

  return extractInsights(rows);
};
