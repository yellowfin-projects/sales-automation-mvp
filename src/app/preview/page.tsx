"use client";

/**
 * LOCAL PREVIEW ONLY — uses hardcoded mock data so you can see the new UI
 * without running the DB migration. Visit http://localhost:3000/preview
 * Remove this file before or after deploying to production.
 */

import { useState } from "react";
import DealTable from "@/components/DealTable";
import SummaryCards from "@/components/SummaryCards";
import type { DealWithMetrics, PipelineMetrics, DealNote } from "@/lib/types";

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_DEALS: DealWithMetrics[] = [
  {
    id: "deal-1",
    opportunity_name: "Yellowfin Enterprise Expansion",
    account_name: "Acme Financial Group",
    stage: "3-Commit",
    detailed_stage: "Verbal Commit",
    is_key_deal: true,
    amount: 420000,
    currency: "USD",
    probability: 85,
    predictive_amount: 357000,
    close_date: "2026-04-30",
    owner: "Sarah Chen",
    opportunity_type: "Expansion",
    region: "AMER",
    created_at: "2025-10-01T00:00:00Z",
    updated_at: "2026-04-10T00:00:00Z",
    has_analysis: true,
    metrics: {
      deal_id: "deal-1",
      total_activities: 34,
      email_count: 22,
      call_count: 12,
      days_since_last_activity: 3,
      days_to_close: 15,
      is_overdue: false,
      activity_trend: "accelerating",
      stakeholder_count: 6,
      max_activity_gap_days: 8,
    },
    checklist: [
      { id: "c1", deal_id: "deal-1", category: "Discovery Complete", completed: true, source: "ai", ai_confidence: "high", updated_at: "" },
      { id: "c2", deal_id: "deal-1", category: "Champion Identified", completed: true, source: "user", ai_confidence: "", updated_at: "" },
      { id: "c3", deal_id: "deal-1", category: "Executive Sponsor Engaged", completed: true, source: "ai", ai_confidence: "high", updated_at: "" },
      { id: "c4", deal_id: "deal-1", category: "Technical Sign-off Received", completed: true, source: "ai", ai_confidence: "medium", updated_at: "" },
      { id: "c5", deal_id: "deal-1", category: "POC / Pilot Complete", completed: true, source: "user", ai_confidence: "", updated_at: "" },
      { id: "c6", deal_id: "deal-1", category: "Business Case Approved", completed: true, source: "ai", ai_confidence: "high", updated_at: "" },
      { id: "c7", deal_id: "deal-1", category: "Decision Process Known", completed: true, source: "user", ai_confidence: "", updated_at: "" },
      { id: "c8", deal_id: "deal-1", category: "Pricing Presented", completed: true, source: "ai", ai_confidence: "high", updated_at: "" },
      { id: "c9", deal_id: "deal-1", category: "Pricing Approved", completed: false, source: "none", ai_confidence: "", updated_at: "" },
      { id: "c10", deal_id: "deal-1", category: "Procurement Engaged", completed: true, source: "user", ai_confidence: "", updated_at: "" },
      { id: "c11", deal_id: "deal-1", category: "Legal / Security Review Complete", completed: false, source: "none", ai_confidence: "", updated_at: "" },
      { id: "c12", deal_id: "deal-1", category: "Contract Sent", completed: false, source: "none", ai_confidence: "", updated_at: "" },
    ],
  },
  {
    id: "deal-2",
    opportunity_name: "Analytics Platform — New Logo",
    account_name: "Meridian Healthcare",
    stage: "4-Selected",
    detailed_stage: "Champion Confirmed",
    is_key_deal: true,
    amount: 285000,
    currency: "USD",
    probability: 70,
    predictive_amount: 199500,
    close_date: "2026-05-15",
    owner: "Marcus Webb",
    opportunity_type: "New Logo",
    region: "AMER",
    created_at: "2025-11-15T00:00:00Z",
    updated_at: "2026-04-08T00:00:00Z",
    has_analysis: false,
    metrics: {
      deal_id: "deal-2",
      total_activities: 21,
      email_count: 14,
      call_count: 7,
      days_since_last_activity: 7,
      days_to_close: 30,
      is_overdue: false,
      activity_trend: "steady",
      stakeholder_count: 4,
      max_activity_gap_days: 12,
    },
    checklist: [
      { id: "c1", deal_id: "deal-2", category: "Discovery Complete", completed: true, source: "ai", ai_confidence: "high", updated_at: "" },
      { id: "c2", deal_id: "deal-2", category: "Champion Identified", completed: true, source: "user", ai_confidence: "", updated_at: "" },
      { id: "c3", deal_id: "deal-2", category: "Executive Sponsor Engaged", completed: false, source: "none", ai_confidence: "", updated_at: "" },
      { id: "c4", deal_id: "deal-2", category: "Technical Sign-off Received", completed: true, source: "ai", ai_confidence: "medium", updated_at: "" },
      { id: "c5", deal_id: "deal-2", category: "POC / Pilot Complete", completed: true, source: "user", ai_confidence: "", updated_at: "" },
      { id: "c6", deal_id: "deal-2", category: "Business Case Approved", completed: false, source: "none", ai_confidence: "", updated_at: "" },
      { id: "c7", deal_id: "deal-2", category: "Decision Process Known", completed: true, source: "ai", ai_confidence: "low", updated_at: "" },
      { id: "c8", deal_id: "deal-2", category: "Pricing Presented", completed: false, source: "none", ai_confidence: "", updated_at: "" },
      { id: "c9", deal_id: "deal-2", category: "Pricing Approved", completed: false, source: "none", ai_confidence: "", updated_at: "" },
      { id: "c10", deal_id: "deal-2", category: "Procurement Engaged", completed: false, source: "none", ai_confidence: "", updated_at: "" },
      { id: "c11", deal_id: "deal-2", category: "Legal / Security Review Complete", completed: false, source: "none", ai_confidence: "", updated_at: "" },
      { id: "c12", deal_id: "deal-2", category: "Contract Sent", completed: false, source: "none", ai_confidence: "", updated_at: "" },
    ],
  },
  {
    id: "deal-3",
    opportunity_name: "BI Consolidation Initiative",
    account_name: "Westport Logistics",
    stage: "5-Active Evaluation",
    detailed_stage: "Technical Deep Dive",
    is_key_deal: false,
    amount: 190000,
    currency: "USD",
    probability: 50,
    predictive_amount: 95000,
    close_date: "2026-06-30",
    owner: "Sarah Chen",
    opportunity_type: "New Logo",
    region: "EMEA",
    created_at: "2026-01-10T00:00:00Z",
    updated_at: "2026-04-01T00:00:00Z",
    has_analysis: false,
    metrics: {
      deal_id: "deal-3",
      total_activities: 12,
      email_count: 9,
      call_count: 3,
      days_since_last_activity: 14,
      days_to_close: 76,
      is_overdue: false,
      activity_trend: "steady",
      stakeholder_count: 2,
      max_activity_gap_days: 14,
    },
    checklist: [
      { id: "c1", deal_id: "deal-3", category: "Discovery Complete", completed: true, source: "ai", ai_confidence: "high", updated_at: "" },
      { id: "c2", deal_id: "deal-3", category: "Champion Identified", completed: true, source: "user", ai_confidence: "", updated_at: "" },
      { id: "c3", deal_id: "deal-3", category: "Executive Sponsor Engaged", completed: false, source: "none", ai_confidence: "", updated_at: "" },
      { id: "c4", deal_id: "deal-3", category: "Technical Sign-off Received", completed: false, source: "none", ai_confidence: "", updated_at: "" },
      { id: "c5", deal_id: "deal-3", category: "POC / Pilot Complete", completed: false, source: "none", ai_confidence: "", updated_at: "" },
      { id: "c6", deal_id: "deal-3", category: "Business Case Approved", completed: false, source: "none", ai_confidence: "", updated_at: "" },
      { id: "c7", deal_id: "deal-3", category: "Decision Process Known", completed: false, source: "none", ai_confidence: "", updated_at: "" },
      { id: "c8", deal_id: "deal-3", category: "Pricing Presented", completed: false, source: "none", ai_confidence: "", updated_at: "" },
      { id: "c9", deal_id: "deal-3", category: "Pricing Approved", completed: false, source: "none", ai_confidence: "", updated_at: "" },
      { id: "c10", deal_id: "deal-3", category: "Procurement Engaged", completed: false, source: "none", ai_confidence: "", updated_at: "" },
      { id: "c11", deal_id: "deal-3", category: "Legal / Security Review Complete", completed: false, source: "none", ai_confidence: "", updated_at: "" },
      { id: "c12", deal_id: "deal-3", category: "Contract Sent", completed: false, source: "none", ai_confidence: "", updated_at: "" },
    ],
  },
  {
    id: "deal-4",
    opportunity_name: "Enterprise Reporting Suite",
    account_name: "Pinnacle Insurance",
    stage: "2-Negotiate",
    detailed_stage: "Negotiating Terms",
    is_key_deal: true,
    amount: 610000,
    currency: "USD",
    probability: 80,
    predictive_amount: 488000,
    close_date: "2026-04-10",
    owner: "Priya Nair",
    opportunity_type: "Expansion",
    region: "AMER",
    created_at: "2025-09-01T00:00:00Z",
    updated_at: "2026-04-12T00:00:00Z",
    has_analysis: true,
    metrics: {
      deal_id: "deal-4",
      total_activities: 47,
      email_count: 30,
      call_count: 17,
      days_since_last_activity: 3,
      days_to_close: -5,
      is_overdue: true,
      activity_trend: "accelerating",
      stakeholder_count: 8,
      max_activity_gap_days: 5,
    },
    checklist: [
      { id: "c1", deal_id: "deal-4", category: "Discovery Complete", completed: true, source: "ai", ai_confidence: "high", updated_at: "" },
      { id: "c2", deal_id: "deal-4", category: "Champion Identified", completed: true, source: "user", ai_confidence: "", updated_at: "" },
      { id: "c3", deal_id: "deal-4", category: "Executive Sponsor Engaged", completed: true, source: "ai", ai_confidence: "high", updated_at: "" },
      { id: "c4", deal_id: "deal-4", category: "Technical Sign-off Received", completed: true, source: "ai", ai_confidence: "high", updated_at: "" },
      { id: "c5", deal_id: "deal-4", category: "POC / Pilot Complete", completed: true, source: "user", ai_confidence: "", updated_at: "" },
      { id: "c6", deal_id: "deal-4", category: "Business Case Approved", completed: true, source: "ai", ai_confidence: "high", updated_at: "" },
      { id: "c7", deal_id: "deal-4", category: "Decision Process Known", completed: true, source: "user", ai_confidence: "", updated_at: "" },
      { id: "c8", deal_id: "deal-4", category: "Pricing Presented", completed: true, source: "ai", ai_confidence: "high", updated_at: "" },
      { id: "c9", deal_id: "deal-4", category: "Pricing Approved", completed: true, source: "user", ai_confidence: "", updated_at: "" },
      { id: "c10", deal_id: "deal-4", category: "Procurement Engaged", completed: true, source: "ai", ai_confidence: "medium", updated_at: "" },
      { id: "c11", deal_id: "deal-4", category: "Legal / Security Review Complete", completed: true, source: "user", ai_confidence: "", updated_at: "" },
      { id: "c12", deal_id: "deal-4", category: "Contract Sent", completed: false, source: "none", ai_confidence: "", updated_at: "" },
    ],
  },
  {
    id: "deal-5",
    opportunity_name: "Data Visualization Platform",
    account_name: "Cascade Manufacturing",
    stage: "6-Prospect",
    detailed_stage: "Discovery Scheduled",
    is_key_deal: false,
    amount: 95000,
    currency: "USD",
    probability: 20,
    predictive_amount: 19000,
    close_date: "2026-09-30",
    owner: "Marcus Webb",
    opportunity_type: "New Logo",
    region: "APAC",
    created_at: "2026-03-01T00:00:00Z",
    updated_at: "2026-03-20T00:00:00Z",
    has_analysis: false,
    metrics: {
      deal_id: "deal-5",
      total_activities: 4,
      email_count: 4,
      call_count: 0,
      days_since_last_activity: 26,
      days_to_close: 168,
      is_overdue: false,
      activity_trend: "decelerating",
      stakeholder_count: 1,
      max_activity_gap_days: 26,
    },
    checklist: [
      { id: "c1", deal_id: "deal-5", category: "Discovery Complete", completed: false, source: "none", ai_confidence: "", updated_at: "" },
      { id: "c2", deal_id: "deal-5", category: "Champion Identified", completed: false, source: "none", ai_confidence: "", updated_at: "" },
      { id: "c3", deal_id: "deal-5", category: "Executive Sponsor Engaged", completed: false, source: "none", ai_confidence: "", updated_at: "" },
      { id: "c4", deal_id: "deal-5", category: "Technical Sign-off Received", completed: false, source: "none", ai_confidence: "", updated_at: "" },
      { id: "c5", deal_id: "deal-5", category: "POC / Pilot Complete", completed: false, source: "none", ai_confidence: "", updated_at: "" },
      { id: "c6", deal_id: "deal-5", category: "Business Case Approved", completed: false, source: "none", ai_confidence: "", updated_at: "" },
      { id: "c7", deal_id: "deal-5", category: "Decision Process Known", completed: false, source: "none", ai_confidence: "", updated_at: "" },
      { id: "c8", deal_id: "deal-5", category: "Pricing Presented", completed: false, source: "none", ai_confidence: "", updated_at: "" },
      { id: "c9", deal_id: "deal-5", category: "Pricing Approved", completed: false, source: "none", ai_confidence: "", updated_at: "" },
      { id: "c10", deal_id: "deal-5", category: "Procurement Engaged", completed: false, source: "none", ai_confidence: "", updated_at: "" },
      { id: "c11", deal_id: "deal-5", category: "Legal / Security Review Complete", completed: false, source: "none", ai_confidence: "", updated_at: "" },
      { id: "c12", deal_id: "deal-5", category: "Contract Sent", completed: false, source: "none", ai_confidence: "", updated_at: "" },
    ],
  },
  {
    id: "deal-6",
    opportunity_name: "Self-Service BI Rollout",
    account_name: "Harbor Technologies",
    stage: "4-Selected",
    detailed_stage: "Business Case Presented",
    is_key_deal: false,
    amount: 155000,
    currency: "USD",
    probability: 60,
    predictive_amount: 93000,
    close_date: "2026-05-31",
    owner: "Priya Nair",
    opportunity_type: "New Logo",
    region: "EMEA",
    created_at: "2025-12-01T00:00:00Z",
    updated_at: "2026-04-05T00:00:00Z",
    has_analysis: false,
    metrics: {
      deal_id: "deal-6",
      total_activities: 18,
      email_count: 13,
      call_count: 5,
      days_since_last_activity: 10,
      days_to_close: 46,
      is_overdue: false,
      activity_trend: "steady",
      stakeholder_count: 3,
      max_activity_gap_days: 11,
    },
    checklist: [
      { id: "c1", deal_id: "deal-6", category: "Discovery Complete", completed: true, source: "ai", ai_confidence: "high", updated_at: "" },
      { id: "c2", deal_id: "deal-6", category: "Champion Identified", completed: true, source: "user", ai_confidence: "", updated_at: "" },
      { id: "c3", deal_id: "deal-6", category: "Executive Sponsor Engaged", completed: true, source: "ai", ai_confidence: "medium", updated_at: "" },
      { id: "c4", deal_id: "deal-6", category: "Technical Sign-off Received", completed: false, source: "none", ai_confidence: "", updated_at: "" },
      { id: "c5", deal_id: "deal-6", category: "POC / Pilot Complete", completed: true, source: "user", ai_confidence: "", updated_at: "" },
      { id: "c6", deal_id: "deal-6", category: "Business Case Approved", completed: false, source: "none", ai_confidence: "", updated_at: "" },
      { id: "c7", deal_id: "deal-6", category: "Decision Process Known", completed: false, source: "none", ai_confidence: "", updated_at: "" },
      { id: "c8", deal_id: "deal-6", category: "Pricing Presented", completed: false, source: "none", ai_confidence: "", updated_at: "" },
      { id: "c9", deal_id: "deal-6", category: "Pricing Approved", completed: false, source: "none", ai_confidence: "", updated_at: "" },
      { id: "c10", deal_id: "deal-6", category: "Procurement Engaged", completed: false, source: "none", ai_confidence: "", updated_at: "" },
      { id: "c11", deal_id: "deal-6", category: "Legal / Security Review Complete", completed: false, source: "none", ai_confidence: "", updated_at: "" },
      { id: "c12", deal_id: "deal-6", category: "Contract Sent", completed: false, source: "none", ai_confidence: "", updated_at: "" },
    ],
  },
  {
    id: "deal-7",
    opportunity_name: "Global Analytics Migration",
    account_name: "Vortex Energy Corp",
    stage: "5-Active Evaluation",
    detailed_stage: "POC/Pilot In Progress",
    is_key_deal: true,
    amount: 870000,
    currency: "USD",
    probability: 45,
    predictive_amount: 391500,
    close_date: "2026-07-31",
    owner: "Sarah Chen",
    opportunity_type: "New Logo",
    region: "AMER",
    created_at: "2025-08-15T00:00:00Z",
    updated_at: "2026-04-13T00:00:00Z",
    has_analysis: true,
    metrics: {
      deal_id: "deal-7",
      total_activities: 29,
      email_count: 18,
      call_count: 11,
      days_since_last_activity: 2,
      days_to_close: 107,
      is_overdue: false,
      activity_trend: "accelerating",
      stakeholder_count: 7,
      max_activity_gap_days: 9,
    },
    checklist: [
      { id: "c1", deal_id: "deal-7", category: "Discovery Complete", completed: true, source: "ai", ai_confidence: "high", updated_at: "" },
      { id: "c2", deal_id: "deal-7", category: "Champion Identified", completed: true, source: "ai", ai_confidence: "high", updated_at: "" },
      { id: "c3", deal_id: "deal-7", category: "Executive Sponsor Engaged", completed: true, source: "user", ai_confidence: "", updated_at: "" },
      { id: "c4", deal_id: "deal-7", category: "Technical Sign-off Received", completed: false, source: "none", ai_confidence: "", updated_at: "" },
      { id: "c5", deal_id: "deal-7", category: "POC / Pilot Complete", completed: false, source: "none", ai_confidence: "", updated_at: "" },
      { id: "c6", deal_id: "deal-7", category: "Business Case Approved", completed: false, source: "none", ai_confidence: "", updated_at: "" },
      { id: "c7", deal_id: "deal-7", category: "Decision Process Known", completed: true, source: "ai", ai_confidence: "medium", updated_at: "" },
      { id: "c8", deal_id: "deal-7", category: "Pricing Presented", completed: false, source: "none", ai_confidence: "", updated_at: "" },
      { id: "c9", deal_id: "deal-7", category: "Pricing Approved", completed: false, source: "none", ai_confidence: "", updated_at: "" },
      { id: "c10", deal_id: "deal-7", category: "Procurement Engaged", completed: false, source: "none", ai_confidence: "", updated_at: "" },
      { id: "c11", deal_id: "deal-7", category: "Legal / Security Review Complete", completed: false, source: "none", ai_confidence: "", updated_at: "" },
      { id: "c12", deal_id: "deal-7", category: "Contract Sent", completed: false, source: "none", ai_confidence: "", updated_at: "" },
    ],
  },
  {
    id: "deal-8",
    opportunity_name: "Finance Reporting Upgrade",
    account_name: "Sterling Capital Partners",
    stage: "3-Commit",
    detailed_stage: "Procurement Engaged",
    is_key_deal: false,
    amount: 230000,
    currency: "USD",
    probability: 75,
    predictive_amount: 172500,
    close_date: "2026-04-25",
    owner: "Marcus Webb",
    opportunity_type: "Expansion",
    region: "AMER",
    created_at: "2025-11-01T00:00:00Z",
    updated_at: "2026-04-14T00:00:00Z",
    has_analysis: false,
    metrics: {
      deal_id: "deal-8",
      total_activities: 25,
      email_count: 17,
      call_count: 8,
      days_since_last_activity: 1,
      days_to_close: 10,
      is_overdue: false,
      activity_trend: "accelerating",
      stakeholder_count: 5,
      max_activity_gap_days: 7,
    },
    checklist: [
      { id: "c1", deal_id: "deal-8", category: "Discovery Complete", completed: true, source: "ai", ai_confidence: "high", updated_at: "" },
      { id: "c2", deal_id: "deal-8", category: "Champion Identified", completed: true, source: "user", ai_confidence: "", updated_at: "" },
      { id: "c3", deal_id: "deal-8", category: "Executive Sponsor Engaged", completed: true, source: "ai", ai_confidence: "high", updated_at: "" },
      { id: "c4", deal_id: "deal-8", category: "Technical Sign-off Received", completed: true, source: "user", ai_confidence: "", updated_at: "" },
      { id: "c5", deal_id: "deal-8", category: "POC / Pilot Complete", completed: true, source: "ai", ai_confidence: "high", updated_at: "" },
      { id: "c6", deal_id: "deal-8", category: "Business Case Approved", completed: true, source: "user", ai_confidence: "", updated_at: "" },
      { id: "c7", deal_id: "deal-8", category: "Decision Process Known", completed: true, source: "ai", ai_confidence: "high", updated_at: "" },
      { id: "c8", deal_id: "deal-8", category: "Pricing Presented", completed: true, source: "ai", ai_confidence: "high", updated_at: "" },
      { id: "c9", deal_id: "deal-8", category: "Pricing Approved", completed: true, source: "user", ai_confidence: "", updated_at: "" },
      { id: "c10", deal_id: "deal-8", category: "Procurement Engaged", completed: true, source: "user", ai_confidence: "", updated_at: "" },
      { id: "c11", deal_id: "deal-8", category: "Legal / Security Review Complete", completed: false, source: "none", ai_confidence: "", updated_at: "" },
      { id: "c12", deal_id: "deal-8", category: "Contract Sent", completed: false, source: "none", ai_confidence: "", updated_at: "" },
    ],
  },
];

