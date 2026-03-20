import type { Deal } from "./types";
import type { Transcript } from "./transcript-types";

const MAX_TRANSCRIPTS = 5;
const MAX_WORDS_PER_TRANSCRIPT = 20000;

/**
 * Build the coaching analysis prompt from transcripts + deal context + product knowledge.
 * Sends full transcript text (not summarized) for detailed coaching.
 */
export function buildTranscriptCoachingPrompt(
  deal: Deal,
  transcripts: Transcript[],
  productKnowledge: string
): string {
  // Take the 5 most recent transcripts
  const recent = transcripts
    .sort((a, b) => {
      const dateA = a.call_date || a.uploaded_at;
      const dateB = b.call_date || b.uploaded_at;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    })
    .slice(0, MAX_TRANSCRIPTS);

  const transcriptSections = recent.map((t) => {
    let text = t.transcript_text;
    const words = text.split(/\s+/);
    if (words.length > MAX_WORDS_PER_TRANSCRIPT) {
      text = words.slice(0, MAX_WORDS_PER_TRANSCRIPT).join(" ") +
        `\n\n[...truncated at ${MAX_WORDS_PER_TRANSCRIPT.toLocaleString()} words]`;
    }

    const dateStr = t.call_date
      ? new Date(t.call_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : "Date unknown";

    return `### ${t.filename} (${dateStr}, ${t.word_count.toLocaleString()} words)
${t.speaker_labels.length > 0 ? `Speakers: ${t.speaker_labels.join(", ")}\n` : ""}
${text}`;
  });

  const productSection = productKnowledge.trim()
    ? `## Product Context
${productKnowledge.trim()}`
    : `## Product Context
No product knowledge document has been configured. Provide general B2B software sales coaching only.`;

  return `You are a sales coaching expert analyzing call transcripts for a B2B software sales team. Your job is to provide specific, actionable coaching that references actual dialogue from the transcripts.

${productSection}

## Deal Context
- **Opportunity:** ${deal.opportunity_name}
- **Account:** ${deal.account_name}
- **Stage:** ${deal.stage}
- **Amount:** $${deal.amount.toLocaleString()}
- **Close Date:** ${deal.close_date}
- **Owner:** ${deal.owner}

## Transcript(s)
${transcriptSections.join("\n\n---\n\n")}

## Instructions
Analyze the call transcript(s) above and return a JSON object with exactly these fields:

{
  "overall_summary": "2-3 sentence summary of the call(s) and where this deal stands",
  "sales_coaching": {
    "technique_assessment": "Overall assessment of sales technique used in the call(s)",
    "objection_handling": ["How a specific objection was handled, with quote and suggestion"],
    "discovery_quality": "Assessment of discovery questions asked and information gathered",
    "next_steps_quality": "Assessment of how next steps were established at the end of the call",
    "deal_progression": "How well the call moved the deal forward toward close"
  },
  "product_coaching": {
    "product_positioning": "How well the product was positioned against the prospect's needs",
    "feature_mentions": ["Feature X was mentioned in context of Y — good/could improve because..."],
    "competitive_handling": "How competitive mentions or comparisons were handled",
    "missed_opportunities": ["Specific moment where a product capability could have been mentioned but wasn't, with quote"]
  },
  "strengths": ["Specific thing done well WITH a direct quote from the transcript"],
  "improvements": ["Specific thing to improve WITH a direct quote AND a suggested alternative phrasing"]
}

IMPORTANT:
- Be SPECIFIC. Every strength and improvement MUST include a direct quote from the transcript.
- For improvements, always suggest an alternative way to phrase or handle the situation.
- Reference actual dialogue, not generic advice.
- If product knowledge is provided, evaluate how well product features and differentiators were communicated.

Return ONLY the JSON object, no markdown formatting or code blocks.`;
}
