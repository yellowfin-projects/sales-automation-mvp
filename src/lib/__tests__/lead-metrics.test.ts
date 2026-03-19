import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getWeekStart,
  formatWeekLabel,
  computeWeeklyLeadData,
  computeConversionPivot,
  computeSummaryMetrics,
  computeRegionBreakdown,
  computeTopCountries,
  computeStatusBreakdown,
  computeMediumHeatmap,
} from "../lead-metrics";
import type { Lead } from "../lead-types";

// Helper to create a minimal Lead object for testing
function makeLead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: "test-id",
    company: "Test Corp",
    full_name: "Test User",
    email: "test@example.com",
    phone: "",
    country: "United States",
    lead_type: "Trial Download",
    lead_status: "New",
    sales_qualified: 0,
    power_of_one: 1,
    region: "AMER",
    download_date: "2026-03-10T00:00:00Z",
    medium: "Organic",
    lead_week_start: "2026-03-08",
    is_converted: false,
    sync_id: null,
    created_at: "2026-03-10T00:00:00Z",
    ...overrides,
  };
}

describe("getWeekStart", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns Sunday for a Sunday date", () => {
    expect(getWeekStart(new Date("2026-03-08"))).toBe("2026-03-08");
  });

  it("returns previous Sunday for a Monday", () => {
    expect(getWeekStart(new Date("2026-03-09"))).toBe("2026-03-08");
  });

  it("returns previous Sunday for a Wednesday", () => {
    expect(getWeekStart(new Date("2026-03-11"))).toBe("2026-03-08");
  });

  it("returns previous Sunday for a Saturday", () => {
    expect(getWeekStart(new Date("2026-03-14"))).toBe("2026-03-08");
  });

  it("returns previous Sunday for a Friday", () => {
    expect(getWeekStart(new Date("2026-03-13"))).toBe("2026-03-08");
  });

  it("handles week boundaries across months", () => {
    // March 1, 2026 is a Sunday
    expect(getWeekStart(new Date("2026-03-01"))).toBe("2026-03-01");
    // Feb 28, 2026 is a Saturday → Sunday Feb 22
    expect(getWeekStart(new Date("2026-02-28"))).toBe("2026-02-22");
  });
});

describe("formatWeekLabel", () => {
  it('formats "2026-03-08" as "Mar 8"', () => {
    expect(formatWeekLabel("2026-03-08")).toBe("Mar 8");
  });

  it('formats "2026-01-04" as "Jan 4"', () => {
    expect(formatWeekLabel("2026-01-04")).toBe("Jan 4");
  });
});

describe("computeWeeklyLeadData", () => {
  it("groups leads by week and region", () => {
    const leads = [
      makeLead({ region: "AMER", lead_week_start: "2026-03-08" }),
      makeLead({ region: "AMER", lead_week_start: "2026-03-08" }),
      makeLead({ region: "EMEA", lead_week_start: "2026-03-08" }),
      makeLead({ region: "AMER", lead_week_start: "2026-03-15" }),
    ];

    const result = computeWeeklyLeadData(leads);
    expect(result).toHaveLength(2);

    const week1 = result[0];
    expect(week1.weekStart).toBe("2026-03-08");
    expect(week1.AMER).toBe(2);
    expect(week1.EMEA).toBe(1);
    expect(week1.total).toBe(3);

    const week2 = result[1];
    expect(week2.weekStart).toBe("2026-03-15");
    expect(week2.AMER).toBe(1);
    expect(week2.total).toBe(1);
  });

  it("returns sorted by week", () => {
    const leads = [
      makeLead({ lead_week_start: "2026-03-15" }),
      makeLead({ lead_week_start: "2026-03-01" }),
      makeLead({ lead_week_start: "2026-03-08" }),
    ];

    const result = computeWeeklyLeadData(leads);
    expect(result.map((r) => r.weekStart)).toEqual([
      "2026-03-01",
      "2026-03-08",
      "2026-03-15",
    ]);
  });

  it("returns empty array for no leads", () => {
    expect(computeWeeklyLeadData([])).toEqual([]);
  });
});

describe("computeConversionPivot", () => {
  it("counts totals and converted per region per week", () => {
    const leads = [
      makeLead({ region: "AMER", lead_week_start: "2026-03-08", is_converted: true }),
      makeLead({ region: "AMER", lead_week_start: "2026-03-08", is_converted: false }),
      makeLead({ region: "EMEA", lead_week_start: "2026-03-08", is_converted: true }),
    ];

    const result = computeConversionPivot(leads);
    expect(result.weeks).toEqual(["2026-03-08"]);

    const amerCell = result.cells["AMER"]["2026-03-08"];
    expect(amerCell.total).toBe(2);
    expect(amerCell.converted).toBe(1);

    const emeaCell = result.cells["EMEA"]["2026-03-08"];
    expect(emeaCell.total).toBe(1);
    expect(emeaCell.converted).toBe(1);
  });
});

