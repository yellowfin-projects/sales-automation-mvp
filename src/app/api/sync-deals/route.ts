import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import Papa from "papaparse";
import { parseSalesforceDate, parseNumber } from "@/lib/csv-parser";
import type { CsvRow } from "@/lib/types";

// Extend Vercel timeout from 10s to 60s (supported on Hobby plan)
export const maxDuration = 60;

// Service-level Supabase client for API routes
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";
const supabase = createClient(supabaseUrl, supabaseKey);

// Required CSV columns from the Salesforce deal activities report
const REQUIRED_COLUMNS = [
  "Created Date",
  "Sales Region",
  "Account Name",
  "Opportunity Name",
  "Opportunity Stage",
  "Amount (converted) Currency",
  "Amount (converted)",
  "Probability (%)",
  "Close Date",
  "Opportunity Owner",
  "Opportunity Type",
  "Subject",
  "Full Comments",
  "Type",
];

/**
 * Group CSV rows by Opportunity Name.
 */
function groupByOpportunity(rows: CsvRow[]): Map<string, CsvRow[]> {
  const groups = new Map<string, CsvRow[]>();
  for (const row of rows) {
    const name = row["Opportunity Name"].trim();
    if (!groups.has(name)) {
      groups.set(name, []);
    }
    groups.get(name)!.push(row);
  }
  return groups;
}

/**
 * Get the row with the most recent Created Date for a deal group.
 * This row's metadata (stage, amount, etc.) represents the latest state.
 */
function getLatestRow(rows: CsvRow[]): CsvRow {
  return rows.reduce((latest, row) => {
    const latestDate = parseSalesforceDate(latest["Created Date"]) || "0000-00-00";
    const rowDate = parseSalesforceDate(row["Created Date"]) || "0000-00-00";
    return rowDate > latestDate ? row : latest;
  });
}

interface UpsertDealResult {
  dealId: string | null;
  created: boolean;
  changes: number;
  error?: string;
}

/**
 * Insert a new deal or update an existing one. Track any metadata changes in deal_history.
 */
