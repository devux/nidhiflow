import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";

import { useGuestPreferences } from "../../../app/providers/GuestPreferencesProvider";
import { useGuestTransactions } from "../../../app/providers/GuestTransactionsProvider";
import { formatMoney } from "../../../domain/money/money";
import {
  expenseCategories,
  incomeCategories,
  type GuestTransaction,
  type TransactionType,
} from "../../../domain/transactions/transaction";
import { Button } from "../../../shared/components/Button";
import { Card } from "../../../shared/components/Card";
import { Icon } from "../../../shared/components/Icon";
import { InlineAlert } from "../../../shared/components/InlineAlert";
import {
  validateTransactionForm,
  type TransactionFormErrors,
  type TransactionFormValues,
} from "../schemas/transactionFormSchema";

function getLocalDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toAmountInput(transaction: GuestTransaction): string {
  const minor = BigInt(transaction.amountMinor);
  const whole = minor / 100n;
  const fraction = (minor % 100n).toString().padStart(2, "0");
  return `${whole}.${fraction}`;
}

export function TransactionFormPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { preferences } = useGuestPreferences();
  const { createTransaction, removeTransaction, transactions, updateTransaction } =
    useGuestTransactions();
  const existing = useMemo(
    () => transactions.find((transaction) => transaction.id === id),
    [id, transactions],
  );
  const requestedType = searchParams.get("type");
  const initialType: TransactionType =
    existing?.type ?? (requestedType === "income" ? "income" : "expense");
  const [values, setValues] = useState<TransactionFormValues>(() => ({
    amount: existing ? toAmountInput(existing) : "",
    category: existing?.category ?? "",
    note: existing?.note ?? "",
    transactionDate: existing?.transactionDate ?? getLocalDate(),
    type: initialType,
  }));
  const [errors, setErrors] = useState<TransactionFormErrors>({});
  const [saveError, setSaveError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    amountRef.current?.focus();
  }, []);

  if (id && !existing) {
    return (
      <main className="page focused-page" id="main-content">
        <Card>
          <h1>Transaction not found</h1>
          <p>It may have already been removed from this device.</p>
          <Link className="button button--secondary" to="/activity">
            Return to Activity
          </Link>
        </Card>
      </main>
    );
  }

  const categories = values.type === "income" ? incomeCategories : expenseCategories;
  const title = existing ? `Edit ${values.type}` : `Add ${values.type}`;

  function updateValue<Field extends keyof TransactionFormValues>(
    field: Field,
    value: TransactionFormValues[Field],
  ) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateTransactionForm(values, preferences.currency);

    if (!validation.input) {
      setErrors(validation.errors);
      const firstError = Object.keys(validation.errors)[0] as
        | keyof TransactionFormErrors
        | undefined;
      document.getElementById(`transaction-${firstError ?? "amount"}`)?.focus();
      return;
    }

    setIsSaving(true);
    setSaveError(false);

    try {
      if (existing) {
        await updateTransaction(existing.id, validation.input);
      } else {
        await createTransaction(validation.input);
      }
      void navigate("/activity", { replace: true });
    } catch {
      setSaveError(true);
      setIsSaving(false);
    }
  }

  async function handleRemove() {
    if (!existing) return;
    setIsSaving(true);
    setSaveError(false);

    try {
      await removeTransaction(existing.id);
      void navigate("/activity", { replace: true });
    } catch {
      setSaveError(true);
      setIsSaving(false);
    }
  }

  return (
    <main className="page focused-page" id="main-content">
      <header className="focused-header">
        <Link aria-label="Cancel and return to Activity" className="icon-button" to="/activity">
          <Icon name="back" />
        </Link>
        <span>
          <p className="eyebrow">Stored on this device</p>
          <h1>{title}</h1>
        </span>
      </header>

      {saveError ? (
        <InlineAlert title="Transaction was not saved">
          Check local storage access and try again. Your entered values are still here.
        </InlineAlert>
      ) : null}

      <form className="transaction-form" noValidate onSubmit={(event) => void handleSubmit(event)}>
        {!existing ? (
          <fieldset>
            <legend>Transaction type</legend>
            <div className="type-choice">
              {(["expense", "income"] as const).map((type) => (
                <button
                  aria-pressed={values.type === type}
                  className={values.type === type ? "is-selected" : ""}
                  key={type}
                  onClick={() => {
                    setValues((current) => ({ ...current, category: "", type }));
                    setErrors({});
                  }}
                  type="button"
                >
                  <Icon name={type} />
                  {type === "income" ? "Income" : "Expense"}
                </button>
              ))}
            </div>
          </fieldset>
        ) : null}

        <Card className="amount-card">
          <label htmlFor="transaction-amount">Amount</label>
          <div className="amount-input">
            <span>{preferences.currency}</span>
            <input
              aria-describedby={errors.amount ? "transaction-amount-error" : undefined}
              aria-invalid={Boolean(errors.amount)}
              autoComplete="off"
              id="transaction-amount"
              inputMode="decimal"
              onChange={(event) => updateValue("amount", event.target.value)}
              placeholder="0.00"
              ref={amountRef}
              value={values.amount}
            />
          </div>
          {errors.amount ? (
            <p className="field-error" id="transaction-amount-error">
              {errors.amount}
            </p>
          ) : null}
        </Card>

        <fieldset>
          <legend>Category</legend>
          <div className="category-grid" id="transaction-category">
            {categories.map((category) => (
              <button
                aria-pressed={values.category === category}
                className={values.category === category ? "is-selected" : ""}
                key={category}
                onClick={() => updateValue("category", category)}
                type="button"
              >
                <Icon name={values.type} size={20} />
                {category}
              </button>
            ))}
          </div>
          {errors.category ? <p className="field-error">{errors.category}</p> : null}
        </fieldset>

        <Card className="form-fields">
          <label htmlFor="transaction-date">
            <span>Date</span>
            <input
              aria-describedby={errors.transactionDate ? "transaction-date-error" : undefined}
              aria-invalid={Boolean(errors.transactionDate)}
              id="transaction-date"
              onChange={(event) => updateValue("transactionDate", event.target.value)}
              type="date"
              value={values.transactionDate}
            />
          </label>
          {errors.transactionDate ? (
            <p className="field-error" id="transaction-date-error">
              {errors.transactionDate}
            </p>
          ) : null}
          <label htmlFor="transaction-note">
            <span>
              Note <small>Optional</small>
            </span>
            <textarea
              aria-describedby="transaction-note-help"
              aria-invalid={Boolean(errors.note)}
              id="transaction-note"
              maxLength={101}
              onChange={(event) => updateValue("note", event.target.value)}
              placeholder="What was this for?"
              rows={3}
              value={values.note}
            />
          </label>
          <p className={errors.note ? "field-error" : "field-help"} id="transaction-note-help">
            {errors.note ?? `${values.note.length}/100 characters`}
          </p>
        </Card>

        <Button disabled={isSaving} fullWidth type="submit">
          {isSaving ? "Saving..." : `Save ${values.type === "income" ? "income" : "expense"}`}
        </Button>

        {existing ? (
          <section className="remove-transaction" aria-label="Remove transaction">
            {confirmRemove ? (
              <Card>
                <h2>Remove this transaction?</h2>
                <p>
                  This will remove {existing.category}{" "}
                  {formatMoney(
                    {
                      amountMinor: existing.amountMinor,
                      currency: existing.currency,
                    },
                    preferences.locale,
                  )}{" "}
                  from your visible history and totals.
                </p>
                <div className="confirmation-actions">
                  <Button
                    disabled={isSaving}
                    onClick={() => void handleRemove()}
                    variant="secondary"
                  >
                    Yes, remove
                  </Button>
                  <Button onClick={() => setConfirmRemove(false)} variant="quiet">
                    Keep transaction
                  </Button>
                </div>
              </Card>
            ) : (
              <Button onClick={() => setConfirmRemove(true)} variant="quiet">
                Remove transaction
              </Button>
            )}
          </section>
        ) : null}
      </form>
    </main>
  );
}
