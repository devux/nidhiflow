import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import MuiButton from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";

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

const COLLAPSED_CATEGORY_COUNT = 7;
const DEFAULT_EXPENSE_CATEGORY = "Misc";
const expenseFormCategories = [
  DEFAULT_EXPENSE_CATEGORY,
  ...expenseCategories.filter((category) => category !== DEFAULT_EXPENSE_CATEGORY),
];

interface FlowTransactionDraft {
  amount?: string | null;
  category?: string | null;
  note?: string | null;
  transactionDate?: string | null;
  type?: TransactionType | null;
}

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

function getCurrencySymbol(currency: string, locale: string): string {
  const currencyPart = new Intl.NumberFormat(locale, {
    currency,
    currencyDisplay: "narrowSymbol",
    style: "currency",
  })
    .formatToParts(0)
    .find((part) => part.type === "currency");

  return currencyPart?.value ?? currency;
}

function normalizeAmountInput(value: string): string {
  const numericValue = value.replace(/[^\d.]/g, "");
  const [whole = "", ...fractionParts] = numericValue.split(".");

  if (fractionParts.length === 0) {
    return whole;
  }

  return `${whole}.${fractionParts.join("").slice(0, 2)}`;
}

export function TransactionFormPage() {
  const { id } = useParams();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { preferences } = useGuestPreferences();
  const {
    canWrite,
    createTransaction,
    removeTransaction,
    requiresAuthentication,
    transactions,
    updateTransaction,
  } = useGuestTransactions();
  const existing = useMemo(
    () => transactions.find((transaction) => transaction.id === id),
    [id, transactions],
  );
  const flowDraft = (location.state as { flowTransactionDraft?: FlowTransactionDraft } | null)
    ?.flowTransactionDraft;
  const requestedType = searchParams.get("type");
  const initialType: TransactionType =
    existing?.type ?? flowDraft?.type ?? (requestedType === "income" ? "income" : "expense");
  const initialCategories: readonly string[] =
    initialType === "income" ? incomeCategories : expenseFormCategories;
  const defaultCategory = initialType === "income" ? incomeCategories[0] : DEFAULT_EXPENSE_CATEGORY;
  const draftCategory =
    flowDraft?.category && initialCategories.includes(flowDraft.category)
      ? flowDraft.category
      : defaultCategory;
  const [values, setValues] = useState<TransactionFormValues>(() => ({
    amount: existing ? toAmountInput(existing) : (flowDraft?.amount ?? ""),
    category: existing?.category ?? draftCategory,
    note: existing?.note ?? flowDraft?.note ?? "",
    transactionDate: existing?.transactionDate ?? flowDraft?.transactionDate ?? getLocalDate(),
    type: initialType,
  }));
  const [errors, setErrors] = useState<TransactionFormErrors>({});
  const [saveError, setSaveError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const dateInputRef = useRef<HTMLInputElement | null>(null);
  const [showAllCategories, setShowAllCategories] = useState(
    existing ? initialCategories.indexOf(existing.category) >= COLLAPSED_CATEGORY_COUNT : false,
  );
  useEffect(() => {
    if (existing) return;

    const nextType: TransactionType = requestedType === "income" ? "income" : "expense";

    if (values.type === nextType) return;

    const nextCategory = nextType === "income" ? incomeCategories[0] : DEFAULT_EXPENSE_CATEGORY;

    setValues({
      amount: "",
      category: nextCategory,
      note: "",
      transactionDate: getLocalDate(),
      type: nextType,
    });
    setErrors({});
    setShowAllCategories(false);
  }, [existing, requestedType, values.type]);

  if (id && !existing) {
    return (
      <main className="page focused-page" id="main-content">
        <Card>
          <Typography component="h1" variant="h5">
            Transaction not found
          </Typography>
          <Typography>It may have already been removed from this device.</Typography>
          <Link className="button button--secondary" to="/">
            Return to Home
          </Link>
        </Card>
      </main>
    );
  }

  if (requiresAuthentication || !canWrite) {
    return (
      <main className="page focused-page" id="main-content">
        <Card className="auth-required-card">
          <Icon name="lock" size={28} />
          <Typography component="h1" variant="h5">
            Sign in to save changes
          </Typography>
          <Typography>
            Guest mode is read-only. Log in or create an account to add income, add expenses, edit
            transactions, or save finance changes to the database.
          </Typography>
          <div className="confirmation-actions">
            <Link className="button button--primary" to="/login">
              Log in
            </Link>
            <Link className="button button--secondary" to="/signup">
              Sign up
            </Link>
          </div>
          <Link className="text-button" to="/activity">
            Continue reading as guest
          </Link>
        </Card>
      </main>
    );
  }

  const categories: readonly string[] =
    values.type === "income" ? incomeCategories : expenseFormCategories;
  const shouldCollapseCategories =
    categories.length > COLLAPSED_CATEGORY_COUNT + 1 && !showAllCategories;
  const visibleCategories = shouldCollapseCategories
    ? categories.slice(0, COLLAPSED_CATEGORY_COUNT)
    : categories;
  const transactionLabel = values.type === "income" ? "Income" : "Expense";
  const title = existing ? `Edit ${transactionLabel}` : `Add ${transactionLabel}`;
  const amountLabel = `${transactionLabel} Amount`;
  const currencySymbol = getCurrencySymbol(preferences.currency, preferences.locale);

  function updateValue<Field extends keyof TransactionFormValues>(
    field: Field,
    value: TransactionFormValues[Field],
  ) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function openDatePicker() {
    const input = dateInputRef.current;
    if (!input) return;
    input.focus();
    input.showPicker?.();
  }

  function handleDateFieldClick() {
    openDatePicker();
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
      void navigate("/", { replace: true });
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
      void navigate("/", { replace: true });
    } catch {
      setSaveError(true);
      setIsSaving(false);
    }
  }

  return (
    <main className="page focused-page transaction-entry-page" id="main-content">
      <Box className="focused-header transaction-entry-header" component="header">
        <IconButton
          aria-label="Cancel and return to Home"
          className="transaction-entry-header__close"
          component={Link}
          size="small"
          to="/"
        >
          <CloseRoundedIcon aria-hidden="true" focusable="false" fontSize="small" />
        </IconButton>
        <Typography component="h1">{title}</Typography>
      </Box>

      {saveError ? (
        <InlineAlert title="Transaction was not saved">
          Check local storage access and try again. Your entered values are still here.
        </InlineAlert>
      ) : null}

      <form className="transaction-form" noValidate onSubmit={(event) => void handleSubmit(event)}>
        <fieldset className="transaction-category-section">
          <legend>Category</legend>
          <div className="category-grid" id="transaction-category">
            {visibleCategories.map((category) => (
              <MuiButton
                aria-pressed={values.category === category}
                className={values.category === category ? "is-selected" : ""}
                key={category}
                onClick={() => updateValue("category", category)}
                type="button"
              >
                <span>{category}</span>
              </MuiButton>
            ))}
            {shouldCollapseCategories ? (
              <MuiButton
                aria-label="Show more categories"
                className="category-grid__more"
                onClick={() => setShowAllCategories(true)}
                type="button"
              >
                <span>More</span>
              </MuiButton>
            ) : null}
          </div>
          {errors.category ? <p className="field-error">{errors.category}</p> : null}
        </fieldset>

        <Card className="amount-card">
          <TextField
            aria-describedby={errors.amount ? "transaction-amount-error" : undefined}
            autoComplete="off"
            className="amount-input"
            error={Boolean(errors.amount)}
            fullWidth
            hiddenLabel
            id="transaction-amount"
            onChange={(event) => updateValue("amount", normalizeAmountInput(event.target.value))}
            placeholder="0"
            slotProps={{
              htmlInput: {
                "aria-label": "Amount",
                inputMode: "decimal",
                pattern: "[0-9]*[.]?[0-9]{0,2}",
              },
              input: {
                disableUnderline: true,
                startAdornment: (
                  <InputAdornment position="start">
                    <span aria-hidden="true">{currencySymbol}</span>
                  </InputAdornment>
                ),
              },
            }}
            value={values.amount}
            variant="standard"
          />
          <label className="amount-card__label" htmlFor="transaction-amount">
            {amountLabel}
          </label>
          {errors.amount ? (
            <p className="field-error" id="transaction-amount-error">
              {errors.amount}
            </p>
          ) : null}
        </Card>

        <Card className="form-fields transaction-details-card">
          <Typography
            className="transaction-field-label"
            component="label"
            htmlFor="transaction-date"
          >
            Date
          </Typography>
          <TextField
            aria-describedby={errors.transactionDate ? "transaction-date-error" : undefined}
            error={Boolean(errors.transactionDate)}
            fullWidth
            id="transaction-date"
            onClick={handleDateFieldClick}
            onChange={(event) => updateValue("transactionDate", event.target.value)}
            slotProps={{
              input: {
                onClick: handleDateFieldClick,
              },
              htmlInput: {
                "aria-label": "Date",
                ref: dateInputRef,
              },
            }}
            type="date"
            value={values.transactionDate}
          />
          {errors.transactionDate ? (
            <p className="field-error" id="transaction-date-error">
              {errors.transactionDate}
            </p>
          ) : null}
          <Typography
            className="transaction-field-label"
            component="label"
            htmlFor="transaction-note"
          >
            Notes
          </Typography>
          <TextField
            aria-describedby="transaction-note-help"
            error={Boolean(errors.note)}
            fullWidth
            id="transaction-note"
            multiline
            onChange={(event) => updateValue("note", event.target.value)}
            placeholder="Add note (optional)"
            rows={3}
            slotProps={{ htmlInput: { maxLength: 101 } }}
            value={values.note}
          />
          <p className={errors.note ? "field-error" : "field-help"} id="transaction-note-help">
            {errors.note ?? `${values.note.length}/100 characters`}
          </p>
        </Card>

        <MuiButton
          className="button button--primary button--full transaction-submit"
          disabled={isSaving}
          fullWidth
          type="submit"
          variant="contained"
        >
          {isSaving ? "Saving..." : `Save ${transactionLabel}`}
        </MuiButton>

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
