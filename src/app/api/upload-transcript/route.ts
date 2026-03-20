import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { parseTranscriptBuffer } from "@/lib/transcript-parser";

// Service-level Supabase client for API routes
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const dealId = formData.get("dealId") as string | null;
    const callDate = formData.get("callDate") as string | null;
    const callType = formData.get("callType") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!dealId) {
      return NextResponse.json({ error: "dealId is required" }, { status: 400 });
    }

    // Verify the deal exists
    const { data: deal, error: dealError } = await supabase
      .from("deals")
      .select("id, account_name")
      .eq("id", dealId)
      .single();

    if (dealError || !deal) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    // Parse the transcript file
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const parsed = await parseTranscriptBuffer(buffer, file.name);

    // Save to database
    const { data: transcript, error: saveError } = await supabase
      .from("transcripts")
      .insert({
        deal_id: dealId,
        filename: file.name,
        transcript_text: parsed.text,
        speaker_labels: parsed.speakerLabels,
        word_count: parsed.wordCount,
        call_date: callDate || null,
        call_type: callType || "",
      })
      .select()
      .single();

    if (saveError) {
      return NextResponse.json({ error: saveError.message }, { status: 500 });
    }

    return NextResponse.json({ transcript });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { transcriptId } = await request.json();

    if (!transcriptId) {
      return NextResponse.json({ error: "transcriptId is required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("transcripts")
      .delete()
      .eq("id", transcriptId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