const MOCK_PIPELINE: PipelineMetrics = {
  total_pipeline_value: MOCK_DEALS.filter(d => !d.stage.includes("Closed")).reduce((s, d) => s + d.amount, 0),
  weighted_pipeline: MOCK_DEALS.filter(d => !d.stage.includes("Closed")).reduce((s, d) => s + d.amount * (d.probability / 100), 0),
  deal_count: MOCK_DEALS.length,
  deals_at_risk: MOCK_DEALS.filter(d => d.metrics.days_since_last_activity > 14 || d.metrics.is_overdue).length,
  deals_by_stage: [
    { stage: "6-Prospect", count: 1, value: 95000 },
    { stage: "5-Active Evaluation", count: 2, value: 1060000 },
    { stage: "4-Selected", count: 2, value: 440000 },
    { stage: "3-Commit", count: 2, value: 650000 },
    { stage: "2-Negotiate", count: 1, value: 610000 },
  ],
  deals_by_rep: [
    { rep: "Sarah Chen", count: 3, value: 1480000 },
    { rep: "Priya Nair", count: 2, value: 765000 },
    { rep: "Marcus Webb", count: 3, value: 610000 },
  ],
  average_deal_size: 2855000 / 8,
};

// ─── Preview page ─────────────────────────────────────────────────────────────

