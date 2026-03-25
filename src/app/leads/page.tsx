"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import type { Lead } from "@/lib/lead-types";
import {
  computeWeeklyLeadData,
  computeConversionPivot,
  computeMediumHeatmap,
  computeSummaryMetrics,
  computeRegionBreakdown,
  computeTopCountries,
  computeStatusBreakdown,
} from "@/lib/lead-metrics";
import LeadSummaryCards from "@/components/leads/LeadSummaryCards";
import WeeklyLeadsChart from "@/components/leads/WeeklyLeadsChart";
import ConversionPivotTable from "@/components/leads/ConversionPivotTable";
import MediumHeatmap from "@/components/leads/MediumHeatmap";
import LeadSummary from "@/components/leads/LeadSummary";
import LeadCsvUploader from "@/components/LeadCsvUploader";

export default function LeadsPage() {
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [showUploader, setShowUploader] = useState(false);

  // Filter state
  const [regionDropdownOpen, setRegionDropdownOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [mediumDropdownOpen, setMediumDropdownOpen] = useState(false);
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);

  // Extract unique filter values from data (keep blanks so no leads are silently excluded)
  const regions = useMemo(
    () => [...new Set(allLeads.map((l) => l.region))].sort(),
    [allLeads]
  );
  const statuses = useMemo(
    () => [...new Set(allLeads.map((l) => l.lead_status))].sort(),
    [allLeads]
  );
  const mediums = useMemo(
    () => [...new Set(allLeads.map((l) => l.medium))].sort(),
    [allLeads]
  );
  const leadTypes = useMemo(
    () => [...new Set(allLeads.map((l) => l.lead_type))].sort(),
    [allLeads]
  );

  // Selected filter sets (null = all selected, lazy init)
  const [selectedRegions, setSelectedRegions] = useState<Set<string> | null>(null);
  const [selectedStatuses, setSelectedStatuses] = useState<Set<string> | null>(null);
  const [selectedMediums, setSelectedMediums] = useState<Set<string> | null>(null);
  const [selectedTypes, setSelectedTypes] = useState<Set<string> | null>(null);

  const activeRegions = useMemo(
    () => selectedRegions ?? new Set(regions),
    [selectedRegions, regions]
  );
  const activeStatuses = useMemo(
    () => selectedStatuses ?? new Set(statuses),
    [selectedStatuses, statuses]
  );
  const activeMediums = useMemo(
    () => selectedMediums ?? new Set(mediums),
    [selectedMediums, mediums]
  );
  const activeTypes = useMemo(
    () => selectedTypes ?? new Set(leadTypes),
    [selectedTypes, leadTypes]
  );

  // Filtered leads
  const filteredLeads = useMemo(
    () =>
      allLeads.filter(
        (l) =>
          activeRegions.has(l.region) &&
          activeStatuses.has(l.lead_status) &&
          activeMediums.has(l.medium) &&
          activeTypes.has(l.lead_type)
      ),
    [allLeads, activeRegions, activeStatuses, activeMediums, activeTypes]
  );

  // Computed data for charts/tables
  const summaryMetrics = useMemo(
    () => computeSummaryMetrics(filteredLeads),
    [filteredLeads]
  );
  const weeklyDataAll = useMemo(
    () => computeWeeklyLeadData(filteredLeads),
    [filteredLeads]
  );
  const weeklyDataAmer = useMemo(
    () => computeWeeklyLeadData(filteredLeads.filter((l) => l.region === "AMER")),
    [filteredLeads]
  );
  const conversionPivot = useMemo(
    () => computeConversionPivot(filteredLeads),
    [filteredLeads]
  );
  const mediumHeatmap = useMemo(
    () => computeMediumHeatmap(filteredLeads),
    [filteredLeads]
  );
  const regionBreakdown = useMemo(
    () => computeRegionBreakdown(filteredLeads),
    [filteredLeads]
  );
  const topCountries = useMemo(
    () => computeTopCountries(filteredLeads),
    [filteredLeads]
  );
  const amerStatus = useMemo(
    () => computeStatusBreakdown(filteredLeads, true),
    [filteredLeads]
  );
  const nonAmerStatus = useMemo(
    () =>
      computeStatusBreakdown(
        filteredLeads.filter((l) => l.region !== "AMER"),
        false
      ),
    [filteredLeads]
  );

  useEffect(() => {
    loadLeads();
  }, []);

  async function loadLeads() {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from("leads")
        .select("*")
        .order("lead_week_start", { ascending: false });

      if (fetchError) throw fetchError;
      setAllLeads((data as Lead[]) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load leads");
    } finally {
      setLoading(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/sync-leads", { method: "POST" });
      const json = await res.json();

      if (!res.ok) {
        setSyncResult(`Error: ${json.error}`);
        return;
      }

      setSyncResult(
        `Processed ${json.leads_processed} leads (${json.rows_in_csv} in CSV)`
      );
      // Reload data
      await loadLeads();
    } catch (err) {
      setSyncResult(
        `Error: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    } finally {
      setSyncing(false);
    }
  }

  // Filter helper: creates a multi-select dropdown
  function MultiSelectFilter({
    label,
    options,
    selected,
    onToggle,
    onSelectAll,
    onClearAll,
    isOpen,
    setIsOpen,
  }: {
    label: string;
    options: string[];
    selected: Set<string>;
    onToggle: (item: string) => void;
    onSelectAll: () => void;
    onClearAll: () => void;
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
  }) {
    const allSelected = selected.size === options.length;
    const displayLabel =
      allSelected
        ? `All ${label}`
        : selected.size === 0
        ? `No ${label}`
        : selected.size === 1
        ? [...selected][0]
        : `${selected.size} ${label}`;

    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-sm border border-gray-300 rounded px-2 py-1.5 bg-white text-gray-900 flex items-center gap-1 min-w-[130px]"
        >
          <span className="flex-1 text-left">{displayLabel}</span>
          <span className="text-xs text-gray-400">
            {isOpen ? "\u25B2" : "\u25BC"}
          </span>
        </button>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute right-0 z-20 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[220px] max-h-64 overflow-y-auto">
              <div className="flex gap-2 px-3 py-1.5 border-b border-gray-100">
                <button
                  onClick={onSelectAll}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Select all
                </button>
                <button
                  onClick={onClearAll}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Clear all
                </button>
              </div>
              {options.map((option) => (
                <label
                  key={option}
                  className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(option)}
                    onChange={() => onToggle(option)}
                    className="rounded border-gray-300"
                  />
                  <span className={`text-sm ${option ? "text-gray-900" : "text-gray-400 italic"}`}>
                    {option || "(blank)"}
                  </span>
                </label>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  // Toggle helpers for each filter
  function makeToggle(
    setter: React.Dispatch<React.SetStateAction<Set<string> | null>>,
    active: Set<string>
  ) {
    return (item: string) => {
      setter(() => {
        const next = new Set(active);
        if (next.has(item)) next.delete(item);
        else next.add(item);
        return next;
      });
    };
  }

  if (loading) {
    return (
      <div className="text-center py-12 text-gray-400 text-sm">
        Loading leads data...
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-gray-900">Leads</h1>

        <div className="flex flex-wrap items-center gap-3">
          <MultiSelectFilter
            label="Regions"
            options={regions}
            selected={activeRegions}
            onToggle={makeToggle(setSelectedRegions, activeRegions)}
            onSelectAll={() => setSelectedRegions(new Set(regions))}
            onClearAll={() => setSelectedRegions(new Set())}
            isOpen={regionDropdownOpen}
            setIsOpen={setRegionDropdownOpen}
          />
          <MultiSelectFilter
            label="Statuses"
            options={statuses}
            selected={activeStatuses}
            onToggle={makeToggle(setSelectedStatuses, activeStatuses)}
            onSelectAll={() => setSelectedStatuses(new Set(statuses))}
            onClearAll={() => setSelectedStatuses(new Set())}
            isOpen={statusDropdownOpen}
            setIsOpen={setStatusDropdownOpen}
          />
          <MultiSelectFilter
            label="Mediums"
            options={mediums}
            selected={activeMediums}
            onToggle={makeToggle(setSelectedMediums, activeMediums)}
            onSelectAll={() => setSelectedMediums(new Set(mediums))}
            onClearAll={() => setSelectedMediums(new Set())}
            isOpen={mediumDropdownOpen}
            setIsOpen={setMediumDropdownOpen}
          />
          <MultiSelectFilter
            label="Types"
            options={leadTypes}
            selected={activeTypes}
            onToggle={makeToggle(setSelectedTypes, activeTypes)}
            onSelectAll={() => setSelectedTypes(new Set(leadTypes))}
            onClearAll={() => setSelectedTypes(new Set())}
            isOpen={typeDropdownOpen}
            setIsOpen={setTypeDropdownOpen}
          />

          <button
            onClick={() => setShowUploader(!showUploader)}
            className="text-sm px-4 py-1.5 rounded font-medium border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            {showUploader ? "Hide Upload" : "Upload CSV"}
          </button>
          <button
            onClick={handleSync}
            disabled={syncing}
            className={`text-sm px-4 py-1.5 rounded font-medium ${
              syncing
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {syncing ? "Syncing..." : "Sync Leads"}
          </button>
        </div>
      </div>

      {/* Sync result banner */}
      {syncResult && (
        <div
          className={`text-sm px-4 py-2 rounded ${
            syncResult.startsWith("Error")
              ? "bg-red-50 text-red-700 border border-red-200"
              : "bg-green-50 text-green-700 border border-green-200"
          }`}
        >
          {syncResult}
        </div>
      )}

      {/* CSV Upload panel */}
      {showUploader && (
        <LeadCsvUploader onUploadComplete={loadLeads} />
      )}

      {allLeads.length === 0 ? (
        <div className="text-center py-16">
          <h2 className="text-lg font-medium text-gray-700 mb-2">
            No lead data yet
          </h2>
          <p className="text-sm text-gray-500">
            Click &quot;Sync Leads&quot; to import the latest lead report from Gmail.
          </p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <LeadSummaryCards metrics={summaryMetrics} />

          {/* Weekly leads chart — AMER Only */}
          <WeeklyLeadsChart
            title="Weekly Leads — AMER Only"
            data={weeklyDataAmer}
          />

          {/* Weekly leads chart — All Regions */}
          <WeeklyLeadsChart
            title="Weekly Leads — All Regions"
            data={weeklyDataAll}
          />

          {/* Conversion pivot table */}
          <ConversionPivotTable
            regions={conversionPivot.regions}
            weeks={conversionPivot.weeks}
            cells={conversionPivot.cells}
          />

          {/* Medium heatmap */}
          <MediumHeatmap
            rows={mediumHeatmap.rows}
            weeks={mediumHeatmap.weeks}
          />

          {/* Lead summary */}
          <LeadSummary
            regionBreakdown={regionBreakdown}
            topCountries={topCountries}
            amerStatusBreakdown={amerStatus}
            nonAmerStatusBreakdown={nonAmerStatus}
          />
        </>
      )}
    </div>
  );
}
