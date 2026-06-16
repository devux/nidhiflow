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

  return (
    <main className="page page--home" id="main-content">
      <header className="home-header">
        <Brand />
        <button aria-label="Notifications" className="icon-button" type="button">
          <Icon name="bell" />
        </button>
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

      <Card className="finance-overview">
        <div className="section-heading">
          <span>
            <p className="eyebrow">All recorded activity</p>
            <h2>Current balance</h2>
          </span>
          <span className="local-badge">
            <Icon name="shield" size={17} />
            On device
          </span>
        </div>
        <p
          className={`balance-amount ${
            BigInt(totals.balanceMinor) < 0n ? "balance-amount--negative" : ""
          }`}
        >
          {money(totals.balanceMinor)}
        </p>
        <dl className="dashboard-totals">
          <div>
            <dt>
              <Icon name="income" size={19} /> Income
            </dt>
            <dd>{money(totals.incomeMinor)}</dd>
          </div>
          <div>
            <dt>
              <Icon name="expense" size={19} /> Expense
            </dt>
            <dd>{money(totals.expenseMinor)}</dd>
          </div>
        </dl>
      </Card>

      <section aria-labelledby="quick-actions-title">
        <div className="section-heading">
          <h2 id="quick-actions-title">Quick actions</h2>
        </div>
        <div className="quick-actions">
          <Link className="quick-action" to="/transactions/new?type=expense">
            <span className="quick-action__icon quick-action__icon--expense">
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
      </section>

      <Card aria-labelledby="recent-activity-title">
        <div className="section-heading">
          <h2 id="recent-activity-title">Recent activity</h2>
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
