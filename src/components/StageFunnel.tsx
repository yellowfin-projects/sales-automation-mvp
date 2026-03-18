"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface StageFunnelProps {
  data: { stage: string; count: number; value: number }[];
}

// Colors for each stage — ordered roughly by pipeline progression
const STAGE_COLORS: Record<string, string> = {
  "6-Prospect": "#93c5fd",        // blue-300
  "5-Active Evaluation": "#60a5fa", // blue-400
  "4-Selected": "#3b82f6",         // blue-500
  "3-Commit": "#2563eb",           // blue-600
  "2-Negotiate": "#1d4ed8",        // blue-700
  "1-Closed Won": "#16a34a",       // green-600
  "0-Closed Lost": "#dc2626",      // red-600
};

const DEFAULT_COLOR = "#6b7280"; // gray-500

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

export default function StageFunnel({ data }: StageFunnelProps) {
  if (data.length === 0) {
    return (
      <div className="text-sm text-gray-400 py-8 text-center">
        No stage data to display
      </div>
    );
  }

  // Sort by stage name (which conveniently sorts by pipeline order due to numbering)
  const sorted = [...data].sort((a, b) => b.stage.localeCompare(a.stage));

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-sm font-medium text-gray-700 mb-4">Pipeline by Stage</h3>
      <ResponsiveContainer width="100%" height={sorted.length * 50 + 20}>
        <BarChart data={sorted} layout="vertical" margin={{ left: 20, right: 20 }}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="stage"
            width={150}
            tick={{ fontSize: 13 }}
          />
          <Tooltip
            formatter={(value) => [formatCurrency(Number(value)), "Value"]}
            labelFormatter={(label) => String(label)}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={28}>
            {sorted.map((entry) => (
              <Cell
                key={entry.stage}
                fill={STAGE_COLORS[entry.stage] || DEFAULT_COLOR}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {/* Legend showing deal count per stage */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
        {sorted.map((s) => (
          <span key={s.stage}>
            {s.stage}: {s.count} deal{s.count !== 1 ? "s" : ""} ({formatCurrency(s.value)})
          </span>
        ))}
      </div>
    </div>
  );
}
