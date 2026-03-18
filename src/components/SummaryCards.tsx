"use client";

import type { PipelineMetrics } from "@/lib/types";

interface SummaryCardsProps {
  metrics: PipelineMetrics;
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
}

export default function SummaryCards({ metrics }: SummaryCardsProps) {
  const cards = [
    {
      label: "Total Pipeline",
      value: formatCurrency(metrics.total_pipeline_value),
      subtitle: `${metrics.deal_count} open deals`,
    },
    {
      label: "Weighted Pipeline",
      value: formatCurrency(metrics.weighted_pipeline),
      subtitle: "Amount x Probability",
    },
    {
      label: "Avg Deal Size",
      value: formatCurrency(metrics.average_deal_size),
      subtitle: `${metrics.deal_count} deals`,
    },
    {
      label: "Deals at Risk",
      value: String(metrics.deals_at_risk),
      subtitle: "Stale >14 days or overdue",
      highlight: metrics.deals_at_risk > 0,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`rounded-lg border p-4 ${
            card.highlight
              ? "border-red-300 bg-red-50"
              : "border-gray-200 bg-white"
          }`}
        >
          <p className="text-sm text-gray-500">{card.label}</p>
          <p
            className={`text-2xl font-semibold mt-1 ${
              card.highlight ? "text-red-600" : "text-gray-900"
            }`}
          >
            {card.value}
          </p>
          <p className="text-xs text-gray-400 mt-1">{card.subtitle}</p>
        </div>
      ))}
    </div>
  );
}
