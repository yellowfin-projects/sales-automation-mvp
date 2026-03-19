"use client";

import type { ConversionCell } from "@/lib/lead-types";
import { formatWeekLabel } from "@/lib/lead-metrics";

interface ConversionPivotTableProps {
  regions: string[];
  weeks: string[];
  cells: Record<string, Record<string, ConversionCell>>;
}

export default function ConversionPivotTable({
  regions,
  weeks,
  cells,
}: ConversionPivotTableProps) {
  if (weeks.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">
          Conversion by Region & Week
        </h3>
        <div className="text-sm text-gray-400 py-8 text-center">
          No data to display
        </div>
      </div>
    );
  }

  // Compute column totals
  const colTotals: Record<string, ConversionCell> = {};
  for (const week of weeks) {
    colTotals[week] = { total: 0, converted: 0 };
    for (const region of regions) {
      const cell = cells[region]?.[week] || { total: 0, converted: 0 };
      colTotals[week].total += cell.total;
      colTotals[week].converted += cell.converted;
    }
  }

  // Compute row totals
  const rowTotals: Record<string, ConversionCell> = {};
  for (const region of regions) {
    rowTotals[region] = { total: 0, converted: 0 };
    for (const week of weeks) {
      const cell = cells[region]?.[week] || { total: 0, converted: 0 };
      rowTotals[region].total += cell.total;
      rowTotals[region].converted += cell.converted;
    }
  }

  // Grand total
  const grandTotal: ConversionCell = { total: 0, converted: 0 };
  for (const region of regions) {
    grandTotal.total += rowTotals[region].total;
    grandTotal.converted += rowTotals[region].converted;
  }

  function formatCell(cell: ConversionCell): string {
    return `${cell.total} / ${cell.converted}`;
  }

  function convRate(cell: ConversionCell): string {
    if (cell.total === 0) return "0%";
    return `${((cell.converted / cell.total) * 100).toFixed(0)}%`;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-800 mb-4">
        Conversion by Region & Week
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">
                Region
              </th>
              {weeks.map((w) => (
                <th
                  key={w}
                  className="px-3 py-2 text-center text-xs font-semibold text-gray-700"
                >
                  {formatWeekLabel(w)}
                </th>
              ))}
              <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {regions.map((region) => (
              <tr key={region} className="hover:bg-gray-50">
                <td className="px-3 py-2 font-medium text-gray-900">
                  {region}
                </td>
                {weeks.map((week) => {
                  const cell = cells[region]?.[week] || {
                    total: 0,
                    converted: 0,
                  };
                  return (
                    <td
                      key={week}
                      className={`px-3 py-2 text-center ${
                        cell.converted > 0
                          ? "bg-green-50 text-green-700"
                          : "text-gray-600"
                      }`}
                    >
                      {formatCell(cell)}
                    </td>
                  );
                })}
                <td className="px-3 py-2 text-center font-medium text-gray-900">
                  {formatCell(rowTotals[region])}
                  <span className="text-xs text-gray-500 ml-1">
                    ({convRate(rowTotals[region])})
                  </span>
                </td>
              </tr>
            ))}
            {/* Totals row */}
            <tr className="bg-gray-50 font-medium">
              <td className="px-3 py-2 text-gray-900">Total</td>
              {weeks.map((week) => (
                <td key={week} className="px-3 py-2 text-center text-gray-900">
                  {formatCell(colTotals[week])}
                </td>
              ))}
              <td className="px-3 py-2 text-center text-gray-900">
                {formatCell(grandTotal)}
                <span className="text-xs text-gray-500 ml-1">
                  ({convRate(grandTotal)})
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400 mt-2">
        Each cell shows: total / converted
      </p>
    </div>
  );
}
