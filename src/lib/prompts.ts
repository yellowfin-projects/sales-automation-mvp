import type { Deal, Activity, DealMetrics } from "./types";
import { CHECKLIST_CATEGORIES } from "./deal-config";
import type { TranscriptAnalysis } from "./transcript-types";

/**
 * Build the analysis prompt for a deal.
 * Includes deal metadata, computed metrics, and recent activity history.
 */
export function buildDealAnalysisPrompt(
  deal: Deal,
  metrics: DealMetrics,
  activities: Activity[],
  transcriptAnalyses: TranscriptAnalysis[] = []
): string {
  // Take the 10 most recent activities to keep token usage reasonable
  const recentActivities = activities
    .sort((a, b) => new Date(b.activity_date).getTime() - new Date(a.activity_date).getTime())
    .slice(0, 10);

  const activitySummaries = recentActivities.map((a) => {
    // For call activities with long Chorus summaries, extract the key sections
    let comments = a.full_comments || "";
    if (comments.length > 2000) {
      // Keep Meeting Summary and Action Items, trim the rest
      const meetingSummary = comments.match(/MEETING SUMMARY:[\s\S]*?(?=KEY TOPICS|NEXT STEPS|$)/i)?.[0] || "";
      const actionItems = comments.match(/Action Items:[\s\S]*?(?=Meeting Summary:|KEY TOPICS|$)/i)?.[0] || "";
      const nextSteps = comments.match(/NEXT STEPS[\s\S]*/i)?.[0] || "";
      comments = [actionItems, meetingSummary, nextSteps].filter(Boolean).join("\n\n");
      if (comments.length > 2000) {
        comments = comments.slice(0, 2000) + "\n[...truncated for length]";
      }
    }

    return `[${a.activity_date}] ${a.activity_type}: ${a.subject}${comments ? `\n${comments}` : ""}`;
  });

  const prompt = `You are a sales coaching assistant analyzing a B2B software deal. Review the deal data and activity history below, then provide a structured analysis.

## Deal Information
- **Opportunity:** ${deal.opportunity_name}
- **Account:** ${deal.account_name}
- **Stage:** ${deal.stage}
- **Amount:** $${deal.amount.toLocaleString()}
- **Close Date:** ${deal.close_date}
- **Rep Probability:** ${deal.probability}%
- **Owner:** ${deal.owner}
- **Type:** ${deal.opportunity_type}

## Computed Metrics
- **Total Activities:** ${metrics.total_activities} (${metrics.email_count} emails, ${metrics.call_count} calls)
- **Days Since Last Activity:** ${metrics.days_since_last_activity}
- **Days to Close:** ${metrics.days_to_close}${metrics.is_overdue ? " (OVERDUE)" : ""}
- **Activity Trend:** ${metrics.activity_trend}
- **Stakeholders Identified:** ${metrics.stakeholder_count}
- **Max Activity Gap:** ${metrics.max_activity_gap_days} days

## Recent Activity History (most recent first)
${activitySummaries.join("\n\n---\n\n")}
${buildTranscriptCoachingContext(transcriptAnalyses)}
## Instructions
Analyze this deal and return a JSON object with exactly these fields:
{
  "health_assessment": "2-3 sentence summary of overall deal health",
  "risk_signals": ["specific risk with evidence from the data", "..."],
  "positive_signals": ["specific positive signal with evidence", "..."],
  "coaching_suggestions": ["actionable recommendation 1", "actionable recommendation 2", "actionable recommendation 3"],
  "ai_win_probability": 0.65,
  "ai_reasoning": "1-2 sentence explanation of the win probability estimate",
  "checklist_detected": [
    {"category": "Discovery Complete", "completed": true, "confidence": "high"},
    {"category": "Champion Identified", "completed": false, "confidence": "medium"}
  ]
}

For checklist_detected, evaluate EVERY one of these 12 categories based on the activity history and deal data:
${CHECKLIST_CATEGORIES.map((c, i) => `${i + 1}. ${c}`).join("\n")}

For each category, set completed=true only if there is clear evidence in the activities or deal data. Use confidence "high" when evidence is explicit, "medium" when inferred, "low" when uncertain. Include all 12 categories in the array.

Be specific — reference actual activities, dates, and people from the data. Do not be generic. If the deal is at risk, say so directly. Keep coaching suggestions actionable and prioritized.

Return ONLY the JSON object, no markdown formatting or code blocks.`;

  return prompt;
}

/**
 * Build a compact summary of transcript coaching results for inclusion
 * in the deal analysis prompt. Uses the AI's own coaching output (not raw
 * transcripts) to keep token usage low even with many analyzed calls.
 *
 * Takes the 5 most recent coaching analyses and extracts key findings.
 */
function buildTranscriptCoachingContext(analyses: TranscriptAnalysis[]): string {
  if (analyses.length === 0) return "";

  // Take the 5 most recent analyses
  const recent = analyses
    .sort((a, b) => new Date(b.analyzed_at).getTime() - new Date(a.analyzed_at).getTime())
    .slice(0, 5);

  const summaries = recent.map((a, i) => {
    const date = new Date(a.analyzed_at).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const transcriptCount = a.transcript_ids?.length || 0;

    const parts = [
      `### Coaching ${i + 1} (${date}, ${transcriptCount} transcript${transcriptCount !== 1 ? "s" : ""})`,
      `**Summary:** ${a.overall_summary}`,
    ];

    if (a.strengths?.length > 0) {
      parts.push(`**Strengths:** ${a.strengths.join("; ")}`);
    }

    if (a.improvements?.length > 0) {
      parts.push(`**Areas to improve:** ${a.improvements.join("; ")}`);
    }

    // Include key sales coaching findings (compact)
    const sales = a.sales_coaching;
    if (sales) {
      const salesPoints: string[] = [];
      if (sales.discovery_quality) salesPoints.push(`Discovery: ${sales.discovery_quality}`);
      if (sales.deal_progression) salesPoints.push(`Progression: ${sales.deal_progression}`);
      if (salesPoints.length > 0) {
        parts.push(`**Sales notes:** ${salesPoints.join(" | ")}`);
      }
    }

    // Include key product coaching findings (compact)
    const product = a.product_coaching;
    if (product) {
      const productPoints: string[] = [];
      if (product.product_positioning) productPoints.push(`Positioning: ${product.product_positioning}`);
      if (product.missed_opportunities?.length > 0) {
        productPoints.push(`Missed: ${product.missed_opportunities.join("; ")}`);
      }
      if (productPoints.length > 0) {
        parts.push(`**Product notes:** ${productPoints.join(" | ")}`);
      }
    }

    return parts.join("\n");
  });

  return `
## Call Transcript Coaching Insights (${analyses.length} total coaching session${analyses.length !== 1 ? "s" : ""})
The following are AI coaching summaries from analyzed call transcripts for this deal. Use these insights to inform your deal health assessment — they reveal how conversations are actually going.

${summaries.join("\n\n---\n\n")}

`;
}
