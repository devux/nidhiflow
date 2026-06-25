import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { useGuestPreferences } from "../../../app/providers/GuestPreferencesProvider";
import { useGuestTransactions } from "../../../app/providers/GuestTransactionsProvider";
import { expenseCategories, incomeCategories } from "../../../domain/transactions/transaction";
import { Card } from "../../../shared/components/Card";
import { EmptyState } from "../../../shared/components/EmptyState";
import { PageHeader } from "../../../shared/components/PageHeader";
import { TransactionRow } from "../../transactions/components/TransactionRow";

type FilterSheet = "category" | "date";
type DatePreset = "this-month" | "last-month" | "this-year";

const datePresetOptions: Array<{ label: string; value: DatePreset }> = [
  { label: "This month", value: "this-month" },
  { label: "Last month", value: "last-month" },
  { label: "This year", value: "this-year" },
];

function toIsoDate(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function getDatePresetRange(preset: DatePreset): { from: string; to: string } {
  const now = new Date();

  if (preset === "this-year") {
    return {
      from: `${now.getFullYear()}-01-01`,
      to: `${now.getFullYear()}-12-31`,
    };
  }

  const monthOffset = preset === "last-month" ? -1 : 0;
  const start = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + monthOffset + 1, 0);

  return { from: toIsoDate(start), to: toIsoDate(end) };
}

function getDatePresetFromRange(dateFrom: string, dateTo: string): DatePreset | "" {
  return (
    datePresetOptions.find((option) => {
      const range = getDatePresetRange(option.value);
      return range.from === dateFrom && range.to === dateTo;
    })?.value ?? ""
  );
}