async function upsertDeal(row: CsvRow, uploadId: string): Promise<UpsertDealResult> {
  const oppName = row["Opportunity Name"].trim();
  const newData = {
    opportunity_name: oppName,
    account_name: row["Account Name"].trim(),
    stage: row["Opportunity Stage"].trim(),
    amount: parseNumber(row["Amount (converted)"]),
    currency: row["Amount (converted) Currency"]?.trim() || "USD",
    probability: parseNumber(row["Probability (%)"]),
    predictive_amount: parseNumber(row["Predictive Amount (converted)"]),
    close_date: parseSalesforceDate(row["Close Date"]),
    owner: row["Opportunity Owner"].trim(),
    opportunity_type: row["Opportunity Type"]?.trim() || "",
    region: row["Sales Region"]?.trim() || "",
  };

  // Check if deal already exists
  const { data: existing } = await supabase
    .from("deals")
    .select("*")
    .eq("opportunity_name", oppName)
    .single();

  if (!existing) {
    // Create new deal
    const { data: created, error } = await supabase
      .from("deals")
      .insert(newData)
      .select()
      .single();

    if (error) {
      return { dealId: null, created: false, changes: 0, error: error.message };
    }
    return { dealId: created.id, created: true, changes: 0 };
  }

  // Deal exists — check for metadata changes
  let changeCount = 0;
  const fieldsToTrack = ["stage", "amount", "close_date", "probability"] as const;

  for (const field of fieldsToTrack) {
    const oldVal = String(existing[field] ?? "");
    const newVal = String(newData[field] ?? "");
    if (oldVal !== newVal) {
      changeCount++;
      // Record in deal_history
      await supabase.from("deal_history").insert({
        deal_id: existing.id,
        field_name: field,
        old_value: oldVal,
        new_value: newVal,
        upload_id: uploadId,
      });
    }
  }

  // Update deal metadata if anything changed
  if (changeCount > 0) {
    const { error } = await supabase
      .from("deals")
      .update({
        ...newData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (error) {
      return { dealId: existing.id, created: false, changes: 0, error: error.message };
    }
  }

  return { dealId: existing.id, created: false, changes: changeCount };
}

/**
 * Insert an activity if it doesn't already exist (dedup by deal_id + date + subject).
 * Returns "inserted", "duplicate", or an error message.
 */
async function insertActivity(
  row: CsvRow,
  dealId: string,
  uploadId: string
): Promise<"inserted" | "duplicate" | string> {
  const activityDate = parseSalesforceDate(row["Created Date"]);
  const subject = row["Subject"]?.trim() || "";

  if (!activityDate) {
    return "Invalid or missing Created Date";
  }

  // Check for duplicate
  const { data: existing } = await supabase
    .from("activities")
    .select("id")
    .eq("deal_id", dealId)
    .eq("activity_date", activityDate)
    .eq("subject", subject)
    .limit(1)
    .single();

  if (existing) {
    return "duplicate";
  }

  // Determine activity type — normalize blank/null to "Other"
  let activityType = row["Type"]?.trim() || "Other";
  if (!activityType) activityType = "Other";

  const { error } = await supabase.from("activities").insert({
    deal_id: dealId,
    activity_date: activityDate,
    subject,
    full_comments: row["Full Comments"] || "",
    activity_type: activityType,
    upload_id: uploadId,
  });

  if (error) {
    return error.message;
  }

  return "inserted";
}

/**
 * Shared sync logic used by both the manual POST handler and the cron GET handler.
 * Connects to Gmail, finds the latest deal activities report, parses the CSV,
 * and processes deals + activities into Supabase.
 */
async function performSync(triggerSource: "manual" | "cron"): Promise<NextResponse> {
  try {
    // Validate env vars
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      return NextResponse.json(
        { error: "Gmail credentials not configured." },
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

    // 2. Search for the latest deal activities email
    const lock = await client.getMailboxLock("INBOX");
    let csvText: string | null = null;
    let emailSubject = "";
    let emailDate: Date | null = null;

    try {
      const messages = await client.search({
        subject: "Report results (ESB All Deal Activities)",
      });

      if (!messages || messages.length === 0) {
        await client.logout();
        return NextResponse.json(
          { error: "No deal activities report email found in inbox." },
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
        { error: "No CSV attachment found in the latest deal activities email." },
        { status: 404 }
      );
    }

    // 3. Parse CSV
    const parseResult = Papa.parse<CsvRow>(csvText, {
      header: true,
      skipEmptyLines: true,
    });

    if (parseResult.errors.length > 0 && parseResult.data.length === 0) {
      return NextResponse.json(
        { error: `CSV parsing failed: ${parseResult.errors[0].message}` },
        { status: 400 }
      );
    }

    // Validate required columns
    const headers = parseResult.meta.fields || [];
    const missingColumns = REQUIRED_COLUMNS.filter((col) => !headers.includes(col));
    if (missingColumns.length > 0) {
      return NextResponse.json(
        { error: `Missing required columns: ${missingColumns.join(", ")}` },
        { status: 400 }
      );
    }

    // Filter out rows without an opportunity name
    const rows = parseResult.data.filter(
      (row) => row["Opportunity Name"]?.trim()
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "No valid data rows found in the CSV." },
        { status: 400 }
      );
    }

    // 4. Create upload audit record
    const { data: upload, error: uploadError } = await supabase
      .from("uploads")
      .insert({
        filename: `gmail-sync-${new Date().toISOString().slice(0, 10)}`,
        row_count: rows.length,
        new_activities_added: 0,
        duplicate_activities_skipped: 0,
        deals_created: 0,
        deals_updated: 0,
      })
      .select()
      .single();

    if (uploadError || !upload) {
      return NextResponse.json(
        { error: `Failed to create upload record: ${uploadError?.message}` },
        { status: 500 }
      );
    }

    // 5. Group rows by opportunity, upsert deals, insert activities
    const dealGroups = groupByOpportunity(rows);
    let dealsCreated = 0;
    let dealsUpdated = 0;
    let newActivities = 0;
    let duplicateActivities = 0;
    const errors: string[] = [];
    const skippedRecords: { deal: string; subject: string; date: string }[] = [];

    for (const [oppName, dealRows] of dealGroups.entries()) {
      const latestRow = getLatestRow(dealRows);
      const dealResult = await upsertDeal(latestRow, upload.id);

      if (dealResult.error) {
        errors.push(`Deal "${oppName}": ${dealResult.error}`);
        continue;
      }

      if (dealResult.created) {
        dealsCreated++;
      } else if (dealResult.changes > 0) {
        dealsUpdated++;
      }

      // Insert activities (dedup by deal_id + date + subject)
      for (const row of dealRows) {
        const activityResult = await insertActivity(row, dealResult.dealId!, upload.id);

        if (activityResult === "inserted") {
          newActivities++;
        } else if (activityResult === "duplicate") {
          duplicateActivities++;
          skippedRecords.push({
            deal: oppName,
            subject: row["Subject"]?.trim() || "(no subject)",
            date: parseSalesforceDate(row["Created Date"]) || row["Created Date"] || "",
          });
        } else {
          errors.push(`Activity "${row.Subject}" for "${oppName}": ${activityResult}`);
        }
      }
    }

    // 6. Update upload record with final counts and skipped details
    await supabase
      .from("uploads")
      .update({
        new_activities_added: newActivities,
        duplicate_activities_skipped: duplicateActivities,
        deals_created: dealsCreated,
        deals_updated: dealsUpdated,
        skipped_records: skippedRecords.length > 0 ? skippedRecords : null,
      })
      .eq("id", upload.id);

    return NextResponse.json({
      success: true,
      trigger_source: triggerSource,
      rows_in_csv: rows.length,
      unique_deals: dealGroups.size,
      deals_created: dealsCreated,
      deals_updated: dealsUpdated,
      new_activities: newActivities,
      duplicate_activities: duplicateActivities,
      errors: errors.length > 0 ? errors : undefined,
      email_subject: emailSubject,
      email_date: emailDate?.toISOString() || null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST — Manual sync triggered from the UI or for testing.
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
