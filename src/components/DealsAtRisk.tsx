"use client";

import { useState } from "react";
import type { DealWithMetrics } from "@/lib/types";

const PREVIEW_COUNT = 3;

interface DealsAtRiskProps {
  deals: DealWithMetrics[];
  onOpenDeal?: (dealId: string) => void;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(value);
}

function riskReasons(deal: DealWithMetrics): string[] {
  const reasons: string[] = [];
  if (deal.metrics.days_since_last_activity > 14) {
    reasons.push(`No activity in ${deal.metrics.days_since_last_activity} days`);
  }
  if (deal.metrics.is_overdue) {
    reasons.push(`Close date overdue by ${Math.abs(deal.metrics.days_to_close)} days`);
  }
  return reasons;
}

const CLOSED_STAGES = ["0-Closed Lost", "Closed Won", "Closed Lost"];

export default function DealsAtRisk({ deals, onOpenDeal }: DealsAtRiskProps) {
  const atRiskDeals = deals.filter((d) => {
    if (CLOSED_STAGES.some((s) => d.stage.toLowerCase().includes(s.toLowerCase()))) {
      return false;
    }
    return d.metrics.days_since_last_activity > 14 || d.metrics.is_overdue;
  });

  const [expanded, setExpanded] = useState(false);

  if (atRiskDeals.length === 0) return null;

  // Sort by most severe first: overdue + stale > overdue > stale, then by staleness
  atRiskDeals.sort((a, b) => {
    const aScore =
      (a.metrics.is_overdue ? 100 : 0) +
      (a.metrics.days_since_last_activity > 14 ? a.metrics.days_since_last_activity : 0);
    const bScore =
      (b.metrics.is_overdue ? 100 : 0) +
      (b.metrics.days_since_last_activity > 14 ? b.metrics.days_since_last_activity : 0);
    return bScore - aScore;
  });

  const hasMore = atRiskDeals.length > PREVIEW_COUNT;
  const visibleDeals = expanded ? atRiskDeals : atRiskDeals.slice(0, PREVIEW_COUNT);

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-red-800">
          Deals at Risk ({atRiskDeals.length})
        </h2>
        {hasMore && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs font-medium text-red-700 hover:text-red-900"
          >
            {expanded ? "Show less" : `Show all ${atRiskDeals.length}`}
          </button>
        )}
      </div>
      <div className="space-y-2">
        {visibleDeals.map((deal) => (
          <button
            key={deal.id}
            onClick={() => onOpenDeal?.(deal.id)}
            className="w-full flex items-center justify-between gap-4 bg-white border border-red-100 rounded-lg px-4 py-3 hover:border-red-300 transition-colors text-left"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">
                {deal.opportunity_name}
              </p>
              <p className="text-xs text-gray-500">{deal.account_name} — {deal.owner}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-semibold text-gray-900">
                {formatCurrency(deal.amount)}
              </p>
              <div className="flex flex-wrap justify-end gap-1 mt-0.5">
                {riskReasons(deal).map((reason) => (
                  <span
                    key={reason}
                    className="inline-block text-xs text-red-700 bg-red-100 px-1.5 py-0.5 rounded"
                  >
                    {reason}
                  </span>
                ))}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
