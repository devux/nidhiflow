import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";

import { useGuestPreferences } from "../../../app/providers/GuestPreferencesProvider";
import { useGuestTransactions } from "../../../app/providers/GuestTransactionsProvider";
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
  id: string;
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

export function PlanPage() {
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
  const [isPeriodDialogOpen, setIsPeriodDialogOpen] = useState(false);
  const [isBudgetDialogOpen, setIsBudgetDialogOpen] = useState(false);
  const periodDialogCloseRef = useRef<HTMLButtonElement>(null);
  const budgetDialogCloseRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isPeriodDialogOpen && !isBudgetDialogOpen) return;

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
  }, [isBudgetDialogOpen, isPeriodDialogOpen]);

  const periodRange = useMemo(() => {
    if (period === "yearly") {
      return { from: getYearStart(), label: "This year", to: getLocalDate() };
    }

    if (period === "custom") {
      return { from: customFrom, label: "Custom period", to: customTo };
    }

    return { from: getMonthStart(), label: "This month", to: getLocalDate() };
  }, [customFrom, customTo, period]);

  const budgetTotals = useMemo(() => {
    const totalMinor = budgets.reduce((total, budget) => total + BigInt(budget.amountMinor), 0n);
    const spentMinor = transactions
      .filter(
        (transaction) =>
          transaction.type === "expense" &&
          !transaction.deletedAt &&
          transaction.transactionDate >= periodRange.from &&
          transaction.transactionDate <= periodRange.to &&
          budgets.some((budget) => budget.category === transaction.category),
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
  }, [budgets, periodRange.from, periodRange.to, transactions]);

  const categoryRows = budgets.map((budget) => {
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
    formatMoney({ amountMinor: amountMinor.toString(), currency: preferences.currency }, preferences.locale);

  function resetForm() {
    setEditingId(undefined);
    setCategory(expenseCategories[0]);
    setAmount("");
    setFormError("");
  }

  function openAddBudgetDialog() {
    resetForm();
    setIsBudgetDialogOpen(true);
  }

  function closeBudgetDialog() {
    setIsBudgetDialogOpen(false);
    resetForm();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = parseMoneyInput(amount, preferences.currency);

    if (!parsed) {
      setFormError("Enter a budget amount greater than zero.");
      return;
    }

    setBudgets((current) => {
      if (editingId) {
        return current.map((budget) =>
          budget.id === editingId
            ? { ...budget, amountMinor: parsed.amountMinor, category }
            : budget,
        );
      }

      const existing = current.find((budget) => budget.category === category);
      if (existing) {
        return current.map((budget) =>
          budget.id === existing.id ? { ...budget, amountMinor: parsed.amountMinor } : budget,
        );
      }

      return [
        ...current,
        {
          amountMinor: parsed.amountMinor,
          category,
          id: globalThis.crypto?.randomUUID?.() ?? `budget-${Date.now()}`,
        },
      ];
    });
    resetForm();
    setIsBudgetDialogOpen(false);
  }

  function editBudget(budget: BudgetCategory) {
    setEditingId(budget.id);
    setCategory(budget.category as ExpenseCategory);
    setAmount(toAmountInput(budget.amountMinor));
    setFormError("");
    setIsBudgetDialogOpen(true);
  }

  function deleteBudget(budgetId: string) {
    setBudgets((current) => current.filter((budget) => budget.id !== budgetId));
    if (editingId === budgetId) {
      resetForm();
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
                <form className="budget-category-form" onSubmit={handleSubmit}>
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
                  <Button fullWidth type="submit">
                    {editingId ? "Save budget category" : "Add budget category"}
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