export function ActivityPage() {
  const { preferences } = useGuestPreferences();
  const { transactions } = useGuestTransactions();
  const [searchParams, setSearchParams] = useSearchParams();
  const category = searchParams.get("category") ?? "";
  const dateFrom = searchParams.get("from") ?? "";
  const dateTo = searchParams.get("to") ?? "";
  const selectedDatePreset = getDatePresetFromRange(dateFrom, dateTo);
  const [openFilterSheet, setOpenFilterSheet] = useState<FilterSheet | null>(null);
  const [draftCategory, setDraftCategory] = useState(category);
  const [draftDatePreset, setDraftDatePreset] = useState<DatePreset | "">(selectedDatePreset);

  const filteredTransactions = useMemo(
    () =>
      transactions.filter((transaction) => {
        if (category && transaction.category !== category) return false;
        if (dateFrom && transaction.transactionDate < dateFrom) return false;
        if (dateTo && transaction.transactionDate > dateTo) return false;
        return true;
      }),
    [category, dateFrom, dateTo, transactions],
  );

  const categories = Array.from(new Set([...incomeCategories, ...expenseCategories]));

  const dateFilterLabel =
    datePresetOptions.find((option) => option.value === selectedDatePreset)?.label ?? "Date";
  const categoryFilterLabel = category || "Category";

  function openSheet(sheet: FilterSheet) {
    setDraftCategory(category);
    setDraftDatePreset(selectedDatePreset);
    setOpenFilterSheet(sheet);
  }

  function applyFilterSheet() {
    const next = new URLSearchParams(searchParams);

    if (openFilterSheet === "category") {
      if (draftCategory) next.set("category", draftCategory);
      else next.delete("category");
    }

    if (openFilterSheet === "date") {
      if (draftDatePreset) {
        const range = getDatePresetRange(draftDatePreset);
        next.set("from", range.from);
        next.set("to", range.to);
      } else {
        next.delete("from");
        next.delete("to");
      }
    }

    setSearchParams(next, { replace: true });
    setOpenFilterSheet(null);
  }

  function clearFilterSheet() {
    const next = new URLSearchParams(searchParams);

    if (openFilterSheet === "category") {
      next.delete("category");
      setDraftCategory("");
    }

    if (openFilterSheet === "date") {
      next.delete("from");
      next.delete("to");
      setDraftDatePreset("");
    }

    setSearchParams(next, { replace: true });
    setOpenFilterSheet(null);
  }

  const filtersActive = Boolean(category || dateFrom || dateTo);

  return (
    <main className="page page--activity" id="main-content">
      <PageHeader title="Activity" />

      <Stack className="filter-dropdown-grid activity-filter-bar" direction="row" spacing={1.5}>
        <Button
          aria-haspopup="dialog"
          aria-label={`Filter by category, current value ${categoryFilterLabel}`}
          className={category ? "filter-dropdown is-active" : "filter-dropdown"}
          endIcon={<KeyboardArrowDownRoundedIcon />}
          fullWidth
          onClick={() => openSheet("category")}
          variant={category ? "contained" : "outlined"}
        >
          {categoryFilterLabel}
        </Button>
        <Button
          aria-haspopup="dialog"
          aria-label={`Filter by date, current value ${dateFilterLabel}`}
          className={selectedDatePreset ? "filter-dropdown is-active" : "filter-dropdown"}
          endIcon={<KeyboardArrowDownRoundedIcon />}
          fullWidth
          onClick={() => openSheet("date")}
          variant={selectedDatePreset ? "contained" : "outlined"}
        >
          {dateFilterLabel}
        </Button>
      </Stack>

      <Drawer
        anchor="bottom"
        aria-labelledby="activity-filter-sheet-title"
        onClose={() => setOpenFilterSheet(null)}
        open={Boolean(openFilterSheet)}
        slotProps={{ paper: { className: "activity-filter-sheet" } }}
      >
        <Box className="activity-filter-sheet__content" role="dialog">
          <Typography component="h2" id="activity-filter-sheet-title">
            {openFilterSheet === "category" ? "Category" : "Date"}
          </Typography>
          {openFilterSheet === "category" ? (
            <List disablePadding className="activity-filter-options">
              <ListItemButton
                className="activity-filter-option"
                onClick={() => setDraftCategory("")}
                selected={!draftCategory}
              >
                <ListItemText primary="All categories" />
                <Checkbox checked={!draftCategory} edge="end" tabIndex={-1} />
              </ListItemButton>
              {categories.map((option) => (
                <ListItemButton
                  className="activity-filter-option"
                  key={option}
                  onClick={() => setDraftCategory(option)}
                  selected={draftCategory === option}
                >
                  <ListItemText primary={option} />
                  <Checkbox checked={draftCategory === option} edge="end" tabIndex={-1} />
                </ListItemButton>
              ))}
            </List>
          ) : (
            <List disablePadding className="activity-filter-options">
              {datePresetOptions.map((option) => (
                <ListItemButton
                  className="activity-filter-option"
                  key={option.value}
                  onClick={() => setDraftDatePreset(option.value)}
                  selected={draftDatePreset === option.value}
                >
                  <ListItemText primary={option.label} />
                  <Checkbox checked={draftDatePreset === option.value} edge="end" tabIndex={-1} />
                </ListItemButton>
              ))}
            </List>
          )}
          <Stack className="activity-filter-sheet__actions" direction="row" spacing={1.5}>
            <Button fullWidth onClick={clearFilterSheet} variant="outlined">
              Clear all
            </Button>
            <Button fullWidth onClick={applyFilterSheet} variant="contained">
              Apply
            </Button>
          </Stack>
        </Box>
      </Drawer>

      {filteredTransactions.length > 0 ? (
        <Card className="transaction-list activity-transaction-list">
          <List className="transaction-history-list" disablePadding>
            {filteredTransactions.map((transaction) => (
              <TransactionRow
                key={transaction.id}
                locale={preferences.locale}
                transaction={transaction}
              />
            ))}
          </List>
        </Card>
      ) : (
        <Card>
          <EmptyState
            action={
              filtersActive ? (
                <button
                  className="button button--secondary"
                  onClick={() => setSearchParams({}, { replace: true })}
                  type="button"
                >
                  Show all activity
                </button>
              ) : (
                <Link
                  className="button button--secondary"
                  to="/transactions/new?type=expense"
                >
                  Add a transaction
                </Link>
              )
            }
            description={
              filtersActive
                ? "Try changing or clearing your search and filters."
                : "Add income or an expense to begin your local history."
            }
            icon="activity"
            title={filtersActive ? "No matching transactions" : "No activity yet"}
          />
        </Card>
      )}
    </main>
  );
}
