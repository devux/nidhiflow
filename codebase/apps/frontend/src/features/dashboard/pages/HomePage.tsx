import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowTrendUp,
  faBagShopping,
  faLightbulb,
  faPiggyBank,
  faRocket,
  faWallet,
} from "@fortawesome/free-solid-svg-icons";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { type CSSProperties, useMemo, useState } from "react";

import { useAuth } from "../../../app/providers/AuthProvider";
import { useGuestPreferences } from "../../../app/providers/GuestPreferencesProvider";
import { useGuestTransactions } from "../../../app/providers/GuestTransactionsProvider";
import { formatMoney } from "../../../domain/money/money";
import type { SupportedLocale } from "../../../domain/preferences/guestPreferences";
import { calculateTransactionTotals } from "../../../domain/transactions/transaction";
import type { GuestTransaction } from "../../../domain/transactions/transaction";
import { Brand } from "../../../shared/components/Brand";
import { Card } from "../../../shared/components/Card";
import { EmptyState } from "../../../shared/components/EmptyState";
import { Icon } from "../../../shared/components/Icon";

function toDateValue(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function getCurrentMonthRange() {
  const today = new Date();

  return {
    from: toDateValue(new Date(today.getFullYear(), today.getMonth(), 1)),
    to: toDateValue(new Date(today.getFullYear(), today.getMonth() + 1, 0)),
  };
}

function formatTransactionDate(value: string, locale: SupportedLocale) {
  const [datePart] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const date = year && month && day ? new Date(year, month - 1, day) : new Date(value);

  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
  }).format(date);
}

interface TransactionHistoryRowProps {
  locale: SupportedLocale;
  transaction: GuestTransaction;
}

function TransactionHistoryRow({ locale, transaction }: TransactionHistoryRowProps) {
  const title = transaction.note.trim() || transaction.category;
  const amount = formatMoney(
    { amountMinor: transaction.amountMinor, currency: transaction.currency },
    locale,
    transaction.type === "income" ? { sign: "positive" } : undefined,
  );

  return (
    <Link
      aria-label={`Edit ${title} ${transaction.type} from ${formatTransactionDate(
        transaction.transactionDate,
        locale,
      )}`}
      className="transaction-history-row"
      to={`/transactions/${transaction.id}/edit`}
    >
      <span
        className={`transaction-history-row__avatar transaction-history-row__avatar--${transaction.type}`}
      >
        {transaction.category.charAt(0)}
      </span>
      <span className="transaction-history-row__details">
        <strong>{title}</strong>
        <small>{formatTransactionDate(transaction.transactionDate, locale)}</small>
      </span>
      <span
        className={`transaction-history-row__amount transaction-history-row__amount--${transaction.type}`}
      >
        <span className="sr-only">{transaction.type === "income" ? "Income" : "Expense"}:</span>
        {amount}
      </span>
    </Link>
  );
}

