"use client";

import { useState, useCallback } from "react";

interface TranscriptUploaderProps {
  dealId: string;
  onUploadComplete: () => void;
}

type UploadState = "idle" | "uploading" | "done" | "error";

export default function TranscriptUploader({
  dealId,
  onUploadComplete,
}: TranscriptUploaderProps) {
  const [state, setState] = useState<UploadState>("idle");
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFilename, setUploadedFilename] = useState("");
  const [callDate, setCallDate] = useState("");
  const [callType, setCallType] = useState("");

  const handleFile = useCallback(
    async (file: File) => {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (ext !== "txt" && ext !== "docx") {
        setError("Please upload a .txt or .docx file");
        setState("error");
        return;
      }

      setState("uploading");
      setError(null);
      setUploadedFilename(file.name);

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("dealId", dealId);
        if (callDate) formData.append("callDate", callDate);
        if (callType) formData.append("callType", callType);

        const response = await fetch("/api/upload-transcript", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Upload failed");
          setState("error");
          return;
        }

        setState("done");
        onUploadComplete();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Network error");
        setState("error");
      }
    },
    [dealId, callDate, callType, onUploadComplete]
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
    setUploadedFilename("");
    setCallDate("");
    setCallType("");
  };

  if (state === "uploading") {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
        <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent mb-2"></div>
        <p className="text-sm text-gray-500">Uploading {uploadedFilename}...</p>
      </div>
    );
  }

  if (state === "done") {
    return (
      <div className="bg-green-50 rounded-lg border border-green-200 p-4 flex items-center justify-between">
        <p className="text-sm text-green-700">
          Uploaded <span className="font-medium">{uploadedFilename}</span>
        </p>
        <button
          onClick={handleReset}
          className="text-sm text-green-700 hover:underline"
        >
          Upload another
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

  // Idle: show upload zone with optional metadata fields
  return (
    <div className="space-y-3">
      {/* Optional metadata */}
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="text-xs text-gray-500 block mb-1">Call Date (optional)</label>
          <input
            type="date"
            value={callDate}
            onChange={(e) => setCallDate(e.target.value)}
            className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm"
          />
        </div>
        <div className="flex-1">
          <label className="text-xs text-gray-500 block mb-1">Call Type (optional)</label>
          <select
            value={callType}
            onChange={(e) => setCallType(e.target.value)}
            className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm bg-white"
          >
            <option value="">Select type...</option>
            <option value="Discovery">Discovery</option>
            <option value="Demo">Demo</option>
            <option value="Follow-up">Follow-up</option>
            <option value="Negotiation">Negotiation</option>
            <option value="Technical">Technical</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      {/* Drop zone */}
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
          Drag and drop a call transcript here
        </p>
        <p className="text-xs text-gray-400 mb-3">
          Accepts .txt and .docx files
        </p>
        <label className="inline-block bg-blue-600 text-white px-4 py-2 rounded text-sm cursor-pointer hover:bg-blue-700">
          Choose File
          <input
            type="file"
            accept=".txt,.docx"
            className="hidden"
            onChange={handleFileInput}
          />
        </label>
      </div>
    </div>
  );
}
