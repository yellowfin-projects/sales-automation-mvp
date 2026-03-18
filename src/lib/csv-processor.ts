import { supabase } from "./supabase";
import { parseSalesforceDate, parseNumber } from "./csv-parser";
import type { CsvRow, UploadResult } from "./types";

/**
 * Process parsed CSV rows into the database using the additive upload model.
 *
 * 1. Upsert deals — create new ones, update metadata for existing ones
 * 2. Deduplicate activities — skip rows that already exist
 * 3. Track deal changes in deal_history
 * 4. Log the upload
 *
 * Returns an UploadResult summary for display to the user.
 */
export async function processCsvRows(
  rows: CsvRow[],
  filename: string
): Promise<UploadResult> {
  const result: UploadResult = {
    total_rows: rows.length,
    new_activities: 0,
    duplicate_activities: 0,
    deals_created: 0,
    deals_updated: 0,
    deal_changes: [],
    errors: [],
  };

  // Step 1: Create the upload record
  const { data: upload, error: uploadError } = await supabase
    .from("uploads")
    .insert({
      filename,
      row_count: rows.length,
      new_activities_added: 0,
      duplicate_activities_skipped: 0,
      deals_created: 0,
      deals_updated: 0,
    })
    .select()
    .single();

  if (uploadError || !upload) {
    result.errors.push(`Failed to create upload record: ${uploadError?.message}`);
    return result;
  }

  // Step 2: Group rows by opportunity to extract deal metadata
  const dealGroups = groupByOpportunity(rows);

  // Step 3: Upsert deals and track changes
  for (const [oppName, dealRows] of dealGroups.entries()) {
    const latestRow = getLatestRow(dealRows);
    const dealResult = await upsertDeal(latestRow, upload.id);

    if (dealResult.error) {
      result.errors.push(`Deal "${oppName}": ${dealResult.error}`);
      continue;
    }

    if (dealResult.created) {
      result.deals_created++;
    } else if (dealResult.changes.length > 0) {
      result.deals_updated++;
      result.deal_changes.push(...dealResult.changes);
    }

    // Step 4: Insert activities (dedup by deal_id + date + subject)
    for (const row of dealRows) {
      const activityResult = await insertActivity(row, dealResult.dealId!, upload.id);

      if (activityResult === "inserted") {
        result.new_activities++;
      } else if (activityResult === "duplicate") {
        result.duplicate_activities++;
      } else {
        result.errors.push(`Activity "${row.Subject}" for "${oppName}": ${activityResult}`);
      }
    }
  }

  // Step 5: Update the upload record with final counts
  await supabase
    .from("uploads")
    .update({
      new_activities_added: result.new_activities,
      duplicate_activities_skipped: result.duplicate_activities,
      deals_created: result.deals_created,
      deals_updated: result.deals_updated,
    })
    .eq("id", upload.id);

  return result;
}

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
  changes: { deal_name: string; field: string; old_value: string; new_value: string }[];
  error?: string;
}

/**
 * Insert a new deal or update an existing one. Track any metadata changes.
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
      return { dealId: null, created: false, changes: [], error: error.message };
    }
    return { dealId: created.id, created: true, changes: [] };
  }

  // Deal exists — check for metadata changes
  const changes: UpsertDealResult["changes"] = [];
  const fieldsToTrack = ["stage", "amount", "close_date", "probability"] as const;

  for (const field of fieldsToTrack) {
    const oldVal = String(existing[field] ?? "");
    const newVal = String(newData[field] ?? "");
    if (oldVal !== newVal) {
      changes.push({
        deal_name: oppName,
        field,
        old_value: oldVal,
        new_value: newVal,
      });

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
  if (changes.length > 0) {
    const { error } = await supabase
      .from("deals")
      .update({
        ...newData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (error) {
      return { dealId: existing.id, created: false, changes: [], error: error.message };
    }
  }

  return { dealId: existing.id, created: false, changes };
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
