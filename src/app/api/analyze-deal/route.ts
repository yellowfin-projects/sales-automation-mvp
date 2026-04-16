import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getGeminiModel, estimateTokens } from "@/lib/gemini";
import { buildDealAnalysisPrompt } from "@/lib/prompts";
import { calculateDealMetrics } from "@/lib/metrics";
import type { Deal, Activity } from "@/lib/types";
import type { TranscriptAnalysis } from "@/lib/transcript-types";

// Use service-level Supabase client for API routes
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: NextRequest) {
  try {
    const { dealId } = await request.json();

    if (!dealId) {
      return NextResponse.json({ error: "dealId is required" }, { status: 400 });
    }

    // Check if Gemini API key is configured
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "Gemini API key is not configured. Add GEMINI_API_KEY to your .env.local file." },
        { status: 400 }
      );
    }

    // Fetch deal
    const { data: deal, error: dealError } = await supabase
      .from("deals")
      .select("*")
      .eq("id", dealId)
      .single();

    if (dealError || !deal) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    // Fetch activities
    const { data: activities, error: actError } = await supabase
      .from("activities")
      .select("*")
      .eq("deal_id", dealId)
      .order("activity_date", { ascending: false });

    if (actError) {
      return NextResponse.json({ error: actError.message }, { status: 500 });
    }

    // Fetch transcript coaching analyses (summaries only, not raw transcripts)
    const { data: transcriptAnalyses } = await supabase
      .from("transcript_analyses")
      .select("*")
      .eq("deal_id", dealId)
      .order("analyzed_at", { ascending: false });

    // Build prompt and estimate tokens
    const metrics = calculateDealMetrics(deal as Deal, (activities as Activity[]) || []);
    const prompt = buildDealAnalysisPrompt(
      deal as Deal,
      metrics,
      (activities as Activity[]) || [],
      (transcriptAnalyses as TranscriptAnalysis[]) || []
    );
    const estimatedInputTokens = estimateTokens(prompt);

    // Call Gemini
    const model = getGeminiModel();
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Parse the JSON response — strip markdown code blocks if present
    let cleanedText = text.trim();
    if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText
        .replace(/^```(?:json)?\s*\n?/, "")
        .replace(/\n?```\s*$/, "");
    }

    let analysis;
    try {
      analysis = JSON.parse(cleanedText);
    } catch {
      return NextResponse.json(
        {
          error: "AI returned invalid JSON. Raw response stored for debugging.",
          raw_response: text.slice(0, 500),
        },
        { status: 500 }
      );
    }

    // Estimate output tokens
    const estimatedOutputTokens = estimateTokens(text);

    // Store the analysis in Supabase
    const { data: saved, error: saveError } = await supabase
      .from("analyses")
      .insert({
        deal_id: dealId,
        health_assessment: analysis.health_assessment || "",
        risk_signals: analysis.risk_signals || [],
        positive_signals: analysis.positive_signals || [],
        coaching_suggestions: analysis.coaching_suggestions || [],
        ai_win_probability: analysis.ai_win_probability || 0,
        ai_reasoning: analysis.ai_reasoning || "",
        input_tokens: estimatedInputTokens,
        output_tokens: estimatedOutputTokens,
      })
      .select()
      .single();

    if (saveError) {
      return NextResponse.json({ error: saveError.message }, { status: 500 });
    }

    // Save AI-detected checklist items, but never overwrite user-set values
    const checklistDetected: { category: string; completed: boolean; confidence: string }[] =
      analysis.checklist_detected || [];

    if (checklistDetected.length > 0) {
      // Find categories the user has manually set — those should not be overwritten
      const { data: userItems } = await supabase
        .from("deal_checklist")
        .select("category")
        .eq("deal_id", dealId)
        .eq("source", "user");

      const userOverridden = new Set((userItems || []).map((i: { category: string }) => i.category));

      const itemsToUpsert = checklistDetected
        .filter((item) => !userOverridden.has(item.category))
        .map((item) => ({
          deal_id: dealId,
          category: item.category,
          completed: item.completed,
          source: "ai",
          ai_confidence: item.confidence || "",
          updated_at: new Date().toISOString(),
        }));

      if (itemsToUpsert.length > 0) {
        await supabase
          .from("deal_checklist")
          .upsert(itemsToUpsert, { onConflict: "deal_id,category" });
      }
    }

    return NextResponse.json({
      analysis: saved,
      token_usage: {
        input: estimatedInputTokens,
        output: estimatedOutputTokens,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
