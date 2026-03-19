import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import Papa from "papaparse";
import { getWeekStart } from "@/lib/lead-metrics";
import { createHash } from "crypto";

// Extend Vercel timeout from 10s to 60s (supported on Hobby plan)
export const maxDuration = 60;

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
  "Lead Type": string;
  "Lead Status": string;
  "Sales Qualified": string;
  "Power of One": string;
  Region: string;
  "Idera Latest Download": string;
  Medium: string;
}

// Converted status values that indicate the lead has been converted
const CONVERTED_STATUSES = ["converted", "qualified", "closed - converted"];

/**
 * Clean the medium field: blank/null → "Unknown"
 */
function cleanMedium(raw: string | undefined): string {
  const trimmed = (raw || "").trim();
  if (!trimmed || trimmed === "-" || trimmed.toLowerCase() === "none") {
    return "Unknown";
  }
  return trimmed;
}

/**
 * Parse the download date from "Idera Latest Download" column.
 * Expected format: "M/D/YYYY" or "MM/DD/YYYY" or ISO.
 * Returns ISO string or null.
 */
function parseDownloadDate(raw: string | undefined): string | null {
  if (!raw || !raw.trim()) return null;
  const trimmed = raw.trim();

  // Try MM/DD/YYYY format
  const parts = trimmed.split("/");
  if (parts.length === 3) {
    const [month, day, year] = parts;
    const d = new Date(Number(year), Number(month) - 1, Number(day));
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  // Try ISO or other parseable format
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) return d.toISOString();

  return null;
}

/**
 * Generate a placeholder email for leads with blank emails.
 * Uses a hash of the row data so each unique blank-email lead gets its own placeholder.
 */
function generatePlaceholderEmail(row: LeadCsvRow): string {
  const content = `${row["Full Name"]}|${row.Company}|${row.Phone}|${row.Country}`;
  const hash = createHash("md5").update(content).digest("hex").slice(0, 12);
  return `_no_email_${hash}`;
}

/**
 * Derive the quarter string (e.g., "2026-Q1") from a date.
 */
function getQuarter(date: Date): string {
  const year = date.getFullYear();
  const quarter = Math.floor(date.getMonth() / 3) + 1;
  return `${year}-Q${quarter}`;
}

/**
 * Shared sync logic used by both the manual POST handler and the cron GET handler.
 * Connects to Gmail, finds the latest lead report, parses the CSV, and upserts into Supabase.
 */
async function performSync(triggerSource: "manual" | "cron"): Promise<NextResponse> {
  try {
    // Validate env vars
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      return NextResponse.json(
        { error: "Gmail credentials not configured. Add GMAIL_USER and GMAIL_APP_PASSWORD to your .env.local file." },
        { status: 400 }
      );
    }

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: "Supabase not configured." },
        { status: 400 }
      );
    }

    // 1. Connect to Gmail via IMAP
    const client = new ImapFlow({
      host: "imap.gmail.com",
      port: 993,
      secure: true,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
      logger: false,
    });

    await client.connect();

    // 2. Search for the latest matching email
    const lock = await client.getMailboxLock("INBOX");
    let csvText: string | null = null;
    let emailSubject = "";
    let emailDate: Date | null = null;

    try {
      // Search for emails with the lead report subject
      const messages = await client.search({
        subject: "Report results (ESB YF SRLs - Focus Countr",
      });

      if (!messages || messages.length === 0) {
        await client.logout();
        return NextResponse.json(
          { error: "No lead report email found in inbox." },
          { status: 404 }
        );
      }

      // Get the latest one (highest UID)
      const latestUid = messages[messages.length - 1];

      // Fetch the full message
      const source = await client.download(String(latestUid));
      const parsed = await simpleParser(source.content);

      emailSubject = parsed.subject || "";
      emailDate = parsed.date || null;

      // Extract CSV attachment
      if (parsed.attachments && parsed.attachments.length > 0) {
        const csvAttachment = parsed.attachments.find(
          (att) =>
            att.filename?.endsWith(".csv") ||
            att.contentType === "text/csv" ||
            att.contentType === "application/csv"
        );
        if (csvAttachment) {
          csvText = csvAttachment.content.toString("utf-8");
        }
      }
    } finally {
      lock.release();
    }

    await client.logout();

    if (!csvText) {
      return NextResponse.json(
        { error: "No CSV attachment found in the latest lead report email." },
        { status: 404 }
      );
    }

    // 3. Parse CSV
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

    // 4. Create sync record first
    const { data: syncRecord, error: syncError } = await supabase
      .from("lead_syncs")
      .insert({
        email_subject: emailSubject,
        email_date: emailDate?.toISOString() || null,
        rows_in_csv: rows.length,
        leads_imported: 0,
        leads_skipped: 0,
        trigger_source: triggerSource,
      })
      .select()
      .single();

    if (syncError || !syncRecord) {
      return NextResponse.json(
        { error: `Failed to create sync record: ${syncError?.message}` },
        { status: 500 }
      );
    }

    // 5. Transform all rows in memory
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
        lead_type: (row["Lead Type"] || "").trim(),
        lead_status: status,
        sales_qualified: parseInt(row["Sales Qualified"] || "0", 10) || 0,
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

    // 6. Single batch upsert — dedup on (email, lead_week_start)
    //    ignoreDuplicates: false → ON CONFLICT DO UPDATE
    //    This ensures status changes (e.g., "New" → "Converted") are captured
    const { data: upsertResult, error: upsertError } = await supabase
      .from("leads")
      .upsert(leadsToUpsert, {
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

    // 7. Update sync record with final counts
    await supabase
      .from("lead_syncs")
      .update({ leads_imported: processed, leads_skipped: rows.length - processed })
      .eq("id", syncRecord.id);

    return NextResponse.json({
      success: true,
      sync_id: syncRecord.id,
      rows_in_csv: rows.length,
      leads_processed: processed,
      trigger_source: triggerSource,
      email_subject: emailSubject,
      email_date: emailDate?.toISOString() || null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST — Manual sync triggered by the "Sync Leads" button in the UI.
 */
export async function POST() {
  return performSync("manual");
}

/**
 * GET — Cron sync triggered by Vercel's cron scheduler.
 * Requires CRON_SECRET for authentication.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return performSync("cron");
}
