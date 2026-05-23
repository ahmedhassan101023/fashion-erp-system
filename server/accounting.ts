import { createJournalEntry, addJournalLine, getAccountByCode } from "./queries";
import { InsertJournalEntry, InsertJournalLine } from "../drizzle/schema";

/**
 * Double-Entry Accounting Engine
 * Ensures all transactions maintain accounting balance (Debits = Credits)
 */

export interface JournalEntryData {
  entryDate: Date;
  description: string;
  referenceType: string;
  referenceId: number;
  lines: JournalLineData[];
  createdBy: number;
}

export interface JournalLineData {
  accountCode: string;
  debitAmount?: number;
  creditAmount?: number;
}

/**
 * Validates that debits equal credits for a journal entry
 */
export function validateJournalEntry(lines: JournalLineData[]): { valid: boolean; message?: string } {
  let totalDebits = 0;
  let totalCredits = 0;

  lines.forEach(line => {
    if (line.debitAmount) totalDebits += line.debitAmount;
    if (line.creditAmount) totalCredits += line.creditAmount;
  });

  // Allow for rounding errors (0.01)
  if (Math.abs(totalDebits - totalCredits) > 0.01) {
    return {
      valid: false,
      message: `Journal entry does not balance. Debits: ${totalDebits}, Credits: ${totalCredits}`
    };
  }

  return { valid: true };
}

/**
 * Posts a journal entry to the general ledger
 * Returns the journal entry ID if successful
 */
export async function postJournalEntry(data: JournalEntryData): Promise<number> {
  // Validate the entry
  const validation = validateJournalEntry(data.lines);
  if (!validation.valid) {
    throw new Error(validation.message);
  }

  // Create the journal entry
  const entryData: InsertJournalEntry = {
    entryDate: data.entryDate,
    description: data.description,
    referenceType: data.referenceType,
    referenceId: data.referenceId,
    status: 'posted',
    createdBy: data.createdBy,
  };

  const journalEntryId = await createJournalEntry(entryData);

  // Add journal lines
  for (let i = 0; i < data.lines.length; i++) {
    const line = data.lines[i];
    const account = await getAccountByCode(line.accountCode);

    if (!account) {
      throw new Error(`Account code ${line.accountCode} not found`);
    }

    const lineData: InsertJournalLine = {
      journalEntryId: Number(journalEntryId),
      accountId: account.id,
      debitAmount: line.debitAmount ? String(line.debitAmount) : undefined,
      creditAmount: line.creditAmount ? String(line.creditAmount) : undefined,
      lineNumber: i + 1,
    };

    await addJournalLine(lineData);
  }

  return Number(journalEntryId);
}

/**
 * Creates a journal entry for an order sale
 * Debits: Cash/AR, Credits: Revenue
 */
export async function createOrderSaleEntry(
  orderId: number,
  orderDate: Date,
  revenue: number,
  createdBy: number
): Promise<number> {
  const lines: JournalLineData[] = [
    {
      accountCode: '1010', // Cash/Accounts Receivable
      debitAmount: revenue,
    },
    {
      accountCode: '4000', // Sales Revenue
      creditAmount: revenue,
    },
  ];

  return await postJournalEntry({
    entryDate: orderDate,
    description: `Order #${orderId} - Sales Revenue`,
    referenceType: 'order',
    referenceId: orderId,
    lines,
    createdBy,
  });
}

/**
 * Creates a journal entry for product cost of goods sold (COGS)
 * Debits: COGS, Credits: Inventory
 */
export async function createCogsEntry(
  orderId: number,
  orderDate: Date,
  cogsAmount: number,
  createdBy: number
): Promise<number> {
  const lines: JournalLineData[] = [
    {
      accountCode: '5000', // Cost of Goods Sold
      debitAmount: cogsAmount,
    },
    {
      accountCode: '1200', // Inventory
      creditAmount: cogsAmount,
    },
  ];

  return await postJournalEntry({
    entryDate: orderDate,
    description: `Order #${orderId} - Cost of Goods Sold`,
    referenceType: 'order',
    referenceId: orderId,
    lines,
    createdBy,
  });
}

/**
 * Creates a journal entry for operating expenses (shipping, packaging, etc.)
 * Debits: Operating Expenses, Credits: Cash/AP
 */
