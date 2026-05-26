import { describe, expect, it } from "vitest";
import { validateJournalEntry, JournalLineData } from "./accounting";

describe("Double-Entry Accounting - Balance Validation", () => {
  it("validates balanced journal entries", () => {
    const lines: JournalLineData[] = [
      { accountCode: "1000", debitAmount: 1000 },
      { accountCode: "4000", creditAmount: 1000 },
    ];
    const result = validateJournalEntry(lines);
    expect(result.valid).toBe(true);
    expect(result.message).toBeUndefined();
  });

  it("rejects unbalanced journal entries", () => {
    const lines: JournalLineData[] = [
      { accountCode: "1000", debitAmount: 1000 },
      { accountCode: "4000", creditAmount: 500 },
    ];
    const result = validateJournalEntry(lines);
    expect(result.valid).toBe(false);
    expect(result.message).toContain("does not balance");
  });

  it("allows rounding errors within 0.01", () => {
    const lines: JournalLineData[] = [
      { accountCode: "1000", debitAmount: 100.005 },
      { accountCode: "4000", creditAmount: 100 },
    ];
    const result = validateJournalEntry(lines);
    expect(result.valid).toBe(true);
  });

  it("rejects entries exceeding 0.01 tolerance", () => {
    const lines: JournalLineData[] = [
      { accountCode: "1000", debitAmount: 100.02 },
      { accountCode: "4000", creditAmount: 100 },
    ];
    const result = validateJournalEntry(lines);
    expect(result.valid).toBe(false);
  });

  it("validates multi-line balanced entries (sales scenario)", () => {
    // Order sale: Debit Cash, Credit Revenue + Tax Payable
    const lines: JournalLineData[] = [
      { accountCode: "1000", debitAmount: 1140 },   // Cash (total with tax)
      { accountCode: "4000", creditAmount: 1000 },  // Revenue
      { accountCode: "2100", creditAmount: 140 },   // Tax Payable (14%)
    ];
    const result = validateJournalEntry(lines);
    expect(result.valid).toBe(true);
  });

  it("validates COGS entry pattern", () => {
    // COGS: Debit COGS expense, Credit Inventory
    const lines: JournalLineData[] = [
      { accountCode: "5000", debitAmount: 400 },    // COGS
      { accountCode: "1200", creditAmount: 400 },   // Inventory
    ];
    const result = validateJournalEntry(lines);
    expect(result.valid).toBe(true);
  });

  it("validates refund entry pattern", () => {
    // Refund: Debit Revenue (reverse), Credit Cash
    const lines: JournalLineData[] = [
      { accountCode: "4000", debitAmount: 500 },    // Revenue reversal
      { accountCode: "1000", creditAmount: 500 },   // Cash refund
    ];
    const result = validateJournalEntry(lines);
    expect(result.valid).toBe(true);
  });

  it("validates complex multi-cost order entry", () => {
    // Full order: Revenue + Shipping + Tax
    const lines: JournalLineData[] = [
      { accountCode: "1000", debitAmount: 1200 },   // Cash received
      { accountCode: "4000", creditAmount: 1000 },  // Product revenue
      { accountCode: "4100", creditAmount: 50 },    // Shipping revenue
      { accountCode: "2100", creditAmount: 150 },   // Tax payable
    ];
    const result = validateJournalEntry(lines);
    expect(result.valid).toBe(true);
  });

  it("handles entries with zero amounts", () => {
    const lines: JournalLineData[] = [
      { accountCode: "1000", debitAmount: 0 },
      { accountCode: "4000", creditAmount: 0 },
    ];
    const result = validateJournalEntry(lines);
    expect(result.valid).toBe(true);
  });

  it("handles entries with undefined amounts", () => {
    const lines: JournalLineData[] = [
      { accountCode: "1000", debitAmount: 500 },
      { accountCode: "4000", creditAmount: 500 },
      { accountCode: "5000" }, // No amounts
    ];
    const result = validateJournalEntry(lines);
    expect(result.valid).toBe(true);
  });
});
