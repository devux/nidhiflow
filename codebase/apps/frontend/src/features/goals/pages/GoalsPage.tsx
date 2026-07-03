import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { useAuth } from "../../../app/providers/AuthProvider";
import { useGuestPreferences } from "../../../app/providers/GuestPreferencesProvider";
import {
  archiveGoal,
  createGoal,
  createGoalContribution,
  listGoals,
  updateGoal,
  type GoalResource,
} from "../../../data/api/financeClient";
import { formatMoney, parseMoneyInput } from "../../../domain/money/money";
import type { SupportedCurrency } from "../../../domain/preferences/guestPreferences";
import { Button } from "../../../shared/components/Button";
import { Card } from "../../../shared/components/Card";
import { EmptyState } from "../../../shared/components/EmptyState";
import { Icon } from "../../../shared/components/Icon";
import { PageHeader } from "../../../shared/components/PageHeader";

type GoalEditor = "contribute" | "create" | "edit" | null;

function decimalToMinor(amount: string) {
  const [whole = "0", fraction = ""] = amount.split(".");
  return (BigInt(whole) * 100n + BigInt(`${fraction}00`.slice(0, 2))).toString();
}

function dateOnly(value: string | null) {
  return value?.slice(0, 10) ?? "";
}

export function GoalsPage() {
  const { accessToken, activeWorkspace, isAuthenticated } = useAuth();
  const { preferences } = useGuestPreferences();
  const [searchParams] = useSearchParams();
  const initialType = searchParams.get("type") === "debt" ? "debt" : "savings";
  const [goals, setGoals] = useState<GoalResource[]>([]);
  const [loadState, setLoadState] = useState<"error" | "loading" | "ready">("loading");
  const [editor, setEditor] = useState<GoalEditor>(null);
  const [selectedGoal, setSelectedGoal] = useState<GoalResource | null>(null);
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [goalType, setGoalType] = useState<"debt" | "savings">(initialType);
  const [contributionAmount, setContributionAmount] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const currency: SupportedCurrency = activeWorkspace?.reportingCurrency ?? preferences.currency;

  const load = useCallback(async () => {
    if (!accessToken || !activeWorkspace) {
      setGoals([]);
      setLoadState("ready");
      return;
    }
    setLoadState("loading");
    try {
      setGoals(await listGoals({ accessToken, workspaceId: activeWorkspace.id }));
      setLoadState("ready");
    } catch {
      setLoadState("error");
    }
  }, [accessToken, activeWorkspace]);

  useEffect(() => {
    void load();
  }, [load]);

  const activeGoals = useMemo(() => goals.filter((goal) => goal.status === "active"), [goals]);
  const completedGoals = useMemo(
    () => goals.filter((goal) => goal.status === "completed"),
    [goals],
  );

  function openCreate() {
    setSelectedGoal(null);
    setName("");
    setTargetAmount("");
    setTargetDate("");
    setGoalType(initialType);
    setFormError("");
    setEditor("create");
  }

  function openEdit(goal: GoalResource) {
    setSelectedGoal(goal);
    setName(goal.name);
    setTargetAmount(goal.targetAmount);
    setTargetDate(dateOnly(goal.targetDate));
    setGoalType(goal.type);
    setFormError("");
    setEditor("edit");
  }

  function openContribution(goal: GoalResource) {
    setSelectedGoal(goal);
    setContributionAmount("");
    setFormError("");
    setEditor("contribute");
  }

  async function saveGoal(event: FormEvent) {
    event.preventDefault();
    if (!accessToken || !activeWorkspace) return;
    const money = parseMoneyInput(targetAmount, currency);
    if (!name.trim() || !money) {
      setFormError("Enter a name and a positive target amount.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const input = {
        accessToken,
        currency,
        name: name.trim(),
        targetAmount,
        ...(targetDate ? { targetDate } : {}),
        type: goalType,
        workspaceId: activeWorkspace.id,
      };
      if (selectedGoal) {
        await updateGoal({ ...input, goalId: selectedGoal.id });
      } else {
        await createGoal(input);
      }
      setEditor(null);
      await load();
    } catch {
      setFormError("The goal could not be saved. Check the values and try again.");
    } finally {
      setSaving(false);
    }
  }

  async function contribute(event: FormEvent) {
    event.preventDefault();
    if (!accessToken || !activeWorkspace || !selectedGoal) return;
    const money = parseMoneyInput(contributionAmount, selectedGoal.currency);
    if (!money) {
      setFormError("Enter a positive contribution amount.");
      return;
    }
    setSaving(true);
    try {
      await createGoalContribution({
        accessToken,
        amount: contributionAmount,
        contributionDate: new Date().toISOString().slice(0, 10),
        currency: selectedGoal.currency,
        goalId: selectedGoal.id,
        workspaceId: activeWorkspace.id,
      });
      setEditor(null);
      await load();
    } catch {
      setFormError("The contribution could not be added.");
    } finally {
      setSaving(false);
    }
  }

  async function removeGoal(goal: GoalResource) {
    if (!accessToken || !activeWorkspace) return;
    if (!window.confirm(`Archive ${goal.name}? Its history will be preserved.`)) return;
    await archiveGoal({ accessToken, goalId: goal.id, workspaceId: activeWorkspace.id });
    setEditor(null);
    await load();
  }

  async function markComplete(goal: GoalResource) {
    if (!accessToken || !activeWorkspace) return;
    await updateGoal({
      accessToken,
      currency: goal.currency,
      goalId: goal.id,
      name: goal.name,
      status: "completed",
      targetAmount: goal.targetAmount,
      ...(goal.targetDate ? { targetDate: dateOnly(goal.targetDate) } : {}),
      type: goal.type,
      workspaceId: activeWorkspace.id,
    });
    await load();
  }

  const goalCard = (goal: GoalResource) => {
    const progress = Math.max(0, Math.min(100, Number(goal.progressPercent)));
    return (
      <Card className="goal-card" key={goal.id}>
        <button className="goal-card__main" onClick={() => openEdit(goal)} type="button">
          <span className={`goal-card__icon goal-card__icon--${goal.type}`}>
            <Icon name={goal.type === "debt" ? "liability" : "goal"} />
          </span>
          <span className="goal-card__copy">
            <strong>{goal.name}</strong>
            <small>
              {formatMoney(
                { amountMinor: decimalToMinor(goal.fundedAmount), currency: goal.currency },
                preferences.locale,
              )}{" "}
              of{" "}
              {formatMoney(
                { amountMinor: decimalToMinor(goal.targetAmount), currency: goal.currency },
                preferences.locale,
              )}
            </small>
            <span className="goal-card__track">
              <span style={{ width: `${progress}%` }} />
            </span>
          </span>
          <span className="goal-card__percent">{Math.round(progress)}%</span>
          <Icon name="chevron" size={18} />
        </button>
        {goal.status === "active" ? (
          <div className="goal-card__actions">
            <Button onClick={() => openContribution(goal)} variant="quiet">
              Add contribution
            </Button>
            {progress >= 100 ? (
              <Button onClick={() => void markComplete(goal)} variant="quiet">
                Mark complete
              </Button>
            ) : null}
          </div>
        ) : null}
      </Card>
    );
  };

  if (!isAuthenticated) {
    return (
      <main className="page page--goals" id="main-content">
        <PageHeader title="Goals" />
        <Card>
          <EmptyState
            action={
              <Link className="button button--primary" to="/login">
                Log in
              </Link>
            }
            description="Goals are shared workspace records. Log in to create and track them."
            icon="goal"
            title="Plan securely with an account"
          />
        </Card>
      </main>
    );
  }

  return (
    <main className="page page--goals" id="main-content">
      <PageHeader
        action={
          <button
            aria-label="Add goal"
            className="icon-button icon-button--flat"
            onClick={openCreate}
          >
            <Icon name="plus" />
          </button>
        }
        title="Goals"
      />
      {loadState === "loading" ? <Card className="liabilities-loading">Loading goals…</Card> : null}
      {loadState === "error" ? (
        <Card className="liabilities-error" role="alert">
          <div>
            <h2>Goals could not be loaded</h2>
            <p>Try again when your connection is available.</p>
          </div>
          <Button onClick={() => void load()} variant="secondary">
            Try again
          </Button>
        </Card>
      ) : null}
      {loadState === "ready" && goals.length === 0 ? (
        <Card>
          <EmptyState
            action={<Button onClick={openCreate}>Create goal</Button>}
            description="Create a savings or debt-repayment goal and add contributions over time."
            icon="goal"
            title="No goals yet"
          />
        </Card>
      ) : null}
      {activeGoals.length > 0 ? (
        <section aria-labelledby="active-goals-title">
          <div className="section-heading">
            <h2 id="active-goals-title">Active goals</h2>
          </div>
          <div className="goal-list">{activeGoals.map(goalCard)}</div>
        </section>
      ) : null}
      {completedGoals.length > 0 ? (
        <section aria-labelledby="completed-goals-title">
          <div className="section-heading">
            <h2 id="completed-goals-title">Completed goals</h2>
          </div>
          <div className="goal-list">{completedGoals.map(goalCard)}</div>
        </section>
      ) : null}

      <Dialog
        fullWidth
        maxWidth="xs"
        onClose={() => setEditor(null)}
        open={editor !== null}
        slotProps={{ paper: { className: "profile-dialog finance-editor-dialog" } }}
      >
        <DialogTitle>
          {editor === "contribute"
            ? `Contribute to ${selectedGoal?.name ?? "goal"}`
            : selectedGoal
              ? "Edit goal"
              : "Create goal"}
        </DialogTitle>
        <IconButton
          aria-label="Close"
          className="profile-dialog__close"
          onClick={() => setEditor(null)}
        >
          <CloseRoundedIcon />
        </IconButton>
        <DialogContent>
          {editor === "contribute" ? (
            <form className="finance-editor-form" onSubmit={(event) => void contribute(event)}>
              <label>
                Amount
                <input
                  autoFocus
                  inputMode="decimal"
                  onChange={(event) => setContributionAmount(event.target.value)}
                  placeholder="0.00"
                  value={contributionAmount}
                />
              </label>
              {formError ? (
                <p className="form-error" role="alert">
                  {formError}
                </p>
              ) : null}
              <Button disabled={saving} fullWidth type="submit">
                {saving ? "Adding…" : "Add contribution"}
              </Button>
            </form>
          ) : (
            <form className="finance-editor-form" onSubmit={(event) => void saveGoal(event)}>
              <label>
                Name
                <input
                  autoFocus
                  maxLength={80}
                  onChange={(event) => setName(event.target.value)}
                  value={name}
                />
              </label>
              <label>
                Goal type
                <select
                  onChange={(event) => setGoalType(event.target.value as "debt" | "savings")}
                  value={goalType}
                >
                  <option value="savings">Savings</option>
                  <option value="debt">Debt repayment</option>
                </select>
              </label>
              <label>
                Target amount
                <input
                  inputMode="decimal"
                  onChange={(event) => setTargetAmount(event.target.value)}
                  placeholder="0.00"
                  value={targetAmount}
                />
              </label>
              <label>
                Target date (optional)
                <input
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(event) => setTargetDate(event.target.value)}
                  type="date"
                  value={targetDate}
                />
              </label>
              {formError ? (
                <p className="form-error" role="alert">
                  {formError}
                </p>
              ) : null}
              <Button disabled={saving} fullWidth type="submit">
                {saving ? "Saving…" : "Save goal"}
              </Button>
              {selectedGoal ? (
                <Button fullWidth onClick={() => void removeGoal(selectedGoal)} variant="quiet">
                  Archive goal
                </Button>
              ) : null}
            </form>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
