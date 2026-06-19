import { Link } from "react-router-dom";

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

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function HomePage() {
  const { isAuthenticated, user, workspaces } = useAuth();
  const { preferences } = useGuestPreferences();
  const { transactions } = useGuestTransactions();
  const totals = calculateTransactionTotals(transactions);
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
  const workspaceLabel = isAuthenticated
    ? (workspaces[0]?.name ?? "Personal workspace")
    : "Guest read-only workspace";
  const workspaceDescription = isAuthenticated
    ? "Your saved data is loaded from your account."
    : "Guest mode is read-only. Log in to save finance changes.";

  return (
    <main className="page page--home" id="main-content">
      <header className="home-header">
        <Brand />
        <Link aria-label="Notification preferences" className="icon-button" to="/you#preferences">
          <Icon name="bell" />
        </Link>
      </header>

      <section className="greeting">
        <span>
          <p className="eyebrow">{workspaceLabel}</p>
          <h1>
            {getGreeting()}, {displayName}
          </h1>
          <p>{workspaceDescription}</p>
        </span>
        <Link className="insights-link" to="/flow">
          <Icon name="sparkles" size={20} />
          Flow preview
        </Link>
      </section>

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
                  <small>Shared planning appears when you join a family workspace.</small>
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
              <h2 id="quick-actions-title">
                <Icon name="plus" size={18} />
                Quick actions
              </h2>
            </div>
            <div className="quick-actions">
              <Link className="quick-action" to="/transactions/new?type=income">
                <span className="quick-action__icon">
                  <Icon name="income" />
                </span>
                <span>
                  <strong>Add income</strong>
                  <small>Record earnings</small>
                </span>
                <Icon name="chevron" />
              </Link>
              <Link className="quick-action" to="/transactions/new?type=expense">
                <span className="quick-action__icon">
                  <Icon name="expense" />
                </span>
                <span>
                  <strong>Add expense</strong>
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
