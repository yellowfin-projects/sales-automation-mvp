"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { calculateDealMetrics } from "@/lib/metrics";
import { DETAILED_STAGES, CHECKLIST_CATEGORIES } from "@/lib/deal-config";
import AnalysisPanel from "@/components/AnalysisPanel";
import DealHistoryTimeline from "@/components/DealHistoryTimeline";
import TranscriptUploader from "@/components/TranscriptUploader";
import TranscriptList from "@/components/TranscriptList";
import type {
  Deal,
  Activity,
  Analysis,
  DealHistory,
  DealMetrics,
  DealChecklistItem,
  DealNote,
} from "@/lib/types";
import type { Transcript, TranscriptAnalysis } from "@/lib/transcript-types";

interface DealSlideOverProps {
  dealId: string;
  onClose: () => void;
  onDataChange: () => void; // called when key deal / detailed stage / checklist changes
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function trendLabel(trend: DealMetrics["activity_trend"]): string {
  switch (trend) {
    case "accelerating": return "Accelerating";
    case "decelerating": return "Decelerating";
    case "steady": return "Steady";
    case "new": return "New";
  }
}

function trendColor(trend: DealMetrics["activity_trend"]): string {
  switch (trend) {
    case "accelerating": return "text-green-600 bg-green-50";
    case "decelerating": return "text-red-600 bg-red-50";
    case "steady": return "text-blue-600 bg-blue-50";
    case "new": return "text-gray-600 bg-gray-50";
  }
}

function activityTypeBadge(type: string): string {
  switch (type) {
    case "Email": return "bg-purple-100 text-purple-700";
    case "Call": return "bg-green-100 text-green-700";
    default: return "bg-gray-100 text-gray-600";
  }
}

export default function DealSlideOver({ dealId, onClose, onDataChange }: DealSlideOverProps) {
  const [deal, setDeal] = useState<Deal | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [metrics, setMetrics] = useState<DealMetrics | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [history, setHistory] = useState<DealHistory[]>([]);
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [transcriptAnalyses, setTranscriptAnalyses] = useState<TranscriptAnalysis[]>([]);
  const [checklist, setChecklist] = useState<DealChecklistItem[]>([]);
  const [notes, setNotes] = useState<DealNote[]>([]);
  const [newNote, setNewNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [expandedActivity, setExpandedActivity] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingKeyDeal, setSavingKeyDeal] = useState(false);
  const [savingDetailedStage, setSavingDetailedStage] = useState(false);

  const loadDeal = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        { data: dealData, error: dealError },
        { data: activitiesData, error: actError },
        { data: analysisData },
        { data: historyData },
        { data: transcriptsData },
        { data: transcriptAnalysesData },
        { data: checklistData },
        { data: notesData },
      ] = await Promise.all([
        supabase.from("deals").select("*").eq("id", dealId).single(),
        supabase.from("activities").select("*").eq("deal_id", dealId).order("activity_date", { ascending: false }),
        supabase.from("analyses").select("*").eq("deal_id", dealId).order("analyzed_at", { ascending: false }).limit(1).single(),
        supabase.from("deal_history").select("*").eq("deal_id", dealId).order("changed_at", { ascending: false }),
        supabase.from("transcripts").select("*").eq("deal_id", dealId).order("uploaded_at", { ascending: false }),
        supabase.from("transcript_analyses").select("*").eq("deal_id", dealId).order("analyzed_at", { ascending: false }),
        supabase.from("deal_checklist").select("*").eq("deal_id", dealId),
        supabase.from("deal_notes").select("*").eq("deal_id", dealId).order("created_at", { ascending: false }),
      ]);

      if (dealError) throw dealError;
      if (actError) throw actError;

