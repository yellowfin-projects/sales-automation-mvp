import type { Deal, Activity, DealMetrics, PipelineMetrics, DealWithMetrics } from "./types";

/**
 * Calculate computed metrics for a single deal based on its activity history.
 * These metrics provide deal health signals without any AI calls.
 */
export function calculateDealMetrics(deal: Deal, activities: Activity[]): DealMetrics {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const totalActivities = activities.length;
  const emailCount = activities.filter((a) => a.activity_type === "Email").length;
  const callCount = activities.filter((a) => a.activity_type === "Call").length;

  // Days since last activity
  let daysSinceLastActivity = 999;
  if (activities.length > 0) {
    const sortedDates = activities
      .map((a) => new Date(a.activity_date))
      .sort((a, b) => b.getTime() - a.getTime());
    const lastActivity = sortedDates[0];
    daysSinceLastActivity = Math.floor(
      (today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)
    );
  }

  // Days to close
  const closeDate = new Date(deal.close_date);
  const daysToClose = Math.floor(
    (closeDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
  const isOverdue = daysToClose < 0;

  // Activity trend: compare last 14 days vs prior 14 days
  const activityTrend = calculateActivityTrend(activities, today);

  // Stakeholder count: parse unique attendee names from call comments
  const stakeholderCount = countStakeholders(activities);

  // Largest gap between consecutive activities
  const maxActivityGapDays = calculateMaxGap(activities);

  return {
    deal_id: deal.id,
    total_activities: totalActivities,
    email_count: emailCount,
    call_count: callCount,
    days_since_last_activity: Math.max(0, daysSinceLastActivity),
    days_to_close: daysToClose,
    is_overdue: isOverdue,
    activity_trend: activityTrend,
    stakeholder_count: stakeholderCount,
    max_activity_gap_days: maxActivityGapDays,
  };
}

/**
 * Compare activity volume in the last 14 days vs the prior 14 days.
 */
function calculateActivityTrend(
  activities: Activity[],
  today: Date
): "accelerating" | "decelerating" | "steady" | "new" {
  if (activities.length < 3) return "new";

  const fourteenDaysAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);
  const twentyEightDaysAgo = new Date(today.getTime() - 28 * 24 * 60 * 60 * 1000);

  const recentCount = activities.filter((a) => {
    const date = new Date(a.activity_date);
    return date >= fourteenDaysAgo && date <= today;
  }).length;

  const priorCount = activities.filter((a) => {
    const date = new Date(a.activity_date);
    return date >= twentyEightDaysAgo && date < fourteenDaysAgo;
  }).length;

  if (priorCount === 0 && recentCount === 0) return "steady";
  if (priorCount === 0) return "accelerating";
  if (recentCount === 0) return "decelerating";

  const ratio = recentCount / priorCount;
  if (ratio > 1.3) return "accelerating";
  if (ratio < 0.7) return "decelerating";
  return "steady";
}

/**
 * Count unique stakeholders by parsing attendee lists from Chorus call summaries.
 * Looks for the "ATTENDEES:" section in Full Comments of call activities.
 */
function countStakeholders(activities: Activity[]): number {
  const names = new Set<string>();

  for (const activity of activities) {
    if (activity.activity_type !== "Call") continue;
    if (!activity.full_comments) continue;

    const comments = activity.full_comments;
    const attendeesMatch = comments.match(/ATTENDEES:\s*\n([\s\S]*?)(?:\n\n|\nMEETING SUMMARY:)/i);
    if (!attendeesMatch) continue;

    const attendeeBlock = attendeesMatch[1];
    const lines = attendeeBlock.split("\n").map((l) => l.trim()).filter(Boolean);

    for (const line of lines) {
      // Skip email-only lines — these are attendees without parsed names
      if (line.includes("@") && !line.includes(",")) continue;
      // Take just the name part (before any title/role suffix)
      const name = line.split(",")[0].trim();
      if (name) names.add(name.toLowerCase());
    }
  }

  return names.size;
}

/**
 * Find the largest gap (in days) between consecutive activities.
 */
function calculateMaxGap(activities: Activity[]): number {
  if (activities.length < 2) return 0;

  const dates = activities
    .map((a) => new Date(a.activity_date).getTime())
    .sort((a, b) => a - b);

  let maxGap = 0;
  for (let i = 1; i < dates.length; i++) {
    const gap = Math.floor((dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24));
    if (gap > maxGap) maxGap = gap;
  }

  return maxGap;
}

/**
 * Calculate pipeline-level summary metrics from all deals and their metrics.
 */
export function calculatePipelineMetrics(deals: DealWithMetrics[]): PipelineMetrics {
  // Only count open deals (exclude closed stages)
  const openDeals = deals.filter(
    (d) => !d.stage.toLowerCase().includes("closed")
  );

  const totalPipelineValue = openDeals.reduce((sum, d) => sum + d.amount, 0);
  const weightedPipeline = openDeals.reduce(
    (sum, d) => sum + d.amount * (d.probability / 100),
    0
  );

  const dealsAtRisk = openDeals.filter(
    (d) => d.metrics.days_since_last_activity > 14 || d.metrics.is_overdue
  ).length;

  // Group by stage
  const stageMap = new Map<string, { count: number; value: number }>();
  for (const deal of openDeals) {
    const existing = stageMap.get(deal.stage) || { count: 0, value: 0 };
    stageMap.set(deal.stage, {
      count: existing.count + 1,
      value: existing.value + deal.amount,
    });
  }
  const dealsByStage = Array.from(stageMap.entries())
    .map(([stage, data]) => ({ stage, ...data }))
    .sort((a, b) => a.stage.localeCompare(b.stage));

  // Group by rep
  const repMap = new Map<string, { count: number; value: number }>();
  for (const deal of openDeals) {
    const existing = repMap.get(deal.owner) || { count: 0, value: 0 };
    repMap.set(deal.owner, {
      count: existing.count + 1,
      value: existing.value + deal.amount,
    });
  }
  const dealsByRep = Array.from(repMap.entries())
    .map(([rep, data]) => ({ rep, ...data }))
    .sort((a, b) => b.value - a.value);

  const averageDealSize =
    openDeals.length > 0 ? totalPipelineValue / openDeals.length : 0;

  return {
    total_pipeline_value: totalPipelineValue,
    weighted_pipeline: weightedPipeline,
    deal_count: openDeals.length,
    deals_at_risk: dealsAtRisk,
    deals_by_stage: dealsByStage,
    deals_by_rep: dealsByRep,
    average_deal_size: averageDealSize,
  };
}
