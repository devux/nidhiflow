import { useState } from "react";

import { Card } from "../../../shared/components/Card";
import { EmptyState } from "../../../shared/components/EmptyState";
import { Icon } from "../../../shared/components/Icon";
import { PageHeader } from "../../../shared/components/PageHeader";
import { SegmentedControl } from "../../../shared/components/SegmentedControl";

export function ActivityPage() {
  const [transactionType, setTransactionType] = useState("income");

  return (
    <main className="page" id="main-content">
      <PageHeader
        action={
          <button aria-label="Search activity" className="icon-button" type="button">
            <Icon name="activity" />
          </button>
        }
        eyebrow="Your local history"
        title="Activity"
      />
      <SegmentedControl
        label="Transaction type"
        onChange={setTransactionType}
        options={[
          { label: "Income", value: "income" },
          { label: "Expense", value: "expense" },
        ]}
        value={transactionType}
      />
      <Card>
        <EmptyState
          description={`Your ${transactionType} transactions will be grouped by date here.`}
          icon={transactionType === "income" ? "income" : "expense"}
          title={`No ${transactionType} yet`}
        />
      </Card>
    </main>
  );
}
