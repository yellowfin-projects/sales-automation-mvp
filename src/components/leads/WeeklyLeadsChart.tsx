"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LabelList,
} from "recharts";
import type { WeeklyLeadData } from "@/lib/lead-types";

interface WeeklyLeadsChartProps {
  title: string;
  data: WeeklyLeadData[];
}

const REGION_COLORS: Record<string, string> = {
  AMER: "#3b82f6",   // blue-500
  EMEA: "#f97316",   // orange-500
  APAC: "#22c55e",   // green-500
  EASIA: "#a855f7",  // purple-500
};

export default function WeeklyLeadsChart({ title, data }: WeeklyLeadsChartProps) {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">{title}</h3>
        <div className="text-sm text-gray-400 py-8 text-center">
          No lead data to display
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-800 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ left: 0, right: 10, top: 20, bottom: 5 }}>
          <XAxis dataKey="week" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
          <Tooltip />
          <Legend />
          <Bar dataKey="AMER" stackId="a" fill={REGION_COLORS.AMER}>
            <LabelList
              dataKey="total"
              content={({ x, y, width, height, index }) => {
                // Render on the AMER bar (always present) but position
                // above the full stack using the total/AMER ratio.
                if (index == null || x == null || y == null || width == null || height == null) return null;
                const entry = data[index];
                const amerVal = entry.AMER;
                if (amerVal === 0 || Number(height) === 0) return null;
                // Pixels per unit = AMER bar height / AMER value
                // Top of full stack = bottom of AMER bar - (total * pixelsPerUnit)
                const barBottom = Number(y) + Number(height);
                const pixelsPerUnit = Number(height) / amerVal;
                const topOfStack = barBottom - entry.total * pixelsPerUnit;
                return (
                  <text
                    x={Number(x) + Number(width) / 2}
                    y={topOfStack - 6}
                    textAnchor="middle"
                    style={{ fontSize: 11, fontWeight: 600, fill: "#374151" }}
                  >
                    {entry.total}
                  </text>
                );
              }}
            />
          </Bar>
          <Bar dataKey="EMEA" stackId="a" fill={REGION_COLORS.EMEA} />
          <Bar dataKey="APAC" stackId="a" fill={REGION_COLORS.APAC} />
          <Bar dataKey="EASIA" stackId="a" fill={REGION_COLORS.EASIA} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
