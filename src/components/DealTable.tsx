"use client";

import { useState, useMemo } from "react";
import type React from "react";
import type { DealWithMetrics } from "@/lib/types";
import { CHECKLIST_CATEGORIES } from "@/lib/deal-config";

interface DealTableProps {
  deals: DealWithMetrics[];
  onOpenDeal: (dealId: string) => void;
  onDataChange?: () => void;
}

type SortField =
  | "opportunity_name"
  | "owner"
  | "amount"
  | "predictive_amount"
  | "stage"
  | "detailed_stage"
  | "close_date"
  | "days_since_last_activity"
  | "days_to_close"
  | "activity_trend"
  | "probability"
  | "completed_count"
  | "is_key_deal";

type SortDirection = "asc" | "desc";

const TREND_ORDER: Record<string, number> = {
  accelerating: 3,
  steady: 2,
  new: 1,
  decelerating: 0,
};

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function stalenessColor(days: number): string {
  if (days <= 7) return "text-green-700 bg-green-50";
  if (days <= 14) return "text-yellow-700 bg-yellow-50";
  return "text-red-700 bg-red-50";
}

function stageColor(stage: string): string {
  if (stage.includes("Closed Lost")) return "bg-red-100 text-red-700";
  if (stage.includes("Closed Won")) return "bg-green-100 text-green-700";
  if (stage.includes("Commit")) return "bg-blue-100 text-blue-700";
  return "bg-gray-100 text-gray-700";
}

function trendBadge(trend: string): string {
  switch (trend) {
    case "accelerating": return "text-green-700 bg-green-50";
    case "decelerating": return "text-red-700 bg-red-50";
    case "steady": return "text-blue-700 bg-blue-50";
    default: return "text-gray-500 bg-gray-50";
  }
}

function trendShort(trend: string): string {
  switch (trend) {
    case "accelerating": return "↑ Accel";
    case "decelerating": return "↓ Decel";
    case "steady": return "→ Steady";
    default: return "New";
  }
}

