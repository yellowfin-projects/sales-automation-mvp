"use client";

import { useState, useCallback } from "react";

interface LeadCsvUploaderProps {
  onUploadComplete: () => void;
}

type UploadState = "idle" | "uploading" | "done" | "error";

export default function LeadCsvUploader({ onUploadComplete }: LeadCsvUploaderProps) {
  const [state, setState] = useState<UploadState>("idle");
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filename, setFilename] = useState("");
  const [result, setResult] = useState<{
    rows_in_csv: number;
    leads_processed: number;
    duplicates_in_file: number;
  } | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.name.endsWith(".csv")) {
        setError("Please upload a CSV file");
        setState("error");
        return;
      }

      setState("uploading");
      setError(null);
      setFilename(file.name);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/upload-leads", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Upload failed");
          setState("error");
          return;
        }

        setResult(data);
        setState("done");
        onUploadComplete();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Network error");
        setState("error");
      }
    },
    [onUploadComplete]
  );

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

  const handleReset = () => {
    setState("idle");
    setError(null);
    setFilename("");
    setResult(null);
  };

  if (state === "uploading") {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
        <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent mb-2"></div>
        <p className="text-sm text-gray-500">Processing {filename}...</p>
      </div>
    );
  }

  if (state === "done" && result) {
    return (
      <div className="bg-green-50 rounded-lg border border-green-200 p-4">
        <h3 className="text-sm font-medium text-green-700 mb-2">Upload Complete</h3>
        <div className="grid grid-cols-3 gap-3 text-sm mb-3">
          <div>
            <span className="text-gray-500">Rows in CSV:</span>{" "}
            <span className="font-medium">{result.rows_in_csv}</span>
          </div>
          <div>
            <span className="text-gray-500">Leads processed:</span>{" "}
            <span className="font-medium">{result.leads_processed}</span>
          </div>
          <div>
            <span className="text-gray-500">Duplicates in file:</span>{" "}
            <span className="font-medium">{result.duplicates_in_file}</span>
          </div>
        </div>
        <button
          onClick={handleReset}
          className="text-sm border border-gray-200 text-gray-600 px-3 py-1.5 rounded hover:bg-gray-50"
        >
          Upload Another
        </button>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="bg-white rounded-lg border border-red-200 p-4">
        <p className="text-sm text-red-600 mb-2">{error}</p>
        <button
          onClick={handleReset}
          className="text-sm border border-gray-200 text-gray-600 px-3 py-1.5 rounded hover:bg-gray-50"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Idle: drop zone
  return (
    <div
      className={`rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
        dragActive ? "border-blue-400 bg-blue-50" : "border-gray-200 bg-white"
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={handleDrop}
    >
      <p className="text-sm text-gray-500 mb-1">
        Drag and drop a Salesforce lead CSV here
      </p>
      <p className="text-xs text-gray-400 mb-3">
        Same format as the emailed lead report
      </p>
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
