"use client";

import { useState } from "react";
import type { DealHistory } from "@/lib/types";

interface DealHistoryTimelineProps {
  history: DealHistory[];
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatFieldName(field: string): string {
  switch (field) {
    case "stage":
      return "Stage";
    case "amount":
      return "Amount";
    case "close_date":
      return "Close Date";
    case "probability":
      return "Probability";
    default:
      return field;
  }
}

function formatFieldValue(field: string, value: string): string {
  if (field === "amount") {
    const num = Number(value);
    if (!isNaN(num)) {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
      }).format(num);
    }
  }
  if (field === "probability") {
    return `${value}%`;
  }
  if (field === "close_date") {
    return formatDate(value);
  }
  return value;
}

function changeIcon(field: string): string {
  switch (field) {
    case "stage":
      return "bg-blue-100 text-blue-700";
    case "amount":
      return "bg-green-100 text-green-700";
    case "close_date":
      return "bg-yellow-100 text-yellow-700";
    case "probability":
      return "bg-purple-100 text-purple-700";
    default:
      return "bg-gray-100 text-gray-600";
  }
}

export default function DealHistoryTimeline({ history }: DealHistoryTimelineProps) {
  const [expanded, setExpanded] = useState(false);

  if (history.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-800 mb-2">Week-over-Week Changes</h2>
        <p className="text-sm text-gray-500">
          No changes detected yet. Changes to stage, amount, close date, or probability will
          appear here after your next CSV upload.
        </p>
      </div>
    );
  }

  // Group changes by date (changed_at, rounded to the day)
  const grouped = new Map<string, DealHistory[]>();
  for (const entry of history) {
    const day = entry.changed_at.split("T")[0];
    if (!grouped.has(day)) {
      grouped.set(day, []);
    }
    grouped.get(day)!.push(entry);
  }

  // Sort dates newest first
  const sortedDates = Array.from(grouped.keys()).sort((a, b) => b.localeCompare(a));

  const PREVIEW_COUNT = 3;
  const hasMore = sortedDates.length > PREVIEW_COUNT;
  const visibleDates = expanded ? sortedDates : sortedDates.slice(0, PREVIEW_COUNT);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-800">
          Week-over-Week Changes ({history.length})
        </h2>
        {hasMore && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs font-medium text-blue-600 hover:text-blue-800"
          >
            {expanded ? "Show less" : `Show all ${sortedDates.length} dates`}
          </button>
        )}
      </div>
      <div className="space-y-4">
        {visibleDates.map((date) => (
          <div key={date}>
            <p className="text-xs font-medium text-gray-500 mb-2">
              {formatDate(date)}
            </p>
            <div className="space-y-1.5 pl-3 border-l-2 border-gray-200">
              {grouped.get(date)!.map((entry) => (
                <div key={entry.id} className="flex items-center gap-2 text-sm">
                  <span
                    className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium shrink-0 ${changeIcon(entry.field_name)}`}
                  >
                    {formatFieldName(entry.field_name)}
                  </span>
                  <span className="text-gray-500">
                    {formatFieldValue(entry.field_name, entry.old_value)}
                  </span>
                  <span className="text-gray-400">&rarr;</span>
                  <span className="text-gray-900 font-medium">
                    {formatFieldValue(entry.field_name, entry.new_value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
