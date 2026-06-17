import { Link } from "react-router-dom";

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
  const goalSavedMinor = budgetRemainingMinor > 0n ? budgetRemainingMinor : 0n;
  const goalTargetMinor = budgetRemainingMinor > 0n ? incomeMinor : expenseMinor;
  const goalProgress =
    goalTargetMinor === 0n ? 0 : Number((goalSavedMinor * 100n) / goalTargetMinor);
  const goalProgressValue = Math.min(100, goalProgress);

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
          <p className="eyebrow">Local guest workspace</p>
          <h1>
            {getGreeting()}, {preferences.displayName}
          </h1>
          <p>Your transaction history stays on this device.</p>
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
                  <strong>Family budget</strong>
                  <small>Shared planning appears when you join a family workspace.</small>
                </span>
              </span>
              <Link className="home-summary-card__action" to="/plan">
                View all
              </Link>
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
            </div>
          </Card>

          <Card className="home-summary-card goal-preview-card">
            <div className="home-summary-card__header">
              <h2>Goals</h2>
              <Link className="home-summary-card__action" to="/plan">
                View all
                <Icon name="chevron" size={16} />
              </Link>
            </div>
            <div className="goal-preview">
              <span aria-hidden="true" className="goal-preview__art">
                <span className="goal-preview__tree" />
              </span>
              <div className="goal-preview__body">
                <strong>Savings goal</strong>
                <p>
                  {money(goalSavedMinor.toString())} / {money(goalTargetMinor.toString())}
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
              <Link aria-label="View goals" className="goal-preview__button" to="/plan">
                <Icon name="chevron" size={18} />
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
