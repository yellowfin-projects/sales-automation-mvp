"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import CsvUploader from "@/components/CsvUploader";
import type { Upload } from "@/lib/types";

export default function SettingsPage() {
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [totalDeals, setTotalDeals] = useState(0);
  const [totalActivities, setTotalActivities] = useState(0);
  const [totalAnalyses, setTotalAnalyses] = useState(0);
  const [totalInputTokens, setTotalInputTokens] = useState(0);
  const [totalOutputTokens, setTotalOutputTokens] = useState(0);
  const [expandedUploadId, setExpandedUploadId] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    // Get upload history
    const { data: uploadsData } = await supabase
      .from("uploads")
      .select("*")
      .order("uploaded_at", { ascending: false });
    setUploads((uploadsData as Upload[]) || []);

    // Get total counts
    const { count: dealCount } = await supabase
      .from("deals")
      .select("*", { count: "exact", head: true });
    setTotalDeals(dealCount || 0);

    const { count: activityCount } = await supabase
      .from("activities")
      .select("*", { count: "exact", head: true });
    setTotalActivities(activityCount || 0);

    // AI usage stats
    const { data: analysesData, count: analysisCount } = await supabase
      .from("analyses")
      .select("input_tokens, output_tokens", { count: "exact" });
    setTotalAnalyses(analysisCount || 0);

    if (analysesData) {
      setTotalInputTokens(
        analysesData.reduce((sum: number, a: { input_tokens: number }) => sum + (a.input_tokens || 0), 0)
      );
      setTotalOutputTokens(
        analysesData.reduce((sum: number, a: { output_tokens: number }) => sum + (a.output_tokens || 0), 0)
      );
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">Settings</h1>

      {/* Data summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Deals</p>
          <p className="text-2xl font-semibold text-gray-900">{totalDeals}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Activities</p>
          <p className="text-2xl font-semibold text-gray-900">{totalActivities}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Uploads</p>
          <p className="text-2xl font-semibold text-gray-900">{uploads.length}</p>
        </div>
      </div>

      {/* AI Usage */}
      {totalAnalyses > 0 && (
        <div>
          <h2 className="text-sm font-medium text-gray-700 mb-3">AI Usage</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Deals Analyzed</p>
              <p className="text-2xl font-semibold text-gray-900">
                {totalAnalyses}
              </p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Total Input Tokens</p>
              <p className="text-2xl font-semibold text-gray-900">
                {totalInputTokens.toLocaleString()}
              </p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Total Output Tokens</p>
              <p className="text-2xl font-semibold text-gray-900">
                {totalOutputTokens.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* CSV Upload */}
      <div>
        <h2 className="text-sm font-medium text-gray-700 mb-3">
          Upload Salesforce CSV
        </h2>
        <CsvUploader onUploadComplete={loadStats} />
      </div>

      {/* Upload History */}
      {uploads.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-gray-700 mb-3">
            Upload History
          </h2>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">
                    Date
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">
                    Filename
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">
                    Rows
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">
                    New Activities
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">
                    Duplicates Skipped
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">
                    Deals Created
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">
                    Deals Updated
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {uploads.map((upload) => {
                  const hasSkipped =
                    upload.skipped_records && upload.skipped_records.length > 0;
                  const isExpanded = expandedUploadId === upload.id;

                  return (
                    <React.Fragment key={upload.id}>
                      <tr>
                        <td className="px-3 py-2 text-gray-900">
                          {new Date(upload.uploaded_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="px-3 py-2 text-gray-700 font-mono text-xs">
                          {upload.filename}
                        </td>
                        <td className="px-3 py-2 text-gray-900">{upload.row_count}</td>
                        <td className="px-3 py-2 text-gray-900">
                          {upload.new_activities_added}
                        </td>
                        <td className="px-3 py-2 text-gray-900">
                          {hasSkipped ? (
                            <button
                              onClick={() =>
                                setExpandedUploadId(isExpanded ? null : upload.id)
                              }
                              className="text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              {upload.duplicate_activities_skipped}
                              <span className="ml-1 text-xs">
                                {isExpanded ? "\u25B2" : "\u25BC"}
                              </span>
                            </button>
                          ) : (
                            upload.duplicate_activities_skipped
                          )}
                        </td>
                        <td className="px-3 py-2 text-gray-900">
                          {upload.deals_created}
                        </td>
                        <td className="px-3 py-2 text-gray-900">
                          {upload.deals_updated}
                        </td>
                      </tr>
                      {isExpanded && hasSkipped && (
                        <tr>
                          <td colSpan={7} className="px-3 py-2 bg-gray-50">
                            <div className="text-xs text-gray-500 mb-1 font-medium">
                              Skipped duplicates:
                            </div>
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-gray-500">
                                  <th className="text-left py-1 pr-3 font-medium">Deal</th>
                                  <th className="text-left py-1 pr-3 font-medium">Subject</th>
                                  <th className="text-left py-1 font-medium">Date</th>
                                </tr>
                              </thead>
                              <tbody className="text-gray-700">
                                {upload.skipped_records!.map((rec, i) => (
                                  <tr key={i}>
                                    <td className="py-0.5 pr-3">{rec.deal}</td>
                                    <td className="py-0.5 pr-3">{rec.subject}</td>
                                    <td className="py-0.5">{rec.date}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
