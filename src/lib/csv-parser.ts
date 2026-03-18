import Papa from "papaparse";
import type { CsvRow } from "./types";

// The exact column headers we expect from the Salesforce report export
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
] as const;

export interface ParseResult {
  rows: CsvRow[];
  errors: string[];
}

/**
 * Parse a CSV file from a Salesforce report export.
 * Validates that required columns are present and returns typed rows.
 */
export function parseCsvFile(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      // Salesforce exports can include non-UTF8 characters (e.g., non-breaking spaces)
      encoding: "latin1",
      complete(results) {
        const errors: string[] = [];

        // Check for parse-level errors
        if (results.errors.length > 0) {
          for (const err of results.errors.slice(0, 5)) {
            errors.push(`Row ${err.row}: ${err.message}`);
          }
          if (results.errors.length > 5) {
            errors.push(`...and ${results.errors.length - 5} more errors`);
          }
        }

        // Validate required columns exist
        const headers = results.meta.fields || [];
        const missingColumns = REQUIRED_COLUMNS.filter(
          (col) => !headers.includes(col)
        );
        if (missingColumns.length > 0) {
          errors.push(
            `Missing required columns: ${missingColumns.join(", ")}`
          );
          resolve({ rows: [], errors });
          return;
        }

        // Filter out rows that are completely empty or lack an opportunity name
        const validRows = (results.data as unknown as CsvRow[]).filter(
          (row) => row["Opportunity Name"]?.trim()
        );

        if (validRows.length === 0) {
          errors.push("No valid data rows found in the CSV");
        }

        resolve({ rows: validRows, errors });
      },
      error(err: Error) {
        resolve({ rows: [], errors: [err.message] });
      },
    });
  });
}

/**
 * Parse a date string from the Salesforce CSV (format: "M/D/YYYY")
 * and return an ISO date string (YYYY-MM-DD).
 * Returns null if the date can't be parsed.
 */
export function parseSalesforceDate(dateStr: string): string | null {
  if (!dateStr?.trim()) return null;

  // Salesforce exports dates as M/D/YYYY
  const parts = dateStr.trim().split("/");
  if (parts.length !== 3) return null;

  const month = parts[0].padStart(2, "0");
  const day = parts[1].padStart(2, "0");
  const year = parts[2];

  // Basic sanity check
  const parsed = new Date(`${year}-${month}-${day}`);
  if (isNaN(parsed.getTime())) return null;

  return `${year}-${month}-${day}`;
}

/**
 * Parse a numeric string from the CSV, handling commas and empty values.
 */
export function parseNumber(value: string): number {
  if (!value?.trim()) return 0;
  // Remove commas and any currency symbols
  const cleaned = value.replace(/[,$\s]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}
