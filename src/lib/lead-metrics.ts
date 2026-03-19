// Pure computation functions for lead data — no DB calls
import type {
  Lead,
  WeeklyLeadData,
  ConversionCell,
  MediumHeatmapRow,
  LeadSummaryMetrics,
  RegionCount,
  CountryCount,
  StatusCount,
} from "./lead-types";

const REGIONS = ["AMER", "EMEA", "APAC", "EASIA"] as const;

/**
 * Get the Sunday (start of week) for a given date.
 * If the date IS a Sunday, returns that same date.
 * Uses UTC methods to avoid timezone shifts.
 */
export function getWeekStart(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay(); // 0=Sun, 1=Mon, ...
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().split("T")[0];
}

/**
 * Format a week start date as a short label: "2026-03-08" → "Mar 8"
 */
export function formatWeekLabel(weekStart: string): string {
  const d = new Date(weekStart + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Group leads by week and count per region → for stacked bar chart.
 */
export function computeWeeklyLeadData(leads: Lead[]): WeeklyLeadData[] {
  const weekMap = new Map<string, Record<string, number>>();

  for (const lead of leads) {
    const ws = lead.lead_week_start;
    if (!weekMap.has(ws)) {
      weekMap.set(ws, { AMER: 0, EMEA: 0, APAC: 0, EASIA: 0 });
    }
    const counts = weekMap.get(ws)!;
    const region = REGIONS.includes(lead.region as typeof REGIONS[number])
      ? lead.region
      : "AMER"; // fallback
    counts[region] = (counts[region] || 0) + 1;
  }

  return Array.from(weekMap.entries())
    .map(([weekStart, counts]) => ({
      week: formatWeekLabel(weekStart),
      weekStart,
      AMER: counts.AMER || 0,
      EMEA: counts.EMEA || 0,
      APAC: counts.APAC || 0,
      EASIA: counts.EASIA || 0,
      total: (counts.AMER || 0) + (counts.EMEA || 0) + (counts.APAC || 0) + (counts.EASIA || 0),
    }))
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart));
}

/**
 * Build a pivot table: regions (rows) × weeks (columns),
 * each cell has {total, converted}.
 */
export function computeConversionPivot(
  leads: Lead[]
): { regions: string[]; weeks: string[]; cells: Record<string, Record<string, ConversionCell>> } {
  const weeks = [...new Set(leads.map((l) => l.lead_week_start))].sort();
  const cells: Record<string, Record<string, ConversionCell>> = {};

  for (const region of REGIONS) {
    cells[region] = {};
    for (const week of weeks) {
      cells[region][week] = { total: 0, converted: 0 };
    }
  }

  for (const lead of leads) {
    const region = REGIONS.includes(lead.region as typeof REGIONS[number])
      ? lead.region
      : "AMER";
    if (!cells[region][lead.lead_week_start]) {
      cells[region][lead.lead_week_start] = { total: 0, converted: 0 };
    }
    cells[region][lead.lead_week_start].total++;
    if (lead.is_converted) {
      cells[region][lead.lead_week_start].converted++;
    }
  }

  return { regions: [...REGIONS], weeks, cells };
}

/**
 * Build heatmap data: region+medium (rows) × weeks (columns) with counts.
 */
export function computeMediumHeatmap(leads: Lead[]): {
  rows: MediumHeatmapRow[];
  weeks: string[];
} {
  const weeks = [...new Set(leads.map((l) => l.lead_week_start))].sort();

  // Group by region+medium
  const keyMap = new Map<string, MediumHeatmapRow>();

  for (const lead of leads) {
    const region = REGIONS.includes(lead.region as typeof REGIONS[number])
      ? lead.region
      : "AMER";
    const medium = lead.medium || "Unknown";
    const key = `${region}|${medium}`;

    if (!keyMap.has(key)) {
      keyMap.set(key, { region, medium, weekCounts: {} });
    }
    const row = keyMap.get(key)!;
    row.weekCounts[lead.lead_week_start] =
      (row.weekCounts[lead.lead_week_start] || 0) + 1;
  }

  // Sort: by region, then by medium
  const rows = Array.from(keyMap.values()).sort((a, b) => {
    const regionCmp = a.region.localeCompare(b.region);
    if (regionCmp !== 0) return regionCmp;
    return a.medium.localeCompare(b.medium);
  });

  return { rows, weeks };
}

/**
 * Compute summary metrics: total, conversion rate, week-over-week change, latest week count.
 */
export function computeSummaryMetrics(leads: Lead[]): LeadSummaryMetrics {
  const totalLeads = leads.length;
  const convertedCount = leads.filter((l) => l.is_converted).length;
  const conversionRate = totalLeads > 0 ? (convertedCount / totalLeads) * 100 : 0;

  // Get weekly totals sorted by week
  const weeklyData = computeWeeklyLeadData(leads);
  const latestWeekCount = weeklyData.length > 0 ? weeklyData[weeklyData.length - 1].total : 0;

  let weekOverWeekChange = 0;
  if (weeklyData.length >= 2) {
    const current = weeklyData[weeklyData.length - 1].total;
    const previous = weeklyData[weeklyData.length - 2].total;
    weekOverWeekChange = previous > 0 ? ((current - previous) / previous) * 100 : 0;
  }

  return { totalLeads, conversionRate, weekOverWeekChange, latestWeekCount };
}

/**
 * Count leads per region with percentages.
 */
export function computeRegionBreakdown(leads: Lead[]): RegionCount[] {
  const counts = new Map<string, number>();
  for (const lead of leads) {
    const r = lead.region || "Unknown";
    counts.set(r, (counts.get(r) || 0) + 1);
  }
  const total = leads.length;
  return Array.from(counts.entries())
    .map(([region, count]) => ({
      region,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Top N countries by lead count.
 */
export function computeTopCountries(leads: Lead[], n = 5): CountryCount[] {
  const counts = new Map<string, number>();
  for (const lead of leads) {
    const c = lead.country || "Unknown";
    counts.set(c, (counts.get(c) || 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

/**
 * Lead status breakdown, optionally filtered to AMER only.
 */
export function computeStatusBreakdown(leads: Lead[], amerOnly = false): StatusCount[] {
  const filtered = amerOnly ? leads.filter((l) => l.region === "AMER") : leads;
  const counts = new Map<string, number>();
  for (const lead of filtered) {
    const s = lead.lead_status || "Unknown";
    counts.set(s, (counts.get(s) || 0) + 1);
  }
  const total = filtered.length;
  return Array.from(counts.entries())
    .map(([status, count]) => ({
      status,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);
}
