"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { calculateDealMetrics, calculatePipelineMetrics } from "@/lib/metrics";
import SummaryCards from "@/components/SummaryCards";
import StageFunnel from "@/components/StageFunnel";
import DealTable from "@/components/DealTable";
import DealsAtRisk from "@/components/DealsAtRisk";
import type { Deal, Activity, DealWithMetrics, PipelineMetrics } from "@/lib/types";

export default function PipelineOverview() {
  const [deals, setDeals] = useState<DealWithMetrics[]>([]);
  const [pipelineMetrics, setPipelineMetrics] = useState<PipelineMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);

    try {
      // Fetch all deals
      const { data: dealsData, error: dealsError } = await supabase
        .from("deals")
        .select("*")
        .order("updated_at", { ascending: false });

      if (dealsError) throw dealsError;
      if (!dealsData || dealsData.length === 0) {
        setDeals([]);
        setPipelineMetrics(null);
        setLoading(false);
        return;
      }

      // Fetch all activities
      const { data: activitiesData, error: activitiesError } = await supabase
        .from("activities")
        .select("*");

      if (activitiesError) throw activitiesError;

      // Fetch which deals have analyses
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

      // Calculate metrics for each deal
      const dealsWithMetrics: DealWithMetrics[] = (dealsData as Deal[]).map(
        (deal) => ({
          ...deal,
          metrics: calculateDealMetrics(
            deal,
            activitiesByDeal.get(deal.id) || []
          ),
          has_analysis: analyzedDealIds.has(deal.id),
        })
      );

      setDeals(dealsWithMetrics);
      setPipelineMetrics(calculatePipelineMetrics(dealsWithMetrics));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12 text-gray-400 text-sm">
        Loading pipeline data...
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

  if (deals.length === 0) {
    return (
      <div className="text-center py-16">
        <h2 className="text-lg font-medium text-gray-700 mb-2">
          No pipeline data yet
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Upload a Salesforce CSV export to get started.
        </p>
        <a
          href="/settings"
          className="inline-block bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
        >
          Go to Settings to Upload
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">Pipeline Overview</h1>

      {pipelineMetrics && <SummaryCards metrics={pipelineMetrics} />}

      {pipelineMetrics && (
        <StageFunnel data={pipelineMetrics.deals_by_stage} />
      )}

      <DealsAtRisk deals={deals} />

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">All Deals</h2>
        <DealTable deals={deals} />
      </div>
    </div>
  );
}
