"use client";

import type { RegionCount, CountryCount, StatusCount } from "@/lib/lead-types";

interface LeadSummaryProps {
  regionBreakdown: RegionCount[];
  topCountries: CountryCount[];
  amerStatusBreakdown: StatusCount[];
  nonAmerStatusBreakdown: StatusCount[];
}

function BreakdownTable({
  title,
  items,
}: {
  title: string;
  items: { label: string; count: number; percentage?: number }[];
}) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-800 mb-2">{title}</h4>
      <div className="space-y-1">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between text-sm"
          >
            <span className="text-gray-700">{item.label}</span>
            <span className="text-gray-900 font-medium">
              {item.count}
              {item.percentage !== undefined && (
                <span className="text-xs text-gray-500 ml-1">
                  ({item.percentage.toFixed(0)}%)
                </span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LeadSummary({
  regionBreakdown,
  topCountries,
  amerStatusBreakdown,
  nonAmerStatusBreakdown,
}: LeadSummaryProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-800 mb-4">
        Lead Summary
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <BreakdownTable
          title="By Region"
          items={regionBreakdown.map((r) => ({
            label: r.region,
            count: r.count,
            percentage: r.percentage,
          }))}
        />
        <BreakdownTable
          title="Top Countries"
          items={topCountries.map((c) => ({
            label: c.country,
            count: c.count,
          }))}
        />
        <BreakdownTable
          title="AMER Status"
          items={amerStatusBreakdown.map((s) => ({
            label: s.status,
            count: s.count,
            percentage: s.percentage,
          }))}
        />
        <BreakdownTable
          title="Non-AMER Status"
          items={nonAmerStatusBreakdown.map((s) => ({
            label: s.status,
            count: s.count,
            percentage: s.percentage,
          }))}
        />
      </div>
    </div>
  );
}
