"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { calculateDealMetrics } from "@/lib/metrics";
import type { Deal, Activity, DealWithMetrics } from "@/lib/types";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function stalenessColor(days: number): string {
  if (days <= 7) return "text-green-600 bg-green-50";
  if (days <= 14) return "text-yellow-600 bg-yellow-50";
  return "text-red-600 bg-red-50";
}

function stageColor(stage: string): string {
  if (stage.includes("Closed Lost")) return "bg-red-100 text-red-700";
  if (stage.includes("Closed Won")) return "bg-green-100 text-green-700";
  if (stage.includes("Commit")) return "bg-blue-100 text-blue-700";
  return "bg-gray-100 text-gray-700";
}

interface RepSummary {
  name: string;
  dealCount: number;
  totalValue: number;
  weightedValue: number;
  dealsAtRisk: number;
  avgDaysSinceActivity: number;
  deals: DealWithMetrics[];
}

export default function RepsPage() {
  const [reps, setReps] = useState<RepSummary[]>([]);
  const [expandedRep, setExpandedRep] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);

    try {
      const { data: dealsData, error: dealsError } = await supabase
        .from("deals")
        .select("*");

      if (dealsError) throw dealsError;

      const { data: activitiesData, error: actError } = await supabase
        .from("activities")
        .select("*");

      if (actError) throw actError;

      const { data: analysesData } = await supabase
        .from("analyses")
        .select("deal_id");

      const analyzedDealIds = new Set(
        (analysesData || []).map((a: { deal_id: string }) => a.deal_id)
      );

      // Group activities by deal
      const activitiesByDeal = new Map<string, Activity[]>();
      for (const activity of activitiesData || []) {
        const existing = activitiesByDeal.get(activity.deal_id) || [];
        existing.push(activity);
        activitiesByDeal.set(activity.deal_id, existing);
      }

      // Build deals with metrics
      const dealsWithMetrics: DealWithMetrics[] = (dealsData as Deal[]).map(
        (deal) => ({
          ...deal,
          metrics: calculateDealMetrics(deal, activitiesByDeal.get(deal.id) || []),
          has_analysis: analyzedDealIds.has(deal.id),
        })
      );

      // Group by rep — only open deals
      const openDeals = dealsWithMetrics.filter(
        (d) => !d.stage.toLowerCase().includes("closed")
      );

      const repMap = new Map<string, DealWithMetrics[]>();
      for (const deal of openDeals) {
        const existing = repMap.get(deal.owner) || [];
        existing.push(deal);
        repMap.set(deal.owner, existing);
      }

      const repSummaries: RepSummary[] = Array.from(repMap.entries())
        .map(([name, deals]) => {
          const totalValue = deals.reduce((sum, d) => sum + d.amount, 0);
          const weightedValue = deals.reduce(
            (sum, d) => sum + d.amount * (d.probability / 100),
            0
          );
          const dealsAtRisk = deals.filter(
            (d) =>
              d.metrics.days_since_last_activity > 14 || d.metrics.is_overdue
          ).length;
          const avgDaysSinceActivity =
            deals.length > 0
              ? Math.round(
                  deals.reduce(
                    (sum, d) => sum + d.metrics.days_since_last_activity,
                    0
                  ) / deals.length
                )
              : 0;

          return {
            name,
            dealCount: deals.length,
            totalValue,
            weightedValue,
            dealsAtRisk,
            avgDaysSinceActivity,
            deals: deals.sort(
              (a, b) =>
                b.metrics.days_since_last_activity -
                a.metrics.days_since_last_activity
            ),
          };
        })
        .sort((a, b) => b.totalValue - a.totalValue);

      setReps(repSummaries);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12 text-gray-400 text-sm">
        Loading rep data...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
        <p className="font-medium">Error loading data</p>
        <p>{error}</p>
      </div>
    );
  }

  if (reps.length === 0) {
    return (
      <div className="text-center py-16">
        <h2 className="text-lg font-medium text-gray-700 mb-2">No rep data</h2>
        <p className="text-sm text-gray-500">
          Upload a Salesforce CSV to see pipeline by rep.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">Rep View</h1>

      {/* Rep Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reps.map((rep) => (
          <div
            key={rep.name}
            className="bg-white rounded-lg border border-gray-200 overflow-hidden"
          >
            {/* Rep Summary Header */}
            <button
              className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
              onClick={() =>
                setExpandedRep(expandedRep === rep.name ? null : rep.name)
              }
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{rep.name}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {rep.dealCount} open deal{rep.dealCount !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-gray-900">
                    {formatCurrency(rep.totalValue)}
                  </p>
                  <p className="text-xs text-gray-400">
                    {formatCurrency(rep.weightedValue)} weighted
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="bg-gray-50 rounded px-3 py-2">
                  <p className="text-xs text-gray-500">Avg Days Since Activity</p>
                  <p
                    className={`text-sm font-medium ${
                      rep.avgDaysSinceActivity <= 7
                        ? "text-green-600"
                        : rep.avgDaysSinceActivity <= 14
                        ? "text-yellow-600"
                        : "text-red-600"
                    }`}
                  >
                    {rep.avgDaysSinceActivity}d
                  </p>
                </div>
                <div
                  className={`rounded px-3 py-2 ${
                    rep.dealsAtRisk > 0 ? "bg-red-50" : "bg-gray-50"
                  }`}
                >
                  <p className="text-xs text-gray-500">Deals at Risk</p>
                  <p
                    className={`text-sm font-medium ${
                      rep.dealsAtRisk > 0 ? "text-red-600" : "text-green-600"
                    }`}
                  >
                    {rep.dealsAtRisk}
                  </p>
                </div>
              </div>

              <div className="flex justify-center mt-2">
                <span className="text-xs text-gray-400">
                  {expandedRep === rep.name
                    ? "\u25B2 Hide deals"
                    : "\u25BC Show deals"}
                </span>
              </div>
            </button>

            {/* Expanded Deal List */}
            {expandedRep === rep.name && (
              <div className="border-t border-gray-100">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">
                        Opportunity
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">
                        Stage
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">
                        Amount
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">
                        Close Date
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">
                        Last Activity
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rep.deals.map((deal) => (
                      <tr key={deal.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2">
                          <Link
                            href={`/deal/${deal.id}`}
                            className="text-blue-600 hover:underline"
                          >
                            {deal.opportunity_name}
                          </Link>
                          <p className="text-xs text-gray-400">
                            {deal.account_name}
                          </p>
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${stageColor(deal.stage)}`}
                          >
                            {deal.stage}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-medium text-gray-900">
                          {formatCurrency(deal.amount)}
                        </td>
                        <td className="px-3 py-2 text-gray-900">
                          <span
                            className={
                              deal.metrics.is_overdue
                                ? "text-red-600 font-medium"
                                : ""
                            }
                          >
                            {formatDate(deal.close_date)}
                            {deal.metrics.is_overdue && " (overdue)"}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${stalenessColor(deal.metrics.days_since_last_activity)}`}
                          >
                            {deal.metrics.days_since_last_activity}d ago
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
