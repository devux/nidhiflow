import { useState } from "react";

import { useGuestPreferences } from "../../../app/providers/GuestPreferencesProvider";
import { formatMonth, formatWholeCurrency } from "../../../domain/formatting/localizedFormatting";
import { Card } from "../../../shared/components/Card";
import { EmptyState } from "../../../shared/components/EmptyState";
import { PageHeader } from "../../../shared/components/PageHeader";
import { SegmentedControl } from "../../../shared/components/SegmentedControl";

export function PlanPage() {
  const { preferences } = useGuestPreferences();
  const [section, setSection] = useState("monthly");
  const zeroAmount = formatWholeCurrency(0n, preferences.currency, preferences.locale);

  return (
    <main className="page" id="main-content">
      <PageHeader eyebrow="Plan with clarity" title="Plan" />
      <SegmentedControl
        label="Planning section"
        onChange={setSection}
        options={[
          { label: "Monthly", value: "monthly" },
          { label: "Budget", value: "budget" },
          { label: "Bills", value: "bills" },
        ]}
        value={section}
      />
      <p className="period-label">
        {formatMonth(new Date(), preferences.locale, preferences.timezone)}
      </p>
      <Card className="monthly-card">
        <div className="section-heading">
          <span>
            <p className="eyebrow">Monthly budget</p>
            <h2>{zeroAmount}</h2>
          </span>
          <strong className="percentage">0%</strong>
        </div>
        <div
          aria-label="Budget usage: 0 percent"
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={0}
          className="progress-bar"
          role="progressbar"
        >
          <span />
        </div>
        <dl className="monthly-card__totals">
          <div>
            <dt>Spent</dt>
            <dd>{zeroAmount}</dd>
          </div>
          <div>
            <dt>Remaining</dt>
            <dd>{zeroAmount}</dd>
          </div>
        </dl>
      </Card>
      <Card>
        <EmptyState
          description={
            section === "bills"
              ? "Bills and due dates will appear here when bill planning is available."
              : "Create a plan later and this space will show progress without judgment."
          }
          icon={section === "bills" ? "calendar" : "plan"}
          title={section === "bills" ? "No bills scheduled" : "No budget categories yet"}
        />
      </Card>
    </main>
  );
}
