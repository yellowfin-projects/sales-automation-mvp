import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getGeminiModel, estimateTokens } from "@/lib/gemini";
import { buildTranscriptCoachingPrompt } from "@/lib/transcript-prompts";
import type { Deal } from "@/lib/types";
import type { Transcript } from "@/lib/transcript-types";

// Allow up to 60 seconds for long transcript analysis
export const maxDuration = 60;

// Service-level Supabase client for API routes
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: NextRequest) {
  try {
    const { dealId, transcriptId } = await request.json();

    if (!dealId || !transcriptId) {
      return NextResponse.json(
        { error: "dealId and transcriptId are required" },
        { status: 400 }
      );
    }

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

    // Fetch the specific transcript
    const { data: transcript, error: transcriptError } = await supabase
      .from("transcripts")
      .select("*")
      .eq("id", transcriptId)
      .eq("deal_id", dealId)
      .single();

    if (transcriptError || !transcript) {
      return NextResponse.json({ error: "Transcript not found" }, { status: 404 });
    }

    // Fetch product knowledge (most recent entry)
    const { data: productKnowledgeData } = await supabase
      .from("product_knowledge")
      .select("content")
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();

    const productKnowledge = productKnowledgeData?.content || "";

    // Build prompt — pass single transcript as array
    const prompt = buildTranscriptCoachingPrompt(
      deal as Deal,
      [transcript as Transcript],
      productKnowledge
    );

    const estimatedInputTokens = estimateTokens(prompt);

    // Call Gemini
    const model = getGeminiModel();
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Parse JSON response — Gemini sometimes wraps output in prose or markdown.
    // Try three passes: raw → strip markdown fences → extract first {...} block.
    let coaching;
    const attempts = [
      text.trim(),
      text.trim().replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, ""),
    ];

    // Third attempt: find the outermost { ... } block in the response
    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      attempts.push(text.slice(firstBrace, lastBrace + 1));
    }

    for (const candidate of attempts) {
      try {
        coaching = JSON.parse(candidate);
        break;
      } catch {
        // try next
      }
    }

    if (!coaching) {
      console.error("Gemini raw response:", text);
      return NextResponse.json(
        {
          error: "AI returned invalid JSON. Raw response stored for debugging.",
          raw_response: text.slice(0, 500),
        },
        { status: 500 }
      );
    }

    const estimatedOutputTokens = estimateTokens(text);

    // Store the analysis linked to this single transcript
    const { data: saved, error: saveError } = await supabase
      .from("transcript_analyses")
      .insert({
        deal_id: dealId,
        transcript_ids: [transcriptId],
        sales_coaching: coaching.sales_coaching || {},
        product_coaching: coaching.product_coaching || {},
        overall_summary: coaching.overall_summary || "",
        strengths: coaching.strengths || [],
        improvements: coaching.improvements || [],
        input_tokens: estimatedInputTokens,
        output_tokens: estimatedOutputTokens,
      })
      .select()
      .single();

    if (saveError) {
      return NextResponse.json({ error: saveError.message }, { status: 500 });
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
