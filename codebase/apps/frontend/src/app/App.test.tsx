import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { axe } from "jest-axe";

import type { GuestPreferencesRepository } from "../data/guest/guestPreferencesRepository";
import type { GuestTransactionRepository } from "../data/guest/guestTransactionRepository";
import type { GuestPreferences } from "../domain/preferences/guestPreferences";
import type { GuestTransaction, GuestTransactionInput } from "../domain/transactions/transaction";
import { App } from "./App";

function createJsonResponse(body: unknown, ok = true, status = ok ? 200 : 500): Response {
  return {
    json: jest.fn(() => Promise.resolve(body)),
    ok,
    status,
  } as unknown as Response;
}

function getRequestUrl(input: Parameters<typeof fetch>[0]): string {
  if (typeof input === "string") {
    return input;
  }

  if (input instanceof URL) {
    return input.toString();
  }

  return input.url;
}

function getRequestBody(init?: RequestInit): string {
  return typeof init?.body === "string" ? init.body : "{}";
}

function toApiDateTimestamp(dateOnly: string): string {
  return new Date(`${dateOnly}T00:00:00+05:30`).toISOString();
}

function toLocalDateOnly(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

const defaultPreferences: GuestPreferences = {
  currency: "USD",
  displayName: "Guest",
  locale: "en-US",
  migratedTransactionIds: [],
  reminderEnabled: true,
  reminderRepeatEnabled: false,
  theme: "system",
  timezone: "UTC",
};

async function expectHomeHeader(): Promise<void> {
  expect(await screen.findByRole("link", { name: "Notifications" })).toBeDefined();
  expect(screen.getByLabelText("NidhiFlow")).toBeDefined();
}

function createRepository(
  preferences: GuestPreferences = defaultPreferences,
): GuestPreferencesRepository & { save: jest.Mock } {
  return {
    load: jest.fn(() => Promise.resolve(preferences)),
    save: jest.fn(() => Promise.resolve()),
  };
}

function createTransactionRepository(
  initialTransactions: GuestTransaction[] = [],
): GuestTransactionRepository {
  let transactions = [...initialTransactions];

  return {
    create: jest.fn((input: GuestTransactionInput) => {
      const now = new Date().toISOString();
      const transaction: GuestTransaction = {
        ...input,
        createdAt: now,
        id: `transaction-${transactions.length + 1}`,
        updatedAt: now,
      };
      transactions = [transaction, ...transactions];
      return Promise.resolve(transaction);
    }),
    findById: jest.fn((id: string) =>
      Promise.resolve(transactions.find((transaction) => transaction.id === id)),
    ),
    list: jest.fn(() => Promise.resolve([...transactions])),
    remove: jest.fn((id: string) => {
      transactions = transactions.filter((transaction) => transaction.id !== id);
      return Promise.resolve();
    }),
    update: jest.fn((id: string, input: GuestTransactionInput) => {
      const existing = transactions.find((transaction) => transaction.id === id);
      if (!existing) return Promise.reject(new Error("Not found"));
      const updated = {
        ...existing,
        ...input,
        updatedAt: new Date().toISOString(),
      };
      transactions = transactions.map((transaction) =>
        transaction.id === id ? updated : transaction,
      );
      return Promise.resolve(updated);
    }),
  };
}

function mockAuthenticatedFinanceSession(
  fetchMock: jest.MockedFunction<typeof fetch>,
  options: {
    accounts?: Array<Record<string, unknown>>;
    budgets?: Array<Record<string, unknown>>;
    categories?: Array<Record<string, unknown>>;
    failAccountCreateAsConflict?: boolean;
    failFirstBudgetCreateAsUnauthenticated?: boolean;
    goals?: Array<Record<string, unknown>>;
    loanPayments?: Array<Record<string, unknown>>;
    notifications?: Array<Record<string, unknown>>;
    reportingCurrency?: string;
    transactions?: unknown[];
  } = {},
) {
  let accounts = [
    ...(options.accounts ?? [
      {
        currency: "USD",
        id: "acc_cash",
        isArchived: false,
        name: "Cash",
        type: "cash",
      },
    ]),
  ];
  let budgets = [...(options.budgets ?? [])];
  let goals = [...(options.goals ?? [])];
  let categories = [
    ...(options.categories ?? [
      {
        id: "cat_salary",
        isArchived: false,
        isSystem: true,
        name: "Salary",
        transactionType: "income",
        workspaceId: null,
      },
      {
        id: "cat_freelance",
        isArchived: false,
        isSystem: true,
        name: "Freelance",
        transactionType: "income",
        workspaceId: null,
      },
      {
        id: "cat_business",
        isArchived: false,
        isSystem: true,
        name: "Business",
        transactionType: "income",
        workspaceId: null,
      },
      {
        id: "cat_interest",
        isArchived: false,
        isSystem: true,
        name: "Interest",
        transactionType: "income",
        workspaceId: null,
      },
      {
        id: "cat_food",
        isArchived: false,
        isSystem: true,
        name: "Food",
        transactionType: "expense",
        workspaceId: null,
      },
      {
        id: "cat_shopping",
        isArchived: false,
        isSystem: true,
        name: "Shopping",
        transactionType: "expense",
        workspaceId: null,
      },
      {
        id: "cat_transport",
        isArchived: false,
        isSystem: true,
        name: "Transport",
        transactionType: "expense",
        workspaceId: null,
      },
      {
        id: "cat_bills",
        isArchived: false,
        isSystem: true,
        name: "Bills",
        transactionType: "expense",
        workspaceId: null,
      },
      {
        id: "cat_entertainment",
        isArchived: false,
        isSystem: true,
        name: "Entertainment",
        transactionType: "expense",
        workspaceId: null,
      },
      {
        id: "cat_health",
        isArchived: false,
        isSystem: true,
        name: "Health",
        transactionType: "expense",
        workspaceId: null,
      },
      {
        id: "cat_education",
        isArchived: false,
        isSystem: true,
        name: "Education",
        transactionType: "expense",
        workspaceId: null,
      },
      {
        id: "cat_travel",
        isArchived: false,
        isSystem: true,
        name: "Travel",
        transactionType: "expense",
        workspaceId: null,
      },
      {
        id: "cat_home",
        isArchived: false,
        isSystem: true,
        name: "Home",
        transactionType: "expense",
        workspaceId: null,
      },
      {
        id: "cat_misc",
        isArchived: false,
        isSystem: true,
        name: "Misc",
        transactionType: "expense",
        workspaceId: null,
      },
    ]),
  ];
  let notifications = [...(options.notifications ?? [])];
  let loanPayments = [...(options.loanPayments ?? [])];
  let hasRejectedBudgetCreate = false;
  const reportingCurrency = options.reportingCurrency ?? "USD";
  let profile = {
    displayName: "Nila",
    email: "nila@example.com",
    id: "usr_finance",
    locale: "en-US",
    preferredCurrency: "USD",
    theme: "system",
    timezone: "UTC",
  };

  fetchMock.mockImplementation((input, init) => {
    const url = getRequestUrl(input);
    const method = init?.method ?? "GET";

    if (url.endsWith("/api/v1/auth/refresh") && method === "POST") {
      return Promise.resolve(
        createJsonResponse({
          data: { accessToken: "access-token-finance" },
          message: "Session refreshed successfully.",
          success: true,
        }),
      );
    }

    if (url.endsWith("/api/v1/users/me") && method === "GET") {
      return Promise.resolve(
        createJsonResponse({
          data: profile,
          message: "Current user retrieved successfully.",
          success: true,
        }),
      );
    }

    if (url.endsWith("/api/v1/users/me") && method === "PATCH") {
      profile = { ...profile, ...(JSON.parse(getRequestBody(init)) as Partial<typeof profile>) };
      return Promise.resolve(
        createJsonResponse({
          data: profile,
          message: "Profile updated successfully.",
          success: true,
        }),
      );
    }

    if (url.endsWith("/api/v1/workspaces") && method === "GET") {
      return Promise.resolve(
        createJsonResponse({
          data: [
            {
              id: "wsp_finance",
              name: "Nila",
              reportingCurrency,
              type: "personal",
            },
          ],
          message: "Workspaces retrieved successfully.",
          success: true,
        }),
      );
    }

    if (url.endsWith("/api/v1/workspaces/wsp_finance/categories") && method === "GET") {
      return Promise.resolve(
        createJsonResponse({
          data: categories,
          message: "Categories retrieved successfully.",
          success: true,
        }),
      );
    }

    if (url.endsWith("/api/v1/workspaces/wsp_finance/categories") && method === "POST") {
      const body = JSON.parse(getRequestBody(init)) as {
        name: string;
        transactionType: "expense" | "income";
      };
      const category = {
        id: `cat_custom_${categories.length + 1}`,
        isArchived: false,
        isSystem: false,
        name: body.name,
        transactionType: body.transactionType,
        workspaceId: "wsp_finance",
      };
      categories = [...categories, category];
      return Promise.resolve(
        createJsonResponse({
          data: category,
          message: "Category created successfully.",
          success: true,
        }),
      );
    }

    const categoryMatch = /\/api\/v1\/workspaces\/wsp_finance\/categories\/([^/]+)$/.exec(url);
    if (categoryMatch && method === "PATCH") {
      const body = JSON.parse(getRequestBody(init)) as {
        name: string;
        transactionType: "expense" | "income";
      };
      const category = {
        ...(categories.find((item) => item.id === categoryMatch[1]) ?? {}),
        isArchived: false,
        isSystem: false,
        name: body.name,
        transactionType: body.transactionType,
        workspaceId: "wsp_finance",
      };
      categories = categories.map((item) => (item.id === categoryMatch[1] ? category : item));
      return Promise.resolve(
        createJsonResponse({
          data: category,
          message: "Category updated successfully.",
          success: true,
        }),
      );
    }

    if (categoryMatch && method === "DELETE") {
      const category = categories.find((item) => item.id === categoryMatch[1]);
      categories = categories.filter((item) => item.id !== categoryMatch[1]);
      return Promise.resolve(
        createJsonResponse({
          data: { ...category, isArchived: true },
          message: "Category archived successfully.",
          success: true,
        }),
      );
    }

    if (url.endsWith("/api/v1/notifications") && method === "GET") {
      return Promise.resolve(
        createJsonResponse({
          data: notifications,
          message: "Notifications retrieved successfully.",
          success: true,
        }),
      );
    }

    const notificationReadMatch = /\/api\/v1\/notifications\/([^/]+)\/read$/.exec(url);
    if (notificationReadMatch && method === "PATCH") {
      const notification = {
        ...(notifications.find((item) => item.id === notificationReadMatch[1]) ?? {}),
        readAt: "2026-07-04T12:00:00.000Z",
      };
      notifications = notifications.map((item) =>
        item.id === notificationReadMatch[1] ? notification : item,
      );
      return Promise.resolve(
        createJsonResponse({
          data: notification,
          message: "Notification marked read.",
          success: true,
        }),
      );
    }

    if (url.endsWith("/api/v1/notifications/read-all") && method === "POST") {
      notifications = notifications.map((notification) => ({
        ...notification,
        readAt: notification.readAt ?? "2026-07-04T12:00:00.000Z",
      }));
      return Promise.resolve(
        createJsonResponse({
          data: { markedRead: notifications.length },
          message: "Notifications marked read.",
          success: true,
        }),
      );
    }

    if (url.endsWith("/api/v1/workspaces/wsp_finance/accounts") && method === "GET") {
      return Promise.resolve(
        createJsonResponse({
          data: accounts,
          message: "Accounts retrieved successfully.",
          success: true,
        }),
      );
    }

    if (url.endsWith("/api/v1/workspaces/wsp_finance/accounts/summary") && method === "GET") {
      return Promise.resolve(
        createJsonResponse({
          data: {
            accounts,
            assetTotalMinor: "0",
            liabilityTotalMinor: "0",
            netWorthMinor: "0",
          },
          message: "Account summary retrieved successfully.",
          success: true,
        }),
      );
    }

    const loanPaymentsMatch =
      /\/api\/v1\/workspaces\/wsp_finance\/accounts\/([^/]+)\/payments$/.exec(url);
    if (loanPaymentsMatch && method === "GET") {
      return Promise.resolve(
        createJsonResponse({
          data: loanPayments.filter((payment) => payment.accountId === loanPaymentsMatch[1]),
          message: "Loan payments retrieved successfully.",
          success: true,
        }),
      );
    }
    if (loanPaymentsMatch && method === "POST") {
      const body = JSON.parse(getRequestBody(init)) as {
        amount: { amount: string; currency: string };
        paymentDate: string;
      };
      const payment = {
        accountId: loanPaymentsMatch[1],
        amount: body.amount.amount,
        createdAt: "2026-07-06T10:00:00.000Z",
        createdByUserId: "usr_finance",
        currency: body.amount.currency,
        id: `lpy_${loanPayments.length + 1}`,
        paymentDate: body.paymentDate,
        updatedAt: "2026-07-06T10:00:00.000Z",
      };
      loanPayments = [payment, ...loanPayments];
      accounts = accounts.map((account) =>
        account.id === loanPaymentsMatch[1]
          ? {
              ...account,
              currentBalance: (
                Number(account.currentBalance ?? account.openingBalance ?? 0) -
                Number(body.amount.amount)
              ).toFixed(2),
            }
          : account,
      );
      return Promise.resolve(
        createJsonResponse(
          {
            data: payment,
            message: "Loan payment recorded successfully.",
            success: true,
          },
          true,
          201,
        ),
      );
    }

    if (url.endsWith("/api/v1/workspaces/wsp_finance/accounts") && method === "POST") {
      if (options.failAccountCreateAsConflict) {
        return Promise.resolve(
          createJsonResponse(
            {
              error: { code: "CONFLICT" },
              message: "An active account with this name already exists.",
              success: false,
            },
            false,
            409,
          ),
        );
      }

      const body = JSON.parse(getRequestBody(init)) as {
        currency: string;
        name: string;
        openingBalance: { amount: string };
        type: string;
      };
      const account = {
        currency: body.currency,
        currentBalance: body.openingBalance.amount,
        id: `acc_${accounts.length + 1}`,
        isArchived: false,
        name: body.name,
        openingBalance: body.openingBalance.amount,
        type: body.type,
      };
      accounts = [...accounts, account];

      return Promise.resolve(
        createJsonResponse({
          data: account,
          message: "Account created successfully.",
          success: true,
        }),
      );
    }

    const restoreAccountMatch =
      /\/api\/v1\/workspaces\/wsp_finance\/accounts\/([^/]+)\/restore$/.exec(url);

    if (restoreAccountMatch && method === "POST") {
      const accountId = restoreAccountMatch[1];
      const account = accounts.find((item) => item.id === accountId);

      if (!account) {
        return Promise.resolve(
          createJsonResponse(
            {
              error: { code: "NOT_FOUND" },
              message: "The requested resource was not found.",
              success: false,
            },
            false,
            404,
          ),
        );
      }

      const restoredAccount = { ...account, isArchived: false };
      accounts = accounts.map((item) => (item.id === accountId ? restoredAccount : item));

      return Promise.resolve(
        createJsonResponse({
          data: restoredAccount,
          message: "Account restored successfully.",
          success: true,
        }),
      );
    }

    const accountMatch = /\/api\/v1\/workspaces\/wsp_finance\/accounts\/([^/]+)$/.exec(url);

    if (accountMatch && method === "PATCH") {
      const accountId = accountMatch[1];
      const body = JSON.parse(getRequestBody(init)) as {
        currency: string;
        name: string;
        openingBalance: { amount: string };
        type: string;
      };
      const updatedAccount = {
        ...(accounts.find((item) => item.id === accountId) ?? {}),
        currency: body.currency,
        currentBalance: body.openingBalance.amount,
        id: accountId,
        isArchived: false,
        name: body.name,
        openingBalance: body.openingBalance.amount,
        type: body.type,
      };
      accounts = accounts.map((item) => (item.id === accountId ? updatedAccount : item));
      return Promise.resolve(
        createJsonResponse({
          data: updatedAccount,
          message: "Account updated successfully.",
          success: true,
        }),
      );
    }

    const archiveAccountMatch =
      /\/api\/v1\/workspaces\/wsp_finance\/accounts\/([^/]+)\/archive$/.exec(url);
    if (archiveAccountMatch && method === "POST") {
      const accountId = archiveAccountMatch[1];
      const archived = {
        ...(accounts.find((item) => item.id === accountId) ?? {}),
        isArchived: true,
      };
      accounts = accounts.map((item) => (item.id === accountId ? archived : item));
      return Promise.resolve(
        createJsonResponse({
          data: archived,
          message: "Account archived successfully.",
          success: true,
        }),
      );
    }

    if (url.endsWith("/api/v1/workspaces/wsp_finance/transactions") && method === "GET") {
      return Promise.resolve(
        createJsonResponse({
          data: options.transactions ?? [],
          message: "Transactions retrieved successfully.",
          success: true,
        }),
      );
    }

    if (url.endsWith("/api/v1/workspaces/wsp_finance/transactions") && method === "POST") {
      const body = JSON.parse(getRequestBody(init)) as {
        accountId: string;
        categoryId: string;
        money: { amount: string; currency: string };
        note?: string;
        transactionDate: string;
        type: "expense" | "income";
      };

      return Promise.resolve(
        createJsonResponse({
          data: {
            amount: body.money.amount,
            categoryId: body.categoryId,
            createdAt: "2026-06-19T00:00:00.000Z",
            currency: body.money.currency,
            id: "txn_created",
            note: body.note ?? "",
            transactionDate: body.transactionDate,
            type: body.type,
            updatedAt: "2026-06-19T00:00:00.000Z",
          },
          message: "Transaction created successfully.",
          success: true,
        }),
      );
    }

    if (url.endsWith("/api/v1/workspaces/wsp_finance/budgets") && method === "GET") {
      return Promise.resolve(
        createJsonResponse({
          data: budgets,
          message: "Budgets retrieved successfully.",
          success: true,
        }),
      );
    }

    if (url.endsWith("/api/v1/workspaces/wsp_finance/budgets") && method === "POST") {
      if (options.failFirstBudgetCreateAsUnauthenticated && !hasRejectedBudgetCreate) {
        hasRejectedBudgetCreate = true;
        return Promise.resolve(
          createJsonResponse(
            {
              error: { code: "UNAUTHENTICATED" },
              message: "Authentication is required for this resource.",
              success: false,
            },
            false,
            401,
          ),
        );
      }

      const body = JSON.parse(getRequestBody(init)) as {
        categoryId: string;
        limitAmount: { amount: string; currency: string };
        periodEnd: string;
        periodStart: string;
      };
      const budget = {
        categoryId: body.categoryId,
        currency: body.limitAmount.currency,
        deletedAt: null,
        id: `bgt_${budgets.length + 1}`,
        limitAmount: body.limitAmount.amount,
        periodEnd: toApiDateTimestamp(body.periodEnd),
        periodStart: toApiDateTimestamp(body.periodStart),
        progressPercent: "0",
        remainingAmount: body.limitAmount.amount,
        spentAmount: "0",
        updatedAt: "2026-06-18T00:00:00.000Z",
        workspaceId: "wsp_finance",
      };
      budgets = [...budgets, budget];

      return Promise.resolve(
        createJsonResponse({
          data: budget,
          message: "Budget created successfully.",
          success: true,
        }),
      );
    }

    if (url.endsWith("/api/v1/workspaces/wsp_finance/goals") && method === "GET") {
      return Promise.resolve(
        createJsonResponse({
          data: goals,
          message: "Goals retrieved successfully.",
          success: true,
        }),
      );
    }

    if (url.endsWith("/api/v1/workspaces/wsp_finance/goals") && method === "POST") {
      const body = JSON.parse(getRequestBody(init)) as {
        currency: string;
        name: string;
        targetAmount: { amount: string };
        targetDate?: string;
        type: "debt" | "savings";
      };
      const goal = {
        createdAt: "2026-07-03T00:00:00.000Z",
        currency: body.currency,
        fundedAmount: "0.0000",
        id: `goal_${goals.length + 1}`,
        name: body.name,
        progressPercent: "0",
        remainingAmount: body.targetAmount.amount,
        status: "active",
        targetAmount: body.targetAmount.amount,
        targetDate: body.targetDate ?? null,
        type: body.type,
        updatedAt: "2026-07-03T00:00:00.000Z",
        workspaceId: "wsp_finance",
      };
      goals = [...goals, goal];
      return Promise.resolve(
        createJsonResponse({ data: goal, message: "Goal created successfully.", success: true }),
      );
    }

    const goalMatch = /\/api\/v1\/workspaces\/wsp_finance\/goals\/([^/]+)$/.exec(url);
    if (goalMatch && method === "PATCH") {
      const goalId = goalMatch[1];
      const body = JSON.parse(getRequestBody(init)) as {
        currency: string;
        name: string;
        status?: "active" | "completed";
        targetAmount: { amount: string };
        targetDate?: string;
        type: "debt" | "savings";
      };
      let updatedGoal: Record<string, unknown> | undefined;
      goals = goals.map((goal) => {
        if (goal.id !== goalId) return goal;
        updatedGoal = {
          ...goal,
          currency: body.currency,
          name: body.name,
          status: body.status ?? goal.status,
          targetAmount: body.targetAmount.amount,
          targetDate: body.targetDate ?? goal.targetDate,
          type: body.type,
        };
        return updatedGoal;
      });
      return Promise.resolve(
        createJsonResponse({
          data: updatedGoal,
          message: "Goal updated successfully.",
          success: true,
        }),
      );
    }

    if (goalMatch && method === "DELETE") {
      const goalId = goalMatch[1];
      goals = goals.filter((goal) => goal.id !== goalId);
      return Promise.resolve(
        createJsonResponse({ data: null, message: "Goal archived successfully.", success: true }),
      );
    }

    const contributionMatch =
      /\/api\/v1\/workspaces\/wsp_finance\/goals\/([^/]+)\/contributions$/.exec(url);
    if (contributionMatch && method === "POST") {
      const goalId = contributionMatch[1];
      const body = JSON.parse(getRequestBody(init)) as {
        amount: { amount: string };
      };
      goals = goals.map((goal) =>
        goal.id === goalId
          ? {
              ...goal,
              fundedAmount: body.amount.amount,
              progressPercent: "25",
            }
          : goal,
      );
      return Promise.resolve(
        createJsonResponse({
          data: { id: "contribution_1" },
          message: "Goal contribution created successfully.",
          success: true,
        }),
      );
    }

    const budgetMatch = /\/api\/v1\/workspaces\/wsp_finance\/budgets\/([^/]+)$/.exec(url);

    if (budgetMatch && method === "PATCH") {
      const body = JSON.parse(getRequestBody(init)) as {
        categoryId: string;
        limitAmount: { amount: string; currency: string };
        periodEnd: string;
        periodStart: string;
      };
      const budgetId = budgetMatch[1];
      const updatedBudget = {
        categoryId: body.categoryId,
        currency: body.limitAmount.currency,
        deletedAt: null,
        id: budgetId,
        limitAmount: body.limitAmount.amount,
        periodEnd: toApiDateTimestamp(body.periodEnd),
        periodStart: toApiDateTimestamp(body.periodStart),
        progressPercent: "0",
        remainingAmount: body.limitAmount.amount,
        spentAmount: "0",
        updatedAt: "2026-06-18T00:00:00.000Z",
        workspaceId: "wsp_finance",
      };
      budgets = budgets.map((budget) => (budget.id === budgetId ? updatedBudget : budget));

      return Promise.resolve(
        createJsonResponse({
          data: updatedBudget,
          message: "Budget updated successfully.",
          success: true,
        }),
      );
    }

    if (budgetMatch && method === "DELETE") {
      const budgetId = budgetMatch[1];
      budgets = budgets.filter((budget) => budget.id !== budgetId);

      return Promise.resolve(
        createJsonResponse({
          data: { id: budgetId },
          message: "Budget archived successfully.",
          success: true,
        }),
      );
    }

    return Promise.reject(new Error(`Unexpected request: ${url}`));
  });
}

describe("App", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    window.sessionStorage.clear();
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      value: jest.fn(() => Promise.reject(new Error("No active test session."))),
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("shows signed-out visitors the public About page with account entry points", async () => {
    window.history.replaceState({}, "", "/");
    render(
      <App repository={createRepository()} transactionRepository={createTransactionRepository()} />,
    );

    expect(
      await screen.findByRole("heading", { name: "Money clarity, made simple." }),
    ).toBeDefined();
    expect(screen.getAllByRole("link", { name: /Log in|I already use NidhiFlow/ }).length).toBe(4);
    expect(screen.getAllByRole("link", { name: /Get started|Create your account/ }).length).toBe(3);
    expect(screen.queryByRole("navigation", { name: "Primary navigation" })).toBeNull();
    expect(screen.queryByText("Continue as guest")).toBeNull();
  });

  it("redirects signed-out protected routes to About", async () => {
    window.history.replaceState({}, "", "/pay");
    render(
      <App repository={createRepository()} transactionRepository={createTransactionRepository()} />,
    );

    expect(
      await screen.findByRole("heading", { name: "Money clarity, made simple." }),
    ).toBeDefined();
    expect(window.location.pathname).toBe("/");
    expect(screen.queryByRole("heading", { name: "Pay with UPI" })).toBeNull();
  });

  it("shows authenticated activity when API transactions include ISO timestamps", async () => {
    mockAuthenticatedFinanceSession(globalThis.fetch as jest.MockedFunction<typeof fetch>, {
      transactions: [
        {
          amount: "42.00",
          categoryId: "cat_food",
          createdAt: "2026-04-15T08:30:00.000Z",
          currency: "USD",
          id: "txn_iso_date",
          note: "Groceries",
          transactionDate: "2026-04-15T00:00:00.000Z",
          type: "expense",
          updatedAt: "2026-04-15T08:30:00.000Z",
        },
      ],
    });
    window.history.replaceState({}, "", "/activity");
    render(
      <App repository={createRepository()} transactionRepository={createTransactionRepository()} />,
    );

    expect(await screen.findByRole("heading", { name: "Activity" })).toBeDefined();
    expect(screen.getByText("Groceries")).toBeDefined();
    expect(screen.getByText("April 15")).toBeDefined();
  });

  it("renders the authenticated app shell while startup finance reads continue in parallel", async () => {
    const fetchMock = globalThis.fetch as jest.MockedFunction<typeof fetch>;
    let resolveCategories: ((response: Response) => void) | undefined;
    let resolveNotifications: ((response: Response) => void) | undefined;
    let resolveTransactions: ((response: Response) => void) | undefined;

    fetchMock.mockImplementation((input, init) => {
      const url = getRequestUrl(input);
      const method = init?.method ?? "GET";

      if (url.endsWith("/api/v1/auth/refresh") && method === "POST") {
        return Promise.resolve(
          createJsonResponse({
            data: { accessToken: "startup-token" },
            message: "Access token refreshed successfully.",
            success: true,
          }),
        );
      }
      if (url.endsWith("/api/v1/users/me")) {
        return Promise.resolve(
          createJsonResponse({
            data: {
              displayName: "Nila",
              email: "nila@example.com",
              id: "usr_startup",
              locale: "en-US",
              preferredCurrency: "USD",
              theme: "system",
              timezone: "UTC",
            },
            message: "Current user retrieved successfully.",
            success: true,
          }),
        );
      }
      if (url.endsWith("/api/v1/workspaces")) {
        return Promise.resolve(
          createJsonResponse({
            data: [{ id: "wsp_startup", name: "Nila", reportingCurrency: "USD", type: "personal" }],
            message: "Workspaces retrieved successfully.",
            success: true,
          }),
        );
      }
      if (url.endsWith("/api/v1/workspaces/wsp_startup/categories")) {
        return new Promise<Response>((resolve) => {
          resolveCategories = resolve;
        });
      }
      if (url.endsWith("/api/v1/workspaces/wsp_startup/transactions")) {
        return new Promise<Response>((resolve) => {
          resolveTransactions = resolve;
        });
      }
      if (url.endsWith("/api/v1/notifications")) {
        return new Promise<Response>((resolve) => {
          resolveNotifications = resolve;
        });
      }
      return Promise.reject(new Error(`Unexpected request: ${url}`));
    });

    window.history.replaceState({}, "", "/");
    render(
      <App repository={createRepository()} transactionRepository={createTransactionRepository()} />,
    );

    await expectHomeHeader();
    expect(resolveCategories).toBeDefined();
    expect(resolveNotifications).toBeDefined();
    expect(resolveTransactions).toBeDefined();
    expect(screen.queryByRole("status", { name: "Loading page content" })).toBeNull();

    act(() => {
      resolveCategories?.(
        createJsonResponse({
          data: [],
          message: "Categories retrieved successfully.",
          success: true,
        }),
      );
      resolveTransactions?.(
        createJsonResponse({
          data: [],
          message: "Transactions retrieved successfully.",
          success: true,
        }),
      );
      resolveNotifications?.(
        createJsonResponse({
          data: [],
          message: "Notifications retrieved successfully.",
          success: true,
        }),
      );
    });
  });

  it("shows the five-item finance navigation and Home shortcuts with Flow tips", async () => {
    mockAuthenticatedFinanceSession(globalThis.fetch as jest.MockedFunction<typeof fetch>);
    window.history.replaceState({}, "", "/");
    const user = userEvent.setup();
    render(
      <App repository={createRepository()} transactionRepository={createTransactionRepository()} />,
    );

    await expectHomeHeader();
    const navigation = screen.getByRole("navigation", { name: "Primary navigation" });
    expect(
      within(navigation)
        .getAllByRole("button")
        .map((button) => button.textContent?.trim()),
    ).toEqual(["Home", "Add income", "Add expense", "Budget", "You"]);

    const shortcuts = screen.getByRole("region", { name: "Quick actions" });
    expect(within(shortcuts).getAllByRole("link")).toHaveLength(4);
    expect(within(shortcuts).getByRole("link", { name: "Open budget" })).toBeDefined();
    expect(within(shortcuts).getByRole("link", { name: "Open reports" })).toBeDefined();
    expect(within(shortcuts).getByRole("link", { name: "Open goals" })).toBeDefined();
    expect(within(shortcuts).getByRole("link", { name: "Open loans" })).toBeDefined();

    await user.click(screen.getByRole("button", { name: "Show Flow AI" }));
    expect(screen.getByText("Flow AI")).toBeDefined();
    expect(screen.getByRole("link", { name: /Explore Flow/ })).toBeDefined();
    expect(screen.getByRole("link", { name: "Notifications" }).getAttribute("href")).toBe(
      "/notifications",
    );
  });

  it("persists global profile preferences and manages categories on Settings", async () => {
    const fetchMock = globalThis.fetch as jest.MockedFunction<typeof fetch>;
    mockAuthenticatedFinanceSession(fetchMock);
    window.history.replaceState({}, "", "/you");
    const user = userEvent.setup();
    const view = render(
      <App repository={createRepository()} transactionRepository={createTransactionRepository()} />,
    );

    await screen.findByRole("heading", { name: "Profile" });
    expect(screen.getByText("nila@example.com")).toBeDefined();
    expect(screen.queryByRole("heading", { name: "Preferences" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Edit Food category" })).toBeNull();
    const appearanceSelect = screen.getByLabelText("Appearance");
    const languageSelect = screen.getByLabelText("Language");
    const currencySelect = screen.getByRole("combobox", { name: "Currency" });
    if (
      !(appearanceSelect instanceof HTMLSelectElement) ||
      !(languageSelect instanceof HTMLSelectElement)
    ) {
      throw new Error("Profile preference controls must be select elements.");
    }
    await user.selectOptions(appearanceSelect, "dark");
    await waitFor(() => expect(appearanceSelect.value).toBe("dark"));
    await user.selectOptions(languageSelect, "en-IN");
    await waitFor(() => expect(languageSelect.value).toBe("en-IN"));
    await user.selectOptions(currencySelect, "INR");
    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe("dark");
      expect(document.documentElement.lang).toBe("en-IN");
    });
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/users/me"),
        expect.objectContaining({
          body: expect.stringContaining('"preferredCurrency":"INR"'),
          method: "PATCH",
        }),
      ),
    );

    await user.click(screen.getByRole("link", { name: /^Settings/ }));
    expect(await screen.findByRole("heading", { name: "Settings" })).toBeDefined();
    expect((await axe(view.container)).violations).toHaveLength(0);
    await user.click(screen.getByRole("button", { name: "Add" }));
    let dialog = screen.getByRole("dialog", { name: "Add category" });
    await user.type(within(dialog).getByLabelText("Name"), "Pet care");
    await user.click(within(dialog).getByRole("button", { name: "Save category" }));

    const customCategory = await screen.findByRole("button", {
      name: "Edit Pet care category",
    });
    await user.click(customCategory);
    dialog = screen.getByRole("dialog", { name: "Edit category" });
    const categoryName = within(dialog).getByLabelText("Name");
    await user.clear(categoryName);
    await user.type(categoryName, "Pets");
    await user.click(within(dialog).getByRole("button", { name: "Save category" }));
    await user.click(await screen.findByRole("button", { name: "Edit Pets category" }));
    dialog = screen.getByRole("dialog", { name: "Edit category" });
    await user.click(within(dialog).getByRole("button", { name: "Delete" }));
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Edit Pets category" })).toBeNull(),
    );
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Edit category" })).toBeNull());

    expect(screen.queryByLabelText("Appearance")).toBeNull();

    await user.click(
      within(screen.getByRole("navigation", { name: "Primary navigation" })).getByRole("button", {
        name: "Home",
      }),
    );
    await expectHomeHeader();
    expect(screen.getAllByText(/₹/).length).toBeGreaterThan(0);
  });

  it("opens a notification destination directly and marks it read", async () => {
    const fetchMock = globalThis.fetch as jest.MockedFunction<typeof fetch>;
    mockAuthenticatedFinanceSession(globalThis.fetch as jest.MockedFunction<typeof fetch>, {
      notifications: [
        {
          body: "Maya edited a budget in Home team.",
          createdAt: "2026-07-04T10:00:00.000Z",
          id: "ntf_budget",
          payload: {
            action: "budget.updated",
            path: "/budget",
            resourceId: "bgt_one",
            resourceType: "budget",
          },
          readAt: null,
          title: "Budget updated",
          type: "workspace_activity",
          workspaceId: "wsp_finance",
        },
      ],
    });
    window.history.replaceState({}, "", "/notifications");
    const user = userEvent.setup();
    const view = render(
      <App repository={createRepository()} transactionRepository={createTransactionRepository()} />,
    );

    expect(await screen.findByText("Maya edited a budget in Home team.")).toBeDefined();
    expect((await axe(view.container)).violations).toHaveLength(0);
    await user.click(screen.getByRole("button", { name: /Budget updated/ }));
    expect(await screen.findByRole("heading", { name: "Budget" })).toBeDefined();
    expect(window.location.pathname).toBe("/budget");
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/notifications/ntf_budget/read"),
        expect.objectContaining({ method: "PATCH" }),
      ),
    );
    expect(screen.queryByRole("heading", { name: "Notification" })).toBeNull();
  });

  it("shows ledger-derived loans by currency and keeps archived accounts in history", async () => {
    mockAuthenticatedFinanceSession(globalThis.fetch as jest.MockedFunction<typeof fetch>, {
      accounts: [
        {
          currency: "USD",
          currentBalance: "-1200.25",
          id: "acc_card",
          isArchived: false,
          name: "Everyday card",
          type: "credit_card",
        },
        {
          currency: "INR",
          currentBalance: "50000.00",
          id: "acc_loan",
          isArchived: false,
          name: "Vehicle loan",
          type: "loan",
        },
        {
          currency: "USD",
          currentBalance: "-300.00",
          id: "acc_old_loan",
          isArchived: true,
          name: "Old loan",
          type: "loan",
        },
      ],
    });
    window.history.replaceState({}, "", "/liabilities");
    const view = render(
      <App repository={createRepository()} transactionRepository={createTransactionRepository()} />,
    );

    expect(await screen.findByRole("heading", { name: "Loans" })).toBeDefined();
    expect(await screen.findByText("Everyday card")).toBeDefined();
    expect(screen.getByText("Vehicle loan")).toBeDefined();
    expect(screen.getAllByText("$1,200.25")).toHaveLength(2);
    expect(screen.getAllByText("₹50,000.00")).toHaveLength(2);
    expect(screen.getByRole("heading", { name: "Archived history" })).toBeDefined();
    expect(screen.getByText("Old loan")).toBeDefined();
    expect(screen.getByRole("button", { name: "Open Everyday card" })).toBeDefined();
    expect(screen.queryByText("Payment plans and debt goals")).toBeNull();
    expect((await axe(view.container)).violations).toHaveLength(0);
  });

  it("creates a loan from the dedicated screen", async () => {
    mockAuthenticatedFinanceSession(globalThis.fetch as jest.MockedFunction<typeof fetch>, {
      accounts: [],
      reportingCurrency: "INR",
    });
    window.history.replaceState({}, "", "/liabilities");
    const user = userEvent.setup();
    render(
      <App repository={createRepository()} transactionRepository={createTransactionRepository()} />,
    );

    expect(await screen.findByText("No loans yet")).toBeDefined();
    await user.click(screen.getByRole("button", { name: "Add loan" }));
    const dialog = screen.getByRole("dialog", { name: "Add loan" });
    await user.type(within(dialog).getByLabelText("Account name"), "Home loan");
    await user.selectOptions(within(dialog).getByLabelText("Loan type"), "loan");
    await user.type(within(dialog).getByLabelText(/Loan amount/), "500000");
    await user.click(within(dialog).getByRole("button", { name: "Save loan" }));

    expect(await screen.findByText("Home loan")).toBeDefined();
    expect(screen.getAllByText("₹500,000.00").length).toBeGreaterThan(0);
  });

  it("records multiple payments against the same loan", async () => {
    mockAuthenticatedFinanceSession(globalThis.fetch as jest.MockedFunction<typeof fetch>, {
      accounts: [
        {
          currency: "INR",
          currentBalance: "50000.00",
          id: "acc_vehicle",
          isArchived: false,
          name: "Vehicle loan",
          openingBalance: "50000.00",
          type: "loan",
        },
      ],
      reportingCurrency: "INR",
    });
    window.history.replaceState({}, "", "/liabilities");
    const user = userEvent.setup();
    render(
      <App repository={createRepository()} transactionRepository={createTransactionRepository()} />,
    );

    await user.click(await screen.findByRole("button", { name: "Open Vehicle loan" }));
    expect(await screen.findByRole("heading", { name: "Payment history" })).toBeDefined();

    await user.click(screen.getByRole("button", { name: "Record payment" }));
    let paymentDialog = screen.getByRole("dialog", { name: "Record payment" });
    await user.type(within(paymentDialog).getByLabelText("Amount paid"), "1000");
    await user.click(within(paymentDialog).getByRole("button", { name: "Record payment" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Record payment" })).toBeNull(),
    );

    await user.click(screen.getByRole("button", { name: "Record payment" }));
    paymentDialog = screen.getByRole("dialog", { name: "Record payment" });
    await user.type(within(paymentDialog).getByLabelText("Amount paid"), "500");
    await user.click(within(paymentDialog).getByRole("button", { name: "Record payment" }));

    await waitFor(() => expect(screen.getAllByText("₹1,000.00").length).toBeGreaterThan(0));
    expect(screen.getAllByText("₹500.00").length).toBeGreaterThan(0);
    expect(await screen.findAllByText("₹48,500.00")).toHaveLength(2);
  });

  it("creates a goal and adds a contribution", async () => {
    mockAuthenticatedFinanceSession(globalThis.fetch as jest.MockedFunction<typeof fetch>, {
      goals: [],
      reportingCurrency: "INR",
    });
    window.history.replaceState({}, "", "/goals");
    const user = userEvent.setup();
    const view = render(
      <App repository={createRepository()} transactionRepository={createTransactionRepository()} />,
    );

    expect(await screen.findByText("No goals yet")).toBeDefined();
    await user.click(screen.getByRole("button", { name: "Add goal" }));
    let dialog = screen.getByRole("dialog", { name: "Create goal" });
    await user.type(within(dialog).getByLabelText("Name"), "Emergency fund");
    await user.type(within(dialog).getByLabelText("Target amount"), "100000");
    await user.click(within(dialog).getByRole("button", { name: "Save goal" }));

    expect(await screen.findByText("Emergency fund")).toBeDefined();
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Create goal" })).toBeNull());
    await user.click(screen.getByRole("button", { name: "Add contribution" }));
    dialog = screen.getByRole("dialog", { name: "Contribute to Emergency fund" });
    await user.type(within(dialog).getByLabelText("Amount"), "25000");
    await user.click(within(dialog).getByRole("button", { name: "Add contribution" }));

    expect(await screen.findByText(/₹25,000.00/)).toBeDefined();
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await user.click(screen.getByRole("button", { name: /Emergency fund/ }));
    dialog = screen.getByRole("dialog", { name: "Edit goal" });
    const nameInput = within(dialog).getByLabelText("Name");
    await user.clear(nameInput);
    await user.type(nameInput, "Rainy day fund");
    await user.click(within(dialog).getByRole("button", { name: "Save goal" }));

    expect(await screen.findByText("Rainy day fund")).toBeDefined();
    expect((await axe(view.container)).violations).toHaveLength(0);
  });

  it("uses the authenticated user's single current workspace", async () => {
    window.sessionStorage.setItem("nidhiflow.accessToken", "access-token-joined-family");
    const fetchMock = globalThis.fetch as jest.MockedFunction<typeof fetch>;
    const user = userEvent.setup();
    let transactionListRequests = 0;

    fetchMock.mockImplementation((input, init) => {
      const url = getRequestUrl(input);
      const method = init?.method ?? "GET";

      if (url.endsWith("/api/v1/users/me") && method === "GET") {
        return Promise.resolve(
          createJsonResponse({
            data: {
              displayName: "Arun",
              email: "arun@example.com",
              id: "usr_joined",
              locale: "en-US",
              preferredCurrency: "USD",
              theme: "system",
              timezone: "UTC",
            },
            message: "Current user retrieved successfully.",
            success: true,
          }),
        );
      }

      if (url.endsWith("/api/v1/workspaces") && method === "GET") {
        return Promise.resolve(
          createJsonResponse({
            data: [
              {
                id: "wsp_current",
                membershipRole: "member",
                name: "Family Money",
                ownerDisplayName: "Maya",
                reportingCurrency: "USD",
                type: "personal",
              },
            ],
            message: "Workspaces retrieved successfully.",
            success: true,
          }),
        );
      }

      if (url.endsWith("/api/v1/workspaces/wsp_current/categories") && method === "GET") {
        return Promise.resolve(
          createJsonResponse({
            data: [{ id: "cat_food", isArchived: false, name: "Food", transactionType: "expense" }],
            message: "Categories retrieved successfully.",
            success: true,
          }),
        );
      }

      if (url.endsWith("/api/v1/workspaces/wsp_current/transactions") && method === "GET") {
        transactionListRequests += 1;
        return Promise.resolve(
          createJsonResponse({
            data: [
              {
                amount: "42.00",
                categoryId: "cat_food",
                createdAt: "2026-04-15T08:30:00.000Z",
                currency: "USD",
                id: "txn_current",
                note: "Shared groceries",
                transactionDate: "2026-04-15T00:00:00.000Z",
                type: "expense",
                updatedAt: "2026-04-15T08:30:00.000Z",
              },
            ],
            message: "Transactions retrieved successfully.",
            success: true,
          }),
        );
      }

      return Promise.reject(new Error(`Unexpected request: ${url}`));
    });

    window.history.replaceState({}, "", "/activity");
    render(
      <App repository={createRepository()} transactionRepository={createTransactionRepository()} />,
    );

    expect(await screen.findByRole("heading", { name: "Activity" })).toBeDefined();
    expect(await screen.findByText("Shared groceries")).toBeDefined();

    const navigation = screen.getByRole("navigation", { name: "Primary navigation" });
    await user.click(within(navigation).getByRole("button", { name: "Home" }));
    await expectHomeHeader();
    await waitFor(() => expect(transactionListRequests).toBe(2));
    await user.click(screen.getByRole("button", { name: "Shared workspace" }));

    expect(screen.queryByRole("tab")).toBeNull();
    const workspaceDetails = screen.getByRole("region", { name: "Current workspace details" });
    expect(within(workspaceDetails).getByText("Managed by Maya")).toBeDefined();
    expect(within(workspaceDetails).getByText("Family Money")).toBeDefined();
    expect(within(workspaceDetails).getByText("Member")).toBeDefined();
    expect(within(workspaceDetails).getByText("USD")).toBeDefined();
    expect(
      within(workspaceDetails).getByRole("button", { name: "Leave and create my workspace" }),
    ).toBeDefined();
    await user.click(screen.getByRole("button", { name: "Expand shared space" }));
    expect(screen.getAllByRole("button", { name: "Leave and create my workspace" })).toHaveLength(
      1,
    );
    expect(screen.queryByRole("button", { name: /Switch to/ })).toBeNull();
  });

  it("shows unread notifications on Home without an overflow menu", async () => {
    mockAuthenticatedFinanceSession(globalThis.fetch as jest.MockedFunction<typeof fetch>, {
      notifications: [
        {
          body: "Maya added a transaction in Home team.",
          createdAt: "2026-07-04T10:00:00.000Z",
          id: "ntf_home_unread",
          payload: {
            action: "transaction.created",
            path: "/activity",
            resourceId: "txn_one",
            resourceType: "transaction",
          },
          readAt: null,
          title: "Transaction added",
          type: "workspace_activity",
          workspaceId: "wsp_finance",
        },
      ],
    });
    window.history.replaceState({}, "", "/");
    render(
      <App repository={createRepository()} transactionRepository={createTransactionRepository()} />,
    );

    await expectHomeHeader();
    expect(await screen.findByLabelText("1 unread notifications")).toBeDefined();
    expect(screen.queryByRole("button", { name: "More options" })).toBeNull();
  });

  it("applies report date presets and custom ranges from bottom sheets", async () => {
    mockAuthenticatedFinanceSession(globalThis.fetch as jest.MockedFunction<typeof fetch>);
    window.history.replaceState({}, "", "/reports");
    const user = userEvent.setup();
    render(
      <App repository={createRepository()} transactionRepository={createTransactionRepository()} />,
    );

    expect(await screen.findByRole("heading", { name: "Reports" })).toBeDefined();
    expect(screen.getByRole("heading", { name: "Spending Trend" })).toBeDefined();
    expect(screen.getByRole("heading", { name: "Top Categories" })).toBeDefined();

    await user.click(screen.getByRole("button", { name: /^Filters/ }));
    let filterDialog = screen.getByRole("dialog", { name: "Filters" });
    expect(within(filterDialog).getByText("This month")).toBeDefined();
    expect(within(filterDialog).getByText("Last month")).toBeDefined();
    expect(within(filterDialog).getByText("Last year")).toBeDefined();

    await user.click(within(filterDialog).getByText("Last year"));
    await user.click(within(filterDialog).getByRole("button", { name: "Apply" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Filters" })).toBeNull());
    expect(screen.getAllByText("Last year").length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: /^Filters/ }));
    filterDialog = screen.getByRole("dialog", { name: "Filters" });
    await user.type(within(filterDialog).getByLabelText("From"), "2025-01-01");
    await user.type(within(filterDialog).getByLabelText("To"), "2025-01-31");
    await user.click(within(filterDialog).getByRole("button", { name: "Apply" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Filters" })).toBeNull());
    expect(screen.getAllByText("Custom range").length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: /^Filters/ }));
    filterDialog = screen.getByRole("dialog", { name: "Filters" });
    await user.click(within(filterDialog).getByRole("button", { name: "Clear" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Filters" })).toBeNull());
    expect(screen.getAllByText("This month").length).toBeGreaterThan(0);
  });

  it("returns a refreshed secondary page to Home with the shared back action", async () => {
    mockAuthenticatedFinanceSession(globalThis.fetch as jest.MockedFunction<typeof fetch>);
    window.history.replaceState({}, "", "/reports");
    const user = userEvent.setup();
    render(
      <App repository={createRepository()} transactionRepository={createTransactionRepository()} />,
    );

    expect(await screen.findByRole("heading", { name: "Reports" })).toBeDefined();
    await user.click(screen.getByRole("button", { name: "Go back" }));
    await expectHomeHeader();
    expect(window.location.pathname).toBe("/");
  });

  it("does not render workspace finance UI for signed-out visitors", async () => {
    window.history.replaceState({}, "", "/activity");
    render(
      <App repository={createRepository()} transactionRepository={createTransactionRepository()} />,
    );

    expect(
      await screen.findByRole("heading", { name: "Money clarity, made simple." }),
    ).toBeDefined();
    expect(screen.queryByRole("heading", { name: "Activity" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Shared workspace" })).toBeNull();
  });

  it("shares the current workspace and confirms ownership transfer before joining", async () => {
    window.sessionStorage.setItem("nidhiflow.accessToken", "access-token-family");
    const fetchMock = globalThis.fetch as jest.MockedFunction<typeof fetch>;
    const nativeShare = jest.fn((data?: ShareData) => {
      void data;
      return Promise.resolve();
    });
    Object.defineProperty(globalThis.navigator, "share", {
      configurable: true,
      value: nativeShare,
    });
    let hasJoined = false;
    let joinAttempts = 0;
    let resolveShareCode: ((response: Response) => void) | undefined;
    let shareCodeAttempts = 0;

    fetchMock.mockImplementation((input, init) => {
      const url = getRequestUrl(input);
      const method = init?.method ?? "GET";

      if (url.endsWith("/api/v1/auth/refresh") && method === "POST") {
        return Promise.resolve(
          createJsonResponse({
            data: { accessToken: "access-token-refreshed" },
            message: "Access token refreshed successfully.",
            success: true,
          }),
        );
      }

      if (url.endsWith("/api/v1/users/me") && method === "GET") {
        return Promise.resolve(
          createJsonResponse({
            data: {
              displayName: "Nila",
              email: "nila@example.com",
              id: "usr_family",
              locale: "en-US",
              preferredCurrency: "USD",
              theme: "system",
              timezone: "UTC",
            },
            message: "Current user retrieved successfully.",
            success: true,
          }),
        );
      }

      if (url.endsWith("/api/v1/workspaces") && method === "GET") {
        return Promise.resolve(
          createJsonResponse({
            data: [
              hasJoined
                ? {
                    id: "wsp_destination",
                    membershipRole: "member",
                    name: "Destination Workspace",
                    ownerDisplayName: "Maya",
                    reportingCurrency: "USD",
                    type: "personal",
                  }
                : {
                    id: "wsp_family",
                    membershipRole: "manager",
                    name: "Nila Family",
                    ownerDisplayName: "Nila",
                    reportingCurrency: "USD",
                    type: "personal",
                  },
            ],
            message: "Workspaces retrieved successfully.",
            success: true,
          }),
        );
      }

      if (url.endsWith("/api/v1/workspaces/wsp_family/share-codes") && method === "POST") {
        shareCodeAttempts += 1;

        if (shareCodeAttempts === 1) {
          expect(new Headers(init?.headers).get("Authorization")).toBe(
            "Bearer access-token-family",
          );

          return Promise.resolve(
            createJsonResponse(
              {
                message: "Authentication is required for this resource.",
                success: false,
              },
              false,
              401,
            ),
          );
        }

        expect(new Headers(init?.headers).get("Authorization")).toBe(
          "Bearer access-token-refreshed",
        );

        return new Promise<Response>((resolve) => {
          resolveShareCode = resolve;
        });
      }

      if (
        url.endsWith("/api/v1/workspace-invitations/share-codes/LMNO-6789/join") &&
        method === "POST"
      ) {
        joinAttempts += 1;
        const body = JSON.parse(getRequestBody(init)) as { transferOwnership: boolean };

        if (!body.transferOwnership) {
          return Promise.resolve(
            createJsonResponse(
              {
                error: { code: "OWNERSHIP_TRANSFER_REQUIRED" },
                message: "Transfer workspace ownership before joining another workspace.",
                success: false,
              },
              false,
              409,
            ),
          );
        }

        hasJoined = true;
        return Promise.resolve(
          createJsonResponse({
            data: {
              id: "wsp_destination",
              membershipRole: "member",
              name: "Destination Workspace",
              ownerDisplayName: "Maya",
              reportingCurrency: "USD",
              type: "personal",
            },
            message: "Workspace joined successfully.",
            success: true,
          }),
        );
      }

      return Promise.reject(new Error(`Unexpected request: ${url}`));
    });

    window.history.replaceState({}, "", "/");
    const user = userEvent.setup();
    const view = render(
      <App repository={createRepository()} transactionRepository={createTransactionRepository()} />,
    );

    await expectHomeHeader();
    await user.click(screen.getByRole("button", { name: "Shared workspace" }));

    expect(screen.queryByRole("tab")).toBeNull();
    expect(screen.getByRole("region", { name: "Current workspace details" })).toBeDefined();
    expect(await screen.findByText("Getting code")).toBeDefined();
    expect(screen.queryByRole("status", { name: "Loading page content" })).toBeNull();
    act(() => {
      resolveShareCode?.(
        createJsonResponse(
          {
            data: {
              code: "ABCD-2345",
              expiresAt: "2026-07-03T00:00:00.000Z",
              id: "wsi_share",
              workspaceId: "wsp_family",
            },
            message: "Workspace share code created successfully.",
            success: true,
          },
          true,
          201,
        ),
      );
    });
    expect(await screen.findByText("ABCD-2345")).toBeDefined();
    expect(shareCodeAttempts).toBe(2);
    expect(screen.getByLabelText("Join with code")).toBeDefined();
    await user.click(screen.getByRole("button", { name: "Share" }));
    expect(nativeShare).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining("ABCD-2345"),
        title: "Join Nila Family",
      }),
    );
    await user.click(screen.getByRole("button", { name: "Expand shared space" }));
    expect(screen.getByRole("heading", { name: "Members" })).toBeDefined();
    expect(screen.getByRole("heading", { name: "Permissions" })).toBeDefined();
    expect(screen.queryByText("nila@example.com")).toBeNull();
    expect((await axe(view.container)).violations).toHaveLength(0);
    await user.type(screen.getByLabelText("Join with code"), "LMNO-6789");
    await user.click(screen.getByRole("button", { name: "Join" }));

    expect(
      await screen.findByRole("alertdialog", { name: "Transfer workspace ownership?" }),
    ).toBeDefined();
    expect(joinAttempts).toBe(1);

    await user.click(screen.getByRole("button", { name: "Transfer ownership and join" }));

    expect(await screen.findByText(/This is now your current workspace/)).toBeDefined();
    expect(joinAttempts).toBe(2);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/workspace-invitations/share-codes/LMNO-6789/join"),
      expect.objectContaining({
        body: JSON.stringify({ transferOwnership: true }),
        method: "POST",
      }),
    );
    Reflect.deleteProperty(globalThis.navigator, "share");
  });

  it("lets a signed-out visitor create an account and start a session", async () => {
    const fetchMock = globalThis.fetch as jest.MockedFunction<typeof fetch>;

    fetchMock.mockImplementation((input, init) => {
      const url = getRequestUrl(input);
      const method = init?.method ?? "GET";

      if (url.endsWith("/api/v1/auth/refresh")) {
        return Promise.reject(new Error("No session."));
      }

      if (url.endsWith("/api/v1/auth/register") && method === "POST") {
        return Promise.resolve(
          createJsonResponse({
            data: {
              accessToken: "access-token-123",
              user: {
                displayName: "Maya",
                email: "maya@example.com",
                id: "usr_123",
                locale: "en-US",
                preferredCurrency: "USD",
                theme: "system",
                timezone: "UTC",
              },
              workspaces: [{ id: "wsp_123", name: "Maya", type: "personal" }],
            },
            message: "Account created successfully.",
            success: true,
          }),
        );
      }

      return Promise.reject(new Error(`Unexpected request: ${url}`));
    });

    window.history.replaceState({}, "", "/signup");
    const user = userEvent.setup();
    render(
      <App repository={createRepository()} transactionRepository={createTransactionRepository()} />,
    );

    await user.clear(await screen.findByLabelText("Display name"));
    await user.type(screen.getByLabelText("Display name"), "Maya");
    await user.type(screen.getByLabelText("Email"), "maya@example.com");
    await user.type(screen.getByLabelText("Password"), "StrongPassword123");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    await expectHomeHeader();
    expect(screen.getByRole("link", { name: "Notifications" })).toBeDefined();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/auth/register"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("shows and persists the product tour for a newly created account", async () => {
    const fetchMock = globalThis.fetch as jest.MockedFunction<typeof fetch>;
    let profile = {
      displayName: "Maya",
      email: "maya@example.com",
      id: "usr_onboarding",
      locale: "en-US",
      onboardingFinishedAt: null as string | null,
      onboardingStatus: "pending" as "completed" | "pending" | "skipped",
      onboardingVersion: 1,
      preferredCurrency: "USD",
      theme: "system",
      timezone: "UTC",
    };

    fetchMock.mockImplementation((input, init) => {
      const url = getRequestUrl(input);
      const method = init?.method ?? "GET";

      if (url.endsWith("/api/v1/auth/refresh")) {
        return Promise.reject(new Error("No session."));
      }

      if (url.endsWith("/api/v1/auth/register") && method === "POST") {
        return Promise.resolve(
          createJsonResponse({
            data: {
              accessToken: "access-token-onboarding",
              user: profile,
              workspaces: [{ id: "wsp_onboarding", name: "Maya", type: "personal" }],
            },
            message: "Account created successfully.",
            success: true,
          }),
        );
      }

      if (url.endsWith("/api/v1/users/me/onboarding") && method === "PATCH") {
        const body = JSON.parse(getRequestBody(init)) as { status: "completed" | "skipped" };
        profile = {
          ...profile,
          onboardingFinishedAt: "2026-07-06T10:00:00.000Z",
          onboardingStatus: body.status,
        };
        return Promise.resolve(
          createJsonResponse({
            data: profile,
            message: "Product tour status updated.",
            success: true,
          }),
        );
      }

      return Promise.reject(new Error(`Unexpected request: ${url}`));
    });

    window.history.replaceState({}, "", "/signup");
    const user = userEvent.setup();
    const view = render(
      <App repository={createRepository()} transactionRepository={createTransactionRepository()} />,
    );

    await user.clear(await screen.findByLabelText("Display name"));
    await user.type(screen.getByLabelText("Display name"), "Maya");
    await user.type(screen.getByLabelText("Email"), "maya@example.com");
    await user.type(screen.getByLabelText("Password"), "StrongPassword123");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(
      await screen.findByRole("heading", { name: "Know where your money is going" }),
    ).toBeDefined();
    expect((await axe(view.container)).violations).toHaveLength(0);

    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("heading", { name: "Turn plans into steady progress" })).toBeDefined();
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "Get started" }));

    await expectHomeHeader();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/users/me/onboarding"),
      expect.objectContaining({
        body: JSON.stringify({ status: "completed" }),
        method: "PATCH",
      }),
    );
  });

  it("does not prompt for parked legacy migration after signup", async () => {
    const fetchMock = globalThis.fetch as jest.MockedFunction<typeof fetch>;

    fetchMock.mockImplementation((input, init) => {
      const url = getRequestUrl(input);
      const method = init?.method ?? "GET";

      if (url.endsWith("/api/v1/auth/refresh")) {
        return Promise.reject(new Error("No session."));
      }

      if (url.endsWith("/api/v1/auth/register") && method === "POST") {
        return Promise.resolve(
          createJsonResponse({
            data: {
              accessToken: "access-token-789",
              user: {
                displayName: "Maya",
                email: "maya@example.com",
                id: "usr_789",
                locale: "en-US",
                preferredCurrency: "USD",
                theme: "system",
                timezone: "UTC",
              },
              workspaces: [{ id: "wsp_789", name: "Maya", type: "personal" }],
            },
            message: "Account created successfully.",
            success: true,
          }),
        );
      }

      return Promise.reject(new Error(`Unexpected request: ${url}`));
    });

    window.history.replaceState({}, "", "/signup");
    const user = userEvent.setup();
    render(
      <App
        repository={createRepository({
          ...defaultPreferences,
          displayName: "Maya",
        })}
        transactionRepository={createTransactionRepository()}
      />,
    );

    await user.type(await screen.findByLabelText("Display name"), "Maya");
    await user.type(screen.getByLabelText("Email"), "maya@example.com");
    await user.type(screen.getByLabelText("Password"), "StrongPassword123");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    await expectHomeHeader();
    expect(screen.queryByRole("region", { name: "Move local data" })).toBeNull();
    const migrationCall = fetchMock.mock.calls.find(([input]) =>
      getRequestUrl(input).endsWith("/api/v1/users/me/guest-migrations"),
    );

    expect(migrationCall).toBeUndefined();
  });

  it("lets an existing account log in", async () => {
    const fetchMock = globalThis.fetch as jest.MockedFunction<typeof fetch>;

    fetchMock.mockImplementation((input, init) => {
      const url = getRequestUrl(input);
      const method = init?.method ?? "GET";

      if (url.endsWith("/api/v1/auth/refresh")) {
        return Promise.reject(new Error("No session."));
      }

      if (url.endsWith("/api/v1/auth/login") && method === "POST") {
        return Promise.resolve(
          createJsonResponse({
            data: {
              accessToken: "access-token-456",
              user: {
                displayName: "Nila",
                email: "nila@example.com",
                id: "usr_456",
                locale: "en-US",
                preferredCurrency: "USD",
                theme: "system",
                timezone: "UTC",
              },
              workspaces: [{ id: "wsp_456", name: "Nila", type: "personal" }],
            },
            message: "Login successful.",
            success: true,
          }),
        );
      }

      return Promise.reject(new Error(`Unexpected request: ${url}`));
    });

    window.history.replaceState({}, "", "/login");
    const user = userEvent.setup();
    render(
      <App repository={createRepository()} transactionRepository={createTransactionRepository()} />,
    );

    await user.type(await screen.findByLabelText("Email"), "nila@example.com");
    await user.type(screen.getByLabelText("Password"), "StrongPassword123");
    await user.click(screen.getByRole("button", { name: "Log in" }));

    await expectHomeHeader();
  });

  it("keeps the signed-in details after a browser refresh in the same session", async () => {
    const fetchMock = globalThis.fetch as jest.MockedFunction<typeof fetch>;

    fetchMock.mockImplementation((input, init) => {
      const url = getRequestUrl(input);
      const method = init?.method ?? "GET";

      if (url.endsWith("/api/v1/auth/refresh")) {
        return Promise.reject(new Error("No refresh cookie."));
      }

      if (url.endsWith("/api/v1/auth/login") && method === "POST") {
        return Promise.resolve(
          createJsonResponse({
            data: {
              accessToken: "access-token-refresh-session",
              user: {
                displayName: "Nila",
                email: "nila@example.com",
                id: "usr_refresh_session",
                locale: "en-US",
                preferredCurrency: "USD",
                theme: "system",
                timezone: "UTC",
              },
              workspaces: [{ id: "wsp_refresh_session", name: "Nila", type: "personal" }],
            },
            message: "Login successful.",
            success: true,
          }),
        );
      }

      return Promise.reject(new Error(`Unexpected request: ${url}`));
    });

    window.history.replaceState({}, "", "/login");
    const user = userEvent.setup();
    const firstRender = render(
      <App repository={createRepository()} transactionRepository={createTransactionRepository()} />,
    );

    await user.type(await screen.findByLabelText("Email"), "nila@example.com");
    await user.type(screen.getByLabelText("Password"), "StrongPassword123");
    await user.click(screen.getByRole("button", { name: "Log in" }));

    await expectHomeHeader();
    firstRender.unmount();

    fetchMock.mockImplementation(() => Promise.reject(new Error("Network unavailable.")));
    window.history.replaceState({}, "", "/you");
    render(
      <App repository={createRepository()} transactionRepository={createTransactionRepository()} />,
    );

    expect(await screen.findByRole("heading", { name: "Nila" })).toBeDefined();
    expect(screen.queryByText("Signed in")).toBeNull();
    expect(screen.getByText("nila@example.com")).toBeDefined();
    expect(screen.queryByRole("dialog", { name: "Continue in guest mode?" })).toBeNull();
  });

  it("restores the signed-in profile after a page refresh", async () => {
    const fetchMock = globalThis.fetch as jest.MockedFunction<typeof fetch>;

    fetchMock.mockImplementation((input, init) => {
      const url = getRequestUrl(input);
      const method = init?.method ?? "GET";

      if (url.endsWith("/api/v1/auth/refresh") && method === "POST") {
        return Promise.resolve(
          createJsonResponse({
            data: { accessToken: "access-token-restored" },
            message: "Session refreshed successfully.",
            success: true,
          }),
        );
      }

      if (url.endsWith("/api/v1/users/me") && method === "GET") {
        return Promise.resolve(
          createJsonResponse({
            data: {
              displayName: "Nila",
              email: "nila@example.com",
              id: "usr_restored",
              locale: "en-US",
              preferredCurrency: "USD",
              theme: "system",
              timezone: "UTC",
            },
            message: "Current user retrieved successfully.",
            success: true,
          }),
        );
      }

      if (url.endsWith("/api/v1/workspaces") && method === "GET") {
        return Promise.resolve(
          createJsonResponse({
            data: [{ id: "wsp_restored", name: "Nila", type: "personal" }],
            message: "Workspaces retrieved successfully.",
            success: true,
          }),
        );
      }

      return Promise.reject(new Error(`Unexpected request: ${url}`));
    });

    window.history.replaceState({}, "", "/you");
    render(
      <App repository={createRepository()} transactionRepository={createTransactionRepository()} />,
    );

    expect(await screen.findByRole("heading", { name: "Nila" })).toBeDefined();
    expect(screen.queryByText("Signed in")).toBeNull();
    expect(screen.getByText("nila@example.com")).toBeDefined();
  });

  it("keeps the signed-in profile when the access token is restored from session storage", async () => {
    window.sessionStorage.setItem("nidhiflow.accessToken", "access-token-stored");
    const fetchMock = globalThis.fetch as jest.MockedFunction<typeof fetch>;

    fetchMock.mockImplementation((input, init) => {
      const url = getRequestUrl(input);
      const method = init?.method ?? "GET";

      if (url.endsWith("/api/v1/users/me") && method === "GET") {
        return Promise.resolve(
          createJsonResponse({
            data: {
              displayName: "Nila",
              email: "nila@example.com",
              id: "usr_stored",
              locale: "en-US",
              preferredCurrency: "USD",
              theme: "system",
              timezone: "UTC",
            },
            message: "Current user retrieved successfully.",
            success: true,
          }),
        );
      }

      if (url.endsWith("/api/v1/workspaces") && method === "GET") {
        return Promise.resolve(
          createJsonResponse({
            data: [{ id: "wsp_stored", name: "Nila", type: "personal" }],
            message: "Workspaces retrieved successfully.",
            success: true,
          }),
        );
      }

      if (url.endsWith("/api/v1/auth/refresh")) {
        return Promise.reject(new Error("Refresh cookie unavailable."));
      }

      return Promise.reject(new Error(`Unexpected request: ${url}`));
    });

    window.history.replaceState({}, "", "/you");
    render(
      <App repository={createRepository()} transactionRepository={createTransactionRepository()} />,
    );

    expect(await screen.findByRole("heading", { name: "Nila" })).toBeDefined();
    expect(screen.queryByText("Signed in")).toBeNull();
    expect(screen.getByText("nila@example.com")).toBeDefined();
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/auth/refresh"),
      expect.anything(),
    );
  });

  it("shows the authenticated display name on Home instead of the guest name", async () => {
    window.sessionStorage.setItem("nidhiflow.accessToken", "access-token-home");
    const fetchMock = globalThis.fetch as jest.MockedFunction<typeof fetch>;

    fetchMock.mockImplementation((input, init) => {
      const url = getRequestUrl(input);
      const method = init?.method ?? "GET";

      if (url.endsWith("/api/v1/users/me") && method === "GET") {
        return Promise.resolve(
          createJsonResponse({
            data: {
              displayName: "Nila",
              email: "nila@example.com",
              id: "usr_home",
              locale: "en-US",
              preferredCurrency: "USD",
              theme: "system",
              timezone: "UTC",
            },
            message: "Current user retrieved successfully.",
            success: true,
          }),
        );
      }

      if (url.endsWith("/api/v1/workspaces") && method === "GET") {
        return Promise.resolve(
          createJsonResponse({
            data: [{ id: "wsp_home", name: "Nila Workspace", type: "personal" }],
            message: "Workspaces retrieved successfully.",
            success: true,
          }),
        );
      }

      if (url.endsWith("/api/v1/workspaces/wsp_home/categories") && method === "GET") {
        return Promise.resolve(
          createJsonResponse({
            data: [],
            message: "Categories retrieved successfully.",
            success: true,
          }),
        );
      }

      if (url.endsWith("/api/v1/workspaces/wsp_home/transactions") && method === "GET") {
        return Promise.resolve(
          createJsonResponse({
            data: [],
            message: "Transactions retrieved successfully.",
            success: true,
          }),
        );
      }

      return Promise.reject(new Error(`Unexpected request: ${url}`));
    });

    window.history.replaceState({}, "", "/");
    render(
      <App repository={createRepository()} transactionRepository={createTransactionRepository()} />,
    );

    await expectHomeHeader();
    expect(screen.queryByText("Nila Workspace")).toBeNull();
    expect(screen.queryByRole("heading", { name: /Guest/ })).toBeNull();
  });

  it("returns unauthenticated users to About after refresh", async () => {
    const fetchMock = globalThis.fetch as jest.MockedFunction<typeof fetch>;

    fetchMock.mockImplementation((input) => {
      const url = getRequestUrl(input);

      if (url.endsWith("/api/v1/auth/refresh")) {
        return Promise.reject(new Error("No session."));
      }

      return Promise.reject(new Error(`Unexpected request: ${url}`));
    });

    window.history.replaceState({}, "", "/");
    const user = userEvent.setup();
    render(
      <App repository={createRepository()} transactionRepository={createTransactionRepository()} />,
    );

    expect(
      await screen.findByRole("heading", { name: "Money clarity, made simple." }),
    ).toBeDefined();
    expect(screen.queryByText("Continue as guest")).toBeNull();
    await user.click(
      screen.getAllByRole("link", { name: "Log in" }).find((link) => link.closest("header")) ??
        screen.getAllByRole("link", { name: "Log in" })[0],
    );
    expect(await screen.findByRole("heading", { name: "Log in" })).toBeDefined();
  });

  it("does not offer migration again for local transactions already copied to the account", async () => {
    const fetchMock = globalThis.fetch as jest.MockedFunction<typeof fetch>;

    fetchMock.mockImplementation((input, init) => {
      const url = getRequestUrl(input);
      const method = init?.method ?? "GET";

      if (url.endsWith("/api/v1/auth/refresh")) {
        return Promise.reject(new Error("No session."));
      }

      if (url.endsWith("/api/v1/auth/login") && method === "POST") {
        return Promise.resolve(
          createJsonResponse({
            data: {
              accessToken: "access-token-migrated",
              user: {
                displayName: "Maya",
                email: "maya@example.com",
                id: "usr_migrated",
                locale: "en-US",
                preferredCurrency: "USD",
                theme: "system",
                timezone: "UTC",
              },
              workspaces: [{ id: "wsp_migrated", name: "Maya", type: "personal" }],
            },
            message: "Login successful.",
            success: true,
          }),
        );
      }

      return Promise.reject(new Error(`Unexpected request: ${url}`));
    });

    window.history.replaceState({}, "", "/login");
    const user = userEvent.setup();
    render(
      <App
        repository={createRepository({
          ...defaultPreferences,
          migratedTransactionIds: ["guest_txn_1"],
        })}
        transactionRepository={createTransactionRepository([
          {
            amountMinor: "2500",
            category: "Food",
            createdAt: "2026-06-17T00:00:00.000Z",
            currency: "USD",
            id: "guest_txn_1",
            note: "Groceries",
            transactionDate: "2026-06-17",
            type: "expense",
            updatedAt: "2026-06-17T00:00:00.000Z",
          },
        ])}
      />,
    );

    await user.type(await screen.findByLabelText("Email"), "maya@example.com");
    await user.type(screen.getByLabelText("Password"), "StrongPassword123");
    await user.click(screen.getByRole("button", { name: "Log in" }));

    await expectHomeHeader();
    expect(screen.queryByRole("region", { name: "Move local data" })).toBeNull();
  });

  it("does not show the guest protection reminder after login", async () => {
    jest.useFakeTimers();
    const fetchMock = globalThis.fetch as jest.MockedFunction<typeof fetch>;

    fetchMock.mockImplementation((input, init) => {
      const url = getRequestUrl(input);
      const method = init?.method ?? "GET";

      if (url.endsWith("/api/v1/auth/refresh")) {
        return Promise.reject(new Error("No session."));
      }

      if (url.endsWith("/api/v1/auth/login") && method === "POST") {
        return Promise.resolve(
          createJsonResponse({
            data: {
              accessToken: "access-token-guest-reminder",
              user: {
                displayName: "Nila",
                email: "nila@example.com",
                id: "usr_guest_reminder",
                locale: "en-US",
                preferredCurrency: "USD",
                theme: "system",
                timezone: "UTC",
              },
              workspaces: [{ id: "wsp_guest_reminder", name: "Nila", type: "personal" }],
            },
            message: "Login successful.",
            success: true,
          }),
        );
      }

      return Promise.reject(new Error(`Unexpected request: ${url}`));
    });

    window.history.replaceState({}, "", "/login");
    const user = userEvent.setup({
      advanceTimers: (delay) => jest.advanceTimersByTime(delay),
    });
    render(
      <App repository={createRepository()} transactionRepository={createTransactionRepository()} />,
    );

    await user.type(await screen.findByLabelText("Email"), "nila@example.com");
    await user.type(screen.getByLabelText("Password"), "StrongPassword123");
    await user.click(screen.getByRole("button", { name: "Log in" }));

    await expectHomeHeader();

    act(() => {
      jest.advanceTimersByTime(5 * 60 * 1000 + 1);
    });

    expect(screen.queryByText("Protect your guest data")).toBeNull();
    expect(screen.queryByRole("button", { name: "Continue as guest" })).toBeNull();
  });

  it("adds, edits, deletes budget categories and recalculates totals", async () => {
    const fetchMock = globalThis.fetch as jest.MockedFunction<typeof fetch>;
    const currentDate = toLocalDateOnly(new Date());

    mockAuthenticatedFinanceSession(fetchMock, {
      reportingCurrency: "INR",
      transactions: [
        {
          amount: "80.00",
          categoryId: "cat_food",
          createdAt: "2026-06-17T00:00:01.000Z",
          currency: "INR",
          id: "transaction-1",
          note: "Groceries",
          transactionDate: currentDate,
          type: "expense",
          updatedAt: "2026-06-17T00:00:01.000Z",
        },
      ],
    });
    window.history.replaceState({}, "", "/budget");
    const user = userEvent.setup();
    render(
      <App repository={createRepository()} transactionRepository={createTransactionRepository()} />,
    );

    expect(await screen.findByRole("heading", { name: "Budget" })).toBeDefined();
    expect(screen.queryByRole("dialog", { name: "Budget period" })).toBeNull();
    expect(screen.getByText("Budget missing")).toBeDefined();
    expect(screen.queryByText("No monthly budget yet")).toBeDefined();
    expect(screen.queryByRole("button", { name: "Monthly" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Yearly" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Bills" })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Add budget category" }));
    let budgetDialog = screen.getByRole("dialog", { name: "Add budget category" });
    await user.type(within(budgetDialog).getByLabelText("Amount"), "250");
    await user.click(within(budgetDialog).getByRole("button", { name: "Add budget category" }));

    const createBudgetCall = fetchMock.mock.calls.find(
      ([input, init]) =>
        getRequestUrl(input).endsWith("/api/v1/workspaces/wsp_finance/budgets") &&
        init?.method === "POST",
    );

    expect(JSON.parse(getRequestBody(createBudgetCall?.[1]))).toEqual(
      expect.objectContaining({
        currency: "INR",
        limitAmount: { amount: "250.00", currency: "INR" },
      }),
    );
    expect(screen.getAllByRole("heading", { name: "₹250.00" })).toHaveLength(1);
    expect(screen.getByText("₹80.00 spent of ₹250.00")).toBeDefined();
    expect(screen.getAllByText("32%")).toHaveLength(1);
    expect(screen.queryByRole("heading", { name: "Active goals" })).toBeNull();

    await user.click(screen.getByRole("button", { name: /^Filters/ }));
    await user.click(screen.getByRole("button", { name: "This year" }));
    await user.click(screen.getByRole("button", { name: "Apply" }));
    await waitFor(() => expect(document.body.style.overflow).toBe(""));
    expect(await screen.findAllByText("Last 12 months")).toHaveLength(2);
    expect(screen.getByText("Yearly budget summary")).toBeDefined();
    expect(screen.getByText("Budget vs actual")).toBeDefined();
    expect(screen.getByRole("heading", { name: "Month-wise breakdown" })).toBeDefined();
    expect(screen.getByRole("heading", { name: "Category analysis" })).toBeDefined();
    expect(screen.queryByRole("heading", { name: "Yearly trends and insights" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Practical lessons" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Healthy progress only" })).toBeNull();
    expect(screen.getByText("Projected yearly savings")).toBeDefined();
    expect(screen.getByText("1 of 12 monthly plans entered")).toBeDefined();
    await user.click(screen.getByRole("button", { name: /^Filters/ }));
    await user.click(screen.getByRole("button", { name: "This month" }));
    await user.click(screen.getByRole("button", { name: "Apply" }));
    await waitFor(() => expect(document.body.style.overflow).toBe(""));

    await user.click(
      within(screen.getByRole("navigation", { name: "Primary navigation" })).getByRole("button", {
        name: "Home",
      }),
    );
    act(() => {
      window.history.pushState({}, "", "/budget");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(await screen.findByText("₹80.00 spent of ₹250.00")).toBeDefined();

    await user.click(screen.getByRole("button", { name: "Edit Food budget" }));
    budgetDialog = screen.getByRole("dialog", { name: "Edit" });
    const amount = within(budgetDialog).getByLabelText("Amount");
    await user.clear(amount);
    await user.type(amount, "400");
    await user.click(within(budgetDialog).getByRole("button", { name: "Save" }));

    expect(screen.getAllByRole("heading", { name: "₹400.00" })).toHaveLength(1);
    expect(screen.getByText("₹80.00 spent of ₹400.00")).toBeDefined();
    expect(screen.getAllByText("20%")).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "Edit Food budget" }));
    budgetDialog = screen.getByRole("dialog", { name: "Edit" });
    await user.click(within(budgetDialog).getByRole("button", { name: "Delete" }));
    expect(screen.getAllByRole("heading", { name: "₹0.00" })).toHaveLength(1);
    expect(screen.getByText("No monthly budget yet")).toBeDefined();
  }, 15000);

  it("quick-fills the current monthly budget from the previous month", async () => {
    const fetchMock = globalThis.fetch as jest.MockedFunction<typeof fetch>;
    const today = new Date();
    const currentMonthStart = toLocalDateOnly(new Date(today.getFullYear(), today.getMonth(), 1));
    const currentMonthEnd = toLocalDateOnly(new Date(today.getFullYear(), today.getMonth() + 1, 0));
    const nextMonthStart = toLocalDateOnly(new Date(today.getFullYear(), today.getMonth() + 1, 1));
    const nextMonthEnd = toLocalDateOnly(new Date(today.getFullYear(), today.getMonth() + 2, 0));
    const currentMonthLabel = new Intl.DateTimeFormat("en-US", {
      month: "long",
      year: "numeric",
    }).format(today);

    mockAuthenticatedFinanceSession(fetchMock, {
      budgets: [
        {
          categoryId: "cat_food",
          currency: "INR",
          deletedAt: null,
          id: "bgt_june_food",
          limitAmount: "10000.00",
          periodEnd: `${currentMonthEnd}T00:00:00.000Z`,
          periodStart: `${currentMonthStart}T00:00:00.000Z`,
          progressPercent: "0",
          remainingAmount: "10000.00",
          spentAmount: "0",
          updatedAt: "2026-06-01T00:00:00.000Z",
          workspaceId: "wsp_finance",
        },
        {
          categoryId: "cat_food",
          currency: "INR",
          deletedAt: null,
          id: "bgt_june_food_duplicate",
          limitAmount: "10000.00",
          periodEnd: `${currentMonthEnd}T00:00:00.000Z`,
          periodStart: `${currentMonthStart}T00:00:00.000Z`,
          progressPercent: "0",
          remainingAmount: "10000.00",
          spentAmount: "0",
          updatedAt: "2026-06-01T00:00:01.000Z",
          workspaceId: "wsp_finance",
        },
      ],
      reportingCurrency: "INR",
    });
    window.history.replaceState({}, "", "/budget");
    const user = userEvent.setup();
    render(
      <App repository={createRepository()} transactionRepository={createTransactionRepository()} />,
    );

    expect(await screen.findByText("₹0.00 spent of ₹10,000.00")).toBeDefined();
    expect(screen.getAllByText("₹0.00 spent of ₹10,000.00")).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "Next month" }));
    expect(await screen.findByText("No monthly budget yet")).toBeDefined();
    await user.click(await screen.findByRole("button", { name: "Copy previous month" }));

    await waitFor(() =>
      expect(
        fetchMock.mock.calls.find(
          ([input, init]) =>
            getRequestUrl(input).endsWith("/api/v1/workspaces/wsp_finance/budgets") &&
            init?.method === "POST",
        ),
      ).toBeDefined(),
    );
    const createBudgetCall = fetchMock.mock.calls.find(
      ([input, init]) =>
        getRequestUrl(input).endsWith("/api/v1/workspaces/wsp_finance/budgets") &&
        init?.method === "POST",
    );
    const createBudgetCalls = fetchMock.mock.calls.filter(
      ([input, init]) =>
        getRequestUrl(input).endsWith("/api/v1/workspaces/wsp_finance/budgets") &&
        init?.method === "POST",
    );

    expect(createBudgetCalls).toHaveLength(1);
    expect(JSON.parse(getRequestBody(createBudgetCall?.[1]))).toEqual(
      expect.objectContaining({
        categoryId: "cat_food",
        limitAmount: { amount: "10000.00", currency: "INR" },
        periodEnd: nextMonthEnd,
        periodStart: nextMonthStart,
      }),
    );
    expect(await screen.findByText("₹0.00 spent of ₹10,000.00")).toBeDefined();
    expect(screen.getAllByText("₹0.00 spent of ₹10,000.00")).toHaveLength(1);
    expect(screen.queryByText("Budget missing")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Previous month" }));
    expect(await screen.findByText(`${currentMonthLabel} categories`)).toBeDefined();
    expect(screen.getAllByText("₹0.00 spent of ₹10,000.00")).toHaveLength(1);
  });

  it("refreshes authentication and retries budget creation after a 401", async () => {
    const fetchMock = globalThis.fetch as jest.MockedFunction<typeof fetch>;

    mockAuthenticatedFinanceSession(fetchMock, {
      failFirstBudgetCreateAsUnauthenticated: true,
      reportingCurrency: "INR",
    });
    window.history.replaceState({}, "", "/budget");
    const user = userEvent.setup();
    render(
      <App repository={createRepository()} transactionRepository={createTransactionRepository()} />,
    );

    expect(await screen.findByText("No monthly budget yet")).toBeDefined();
    await user.click(screen.getByRole("button", { name: "Add budget category" }));
    const budgetDialog = screen.getByRole("dialog", { name: "Add budget category" });
    await user.type(within(budgetDialog).getByLabelText("Amount"), "250");
    await user.click(within(budgetDialog).getByRole("button", { name: "Add budget category" }));

    await waitFor(() => expect(screen.getByText("₹0.00 spent of ₹250.00")).toBeDefined());
    const createBudgetCalls = fetchMock.mock.calls.filter(
      ([input, init]) =>
        getRequestUrl(input).endsWith("/api/v1/workspaces/wsp_finance/budgets") &&
        init?.method === "POST",
    );
    const refreshCalls = fetchMock.mock.calls.filter(
      ([input, init]) =>
        getRequestUrl(input).endsWith("/api/v1/auth/refresh") && init?.method === "POST",
    );

    expect(createBudgetCalls).toHaveLength(2);
    expect(refreshCalls.length).toBeGreaterThanOrEqual(2);
  });

  it("keeps budget CRUD behind the global authentication boundary", async () => {
    window.history.replaceState({}, "", "/budget");
    render(
      <App repository={createRepository()} transactionRepository={createTransactionRepository()} />,
    );

    expect(
      await screen.findByRole("heading", { name: "Money clarity, made simple." }),
    ).toBeDefined();
    expect(screen.queryByRole("heading", { name: "Budget" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Add budget category" })).toBeNull();
  });

  it("keeps profile editing behind the global authentication boundary", async () => {
    window.history.replaceState({}, "", "/you");
    render(
      <App repository={createRepository()} transactionRepository={createTransactionRepository()} />,
    );

    expect(
      await screen.findByRole("heading", { name: "Money clarity, made simple." }),
    ).toBeDefined();
    expect(screen.queryByRole("heading", { name: "Profile" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Edit display name/ })).toBeNull();
  });

  it("saves the authenticated display name and uses it across the app", async () => {
    window.sessionStorage.setItem("nidhiflow.accessToken", "access-token-profile");
    const fetchMock = globalThis.fetch as jest.MockedFunction<typeof fetch>;
    let displayName = "Nila";
    let rejectedExpiredProfileToken = false;

    fetchMock.mockImplementation((input, init) => {
      const url = getRequestUrl(input);
      const method = init?.method ?? "GET";

      if (url.endsWith("/api/v1/users/me") && method === "GET") {
        return Promise.resolve(
          createJsonResponse({
            data: {
              displayName,
              email: "nila@example.com",
              id: "usr_profile",
              locale: "en-US",
              preferredCurrency: "USD",
              theme: "system",
              timezone: "UTC",
            },
            message: "Current user retrieved successfully.",
            success: true,
          }),
        );
      }

      if (url.endsWith("/api/v1/users/me") && method === "PATCH") {
        if (!rejectedExpiredProfileToken) {
          rejectedExpiredProfileToken = true;
          return Promise.resolve(
            createJsonResponse(
              {
                error: { code: "UNAUTHENTICATED" },
                message: "Authentication is required for this resource.",
                success: false,
              },
              false,
              401,
            ),
          );
        }
        const body = JSON.parse(getRequestBody(init)) as { displayName: string };
        displayName = body.displayName;

        return Promise.resolve(
          createJsonResponse({
            data: {
              displayName,
              email: "nila@example.com",
              id: "usr_profile",
              locale: "en-US",
              preferredCurrency: "USD",
              theme: "system",
              timezone: "UTC",
            },
            message: "Profile updated successfully.",
            success: true,
          }),
        );
      }

      if (url.endsWith("/api/v1/auth/refresh") && method === "POST") {
        return Promise.resolve(
          createJsonResponse({
            data: { accessToken: "access-token-profile-refreshed" },
            message: "Access token refreshed successfully.",
            success: true,
          }),
        );
      }

      if (url.endsWith("/api/v1/workspaces") && method === "GET") {
        return Promise.resolve(
          createJsonResponse({
            data: [{ id: "wsp_profile", name: "Old Workspace Name", type: "personal" }],
            message: "Workspaces retrieved successfully.",
            success: true,
          }),
        );
      }

      return Promise.reject(new Error(`Unexpected request: ${url}`));
    });

    window.history.replaceState({}, "", "/you");
    const user = userEvent.setup();
    render(
      <App repository={createRepository()} transactionRepository={createTransactionRepository()} />,
    );

    await user.click(
      await screen.findByRole("button", { name: /Edit display name, current name Nila/ }),
    );
    const nameDialog = screen.getByRole("dialog", { name: "Edit name" });
    const displayNameInput = within(nameDialog).getByLabelText("Display name");
    expect((displayNameInput as HTMLInputElement).value).toBe("Nila");

    await user.clear(displayNameInput);
    await user.type(displayNameInput, "Priya");
    await user.click(within(nameDialog).getByRole("button", { name: "Save" }));

    await screen.findByText("Profile updated.");
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Edit name" })).toBeNull());
    expect(screen.getByRole("heading", { name: "Priya" })).toBeDefined();

    await user.click(
      within(screen.getByRole("navigation", { name: "Primary navigation" })).getByRole("button", {
        name: "Home",
      }),
    );

    await expectHomeHeader();
    expect(screen.queryByText("Old Workspace Name")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Shared workspace" }));
    const currentWorkspaceDetails = screen.getByRole("region", {
      name: "Current workspace details",
    });
    expect(within(currentWorkspaceDetails).getByText("Old Workspace Name")).toBeDefined();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/users/me"),
      expect.objectContaining({
        body: JSON.stringify({ displayName: "Priya" }),
        headers: expect.objectContaining({
          Authorization: "Bearer access-token-profile",
          "Content-Type": "application/json",
        }),
        method: "PATCH",
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/users/me"),
      expect.objectContaining({
        body: JSON.stringify({ displayName: "Priya" }),
        headers: expect.objectContaining({
          Authorization: "Bearer access-token-profile-refreshed",
        }),
        method: "PATCH",
      }),
    );
  });

  it("has no automated accessibility violations on the public About page", async () => {
    window.history.replaceState({}, "", "/");
    const { container } = render(
      <App repository={createRepository()} transactionRepository={createTransactionRepository()} />,
    );

    await screen.findByRole("heading", { name: "Money clarity, made simple." });

    expect((await axe(container)).violations).toHaveLength(0);
  });

  it("keeps transaction entry behind the global authentication boundary", async () => {
    window.history.replaceState({}, "", "/transactions/new?type=income");
    render(
      <App repository={createRepository()} transactionRepository={createTransactionRepository()} />,
    );

    expect(
      await screen.findByRole("heading", { name: "Money clarity, made simple." }),
    ).toBeDefined();
    expect(screen.queryByLabelText("Amount")).toBeNull();
    expect(screen.queryByRole("heading", { name: "Add Income" })).toBeNull();
  });

  it("opens the expense form from Activity", async () => {
    mockAuthenticatedFinanceSession(globalThis.fetch as jest.MockedFunction<typeof fetch>);
    window.history.replaceState({}, "", "/activity");
    const user = userEvent.setup();
    render(
      <App repository={createRepository()} transactionRepository={createTransactionRepository()} />,
    );

    await user.click(await screen.findByRole("link", { name: "Add a transaction" }));

    expect(await screen.findByRole("heading", { name: "Add Expense" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Misc" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Save Expense" })).toBeDefined();
  });

  it("preserves entered transaction values after validation errors", async () => {
    mockAuthenticatedFinanceSession(globalThis.fetch as jest.MockedFunction<typeof fetch>);
    window.history.replaceState({}, "", "/transactions/new?type=expense");
    const user = userEvent.setup();
    render(
      <App repository={createRepository()} transactionRepository={createTransactionRepository()} />,
    );

    const amount = await screen.findByLabelText("Amount");
    const longNote = "x".repeat(101);
    await user.type(amount, "abc10.999xyz");
    await user.type(screen.getByLabelText(/Note/), longNote);
    await user.click(screen.getByRole("button", { name: "Save Expense" }));

    expect(screen.getByText("Keep the note to 100 characters or fewer.")).toBeDefined();
    expect(screen.getByRole("button", { name: "Misc" }).getAttribute("aria-pressed")).toBe("true");
    expect((amount as HTMLInputElement).value).toBe("10.99");
    expect(screen.getByLabelText<HTMLTextAreaElement>(/Note/).value).toBe(longNote);
  }, 30000);

  it("restores an archived Cash account before creating the default account", async () => {
    const fetchMock = globalThis.fetch as jest.MockedFunction<typeof fetch>;
    mockAuthenticatedFinanceSession(fetchMock, {
      accounts: [
        {
          currency: "USD",
          id: "acc_archived_cash",
          isArchived: true,
          name: "Cash",
          type: "cash",
        },
      ],
      failAccountCreateAsConflict: true,
    });
    window.history.replaceState({}, "", "/transactions/new?type=expense");
    const user = userEvent.setup();
    render(
      <App repository={createRepository()} transactionRepository={createTransactionRepository()} />,
    );

    await user.type(await screen.findByLabelText("Amount"), "12.50");
    await user.click(screen.getByRole("button", { name: "Save Expense" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining(
          "/api/v1/workspaces/wsp_finance/accounts/acc_archived_cash/restore",
        ),
        expect.objectContaining({ method: "POST" }),
      );
    });

    const accountCreateCalls = fetchMock.mock.calls.filter(([input, init]) => {
      const url = getRequestUrl(input);
      return url.endsWith("/api/v1/workspaces/wsp_finance/accounts") && init?.method === "POST";
    });

    expect(accountCreateCalls).toHaveLength(0);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/workspaces/wsp_finance/transactions"),
      expect.objectContaining({
        body: expect.stringContaining('"accountId":"acc_archived_cash"'),
        method: "POST",
      }),
    );
    await expectHomeHeader();
    expect(window.location.pathname).toBe("/");
  });

  it("collapses extra expense categories behind a More option", async () => {
    mockAuthenticatedFinanceSession(globalThis.fetch as jest.MockedFunction<typeof fetch>);
    window.history.replaceState({}, "", "/transactions/new?type=expense");
    const user = userEvent.setup();
    render(
      <App repository={createRepository()} transactionRepository={createTransactionRepository()} />,
    );

    await screen.findByRole("heading", { name: "Add Expense" });

    expect(screen.queryByRole("button", { name: "Travel" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Show more categories" }));

    expect(screen.getByRole("button", { name: "Travel" })).toBeDefined();
    expect(
      within(screen.getByRole("group", { name: "Category" })).getByRole("button", {
        name: "Home",
      }),
    ).toBeDefined();
  });

  it("has no automated accessibility violations on transaction entry", async () => {
    mockAuthenticatedFinanceSession(globalThis.fetch as jest.MockedFunction<typeof fetch>);
    window.history.replaceState({}, "", "/transactions/new?type=expense");
    const { container } = render(
      <App repository={createRepository()} transactionRepository={createTransactionRepository()} />,
    );

    await screen.findByRole("heading", { name: "Add Expense" });
    expect((await axe(container)).violations).toHaveLength(0);
  });

  it("has no automated accessibility violations on the Flow preview screen", async () => {
    mockAuthenticatedFinanceSession(globalThis.fetch as jest.MockedFunction<typeof fetch>);
    window.history.replaceState({}, "", "/flow");
    const { container } = render(
      <App repository={createRepository()} transactionRepository={createTransactionRepository()} />,
    );

    await screen.findByRole("heading", { name: "Flow" });
    expect((await axe(container)).violations).toHaveLength(0);
  });

  it("opens feedback from the Profile page in a modal", async () => {
    mockAuthenticatedFinanceSession(globalThis.fetch as jest.MockedFunction<typeof fetch>);
    window.history.replaceState({}, "", "/you");
    const user = userEvent.setup();
    render(
      <App repository={createRepository()} transactionRepository={createTransactionRepository()} />,
    );

    await screen.findByRole("heading", { name: "Profile" });
    await user.click(screen.getByRole("button", { name: /Share feedback/ }));

    const feedbackDialog = screen.getByRole("dialog", { name: "Feedback" });
    expect(within(feedbackDialog).getByLabelText("Category")).toBeDefined();
    expect(within(feedbackDialog).getByLabelText("Message")).toBeDefined();
    expect(within(feedbackDialog).getByRole("button", { name: "Send feedback" })).toBeDefined();
  });

  it("has no automated accessibility violations on the You page", async () => {
    mockAuthenticatedFinanceSession(globalThis.fetch as jest.MockedFunction<typeof fetch>);
    window.history.replaceState({}, "", "/you");
    const { container } = render(
      <App repository={createRepository()} transactionRepository={createTransactionRepository()} />,
    );

    await screen.findByRole("heading", { name: "Profile" });
    expect(screen.getByRole("button", { name: "Log out" })).toBeDefined();
    expect(screen.getByRole("button", { name: /Edit display name/ })).toBeDefined();
    expect(screen.getByRole("button", { name: /Share feedback/ })).toBeDefined();
    expect(screen.getByRole("link", { name: /^Settings/ })).toBeDefined();
    expect(screen.queryByText("Categories")).toBeNull();
    expect(screen.getByRole("img", { name: "Default avatar for Nila" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Download APK" }).getAttribute("href")).toBe(
      "/downloads/nidhiflow-android-debug-v1.0.9.apk",
    );
    expect(screen.queryByText("Data-protection reminder")).toBeNull();
    expect(screen.queryByText("Repeat reminder")).toBeNull();
    expect((await axe(container)).violations).toHaveLength(0);
  });
});