      setDeal(dealData as Deal);
      setActivities((activitiesData as Activity[]) || []);
      setAnalysis(analysisData as Analysis | null);
      setHistory((historyData as DealHistory[]) || []);
      setTranscripts((transcriptsData as Transcript[]) || []);
      setTranscriptAnalyses((transcriptAnalysesData as TranscriptAnalysis[]) || []);
      setChecklist((checklistData as DealChecklistItem[]) || []);
      setNotes((notesData as DealNote[]) || []);
      setMetrics(calculateDealMetrics(dealData as Deal, (activitiesData as Activity[]) || []));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load deal");
    } finally {
      setLoading(false);
    }
  }, [dealId]);

  useEffect(() => {
    loadDeal();
  }, [loadDeal]);

  // Close on Escape key
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  async function toggleKeyDeal() {
    if (!deal) return;
    setSavingKeyDeal(true);
    try {
      const response = await fetch(`/api/deals/${deal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_key_deal: !deal.is_key_deal }),
      });
      if (response.ok) {
        setDeal((prev) => prev ? { ...prev, is_key_deal: !prev.is_key_deal } : prev);
        onDataChange();
      }
    } finally {
      setSavingKeyDeal(false);
    }
  }

  async function handleDetailedStageChange(value: string) {
    if (!deal) return;
    setSavingDetailedStage(true);
    try {
      const newValue = value === "" ? null : value;
      const response = await fetch(`/api/deals/${deal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ detailed_stage: newValue }),
      });
      if (response.ok) {
        setDeal((prev) => prev ? { ...prev, detailed_stage: newValue } : prev);
        onDataChange();
      }
    } finally {
      setSavingDetailedStage(false);
    }
  }

  async function toggleChecklistItem(category: string) {
    if (!deal) return;
    const existing = checklist.find((i) => i.category === category);
    const newCompleted = !(existing?.completed ?? false);

    // Optimistic update
    setChecklist((prev) => {
      const idx = prev.findIndex((i) => i.category === category);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], completed: newCompleted, source: "user" };
        return next;
      }
      return [
        ...prev,
        {
          id: crypto.randomUUID(),
          deal_id: deal.id,
          category,
          completed: newCompleted,
          source: "user",
          ai_confidence: "",
          updated_at: new Date().toISOString(),
        },
      ];
    });

    const response = await fetch(`/api/deals/${deal.id}/checklist`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, completed: newCompleted }),
    });

    if (!response.ok) {
      // Revert on failure
      setChecklist((prev) => {
        const idx = prev.findIndex((i) => i.category === category);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], completed: !newCompleted };
          return next;
        }
        return prev;
      });
    } else {
      onDataChange();
    }
  }

  async function addNote() {
    if (!deal || !newNote.trim()) return;
    setSavingNote(true);
    try {
      const response = await fetch(`/api/deals/${deal.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newNote.trim() }),
      });
      if (response.ok) {
        const { note } = await response.json();
        setNotes((prev) => [note as DealNote, ...prev]);
        setNewNote("");
      }
    } finally {
      setSavingNote(false);
    }
  }

  const detailedStageOptions = deal ? (DETAILED_STAGES[deal.stage] || []) : [];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl z-50 flex flex-col">
        {/* Header bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0 bg-white">
          <div className="min-w-0 flex-1 mr-4">
            {loading ? (
              <div className="h-5 w-48 bg-gray-100 rounded animate-pulse" />
            ) : (
              <h2 className="text-base font-semibold text-gray-900 truncate">
                {deal?.opportunity_name}
              </h2>
            )}
            {deal && (
              <p className="text-xs text-gray-500 mt-0.5">{deal.account_name}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {deal && (
              <button
                onClick={toggleKeyDeal}
                disabled={savingKeyDeal}
                title={deal.is_key_deal ? "Remove Key Deal flag" : "Mark as Key Deal"}
                className={`text-xl px-1 transition-colors ${
                  deal.is_key_deal
                    ? "text-yellow-400 hover:text-yellow-500"
                    : "text-gray-300 hover:text-yellow-400"
                }`}
              >
                {deal.is_key_deal ? "★" : "☆"}
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl font-light px-1"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center h-32 text-sm text-gray-400">
              Loading deal...
            </div>
          )}

          {error && (
            <div className="m-6 bg-red-50 border border-red-200 rounded p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {!loading && deal && metrics && (
            <div className="p-6 space-y-6">

              {/* Deal header */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      deal.stage.includes("Closed Lost") ? "bg-red-100 text-red-700" :
                      deal.stage.includes("Closed Won") ? "bg-green-100 text-green-700" :
                      deal.stage.includes("Commit") ? "bg-blue-100 text-blue-700" :
                      "bg-gray-100 text-gray-700"
                    }`}>
                      {deal.stage}
                    </span>
                    {detailedStageOptions.length > 0 && (
                      <div className="flex items-center gap-1">
                        <span className="text-gray-300 text-xs">→</span>
                        <select
                          value={deal.detailed_stage || ""}
                          onChange={(e) => handleDetailedStageChange(e.target.value)}
                          disabled={savingDetailedStage}
                          className="text-xs border border-gray-200 rounded px-2 py-0.5 text-gray-700 bg-white focus:outline-none focus:border-blue-400"
                        >
                          <option value="">Set detailed stage...</option>
                          {detailedStageOptions.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-sm">
                    <div>
                      <span className="text-gray-500 text-xs">Close Date</span>
                      <p className={`font-medium text-sm ${metrics.is_overdue ? "text-red-600" : "text-gray-900"}`}>
                        {formatDate(deal.close_date)}
                        {metrics.is_overdue && <span className="text-xs ml-1">(overdue)</span>}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs">Owner</span>
                      <p className="font-medium text-sm text-gray-900">{deal.owner}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs">Region</span>
                      <p className="font-medium text-sm text-gray-900">{deal.region}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs">Probability</span>
                      <p className="font-medium text-sm text-gray-900">{deal.probability}%</p>
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-2xl font-semibold text-gray-900">
                    {formatCurrency(deal.amount)}
                  </p>
                </div>
              </div>

              {/* Notes */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-800 mb-3">Notes</h3>

                {/* Add note input */}
                <div className="flex gap-2 mb-3">
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) addNote();
                    }}
                    placeholder="Add a note... (⌘↵ to save)"
                    rows={2}
                    className="flex-1 text-sm border border-gray-200 rounded px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-400 resize-none"
                  />
                  <button
                    onClick={addNote}
                    disabled={savingNote || !newNote.trim()}
                    className="self-end px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {savingNote ? "Saving..." : "Add"}
                  </button>
                </div>

                {/* Existing notes */}
                {notes.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-2">No notes yet</p>
                ) : (
                  <div className="space-y-2">
                    {notes.map((note) => (
                      <div key={note.id} className="bg-gray-50 rounded-lg px-3 py-2.5">
                        <p className="text-xs text-gray-400 mb-1">
                          {new Date(note.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </p>
                        <p className="text-sm text-gray-800 whitespace-pre-wrap">{note.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Close Plan Checklist */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-800">Close Plan Checklist</h3>
                  <span className="text-xs text-gray-400">
                    {checklist.filter((i) => i.completed).length} / {CHECKLIST_CATEGORIES.length} complete
                    {" · "}AI auto-detects when you run Analyze Deal
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {CHECKLIST_CATEGORIES.map((category) => {
                    const item = checklist.find((i) => i.category === category);
                    const completed = item?.completed ?? false;
                    const isAI = item?.source === "ai";
                    return (
                      <button
                        key={category}
                        onClick={() => toggleChecklistItem(category)}
                        className={`flex items-center gap-2 px-3 py-2 rounded text-left text-sm transition-colors ${
                          completed
                            ? "bg-green-50 text-green-800 hover:bg-green-100"
                            : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        <span className={`text-base shrink-0 ${completed ? "text-green-500" : "text-gray-300"}`}>
                          {completed ? "✓" : "○"}
                        </span>
                        <span className="flex-1">{category}</span>
                        {isAI && (
                          <span className="text-xs text-gray-400 shrink-0" title="Detected by AI">
                            AI
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Deal Health Metrics */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-800 mb-3">Deal Health</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <MetricCard
                    label="Days Since Activity"
                    value={`${metrics.days_since_last_activity}d`}
                    color={
                      metrics.days_since_last_activity <= 7 ? "text-green-600" :
                      metrics.days_since_last_activity <= 14 ? "text-yellow-600" :
                      "text-red-600"
                    }
                  />
                  <MetricCard
                    label="Days to Close"
                    value={metrics.is_overdue ? "Overdue" : `${metrics.days_to_close}d`}
                    color={metrics.is_overdue ? "text-red-600" : "text-gray-900"}
                  />
                  <MetricCard
                    label="Total Activities"
                    value={String(metrics.total_activities)}
                    subtitle={`${metrics.email_count} emails, ${metrics.call_count} calls`}
                  />
                  <MetricCard
                    label="Stakeholders"
                    value={String(metrics.stakeholder_count)}
                    subtitle="From call attendees"
                  />
                  <div>
                    <p className="text-xs font-medium text-gray-600">Activity Trend</p>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${trendColor(metrics.activity_trend)}`}>
                      {trendLabel(metrics.activity_trend)}
                    </span>
                  </div>
                  <MetricCard
                    label="Max Activity Gap"
                    value={`${metrics.max_activity_gap_days}d`}
                    subtitle="Longest silence"
                  />
                </div>
              </div>

              {/* Deal History */}
              <DealHistoryTimeline history={history} />

              {/* AI Analysis */}
              <AnalysisPanel
                dealId={deal.id}
                existingAnalysis={analysis}
                repProbability={deal.probability}
                onAnalysisComplete={loadDeal}
              />

              {/* Call Transcripts */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-800 mb-3">
                  Call Transcripts{transcripts.length > 0 ? ` (${transcripts.length})` : ""}
                </h3>
                <TranscriptList
                  dealId={deal.id}
                  transcripts={transcripts}
                  analyses={transcriptAnalyses}
                  onDelete={(id) => setTranscripts((prev) => prev.filter((t) => t.id !== id))}
                  onNewAnalysis={loadDeal}
                />
                <div className="mt-4">
                  <TranscriptUploader dealId={deal.id} onUploadComplete={loadDeal} />
                </div>
              </div>

              {/* Activity Timeline */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-800 mb-3">
                  Activity Timeline ({activities.length})
                </h3>
                <div className="space-y-1.5">
                  {activities.map((activity) => {
                    const isExpanded = expandedActivity === activity.id;
                    const hasComments = activity.full_comments?.trim();
                    const isChorus =
                      activity.activity_type === "Call" &&
                      activity.full_comments?.includes("MEETING SUMMARY:");

                    return (
                      <div
                        key={activity.id}
                        className={`border rounded-lg ${isChorus ? "border-green-200" : "border-gray-100"}`}
                      >
                        <button
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50"
                          onClick={() =>
                            hasComments
                              ? setExpandedActivity(isExpanded ? null : activity.id)
                              : undefined
                          }
                        >
                          <span className="text-xs text-gray-400 w-20 shrink-0">
                            {formatDate(activity.activity_date)}
                          </span>
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium shrink-0 ${activityTypeBadge(activity.activity_type)}`}>
                            {activity.activity_type || "Other"}
                          </span>
                          <span className="text-sm text-gray-900 truncate flex-1">
                            {activity.subject}
                          </span>
                          {hasComments && (
                            <span className="text-xs text-gray-400 shrink-0">
                              {isExpanded ? "▲" : "▼"}
                            </span>
                          )}
                        </button>
                        {isExpanded && hasComments && (
                          <div className="px-3 pb-3 border-t border-gray-100 pt-2">
                            <pre className="text-xs text-gray-600 whitespace-pre-wrap font-sans leading-relaxed">
                              {activity.full_comments}
                            </pre>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {activities.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-4">
                      No activities recorded yet.
                    </p>
                  )}
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </>
  );
}

function MetricCard({
  label,
  value,
  subtitle,
  color = "text-gray-900",
}: {
  label: string;
  value: string;
  subtitle?: string;
  color?: string;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-600">{label}</p>
      <p className={`text-lg font-semibold mt-0.5 ${color}`}>{value}</p>
      {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
    </div>
  );
}
