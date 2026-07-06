import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../../../app/providers/AuthProvider";
import { useGuestPreferences } from "../../../app/providers/GuestPreferencesProvider";
import {
  archiveAccount,
  createLoanPayment,
  createLiabilityAccount,
  getAccountSummary,
  listLoanPayments,
  restoreAccount,
  updateLiabilityAccount,
  type AccountSummaryResource,
  type LoanPaymentResource,
} from "../../../data/api/financeClient";
import { formatMoney } from "../../../domain/money/money";
import type { SupportedCurrency } from "../../../domain/preferences/guestPreferences";
import { Button } from "../../../shared/components/Button";
import { Card } from "../../../shared/components/Card";
import { EmptyState } from "../../../shared/components/EmptyState";
import { Icon } from "../../../shared/components/Icon";
import { PageHeader } from "../../../shared/components/PageHeader";
import {
  decimalToMinor,
  summarizeLiabilities,
  type LiabilityAccount,
} from "../domain/liabilitySummary";

function accountTypeLabel(type: string) {
  if (type === "credit_card") return "Credit card";
  if (type === "loan") return "Loan";
  return "Other loan";
}

function todayValue() {
  const today = new Date();
  return [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");
}

function formatPaymentDate(value: string, locale: string) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(date);
}

export function LiabilitiesPage() {
  const { accessToken, activeWorkspace, isAuthenticated, isCheckingSession } = useAuth();
  const { preferences } = useGuestPreferences();
  const [accountSummary, setAccountSummary] = useState<AccountSummaryResource | null>(null);
  const [loadState, setLoadState] = useState<"error" | "idle" | "loading">("idle");
  const [reloadKey, setReloadKey] = useState(0);
  const [editingAccount, setEditingAccount] = useState<LiabilityAccount | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [accountName, setAccountName] = useState("");
  const [accountType, setAccountType] = useState<"credit_card" | "loan" | "other_liability">(
    "credit_card",
  );
  const [openingBalance, setOpeningBalance] = useState("");
  const [accountCurrency, setAccountCurrency] = useState<SupportedCurrency>(preferences.currency);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [payments, setPayments] = useState<LoanPaymentResource[]>([]);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(todayValue);
  const [paymentError, setPaymentError] = useState("");
  const [paymentState, setPaymentState] = useState<"idle" | "loading" | "saving">("idle");
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !accessToken || !activeWorkspace) {
      setAccountSummary(null);
      setLoadState("idle");
      return;
    }

    let active = true;
    setLoadState("loading");

    void getAccountSummary({ accessToken, workspaceId: activeWorkspace.id })
      .then((summary) => {
        if (!active) return;
        setAccountSummary(summary);
        setLoadState("idle");
      })
      .catch(() => {
        if (!active) return;
        setLoadState("error");
      });

    return () => {
      active = false;
    };
  }, [accessToken, activeWorkspace, isAuthenticated, reloadKey]);

  const summary = useMemo(
    () => summarizeLiabilities(accountSummary?.accounts ?? []),
    [accountSummary],
  );
  const displayedTotals =
    summary.totals.length > 0
      ? summary.totals
      : [
          {
            amountMinor: "0",
            currency: activeWorkspace?.reportingCurrency ?? preferences.currency,
          },
        ];
  const money = (account: Pick<LiabilityAccount, "balanceMinor" | "currency">) =>
    formatMoney(
      { amountMinor: account.balanceMinor, currency: account.currency },
      preferences.locale,
    );

  function openCreate() {
    setEditingAccount(null);
    setAccountName("");
    setAccountType("credit_card");
    setOpeningBalance("");
    setAccountCurrency(activeWorkspace?.reportingCurrency ?? preferences.currency);
    setFormError("");
    setIsEditorOpen(true);
  }

  function openEdit(account: LiabilityAccount) {
    setEditingAccount(account);
    setAccountName(account.name);
    setAccountType(account.type as "credit_card" | "loan" | "other_liability");
    setOpeningBalance(account.openingBalance ?? account.currentBalance);
    setAccountCurrency(account.currency);
    setFormError("");
    setPayments([]);
    setIsEditorOpen(true);
    if (accessToken && activeWorkspace) {
      setPaymentState("loading");
      void listLoanPayments({
        accessToken,
        accountId: account.id,
        workspaceId: activeWorkspace.id,
      })
        .then(setPayments)
        .catch(() => setPaymentError("Payment history could not be loaded."))
        .finally(() => setPaymentState("idle"));
    }
  }

  function openPaymentDialog() {
    setPaymentAmount("");
    setPaymentDate(todayValue());
    setPaymentError("");
    setIsPaymentDialogOpen(true);
  }

  async function recordPayment(event: React.FormEvent) {
    event.preventDefault();
    if (!accessToken || !activeWorkspace || !editingAccount) return;
    if (!/^\d+(?:\.\d{1,4})?$/.test(paymentAmount.trim()) || /^0+(?:\.0+)?$/.test(paymentAmount)) {
      setPaymentError("Enter a payment amount greater than zero.");
      return;
    }

    setPaymentState("saving");
    setPaymentError("");
    try {
      const payment = await createLoanPayment({
        accessToken,
        accountId: editingAccount.id,
        amount: paymentAmount.trim(),
        currency: editingAccount.currency,
        paymentDate,
        workspaceId: activeWorkspace.id,
      });
      setPayments((current) => [payment, ...current]);
      setIsPaymentDialogOpen(false);
      setReloadKey((key) => key + 1);
    } catch {
      setPaymentError("The payment could not be recorded. Check the outstanding balance.");
    } finally {
      setPaymentState("idle");
    }
  }

  async function saveAccount(event: React.FormEvent) {
    event.preventDefault();
    if (!accessToken || !activeWorkspace) return;
    if (!accountName.trim() || !/^\d+(?:\.\d{1,4})?$/.test(openingBalance.trim())) {
      setFormError("Enter a name and a non-negative opening balance.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const input = {
        accessToken,
        currency: accountCurrency,
        name: accountName.trim(),
        openingBalance: openingBalance.trim(),
        type: accountType,
        workspaceId: activeWorkspace.id,
      };
      if (editingAccount) {
        await updateLiabilityAccount({ ...input, accountId: editingAccount.id });
      } else {
        await createLiabilityAccount(input);
      }
      setIsEditorOpen(false);
      setReloadKey((key) => key + 1);
    } catch {
      setFormError("The loan could not be saved. Check the values and try again.");
    } finally {
      setSaving(false);
    }
  }

  async function archiveCurrentAccount() {
    if (!accessToken || !activeWorkspace || !editingAccount) return;
    if (!window.confirm(`Archive ${editingAccount.name}? Its ledger history will be preserved.`)) {
      return;
    }
    setSaving(true);
    try {
      await archiveAccount({
        accessToken,
        accountId: editingAccount.id,
        workspaceId: activeWorkspace.id,
      });
      setIsEditorOpen(false);
      setReloadKey((key) => key + 1);
    } catch {
      setFormError("The loan could not be archived.");
    } finally {
      setSaving(false);
    }
  }

  async function restoreArchivedAccount(account: LiabilityAccount) {
    if (!accessToken || !activeWorkspace) return;
    await restoreAccount({
      accessToken,
      accountId: account.id,
      workspaceId: activeWorkspace.id,
    });
    setReloadKey((key) => key + 1);
  }

  if (isCheckingSession) {
    return (
      <main aria-busy="true" className="page page--liabilities" id="main-content">
        <PageHeader title="Loans" />
        <Card className="liabilities-loading" role="status">
          Loading loans…
        </Card>
      </main>
    );
  }

  if (!isAuthenticated || !accessToken || !activeWorkspace) {
    return (
      <main className="page page--liabilities" id="main-content">
        <PageHeader title="Loans" />
        <Card>
          <EmptyState
            action={
              <div className="liabilities-empty-actions">
                <Link className="button button--primary" to="/login">
                  Log in
                </Link>
                <Link className="button button--secondary" to="/signup">
                  Create account
                </Link>
              </div>
            }
            description="Loan balances come from workspace accounts and their transaction ledger. Log in to review them securely."
            icon="liability"
            title="Your loans stay private"
          />
        </Card>
      </main>
    );
  }

  return (
    <main className="page page--liabilities" id="main-content">
      <PageHeader
        action={
          <button
            aria-label="Add loan"
            className="icon-button icon-button--flat"
            onClick={openCreate}
          >
            <Icon name="plus" />
          </button>
        }
        title="Loans"
      />

      {loadState === "loading" ? (
        <Card aria-busy="true" className="liabilities-loading" role="status">
          Loading loans…
        </Card>
      ) : null}

      {loadState === "error" ? (
        <Card className="liabilities-error" role="alert">
          <span className="icon-tile">
            <Icon name="liability" />
          </span>
          <div>
            <h2>Loans could not be loaded</h2>
            <p>Your account data was not changed. Check your connection and try again.</p>
          </div>
          <Button onClick={() => setReloadKey((key) => key + 1)} variant="secondary">
            Try again
          </Button>
        </Card>
      ) : null}

      {loadState === "idle" && accountSummary ? (
        summary.activeAccounts.length === 0 && summary.archivedAccounts.length === 0 ? (
          <Card>
            <EmptyState
              description="Credit-card, loan, and other borrowing accounts will appear here. Balances are always derived from the transaction ledger."
              icon="liability"
              title="No loans yet"
            />
          </Card>
        ) : (
          <>
            <Card aria-labelledby="liability-total-title" className="liabilities-total">
              <span className="liabilities-total__icon">
                <Icon name="liability" size={28} />
              </span>
              <div>
                <p id="liability-total-title">Active loans</p>
                {displayedTotals.map((total) => (
                  <strong key={total.currency}>{formatMoney(total, preferences.locale)}</strong>
                ))}
              </div>
              <small>Ledger-derived balances</small>
            </Card>

            <section aria-labelledby="liability-accounts-title">
              <div className="section-heading">
                <h2 id="liability-accounts-title">Accounts</h2>
                <span>{summary.activeAccounts.length}</span>
              </div>
              <div className="liability-account-list">
                {summary.activeAccounts.map((account) => (
                  <Card className="liability-account" key={account.id}>
                    <button
                      aria-label={`Open ${account.name}`}
                      className="liability-account__open"
                      onClick={() => openEdit(account)}
                      type="button"
                    >
                      <div className="liability-account__heading">
                        <span className="icon-tile">
                          <Icon name="liability" size={20} />
                        </span>
                        <div>
                          <h3>{account.name}</h3>
                          <p>{accountTypeLabel(account.type)}</p>
                        </div>
                        <span className="liability-account__trailing">
                          <strong>{money(account)}</strong>
                          <Icon name="chevron" size={18} />
                        </span>
                      </div>
                    </button>
                  </Card>
                ))}
              </div>
            </section>

            {summary.archivedAccounts.length > 0 ? (
              <section aria-labelledby="archived-liabilities-title">
                <div className="section-heading">
                  <h2 id="archived-liabilities-title">Archived history</h2>
                </div>
                <Card className="archived-liability-list">
                  {summary.archivedAccounts.map((account) => (
                    <div className="archived-liability" key={account.id}>
                      <div>
                        <h3>{account.name}</h3>
                        <p>{accountTypeLabel(account.type)} · Archived</p>
                      </div>
                      <strong>{money(account)}</strong>
                      <Button onClick={() => void restoreArchivedAccount(account)} variant="quiet">
                        Restore
                      </Button>
                    </div>
                  ))}
                </Card>
              </section>
            ) : null}
          </>
        )
      ) : null}

      <Dialog
        fullWidth
        maxWidth="xs"
        onClose={() => setIsEditorOpen(false)}
        open={isEditorOpen}
        slotProps={{ paper: { className: "profile-dialog finance-editor-dialog" } }}
      >
        <DialogTitle>{editingAccount?.name ?? "Add loan"}</DialogTitle>
        <IconButton
          aria-label="Close"
          className="profile-dialog__close"
          onClick={() => setIsEditorOpen(false)}
        >
          <CloseRoundedIcon />
        </IconButton>
        <DialogContent>
          <form className="finance-editor-form" onSubmit={(event) => void saveAccount(event)}>
            <label>
              Account name
              <input
                autoFocus
                maxLength={80}
                onChange={(event) => setAccountName(event.target.value)}
                value={accountName}
              />
            </label>
            <label>
              Loan type
              <select
                onChange={(event) =>
                  setAccountType(event.target.value as "credit_card" | "loan" | "other_liability")
                }
                value={accountType}
              >
                <option value="credit_card">Credit card</option>
                <option value="loan">Loan</option>
                <option value="other_liability">Other loan</option>
              </select>
            </label>
            <label>
              Loan amount
              <input
                inputMode="decimal"
                onChange={(event) => setOpeningBalance(event.target.value)}
                placeholder="0.00"
                value={openingBalance}
              />
              <small>Changing this adjusts the account base; transactions remain unchanged.</small>
            </label>
            <label>
              Currency
              <select
                onChange={(event) => setAccountCurrency(event.target.value as SupportedCurrency)}
                value={accountCurrency}
              >
                {(["INR", "USD", "EUR", "GBP"] as SupportedCurrency[]).map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </label>
            {formError ? (
              <p className="form-error" role="alert">
                {formError}
              </p>
            ) : null}
            <Button disabled={saving} fullWidth type="submit">
              {saving ? "Saving…" : "Save loan"}
            </Button>
            {editingAccount ? (
              <>
                <Button disabled={saving} fullWidth onClick={openPaymentDialog} variant="secondary">
                  Record payment
                </Button>
                <section
                  aria-labelledby="loan-payment-history-title"
                  className="loan-payment-history"
                >
                  <h3 id="loan-payment-history-title">Payment history</h3>
                  {paymentState === "loading" ? <p role="status">Loading payments…</p> : null}
                  {payments.length > 0 ? (
                    <ul>
                      {payments.map((payment) => (
                        <li key={payment.id}>
                          <span>
                            <strong>
                              {formatMoney(
                                {
                                  amountMinor: decimalToMinor(payment.amount),
                                  currency: payment.currency,
                                },
                                preferences.locale,
                              )}
                            </strong>
                            <time dateTime={payment.paymentDate}>
                              {formatPaymentDate(payment.paymentDate, preferences.locale)}
                            </time>
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : paymentState !== "loading" ? (
                    <p>No payments recorded yet.</p>
                  ) : null}
                </section>
                <Button
                  disabled={saving}
                  fullWidth
                  onClick={() => void archiveCurrentAccount()}
                  variant="quiet"
                >
                  Archive loan
                </Button>
              </>
            ) : null}
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        fullWidth
        maxWidth="xs"
        onClose={() => setIsPaymentDialogOpen(false)}
        open={isPaymentDialogOpen}
        slotProps={{ paper: { className: "profile-dialog finance-editor-dialog" } }}
      >
        <DialogTitle>Record payment</DialogTitle>
        <IconButton
          aria-label="Close payment"
          className="profile-dialog__close"
          onClick={() => setIsPaymentDialogOpen(false)}
        >
          <CloseRoundedIcon />
        </IconButton>
        <DialogContent>
          <form className="finance-editor-form" onSubmit={(event) => void recordPayment(event)}>
            <label>
              Amount paid
              <input
                autoFocus
                inputMode="decimal"
                onChange={(event) => setPaymentAmount(event.target.value)}
                placeholder="0.00"
                value={paymentAmount}
              />
            </label>
            <label>
              Payment date
              <input
                onChange={(event) => setPaymentDate(event.target.value)}
                type="date"
                value={paymentDate}
              />
            </label>
            {paymentError ? (
              <p className="form-error" role="alert">
                {paymentError}
              </p>
            ) : null}
            <Button disabled={paymentState === "saving"} fullWidth type="submit">
              {paymentState === "saving" ? "Recording…" : "Record payment"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
