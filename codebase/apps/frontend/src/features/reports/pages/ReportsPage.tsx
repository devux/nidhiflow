import { useEffect, useMemo, useRef } from "react";
import Chart from "chart.js/auto";
import { useSearchParams } from "react-router-dom";

import { useAuth } from "../../../app/providers/AuthProvider";
import { useGuestPreferences } from "../../../app/providers/GuestPreferencesProvider";
import { useGuestTransactions } from "../../../app/providers/GuestTransactionsProvider";
import { formatMoney } from "../../../domain/money/money";
import type { SupportedCurrency } from "../../../domain/preferences/guestPreferences";
import { Card } from "../../../shared/components/Card";
import { EmptyState } from "../../../shared/components/EmptyState";
import { PageHeader } from "../../../shared/components/PageHeader";
import { SegmentedControl } from "../../../shared/components/SegmentedControl";

type ReportPeriod = "custom" | "month" | "year";

const categoryColors = ["#4ade80", "#fbbf24", "#8b5cf6", "#c4ccd6", "#22d3ee", "#fb7185"];

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
  const chartCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const expenseChartRef = useRef<Chart | null>(null);
  const { workspaces } = useAuth();
  const { preferences } = useGuestPreferences();
  const { transactions } = useGuestTransactions();
  const [searchParams, setSearchParams] = useSearchParams();
  const periodParam = searchParams.get("period");
  const period: ReportPeriod =
    periodParam === "year" || periodParam === "custom" ? periodParam : "month";
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
        chartValue:
          totals.expenseMinor === 0n
            ? 0
            : Number((amountMinor * 10000n) / totals.expenseMinor) / 100,
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

  useEffect(() => {
    expenseChartRef.current?.destroy();
    expenseChartRef.current = null;

    const chartCanvas = chartCanvasRef.current;

    if (!chartCanvas || categoryRows.length === 0 || totals.expenseMinor === 0n) {
      return undefined;
    }

    expenseChartRef.current = new Chart(chartCanvas, {
      data: {
        datasets: [
          {
            backgroundColor: categoryRows.map(
              (_, index) => categoryColors[index % categoryColors.length],
            ),
            borderWidth: 0,
            data: categoryRows.map((row) => row.chartValue),
            hoverOffset: 6,
            spacing: 2,
          },
        ],
        labels: categoryRows.map((row) => row.category),
      },
      options: {
        animation: {
          animateRotate: true,
          animateScale: true,
          duration: 900,
          easing: "easeOutQuart",
        },
        cutout: "62%",
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const row = categoryRows[context.dataIndex];
                return row ? `${row.category}: ${money(row.amountMinor)}` : "";
              },
            },
          },
        },
        responsive: true,
      },
      type: "doughnut",
    });

    return () => {
      expenseChartRef.current?.destroy();
      expenseChartRef.current = null;
    };
  }, [categoryRows, preferences.locale, reportingCurrency, totals.expenseMinor]);

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
      <PageHeader title="Reports" />
      <SegmentedControl
        label="Report period"
        onChange={setPeriod}
        options={[
          { label: "This Month", value: "month" },
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

      <Card className="expense-overview-card">
        <div className="expense-overview-card__header">
          <span>
            <h2>Expense Overview</h2>
            <small>Total Expense</small>
            <strong>{money(totals.expenseMinor)}</strong>
          </span>
          <span className="expense-overview-card__period">{range.label}</span>
        </div>
        {categoryRows.length > 0 ? (
          <div className="expense-overview-card__content">
            <div
              aria-label={`Expense category chart for ${range.label}`}
              className="expense-donut-chart"
              role="img"
            >
              <canvas ref={chartCanvasRef} />
              <span>
                <small>Total</small>
                <strong>{money(totals.expenseMinor)}</strong>
              </span>
            </div>
            <div className="expense-overview-legend">
              {categoryRows.map((row, index) => (
                <div className="expense-overview-legend__row" key={row.category}>
                  <span
                    aria-hidden="true"
                    className="expense-overview-legend__dot"
                    style={{ backgroundColor: categoryColors[index % categoryColors.length] }}
                  />
                  <strong>{row.category}</strong>
                  <span>{money(row.amountMinor)}</span>
                </div>
              ))}
            </div>
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
