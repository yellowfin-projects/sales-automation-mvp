"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { calculateDealMetrics } from "@/lib/metrics";
import type { Deal, Activity, DealMetrics } from "@/lib/types";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function trendLabel(trend: DealMetrics["activity_trend"]): string {
  switch (trend) {
    case "accelerating":
      return "Accelerating";
    case "decelerating":
      return "Decelerating";
    case "steady":
      return "Steady";
    case "new":
      return "New (not enough data)";
  }
}

function trendColor(trend: DealMetrics["activity_trend"]): string {
  switch (trend) {
    case "accelerating":
      return "text-green-600 bg-green-50";
    case "decelerating":
      return "text-red-600 bg-red-50";
    case "steady":
      return "text-blue-600 bg-blue-50";
    case "new":
      return "text-gray-600 bg-gray-50";
  }
}

function activityTypeBadge(type: string): string {
  switch (type) {
    case "Email":
      return "bg-purple-100 text-purple-700";
    case "Call":
      return "bg-green-100 text-green-700";
    default:
      return "bg-gray-100 text-gray-600";
  }
}

export default function DealDetailPage() {
  const params = useParams();
  const dealId = params.id as string;

  const [deal, setDeal] = useState<Deal | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [metrics, setMetrics] = useState<DealMetrics | null>(null);
  const [expandedActivity, setExpandedActivity] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDeal();
  }, [dealId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadDeal() {
    setLoading(true);
    try {
      const { data: dealData, error: dealError } = await supabase
        .from("deals")
        .select("*")
        .eq("id", dealId)
        .single();

      if (dealError) throw dealError;

      const { data: activitiesData, error: actError } = await supabase
        .from("activities")
        .select("*")
        .eq("deal_id", dealId)
        .order("activity_date", { ascending: false });

      if (actError) throw actError;

      setDeal(dealData as Deal);
      setActivities((activitiesData as Activity[]) || []);
      setMetrics(
        calculateDealMetrics(
          dealData as Deal,
          (activitiesData as Activity[]) || []
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load deal");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-400 text-sm">Loading deal...</div>;
  }

  if (error || !deal || !metrics) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
        {error || "Deal not found"}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="text-sm text-gray-500">
        <Link href="/" className="hover:text-gray-700">
          Pipeline
        </Link>{" "}
        / {deal.opportunity_name}
      </div>

      {/* Deal Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {deal.opportunity_name}
            </h1>
            <p className="text-sm text-gray-500 mt-1">{deal.account_name}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-semibold text-gray-900">
              {formatCurrency(deal.amount)}
            </p>
            <p className="text-sm text-gray-500">{deal.probability}% probability</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 text-sm">
          <div>
            <span className="text-gray-500">Stage</span>
            <p className="font-medium text-gray-900">{deal.stage}</p>
          </div>
          <div>
            <span className="text-gray-500">Close Date</span>
            <p className={`font-medium ${metrics.is_overdue ? "text-red-600" : "text-gray-900"}`}>
              {formatDate(deal.close_date)}
              {metrics.is_overdue && " (overdue)"}
            </p>
          </div>
          <div>
            <span className="text-gray-500">Owner</span>
            <p className="font-medium text-gray-900">{deal.owner}</p>
          </div>
          <div>
            <span className="text-gray-500">Region</span>
            <p className="font-medium text-gray-900">{deal.region}</p>
          </div>
        </div>
      </div>

      {/* Metrics Panel */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-sm font-medium text-gray-700 mb-4">Deal Health Metrics</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <MetricCard
            label="Days Since Activity"
            value={`${metrics.days_since_last_activity}d`}
            color={
              metrics.days_since_last_activity <= 7
                ? "text-green-600"
                : metrics.days_since_last_activity <= 14
                ? "text-yellow-600"
                : "text-red-600"
            }
          />
          <MetricCard
            label="Days to Close"
            value={metrics.is_overdue ? "Overdue" : `${metrics.days_to_close}d`}
            color={metrics.is_overdue ? "text-red-600" : "text-gray-900"}
          />
          <MetricCard
            label="Total Activities"
            value={String(metrics.total_activities)}
            subtitle={`${metrics.email_count} emails, ${metrics.call_count} calls`}
          />
          <MetricCard
            label="Stakeholders"
            value={String(metrics.stakeholder_count)}
            subtitle="Unique contacts from calls"
          />
          <div className="col-span-2 sm:col-span-1">
            <p className="text-xs text-gray-500">Activity Trend</p>
            <span
              className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${trendColor(metrics.activity_trend)}`}
            >
              {trendLabel(metrics.activity_trend)}
            </span>
          </div>
          <MetricCard
            label="Max Activity Gap"
            value={`${metrics.max_activity_gap_days}d`}
            subtitle="Longest silence between activities"
          />
        </div>
      </div>

      {/* AI Analysis placeholder — Phase 3 */}
      <div className="bg-gray-50 rounded-lg border border-dashed border-gray-300 p-6 text-center">
        <p className="text-sm text-gray-500">
          AI Deal Analysis will be available in a future update.
        </p>
      </div>

      {/* Activity Timeline */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-sm font-medium text-gray-700 mb-4">
          Activity Timeline ({activities.length} activities)
        </h2>
        <div className="space-y-2">
          {activities.map((activity) => {
            const isExpanded = expandedActivity === activity.id;
            const hasComments = activity.full_comments?.trim();
            const isChorus = activity.activity_type === "Call" &&
              activity.full_comments?.includes("MEETING SUMMARY:");

            return (
              <div
                key={activity.id}
                className={`border rounded-lg ${
                  isChorus ? "border-green-200" : "border-gray-100"
                }`}
              >
                <button
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50"
                  onClick={() =>
                    hasComments
                      ? setExpandedActivity(isExpanded ? null : activity.id)
                      : undefined
                  }
                >
                  <span className="text-xs text-gray-400 w-20 shrink-0">
                    {formatDate(activity.activity_date)}
                  </span>
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-medium shrink-0 ${activityTypeBadge(activity.activity_type)}`}
                  >
                    {activity.activity_type || "Other"}
                  </span>
                  <span className="text-sm text-gray-700 truncate flex-1">
                    {activity.subject}
                  </span>
                  {hasComments && (
                    <span className="text-xs text-gray-400 shrink-0">
                      {isExpanded ? "\u25B2" : "\u25BC"}
                    </span>
                  )}
                </button>
                {isExpanded && hasComments && (
                  <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                    <pre className="text-xs text-gray-600 whitespace-pre-wrap font-sans leading-relaxed">
                      {activity.full_comments}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
          {activities.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">
              No activities recorded for this deal.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  subtitle,
  color = "text-gray-900",
}: {
  label: string;
  value: string;
  subtitle?: string;
  color?: string;
}) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-lg font-semibold mt-0.5 ${color}`}>{value}</p>
      {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
    </div>
  );
}
