"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { Transcript, TranscriptAnalysis } from "@/lib/transcript-types";
import TranscriptList from "@/components/TranscriptList";

interface Deal {
  id: string;
  account_name: string;
  opportunity_name: string;
}

const CALL_TYPES = ["Discovery", "Demo", "Follow-up", "Negotiation", "Technical", "Other"];

// ── Searchable deal picker ────────────────────────────────────────────────────

function DealSelector({
  deals,
  value,
  onChange,
}: {
  deals: Deal[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = query.trim()
    ? deals.filter(
        (d) =>
          d.account_name.toLowerCase().includes(query.toLowerCase()) ||
          d.opportunity_name.toLowerCase().includes(query.toLowerCase())
      )
    : deals;

  const selected = deals.find((d) => d.id === value);

  return (
    <div className="relative">
      <input
        type="text"
        placeholder="Search deals…"
        value={open ? query : selected ? `${selected.account_name} — ${selected.opportunity_name}` : ""}
        onFocus={() => {
          setOpen(true);
          setQuery("");
        }}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full border border-gray-200 rounded px-3 py-2 text-sm bg-white"
      />
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 z-20 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-sm text-gray-400">No deals found</p>
            ) : (
              filtered.map((d) => (
                <button
                  key={d.id}
                  onClick={() => {
                    onChange(d.id);
                    setOpen(false);
                    setQuery("");
                  }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                >
                  <span className="font-medium text-gray-900">{d.account_name}</span>
                  <span className="text-gray-400 ml-2">— {d.opportunity_name}</span>
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Shared metadata fields (call date + call type) ────────────────────────────

function MetadataFields({
  callDate,
  callType,
  onCallDateChange,
  onCallTypeChange,
}: {
  callDate: string;
  callType: string;
  onCallDateChange: (v: string) => void;
  onCallTypeChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex-1">
        <label className="text-xs text-gray-500 block mb-1">Call Date (optional)</label>
        <input
          type="date"
          value={callDate}
          onChange={(e) => onCallDateChange(e.target.value)}
          className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm"
        />
      </div>
      <div className="flex-1">
        <label className="text-xs text-gray-500 block mb-1">Call Type (optional)</label>
        <select
          value={callType}
          onChange={(e) => onCallTypeChange(e.target.value)}
          className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm bg-white"
        >
          <option value="">Select type…</option>
          {CALL_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

// ── Paste panel ───────────────────────────────────────────────────────────────

function PastePanel({
  deals,
  onSuccess,
}: {
  deals: Deal[];
  onSuccess: () => void;
}) {
  const [dealId, setDealId] = useState("");
  const [text, setText] = useState("");
  const [filename, setFilename] = useState("");
  const [callDate, setCallDate] = useState("");
  const [callType, setCallType] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  async function handleSubmit() {
    if (!dealId) { setError("Please select a deal."); return; }
    if (!text.trim()) { setError("Please paste a transcript."); return; }

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/upload-transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealId,
          transcriptText: text,
          filename: filename.trim() || undefined,
          callDate: callDate || undefined,
          callType: callType || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Upload failed");
        return;
      }

      const deal = deals.find((d) => d.id === dealId);
      setSuccessMsg(`Transcript saved to ${deal?.account_name || "deal"}`);
      setText("");
      setFilename("");
      setCallDate("");
      setCallType("");
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
      <div>
        <label className="text-xs text-gray-500 block mb-1">Deal <span className="text-red-400">*</span></label>
        <DealSelector deals={deals} value={dealId} onChange={setDealId} />
      </div>

      <MetadataFields
        callDate={callDate}
        callType={callType}
        onCallDateChange={setCallDate}
        onCallTypeChange={setCallType}
      />

      <div>
        <label className="text-xs text-gray-500 block mb-1">Label (optional)</label>
        <input
          type="text"
          value={filename}
          onChange={(e) => setFilename(e.target.value)}
          placeholder="e.g. Discovery call with Sarah"
          className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm"
        />
      </div>

      <div>
        <label className="text-xs text-gray-500 block mb-1">Transcript <span className="text-red-400">*</span></label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste the full call transcript here…"
          rows={10}
          className="w-full border border-gray-200 rounded px-3 py-2 text-sm font-mono leading-relaxed resize-y"
        />
        {text && (
          <p className="text-xs text-gray-400 mt-1">
            ~{text.trim().split(/\s+/).filter(Boolean).length.toLocaleString()} words
          </p>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {successMsg && <p className="text-sm text-green-600">{successMsg}</p>}

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className={`px-4 py-2 rounded text-sm font-medium ${
          submitting
            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
            : "bg-blue-600 text-white hover:bg-blue-700"
        }`}
      >
        {submitting ? "Saving…" : "Save Transcript"}
      </button>
    </div>
  );
}

// ── Upload panel ──────────────────────────────────────────────────────────────

function UploadPanel({
  deals,
  onSuccess,
}: {
  deals: Deal[];
  onSuccess: () => void;
}) {
  const [dealId, setDealId] = useState("");
  const [callDate, setCallDate] = useState("");
  const [callType, setCallType] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  async function uploadFiles(files: FileList | File[]) {
    const fileArr = Array.from(files);
    if (fileArr.length === 0) return;

    if (!dealId) {
      setError("Please select a deal first.");
      return;
    }

    setUploading(true);
    setError(null);
    setSuccessMsg(null);

    let failed = 0;
    for (let i = 0; i < fileArr.length; i++) {
      const file = fileArr[i];
      setProgress(`Uploading ${i + 1} of ${fileArr.length}: ${file.name}`);

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("dealId", dealId);
        if (callDate) formData.append("callDate", callDate);
        if (callType) formData.append("callType", callType);

        const res = await fetch("/api/upload-transcript", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    setUploading(false);
    setProgress(null);

    const deal = deals.find((d) => d.id === dealId);
    const succeeded = fileArr.length - failed;
    if (succeeded > 0) {
      setSuccessMsg(
        `${succeeded} transcript${succeeded !== 1 ? "s" : ""} uploaded to ${deal?.account_name || "deal"}${
          failed > 0 ? ` (${failed} failed)` : ""
        }`
      );
      onSuccess();
    } else {
      setError("All uploads failed. Check that files are .txt or .docx.");
    }
  }

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      if (e.dataTransfer.files.length > 0) uploadFiles(e.dataTransfer.files);
    },
    [dealId, callDate, callType] // eslint-disable-line react-hooks/exhaustive-deps
  );

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
      <div>
        <label className="text-xs text-gray-500 block mb-1">Deal <span className="text-red-400">*</span></label>
        <DealSelector deals={deals} value={dealId} onChange={setDealId} />
      </div>

      <MetadataFields
        callDate={callDate}
        callType={callType}
        onCallDateChange={setCallDate}
        onCallTypeChange={setCallType}
      />

      <div
        className={`rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
          dragActive ? "border-blue-400 bg-blue-50" : "border-gray-200 bg-gray-50"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
      >
        {uploading ? (
          <div>
            <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent mb-2" />
            <p className="text-sm text-gray-500">{progress}</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-1">
              Drag and drop transcript files here
            </p>
            <p className="text-xs text-gray-400 mb-3">
              Accepts .txt and .docx — select multiple files at once
            </p>
            <label className="inline-block bg-blue-600 text-white px-4 py-2 rounded text-sm cursor-pointer hover:bg-blue-700">
              Choose Files
              <input
                type="file"
                accept=".txt,.docx"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    uploadFiles(e.target.files);
                    e.target.value = "";
                  }
                }}
              />
            </label>
          </>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {successMsg && <p className="text-sm text-green-600">{successMsg}</p>}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function TranscriptsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [analyses, setAnalyses] = useState<TranscriptAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<"paste" | "upload" | null>(null);
  const [filterDealId, setFilterDealId] = useState<string>("all");

  const loadData = useCallback(async () => {
    try {
      const [dealsRes, transcriptsRes, analysesRes] = await Promise.all([
        supabase.from("deals").select("id, account_name, opportunity_name").order("account_name"),
        supabase.from("transcripts").select("*").order("uploaded_at", { ascending: false }),
        supabase.from("transcript_analyses").select("*").order("analyzed_at", { ascending: false }),
      ]);

      if (dealsRes.error) throw dealsRes.error;
      if (transcriptsRes.error) throw transcriptsRes.error;
      if (analysesRes.error) throw analysesRes.error;

      setDeals((dealsRes.data as Deal[]) || []);
      setTranscripts((transcriptsRes.data as Transcript[]) || []);
      setAnalyses((analysesRes.data as TranscriptAnalysis[]) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    function handleVisibility() {
      if (document.visibilityState === "visible") loadData();
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [loadData]);

  // Build deal names map for TranscriptList
  const dealNames: Record<string, string> = {};
  for (const d of deals) {
    dealNames[d.id] = d.account_name;
  }

  // Deals that have at least one transcript (for filter dropdown)
  const dealsWithTranscripts = deals.filter((d) =>
    transcripts.some((t) => t.deal_id === d.id)
  );

  // Filtered transcript list
  const visibleTranscripts =
    filterDealId === "all"
      ? transcripts
      : transcripts.filter((t) => t.deal_id === filterDealId);

  // TranscriptList needs a single dealId — use empty string when showing all
  // (the component uses it only for the analyze API call, which always passes transcriptId too)
  const listDealId = filterDealId === "all" ? "" : filterDealId;

  function handleDelete(id: string) {
    setTranscripts((prev) => prev.filter((t) => t.id !== id));
  }

  if (loading) {
    return (
      <div className="text-center py-12 text-gray-400 text-sm">Loading transcripts…</div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-gray-900">Transcripts</h1>
          {transcripts.length > 0 && (
            <span className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full">
              {transcripts.length}
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setActivePanel(activePanel === "paste" ? null : "paste")}
            className={`text-sm px-4 py-1.5 rounded font-medium border ${
              activePanel === "paste"
                ? "bg-blue-600 text-white border-blue-600"
                : "border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            Paste Transcript
          </button>
          <button
            onClick={() => setActivePanel(activePanel === "upload" ? null : "upload")}
            className={`text-sm px-4 py-1.5 rounded font-medium border ${
              activePanel === "upload"
                ? "bg-blue-600 text-white border-blue-600"
                : "border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            Upload Files
          </button>
        </div>
      </div>

      {/* Input panels */}
      {activePanel === "paste" && (
        <PastePanel
          deals={deals}
          onSuccess={() => {
            loadData();
            setActivePanel(null);
          }}
        />
      )}
      {activePanel === "upload" && (
        <UploadPanel
          deals={deals}
          onSuccess={() => {
            loadData();
          }}
        />
      )}

      {/* Filter bar */}
      {dealsWithTranscripts.length > 1 && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">Filter by deal:</span>
          <select
            value={filterDealId}
            onChange={(e) => setFilterDealId(e.target.value)}
            className="border border-gray-200 rounded px-3 py-1.5 text-sm bg-white"
          >
            <option value="all">All Deals</option>
            {dealsWithTranscripts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.account_name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Transcript list */}
      {transcripts.length === 0 ? (
        <div className="text-center py-16">
          <h2 className="text-lg font-medium text-gray-700 mb-2">No transcripts yet</h2>
          <p className="text-sm text-gray-500">
            Paste a transcript or upload files using the buttons above.
          </p>
        </div>
      ) : (
        <TranscriptList
          dealId={listDealId}
          transcripts={visibleTranscripts}
          analyses={analyses}
          onDelete={handleDelete}
          onNewAnalysis={loadData}
          showDealName={true}
          dealNames={dealNames}
        />
      )}
    </div>
  );
}
