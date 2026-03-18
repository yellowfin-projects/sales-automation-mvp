"use client";

import { useState } from "react";
import type { Analysis } from "@/lib/types";

interface AnalysisPanelProps {
  dealId: string;
  existingAnalysis: Analysis | null;
  repProbability: number;
}

export default function AnalysisPanel({
  dealId,
  existingAnalysis,
  repProbability,
}: AnalysisPanelProps) {
  const [analysis, setAnalysis] = useState<Analysis | null>(existingAnalysis);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  async function runAnalysis() {
    setShowConfirm(false);
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/analyze-deal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealId }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Analysis failed");
        return;
      }

      setAnalysis(data.analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  // No analysis yet — show the analyze button
  if (!analysis && !loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-sm font-medium text-gray-700 mb-3">AI Deal Analysis</h2>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-3 mb-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {!showConfirm ? (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500 mb-3">
              Get AI-powered coaching insights for this deal.
            </p>
            <button
              onClick={() => setShowConfirm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
            >
              Analyze Deal
            </button>
          </div>
        ) : (
          <div className="bg-blue-50 border border-blue-200 rounded p-4 text-center">
            <p className="text-sm text-blue-700 mb-3">
              This will send deal data and recent activities to Gemini for analysis.
              One API call will be used.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={runAnalysis}
                className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
              >
                Confirm
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="border border-gray-200 text-gray-600 px-4 py-2 rounded text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-sm font-medium text-gray-700 mb-3">AI Deal Analysis</h2>
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent mb-3"></div>
          <p className="text-sm text-gray-500">Analyzing deal...</p>
        </div>
      </div>
    );
  }

  // Analysis results
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-gray-700">AI Deal Analysis</h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">
            Analyzed {new Date(analysis!.analyzed_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </span>
          <button
            onClick={() => {
              setAnalysis(null);
              setShowConfirm(true);
            }}
            className="text-xs text-blue-600 hover:underline"
          >
            Re-analyze
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 mb-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Health Assessment */}
      <div className="mb-5">
        <p className="text-sm text-gray-800 leading-relaxed">
          {analysis!.health_assessment}
        </p>
      </div>

      {/* Win Probability Comparison */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="bg-gray-50 rounded p-3">
          <p className="text-xs text-gray-500">Rep Probability</p>
          <p className="text-xl font-semibold text-gray-900">{repProbability}%</p>
        </div>
        <div className="bg-blue-50 rounded p-3">
          <p className="text-xs text-blue-600">AI Probability</p>
          <p className="text-xl font-semibold text-blue-700">
            {Math.round((analysis!.ai_win_probability || 0) * 100)}%
          </p>
        </div>
      </div>
      {analysis!.ai_reasoning && (
        <p className="text-xs text-gray-500 mb-5 -mt-3 italic">
          {analysis!.ai_reasoning}
        </p>
      )}

      {/* Risk Signals */}
      {analysis!.risk_signals && analysis!.risk_signals.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-medium text-red-600 uppercase mb-2">
            Risk Signals
          </h3>
          <ul className="space-y-1.5">
            {analysis!.risk_signals.map((signal: string, i: number) => (
              <li
                key={i}
                className="text-sm text-gray-700 bg-red-50 rounded px-3 py-2"
              >
                {signal}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Positive Signals */}
      {analysis!.positive_signals && analysis!.positive_signals.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-medium text-green-600 uppercase mb-2">
            Positive Signals
          </h3>
          <ul className="space-y-1.5">
            {analysis!.positive_signals.map((signal: string, i: number) => (
              <li
                key={i}
                className="text-sm text-gray-700 bg-green-50 rounded px-3 py-2"
              >
                {signal}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Coaching Suggestions */}
      {analysis!.coaching_suggestions && analysis!.coaching_suggestions.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-blue-600 uppercase mb-2">
            Coaching Suggestions
          </h3>
          <ol className="space-y-1.5">
            {analysis!.coaching_suggestions.map((suggestion: string, i: number) => (
              <li
                key={i}
                className="text-sm text-gray-700 bg-blue-50 rounded px-3 py-2"
              >
                <span className="font-medium text-blue-700 mr-1">{i + 1}.</span>
                {suggestion}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Token usage footer */}
      <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-400">
        ~{analysis!.input_tokens?.toLocaleString()} input tokens,{" "}
        ~{analysis!.output_tokens?.toLocaleString()} output tokens
      </div>
    </div>
  );
}
