"use client";

import { useState, useCallback } from "react";
import { parseCsvFile } from "@/lib/csv-parser";
import { processCsvRows } from "@/lib/csv-processor";
import type { CsvRow, UploadResult } from "@/lib/types";

interface CsvUploaderProps {
  onUploadComplete: () => void;
}

type UploadState = "idle" | "parsed" | "uploading" | "done" | "error";

export default function CsvUploader({ onUploadComplete }: CsvUploaderProps) {
  const [state, setState] = useState<UploadState>("idle");
  const [filename, setFilename] = useState("");
  const [parsedRows, setParsedRows] = useState<CsvRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith(".csv")) {
      setParseErrors(["Please upload a CSV file"]);
      setState("error");
      return;
    }

    setFilename(file.name);
    setState("uploading"); // briefly show loading while parsing

    const { rows, errors } = await parseCsvFile(file);

    if (errors.length > 0 && rows.length === 0) {
      setParseErrors(errors);
      setState("error");
      return;
    }

    setParsedRows(rows);
    setParseErrors(errors);

    // Show preview stats
    const uniqueDeals = new Set(rows.map((r) => r["Opportunity Name"]));
    const uniqueAccounts = new Set(rows.map((r) => r["Account Name"]));
    console.log(
      `Parsed ${rows.length} rows, ${uniqueDeals.size} deals, ${uniqueAccounts.size} accounts`
    );

    setState("parsed");
  }, []);

  const handleConfirmUpload = async () => {
    setState("uploading");
    try {
      const result = await processCsvRows(parsedRows, filename);
      setUploadResult(result);
      setState("done");
      onUploadComplete();
    } catch (err) {
      setParseErrors([err instanceof Error ? err.message : "Upload failed"]);
      setState("error");
    }
  };

  const handleReset = () => {
    setState("idle");
    setFilename("");
    setParsedRows([]);
    setParseErrors([]);
    setUploadResult(null);
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  // Preview: show what will be imported
  if (state === "parsed") {
    const uniqueDeals = new Set(parsedRows.map((r) => r["Opportunity Name"]));
    const stages = new Map<string, number>();
    for (const row of parsedRows) {
      const stage = row["Opportunity Stage"];
      stages.set(stage, (stages.get(stage) || 0) + 1);
    }

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-sm font-medium text-gray-700 mb-3">
          Ready to Import: {filename}
        </h3>
        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
          <div>
            <span className="text-gray-500">Total rows:</span>{" "}
            <span className="font-medium">{parsedRows.length}</span>
          </div>
          <div>
            <span className="text-gray-500">Unique deals:</span>{" "}
            <span className="font-medium">{uniqueDeals.size}</span>
          </div>
        </div>
        <div className="text-sm mb-4">
          <span className="text-gray-500">Stages:</span>
          <div className="flex flex-wrap gap-2 mt-1">
            {Array.from(stages.entries())
              .sort()
              .map(([stage, count]) => (
                <span
                  key={stage}
                  className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs"
                >
                  {stage} ({count})
                </span>
              ))}
          </div>
        </div>
        {parseErrors.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4 text-sm text-yellow-700">
            <p className="font-medium">Warnings:</p>
            {parseErrors.map((err, i) => (
              <p key={i}>{err}</p>
            ))}
          </div>
        )}
        <div className="flex gap-3">
          <button
            onClick={handleConfirmUpload}
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
          >
            Confirm Import
          </button>
          <button
            onClick={handleReset}
            className="border border-gray-200 text-gray-600 px-4 py-2 rounded text-sm hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Uploading state
  if (state === "uploading") {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
        <div className="animate-pulse text-gray-500 text-sm">
          Processing {filename}...
        </div>
      </div>
    );
  }

  // Done state
  if (state === "done" && uploadResult) {
    return (
      <div className="bg-white rounded-lg border border-green-200 p-6">
        <h3 className="text-sm font-medium text-green-700 mb-3">
          Import Complete
        </h3>
        <div className="grid grid-cols-2 gap-3 text-sm mb-4">
          <div>
            <span className="text-gray-500">New activities added:</span>{" "}
            <span className="font-medium">{uploadResult.new_activities}</span>
          </div>
          <div>
            <span className="text-gray-500">Duplicates skipped:</span>{" "}
            <span className="font-medium">{uploadResult.duplicate_activities}</span>
          </div>
          <div>
            <span className="text-gray-500">New deals created:</span>{" "}
            <span className="font-medium">{uploadResult.deals_created}</span>
          </div>
          <div>
            <span className="text-gray-500">Deals updated:</span>{" "}
            <span className="font-medium">{uploadResult.deals_updated}</span>
          </div>
        </div>
        {uploadResult.deal_changes.length > 0 && (
          <div className="mb-4">
            <p className="text-sm text-gray-500 mb-1">Changes detected:</p>
            <div className="space-y-1">
              {uploadResult.deal_changes.map((change, i) => (
                <div key={i} className="text-xs bg-blue-50 text-blue-700 rounded px-2 py-1">
                  {change.deal_name}: {change.field} changed from &quot;{change.old_value}&quot; to &quot;{change.new_value}&quot;
                </div>
              ))}
            </div>
          </div>
        )}
        {uploadResult.errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded p-3 mb-4 text-sm text-red-700">
            <p className="font-medium">Errors:</p>
            {uploadResult.errors.slice(0, 10).map((err, i) => (
              <p key={i}>{err}</p>
            ))}
            {uploadResult.errors.length > 10 && (
              <p>...and {uploadResult.errors.length - 10} more</p>
            )}
          </div>
        )}
        <button
          onClick={handleReset}
          className="border border-gray-200 text-gray-600 px-4 py-2 rounded text-sm hover:bg-gray-50"
        >
          Upload Another
        </button>
      </div>
    );
  }

  // Error state
  if (state === "error") {
    return (
      <div className="bg-white rounded-lg border border-red-200 p-6">
        <h3 className="text-sm font-medium text-red-700 mb-2">Upload Error</h3>
        {parseErrors.map((err, i) => (
          <p key={i} className="text-sm text-red-600">
            {err}
          </p>
        ))}
        <button
          onClick={handleReset}
          className="mt-3 border border-gray-200 text-gray-600 px-4 py-2 rounded text-sm hover:bg-gray-50"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Default: drag-and-drop upload zone
  return (
    <div
      className={`bg-white rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
        dragActive ? "border-blue-400 bg-blue-50" : "border-gray-200"
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={handleDrop}
    >
      <p className="text-sm text-gray-500 mb-2">
        Drag and drop your Salesforce CSV export here
      </p>
      <p className="text-xs text-gray-400 mb-4">or</p>
      <label className="inline-block bg-blue-600 text-white px-4 py-2 rounded text-sm cursor-pointer hover:bg-blue-700">
        Choose File
        <input
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleFileInput}
        />
      </label>
    </div>
  );
}
