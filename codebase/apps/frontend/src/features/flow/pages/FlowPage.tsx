import { useState } from "react";

import { Button } from "../../../shared/components/Button";
import { Card } from "../../../shared/components/Card";
import { Icon, type IconName } from "../../../shared/components/Icon";
import { InlineAlert } from "../../../shared/components/InlineAlert";
import { PageHeader } from "../../../shared/components/PageHeader";

const previewItems: Array<{ description: string; icon: IconName; title: string }> = [
  {
    description: "Clear summaries based only on finance data you authorize.",
    icon: "chart",
    title: "Personalized insights",
  },
  {
    description: "Practical ideas that distinguish facts from recommendations.",
    icon: "goal",
    title: "Savings recommendations",
  },
  {
    description: "Helpful notices for bills, budgets, and unusual activity.",
    icon: "bell",
    title: "Smart alerts",
  },
  {
    description: "Plain-language questions and explanations about your finances.",
    icon: "feedback",
    title: "Natural conversations",
  },
];

export function FlowPage() {
  const [showAccountNotice, setShowAccountNotice] = useState(false);

  return (
    <main className="page page--flow" id="main-content">
      <PageHeader eyebrow="A preview of what is next" title="Flow" />
      <section className="flow-hero">
        <div aria-hidden="true" className="flow-orb">
          <Icon name="flow" size={58} />
        </div>
        <p className="eyebrow">Phase 2</p>
        <h2>Thoughtful finance help is coming later.</h2>
        <p>
          Flow will explain patterns and propose actions. It will never change financial data
          without your explicit confirmation.
        </p>
      </section>

      {showAccountNotice ? (
        <InlineAlert title="Notifications need consent">
          Saved launch notifications will be enabled with account or contact-consent features in a
          later milestone.
        </InlineAlert>
      ) : null}

      <Card aria-labelledby="flow-preview-title" subtle>
        <h2 id="flow-preview-title">What you can expect</h2>
        <ul className="feature-list">
          {previewItems.map((item) => (
            <li key={item.title}>
              <span className="icon-tile">
                <Icon name={item.icon} />
              </span>
              <span>
                <strong>{item.title}</strong>
                <small>{item.description}</small>
              </span>
            </li>
          ))}
        </ul>
      </Card>
      <Button fullWidth onClick={() => setShowAccountNotice(true)}>
        <Icon name="bell" size={20} />
        Notify me when Flow is ready
      </Button>
    </main>
  );
}
