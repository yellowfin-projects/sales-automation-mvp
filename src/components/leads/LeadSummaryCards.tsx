"use client";

import type { LeadSummaryMetrics } from "@/lib/lead-types";

interface LeadSummaryCardsProps {
  metrics: LeadSummaryMetrics;
}

export default function LeadSummaryCards({ metrics }: LeadSummaryCardsProps) {
  const wowSign = metrics.weekOverWeekChange >= 0 ? "+" : "";
  const wowColor =
    metrics.weekOverWeekChange > 0
      ? "text-green-600"
      : metrics.weekOverWeekChange < 0
      ? "text-red-600"
      : "text-gray-900";

  const cards = [
    {
      label: "Total Leads",
      value: String(metrics.totalLeads),
      subtitle: "All time",
    },
    {
      label: "Conversion Rate",
      value: `${metrics.conversionRate.toFixed(1)}%`,
      subtitle: "Leads converted",
    },
    {
      label: "Week-over-Week",
      value: `${wowSign}${metrics.weekOverWeekChange.toFixed(0)}%`,
      subtitle: "vs. previous week",
      valueColor: wowColor,
    },
    {
      label: "Latest Week",
      value: String(metrics.latestWeekCount),
      subtitle: "New leads this week",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-lg border border-gray-200 bg-white p-4"
        >
          <p className="text-sm font-medium text-gray-600">{card.label}</p>
          <p
            className={`text-2xl font-semibold mt-1 ${
              card.valueColor || "text-gray-900"
            }`}
          >
            {card.value}
          </p>
          <p className="text-xs text-gray-500 mt-1">{card.subtitle}</p>
        </div>
      ))}
    </div>
  );
}
