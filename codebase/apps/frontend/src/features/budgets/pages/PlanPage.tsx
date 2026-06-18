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

type BudgetPeriod = "monthly" | "yearly" | "custom";

interface BudgetCategory {
  amountMinor: string;
  category: string;
  categoryId: string;
  id: string;
  periodEnd: string;
  periodStart: string;
}

const lessons = [
  "Check whether one category is growing faster than income.",
  "Plan bills before goals so essentials stay covered.",
  "Use goals for direction, not pressure.",
];

function getLocalDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMonthStart(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

function getYearStart(date = new Date()): string {
  return `${date.getFullYear()}-01-01`;
}

function toAmountInput(amountMinor: string): string {
  const minor = BigInt(amountMinor);
  const whole = minor / 100n;
  const fraction = (minor % 100n).toString().padStart(2, "0");
  return `${whole}.${fraction}`;
}

function toDateOnly(value: string): string {
  return value.slice(0, 10);
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

export function PlanPage() {
  const { accessToken, isAuthenticated, workspaces } = useAuth();
  const { preferences } = useGuestPreferences();
  const { transactions } = useGuestTransactions();
  const [section, setSection] = useState("budget");
  const [period, setPeriod] = useState<BudgetPeriod>("monthly");
  const [customFrom, setCustomFrom] = useState(getMonthStart());
  const [customTo, setCustomTo] = useState(getLocalDate());
  const [budgets, setBudgets] = useState<BudgetCategory[]>([]);
  const [editingId, setEditingId] = useState<string | undefined>();
  const [category, setCategory] = useState<ExpenseCategory>(expenseCategories[0]);
  const [amount, setAmount] = useState("");
  const [formError, setFormError] = useState("");
  const [availableCategories, setAvailableCategories] = useState<CategoryResource[]>([]);
  const [isAuthPromptOpen, setIsAuthPromptOpen] = useState(false);
  const [isPeriodDialogOpen, setIsPeriodDialogOpen] = useState(false);
  const [isBudgetDialogOpen, setIsBudgetDialogOpen] = useState(false);
  const [isBudgetSaving, setIsBudgetSaving] = useState(false);
  const workspaceCurrency = workspaces[0]?.reportingCurrency ?? preferences.currency;
  const workspaceId = workspaces[0]?.id ?? null;
  const periodDialogCloseRef = useRef<HTMLButtonElement>(null);
  const budgetDialogCloseRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isPeriodDialogOpen && !isBudgetDialogOpen && !isAuthPromptOpen) return;

    if (isPeriodDialogOpen) {
      periodDialogCloseRef.current?.focus();
    } else {
      budgetDialogCloseRef.current?.focus();
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isAuthPromptOpen, isBudgetDialogOpen, isPeriodDialogOpen]);

  const periodRange = useMemo(() => {
    if (period === "yearly") {
      return { from: getYearStart(), label: "This year", to: getLocalDate() };
    }

    if (period === "custom") {
      return { from: customFrom, label: "Custom period", to: customTo };
    }

    return { from: getMonthStart(), label: "This month", to: getLocalDate() };
  }, [customFrom, customTo, period]);

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
          budgetRecords
            .map((budget) => toBudgetCategory(budget, categoryRecords))
            .filter((budget): budget is BudgetCategory => Boolean(budget)),
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

  const visibleBudgets = useMemo(
    () =>
      budgets.filter(
        (budget) =>
          budget.periodStart <= periodRange.to &&
          budget.periodEnd >= periodRange.from,
      ),
    [budgets, periodRange.from, periodRange.to],
  );

  const budgetTotals = useMemo(() => {
    const totalMinor = visibleBudgets.reduce(
      (total, budget) => total + BigInt(budget.amountMinor),
      0n,
    );
    const spentMinor = transactions
      .filter(
        (transaction) =>
          transaction.type === "expense" &&
          !transaction.deletedAt &&
          transaction.transactionDate >= periodRange.from &&
          transaction.transactionDate <= periodRange.to &&
          visibleBudgets.some((budget) => budget.category === transaction.category),
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
  }, [periodRange.from, periodRange.to, transactions, visibleBudgets]);

  const categoryRows = visibleBudgets.map((budget) => {
    const spentMinor = transactions
      .filter(
        (transaction) =>
          transaction.type === "expense" &&
          !transaction.deletedAt &&
          transaction.category === budget.category &&
          transaction.transactionDate >= periodRange.from &&
          transaction.transactionDate <= periodRange.to,
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

  const money = (amountMinor: bigint) =>
    formatMoney(
      { amountMinor: amountMinor.toString(), currency: workspaceCurrency },
      preferences.locale,
    );
  const goalSavedMinor = budgetTotals.remainingMinor > 0n ? budgetTotals.remainingMinor : 0n;
  const goalTargetMinor =
    budgetTotals.totalMinor > 0n ? budgetTotals.totalMinor : budgetTotals.spentMinor;
  const goalProgress =
    goalTargetMinor === 0n ? 0 : Number((goalSavedMinor * 100n) / goalTargetMinor);
  const goalProgressValue = Math.min(100, goalProgress);

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

    const existing = visibleBudgets.find((budget) => budget.category === category);
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
            periodEnd: periodRange.to,
            periodStart: periodRange.from,
            workspaceId,
          })
        : await createBudget({
            accessToken,
            categoryId: selectedCategory.id,
            currency: workspaceCurrency,
            limitAmountMinor: parsed.amountMinor,
            periodEnd: periodRange.to,
            periodStart: periodRange.from,
            workspaceId,
          });
      const mappedBudget = toBudgetCategory(savedBudget, availableCategories);

      if (mappedBudget) {
        setBudgets((current) => {
          const withoutSaved = current.filter((budget) => budget.id !== mappedBudget.id);
          return [...withoutSaved, mappedBudget];
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

  function updatePeriod(nextPeriod: BudgetPeriod) {
    setPeriod(nextPeriod);
    if (nextPeriod !== "custom") {
      setIsPeriodDialogOpen(false);
    }
  }

  return (
    <main className="page" id="main-content">
      <PageHeader eyebrow="Plan with clarity" title="Plan" />
      <SegmentedControl
        label="Planning section"
        onChange={setSection}
        options={[
          { label: "Budget", value: "budget" },
          { label: "Bills", value: "bills" },
        ]}
        value={section}
      />

      {section === "bills" ? (
        <Card>
          <EmptyState
            description="Bills and due dates will appear here when bill planning is available."
            icon="calendar"
            title="No bills scheduled"
          />
        </Card>
      ) : (
        <>
          <Card className="monthly-card">
            <div className="section-heading">
              <span>
                <p className="eyebrow">Budget total</p>
                <h2>{money(budgetTotals.totalMinor)}</h2>
              </span>
              <span className="budget-summary-actions">
                <button
                  aria-haspopup="dialog"
                  className="budget-period-trigger"
                  onClick={() => setIsPeriodDialogOpen(true)}
                  type="button"
                >
                  <Icon name="calendar" size={17} />
                  {periodRange.label}
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

          {isPeriodDialogOpen ? (
            <div className="modal-backdrop" role="presentation">
              <section
                aria-labelledby="budget-period-title"
                aria-modal="true"
                className="modal-card budget-period-modal"
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setIsPeriodDialogOpen(false);
                  }
                }}
                role="dialog"
              >
                <div className="section-heading">
                  <h2 id="budget-period-title">Budget period</h2>
                  <button
                    aria-label="Close budget period options"
                    className="text-button"
                    onClick={() => setIsPeriodDialogOpen(false)}
                    ref={periodDialogCloseRef}
                    type="button"
                  >
                    Close
                  </button>
                </div>
                <SegmentedControl
                  label="Budget period"
                  onChange={(value) => updatePeriod(value as BudgetPeriod)}
                  options={[
                    { label: "Monthly", value: "monthly" },
                    { label: "Yearly", value: "yearly" },
                    { label: "Custom", value: "custom" },
                  ]}
                  value={period}
                />
                {period === "custom" ? (
                  <div className="budget-custom-period">
                    <label>
                      <span>From</span>
                      <input
                        onChange={(event) => setCustomFrom(event.target.value)}
                        type="date"
                        value={customFrom}
                      />
                    </label>
                    <label>
                      <span>To</span>
                      <input
                        onChange={(event) => setCustomTo(event.target.value)}
                        type="date"
                        value={customTo}
                      />
                    </label>
                    <Button fullWidth onClick={() => setIsPeriodDialogOpen(false)}>
                      Apply custom period
                    </Button>
                  </div>
                ) : null}
              </section>
            </div>
          ) : null}

          <Card>
            <div className="section-heading">
              <h2>Budget categories</h2>
              <button
                aria-label="Add budget category"
                className="icon-button icon-button--flat"
                onClick={openAddBudgetDialog}
                type="button"
              >
                <Icon name="plus" />
              </button>
            </div>
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
                description="Add category limits and the main budget total will update automatically."
                icon="plan"
                title="No budget categories yet"
              />
            )}
          </Card>

          <Card
            aria-labelledby="active-goals-title"
            className="goal-preview-card"
            id="active-goals"
          >
            <div className="home-summary-card__header">
              <h2 id="active-goals-title">Active goals</h2>
            </div>
            <div className="goal-preview">
              <span aria-hidden="true" className="goal-preview__art">
                <span className="goal-preview__tree" />
              </span>
              <div className="goal-preview__body">
                <strong>Savings goal</strong>
                <p>
                  {money(goalSavedMinor)} / {money(goalTargetMinor)}
                </p>
                <div
                  aria-label={`Goal progress: ${goalProgressValue} percent`}
                  aria-valuemax={100}
                  aria-valuemin={0}
                  aria-valuenow={goalProgressValue}
                  className="goal-preview__progress"
                  role="progressbar"
                >
                  <span style={{ width: `${goalProgressValue}%` }} />
                </div>
              </div>
              <span className="goal-preview__percent">{goalProgressValue}%</span>
              <span aria-hidden="true" className="goal-preview__button">
                <Icon name="chevron" size={18} />
              </span>
            </div>
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

      <section aria-labelledby="learning-title">
        <div className="section-heading">
          <h2 id="learning-title">Practical lessons</h2>
        </div>
        <Card className="settings-list">
          {lessons.map((lesson) => (
            <button key={lesson} type="button">
              <span className="icon-tile">
                <Icon name="sparkles" />
              </span>
              <span>
                <strong>{lesson}</strong>
                <small>Short guidance you can use without creating an account</small>
              </span>
            </button>
          ))}
        </Card>
      </section>
      <Card className="privacy-card" subtle>
        <Icon name="shield" />
        <span>
          <h2>Healthy progress only</h2>
          <p>Budgets stay editable and are meant for planning, not pressure.</p>
        </span>
      </Card>
    </main>
  );
}
