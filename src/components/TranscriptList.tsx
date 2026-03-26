"use client";

import { useState } from "react";
import type { Transcript, TranscriptAnalysis } from "@/lib/transcript-types";

interface TranscriptListProps {
  dealId: string;
  transcripts: Transcript[];
  analyses: TranscriptAnalysis[];
  onDelete: (id: string) => void;
  onNewAnalysis: () => void;
  showDealName?: boolean;
  dealNames?: Record<string, string>;
}

/**
 * Render text that may contain **bold** markdown markers.
 */
function renderBold(text: string) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="font-semibold">{part}</strong> : part
  );
}

export default function TranscriptList({
  dealId,
  transcripts,
  analyses,
  onDelete,
  onNewAnalysis,
  showDealName = false,
  dealNames = {},
}: TranscriptListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [confirmAnalyzeId, setConfirmAnalyzeId] = useState<string | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  // Build a map of transcript ID → its coaching analyses (most recent first)
  const analysesByTranscript = new Map<string, TranscriptAnalysis[]>();
  for (const a of analyses) {
    for (const tid of a.transcript_ids || []) {
      const existing = analysesByTranscript.get(tid) || [];
      existing.push(a);
      analysesByTranscript.set(tid, existing);
    }
  }

  if (transcripts.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-3">
        No transcripts uploaded yet.
      </p>
    );
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const response = await fetch("/api/upload-transcript", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcriptId: id }),
      });

      if (response.ok) {
        onDelete(id);
      }
    } finally {
      setDeletingId(null);
    }
  }

  async function handleAnalyze(transcriptId: string, transcriptDealId: string) {
    setConfirmAnalyzeId(null);
    setAnalyzingId(transcriptId);
    setAnalyzeError(null);

    try {
      const response = await fetch("/api/analyze-transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealId: transcriptDealId || dealId, transcriptId }),
      });

      const data = await response.json();

      if (!response.ok) {
        const detail = data.raw_response ? `\n\nGemini said: ${data.raw_response}` : "";
        setAnalyzeError((data.error || "Analysis failed") + detail);
        return;
      }

      onNewAnalysis();
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : "Network error");
    } finally {
      setAnalyzingId(null);
    }
  }

  return (
    <div className="space-y-2">
      {analyzeError && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
          {analyzeError}
        </div>
      )}

      {transcripts.map((t) => {
        const isExpanded = expandedId === t.id;
        const coachingSessions = analysesByTranscript.get(t.id) || [];
        const hasCoaching = coachingSessions.length > 0;
        const isAnalyzing = analyzingId === t.id;

        return (
          <div key={t.id} className="border border-gray-100 rounded-lg">
            {/* Header row */}
            <div className="flex items-center gap-3 px-4 py-3">
              <button
                onClick={() => setExpandedId(isExpanded ? null : t.id)}
                className="flex-1 flex items-center gap-3 text-left hover:bg-gray-50 -mx-1 px-1 rounded min-w-0"
              >
                <span className="text-sm font-medium text-gray-900 truncate">
                  {t.filename}
                </span>
                {showDealName && dealNames[t.deal_id] && (
                  <span className="shrink-0 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded truncate max-w-[160px]">
                    {dealNames[t.deal_id]}
                  </span>
                )}
                {t.call_type && (
                  <span className="shrink-0 bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs">
                    {t.call_type}
                  </span>
                )}
                {hasCoaching && (
                  <span className="shrink-0 bg-purple-50 text-purple-700 px-2 py-0.5 rounded text-xs">
                    Coached
                  </span>
                )}
                <span className="shrink-0 text-xs text-gray-400">
                  {t.word_count.toLocaleString()} words
                </span>
                {t.speaker_labels.length > 0 && (
                  <span className="shrink-0 text-xs text-gray-400">
                    {t.speaker_labels.length} speaker{t.speaker_labels.length !== 1 ? "s" : ""}
                  </span>
                )}
                <span className="shrink-0 text-xs text-gray-400">
                  {isExpanded ? "\u25B2" : "\u25BC"}
                </span>
              </button>

              <span className="shrink-0 text-xs text-gray-400">
                {t.call_date
                  ? new Date(t.call_date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  : new Date(t.uploaded_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
              </span>

              <button
                onClick={() => handleDelete(t.id)}
                disabled={deletingId === t.id}
                className="shrink-0 text-xs text-red-400 hover:text-red-600 disabled:opacity-50"
              >
                {deletingId === t.id ? "..." : "Delete"}
              </button>
            </div>

            {/* Expanded content */}
            {isExpanded && (
              <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-4">
                {/* Speakers */}
                {t.speaker_labels.length > 0 && (
                  <div>
                    <span className="text-xs font-medium text-gray-500">Speakers: </span>
                    <span className="text-xs text-gray-700">
                      {t.speaker_labels.join(", ")}
                    </span>
                  </div>
                )}

                {/* Transcript preview */}
                <pre className="text-xs text-gray-600 whitespace-pre-wrap font-sans leading-relaxed max-h-64 overflow-y-auto bg-gray-50 rounded p-3">
                  {t.transcript_text.length > 3000
                    ? t.transcript_text.slice(0, 3000) + "\n\n[...preview truncated]"
                    : t.transcript_text}
                </pre>

                {/* Get Coaching button */}
                {isAnalyzing ? (
                  <div className="text-center py-3">
                    <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-purple-600 border-t-transparent mb-2"></div>
                    <p className="text-xs text-gray-500">Analyzing this call...</p>
                  </div>
                ) : confirmAnalyzeId === t.id ? (
                  <div className="bg-purple-50 border border-purple-200 rounded p-3 flex items-center justify-between">
                    <p className="text-xs text-purple-700">
                      Send this transcript to Gemini for coaching? One API call will be used.
                    </p>
                    <div className="flex gap-2 shrink-0 ml-3">
                      <button
                        onClick={() => handleAnalyze(t.id, t.deal_id)}
                        className="text-xs bg-purple-600 text-white px-2.5 py-1 rounded hover:bg-purple-700"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setConfirmAnalyzeId(null)}
                        className="text-xs text-gray-500 hover:underline"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmAnalyzeId(t.id)}
                    className="bg-purple-600 text-white px-3 py-1.5 rounded text-xs hover:bg-purple-700"
                  >
                    {hasCoaching ? "Re-analyze Call" : "Get Coaching"}
                  </button>
                )}

                {/* Coaching results */}
                {coachingSessions.map((a, sessionIdx) => (
                  <CoachingSession
                    key={a.id}
                    analysis={a}
                    sessionNumber={coachingSessions.length > 1 ? sessionIdx + 1 : undefined}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * A single coaching session's results, displayed inline under a transcript.
 */
function CoachingSession({
  analysis,
  sessionNumber,
}: {
  analysis: TranscriptAnalysis;
  sessionNumber?: number;
}) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["summary", "strengths", "improvements"])
  );

  function toggleSection(section: string) {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  }

  const sales = analysis.sales_coaching;
  const product = analysis.product_coaching;
  const date = new Date(analysis.analyzed_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="border border-purple-100 rounded-lg bg-purple-50/30 p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-medium text-purple-700 uppercase">
          {sessionNumber ? `Coaching Session ${sessionNumber}` : "Coaching"}
        </h4>
        <span className="text-xs text-gray-400">{date}</span>
      </div>

      {/* Overall Summary */}
      <CollapsibleSection
        title="Overall Summary"
        isOpen={expandedSections.has("summary")}
        onToggle={() => toggleSection("summary")}
      >
        <p className="text-sm text-gray-800 leading-relaxed">
          {renderBold(analysis.overall_summary)}
        </p>
      </CollapsibleSection>

      {/* Strengths */}
      {analysis.strengths && analysis.strengths.length > 0 && (
        <CollapsibleSection
          title="Strengths"
          isOpen={expandedSections.has("strengths")}
          onToggle={() => toggleSection("strengths")}
          headerColor="text-green-600"
        >
          <ul className="space-y-1.5">
            {analysis.strengths.map((s, i) => (
              <li key={i} className="text-sm text-gray-700 bg-green-50 rounded px-3 py-2">
                {renderBold(s)}
              </li>
            ))}
          </ul>
        </CollapsibleSection>
      )}

      {/* Areas for Improvement */}
      {analysis.improvements && analysis.improvements.length > 0 && (
        <CollapsibleSection
          title="Areas for Improvement"
          isOpen={expandedSections.has("improvements")}
          onToggle={() => toggleSection("improvements")}
          headerColor="text-amber-600"
        >
          <ul className="space-y-1.5">
            {analysis.improvements.map((s, i) => (
              <li key={i} className="text-sm text-gray-700 bg-amber-50 rounded px-3 py-2">
                {renderBold(s)}
              </li>
            ))}
          </ul>
        </CollapsibleSection>
      )}

      {/* Sales Coaching */}
      {sales && (
        <CollapsibleSection
          title="Sales Coaching"
          isOpen={expandedSections.has("sales")}
          onToggle={() => toggleSection("sales")}
          headerColor="text-blue-600"
        >
          <div className="space-y-3">
            <CoachingItem label="Technique" text={sales.technique_assessment} />
            <CoachingItem label="Discovery Quality" text={sales.discovery_quality} />
            <CoachingItem label="Next Steps" text={sales.next_steps_quality} />
            <CoachingItem label="Deal Progression" text={sales.deal_progression} />

            {sales.objection_handling && sales.objection_handling.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Objection Handling</p>
                <ul className="space-y-1">
                  {sales.objection_handling.map((item, i) => (
                    <li key={i} className="text-sm text-gray-700 bg-blue-50 rounded px-3 py-2">
                      {renderBold(item)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CollapsibleSection>
      )}

      {/* Product Coaching */}
      {product && (
        <CollapsibleSection
          title="Product Coaching"
          isOpen={expandedSections.has("product")}
          onToggle={() => toggleSection("product")}
          headerColor="text-indigo-600"
        >
          <div className="space-y-3">
            <CoachingItem label="Positioning" text={product.product_positioning} />
            <CoachingItem label="Competitive Handling" text={product.competitive_handling} />

            {product.feature_mentions && product.feature_mentions.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Feature Mentions</p>
                <ul className="space-y-1">
                  {product.feature_mentions.map((item, i) => (
                    <li key={i} className="text-sm text-gray-700 bg-indigo-50 rounded px-3 py-2">
                      {renderBold(item)}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {product.missed_opportunities && product.missed_opportunities.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Missed Opportunities</p>
                <ul className="space-y-1">
                  {product.missed_opportunities.map((item, i) => (
                    <li key={i} className="text-sm text-gray-700 bg-amber-50 rounded px-3 py-2">
                      {renderBold(item)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CollapsibleSection>
      )}

      {/* Token usage footer */}
      <div className="mt-3 pt-2 border-t border-purple-100 text-xs text-gray-400">
        ~{analysis.input_tokens?.toLocaleString()} input,{" "}
        ~{analysis.output_tokens?.toLocaleString()} output tokens
      </div>
    </div>
  );
}

/**
 * Collapsible section with header toggle.
 */
function CollapsibleSection({
  title,
  isOpen,
  onToggle,
  headerColor = "text-gray-700",
  children,
}: {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  headerColor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 w-full text-left mb-1.5"
      >
        <h3 className={`text-xs font-medium uppercase ${headerColor}`}>
          {title}
        </h3>
        <span className="text-xs text-gray-400">{isOpen ? "\u25B2" : "\u25BC"}</span>
      </button>
      {isOpen && children}
    </div>
  );
}

/**
 * Single coaching item with label and text.
 */
function CoachingItem({ label, text }: { label: string; text: string }) {
  if (!text) return null;
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <p className="text-sm text-gray-700">{renderBold(text)}</p>
    </div>
  );
}
