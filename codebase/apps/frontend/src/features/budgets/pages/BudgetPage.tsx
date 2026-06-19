import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../../../app/providers/AuthProvider";
import { useGuestPreferences } from "../../../app/providers/GuestPreferencesProvider";
import { useGuestTransactions } from "../../../app/providers/GuestTransactionsProvider";
import {
  createBudget,
  deleteBudget as deleteApiBudget,
  listBudgets,
  listCategories,
  updateBudget,
  type BudgetResource,
  type CategoryResource,
} from "../../../data/api/financeClient";
import { formatMoney, parseMoneyInput } from "../../../domain/money/money";
import { expenseCategories, type ExpenseCategory } from "../../../domain/transactions/transaction";
import { Button } from "../../../shared/components/Button";
import { Card } from "../../../shared/components/Card";
import { EmptyState } from "../../../shared/components/EmptyState";
import { Icon } from "../../../shared/components/Icon";
import { InlineAlert } from "../../../shared/components/InlineAlert";
import { PageHeader } from "../../../shared/components/PageHeader";
import { SegmentedControl } from "../../../shared/components/SegmentedControl";

interface BudgetCategory {
  amountMinor: string;
  category: string;
  categoryId: string;
  id: string;
  periodEnd: string;
  periodStart: string;
}

function toDateValue(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function getMonthRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);

  return {
    from: toDateValue(start),
    to: toDateValue(end),
  };
}

function addMonths(date: Date, offset: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + offset, 1);
}

function toMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function toAmountInput(amountMinor: string): string {
  const minor = BigInt(amountMinor);
  const whole = minor / 100n;
  const fraction = (minor % 100n).toString().padStart(2, "0");
  return `${whole}.${fraction}`;
}

function toDateOnly(value: string): string {
  if (!value.includes("T")) {
    return value.slice(0, 10);
  }

  return toDateValue(new Date(value));
}

function decimalToMinor(amount: string): string {
  const [whole = "0", fraction = ""] = amount.split(".");

  return `${BigInt(whole) * 100n + BigInt(`${fraction}00`.slice(0, 2))}`;
}

function toBudgetCategory(
  budget: BudgetResource,
  categories: CategoryResource[],
): BudgetCategory | null {
  const category = categories.find(
    (item) => item.id === budget.categoryId && item.transactionType === "expense",
  );

  if (!category || !budget.categoryId) {
    return null;
  }

  return {
    amountMinor: decimalToMinor(budget.limitAmount),
    category: category.name,
    categoryId: budget.categoryId,
    id: budget.id,
    periodEnd: toDateOnly(budget.periodEnd),
    periodStart: toDateOnly(budget.periodStart),
  };
}

function getBudgetCategoryKey(budget: BudgetCategory): string {
  return [budget.categoryId, budget.periodStart, budget.periodEnd].join(":");
}

function dedupeBudgetCategories(budgets: BudgetCategory[]): BudgetCategory[] {
  const byCategoryPeriod = new Map<string, BudgetCategory>();

  budgets.forEach((budget) => {
    byCategoryPeriod.set(getBudgetCategoryKey(budget), budget);
  });

  return Array.from(byCategoryPeriod.values());
}

function dedupeByCategory(budgets: BudgetCategory[]): BudgetCategory[] {
  const byCategory = new Map<string, BudgetCategory>();

  budgets.forEach((budget) => {
    if (!byCategory.has(budget.categoryId)) {
      byCategory.set(budget.categoryId, budget);
    }
  });

  return Array.from(byCategory.values());
}

function isBudgetForRange(
  budget: BudgetCategory,
  range: {
    from: string;
    to: string;
  },
): boolean {
  return budget.periodStart === range.from && budget.periodEnd === range.to;
}

