import { useState } from "react";
import { Link } from "react-router-dom";

import { useGuestPreferences } from "../../../app/providers/GuestPreferencesProvider";
import { formatWholeCurrency } from "../../../domain/formatting/localizedFormatting";
import { Brand } from "../../../shared/components/Brand";
import { Button } from "../../../shared/components/Button";
import { Card } from "../../../shared/components/Card";
import { EmptyState } from "../../../shared/components/EmptyState";
import { Icon } from "../../../shared/components/Icon";
import { InlineAlert } from "../../../shared/components/InlineAlert";

function getGreeting(): string {
  const hour = new Date().getHours();

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 18) {
    return "Good afternoon";
  }

  return "Good evening";
}

export function HomePage() {
  const { preferences } = useGuestPreferences();
  const [showMilestoneNotice, setShowMilestoneNotice] = useState(false);
  const zeroAmount = formatWholeCurrency(0n, preferences.currency, preferences.locale);

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
          <p>Start at your own pace. Your finance data stays on this device.</p>
        </span>
        <Link className="insights-link" to="/flow">
          <Icon name="sparkles" size={20} />
          Flow preview
        </Link>
      </section>

      {showMilestoneNotice ? (
        <InlineAlert title="Transaction entry is next">
          Income and expense forms arrive in Milestone 3. Your guest workspace is ready.
        </InlineAlert>
      ) : null}

      <Card className="budget-overview">
        <div className="section-heading">
          <span>
            <p className="eyebrow">This month</p>
            <h2>Personal budget</h2>
          </span>
          <span className="local-badge">
            <Icon name="shield" size={17} />
            On device
          </span>
        </div>
        <div className="budget-overview__content">
          <div aria-label="No budget used yet" className="progress-ring">
            <span>0%</span>
          </div>
          <dl className="summary-list">
            <div>
              <dt>Budget</dt>
              <dd>{zeroAmount}</dd>
            </div>
            <div>
              <dt>Spent</dt>
              <dd>{zeroAmount}</dd>
            </div>
            <div>
              <dt>Remaining</dt>
              <dd>{zeroAmount}</dd>
            </div>
          </dl>
        </div>
        <p className="card-note">Add a budget in Plan when budgeting becomes available.</p>
      </Card>

      <section aria-labelledby="quick-actions-title">
        <div className="section-heading">
          <h2 id="quick-actions-title">Quick actions</h2>
        </div>
        <div className="quick-actions">
          <button
            className="quick-action"
            onClick={() => setShowMilestoneNotice(true)}
            type="button"
          >
            <span className="quick-action__icon">
              <Icon name="plus" />
            </span>
            <span>
              <strong>Add expense</strong>
              <small>Track spending</small>
            </span>
            <Icon name="chevron" />
          </button>
          <button
            className="quick-action"
            onClick={() => setShowMilestoneNotice(true)}
            type="button"
          >
            <span className="quick-action__icon">
              <Icon name="plus" />
            </span>
            <span>
              <strong>Add income</strong>
              <small>Record earnings</small>
            </span>
            <Icon name="chevron" />
          </button>
        </div>
      </section>

      <Card aria-labelledby="recent-activity-title">
        <div className="section-heading">
          <h2 id="recent-activity-title">Recent activity</h2>
          <Link to="/activity">View all</Link>
        </div>
        <EmptyState
          action={
            <Button onClick={() => setShowMilestoneNotice(true)} variant="secondary">
              Add your first transaction
            </Button>
          }
          description="Income and expenses will appear here after you add them."
          icon="activity"
          title="No activity yet"
        />
      </Card>
    </main>
  );
}
