import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ""
);

// PUT /api/deals/[id]/checklist
// Body: { category: string, completed: boolean }
// Upserts the item with source='user', overriding any AI detection.
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { category, completed } = await request.json();

    if (!category || typeof completed !== "boolean") {
      return NextResponse.json(
        { error: "category (string) and completed (boolean) are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("deal_checklist")
      .upsert(
        {
          deal_id: id,
          category,
          completed,
          source: "user",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "deal_id,category" }
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ item: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
