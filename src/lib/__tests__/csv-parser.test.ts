import { describe, it, expect } from "vitest";
import { parseSalesforceDate, parseNumber } from "../csv-parser";

describe("parseSalesforceDate", () => {
  it("parses standard M/D/YYYY format", () => {
    expect(parseSalesforceDate("3/15/2026")).toBe("2026-03-15");
  });

  it("parses single-digit month and day", () => {
    expect(parseSalesforceDate("1/5/2026")).toBe("2026-01-05");
  });

  it("parses double-digit month and day", () => {
    expect(parseSalesforceDate("12/25/2026")).toBe("2026-12-25");
  });

  it("returns null for empty string", () => {
    expect(parseSalesforceDate("")).toBeNull();
  });

  it("returns null for whitespace-only string", () => {
    expect(parseSalesforceDate("   ")).toBeNull();
  });

  it("returns null for invalid format", () => {
    expect(parseSalesforceDate("2026-03-15")).toBeNull(); // ISO format, not SF format
    expect(parseSalesforceDate("March 15, 2026")).toBeNull();
    expect(parseSalesforceDate("not-a-date")).toBeNull();
  });

  it("handles leading/trailing whitespace", () => {
    expect(parseSalesforceDate("  3/15/2026  ")).toBe("2026-03-15");
  });
});

describe("parseNumber", () => {
  it("parses simple integers", () => {
    expect(parseNumber("50000")).toBe(50000);
  });

  it("parses decimals", () => {
    expect(parseNumber("50000.50")).toBe(50000.5);
  });

  it("strips commas", () => {
    expect(parseNumber("1,250,000")).toBe(1250000);
  });

  it("strips dollar signs", () => {
    expect(parseNumber("$50000")).toBe(50000);
  });

  it("strips commas and dollar signs together", () => {
    expect(parseNumber("$1,250,000.00")).toBe(1250000);
  });

  it("returns 0 for empty string", () => {
    expect(parseNumber("")).toBe(0);
  });

  it("returns 0 for whitespace-only string", () => {
    expect(parseNumber("   ")).toBe(0);
  });

  it("returns 0 for non-numeric string", () => {
    expect(parseNumber("abc")).toBe(0);
  });

  it("handles string with spaces", () => {
    expect(parseNumber(" 50000 ")).toBe(50000);
  });
});
