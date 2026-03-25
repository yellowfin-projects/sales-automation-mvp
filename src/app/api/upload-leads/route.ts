import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Papa from "papaparse";
import { getWeekStart } from "@/lib/lead-metrics";
import { createHash } from "crypto";

// Service-level Supabase client for API routes
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";
const supabase = createClient(supabaseUrl, supabaseKey);

// CSV column names from the Salesforce lead report
interface LeadCsvRow {
  Company: string;
  "Full Name": string;
  Email: string;
  Phone: string;
  Country: string;
  Type: string;
  "Lead Status": string;
  "Sales Qualified Lead": string;
  "Power of One": string;
  Region: string;
  "Idera Latest Download": string;
  Medium: string;
}

const CONVERTED_STATUSES = ["converted", "qualified", "closed - converted"];

function cleanMedium(raw: string | undefined): string {
  const trimmed = (raw || "").trim();
  if (!trimmed || trimmed === "-" || trimmed.toLowerCase() === "none") {
    return "Unknown";
  }
  return trimmed;
}

/**
 * Parse the download date from "Idera Latest Download" column.
 * Extracts only the date portion and uses UTC to avoid timezone shifts.
 */
function parseDownloadDate(raw: string | undefined): string | null {
  if (!raw || !raw.trim()) return null;
  const trimmed = raw.trim();

  // Extract just the date part (before any space/time component)
  const datePart = trimmed.split(" ")[0];

  // Try MM/DD/YYYY format
  const parts = datePart.split("/");
  if (parts.length === 3) {
    const month = Number(parts[0]);
    const day = Number(parts[1]);
    const year = Number(parts[2]);
    if (!isNaN(month) && !isNaN(day) && !isNaN(year)) {
      const d = new Date(Date.UTC(year, month - 1, day));
      if (!isNaN(d.getTime())) return d.toISOString();
    }
  }

  // Try ISO format — extract date only
  const isoMatch = trimmed.match(/^\d{4}-\d{2}-\d{2}/);
  if (isoMatch) {
    const d = new Date(isoMatch[0] + "T00:00:00Z");
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  return null;
}

function generatePlaceholderEmail(row: LeadCsvRow): string {
  const content = `${row["Full Name"]}|${row.Company}|${row.Phone}|${row.Country}`;
  const hash = createHash("md5").update(content).digest("hex").slice(0, 12);
  return `_no_email_${hash}`;
}

function getQuarter(date: Date): string {
  const year = date.getFullYear();
  const quarter = Math.floor(date.getMonth() / 3) + 1;
  return `${year}-Q${quarter}`;
}

/**
 * POST — Manual CSV upload for leads.
 * Accepts a CSV file via FormData, parses it, and upserts into Supabase.
 * Uses the same transformation logic as the Gmail sync.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.name.endsWith(".csv")) {
      return NextResponse.json({ error: "Please upload a CSV file" }, { status: 400 });
    }

    const csvText = await file.text();

    // Parse CSV
    const parseResult = Papa.parse<LeadCsvRow>(csvText, {
      header: true,
      skipEmptyLines: true,
    });

    if (parseResult.errors.length > 0 && parseResult.data.length === 0) {
      return NextResponse.json(
        { error: `CSV parsing failed: ${parseResult.errors[0].message}` },
        { status: 400 }
      );
    }

    const rows = parseResult.data;

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "CSV file is empty or has no data rows" },
        { status: 400 }
      );
    }

    // Create sync record for audit trail
    const { data: syncRecord, error: syncError } = await supabase
      .from("lead_syncs")
      .insert({
        email_subject: `Manual upload: ${file.name}`,
        email_date: new Date().toISOString(),
        rows_in_csv: rows.length,
        leads_imported: 0,
        leads_skipped: 0,
        trigger_source: "manual",
      })
      .select()
      .single();

    if (syncError || !syncRecord) {
      return NextResponse.json(
        { error: `Failed to create sync record: ${syncError?.message}` },
        { status: 500 }
      );
    }

    // Transform rows
    const leadsToUpsert = rows.map((row) => {
      const email = (row.Email || "").trim();
      const downloadDate = parseDownloadDate(row["Idera Latest Download"]);
      const downloadDateObj = downloadDate ? new Date(downloadDate) : new Date();
      const weekStart = getWeekStart(downloadDateObj);
      const status = (row["Lead Status"] || "").trim();

      return {
        company: (row.Company || "").trim(),
        full_name: (row["Full Name"] || "").trim(),
        email: email || generatePlaceholderEmail(row),
        phone: (row.Phone || "").trim(),
        country: (row.Country || "").trim(),
        lead_type: (row["Type"] || "").trim(),
        lead_status: status,
        sales_qualified: parseInt(row["Sales Qualified Lead"] || "0", 10) || 0,
        power_of_one: parseInt(row["Power of One"] || "0", 10) || 0,
        region: (row.Region || "").trim(),
        download_date: downloadDate,
        medium: cleanMedium(row.Medium),
        lead_week_start: weekStart,
        is_converted: CONVERTED_STATUSES.includes(status.toLowerCase()),
        sync_id: syncRecord.id,
        quarter: getQuarter(downloadDateObj),
        updated_at: new Date().toISOString(),
      };
    });

    // Deduplicate within the batch
    const deduped = new Map<string, (typeof leadsToUpsert)[number]>();
    for (const lead of leadsToUpsert) {
      const key = `${lead.email}|${lead.lead_week_start}`;
      deduped.set(key, lead);
    }
    const uniqueLeads = Array.from(deduped.values());

    // Upsert
    const { data: upsertResult, error: upsertError } = await supabase
      .from("leads")
      .upsert(uniqueLeads, {
        onConflict: "email,lead_week_start",
        ignoreDuplicates: false,
      })
      .select("id");

    if (upsertError) {
      return NextResponse.json(
        { error: `Failed to upsert leads: ${upsertError.message}` },
        { status: 500 }
      );
    }

    const processed = upsertResult?.length || 0;
    const duplicatesInFile = leadsToUpsert.length - uniqueLeads.length;

    // Update sync record
    await supabase
      .from("lead_syncs")
      .update({ leads_imported: processed, leads_skipped: duplicatesInFile })
      .eq("id", syncRecord.id);

    return NextResponse.json({
      success: true,
      filename: file.name,
      rows_in_csv: rows.length,
      duplicates_in_file: duplicatesInFile,
      leads_processed: processed,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
