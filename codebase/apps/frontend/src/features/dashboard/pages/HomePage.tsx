import { Link } from "react-router-dom";
import { useMemo } from "react";

import { useAuth } from "../../../app/providers/AuthProvider";
import { useGuestPreferences } from "../../../app/providers/GuestPreferencesProvider";
import { useGuestTransactions } from "../../../app/providers/GuestTransactionsProvider";
import { formatMoney } from "../../../domain/money/money";
import { calculateTransactionTotals } from "../../../domain/transactions/transaction";
import { Brand } from "../../../shared/components/Brand";
import { Card } from "../../../shared/components/Card";
import { EmptyState } from "../../../shared/components/EmptyState";
import { Icon } from "../../../shared/components/Icon";
import { TransactionRow } from "../../transactions/components/TransactionRow";

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

export function HomePage() {
  const { isAuthenticated, user, workspaces } = useAuth();
  const { preferences } = useGuestPreferences();
  const { transactions } = useGuestTransactions();
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
  const recentTransactions = transactions.slice(0, 4);
  const money = (amountMinor: string) =>
    formatMoney({ amountMinor, currency: preferences.currency }, preferences.locale);
  const incomeMinor = BigInt(totals.incomeMinor);
  const expenseMinor = BigInt(totals.expenseMinor);
  const budgetTotalMinor = incomeMinor;
  const budgetRemainingMinor = incomeMinor - expenseMinor;
  const budgetProgress = incomeMinor === 0n ? 0 : Number((expenseMinor * 100n) / incomeMinor);
  const budgetProgressValue = Math.min(100, budgetProgress);
  const displayName = user?.displayName ?? preferences.displayName;
  const activeWorkspace = workspaces[0];
  const workspaceLabel = isAuthenticated
    ? activeWorkspace?.type === "family"
      ? activeWorkspace.name
      : `${displayName}'s workspace`
    : "Guest read-only workspace";

  return (
    <main className="page page--home" id="main-content">
      <header className="home-header">
        <div className="home-header__identity">
          <Brand />
          <p className="eyebrow">{workspaceLabel}</p>
        </div>
        <Link aria-label="Notification preferences" className="icon-button" to="/you#preferences">
          <Icon name="bell" />
        </Link>
      </header>

      <section aria-label="Budget summaries">
        <div className="home-summary-grid">
          <Card className="home-summary-card">
            <div className="home-summary-card__header">
              <span className="home-summary-card__title">
                <span className="icon-tile">
                  <Icon name="plan" />
                </span>
                <span>
                  <strong>Transactions</strong>
                  <small>This month, matching Flow and Reports.</small>
                </span>
              </span>
            </div>
            <div className="budget-overview__content">
              <div
                aria-label={`Budget usage: ${budgetProgressValue} percent`}
                aria-valuemax={100}
                aria-valuemin={0}
                aria-valuenow={budgetProgressValue}
                className="progress-ring"
                role="progressbar"
              >
                <span>{budgetProgressValue}%</span>
              </div>
              <dl className="summary-list">
                <div>
                  <dt>Total</dt>
                  <dd>{money(budgetTotalMinor.toString())}</dd>
                </div>
                <div>
                  <dt>Spent</dt>
                  <dd>{money(expenseMinor.toString())}</dd>
                </div>
                <div>
                  <dt>Remaining</dt>
                  <dd>{money(budgetRemainingMinor.toString())}</dd>
                </div>
              </dl>
            </div>
          </Card>

          <Card
            aria-labelledby="quick-actions-title"
            className="home-summary-card home-actions-card"
          >
            <div className="home-summary-card__header">
              <h2 id="quick-actions-title">Quick actions</h2>
            </div>
            <div className="quick-actions">
              <Link
                aria-label="Add income"
                className="quick-action"
                to="/transactions/new?type=income"
              >
                <span className="quick-action__icon">
                  <Icon name="income" />
                </span>
                <span>
                  <strong>
                    <span className="quick-action__verb">Add </span>income
                  </strong>
                  <small>Record earnings</small>
                </span>
                <Icon name="chevron" />
              </Link>
              <Link
                aria-label="Add expense"
                className="quick-action"
                to="/transactions/new?type=expense"
              >
                <span className="quick-action__icon">
                  <Icon name="expense" />
                </span>
                <span>
                  <strong>
                    <span className="quick-action__verb">Add </span>expense
                  </strong>
                  <small>Track spending</small>
                </span>
                <Icon name="chevron" />
              </Link>
            </div>
          </Card>
        </div>
      </section>

      <Card aria-labelledby="recent-activity-title">
        <div className="section-heading">
          <h2 id="recent-activity-title">
            <Icon name="activity" size={18} />
            Recent activity
          </h2>
          <Link to="/activity">View all</Link>
        </div>
        {recentTransactions.length > 0 ? (
          <div className="transaction-list">
            {recentTransactions.map((transaction) => (
              <TransactionRow
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
