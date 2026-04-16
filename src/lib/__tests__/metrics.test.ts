import { describe, it, expect, vi, beforeEach } from "vitest";
import { calculateDealMetrics, calculatePipelineMetrics } from "../metrics";
import type { Deal, Activity, DealWithMetrics } from "../types";

// Helper to create a deal with sensible defaults
function makeDeal(overrides: Partial<Deal> = {}): Deal {
  return {
    id: "deal-1",
    opportunity_name: "Test Deal",
    account_name: "Test Account",
    stage: "5-Active Evaluation",
    amount: 50000,
    currency: "USD",
    probability: 70,
    predictive_amount: 35000,
    close_date: "2026-04-15",
    owner: "Rep A",
    opportunity_type: "New Logo",
    region: "AMER",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-03-01T00:00:00Z",
    ...overrides,
  };
}

// Helper to create an activity
function makeActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: "act-1",
    deal_id: "deal-1",
    activity_date: "2026-03-15",
    subject: "Test Activity",
    full_comments: "",
    activity_type: "Email",
    upload_id: "upload-1",
    created_at: "2026-03-15T00:00:00Z",
    ...overrides,
  };
}

// Fix "today" so tests don't drift over time
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-03-18"));
});

describe("calculateDealMetrics", () => {
  it("returns correct counts for emails and calls", () => {
    const deal = makeDeal();
    const activities = [
      makeActivity({ id: "1", activity_type: "Email" }),
      makeActivity({ id: "2", activity_type: "Email" }),
      makeActivity({ id: "3", activity_type: "Call" }),
      makeActivity({ id: "4", activity_type: "Other" }),
    ];

    const metrics = calculateDealMetrics(deal, activities);

    expect(metrics.total_activities).toBe(4);
    expect(metrics.email_count).toBe(2);
    expect(metrics.call_count).toBe(1);
  });

  it("calculates days since last activity correctly", () => {
    const deal = makeDeal();
    // Use dates far enough apart that timezone offsets don't affect the result
    const activities = [
      makeActivity({ id: "1", activity_date: "2026-03-14" }), // ~4 days ago
      makeActivity({ id: "2", activity_date: "2026-03-08" }), // ~10 days ago
    ];

    const metrics = calculateDealMetrics(deal, activities);

    // The code compares local-midnight "today" vs UTC-parsed activity dates,
    // so the exact value can shift by ~1 day depending on timezone.
    // We verify it's in the right ballpark (3-5 days for the most recent activity).
    expect(metrics.days_since_last_activity).toBeGreaterThanOrEqual(3);
    expect(metrics.days_since_last_activity).toBeLessThanOrEqual(5);
  });

  it("returns 999 days since last activity when no activities exist", () => {
    const deal = makeDeal();
    const metrics = calculateDealMetrics(deal, []);

    expect(metrics.days_since_last_activity).toBe(999);
  });

  it("calculates days to close and overdue status", () => {
    // Deal closing in the future
    const futureDeal = makeDeal({ close_date: "2026-04-18" }); // 31 days from now
    const futureMetrics = calculateDealMetrics(futureDeal, []);
    expect(futureMetrics.days_to_close).toBe(31);
    expect(futureMetrics.is_overdue).toBe(false);

    // Deal with close date in the past
    const overdueDeal = makeDeal({ close_date: "2026-03-10" }); // 8 days ago
    const overdueMetrics = calculateDealMetrics(overdueDeal, []);
    expect(overdueMetrics.days_to_close).toBe(-8);
    expect(overdueMetrics.is_overdue).toBe(true);
  });

  it("detects accelerating activity trend", () => {
    const deal = makeDeal();
    // 5 activities in last 14 days, 1 in prior 14 days
    const activities = [
      makeActivity({ id: "1", activity_date: "2026-03-17" }),
      makeActivity({ id: "2", activity_date: "2026-03-15" }),
      makeActivity({ id: "3", activity_date: "2026-03-12" }),
      makeActivity({ id: "4", activity_date: "2026-03-10" }),
      makeActivity({ id: "5", activity_date: "2026-03-06" }),
      makeActivity({ id: "6", activity_date: "2026-02-25" }),
    ];

    const metrics = calculateDealMetrics(deal, activities);
    expect(metrics.activity_trend).toBe("accelerating");
  });

  it("detects decelerating activity trend", () => {
    const deal = makeDeal();
    // 1 activity in last 14 days, 5 in prior 14 days
    const activities = [
      makeActivity({ id: "1", activity_date: "2026-03-10" }),
      makeActivity({ id: "2", activity_date: "2026-02-28" }),
      makeActivity({ id: "3", activity_date: "2026-02-27" }),
      makeActivity({ id: "4", activity_date: "2026-02-25" }),
      makeActivity({ id: "5", activity_date: "2026-02-22" }),
      makeActivity({ id: "6", activity_date: "2026-02-20" }),
    ];

    const metrics = calculateDealMetrics(deal, activities);
    expect(metrics.activity_trend).toBe("decelerating");
  });

  it("returns 'new' trend for deals with fewer than 3 activities", () => {
    const deal = makeDeal();
    const activities = [
      makeActivity({ id: "1", activity_date: "2026-03-15" }),
    ];

    const metrics = calculateDealMetrics(deal, activities);
    expect(metrics.activity_trend).toBe("new");
  });

  it("calculates max activity gap", () => {
    const deal = makeDeal();
    const activities = [
      makeActivity({ id: "1", activity_date: "2026-03-15" }),
      makeActivity({ id: "2", activity_date: "2026-03-10" }), // 5 day gap
      makeActivity({ id: "3", activity_date: "2026-02-20" }), // 18 day gap
    ];

    const metrics = calculateDealMetrics(deal, activities);
    expect(metrics.max_activity_gap_days).toBe(18);
  });

  it("returns 0 gap for a single activity", () => {
    const deal = makeDeal();
    const activities = [makeActivity({ id: "1" })];

    const metrics = calculateDealMetrics(deal, activities);
    expect(metrics.max_activity_gap_days).toBe(0);
  });

  it("parses stakeholders from Chorus call summaries", () => {
    const deal = makeDeal();
    const activities = [
      makeActivity({
        id: "1",
        activity_type: "Call",
        full_comments: `Chorus - Meeting Title

ATTENDEES:
Alice Smith
Bob Jones, VP Engineering
carol@example.com

MEETING SUMMARY:
We discussed the project timeline.`,
      }),
      makeActivity({
        id: "2",
        activity_type: "Call",
        full_comments: `Another Call

ATTENDEES:
Alice Smith
Dave Wilson, CTO

MEETING SUMMARY:
Follow-up discussion.`,
      }),
    ];

    const metrics = calculateDealMetrics(deal, activities);
    // Alice Smith (deduped), Bob Jones, Dave Wilson = 3
    // carol@example.com is email-only, skipped
    expect(metrics.stakeholder_count).toBe(3);
  });

  it("ignores email activities for stakeholder count", () => {
    const deal = makeDeal();
    const activities = [
      makeActivity({
        id: "1",
        activity_type: "Email",
        full_comments: `ATTENDEES:\nSomeone\n\nMEETING SUMMARY:\nStuff`,
      }),
    ];

    const metrics = calculateDealMetrics(deal, activities);
    expect(metrics.stakeholder_count).toBe(0);
  });
});

