import Chart from "chart.js/auto";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import Box from "@mui/material/Box";
import MuiButton from "@mui/material/Button";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Radio from "@mui/material/Radio";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { useAuth } from "../../../app/providers/AuthProvider";
import { useGuestPreferences } from "../../../app/providers/GuestPreferencesProvider";
import { useGuestTransactions } from "../../../app/providers/GuestTransactionsProvider";
import { formatMoney } from "../../../domain/money/money";
import { Card } from "../../../shared/components/Card";
import { EmptyState } from "../../../shared/components/EmptyState";
import { Icon } from "../../../shared/components/Icon";
import { PageHeader } from "../../../shared/components/PageHeader";

type ReportDatePreset = "last-month" | "last-year" | "this-month";
type ReportFilterSheet = "custom" | "date";
type ReportPeriod = "custom" | ReportDatePreset;

const categoryColors = ["#4ade80", "#fbbf24", "#8b5cf6", "#c4ccd6", "#22d3ee", "#fb7185"];
const reportDateOptions: Array<{ label: string; value: ReportDatePreset }> = [
  { label: "This month", value: "this-month" },
  { label: "Last month", value: "last-month" },
  { label: "Last year", value: "last-year" },
];

function toDateValue(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function toUtcDateValue(date: Date): string {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function fromDateValue(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);

  return new Date(Date.UTC(year, month - 1, day));
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function getPreviousPeriodRange(from: string, to: string) {
  const currentFrom = fromDateValue(from);
  const currentTo = fromDateValue(to);
  const durationDays = Math.max(
    1,
    Math.round((currentTo.getTime() - currentFrom.getTime()) / 86_400_000) + 1,
  );
  const previousTo = addUtcDays(currentFrom, -1);
  const previousFrom = addUtcDays(previousTo, -(durationDays - 1));

  return {
    from: toUtcDateValue(previousFrom),
    to: toUtcDateValue(previousTo),
  };
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

  if (period === "last-year") {
    const previousYear = today.getFullYear() - 1;

    return {
      from: toDateValue(new Date(previousYear, 0, 1)),
      label: "Last year",
      to: toDateValue(new Date(previousYear, 11, 31)),
    };
  }

  if (period === "last-month") {
    return {
      from: toDateValue(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
      label: "Last month",
      to: toDateValue(new Date(today.getFullYear(), today.getMonth(), 0)),
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
  const spendingTrendCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const spendingTrendChartRef = useRef<Chart | null>(null);
  const { activeWorkspace } = useAuth();
  const { preferences } = useGuestPreferences();
  const { transactions } = useGuestTransactions();
  const [searchParams, setSearchParams] = useSearchParams();
  const periodParam = searchParams.get("period");
  const customFrom = searchParams.get("from") ?? "";
  const customTo = searchParams.get("to") ?? "";
  const requestedPeriod: ReportPeriod =
    periodParam === "custom"
      ? "custom"
      : periodParam === "last-month"
        ? "last-month"
        : periodParam === "last-year" || periodParam === "year"
          ? "last-year"
          : "this-month";
  const period: ReportPeriod =
    requestedPeriod === "custom" && (!customFrom || !customTo) ? "this-month" : requestedPeriod;
  const [openFilterSheet, setOpenFilterSheet] = useState<ReportFilterSheet | null>(null);
  const [activeFilterSheet, setActiveFilterSheet] = useState<ReportFilterSheet>("date");
  const [draftDatePreset, setDraftDatePreset] = useState<ReportDatePreset>(
    period === "custom" ? "this-month" : period,
  );
  const [draftCustomFrom, setDraftCustomFrom] = useState(customFrom);
  const [draftCustomTo, setDraftCustomTo] = useState(customTo);
  const [customRangeError, setCustomRangeError] = useState("");
  const [showAllCategories, setShowAllCategories] = useState(false);
  const reportingCurrency = activeWorkspace?.reportingCurrency ?? preferences.currency;
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

  const spendingTrendRows = useMemo(() => {
    if (!range.from || !range.to) {
      return [];
    }

    const start = fromDateValue(range.from);
    const end = fromDateValue(range.to);
    const dayCount = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
    const useMonthlyBuckets = dayCount > 93;
    const amounts = new Map<string, bigint>();

    reportTransactions
      .filter((transaction) => transaction.type === "expense")
      .forEach((transaction) => {
        const key = useMonthlyBuckets
          ? transaction.transactionDate.slice(0, 7)
          : transaction.transactionDate.slice(0, 10);
        amounts.set(key, (amounts.get(key) ?? 0n) + BigInt(transaction.amountMinor));
      });

    if (useMonthlyBuckets) {
      const rows: Array<{ amountMinor: bigint; key: string; label: string }> = [];
      const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));

      while (cursor <= end) {
        const key = `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}`;
        rows.push({
          amountMinor: amounts.get(key) ?? 0n,
          key,
          label: new Intl.DateTimeFormat(preferences.locale, {
            month: "short",
            timeZone: "UTC",
          }).format(cursor),
        });
        cursor.setUTCMonth(cursor.getUTCMonth() + 1);
      }

      return rows;
    }

    const rows: Array<{ amountMinor: bigint; key: string; label: string }> = [];

    for (let cursor = start; cursor <= end; cursor = addUtcDays(cursor, 1)) {
      const key = toUtcDateValue(cursor);
      rows.push({
        amountMinor: amounts.get(key) ?? 0n,
        key,
        label: new Intl.DateTimeFormat(preferences.locale, {
          day: "numeric",
          month: "short",
          timeZone: "UTC",
        }).format(cursor),
      });
    }

    return rows;
  }, [preferences.locale, range.from, range.to, reportTransactions]);

  const previousPeriodExpenseMinor = useMemo(() => {
    if (!range.from || !range.to) {
      return 0n;
    }

    const previousRange = getPreviousPeriodRange(range.from, range.to);

    return transactions
      .filter(
        (transaction) =>
          !transaction.deletedAt &&
          transaction.type === "expense" &&
          transaction.transactionDate >= previousRange.from &&
          transaction.transactionDate <= previousRange.to,
      )
      .reduce((total, transaction) => total + BigInt(transaction.amountMinor), 0n);
  }, [range.from, range.to, transactions]);

  const spendingChangePercent =
    previousPeriodExpenseMinor === 0n
      ? null
      : Number(
          ((totals.expenseMinor - previousPeriodExpenseMinor) * 100n) / previousPeriodExpenseMinor,
        );
  const comparisonLabel =
    period === "this-month" || period === "last-month" ? "vs previous month" : "vs previous period";
  const visibleCategoryRows = showAllCategories ? categoryRows : categoryRows.slice(0, 4);

  const money = useCallback(
    (amountMinor: bigint) =>
      formatMoney(
        { amountMinor: amountMinor.toString(), currency: reportingCurrency },
        preferences.locale,
      ),
    [preferences.locale, reportingCurrency],
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
  }, [categoryRows, money, preferences.locale, reportingCurrency, totals.expenseMinor]);

  useEffect(() => {
    spendingTrendChartRef.current?.destroy();
    spendingTrendChartRef.current = null;

    const canvas = spendingTrendCanvasRef.current;

    if (!canvas || spendingTrendRows.length === 0) {
      return undefined;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return undefined;
    }

    const fill = context.createLinearGradient(0, 0, 0, 220);
    fill.addColorStop(0, "rgb(34 197 94 / 32%)");
    fill.addColorStop(1, "rgb(34 197 94 / 2%)");

    spendingTrendChartRef.current = new Chart(context, {
      data: {
        datasets: [
          {
            backgroundColor: fill,
            borderColor: "#16a34a",
            borderWidth: 2,
            data: spendingTrendRows.map((row) => Number(row.amountMinor)),
            fill: true,
            pointBackgroundColor: "#15803d",
            pointHoverRadius: 5,
            pointRadius: spendingTrendRows.length <= 31 ? 2 : 0,
            tension: 0.35,
          },
        ],
        labels: spendingTrendRows.map((row) => row.label),
      },
      options: {
        animation: {
          duration: 700,
        },
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            callbacks: {
              label: (context) => money(BigInt(Math.round(context.parsed.y ?? 0))),
            },
          },
        },
        responsive: true,
        scales: {
          x: {
            grid: {
              display: false,
            },
            ticks: {
              autoSkip: true,
              maxTicksLimit: 6,
            },
          },
          y: {
            beginAtZero: true,
            grid: {
              color: "rgb(148 163 184 / 18%)",
            },
            ticks: {
              callback: (value) => money(BigInt(Math.round(Number(value)))),
              maxTicksLimit: 5,
            },
          },
        },
      },
      type: "line",
    });

    return () => {
      spendingTrendChartRef.current?.destroy();
      spendingTrendChartRef.current = null;
    };
  }, [money, spendingTrendRows]);

  function applyPeriod(nextPeriod: ReportPeriod, from = "", to = "") {
    const next = new URLSearchParams(searchParams);
    next.set("period", nextPeriod);
    if (nextPeriod === "custom") {
      next.set("from", from);
      next.set("to", to);
    } else {
      next.delete("from");
      next.delete("to");
    }
    setSearchParams(next, { replace: true });
  }

  function openSheet(sheet: ReportFilterSheet) {
    if (sheet === "date" && period !== "custom") {
      setDraftDatePreset(period);
    }

    if (sheet === "custom") {
      setDraftCustomFrom(customFrom);
      setDraftCustomTo(customTo);
      setCustomRangeError("");
    }

    setActiveFilterSheet(sheet);
    setOpenFilterSheet(sheet);
  }

  function applyFilterSheet() {
    if (openFilterSheet === "date") {
      applyPeriod(draftDatePreset);
      setOpenFilterSheet(null);
      return;
    }

    if (openFilterSheet === "custom") {
      if (!draftCustomFrom || !draftCustomTo) {
        setCustomRangeError("Select both start and end dates.");
        return;
      }

      if (draftCustomFrom > draftCustomTo) {
        setCustomRangeError("End date must be on or after the start date.");
        return;
      }

      applyPeriod("custom", draftCustomFrom, draftCustomTo);
      setCustomRangeError("");
      setOpenFilterSheet(null);
    }
  }

  function clearFilterSheet() {
    setDraftDatePreset("this-month");
    setDraftCustomFrom("");
    setDraftCustomTo("");
    setCustomRangeError("");
    applyPeriod("this-month");
    setOpenFilterSheet(null);
  }

  return (
    <main className="page" id="main-content">
      <PageHeader title="Reports" />
      <Stack
        className="filter-dropdown-grid activity-filter-bar report-filter-bar"
        direction="row"
        spacing={1.5}
      >
        <MuiButton
          aria-haspopup="dialog"
          aria-label={`Date filter, current value ${period === "custom" ? "Custom range" : range.label}`}
          className={period !== "custom" ? "filter-dropdown is-active" : "filter-dropdown"}
          endIcon={<KeyboardArrowDownRoundedIcon />}
          fullWidth
          onClick={() => openSheet("date")}
          variant={period !== "custom" ? "contained" : "outlined"}
        >
          Date
        </MuiButton>
        <MuiButton
          aria-haspopup="dialog"
          aria-label="Custom date range"
          className={period === "custom" ? "filter-dropdown is-active" : "filter-dropdown"}
          endIcon={<KeyboardArrowDownRoundedIcon />}
          fullWidth
          onClick={() => openSheet("custom")}
          variant={period === "custom" ? "contained" : "outlined"}
        >
          Custom
        </MuiButton>
      </Stack>

      <Drawer
        anchor="bottom"
        onClose={() => setOpenFilterSheet(null)}
        open={Boolean(openFilterSheet)}
        slotProps={{
          paper: {
            "aria-labelledby": "report-filter-sheet-title",
            className: "activity-filter-sheet",
          },
        }}
      >
        <Box className="activity-filter-sheet__content">
          <Typography component="h2" id="report-filter-sheet-title">
            {activeFilterSheet === "custom" ? "Custom dates" : "Date"}
          </Typography>
          {activeFilterSheet === "date" ? (
            <List disablePadding className="activity-filter-options">
              {reportDateOptions.map((option) => (
                <ListItemButton
                  className="activity-filter-option"
                  key={option.value}
                  onClick={() => setDraftDatePreset(option.value)}
                  selected={draftDatePreset === option.value}
                >
                  <ListItemText primary={option.label} />
                  <Radio checked={draftDatePreset === option.value} edge="end" tabIndex={-1} />
                </ListItemButton>
              ))}
            </List>
          ) : (
            <Box className="report-custom-sheet">
              <TextField
                fullWidth
                label="From"
                onChange={(event) => {
                  setDraftCustomFrom(event.target.value);
                  setCustomRangeError("");
                }}
                slotProps={{ inputLabel: { shrink: true } }}
                type="date"
                value={draftCustomFrom}
              />
              <TextField
                fullWidth
                label="To"
                onChange={(event) => {
                  setDraftCustomTo(event.target.value);
                  setCustomRangeError("");
                }}
                slotProps={{ inputLabel: { shrink: true } }}
                type="date"
                value={draftCustomTo}
              />
              {customRangeError ? (
                <Typography className="report-custom-sheet__error" role="alert">
                  {customRangeError}
                </Typography>
              ) : null}
            </Box>
          )}
          <Stack className="activity-filter-sheet__actions" direction="row" spacing={1.5}>
            <MuiButton fullWidth onClick={clearFilterSheet} variant="outlined">
              Clear
            </MuiButton>
            <MuiButton fullWidth onClick={applyFilterSheet} variant="contained">
              Apply
            </MuiButton>
          </Stack>
        </Box>
      </Drawer>

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

      <Card className="spending-trend-card">
        <div className="report-card-heading">
          <h2>Spending Trend</h2>
          <span>{range.label}</span>
        </div>
        <div
          aria-label={`Spending trend chart for ${range.label}`}
          className="spending-trend-chart"
          role="img"
        >
          <canvas ref={spendingTrendCanvasRef} />
        </div>
        <div className="spending-trend-summary">
          <span>
            <small>Total spend</small>
            <strong>{money(totals.expenseMinor)}</strong>
          </span>
          <span>
            <small>{comparisonLabel}</small>
            {spendingChangePercent === null ? (
              <strong className="spending-trend-summary__neutral">No prior spending</strong>
            ) : (
              <strong
                className={
                  spendingChangePercent > 0
                    ? "spending-trend-summary__increase"
                    : "spending-trend-summary__decrease"
                }
              >
                <Icon
                  className={spendingChangePercent > 0 ? "" : "is-decrease"}
                  name="arrow"
                  size={15}
                />
                {Math.abs(spendingChangePercent)}%
              </strong>
            )}
          </span>
        </div>
      </Card>

      <Card className="report-top-categories">
        <div className="report-card-heading">
          <h2>Top Categories</h2>
          {categoryRows.length > 4 ? (
            <button
              className="text-button report-top-categories__toggle"
              onClick={() => setShowAllCategories((current) => !current)}
              type="button"
            >
              {showAllCategories ? "Show less" : "View all"}
            </button>
          ) : null}
        </div>
        {visibleCategoryRows.length > 0 ? (
          <div className="report-top-categories__list">
            {visibleCategoryRows.map((row, index) => (
              <div className="report-top-category-row" key={row.category}>
                <span
                  aria-hidden="true"
                  className="report-top-category-row__icon"
                  style={{
                    backgroundColor: `${categoryColors[index % categoryColors.length]}24`,
                    color: categoryColors[index % categoryColors.length],
                  }}
                >
                  {row.category.slice(0, 1).toUpperCase()}
                </span>
                <strong>{row.category}</strong>
                <span className="report-top-category-row__bar" aria-hidden="true">
                  <span
                    style={{
                      backgroundColor: categoryColors[index % categoryColors.length],
                      width: `${Math.max(2, row.percent)}%`,
                    }}
                  />
                </span>
                <span className="report-top-category-row__amount">{money(row.amountMinor)}</span>
                <small>{row.percent}%</small>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            description="Categories will appear after spending is recorded for this period."
            icon="chart"
            title="No categories yet"
          />
        )}
      </Card>
    </main>
  );
}
