"use client";

import type { MediumHeatmapRow } from "@/lib/lead-types";
import { formatWeekLabel } from "@/lib/lead-metrics";

interface MediumHeatmapProps {
  rows: MediumHeatmapRow[];
  weeks: string[];
}

/**
 * Returns a background color with intensity based on count relative to max.
 */
function heatColor(count: number, maxCount: number): string {
  if (count === 0 || maxCount === 0) return "";
  const intensity = count / maxCount;
  // Light blue to dark blue
  if (intensity > 0.75) return "bg-blue-300 text-blue-900";
  if (intensity > 0.5) return "bg-blue-200 text-blue-800";
  if (intensity > 0.25) return "bg-blue-100 text-blue-700";
  return "bg-blue-50 text-blue-600";
}

export default function MediumHeatmap({ rows, weeks }: MediumHeatmapProps) {
  if (rows.length === 0 || weeks.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">
          Leads by Medium & Region
        </h3>
        <div className="text-sm text-gray-400 py-8 text-center">
          No data to display
        </div>
      </div>
    );
  }

  // Find max count for color scaling
  let maxCount = 0;
  for (const row of rows) {
    for (const week of weeks) {
      const c = row.weekCounts[week] || 0;
      if (c > maxCount) maxCount = c;
    }
  }

  // Compute region subtotals
  const regionTotals = new Map<string, Record<string, number>>();
  for (const row of rows) {
    if (!regionTotals.has(row.region)) {
      regionTotals.set(row.region, {});
    }
    const totals = regionTotals.get(row.region)!;
    for (const week of weeks) {
      totals[week] = (totals[week] || 0) + (row.weekCounts[week] || 0);
    }
  }

  // Group rows by region for rendering with subtotal rows
  let currentRegion = "";

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-800 mb-4">
        Leads by Medium & Region
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">
                Region / Medium
              </th>
              {weeks.map((w) => (
                <th
                  key={w}
                  className="px-3 py-2 text-center text-xs font-semibold text-gray-700"
                >
                  {formatWeekLabel(w)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row, i) => {
              const showRegionHeader = row.region !== currentRegion;
              const isLastInRegion =
                i === rows.length - 1 || rows[i + 1].region !== row.region;
              currentRegion = row.region;

              return (
                <tr key={`${row.region}-${row.medium}`}>
                  {(() => {
                    // Reset currentRegion tracking for next render
                    const elements = [];

                    if (showRegionHeader) {
                      elements.push(
                        <td
                          key="label"
                          className="px-3 py-2 font-medium text-gray-900"
                        >
                          <span className="font-semibold">{row.region}</span>
                          {" / "}
                          {row.medium}
                        </td>
                      );
                    } else {
                      elements.push(
                        <td key="label" className="px-3 py-2 pl-8 text-gray-700">
                          {row.medium}
                        </td>
                      );
                    }

                    return elements;
                  })()}
                  {weeks.map((week) => {
                    const count = row.weekCounts[week] || 0;
                    return (
                      <td
                        key={week}
                        className={`px-3 py-2 text-center ${heatColor(
                          count,
                          maxCount
                        )}`}
                      >
                        {count || ""}
                      </td>
                    );
                  })}
                  {isLastInRegion && null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