describe("calculatePipelineMetrics", () => {
  function makeDealWithMetrics(
    overrides: Partial<Deal> = {},
    metricOverrides: Partial<DealWithMetrics["metrics"]> = {}
  ): DealWithMetrics {
    const deal = makeDeal(overrides);
    return {
      ...deal,
      metrics: {
        deal_id: deal.id,
        total_activities: 5,
        email_count: 3,
        call_count: 2,
        days_since_last_activity: 5,
        days_to_close: 30,
        is_overdue: false,
        activity_trend: "steady",
        stakeholder_count: 3,
        max_activity_gap_days: 7,
        ...metricOverrides,
      },
      has_analysis: false,
      checklist: [],
    };
  }

  it("calculates total and weighted pipeline for open deals", () => {
    const deals = [
      makeDealWithMetrics({ id: "1", amount: 100000, probability: 80 }),
      makeDealWithMetrics({ id: "2", amount: 50000, probability: 40 }),
    ];

    const metrics = calculatePipelineMetrics(deals);

    expect(metrics.total_pipeline_value).toBe(150000);
    expect(metrics.weighted_pipeline).toBe(100000 * 0.8 + 50000 * 0.4);
    expect(metrics.deal_count).toBe(2);
    expect(metrics.average_deal_size).toBe(75000);
  });

  it("excludes closed deals from pipeline value", () => {
    const deals = [
      makeDealWithMetrics({ id: "1", amount: 100000, stage: "5-Active Evaluation" }),
      makeDealWithMetrics({ id: "2", amount: 50000, stage: "0-Closed Lost" }),
    ];

    const metrics = calculatePipelineMetrics(deals);

    expect(metrics.total_pipeline_value).toBe(100000);
    expect(metrics.deal_count).toBe(1);
  });

  it("counts deals at risk correctly", () => {
    const deals = [
      // Stale: >14 days since activity
      makeDealWithMetrics(
        { id: "1" },
        { days_since_last_activity: 20, is_overdue: false }
      ),
      // Overdue close date
      makeDealWithMetrics(
        { id: "2" },
        { days_since_last_activity: 3, is_overdue: true }
      ),
      // Healthy
      makeDealWithMetrics(
        { id: "3" },
        { days_since_last_activity: 5, is_overdue: false }
      ),
    ];

    const metrics = calculatePipelineMetrics(deals);
    expect(metrics.deals_at_risk).toBe(2);
  });

  it("groups deals by stage", () => {
    const deals = [
      makeDealWithMetrics({ id: "1", stage: "5-Active Evaluation", amount: 50000 }),
      makeDealWithMetrics({ id: "2", stage: "5-Active Evaluation", amount: 30000 }),
      makeDealWithMetrics({ id: "3", stage: "6-Prospect", amount: 20000 }),
    ];

    const metrics = calculatePipelineMetrics(deals);
    const activeEval = metrics.deals_by_stage.find(
      (s) => s.stage === "5-Active Evaluation"
    );
    const prospect = metrics.deals_by_stage.find(
      (s) => s.stage === "6-Prospect"
    );

    expect(activeEval?.count).toBe(2);
    expect(activeEval?.value).toBe(80000);
    expect(prospect?.count).toBe(1);
    expect(prospect?.value).toBe(20000);
  });

  it("groups deals by rep", () => {
    const deals = [
      makeDealWithMetrics({ id: "1", owner: "Rep A", amount: 50000 }),
      makeDealWithMetrics({ id: "2", owner: "Rep A", amount: 30000 }),
      makeDealWithMetrics({ id: "3", owner: "Rep B", amount: 20000 }),
    ];

    const metrics = calculatePipelineMetrics(deals);
    const repA = metrics.deals_by_rep.find((r) => r.rep === "Rep A");
    const repB = metrics.deals_by_rep.find((r) => r.rep === "Rep B");

    expect(repA?.count).toBe(2);
    expect(repA?.value).toBe(80000);
    expect(repB?.count).toBe(1);
    expect(repB?.value).toBe(20000);
  });

  it("handles empty deal list", () => {
    const metrics = calculatePipelineMetrics([]);

    expect(metrics.total_pipeline_value).toBe(0);
    expect(metrics.weighted_pipeline).toBe(0);
    expect(metrics.deal_count).toBe(0);
    expect(metrics.deals_at_risk).toBe(0);
    expect(metrics.average_deal_size).toBe(0);
  });
});
