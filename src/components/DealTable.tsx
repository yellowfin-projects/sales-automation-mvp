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
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [ownerFilter, setOwnerFilter] = useState<string>("all");

  // Get unique stages and owners for filter dropdowns
  const stages = useMemo(
    () => [...new Set(deals.map((d) => d.stage))].sort(),
    [deals]
  );
  const owners = useMemo(
    () => [...new Set(deals.map((d) => d.owner))].sort(),
    [deals]
  );

  // Filter and sort
  const filteredDeals = useMemo(() => {
    let filtered = deals;
    if (stageFilter !== "all") {
      filtered = filtered.filter((d) => d.stage === stageFilter);
    }
    if (ownerFilter !== "all") {
      filtered = filtered.filter((d) => d.owner === ownerFilter);
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
  }, [deals, sortField, sortDir, stageFilter, ownerFilter]);

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
        className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700 select-none"
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
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          className="text-sm border border-gray-200 rounded px-2 py-1"
        >
          <option value="all">All Stages</option>
          {stages.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={ownerFilter}
          onChange={(e) => setOwnerFilter(e.target.value)}
          className="text-sm border border-gray-200 rounded px-2 py-1"
        >
          <option value="all">All Reps</option>
          {owners.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
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
                <td className="px-3 py-2 text-gray-700">{deal.account_name}</td>
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
                <td className="px-3 py-2 text-gray-700 font-medium">
                  {formatCurrency(deal.amount)}
                </td>
                <td className="px-3 py-2 text-gray-700">
                  <span className={deal.metrics.is_overdue ? "text-red-600 font-medium" : ""}>
                    {formatDate(deal.close_date)}
                    {deal.metrics.is_overdue && " (overdue)"}
                  </span>
                </td>
                <td className="px-3 py-2 text-gray-700">{deal.owner}</td>
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