export default function PreviewPage() {
  const [deals, setDeals] = useState<DealWithMetrics[]>(MOCK_DEALS);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [mockNotes, setMockNotes] = useState<Record<string, DealNote[]>>({});

  function handleDataChange() { /* no-op in preview */ }

  return (
    <div className="space-y-6 p-6">
      {/* Preview banner */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 flex items-center justify-between">
        <div className="text-sm text-yellow-800">
          <span className="font-semibold">Preview mode</span> — showing mock data. Run the DB migration, then use the real dashboard at{" "}
          <a href="/" className="underline">localhost:3000</a>.
        </div>
      </div>

      <h1 className="text-xl font-semibold text-gray-900">Pipeline Overview</h1>

      <SummaryCards metrics={MOCK_PIPELINE} />

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">All Deals</h2>
        <DealTable
          deals={deals}
          onOpenDeal={setSelectedDealId}
          onDataChange={handleDataChange}
        />
      </div>

      {/* Slide-over: in preview mode we show a mock version since real Supabase
          queries would fail for the new tables. Click any deal to see the layout. */}
      {selectedDealId && (
        <MockSlideOver
          deal={deals.find(d => d.id === selectedDealId)!}
          notes={mockNotes[selectedDealId] || []}
          onClose={() => setSelectedDealId(null)}
          onChecklistToggle={(dealId, category) => {
            setDeals(prev => prev.map(d => {
              if (d.id !== dealId) return d;
              const idx = d.checklist.findIndex(i => i.category === category);
              const newChecklist = [...d.checklist];
              if (idx >= 0) {
                newChecklist[idx] = { ...newChecklist[idx], completed: !newChecklist[idx].completed, source: "user" };
              }
              return { ...d, checklist: newChecklist };
            }));
          }}
          onKeyDealToggle={(dealId) => {
            setDeals(prev => prev.map(d =>
              d.id === dealId ? { ...d, is_key_deal: !d.is_key_deal } : d
            ));
          }}
          onDetailedStageChange={(dealId, stage) => {
            setDeals(prev => prev.map(d =>
              d.id === dealId ? { ...d, detailed_stage: stage } : d
            ));
          }}
          onAddNote={(dealId, content) => {
            const note: DealNote = {
              id: crypto.randomUUID(),
              deal_id: dealId,
              content,
              created_at: new Date().toISOString(),
            };
            setMockNotes(prev => ({ ...prev, [dealId]: [note, ...(prev[dealId] || [])] }));
          }}
        />
      )}
    </div>
  );
}

// ─── Mock slide-over (no Supabase calls) ─────────────────────────────────────

import { DETAILED_STAGES, CHECKLIST_CATEGORIES } from "@/lib/deal-config";

function MockSlideOver({
  deal,
  notes,
  onClose,
  onChecklistToggle,
  onKeyDealToggle,
  onDetailedStageChange,
  onAddNote,
}: {
  deal: DealWithMetrics;
  notes: DealNote[];
  onClose: () => void;
  onChecklistToggle: (dealId: string, category: string) => void;
  onKeyDealToggle: (dealId: string) => void;
  onDetailedStageChange: (dealId: string, stage: string) => void;
  onAddNote: (dealId: string, content: string) => void;
}) {
  const [newNote, setNewNote] = useState("");
  const detailedStageOptions = DETAILED_STAGES[deal.stage] || [];

  function formatCurrency(v: number) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(v);
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  function trendLabel(t: string) {
    return { accelerating: "↑ Accelerating", decelerating: "↓ Decelerating", steady: "→ Steady", new: "New" }[t] || t;
  }

  function trendColor(t: string) {
    return { accelerating: "text-green-600 bg-green-50", decelerating: "text-red-600 bg-red-50", steady: "text-blue-600 bg-blue-50" }[t] || "text-gray-600 bg-gray-50";
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div className="min-w-0 flex-1 mr-4">
            <h2 className="text-base font-semibold text-gray-900 truncate">{deal.opportunity_name}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{deal.account_name}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onKeyDealToggle(deal.id)}
              className={`text-xl px-1 transition-colors ${deal.is_key_deal ? "text-yellow-400 hover:text-yellow-500" : "text-gray-300 hover:text-yellow-400"}`}
              title={deal.is_key_deal ? "Remove Key Deal flag" : "Mark as Key Deal"}
            >
              {deal.is_key_deal ? "★" : "☆"}
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-light px-1">✕</button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Deal header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                  deal.stage.includes("Closed Lost") ? "bg-red-100 text-red-700" :
                  deal.stage.includes("Closed Won") ? "bg-green-100 text-green-700" :
                  deal.stage.includes("Commit") ? "bg-blue-100 text-blue-700" :
                  "bg-gray-100 text-gray-700"
                }`}>
                  {deal.stage}
                </span>
                {detailedStageOptions.length > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="text-gray-300 text-xs">→</span>
                    <select
                      value={deal.detailed_stage || ""}
                      onChange={(e) => onDetailedStageChange(deal.id, e.target.value)}
                      className="text-xs border border-gray-200 rounded px-2 py-0.5 text-gray-700 bg-white focus:outline-none focus:border-blue-400"
                    >
                      <option value="">Set detailed stage...</option>
                      {detailedStageOptions.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-sm">
                <div>
                  <span className="text-gray-500 text-xs">Close Date</span>
                  <p className={`font-medium text-sm ${deal.metrics.is_overdue ? "text-red-600" : "text-gray-900"}`}>
                    {formatDate(deal.close_date)}{deal.metrics.is_overdue && <span className="text-xs ml-1">(overdue)</span>}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500 text-xs">Owner</span>
                  <p className="font-medium text-sm text-gray-900">{deal.owner}</p>
                </div>
                <div>
                  <span className="text-gray-500 text-xs">Region</span>
                  <p className="font-medium text-sm text-gray-900">{deal.region}</p>
                </div>
                <div>
                  <span className="text-gray-500 text-xs">Probability</span>
                  <p className="font-medium text-sm text-gray-900">{deal.probability}%</p>
                </div>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-2xl font-semibold text-gray-900">{formatCurrency(deal.amount)}</p>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Notes</h3>
            <div className="flex gap-2 mb-3">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    onAddNote(deal.id, newNote.trim());
                    setNewNote("");
                  }
                }}
                placeholder="Add a note... (⌘↵ to save)"
                rows={2}
                className="flex-1 text-sm border border-gray-200 rounded px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-400 resize-none"
              />
              <button
                onClick={() => { if (newNote.trim()) { onAddNote(deal.id, newNote.trim()); setNewNote(""); } }}
                disabled={!newNote.trim()}
                className="self-end px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </div>
            {notes.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-2">No notes yet</p>
            ) : (
              <div className="space-y-2">
                {notes.map((note) => (
                  <div key={note.id} className="bg-gray-50 rounded-lg px-3 py-2.5">
                    <p className="text-xs text-gray-400 mb-1">
                      {new Date(note.created_at).toLocaleDateString("en-US", {
                        month: "short", day: "numeric", year: "numeric",
                        hour: "numeric", minute: "2-digit",
                      })}
                    </p>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{note.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Checklist */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-800">Close Plan Checklist</h3>
              <span className="text-xs text-gray-400">
                {deal.checklist.filter(i => i.completed).length} / {CHECKLIST_CATEGORIES.length} complete
                {" · "}AI auto-detects when you run Analyze Deal
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {CHECKLIST_CATEGORIES.map(category => {
                const item = deal.checklist.find(i => i.category === category);
                const completed = item?.completed ?? false;
                const isAI = item?.source === "ai";
                return (
                  <button
                    key={category}
                    onClick={() => onChecklistToggle(deal.id, category)}
                    className={`flex items-center gap-2 px-3 py-2 rounded text-left text-sm transition-colors ${
                      completed ? "bg-green-50 text-green-800 hover:bg-green-100" : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <span className={`text-base shrink-0 ${completed ? "text-green-500" : "text-gray-300"}`}>
                      {completed ? "✓" : "○"}
                    </span>
                    <span className="flex-1">{category}</span>
                    {isAI && <span className="text-xs text-gray-400 shrink-0" title="Detected by AI">AI</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Health metrics */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Deal Health</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { label: "Days Since Activity", value: `${deal.metrics.days_since_last_activity}d`, color: deal.metrics.days_since_last_activity <= 7 ? "text-green-600" : deal.metrics.days_since_last_activity <= 14 ? "text-yellow-600" : "text-red-600" },
                { label: "Days to Close", value: deal.metrics.is_overdue ? "Overdue" : `${deal.metrics.days_to_close}d`, color: deal.metrics.is_overdue ? "text-red-600" : "text-gray-900" },
                { label: "Total Activities", value: String(deal.metrics.total_activities), sub: `${deal.metrics.email_count} emails, ${deal.metrics.call_count} calls` },
                { label: "Stakeholders", value: String(deal.metrics.stakeholder_count), sub: "From call attendees" },
                { label: "Max Activity Gap", value: `${deal.metrics.max_activity_gap_days}d`, sub: "Longest silence" },
              ].map(m => (
                <div key={m.label}>
                  <p className="text-xs font-medium text-gray-600">{m.label}</p>
                  <p className={`text-lg font-semibold mt-0.5 ${m.color || "text-gray-900"}`}>{m.value}</p>
                  {m.sub && <p className="text-xs text-gray-500">{m.sub}</p>}
                </div>
              ))}
              <div>
                <p className="text-xs font-medium text-gray-600">Activity Trend</p>
                <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${trendColor(deal.metrics.activity_trend)}`}>
                  {trendLabel(deal.metrics.activity_trend)}
                </span>
              </div>
            </div>
          </div>

          {/* AI analysis placeholder */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">AI Deal Analysis</h3>
            <div className="text-center py-6">
              <p className="text-sm text-gray-500 mb-3">Get AI-powered coaching insights for this deal.</p>
              <button className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 opacity-60 cursor-not-allowed" disabled>
                Analyze Deal (disabled in preview)
              </button>
            </div>
          </div>

          {/* Activity timeline placeholder */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Activity Timeline</h3>
            <p className="text-sm text-gray-400 text-center py-4">
              Activities load from real Supabase data — run the migration to see them.
            </p>
          </div>

        </div>
      </div>
    </>
  );
}
