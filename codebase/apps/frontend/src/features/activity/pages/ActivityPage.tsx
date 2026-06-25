import List from "@mui/material/List";
import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { useGuestPreferences } from "../../../app/providers/GuestPreferencesProvider";
import { useGuestTransactions } from "../../../app/providers/GuestTransactionsProvider";
import { expenseCategories, incomeCategories } from "../../../domain/transactions/transaction";
import { Card } from "../../../shared/components/Card";
import { EmptyState } from "../../../shared/components/EmptyState";
import { Icon } from "../../../shared/components/Icon";
import { PageHeader } from "../../../shared/components/PageHeader";
import { SegmentedControl } from "../../../shared/components/SegmentedControl";
import { TransactionRow } from "../../transactions/components/TransactionRow";

function toDateKey(date: string): string {
  return /^\d{4}-\d{2}-\d{2}/.test(date) ? date.slice(0, 10) : "unknown";
}

function formatDateHeading(date: string, locale: string, timezone: string): string {
  const dateKey = toDateKey(date);

  if (dateKey === "unknown") return "Unknown date";

  const today = new Date();
  const todayKey = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = [
    yesterday.getFullYear(),
    String(yesterday.getMonth() + 1).padStart(2, "0"),
    String(yesterday.getDate()).padStart(2, "0"),
  ].join("-");

  if (dateKey === todayKey) return "Today";
  if (dateKey === yesterdayKey) return "Yesterday";

  const parsed = new Date(`${dateKey}T12:00:00Z`);

  if (Number.isNaN(parsed.getTime())) return "Unknown date";

  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    timeZone: timezone,
    year: "numeric",
  }).format(parsed);
}

export function ActivityPage() {
  const { preferences } = useGuestPreferences();
  const { transactions } = useGuestTransactions();
  const [searchParams, setSearchParams] = useSearchParams();
  const typeParam = searchParams.get("type");
  const selectedType = typeParam === "income" || typeParam === "expense" ? typeParam : "all";
  const query = searchParams.get("query") ?? "";
  const category = searchParams.get("category") ?? "";
  const dateFrom = searchParams.get("from") ?? "";
  const dateTo = searchParams.get("to") ?? "";

  const filteredTransactions = useMemo(
    () =>
      transactions.filter((transaction) => {
        if (selectedType !== "all" && transaction.type !== selectedType) return false;
        if (category && transaction.category !== category) return false;
        if (dateFrom && transaction.transactionDate < dateFrom) return false;
        if (dateTo && transaction.transactionDate > dateTo) return false;
        if (
          query &&
          !`${transaction.category} ${transaction.note}`
            .toLocaleLowerCase()
            .includes(query.toLocaleLowerCase())
        )
          return false;
        return true;
      }),
    [category, dateFrom, dateTo, query, selectedType, transactions],
  );

  const groups = useMemo(() => {
    const grouped = new Map<string, typeof filteredTransactions>();
    for (const transaction of filteredTransactions) {
      const dateKey = toDateKey(transaction.transactionDate);
      const group = grouped.get(dateKey) ?? [];
      group.push(transaction);
      grouped.set(dateKey, group);
    }
    return Array.from(grouped.entries());
  }, [filteredTransactions]);

  const categories =
    selectedType === "income"
      ? incomeCategories
      : selectedType === "expense"
        ? expenseCategories
        : [...incomeCategories, ...expenseCategories];

  function setFilter(name: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(name, value);
    else next.delete(name);
    if (name === "type") next.delete("category");
    setSearchParams(next, { replace: true });
  }

  const filtersActive = Boolean(query || category || dateFrom || dateTo);
  const newTransactionType = selectedType === "income" ? "income" : "expense";

  return (
    <main className="page" id="main-content">
      <PageHeader
        action={
          <Link
            aria-label="Add transaction"
            className="icon-button"
            to={`/transactions/new?type=${newTransactionType}`}
          >
            <Icon name="plus" />
          </Link>
        }
        title="Activity"
      />
      <SegmentedControl
        label="Transaction type"
        onChange={(value) => setFilter("type", value === "all" ? "" : value)}
        options={[
          { label: "All", value: "all" },
          { label: "Income", value: "income" },
          { label: "Expense", value: "expense" },
        ]}
        value={selectedType}
      />

      <Card className="activity-filters">
        <label className="search-field" htmlFor="activity-search">
          <Icon name="search" size={20} />
          <span className="sr-only">Search transactions</span>
          <input
            id="activity-search"
            onChange={(event) => setFilter("query", event.target.value)}
            placeholder="Search category or note"
            type="search"
            value={query}
          />
        </label>
        <div className="filter-grid">
          <label>
            <span>Category</span>
            <select
              onChange={(event) => setFilter("category", event.target.value)}
              value={category}
            >
              <option value="">All categories</option>
              {categories.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>From</span>
            <input
              onChange={(event) => setFilter("from", event.target.value)}
              type="date"
              value={dateFrom}
            />
          </label>
          <label>
            <span>To</span>
            <input
              onChange={(event) => setFilter("to", event.target.value)}
              type="date"
              value={dateTo}
            />
          </label>
        </div>
        {filtersActive ? (
          <button
            className="text-button"
            onClick={() => {
              const next = new URLSearchParams();
              if (selectedType !== "all") next.set("type", selectedType);
              setSearchParams(next, { replace: true });
            }}
            type="button"
          >
            Clear filters
          </button>
        ) : null}
      </Card>

      {groups.length > 0 ? (
        <div className="activity-groups">
          {groups.map(([date, records]) => (
            <section aria-labelledby={`activity-${date}`} key={date}>
              <h2 id={`activity-${date}`}>
                {formatDateHeading(date, preferences.locale, preferences.timezone)}
              </h2>
              <Card className="transaction-list">
                <List disablePadding>
                  {records.map((transaction) => (
                    <TransactionRow
                      key={transaction.id}
                      locale={preferences.locale}
                      transaction={transaction}
                    />
                  ))}
                </List>
              </Card>
            </section>
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState
            action={
              filtersActive || selectedType !== "all" ? (
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
                  to={`/transactions/new?type=${newTransactionType}`}
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