export default function DealTable({ deals, onOpenDeal, onDataChange }: DealTableProps) {
  const [sortField, setSortField] = useState<SortField>("days_since_last_activity");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");
  const [stageDropdownOpen, setStageDropdownOpen] = useState(false);
  const [ownerDropdownOpen, setOwnerDropdownOpen] = useState(false);
  const [keyDealOnly, setKeyDealOnly] = useState(false);

  const stages = useMemo(() => [...new Set(deals.map((d) => d.stage))].sort(), [deals]);
  const owners = useMemo(() => [...new Set(deals.map((d) => d.owner))].sort(), [deals]);

  const [selectedStages, setSelectedStages] = useState<Set<string>>(() => new Set(stages));
  const [selectedOwners, setSelectedOwners] = useState<Set<string>>(() => new Set(owners));

  function toggleStage(stage: string) {
    setSelectedStages((prev) => {
      const next = new Set(prev);
      next.has(stage) ? next.delete(stage) : next.add(stage);
      return next;
    });
  }

  function toggleOwner(owner: string) {
    setSelectedOwners((prev) => {
      const next = new Set(prev);
      next.has(owner) ? next.delete(owner) : next.add(owner);
      return next;
    });
  }

  const allStagesSelected = selectedStages.size === stages.length;
  const allOwnersSelected = selectedOwners.size === owners.length;

  const stageFilterLabel = allStagesSelected
    ? "All Stages"
    : selectedStages.size === 0 ? "No Stages"
    : selectedStages.size === 1 ? [...selectedStages][0]
    : `${selectedStages.size} Stages`;

  const ownerFilterLabel = allOwnersSelected
    ? "All Reps"
    : selectedOwners.size === 0 ? "No Reps"
    : selectedOwners.size === 1 ? [...selectedOwners][0]
    : `${selectedOwners.size} Reps`;

  const filteredDeals = useMemo(() => {
    let filtered = deals;
    if (!allStagesSelected) filtered = filtered.filter((d) => selectedStages.has(d.stage));
    if (!allOwnersSelected) filtered = filtered.filter((d) => selectedOwners.has(d.owner));
    if (keyDealOnly) filtered = filtered.filter((d) => d.is_key_deal);

    return [...filtered].sort((a, b) => {
      const completedA = a.checklist.filter((i) => i.completed).length;
      const completedB = b.checklist.filter((i) => i.completed).length;

      let aVal: string | number;
      let bVal: string | number;

      switch (sortField) {
        case "days_since_last_activity":
          aVal = a.metrics.days_since_last_activity;
          bVal = b.metrics.days_since_last_activity;
          break;
        case "days_to_close":
          aVal = a.metrics.days_to_close;
          bVal = b.metrics.days_to_close;
          break;
        case "activity_trend":
          aVal = TREND_ORDER[a.metrics.activity_trend] ?? 0;
          bVal = TREND_ORDER[b.metrics.activity_trend] ?? 0;
          break;
        case "probability":
          aVal = a.probability;
          bVal = b.probability;
          break;
        case "completed_count":
          aVal = completedA;
          bVal = completedB;
          break;
        case "is_key_deal":
          aVal = a.is_key_deal ? 1 : 0;
          bVal = b.is_key_deal ? 1 : 0;
          break;
        case "amount":
          aVal = a.amount;
          bVal = b.amount;
          break;
        case "predictive_amount":
          aVal = a.predictive_amount;
          bVal = b.predictive_amount;
          break;
        case "close_date":
          aVal = a.close_date;
          bVal = b.close_date;
          break;
        default:
          aVal = (a[sortField as keyof typeof a] as string) || "";
          bVal = (b[sortField as keyof typeof b] as string) || "";
      }

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      const cmp = String(aVal).localeCompare(String(bVal));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [deals, sortField, sortDir, selectedStages, allStagesSelected, selectedOwners, allOwnersSelected, keyDealOnly]);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  }

  async function handleToggleKeyDeal(e: React.MouseEvent, dealId: string, current: boolean) {
    e.stopPropagation(); // don't open the slide-over
    await fetch(`/api/deals/${dealId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_key_deal: !current }),
    });
    onDataChange?.();
  }

  function SortHeader({ field, label, className = "", style }: { field: SortField; label: string; className?: string; style?: React.CSSProperties }) {
    const isActive = sortField === field;
    return (
      <th
        className={`px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide cursor-pointer select-none hover:text-gray-900 whitespace-nowrap ${className}`}
        style={style}
        onClick={() => handleSort(field)}
      >
        {label}
        <span className={`ml-1 ${isActive ? "text-gray-900" : "text-gray-300"}`}>
          {isActive ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
        </span>
      </th>
    );
  }

  const totalItems = CHECKLIST_CATEGORIES.length;

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 border-b border-gray-100">
        {/* Key Deals toggle */}
        <button
          onClick={() => setKeyDealOnly(!keyDealOnly)}
          className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded border transition-colors ${
            keyDealOnly
              ? "bg-yellow-50 border-yellow-300 text-yellow-800 font-medium"
              : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50"
          }`}
        >
          <span>{keyDealOnly ? "★" : "☆"}</span>
          Key Deals
        </button>

        {/* Stage filter */}
        <div className="relative">
          <button
            onClick={() => { setStageDropdownOpen(!stageDropdownOpen); setOwnerDropdownOpen(false); }}
            className="text-sm border border-gray-300 rounded px-2.5 py-1.5 bg-white text-gray-900 flex items-center gap-1 min-w-[130px]"
          >
            <span className="flex-1 text-left">{stageFilterLabel}</span>
            <span className="text-xs text-gray-400">{stageDropdownOpen ? "▲" : "▼"}</span>
          </button>
          {stageDropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setStageDropdownOpen(false)} />
              <div className="absolute z-20 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[220px]">
                <div className="flex gap-2 px-3 py-1.5 border-b border-gray-100">
                  <button onClick={() => setSelectedStages(new Set(stages))} className="text-xs text-blue-600 hover:underline">Select all</button>
                  <button onClick={() => setSelectedStages(new Set())} className="text-xs text-blue-600 hover:underline">Clear all</button>
                </div>
                {stages.map((stage) => (
                  <label key={stage} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer">
                    <input type="checkbox" checked={selectedStages.has(stage)} onChange={() => toggleStage(stage)} className="rounded border-gray-300" />
                    <span className="text-sm text-gray-900">{stage}</span>
                  </label>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Rep filter */}
        <div className="relative">
          <button
            onClick={() => { setOwnerDropdownOpen(!ownerDropdownOpen); setStageDropdownOpen(false); }}
            className="text-sm border border-gray-300 rounded px-2.5 py-1.5 bg-white text-gray-900 flex items-center gap-1 min-w-[130px]"
          >
            <span className="flex-1 text-left">{ownerFilterLabel}</span>
            <span className="text-xs text-gray-400">{ownerDropdownOpen ? "▲" : "▼"}</span>
          </button>
          {ownerDropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setOwnerDropdownOpen(false)} />
              <div className="absolute z-20 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[220px]">
                <div className="flex gap-2 px-3 py-1.5 border-b border-gray-100">
                  <button onClick={() => setSelectedOwners(new Set(owners))} className="text-xs text-blue-600 hover:underline">Select all</button>
                  <button onClick={() => setSelectedOwners(new Set())} className="text-xs text-blue-600 hover:underline">Clear all</button>
                </div>
                {owners.map((owner) => (
                  <label key={owner} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer">
                    <input type="checkbox" checked={selectedOwners.has(owner)} onChange={() => toggleOwner(owner)} className="rounded border-gray-300" />
                    <span className="text-sm text-gray-900">{owner}</span>
                  </label>
                ))}
              </div>
            </>
          )}
        </div>

        <span className="text-xs text-gray-400 ml-auto">
          {filteredDeals.length} deal{filteredDeals.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {/* Star column — sticky, pinned to left edge */}
              <th
                className="sticky left-0 z-20 bg-gray-50 px-2 py-2"
                style={{ width: 40, minWidth: 40 }}
                title="Key Deal"
              >
                <span className="text-gray-400 text-xs">★</span>
              </th>
              {/* Deal name — sticky, pinned immediately after star (40px) */}
              <SortHeader
                field="opportunity_name"
                label="Deal"
                className="sticky bg-gray-50 z-20 min-w-[180px] shadow-[2px_0_4px_-1px_rgba(0,0,0,0.08)]"
                style={{ left: 40 }}
              />
              <SortHeader field="owner" label="Rep" />
              <SortHeader field="amount" label="Amount" />
              <SortHeader field="predictive_amount" label="Weighted" />
              <SortHeader field="stage" label="SF Stage" />
              <SortHeader field="detailed_stage" label="Detailed Stage" />
              <SortHeader field="close_date" label="Close Date" />
              <SortHeader field="days_to_close" label="Days to Close" />
              <SortHeader field="days_since_last_activity" label="Last Activity" />
              <SortHeader field="activity_trend" label="Trend" />
              <SortHeader field="probability" label="Prob %" />
              <SortHeader field="completed_count" label="Completed" />
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">
                Missing
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredDeals.map((deal) => {
              const completedCount = deal.checklist.filter((i) => i.completed).length;
              const missingCount = totalItems - completedCount;

              return (
                <tr
                  key={deal.id}
                  className="group hover:bg-blue-50 cursor-pointer transition-colors"
                  onClick={() => onOpenDeal(deal.id)}
                >
                  {/* Key deal star — sticky col 1, explicit pixel width to prevent gap */}
                  <td
                    className="sticky left-0 z-10 bg-white group-hover:bg-blue-50 transition-colors px-2 py-2 text-center"
                    style={{ width: 40, minWidth: 40 }}
                  >
                    <button
                      onClick={(e) => handleToggleKeyDeal(e, deal.id, deal.is_key_deal ?? false)}
                      title={deal.is_key_deal ? "Remove Key Deal flag" : "Mark as Key Deal"}
                      className={`text-base transition-colors hover:scale-110 ${
                        deal.is_key_deal ? "text-yellow-400" : "text-gray-200 hover:text-yellow-300"
                      }`}
                    >
                      {deal.is_key_deal ? "★" : "☆"}
                    </button>
                  </td>

                  {/* Deal name — sticky col 2, left matches star width exactly */}
                  <td
                    className="sticky z-10 bg-white group-hover:bg-blue-50 transition-colors px-3 py-2.5 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.08)]"
                    style={{ left: 40 }}
                  >
                    <div className="font-medium text-gray-900 truncate max-w-[180px]" title={deal.opportunity_name}>
                      {deal.opportunity_name}
                    </div>
                    <div className="text-xs text-gray-400 truncate max-w-[180px]">{deal.account_name}</div>
                  </td>

                  <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap">{deal.owner}</td>

                  <td className="px-3 py-2.5 font-medium text-gray-900 whitespace-nowrap">
                    {formatCurrency(deal.amount)}
                  </td>

                  {/* Weighted value */}
                  <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">
                    {formatCurrency(deal.predictive_amount)}
                  </td>

                  {/* SF Stage badge */}
                  <td className="px-3 py-2.5">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${stageColor(deal.stage)}`}>
                      {deal.stage}
                    </span>
                  </td>

                  {/* Detailed Stage */}
                  <td className="px-3 py-2.5 text-gray-600 text-xs whitespace-nowrap">
                    {deal.detailed_stage ? (
                      <span className="inline-block px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-medium">
                        {deal.detailed_stage}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>

                  {/* Close Date */}
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <span className={deal.metrics.is_overdue ? "text-red-600 font-medium" : "text-gray-700"}>
                      {formatDate(deal.close_date)}
                    </span>
                  </td>

                  {/* Days to Close */}
                  <td className="px-3 py-2.5">
                    {deal.metrics.is_overdue ? (
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-medium text-red-700 bg-red-50">
                        Overdue
                      </span>
                    ) : (
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        deal.metrics.days_to_close <= 14 ? "text-red-700 bg-red-50" :
                        deal.metrics.days_to_close <= 30 ? "text-yellow-700 bg-yellow-50" :
                        "text-gray-600 bg-gray-50"
                      }`}>
                        {deal.metrics.days_to_close}d
                      </span>
                    )}
                  </td>

                  {/* Last Activity */}
                  <td className="px-3 py-2.5">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${stalenessColor(deal.metrics.days_since_last_activity)}`}>
                      {deal.metrics.days_since_last_activity}d ago
                    </span>
                  </td>

                  {/* Trend */}
                  <td className="px-3 py-2.5">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${trendBadge(deal.metrics.activity_trend)}`}>
                      {trendShort(deal.metrics.activity_trend)}
                    </span>
                  </td>

                  {/* Probability */}
                  <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap">
                    {deal.probability}%
                  </td>

                  {/* Completed count */}
                  <td className="px-3 py-2.5">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      completedCount === totalItems ? "text-green-700 bg-green-50" :
                      completedCount >= totalItems / 2 ? "text-blue-700 bg-blue-50" :
                      "text-gray-500 bg-gray-50"
                    }`}>
                      {completedCount} / {totalItems}
                    </span>
                  </td>

                  {/* Missing count */}
                  <td className="px-3 py-2.5">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      missingCount === 0 ? "text-green-700 bg-green-50" :
                      missingCount <= 3 ? "text-yellow-700 bg-yellow-50" :
                      "text-orange-700 bg-orange-50"
                    }`}>
                      {missingCount}
                    </span>
                  </td>
                </tr>
              );
            })}

            {filteredDeals.length === 0 && (
              <tr>
                <td colSpan={14} className="px-3 py-10 text-center text-gray-400 text-sm">
                  No deals match the current filters
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
