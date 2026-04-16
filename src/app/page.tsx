"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { calculateDealMetrics, calculatePipelineMetrics } from "@/lib/metrics";
import SummaryCards from "@/components/SummaryCards";
import DealTable from "@/components/DealTable";
import DealSlideOver from "@/components/DealSlideOver";
import type {
  Deal,
  Activity,
  DealWithMetrics,
  PipelineMetrics,
  DealChecklistItem,
} from "@/lib/types";

export default function PipelineOverview() {
  const [deals, setDeals] = useState<DealWithMetrics[]>([]);
  const [pipelineMetrics, setPipelineMetrics] = useState<PipelineMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
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

      const { data: activitiesData, error: activitiesError } = await supabase
        .from("activities")
        .select("*");

      if (activitiesError) throw activitiesError;

      const { data: analysesData } = await supabase
        .from("analyses")
        .select("deal_id");

      const { data: checklistData } = await supabase
        .from("deal_checklist")
        .select("*");

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

      // Group checklist items by deal
      const checklistByDeal = new Map<string, DealChecklistItem[]>();
      for (const item of (checklistData as DealChecklistItem[]) || []) {
        const existing = checklistByDeal.get(item.deal_id) || [];
        existing.push(item);
        checklistByDeal.set(item.deal_id, existing);
      }

      const dealsWithMetrics: DealWithMetrics[] = (dealsData as Deal[]).map((deal) => ({
        ...deal,
        metrics: calculateDealMetrics(deal, activitiesByDeal.get(deal.id) || []),
        has_analysis: analyzedDealIds.has(deal.id),
        checklist: checklistByDeal.get(deal.id) || [],
      }));

      setDeals(dealsWithMetrics);
      setPipelineMetrics(calculatePipelineMetrics(dealsWithMetrics));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
        <h2 className="text-lg font-medium text-gray-700 mb-2">No pipeline data yet</h2>
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

  // Optimistic updates — update local state instantly, no full reload

  function handleToggleKeyDeal(dealId: string, newValue: boolean) {
    setDeals((prev) =>
      prev.map((d) => (d.id === dealId ? { ...d, is_key_deal: newValue } : d))
    );
  }

  function handleDetailedStageChange(dealId: string, value: string | null) {
    setDeals((prev) =>
      prev.map((d) => (d.id === dealId ? { ...d, detailed_stage: value } : d))
    );
  }

  function handleChecklistChange(dealId: string, category: string, completed: boolean) {
    setDeals((prev) =>
      prev.map((d) => {
        if (d.id !== dealId) return d;
        const idx = d.checklist.findIndex((i) => i.category === category);
        const newChecklist = [...d.checklist];
        if (idx >= 0) {
          newChecklist[idx] = { ...newChecklist[idx], completed };
        } else {
          newChecklist.push({
            id: crypto.randomUUID(),
            deal_id: dealId,
            category,
            completed,
            source: "user",
            ai_confidence: "",
            updated_at: new Date().toISOString(),
          });
        }
        return { ...d, checklist: newChecklist };
      })
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">Pipeline Overview</h1>

      {pipelineMetrics && <SummaryCards metrics={pipelineMetrics} />}

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">All Deals</h2>
        <DealTable
          deals={deals}
          onOpenDeal={setSelectedDealId}
          onDataChange={loadData}
          onToggleKeyDeal={handleToggleKeyDeal}
        />
      </div>

      {selectedDealId && (
        <DealSlideOver
          dealId={selectedDealId}
          onClose={() => setSelectedDealId(null)}
          onDataChange={loadData}
          onToggleKeyDeal={handleToggleKeyDeal}
          onDetailedStageChange={handleDetailedStageChange}
          onChecklistChange={handleChecklistChange}
        />
      )}
    </div>
  );
}