export function BudgetPage() {
  const { accessToken, isAuthenticated, workspaces } = useAuth();
  const { preferences } = useGuestPreferences();
  const { transactions } = useGuestTransactions();
  const [section, setSection] = useState("monthly");
  const [selectedMonth, setSelectedMonth] = useState(() => new Date());
  const [budgets, setBudgets] = useState<BudgetCategory[]>([]);
  const [editingId, setEditingId] = useState<string | undefined>();
  const [category, setCategory] = useState<ExpenseCategory>(expenseCategories[0]);
  const [amount, setAmount] = useState("");
  const [formError, setFormError] = useState("");
  const [quickFillError, setQuickFillError] = useState("");
  const [availableCategories, setAvailableCategories] = useState<CategoryResource[]>([]);
  const [isAuthPromptOpen, setIsAuthPromptOpen] = useState(false);
  const [isBudgetDialogOpen, setIsBudgetDialogOpen] = useState(false);
  const [isBudgetSaving, setIsBudgetSaving] = useState(false);
  const [isQuickFillSaving, setIsQuickFillSaving] = useState(false);
  const workspaceCurrency = workspaces[0]?.reportingCurrency ?? preferences.currency;
  const workspaceId = workspaces[0]?.id ?? null;
  const budgetDialogCloseRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isBudgetDialogOpen && !isAuthPromptOpen) return;

    budgetDialogCloseRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isAuthPromptOpen, isBudgetDialogOpen]);

  const monthRange = useMemo(() => getMonthRange(selectedMonth), [selectedMonth]);
  const previousMonthRange = useMemo(
    () => getMonthRange(addMonths(selectedMonth, -1)),
    [selectedMonth],
  );
  const yearlyRange = useMemo(() => {
    const firstMonth = addMonths(selectedMonth, -11);

    return {
      from: getMonthRange(firstMonth).from,
      to: monthRange.to,
    };
  }, [monthRange.to, selectedMonth]);
  const yearlyMonths = useMemo(
    () => Array.from({ length: 12 }, (_, index) => addMonths(selectedMonth, index - 11)),
    [selectedMonth],
  );

  useEffect(() => {
    let isActive = true;

    if (!isAuthenticated || !accessToken || !workspaceId) {
      setBudgets([]);
      setAvailableCategories([]);
      return () => {
        isActive = false;
      };
    }

    Promise.all([
      listBudgets({ accessToken, workspaceId }),
      listCategories({ accessToken, workspaceId }),
    ])
      .then(([budgetRecords, categoryRecords]) => {
        if (!isActive) return;
        setAvailableCategories(categoryRecords);
        setBudgets(
          dedupeBudgetCategories(
            budgetRecords
              .map((budget) => toBudgetCategory(budget, categoryRecords))
              .filter((budget): budget is BudgetCategory => Boolean(budget)),
          ),
        );
      })
      .catch(() => {
        if (!isActive) return;
        setBudgets([]);
        setAvailableCategories([]);
      });

    return () => {
      isActive = false;
    };
  }, [accessToken, isAuthenticated, workspaceId]);

  const monthlyBudgets = useMemo(
    () =>
      dedupeBudgetCategories(
        budgets.filter((budget) => isBudgetForRange(budget, monthRange)),
      ),
    [budgets, monthRange.from, monthRange.to],
  );

  const previousMonthBudgets = useMemo(
    () =>
      dedupeByCategory(
        budgets.filter((budget) => isBudgetForRange(budget, previousMonthRange)),
      ),
    [budgets, previousMonthRange.from, previousMonthRange.to],
  );

  const yearlyBudgets = useMemo(
    () =>
      budgets.filter(
        (budget) =>
          budget.periodStart >= yearlyRange.from &&
          budget.periodEnd <= yearlyRange.to,
      ),
    [budgets, yearlyRange.from, yearlyRange.to],
  );

  const budgetTotals = useMemo(() => {
    const totalMinor = monthlyBudgets.reduce(
      (total, budget) => total + BigInt(budget.amountMinor),
      0n,
    );
    const spentMinor = transactions
      .filter(
        (transaction) =>
          transaction.type === "expense" &&
          !transaction.deletedAt &&
          transaction.transactionDate >= monthRange.from &&
          transaction.transactionDate <= monthRange.to &&
          monthlyBudgets.some((budget) => budget.category === transaction.category),
      )
      .reduce((total, transaction) => total + BigInt(transaction.amountMinor), 0n);
    const remainingMinor = totalMinor - spentMinor;
    const progress = totalMinor === 0n ? 0 : Number((spentMinor * 100n) / totalMinor);

    return {
      progress: Math.min(100, progress),
      remainingMinor,
      spentMinor,
      totalMinor,
    };
  }, [monthRange.from, monthRange.to, transactions, monthlyBudgets]);

  const yearlyTotals = useMemo(() => {
    const totalMinor = yearlyBudgets.reduce(
      (total, budget) => total + BigInt(budget.amountMinor),
      0n,
    );
    const spentMinor = transactions
      .filter(
        (transaction) =>
          transaction.type === "expense" &&
          !transaction.deletedAt &&
          transaction.transactionDate >= yearlyRange.from &&
          transaction.transactionDate <= yearlyRange.to &&
          yearlyBudgets.some((budget) => budget.category === transaction.category),
      )
      .reduce((total, transaction) => total + BigInt(transaction.amountMinor), 0n);
    const remainingMinor = totalMinor - spentMinor;
    const progress = totalMinor === 0n ? 0 : Number((spentMinor * 100n) / totalMinor);
    const monthsCovered = new Set(
      yearlyBudgets.map((budget) => budget.periodStart.slice(0, 7)),
    ).size;

    return {
      monthsCovered,
      progress: Math.min(100, progress),
      remainingMinor,
      spentMinor,
      totalMinor,
    };
  }, [transactions, yearlyBudgets, yearlyRange.from, yearlyRange.to]);

  const categoryRows = monthlyBudgets.map((budget) => {
    const spentMinor = transactions
      .filter(
        (transaction) =>
          transaction.type === "expense" &&
          !transaction.deletedAt &&
          transaction.category === budget.category &&
          transaction.transactionDate >= monthRange.from &&
          transaction.transactionDate <= monthRange.to,
      )
      .reduce((total, transaction) => total + BigInt(transaction.amountMinor), 0n);
    const limitMinor = BigInt(budget.amountMinor);
    const progress = limitMinor === 0n ? 0 : Number((spentMinor * 100n) / limitMinor);

    return {
      ...budget,
      progress: Math.min(100, progress),
      remainingMinor: limitMinor - spentMinor,
      spentMinor,
    };
  });

  const yearlyCategoryRows = useMemo(() => {
    const rows = new Map<
      string,
      {
        category: string;
        spentMinor: bigint;
        totalMinor: bigint;
      }
    >();

    yearlyBudgets.forEach((budget) => {
      const current = rows.get(budget.category) ?? {
        category: budget.category,
        spentMinor: 0n,
        totalMinor: 0n,
      };

      rows.set(budget.category, {
        ...current,
        totalMinor: current.totalMinor + BigInt(budget.amountMinor),
      });
    });

    transactions
      .filter(
        (transaction) =>
          transaction.type === "expense" &&
          !transaction.deletedAt &&
          transaction.transactionDate >= yearlyRange.from &&
          transaction.transactionDate <= yearlyRange.to &&
          yearlyBudgets.some((budget) => budget.category === transaction.category),
      )
      .forEach((transaction) => {
        const current = rows.get(transaction.category) ?? {
          category: transaction.category,
          spentMinor: 0n,
          totalMinor: 0n,
        };

        rows.set(transaction.category, {
          ...current,
          spentMinor: current.spentMinor + BigInt(transaction.amountMinor),
        });
      });

    return Array.from(rows.values())
      .map((row) => ({
        ...row,
        progress:
          row.totalMinor === 0n ? 0 : Math.min(100, Number((row.spentMinor * 100n) / row.totalMinor)),
      }))
      .sort((left, right) => Number(right.totalMinor - left.totalMinor));
  }, [transactions, yearlyBudgets, yearlyRange.from, yearlyRange.to]);

  const yearlyMonthRows = useMemo(
    () =>
      yearlyMonths.map((date) => {
        const range = getMonthRange(date);
        const monthBudgets = budgets.filter((budget) => isBudgetForRange(budget, range));
        const totalMinor = monthBudgets.reduce(
          (total, budget) => total + BigInt(budget.amountMinor),
          0n,
        );
        const spentMinor = transactions
          .filter(
            (transaction) =>
              transaction.type === "expense" &&
              !transaction.deletedAt &&
              transaction.transactionDate >= range.from &&
              transaction.transactionDate <= range.to &&
              monthBudgets.some((budget) => budget.category === transaction.category),
          )
          .reduce((total, transaction) => total + BigInt(transaction.amountMinor), 0n);
        const progress = totalMinor === 0n ? 0 : Number((spentMinor * 100n) / totalMinor);

        return {
          label: new Intl.DateTimeFormat(preferences.locale, {
            month: "short",
            year: "numeric",
          }).format(date),
          monthKey: toMonthKey(date),
          progress: Math.min(100, progress),
          remainingMinor: totalMinor - spentMinor,
          spentMinor,
          totalMinor,
        };
      }),
    [budgets, preferences.locale, transactions, yearlyMonths],
  );

  const money = (amountMinor: bigint) =>
    formatMoney(
      { amountMinor: amountMinor.toString(), currency: workspaceCurrency },
      preferences.locale,
    );
  const isMonthlyBudgetMissing = isAuthenticated && monthlyBudgets.length === 0;
  const canQuickFill =
    isAuthenticated && previousMonthBudgets.length > 0 && monthlyBudgets.length === 0;
  const selectedMonthLabel = new Intl.DateTimeFormat(preferences.locale, {
    month: "long",
    year: "numeric",
  }).format(selectedMonth);

  function resetForm() {
    setEditingId(undefined);
    setCategory(expenseCategories[0]);
    setAmount("");
    setFormError("");
  }

  function openAddBudgetDialog() {
    if (!isAuthenticated) {
      setIsAuthPromptOpen(true);
      return;
    }

    resetForm();
    setIsBudgetDialogOpen(true);
  }

  function updateSection(nextSection: string) {
    setSection(nextSection);
  }

  function closeBudgetDialog() {
    setIsBudgetDialogOpen(false);
    resetForm();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isAuthenticated) {
      setIsBudgetDialogOpen(false);
      setIsAuthPromptOpen(true);
      return;
    }

    if (!accessToken || !workspaceId) {
      setFormError("Your account workspace is still loading. Try again.");
      return;
    }

    const parsed = parseMoneyInput(amount, workspaceCurrency);

    if (!parsed) {
      setFormError("Enter a budget amount greater than zero.");
      return;
    }

    const selectedCategory = availableCategories.find(
      (item) => item.name === category && item.transactionType === "expense" && !item.isArchived,
    );

    if (!selectedCategory) {
      setFormError("This budget category is not available for your workspace.");
      return;
    }

    const existing = monthlyBudgets.find((budget) => budget.category === category);
    const budgetId = editingId ?? existing?.id;

    setIsBudgetSaving(true);
    setFormError("");

    try {
      const savedBudget = budgetId
        ? await updateBudget({
            accessToken,
            budgetId,
            categoryId: selectedCategory.id,
            currency: workspaceCurrency,
            limitAmountMinor: parsed.amountMinor,
            periodEnd: monthRange.to,
            periodStart: monthRange.from,
            workspaceId,
          })
        : await createBudget({
            accessToken,
            categoryId: selectedCategory.id,
            currency: workspaceCurrency,
            limitAmountMinor: parsed.amountMinor,
            periodEnd: monthRange.to,
            periodStart: monthRange.from,
            workspaceId,
          });
      const mappedBudget = toBudgetCategory(savedBudget, availableCategories);

      if (mappedBudget) {
        setBudgets((current) => {
          const withoutSaved = current.filter((budget) => budget.id !== mappedBudget.id);
          return dedupeBudgetCategories([...withoutSaved, mappedBudget]);
        });
      }

      resetForm();
      setIsBudgetDialogOpen(false);
    } catch {
      setFormError("Budget category was not saved. Try again.");
    } finally {
      setIsBudgetSaving(false);
    }
  }

  function editBudget(budget: BudgetCategory) {
    if (!isAuthenticated) {
      setIsAuthPromptOpen(true);
      return;
    }

    setEditingId(budget.id);
    setCategory(budget.category as ExpenseCategory);
    setAmount(toAmountInput(budget.amountMinor));
    setFormError("");
    setIsBudgetDialogOpen(true);
  }

  async function deleteBudget(budgetId: string) {
    if (!isAuthenticated) {
      setIsAuthPromptOpen(true);
      return;
    }

    if (!accessToken || !workspaceId) {
      return;
    }

    try {
      await deleteApiBudget({ accessToken, budgetId, workspaceId });
      setBudgets((current) => current.filter((budget) => budget.id !== budgetId));
      if (editingId === budgetId) {
        resetForm();
      }
    } catch {
      setFormError("Budget category was not deleted. Try again.");
    }
  }

  async function quickFillFromPreviousMonth() {
    if (!isAuthenticated) {
      setIsAuthPromptOpen(true);
      return;
    }

    if (!accessToken || !workspaceId || !canQuickFill) {
      return;
    }

    setIsQuickFillSaving(true);
    setQuickFillError("");

    try {
      const copiedBudgets = await Promise.all(
        previousMonthBudgets.map((budget) =>
          createBudget({
            accessToken,
            categoryId: budget.categoryId,
            currency: workspaceCurrency,
            limitAmountMinor: budget.amountMinor,
            periodEnd: monthRange.to,
            periodStart: monthRange.from,
            workspaceId,
          }),
        ),
      );
      const mappedBudgets = copiedBudgets
        .map((budget) => toBudgetCategory(budget, availableCategories))
        .filter((budget): budget is BudgetCategory => Boolean(budget));

      setBudgets((current) => dedupeBudgetCategories([...current, ...mappedBudgets]));
    } catch {
      setQuickFillError("Previous month budget could not be copied. Try again.");
    } finally {
      setIsQuickFillSaving(false);
    }
  }

  const yearlyAverageSpentMinor =
    yearlyMonthRows.length === 0
      ? 0n
      : yearlyMonthRows.reduce((total, row) => total + row.spentMinor, 0n) /
        BigInt(yearlyMonthRows.length);
  const yearlyAverageRemainingMinor =
    yearlyMonthRows.length === 0
      ? 0n
      : yearlyMonthRows.reduce((total, row) => total + row.remainingMinor, 0n) /
        BigInt(yearlyMonthRows.length);
  const projectedYearlySavingsMinor = yearlyAverageRemainingMinor * 12n;

  return (
    <main className="page" id="main-content">
      <PageHeader eyebrow="Budget with clarity" title="Budget" />
      <SegmentedControl
        label="Budget section"
        onChange={updateSection}
        options={[
          { label: "Monthly", value: "monthly" },
          { label: "Yearly", value: "yearly" },
        ]}
        value={section}
      />

      {section === "yearly" ? (
        <>
          <Card className="monthly-card">
            <div className="section-heading">
              <span>
                <p className="eyebrow">Yearly budget summary</p>
                <h2>{money(yearlyTotals.totalMinor)}</h2>
                <small>{yearlyTotals.monthsCovered} of 12 monthly plans entered</small>
              </span>
              <strong className="percentage">{yearlyTotals.progress}%</strong>
            </div>
            <div
              aria-label={`Yearly budget usage: ${yearlyTotals.progress} percent`}
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={yearlyTotals.progress}
              className="progress-bar"
              role="progressbar"
            >
              <span style={{ width: `${yearlyTotals.progress}%` }} />
            </div>
            <dl className="monthly-card__totals">
              <div>
                <dt>Actual spending</dt>
                <dd>{money(yearlyTotals.spentMinor)}</dd>
              </div>
              <div>
                <dt>Remaining</dt>
                <dd>{money(yearlyTotals.remainingMinor)}</dd>
              </div>
            </dl>
          </Card>

          <Card>
            <div className="section-heading">
              <span>
                <p className="eyebrow">Budget vs actual</p>
                <h2>Last 12 months</h2>
              </span>
            </div>
            <div className="yearly-insight-grid">
              <div>
                <span className="icon-tile">
                  <Icon name="chart" />
                </span>
                <strong>{money(yearlyAverageSpentMinor)}</strong>
                <small>Average monthly spending</small>
              </div>
              <div>
                <span className="icon-tile">
                  <Icon name="income" />
                </span>
                <strong>{money(projectedYearlySavingsMinor)}</strong>
                <small>Projected yearly savings</small>
              </div>
            </div>
          </Card>

          <Card>
            <div className="section-heading">
              <span>
                <h2>Month-wise breakdown</h2>
                <small>Derived from monthly budgets</small>
              </span>
            </div>
            <div className="yearly-breakdown-list">
              {yearlyMonthRows.map((row) => (
                <section aria-label={`${row.label} budget`} key={row.monthKey}>
                  <div className="budget-category-list__header">
                    <span>
                      <strong>{row.label}</strong>
                      <small>
                        {money(row.spentMinor)} spent of {money(row.totalMinor)}
                      </small>
                    </span>
                    <span>{row.progress}%</span>
                  </div>
                  <div
                    aria-label={`${row.label} budget usage: ${row.progress} percent`}
                    aria-valuemax={100}
                    aria-valuemin={0}
                    aria-valuenow={row.progress}
                    className="progress-bar progress-bar--compact"
                    role="progressbar"
                  >
                    <span style={{ width: `${row.progress}%` }} />
                  </div>
                </section>
              ))}
            </div>
          </Card>

          <Card>
            <div className="section-heading">
              <span>
                <h2>Category analysis</h2>
                <small>Budget and actual spending by category</small>
              </span>
            </div>
            {yearlyCategoryRows.length > 0 ? (
              <div className="budget-category-list">
                {yearlyCategoryRows.map((row) => (
                  <section aria-label={`${row.category} yearly budget`} key={row.category}>
                    <div className="budget-category-list__header">
                      <span>
                        <strong>{row.category}</strong>
                        <small>
                          {money(row.spentMinor)} spent of {money(row.totalMinor)}
                        </small>
                      </span>
                      <span>{row.progress}%</span>
                    </div>
                    <div
                      aria-label={`${row.category} yearly usage: ${row.progress} percent`}
                      aria-valuemax={100}
                      aria-valuemin={0}
                      aria-valuenow={row.progress}
                      className="progress-bar progress-bar--compact"
                      role="progressbar"
                    >
                      <span style={{ width: `${row.progress}%` }} />
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <EmptyState
                description="Add monthly budget categories to unlock yearly category analysis."
                icon="chart"
                title="No yearly category data"
              />
            )}
          </Card>

        </>
      ) : (
        <>
          {isMonthlyBudgetMissing ? (
            <InlineAlert title="Monthly budget required">
              <span className="inline-alert__content">
                Add a budget for {selectedMonthLabel} before continuing monthly budgeting.
                {previousMonthBudgets.length > 0 ? (
                  <button
                    className="text-button"
                    disabled={!canQuickFill || isQuickFillSaving}
                    onClick={() => void quickFillFromPreviousMonth()}
                    type="button"
                  >
                    {isQuickFillSaving ? "Copying" : "Copy previous month"}
                  </button>
                ) : null}
              </span>
            </InlineAlert>
          ) : null}

          <Card className="monthly-card">
            <div className="section-heading">
              <span>
                <p className="eyebrow">Monthly budget plan</p>
                <h2>{money(budgetTotals.totalMinor)}</h2>
              </span>
              <span className="month-navigator">
                <button
                  aria-label="Previous month"
                  className="icon-button icon-button--flat month-navigator__previous"
                  onClick={() => setSelectedMonth((current) => addMonths(current, -1))}
                  type="button"
                >
                  <Icon name="chevron" size={17} />
                </button>
                <strong className="month-navigator__label">{selectedMonthLabel}</strong>
                <button
                  aria-label="Next month"
                  className="icon-button icon-button--flat"
                  onClick={() => setSelectedMonth((current) => addMonths(current, 1))}
                  type="button"
                >
                  <Icon name="chevron" size={17} />
                </button>
                <strong className="percentage">{budgetTotals.progress}%</strong>
              </span>
            </div>
            <div
              aria-label={`Budget usage: ${budgetTotals.progress} percent`}
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={budgetTotals.progress}
              className="progress-bar"
              role="progressbar"
            >
              <span style={{ width: `${budgetTotals.progress}%` }} />
            </div>
            <dl className="monthly-card__totals">
              <div>
                <dt>Spent</dt>
                <dd>{money(budgetTotals.spentMinor)}</dd>
              </div>
              <div>
                <dt>Remaining</dt>
                <dd>{money(budgetTotals.remainingMinor)}</dd>
              </div>
            </dl>
          </Card>

          <Card>
            <div className="section-heading">
              <span>
                <h2>{selectedMonthLabel} categories</h2>
                <small>{monthlyBudgets.length} categories planned</small>
              </span>
              <span className="budget-category-toolbar">
                <button
                  aria-label="Add budget category"
                  className="icon-button icon-button--flat"
                  onClick={openAddBudgetDialog}
                  type="button"
                >
                  <Icon name="plus" />
                </button>
              </span>
            </div>
            {quickFillError ? (
              <InlineAlert title={quickFillError}>
                Add categories manually if copying fails.
              </InlineAlert>
            ) : null}
            {categoryRows.length > 0 ? (
              <div className="budget-category-list">
                {categoryRows.map((budget) => (
                  <section aria-label={`${budget.category} budget`} key={budget.id}>
                    <div className="budget-category-list__header">
                      <span>
                        <strong>{budget.category}</strong>
                        <small>
                          {money(budget.spentMinor)} spent of {money(BigInt(budget.amountMinor))}
                        </small>
                      </span>
                      <span>{budget.progress}%</span>
                    </div>
                    <div
                      aria-label={`${budget.category} usage: ${budget.progress} percent`}
                      aria-valuemax={100}
                      aria-valuemin={0}
                      aria-valuenow={budget.progress}
                      className="progress-bar progress-bar--compact"
                      role="progressbar"
                    >
                      <span style={{ width: `${budget.progress}%` }} />
                    </div>
                    <div className="budget-category-list__actions">
                      <button
                        aria-label={`Edit ${budget.category} budget`}
                        className="icon-button icon-button--flat"
                        onClick={() => editBudget(budget)}
                        type="button"
                      >
                        <Icon name="edit" size={18} />
                      </button>
                      <button
                        aria-label={`Delete ${budget.category} budget`}
                        className="icon-button icon-button--flat icon-button--danger"
                        onClick={() => deleteBudget(budget.id)}
                        type="button"
                      >
                        <Icon name="delete" size={18} />
                      </button>
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <EmptyState
                description={
                  previousMonthBudgets.length > 0
                    ? "Copy the previous month or add category limits to continue."
                    : "Add category limits to create this monthly budget plan."
                }
                icon="plan"
                title="No monthly budget yet"
              />
            )}
          </Card>

          {isAuthPromptOpen ? (
            <div className="modal-backdrop" role="presentation">
              <section
                aria-labelledby="budget-auth-required-title"
                aria-modal="true"
                className="modal-card auth-required-card"
                role="dialog"
              >
                <Icon name="lock" size={28} />
                <h2 id="budget-auth-required-title">Sign in to save budget changes</h2>
                <p>
                  Guest mode is read-only. Log in or create an account to add, edit, or delete
                  budget categories.
                </p>
                <div className="confirmation-actions">
                  <Link className="button button--primary" to="/login">
                    Log in
                  </Link>
                  <Link className="button button--secondary" to="/signup">
                    Sign up
                  </Link>
                </div>
                <button
                  className="text-button"
                  onClick={() => setIsAuthPromptOpen(false)}
                  type="button"
                >
                  Continue reading as guest
                </button>
              </section>
            </div>
          ) : null}

          {isBudgetDialogOpen ? (
            <div className="modal-backdrop" role="presentation">
              <section
                aria-labelledby="budget-category-dialog-title"
                aria-modal="true"
                className="modal-card"
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    closeBudgetDialog();
                  }
                }}
                role="dialog"
              >
                <div className="section-heading">
                  <h2 id="budget-category-dialog-title">
                    {editingId ? "Edit budget category" : "Add budget category"}
                  </h2>
                  <button
                    aria-label="Close budget category form"
                    className="text-button"
                    onClick={closeBudgetDialog}
                    ref={budgetDialogCloseRef}
                    type="button"
                  >
                    Close
                  </button>
                </div>
                <form className="budget-category-form" onSubmit={(event) => void handleSubmit(event)}>
                  <label>
                    <span>Category</span>
                    <select
                      onChange={(event) => setCategory(event.target.value as ExpenseCategory)}
                      value={category}
                    >
                      {expenseCategories.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Amount</span>
                    <input
                      inputMode="decimal"
                      onChange={(event) => setAmount(event.target.value)}
                      placeholder="0"
                      value={amount}
                    />
                  </label>
                  {formError ? (
                    <InlineAlert title={formError}>Use numbers like 500 or 500.00.</InlineAlert>
                  ) : null}
                  <Button disabled={isBudgetSaving} fullWidth type="submit">
                    {isBudgetSaving
                      ? "Saving budget category"
                      : editingId
                        ? "Save budget category"
                        : "Add budget category"}
                  </Button>
                </form>
              </section>
            </div>
          ) : null}
        </>
      )}

    </main>
  );
}