describe("computeSummaryMetrics", () => {
  it("computes conversion rate correctly", () => {
    const leads = [
      makeLead({ is_converted: true }),
      makeLead({ is_converted: false }),
      makeLead({ is_converted: true }),
      makeLead({ is_converted: false }),
    ];

    const result = computeSummaryMetrics(leads);
    expect(result.totalLeads).toBe(4);
    expect(result.conversionRate).toBe(50);
  });

  it("computes week-over-week change", () => {
    const leads = [
      // Week 1: 2 leads
      makeLead({ lead_week_start: "2026-03-01" }),
      makeLead({ lead_week_start: "2026-03-01" }),
      // Week 2: 4 leads (100% increase)
      makeLead({ lead_week_start: "2026-03-08" }),
      makeLead({ lead_week_start: "2026-03-08" }),
      makeLead({ lead_week_start: "2026-03-08" }),
      makeLead({ lead_week_start: "2026-03-08" }),
    ];

    const result = computeSummaryMetrics(leads);
    expect(result.weekOverWeekChange).toBe(100);
    expect(result.latestWeekCount).toBe(4);
  });

  it("handles empty leads", () => {
    const result = computeSummaryMetrics([]);
    expect(result.totalLeads).toBe(0);
    expect(result.conversionRate).toBe(0);
    expect(result.weekOverWeekChange).toBe(0);
    expect(result.latestWeekCount).toBe(0);
  });

  it("handles single week (no WoW change)", () => {
    const leads = [makeLead({ lead_week_start: "2026-03-08" })];
    const result = computeSummaryMetrics(leads);
    expect(result.weekOverWeekChange).toBe(0);
  });
});

describe("computeMediumHeatmap", () => {
  it("handles blank medium as Unknown", () => {
    const leads = [
      makeLead({ medium: "", region: "AMER", lead_week_start: "2026-03-08" }),
      makeLead({ medium: "PPC", region: "AMER", lead_week_start: "2026-03-08" }),
    ];

    const { rows } = computeMediumHeatmap(leads);
    const unknownRow = rows.find((r) => r.medium === "Unknown");
    expect(unknownRow).toBeDefined();
    expect(unknownRow!.weekCounts["2026-03-08"]).toBe(1);
  });
});

describe("computeRegionBreakdown", () => {
  it("counts and sorts by count descending", () => {
    const leads = [
      makeLead({ region: "EMEA" }),
      makeLead({ region: "AMER" }),
      makeLead({ region: "AMER" }),
      makeLead({ region: "APAC" }),
    ];

    const result = computeRegionBreakdown(leads);
    expect(result[0].region).toBe("AMER");
    expect(result[0].count).toBe(2);
    expect(result[0].percentage).toBe(50);
  });
});

describe("computeTopCountries", () => {
  it("returns top N countries sorted by count", () => {
    const leads = [
      makeLead({ country: "United States" }),
      makeLead({ country: "United States" }),
      makeLead({ country: "Germany" }),
      makeLead({ country: "Australia" }),
      makeLead({ country: "Australia" }),
      makeLead({ country: "Australia" }),
    ];

    const result = computeTopCountries(leads, 2);
    expect(result).toHaveLength(2);
    expect(result[0].country).toBe("Australia");
    expect(result[0].count).toBe(3);
    expect(result[1].country).toBe("United States");
  });
});

describe("computeStatusBreakdown", () => {
  it("computes status counts for all regions", () => {
    const leads = [
      makeLead({ lead_status: "New", region: "AMER" }),
      makeLead({ lead_status: "New", region: "EMEA" }),
      makeLead({ lead_status: "Rep Working", region: "AMER" }),
    ];

    const result = computeStatusBreakdown(leads);
    expect(result).toHaveLength(2);
    const newStatus = result.find((s) => s.status === "New");
    expect(newStatus!.count).toBe(2);
  });

  it("filters to AMER only when requested", () => {
    const leads = [
      makeLead({ lead_status: "New", region: "AMER" }),
      makeLead({ lead_status: "New", region: "EMEA" }),
      makeLead({ lead_status: "Rep Working", region: "AMER" }),
    ];

    const result = computeStatusBreakdown(leads, true);
    const total = result.reduce((sum, s) => sum + s.count, 0);
    expect(total).toBe(2); // only AMER leads
  });
});
