"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { DealWithMetrics } from "@/lib/types";

interface DealTableProps {
  deals: DealWithMetrics[];
}

type SortField =
  | "account_name"
  | "opportunity_name"
  | "stage"
  | "amount"
  | "close_date"
  | "owner"
  | "days_since_last_activity"
  | "total_activities";

type SortDirection = "asc" | "desc";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Color code for "days since last activity" — green/yellow/red */
function stalenessColor(days: number): string {
  if (days <= 7) return "text-green-600 bg-green-50";
  if (days <= 14) return "text-yellow-600 bg-yellow-50";
  return "text-red-600 bg-red-50";
}

/** Badge color for deal stage */
function stageColor(stage: string): string {
  if (stage.includes("Closed Lost")) return "bg-red-100 text-red-700";
  if (stage.includes("Closed Won")) return "bg-green-100 text-green-700";
  if (stage.includes("Commit")) return "bg-blue-100 text-blue-700";
  return "bg-gray-100 text-gray-700";
}

export default function DealTable({ deals }: DealTableProps) {
  const [sortField, setSortField] = useState<SortField>("days_since_last_activity");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");
  const [stageDropdownOpen, setStageDropdownOpen] = useState(false);
  const [ownerDropdownOpen, setOwnerDropdownOpen] = useState(false);

  // Get unique stages and owners for filter dropdowns
  const stages = useMemo(
    () => [...new Set(deals.map((d) => d.stage))].sort(),
    [deals]
  );
  const owners = useMemo(
    () => [...new Set(deals.map((d) => d.owner))].sort(),
    [deals]
  );

  // All stages selected by default
  const [selectedStages, setSelectedStages] = useState<Set<string>>(
    () => new Set(stages)
  );

  function toggleStage(stage: string) {
    setSelectedStages((prev) => {
      const next = new Set(prev);
      if (next.has(stage)) {
        next.delete(stage);
      } else {
        next.add(stage);
      }
      return next;
    });
  }

  function selectAllStages() {
    setSelectedStages(new Set(stages));
  }

  function clearAllStages() {
    setSelectedStages(new Set());
  }

  const allStagesSelected = selectedStages.size === stages.length;
  const stageFilterLabel =
    allStagesSelected
      ? "All Stages"
      : selectedStages.size === 0
      ? "No Stages"
      : selectedStages.size === 1
      ? [...selectedStages][0]
      : `${selectedStages.size} Stages`;

  // All owners selected by default
  const [selectedOwners, setSelectedOwners] = useState<Set<string>>(
    () => new Set(owners)
  );

  function toggleOwner(owner: string) {
    setSelectedOwners((prev) => {
      const next = new Set(prev);
      if (next.has(owner)) {
        next.delete(owner);
      } else {
        next.add(owner);
      }
      return next;
    });
  }

  function selectAllOwners() {
    setSelectedOwners(new Set(owners));
  }

  function clearAllOwners() {
    setSelectedOwners(new Set());
  }

  const allOwnersSelected = selectedOwners.size === owners.length;
  const ownerFilterLabel =
    allOwnersSelected
      ? "All Reps"
      : selectedOwners.size === 0
      ? "No Reps"
      : selectedOwners.size === 1
      ? [...selectedOwners][0]
      : `${selectedOwners.size} Reps`;

  // Filter and sort
  const filteredDeals = useMemo(() => {
    let filtered = deals;
    if (!allStagesSelected) {
      filtered = filtered.filter((d) => selectedStages.has(d.stage));
    }
    if (!allOwnersSelected) {
      filtered = filtered.filter((d) => selectedOwners.has(d.owner));
    }

    return [...filtered].sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;

      switch (sortField) {
        case "days_since_last_activity":
          aVal = a.metrics.days_since_last_activity;
          bVal = b.metrics.days_since_last_activity;
          break;
        case "total_activities":
          aVal = a.metrics.total_activities;
          bVal = b.metrics.total_activities;
          break;
        case "amount":
          aVal = a.amount;
          bVal = b.amount;
          break;
        case "close_date":
          aVal = a.close_date;
          bVal = b.close_date;
          break;
        default:
          aVal = a[sortField] || "";
          bVal = b[sortField] || "";
      }

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      const comparison = String(aVal).localeCompare(String(bVal));
      return sortDir === "asc" ? comparison : -comparison;
    });
  }, [deals, sortField, sortDir, selectedStages, allStagesSelected, selectedOwners, allOwnersSelected]);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  }

  function SortHeader({ field, label }: { field: SortField; label: string }) {
    const isActive = sortField === field;
    return (
      <th
        className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase cursor-pointer hover:text-gray-900 select-none"
        onClick={() => handleSort(field)}
      >
        {label}
        {isActive && (
          <span className="ml-1">{sortDir === "asc" ? "\u2191" : "\u2193"}</span>
        )}
      </th>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 p-3 border-b border-gray-100">
        {/* Multi-select stage filter */}
        <div className="relative">
          <button
            onClick={() => setStageDropdownOpen(!stageDropdownOpen)}
            className="text-sm border border-gray-300 rounded px-2 py-1.5 bg-white text-gray-900 flex items-center gap-1 min-w-[130px]"
          >
            <span className="flex-1 text-left">{stageFilterLabel}</span>
            <span className="text-xs text-gray-400">{stageDropdownOpen ? "\u25B2" : "\u25BC"}</span>
          </button>
          {stageDropdownOpen && (
            <>
              {/* Invisible overlay to close dropdown when clicking outside */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setStageDropdownOpen(false)}
              />
              <div className="absolute z-20 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[220px]">
                <div className="flex gap-2 px-3 py-1.5 border-b border-gray-100">
                  <button
                    onClick={selectAllStages}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Select all
                  </button>
                  <button
                    onClick={clearAllStages}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Clear all
                  </button>
                </div>
                {stages.map((stage) => (
                  <label
                    key={stage}
                    className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedStages.has(stage)}
                      onChange={() => toggleStage(stage)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-900">{stage}</span>
                  </label>
                ))}
              </div>
            </>
          )}
        </div>
        {/* Multi-select rep filter */}
        <div className="relative">
          <button
            onClick={() => setOwnerDropdownOpen(!ownerDropdownOpen)}
            className="text-sm border border-gray-300 rounded px-2 py-1.5 bg-white text-gray-900 flex items-center gap-1 min-w-[130px]"
          >
            <span className="flex-1 text-left">{ownerFilterLabel}</span>
            <span className="text-xs text-gray-400">{ownerDropdownOpen ? "\u25B2" : "\u25BC"}</span>
          </button>
          {ownerDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setOwnerDropdownOpen(false)}
              />
              <div className="absolute z-20 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[220px]">
                <div className="flex gap-2 px-3 py-1.5 border-b border-gray-100">
                  <button
                    onClick={selectAllOwners}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Select all
                  </button>
                  <button
                    onClick={clearAllOwners}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Clear all
                  </button>
                </div>
                {owners.map((owner) => (
                  <label
                    key={owner}
                    className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedOwners.has(owner)}
                      onChange={() => toggleOwner(owner)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-900">{owner}</span>
                  </label>
                ))}
              </div>
            </>
          )}
        </div>
        <span className="text-xs text-gray-400 self-center">
          {filteredDeals.length} deal{filteredDeals.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <SortHeader field="account_name" label="Account" />
              <SortHeader field="opportunity_name" label="Opportunity" />
              <SortHeader field="stage" label="Stage" />
              <SortHeader field="amount" label="Amount" />
              <SortHeader field="close_date" label="Close Date" />
              <SortHeader field="owner" label="Rep" />
              <SortHeader field="days_since_last_activity" label="Last Activity" />
              <SortHeader field="total_activities" label="Activities" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredDeals.map((deal) => (
              <tr key={deal.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 text-gray-900">{deal.account_name}</td>
                <td className="px-3 py-2">
                  <Link
                    href={`/deal/${deal.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    {deal.opportunity_name}
                  </Link>
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${stageColor(deal.stage)}`}
                  >
                    {deal.stage}
                  </span>
                </td>
                <td className="px-3 py-2 text-gray-900 font-medium">
                  {formatCurrency(deal.amount)}
                </td>
                <td className="px-3 py-2 text-gray-700">
                  <span className={deal.metrics.is_overdue ? "text-red-600 font-medium" : ""}>
                    {formatDate(deal.close_date)}
                    {deal.metrics.is_overdue && " (overdue)"}
                  </span>
                </td>
                <td className="px-3 py-2 text-gray-900">{deal.owner}</td>
                <td className="px-3 py-2">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${stalenessColor(deal.metrics.days_since_last_activity)}`}
                  >
                    {deal.metrics.days_since_last_activity}d ago
                  </span>
                </td>
                <td className="px-3 py-2 text-gray-700">
                  {deal.metrics.total_activities}
                  <span className="text-xs text-gray-400 ml-1">
                    ({deal.metrics.email_count}e / {deal.metrics.call_count}c)
                  </span>
                </td>
              </tr>
            ))}
            {filteredDeals.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-gray-400">
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
