// TypeScript interfaces for the Leads feature

export interface Lead {
  id: string;
  company: string;
  full_name: string;
  email: string;
  phone: string;
  country: string;
  lead_type: string;       // "Trial Download" | "Demo Request" | etc.
  lead_status: string;     // "New" | "Rep Working" | "Converted" | etc.
  sales_qualified: number; // 1 or 0
  power_of_one: number;    // 1 or 0
  region: string;          // "AMER" | "EMEA" | "APAC" | "EASIA"
  download_date: string | null; // ISO timestamptz
  medium: string;          // "Organic" | "PPC" | "Direct" | "Unknown"
  lead_week_start: string; // ISO date (Sunday of the week)
  is_converted: boolean;
  sync_id: string | null;
  quarter: string;          // "2026-Q1" — fiscal quarter derived from download date
  created_at: string;
  updated_at: string;       // last time this row was upserted (status may have changed)
}

export interface LeadSync {
  id: string;
  email_subject: string | null;
  email_date: string | null;
  rows_in_csv: number;
  leads_imported: number;
  leads_skipped: number;
  trigger_source: string;   // "manual" | "cron"
  synced_at: string;
}

// Data shape for weekly stacked bar chart
export interface WeeklyLeadData {
  week: string;       // "Mar 8" label
  weekStart: string;  // "2026-03-08" ISO date for sorting
  AMER: number;
  EMEA: number;
  APAC: number;
  EASIA: number;
  total: number;
}

// A single cell in the conversion pivot table
export interface ConversionCell {
  total: number;
  converted: number;
}

// One row in the medium heatmap
export interface MediumHeatmapRow {
  region: string;
  medium: string;
  weekCounts: Record<string, number>; // weekStart → count
}

// Summary metrics for the cards at the top
export interface LeadSummaryMetrics {
  totalLeads: number;
  conversionRate: number;     // percentage 0-100
  weekOverWeekChange: number; // percentage change
  latestWeekCount: number;
}

// Region breakdown entry
export interface RegionCount {
  region: string;
  count: number;
  percentage: number;
}

// Country breakdown entry
export interface CountryCount {
  country: string;
  count: number;
}

// Status breakdown entry
export interface StatusCount {
  status: string;
  count: number;
  percentage: number;
}
