import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";

import { useAuth } from "../../../app/providers/AuthProvider";
import { useGuestPreferences } from "../../../app/providers/GuestPreferencesProvider";
import { useGuestTransactions } from "../../../app/providers/GuestTransactionsProvider";
import { formatMoney } from "../../../domain/money/money";
import type { SupportedCurrency } from "../../../domain/preferences/guestPreferences";
import { Card } from "../../../shared/components/Card";
import { EmptyState } from "../../../shared/components/EmptyState";
import { Icon } from "../../../shared/components/Icon";
import { PageHeader } from "../../../shared/components/PageHeader";
import { SegmentedControl } from "../../../shared/components/SegmentedControl";

type ReportPeriod = "custom" | "lastMonth" | "month" | "year";

function toDateValue(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function getPeriodRange(period: ReportPeriod, customFrom: string, customTo: string) {
  const today = new Date();

  if (period === "custom") {
    return {
      from: customFrom,
      label: "Custom range",
      to: customTo,
    };
  }

  if (period === "lastMonth") {
    const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const end = new Date(today.getFullYear(), today.getMonth(), 0);

    return {
      from: toDateValue(start),
      label: "Last month",
      to: toDateValue(end),
    };
  }

  if (period === "year") {
    return {
      from: toDateValue(new Date(today.getFullYear(), 0, 1)),
      label: "This year",
      to: toDateValue(new Date(today.getFullYear(), 11, 31)),
    };
  }

  return {
    from: toDateValue(new Date(today.getFullYear(), today.getMonth(), 1)),
    label: "This month",
    to: toDateValue(new Date(today.getFullYear(), today.getMonth() + 1, 0)),
  };
}

export function ReportsPage() {
  const { workspaces } = useAuth();
  const { preferences } = useGuestPreferences();
  const { transactions } = useGuestTransactions();
  const [searchParams, setSearchParams] = useSearchParams();
  const periodParam = searchParams.get("period");
  const period: ReportPeriod =
    periodParam === "lastMonth" || periodParam === "year" || periodParam === "custom"
      ? periodParam
      : "month";
  const customFrom = searchParams.get("from") ?? "";
  const customTo = searchParams.get("to") ?? "";
  const reportingCurrency =
    (workspaces[0]?.reportingCurrency as SupportedCurrency | undefined) ?? preferences.currency;
  const range = getPeriodRange(period, customFrom, customTo);

  const reportTransactions = useMemo(
    () =>
      transactions.filter((transaction) => {
        if (transaction.deletedAt) return false;
        if (range.from && transaction.transactionDate < range.from) return false;
        if (range.to && transaction.transactionDate > range.to) return false;
        return true;
      }),
    [range.from, range.to, transactions],
  );

  const totals = useMemo(() => {
    let incomeMinor = 0n;
    let expenseMinor = 0n;

    reportTransactions.forEach((transaction) => {
      if (transaction.type === "income") incomeMinor += BigInt(transaction.amountMinor);
      else expenseMinor += BigInt(transaction.amountMinor);
    });

    return {
      expenseMinor,
      incomeMinor,
      savingsMinor: incomeMinor - expenseMinor,
    };
  }, [reportTransactions]);

  const categoryRows = useMemo(() => {
    const rows = new Map<string, bigint>();

    reportTransactions
      .filter((transaction) => transaction.type === "expense")
      .forEach((transaction) => {
        rows.set(
          transaction.category,
          (rows.get(transaction.category) ?? 0n) + BigInt(transaction.amountMinor),
        );
      });

    return Array.from(rows.entries())
      .map(([category, amountMinor]) => ({
        amountMinor,
        category,
        percent:
          totals.expenseMinor === 0n ? 0 : Number((amountMinor * 100n) / totals.expenseMinor),
      }))
      .sort((left, right) => Number(right.amountMinor - left.amountMinor));
  }, [reportTransactions, totals.expenseMinor]);

  const money = (amountMinor: bigint) =>
    formatMoney(
      { amountMinor: amountMinor.toString(), currency: reportingCurrency },
      preferences.locale,
    );

  function setPeriod(nextPeriod: string) {
    const next = new URLSearchParams(searchParams);
    next.set("period", nextPeriod);
    if (nextPeriod !== "custom") {
      next.delete("from");
      next.delete("to");
    }
    setSearchParams(next, { replace: true });
  }

  function setCustomDate(name: "from" | "to", value: string) {
    const next = new URLSearchParams(searchParams);
    next.set("period", "custom");
    if (value) next.set(name, value);
    else next.delete(name);
    setSearchParams(next, { replace: true });
  }

  return (
    <main className="page" id="main-content">
      <PageHeader eyebrow="Money story" title="Reports" />
      <SegmentedControl
        label="Report period"
        onChange={setPeriod}
        options={[
          { label: "This Month", value: "month" },
          { label: "Last Month", value: "lastMonth" },
          { label: "This Year", value: "year" },
          { label: "Custom", value: "custom" },
        ]}
        value={period}
      />

      {period === "custom" ? (
        <Card className="report-custom-range">
          <label>
            <span>From</span>
            <input
              onChange={(event) => setCustomDate("from", event.target.value)}
              type="date"
              value={customFrom}
            />
          </label>
          <label>
            <span>To</span>
            <input
              onChange={(event) => setCustomDate("to", event.target.value)}
              type="date"
              value={customTo}
            />
          </label>
        </Card>
      ) : null}

      <Card className="monthly-card">
        <div className="section-heading">
          <span>
            <p className="eyebrow">Summary</p>
            <h2>{money(totals.savingsMinor)}</h2>
            <small>{range.label}</small>
          </span>
          <span className="icon-tile">
            <Icon name="report" />
          </span>
        </div>
        <dl className="monthly-card__totals">
          <div>
            <dt>Income</dt>
            <dd>{money(totals.incomeMinor)}</dd>
          </div>
          <div>
            <dt>Expense</dt>
            <dd>{money(totals.expenseMinor)}</dd>
          </div>
          <div>
            <dt>Net savings</dt>
            <dd>{money(totals.savingsMinor)}</dd>
          </div>
        </dl>
      </Card>

      <Card>
        <div className="section-heading">
          <span>
            <h2>Expense categories</h2>
            <small>Share of spending in this period</small>
          </span>
        </div>
        {categoryRows.length > 0 ? (
          <div className="budget-category-list">
            {categoryRows.map((row) => (
              <section aria-label={`${row.category} report`} key={row.category}>
                <div className="budget-category-list__header">
                  <span>
                    <strong>{row.category}</strong>
                    <small>{money(row.amountMinor)}</small>
                  </span>
                  <span>{row.percent}%</span>
                </div>
                <div
                  aria-label={`${row.category}: ${row.percent} percent of expenses`}
                  aria-valuemax={100}
                  aria-valuemin={0}
                  aria-valuenow={row.percent}
                  className="progress-bar progress-bar--compact"
                  role="progressbar"
                >
                  <span style={{ width: `${row.percent}%` }} />
                </div>
              </section>
            ))}
          </div>
        ) : (
          <EmptyState
            description="Expense categories will appear after spending is recorded for this period."
            icon="chart"
            title="No expense data"
          />
        )}
      </Card>
    </main>
  );
}