export function HomePage() {
  const { isAuthenticated, user, workspaces } = useAuth();
  const { preferences } = useGuestPreferences();
  const { transactions } = useGuestTransactions();
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const currentMonthRange = useMemo(() => getCurrentMonthRange(), []);
  const currentMonthTransactions = useMemo(
    () =>
      transactions.filter((transaction) => {
        if (transaction.deletedAt) return false;
        if (transaction.transactionDate < currentMonthRange.from) return false;
        if (transaction.transactionDate > currentMonthRange.to) return false;
        return true;
      }),
    [currentMonthRange.from, currentMonthRange.to, transactions],
  );
  const totals = calculateTransactionTotals(currentMonthTransactions);
  const recentTransactions = transactions
    .filter((transaction) => !transaction.deletedAt)
    .slice(0, 5);
  const money = (amountMinor: string) =>
    formatMoney({ amountMinor, currency: preferences.currency }, preferences.locale);
  const incomeMinor = BigInt(totals.incomeMinor);
  const expenseMinor = BigInt(totals.expenseMinor);
  const budgetTotalMinor = incomeMinor;
  const budgetRemainingMinor = incomeMinor - expenseMinor;
  const budgetProgress = incomeMinor === 0n ? 0 : Number((expenseMinor * 100n) / incomeMinor);
  const budgetProgressValue = Math.min(100, budgetProgress);
  const isBudgetUnderControl = budgetRemainingMinor >= 0n;
  const progressRingStyle = {
    "--transaction-progress": `${budgetProgressValue * 3.6}deg`,
  } as CSSProperties;
  const displayName = user?.displayName ?? preferences.displayName;
  const activeWorkspace = workspaces[0];
  const workspaceLabel = isAuthenticated
    ? activeWorkspace?.type === "family"
      ? activeWorkspace.name
      : `${displayName}'s workspace`
    : "Guest read-only workspace";
  const showcaseTip = isBudgetUnderControl
    ? "Tip: You're saving better than 68% of users!"
    : "Tip: Expenses are above income. Review spending.";

  return (
    <main className="page page--home" id="main-content">
      <header className="home-header">
        <div className="home-header__identity">
          <Brand />
          <p className="eyebrow">{workspaceLabel}</p>
        </div>
        <div
          className="home-header-menu"
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) {
              setIsHeaderMenuOpen(false);
            }
          }}
        >
          <button
            aria-controls={isHeaderMenuOpen ? "home-header-menu" : undefined}
            aria-expanded={isHeaderMenuOpen}
            aria-haspopup="menu"
            aria-label="More options"
            className="icon-button home-header-menu__button"
            onClick={() => setIsHeaderMenuOpen((isOpen) => !isOpen)}
            type="button"
          >
            <MoreVertIcon aria-hidden="true" focusable="false" fontSize="small" />
          </button>
          {isHeaderMenuOpen ? (
            <div className="home-header-menu__items" id="home-header-menu" role="menu">
              <Link
                aria-label="Notification preferences"
                className="home-header-menu__item"
                onClick={() => setIsHeaderMenuOpen(false)}
                role="menuitem"
                to="/you#preferences"
              >
                <Icon name="bell" size={18} />
                <span>Notification preferences</span>
              </Link>
            </div>
          ) : null}
        </div>
      </header>

      <section aria-label="Budget summaries">
        <div className="home-summary-grid">
          <div
            className={`home-summary-card transaction-showcase-card__panel${
              isBudgetUnderControl ? "" : " transaction-showcase-card--alert"
            }`}
          >
            <div className="transaction-showcase-card__progress">
              <div
                aria-label={`Budget usage: ${budgetProgressValue} percent`}
                aria-valuemax={100}
                aria-valuemin={0}
                aria-valuenow={budgetProgressValue}
                className="transaction-progress-ring"
                role="progressbar"
                style={progressRingStyle}
              >
                <span className="transaction-progress-ring__rocket" aria-hidden="true">
                  <FontAwesomeIcon icon={faRocket} />
                </span>
                <span className="transaction-progress-ring__content">
                  <strong>{budgetProgressValue}%</strong>
                  <small>
                    of budget
                    <br />
                    used <span aria-hidden="true">😎</span>
                  </small>
                </span>
              </div>
            </div>

            <dl className="transaction-showcase-card__stats">
              <div className="transaction-showcase-card__stat">
                <dt>
                  <span className="transaction-showcase-card__stat-icon transaction-showcase-card__stat-icon--total">
                    <FontAwesomeIcon icon={faWallet} />
                  </span>
                  <span>Total</span>
                </dt>
                <dd>{money(budgetTotalMinor.toString())}</dd>
              </div>
              <div className="transaction-showcase-card__stat">
                <dt>
                  <span className="transaction-showcase-card__stat-icon transaction-showcase-card__stat-icon--spent">
                    <FontAwesomeIcon icon={faBagShopping} />
                  </span>
                  <span>Spent</span>
                </dt>
                <dd>{money(expenseMinor.toString())}</dd>
              </div>
              <div className="transaction-showcase-card__stat">
                <dt>
                  <span className="transaction-showcase-card__stat-icon transaction-showcase-card__stat-icon--remaining">
                    <FontAwesomeIcon icon={faPiggyBank} />
                  </span>
                  <span>Remaining</span>
                </dt>
                <dd
                  className={
                    isBudgetUnderControl
                      ? "transaction-showcase-card__amount--positive"
                      : "transaction-showcase-card__amount--alert"
                  }
                >
                  {money(budgetRemainingMinor.toString())}
                </dd>
              </div>
            </dl>

            <div className="transaction-showcase-card__tip">
              <span className="transaction-showcase-card__tip-icon" aria-hidden="true">
                <FontAwesomeIcon icon={faLightbulb} />
              </span>
              <span>{showcaseTip}</span>
              <Link className="transaction-showcase-card__insights" to="/reports">
                See Insights
                <FontAwesomeIcon icon={faArrowTrendUp} />
              </Link>
            </div>
          </div>

          <section aria-label="Quick actions" className="home-actions-section">
            <div className="quick-actions">
              <Link
                aria-label="Add income"
                className="quick-action"
                to="/transactions/new?type=income"
              >
                <span className="quick-action__icon">
                  <Icon name="income" />
                </span>
                <strong>Add income</strong>
              </Link>
              <Link
                aria-label="Add expense"
                className="quick-action"
                to="/transactions/new?type=expense"
              >
                <span className="quick-action__icon">
                  <Icon name="expense" />
                </span>
                <strong>Add expense</strong>
              </Link>
              <Link aria-label="Open budget" className="quick-action" to="/budget">
                <span className="quick-action__icon">
                  <Icon name="plan" />
                </span>
                <strong>Budget</strong>
              </Link>
              <Link aria-label="Open reports" className="quick-action" to="/reports">
                <span className="quick-action__icon">
                  <Icon name="report" />
                </span>
                <strong>Reports</strong>
              </Link>
            </div>
          </section>
        </div>
      </section>

      <Card aria-labelledby="recent-activity-title" className="transaction-history-card">
        <div className="section-heading">
          <h2 id="recent-activity-title">Transaction history</h2>
          <Link className="transaction-history-card__see-all" to="/activity">
            See all
            <Icon name="chevron" size={20} />
          </Link>
        </div>
        {recentTransactions.length > 0 ? (
          <div className="transaction-history-list">
            {recentTransactions.map((transaction) => (
              <TransactionHistoryRow
                key={transaction.id}
                locale={preferences.locale}
                transaction={transaction}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            action={
              <Link className="button button--secondary" to="/transactions/new?type=expense">
                Add your first transaction
              </Link>
            }
            description="Income and expenses will appear here after you add them."
            icon="activity"
            title="No activity yet"
          />
        )}
      </Card>
    </main>
  );
}
