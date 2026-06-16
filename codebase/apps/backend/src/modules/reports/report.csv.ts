import type {
  ReportAccountBreakdownRow,
  ReportCashFlowRow,
  ReportCategoryBreakdownRow,
  ReportSummaryTotals,
} from "./report.repository.js";

function escapeCsvField(value: string) {
  if (!/[",\n]/.test(value)) {
    return value;
  }

  return `"${value.replaceAll('"', '""')}"`;
}

function buildCsv(headers: string[], rows: Array<Array<string | number | null>>) {
  return [
    headers.map(escapeCsvField).join(","),
    ...rows.map((row) => row.map((value) => escapeCsvField(String(value ?? ""))).join(",")),
  ].join("\n");
}

export function buildSummaryCsv({
  accounts,
  categories,
  currency,
  period,
  totals,
}: {
  accounts: ReportAccountBreakdownRow[];
  categories: ReportCategoryBreakdownRow[];
  currency: string;
  period: string;
  totals: ReportSummaryTotals;
}) {
  const rows = [
    ["metadata", "period", period],
    ["metadata", "currency", currency],
    ["totals", "incomeMinor", totals.incomeMinor],
    ["totals", "expenseMinor", totals.expenseMinor],
    ["totals", "transferMinor", totals.transferMinor],
    ["totals", "netSavingsMinor", totals.netSavingsMinor],
    ["totals", "transactionCount", totals.transactionCount],
    ...categories.map((category) => ["category", category.categoryName, category.amountMinor]),
    ...accounts.map((account) => ["account", account.accountName, account.amountMinor]),
  ];

  return buildCsv(["section", "label", "value"], rows);
}

export function buildCategoriesCsv({
  accounts,
  categories,
  currency,
  period,
}: {
  accounts: ReportAccountBreakdownRow[];
  categories: ReportCategoryBreakdownRow[];
  currency: string;
  period: string;
}) {
  const rows = [
    ["metadata", "period", period, ""],
    ["metadata", "currency", currency, ""],
    ...categories.map((category) => [
      "category",
      category.categoryName,
      category.amountMinor,
      category.transactionCount,
    ]),
    ...accounts.map((account) => [
      "account",
      account.accountName,
      account.amountMinor,
      account.transactionCount,
    ]),
  ];

  return buildCsv(["section", "label", "amountMinor", "transactionCount"], rows);
}

export function buildCashFlowCsv({
  currency,
  period,
  points,
}: {
  currency: string;
  period: string;
  points: ReportCashFlowRow[];
}) {
  const rows = [
    ["metadata", "period", period, "", "", ""],
    ["metadata", "currency", currency, "", "", ""],
    ...points.map((point) => [
      "point",
      point.date,
      point.incomeMinor,
      point.expenseMinor,
      point.transferMinor,
      point.netMinor,
      point.transactionCount,
    ]),
  ];

  return buildCsv(
    [
      "section",
      "label",
      "incomeMinor",
      "expenseMinor",
      "transferMinor",
      "netMinor",
      "transactionCount",
    ],
    rows,
  );
}
