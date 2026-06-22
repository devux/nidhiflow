import { useMemo, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../../../app/providers/AuthProvider";
import { trackApiRequest } from "../../../app/providers/apiLoadingState";
import { environment } from "../../../config/environment";
import {
  chatWithFlow,
  type FlowChatMessage,
  type FlowChatResponse,
} from "../../../data/api/flowClient";
import { Button } from "../../../shared/components/Button";
import { Card } from "../../../shared/components/Card";
import { Icon } from "../../../shared/components/Icon";
import { InlineAlert } from "../../../shared/components/InlineAlert";
import { PageHeader } from "../../../shared/components/PageHeader";

interface ChatEntry extends FlowChatMessage {
  id: string;
  toolResults?: FlowChatResponse["toolResults"];
}

const suggestedPrompts = ["Show my food expenses this month", "Summarize this month"];

const previewItems = [
  {
    description: "Clear summaries based only on finance data you authorize.",
    icon: "chart",
    title: "Personalized insights",
  },
  {
    description: "Practical read-only explanations for spending, budgets, and goals.",
    icon: "goal",
    title: "Finance guidance",
  },
  {
    description: "Helpful notices for budgets, goals, and unusual activity.",
    icon: "bell",
    title: "Smart alerts",
  },
  {
    description: "Plain-language questions and explanations about your finances.",
    icon: "feedback",
    title: "Natural conversations",
  },
] as const;

function createEntry(role: ChatEntry["role"], content: string): ChatEntry {
  return {
    content,
    id: crypto.randomUUID(),
    role,
  };
}

function summarizeToolResult(result: unknown) {
  if (Array.isArray(result)) {
    if (result.length === 0) return "No matching records found.";

    return `${result.length} matching item${result.length === 1 ? "" : "s"} found.`;
  }

  if (typeof result === "object" && result !== null && "totals" in result) {
    return "Monthly summary is ready below.";
  }

  return "Tool result returned.";
}

function formatDecimalMoney(amount: string | undefined, currency: string | undefined) {
  const numericAmount = Number(amount ?? "0");

  return new Intl.NumberFormat("en-IN", {
    currency: currency ?? "INR",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(Number.isFinite(numericAmount) ? numericAmount : 0);
}

function getToolTitle(name: string) {
  if (name === "flow.summarizeMonth") return "This month";
  if (name === "flow.searchTransactions") return "Matching transactions";
  return "Flow result";
}

function formatToolResult(result: unknown) {
  if (Array.isArray(result)) {
    return result.slice(0, 5).map((item, index) => {
      const record = item as Partial<{
        accountName: string;
        amount: string;
        categoryName: string | null;
        currency: string;
        date: string;
        note: string | null;
        type: string;
      }>;

      return (
        <li key={`${record.date ?? "result"}-${index}`}>
          <strong>
            {record.type} {record.currency} {record.amount}
          </strong>
          <span>
            {record.categoryName ?? "Uncategorized"} · {record.accountName} · {record.date}
          </span>
          {record.note ? <small>{record.note}</small> : null}
        </li>
      );
    });
  }

  if (typeof result === "object" && result !== null && "totals" in result) {
    const report = result as {
      currency?: string;
      spendingByCategory?: Array<{
        amountMinor?: string;
        categoryName?: string;
        transactionCount?: number;
      }>;
      totals?: {
        expenseMinor?: string;
        incomeMinor?: string;
        netSavingsMinor?: string;
        transactionCount?: number;
      };
    };
    const topCategories = report.spendingByCategory?.slice(0, 3) ?? [];

    return (
      <li className="flow-summary-card">
        <div className="flow-summary-grid">
          <span>
            <small>Income</small>
            <strong>{formatDecimalMoney(report.totals?.incomeMinor, report.currency)}</strong>
          </span>
          <span>
            <small>Spent</small>
            <strong>{formatDecimalMoney(report.totals?.expenseMinor, report.currency)}</strong>
          </span>
          <span>
            <small>Saved</small>
            <strong>{formatDecimalMoney(report.totals?.netSavingsMinor, report.currency)}</strong>
          </span>
        </div>
        <p>{report.totals?.transactionCount ?? 0} transactions counted for this month.</p>
        {topCategories.length > 0 ? (
          <div className="flow-category-chips" aria-label="Top spending categories">
            {topCategories.map((category) => (
              <span key={category.categoryName ?? "uncategorized"}>
                {category.categoryName ?? "Uncategorized"}
                <strong>{formatDecimalMoney(category.amountMinor, report.currency)}</strong>
              </span>
            ))}
          </div>
        ) : null}
      </li>
    );
  }

  return <li>{summarizeToolResult(result)}</li>;
}

export function FlowPage() {
  const { accessToken, isAuthenticated, user, workspaces } = useAuth();
  const [email, setEmail] = useState("");
  const [subscribeState, setSubscribeState] = useState<"error" | "idle" | "saved" | "saving">(
    "idle",
  );
  const [input, setInput] = useState("");
  const [chatState, setChatState] = useState<"error" | "idle" | "sending">("idle");
  const [chatEntries, setChatEntries] = useState<ChatEntry[]>([
    createEntry(
      "assistant",
      "Ask me to search transactions or explain this month. Flow is read-only right now.",
    ),
  ]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const primaryWorkspace = workspaces[0] ?? null;
  const canChat = Boolean(isAuthenticated && accessToken && primaryWorkspace);
  const conversation = useMemo<FlowChatMessage[]>(
    () =>
      chatEntries
        .filter((entry) => entry.role === "assistant" || entry.role === "user")
        .slice(-12)
        .map(({ content, role }) => ({ content, role })),
    [chatEntries],
  );

  async function handleNotifySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubscribeState("saving");

    try {
      const response = await trackApiRequest(async () =>
        fetch(`${environment.NIDHIFLOW_API_BASE_URL}/api/v1/flow-launch-subscriptions`, {
          body: JSON.stringify({ email }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        }),
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

  async function sendMessage(content: string) {
    if (!accessToken || !primaryWorkspace || chatState === "sending") return;

    const trimmed = content.trim();

    if (!trimmed) return;

    const userEntry = createEntry("user", trimmed);
    const nextConversation = [...conversation, { content: trimmed, role: "user" as const }].slice(
      -12,
    );

    setInput("");
    setChatState("sending");
    setChatEntries((current) => [...current, userEntry]);

    try {
      const response = await chatWithFlow({
        accessToken,
        messages: nextConversation,
        workspaceId: primaryWorkspace.id,
      });

      setChatEntries((current) => [
        ...current,
        {
          ...createEntry("assistant", response.message),
          toolResults: response.toolResults,
        },
      ]);
      setChatState("idle");
    } catch {
      setChatState("error");
    } finally {
      inputRef.current?.focus();
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
  }

  if (!environment.FLOW_AI_ENABLED) {
    return (
      <main className="page page--flow" id="main-content">
        <PageHeader eyebrow="A preview of what is next" title="Flow" />

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

        <section className="flow-hero">
          <div aria-hidden="true" className="flow-orb">
            <Icon name="flow" size={58} />
          </div>
          <p className="eyebrow">Phase 2</p>
          <h2>Thoughtful finance help is coming soon.</h2>
          <p>
            Flow will explain patterns and answer finance questions. It will stay inside NidhiFlow's
            read-only assistant scope until the feature is ready.
          </p>
        </section>

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

  return (
    <main className="page page--flow flow-chat-page" id="main-content">
      <PageHeader
        eyebrow={canChat ? "Phase 2 prototype" : "A preview of what is next"}
        title="Flow"
      />

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
      {chatState === "error" ? (
        <InlineAlert title="Flow is unavailable">
          Check that Ollama is running, `llama3.2:3b` is installed, and `FLOW_AI_ENABLED=true` is
          set for the backend.
        </InlineAlert>
      ) : null}

      {!canChat ? (
        <>
          <section className="flow-hero">
            <div aria-hidden="true" className="flow-orb">
              <Icon name="flow" size={58} />
            </div>
            <p className="eyebrow">Phase 2</p>
            <h2>Chat with Flow after signing in.</h2>
            <p>
              Personalized Flow chat uses your authorized workspace data. Guest mode stays read-only
              and does not upload local finance data.
            </p>
            <div className="confirmation-actions">
              <Link className="button button--primary" to="/login">
                Log in
              </Link>
              <Link className="button button--secondary" to="/signup">
                Sign up
              </Link>
            </div>
          </section>

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
        </>
      ) : (
        <section aria-label="Flow chat" className="flow-chat-shell">
          <div className="flow-chat-thread" role="log">
            {chatEntries.map((entry) => (
              <article className={`flow-message flow-message--${entry.role}`} key={entry.id}>
                <span className="flow-message__avatar" aria-hidden="true">
                  <Icon name={entry.role === "assistant" ? "flow" : "user"} size={18} />
                </span>
                <div className="flow-message__body">
                  <p>{entry.content}</p>
                  {entry.toolResults?.length ? (
                    <div className="flow-tool-results">
                      {entry.toolResults.map((toolResult) => (
                        <section key={toolResult.name}>
                          <strong>{getToolTitle(toolResult.name)}</strong>
                          <ul>{formatToolResult(toolResult.result)}</ul>
                        </section>
                      ))}
                    </div>
                  ) : null}
                </div>
              </article>
            ))}
            {chatState === "sending" ? (
              <article className="flow-message flow-message--assistant" aria-live="polite">
                <span className="flow-message__avatar" aria-hidden="true">
                  <Icon name="flow" size={18} />
                </span>
                <div className="flow-message__body">
                  <p>Flow is thinking...</p>
                </div>
              </article>
            ) : null}
          </div>

          <div className="flow-prompt-chips" aria-label="Suggested prompts">
            {suggestedPrompts.map((prompt) => (
              <button key={prompt} onClick={() => void sendMessage(prompt)} type="button">
                {prompt}
              </button>
            ))}
          </div>

          <form className="flow-composer" onSubmit={handleSubmit}>
            <label className="sr-only" htmlFor="flow-chat-input">
              Message Flow
            </label>
            <textarea
              id="flow-chat-input"
              onChange={(event) => setInput(event.target.value)}
              placeholder={`Message Flow as ${user?.displayName ?? "you"}`}
              ref={inputRef}
              rows={2}
              value={input}
            />
            <Button disabled={chatState === "sending" || input.trim().length === 0} type="submit">
              <Icon name="arrow" size={20} />
              Send
            </Button>
          </form>
        </section>
      )}
    </main>
  );
}
