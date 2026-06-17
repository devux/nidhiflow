import { useState, type FormEvent } from "react";

import { environment } from "../../../config/environment";
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
  const [email, setEmail] = useState("");
  const [subscribeState, setSubscribeState] = useState<"error" | "idle" | "saved" | "saving">(
    "idle",
  );

  async function handleNotifySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubscribeState("saving");

    try {
      const response = await fetch(
        `${environment.NIDHIFLOW_API_BASE_URL}/api/v1/flow-launch-subscriptions`,
        {
          body: JSON.stringify({ email }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        },
      );

      if (!response.ok) {
        throw new Error("Subscription failed");
      }

      setEmail("");
      setSubscribeState("saved");
    } catch {
      setSubscribeState("error");
    }
  }

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

      {subscribeState === "saved" ? (
        <InlineAlert title="Notifications need consent">
          You are on the Flow launch list. You can unsubscribe from the email when it arrives.
        </InlineAlert>
      ) : null}
      {subscribeState === "error" ? (
        <InlineAlert title="Could not save notification">
          Please check the email address and try again. No finance data was sent.
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
      <Card aria-labelledby="flow-notify-title">
        <form className="settings-form" onSubmit={(event) => void handleNotifySubmit(event)}>
          <h2 id="flow-notify-title">Notify me when Flow is ready</h2>
          <label htmlFor="flow-notify-email">Email</label>
          <div className="field-row">
            <input
              id="flow-notify-email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
              type="email"
              value={email}
            />
            <Button disabled={subscribeState === "saving"} type="submit">
              <Icon name="bell" size={20} />
              {subscribeState === "saving" ? "Saving" : "Notify me"}
            </Button>
          </div>
        </form>
      </Card>
    </main>
  );
}