export async function createOperatingExpenseEntry(
  orderId: number,
  orderDate: Date,
  shippingCost: number,
  packagingCost: number,
  gatewayFee: number,
  createdBy: number
): Promise<number> {
  const totalExpense = shippingCost + packagingCost + gatewayFee;

  const lines: JournalLineData[] = [
    {
      accountCode: '6100', // Shipping Expense
      debitAmount: shippingCost,
    },
    {
      accountCode: '6200', // Packaging Expense
      debitAmount: packagingCost,
    },
    {
      accountCode: '6300', // Payment Processing Fees
      debitAmount: gatewayFee,
    },
    {
      accountCode: '1010', // Cash/Accounts Payable
      creditAmount: totalExpense,
    },
  ];

  return await postJournalEntry({
    entryDate: orderDate,
    description: `Order #${orderId} - Operating Expenses`,
    referenceType: 'order',
    referenceId: orderId,
    lines,
    createdBy,
  });
}

/**
 * Creates a journal entry for marketing/advertising spend
 * Debits: Marketing Expense, Credits: Cash/AP
 */
export async function createMarketingExpenseEntry(
  campaignId: number,
  expenseDate: Date,
  amount: number,
  createdBy: number
): Promise<number> {
  const lines: JournalLineData[] = [
    {
      accountCode: '6400', // Marketing & Advertising
      debitAmount: amount,
    },
    {
      accountCode: '1010', // Cash/Accounts Payable
      creditAmount: amount,
    },
  ];

  return await postJournalEntry({
    entryDate: expenseDate,
    description: `Campaign #${campaignId} - Marketing Expense`,
    referenceType: 'campaign',
    referenceId: campaignId,
    lines,
    createdBy,
  });
}

/**
 * Creates a journal entry for a refund/return
 * Reverses the original sale and COGS entries
 */
export async function createRefundEntry(
  orderId: number,
  refundDate: Date,
  refundAmount: number,
  cogsAmount: number,
  createdBy: number
): Promise<number> {
  const lines: JournalLineData[] = [
    {
      accountCode: '4000', // Sales Revenue (reversed)
      debitAmount: refundAmount,
    },
    {
      accountCode: '1010', // Cash/Accounts Receivable
      creditAmount: refundAmount,
    },
    {
      accountCode: '1200', // Inventory (reversed)
      debitAmount: cogsAmount,
    },
    {
      accountCode: '5000', // Cost of Goods Sold (reversed)
      creditAmount: cogsAmount,
    },
  ];

  return await postJournalEntry({
    entryDate: refundDate,
    description: `Order #${orderId} - Refund/Return`,
    referenceType: 'return',
    referenceId: orderId,
    lines,
    createdBy,
  });
}

/**
 * Standard Chart of Accounts for e-commerce fashion business
 */
export const STANDARD_CHART_OF_ACCOUNTS = [
  // Assets
  { code: '1010', name: 'Cash & Accounts Receivable', type: 'asset', normalBalance: 'debit' },
  { code: '1200', name: 'Inventory', type: 'asset', normalBalance: 'debit' },
  { code: '1300', name: 'Prepaid Expenses', type: 'asset', normalBalance: 'debit' },

  // Liabilities
  { code: '2100', name: 'Accounts Payable', type: 'liability', normalBalance: 'credit' },
  { code: '2200', name: 'Accrued Expenses', type: 'liability', normalBalance: 'credit' },
  { code: '2300', name: 'Refund Liability', type: 'liability', normalBalance: 'credit' },

  // Equity
  { code: '3100', name: 'Owner Capital', type: 'equity', normalBalance: 'credit' },
  { code: '3200', name: 'Retained Earnings', type: 'equity', normalBalance: 'credit' },

  // Revenue
  { code: '4000', name: 'Sales Revenue', type: 'revenue', normalBalance: 'credit' },
  { code: '4100', name: 'Returns & Allowances', type: 'revenue', normalBalance: 'debit' },

  // Expenses
  { code: '5000', name: 'Cost of Goods Sold', type: 'expense', normalBalance: 'debit' },
  { code: '6100', name: 'Shipping Expense', type: 'expense', normalBalance: 'debit' },
  { code: '6200', name: 'Packaging Expense', type: 'expense', normalBalance: 'debit' },
  { code: '6300', name: 'Payment Processing Fees', type: 'expense', normalBalance: 'debit' },
  { code: '6400', name: 'Marketing & Advertising', type: 'expense', normalBalance: 'debit' },
  { code: '6500', name: 'Salaries & Wages', type: 'expense', normalBalance: 'debit' },
  { code: '6600', name: 'Rent & Utilities', type: 'expense', normalBalance: 'debit' },
  { code: '6700', name: 'Influencer Costs', type: 'expense', normalBalance: 'debit' },
  { code: '6800', name: 'Overhead Allocation', type: 'expense', normalBalance: 'debit' },
  { code: '6900', name: 'Miscellaneous Expense', type: 'expense', normalBalance: 'debit' },
];
