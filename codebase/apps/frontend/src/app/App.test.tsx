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

function toApiDateTimestamp(dateOnly: string): string {
  return new Date(`${dateOnly}T00:00:00+05:30`).toISOString();
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
    budgets?: Array<Record<string, unknown>>;
    failFirstBudgetCreateAsUnauthenticated?: boolean;
    reportingCurrency?: string;
    transactions?: unknown[];
  } = {},
) {
  let budgets = [...(options.budgets ?? [])];
  let hasRejectedBudgetCreate = false;
  const reportingCurrency = options.reportingCurrency ?? "USD";

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
          data: {
            displayName: "Nila",
            email: "nila@example.com",
            id: "usr_finance",
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
          data: [
            { id: "cat_salary", isArchived: false, name: "Salary", transactionType: "income" },
            { id: "cat_freelance", isArchived: false, name: "Freelance", transactionType: "income" },
            { id: "cat_business", isArchived: false, name: "Business", transactionType: "income" },
            { id: "cat_interest", isArchived: false, name: "Interest", transactionType: "income" },
            { id: "cat_food", isArchived: false, name: "Food", transactionType: "expense" },
            { id: "cat_shopping", isArchived: false, name: "Shopping", transactionType: "expense" },
            { id: "cat_transport", isArchived: false, name: "Transport", transactionType: "expense" },
            { id: "cat_bills", isArchived: false, name: "Bills", transactionType: "expense" },
            { id: "cat_entertainment", isArchived: false, name: "Entertainment", transactionType: "expense" },
            { id: "cat_health", isArchived: false, name: "Health", transactionType: "expense" },
            { id: "cat_education", isArchived: false, name: "Education", transactionType: "expense" },
            { id: "cat_travel", isArchived: false, name: "Travel", transactionType: "expense" },
            { id: "cat_home", isArchived: false, name: "Home", transactionType: "expense" },
          ],
          message: "Categories retrieved successfully.",
          success: true,
        }),
      );
    }

    if (url.endsWith("/api/v1/workspaces/wsp_finance/accounts") && method === "GET") {
      return Promise.resolve(
        createJsonResponse({
          data: [
            {
              currency: "USD",
              id: "acc_cash",
              isArchived: false,
              name: "Cash",
              type: "cash",
            },
          ],
          message: "Accounts retrieved successfully.",
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

      const body = JSON.parse(String(init?.body ?? "{}")) as {
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

    const budgetMatch = /\/api\/v1\/workspaces\/wsp_finance\/budgets\/([^/]+)$/.exec(url);

    if (budgetMatch && method === "PATCH") {
      const body = JSON.parse(String(init?.body ?? "{}")) as {
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

  it("lets a guest enter and navigate the five mobile destinations in order", async () => {
    window.history.replaceState({}, "", "/");
    const user = userEvent.setup();
    render(
      <App repository={createRepository()} transactionRepository={createTransactionRepository()} />,
    );

    expect(await screen.findByRole("heading", { name: /Guest/ })).toBeDefined();

    const navigation = screen.getByRole("navigation", { name: "Primary navigation" });
    const links = Array.from(navigation.querySelectorAll("a")).map((link) =>
      link.textContent?.trim(),
    );

    expect(links).toEqual(["Home", "Activity", "Flow", "Budget", "You"]);

    await user.click(screen.getByRole("link", { name: "Activity" }));
    expect(await screen.findByRole("heading", { name: "Activity" })).toBeDefined();

    await user.click(screen.getByRole("link", { name: "Flow" }));
    expect(await screen.findByRole("heading", { name: "Flow" })).toBeDefined();

    await user.click(screen.getByRole("link", { name: "Budget" }));
    expect(await screen.findByRole("heading", { name: "Budget" })).toBeDefined();

    await user.click(screen.getByRole("link", { name: "You" }));
    expect(await screen.findByRole("heading", { name: "You" })).toBeDefined();
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
    expect(await screen.findByRole("heading", { name: "April 15, 2026" })).toBeDefined();
    expect(screen.getByText("Groceries")).toBeDefined();
  });

  it("links the Home notification entry to the guest preferences page", async () => {
    window.history.replaceState({}, "", "/");
    const user = userEvent.setup();
    render(
      <App repository={createRepository()} transactionRepository={createTransactionRepository()} />,
    );

    await screen.findByRole("heading", { name: /Guest/ });
    await user.click(screen.getByRole("link", { name: "Notification preferences" }));

    expect(await screen.findByRole("heading", { name: "You" })).toBeDefined();
  });

  it("lets a guest create and verify an account", async () => {
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
            data: { debugToken: "verify-token-123", status: "pending_verification" },
            message: "Verification instructions are ready.",
            success: true,
          }),
        );
      }

      if (url.endsWith("/api/v1/auth/verify-email") && method === "POST") {
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
              workspace: { id: "wsp_123", name: "Maya", type: "personal" },
            },
            message: "Email verified successfully.",
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

    expect(await screen.findByDisplayValue("verify-token-123")).toBeDefined();
    await user.click(screen.getByRole("button", { name: "Verify and continue" }));

    expect(await screen.findByText("Signed in")).toBeDefined();
    expect(screen.getByText(/maya@example.com/)).toBeDefined();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/auth/register"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("does not prompt guests to migrate locally written data after signup", async () => {
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
            data: { debugToken: "verify-token-789", status: "pending_verification" },
            message: "Verification instructions are ready.",
            success: true,
          }),
        );
      }

      if (url.endsWith("/api/v1/auth/verify-email") && method === "POST") {
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
              workspace: { id: "wsp_789", name: "Maya", type: "personal" },
            },
            message: "Email verified successfully.",
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

    await user.type(await screen.findByLabelText("Email"), "maya@example.com");
    await user.type(screen.getByLabelText("Password"), "StrongPassword123");
    await user.click(screen.getByRole("button", { name: "Create account" }));
    await user.click(await screen.findByRole("button", { name: "Verify and continue" }));

    expect(await screen.findByText("Signed in")).toBeDefined();
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

    expect(await screen.findByText("Signed in")).toBeDefined();
    expect(screen.getByText(/nila@example.com/)).toBeDefined();
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

    expect(await screen.findByText("Signed in")).toBeDefined();
    firstRender.unmount();

    fetchMock.mockImplementation(() => Promise.reject(new Error("Network unavailable.")));
    window.history.replaceState({}, "", "/you");
    render(
      <App repository={createRepository()} transactionRepository={createTransactionRepository()} />,
    );

    expect(await screen.findByText("Signed in")).toBeDefined();
    expect(screen.getByText(/nila@example.com/)).toBeDefined();
    expect(screen.queryByText("Guest user")).toBeNull();
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

    expect(await screen.findByText("Signed in")).toBeDefined();
    expect(screen.getByText(/nila@example.com/)).toBeDefined();
    expect(screen.queryByText("Guest user")).toBeNull();
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

    expect(await screen.findByText("Signed in")).toBeDefined();
    expect(screen.getByText(/nila@example.com/)).toBeDefined();
    expect(screen.queryByText("Guest user")).toBeNull();
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

    expect(await screen.findByRole("heading", { name: /Nila/ })).toBeDefined();
    expect(screen.getByText("Nila Workspace")).toBeDefined();
    expect(screen.queryByRole("heading", { name: /Guest/ })).toBeNull();
  });

  it("asks unauthenticated users after refresh whether to continue as guest or log in", async () => {
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
    const firstRender = render(
      <App repository={createRepository()} transactionRepository={createTransactionRepository()} />,
    );

    expect(await screen.findByRole("dialog", { name: "Continue in guest mode?" })).toBeDefined();
    await user.click(screen.getByRole("button", { name: "Continue as guest" }));
    expect(screen.queryByRole("dialog", { name: "Continue in guest mode?" })).toBeNull();
    firstRender.unmount();

    window.history.replaceState({}, "", "/");
    render(
      <App repository={createRepository()} transactionRepository={createTransactionRepository()} />,
    );

    await user.click(await screen.findByRole("button", { name: "Log in" }));
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

    expect(await screen.findByText("Signed in")).toBeDefined();
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

    expect(await screen.findByText("Signed in")).toBeDefined();

    act(() => {
      jest.advanceTimersByTime(5 * 60 * 1000 + 1);
    });

    expect(screen.queryByText("Protect your guest data")).toBeNull();
    expect(screen.queryByRole("button", { name: "Continue as guest" })).toBeNull();
  });

  it("shows Home budget and goal totals derived from transactions", async () => {
    window.history.replaceState({}, "", "/");
    render(
      <App
        repository={createRepository()}
        transactionRepository={createTransactionRepository([
          {
            amountMinor: "25000",
            category: "Salary",
            createdAt: "2026-06-17T00:00:00.000Z",
            currency: "USD",
            id: "transaction-1",
            note: "June salary",
            transactionDate: "2026-06-17",
            type: "income",
            updatedAt: "2026-06-17T00:00:00.000Z",
          },
          {
            amountMinor: "8000",
            category: "Food",
            createdAt: "2026-06-17T00:00:01.000Z",
            currency: "USD",
            id: "transaction-2",
            note: "Groceries",
            transactionDate: "2026-06-17",
            type: "expense",
            updatedAt: "2026-06-17T00:00:01.000Z",
          },
        ])}
      />,
    );

    expect(await screen.findByRole("heading", { name: /Guest/ })).toBeDefined();
    const budgetSection = screen.getByRole("region", { name: "Budget summaries" });

    expect(within(budgetSection).queryByText("Savings goal")).toBeNull();
    expect(
      within(budgetSection).queryByRole("progressbar", { name: "Goal progress: 68 percent" }),
    ).toBeNull();
    expect(within(budgetSection).getByText("$250.00")).toBeDefined();
    expect(within(budgetSection).getByText("$80.00")).toBeDefined();
    expect(within(budgetSection).getByText("$170.00")).toBeDefined();
    expect(screen.queryByRole("region", { name: "Current balance" })).toBeNull();
  });

  it("adds, edits, deletes budget categories and recalculates totals", async () => {
    const fetchMock = globalThis.fetch as jest.MockedFunction<typeof fetch>;

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
          transactionDate: "2026-06-17",
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
    expect(screen.getByText("Monthly budget required")).toBeDefined();
    expect(screen.queryByText("No monthly budget yet")).toBeDefined();
    expect(screen.getByRole("button", { name: "Monthly" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
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

    expect(JSON.parse(String(createBudgetCall?.[1]?.body))).toEqual(
      expect.objectContaining({
        currency: "INR",
        limitAmount: { amount: "250.00", currency: "INR" },
      }),
    );
    expect(screen.getAllByRole("heading", { name: "₹250.00" })).toHaveLength(1);
    expect(screen.getByText("₹80.00 spent of ₹250.00")).toBeDefined();
    expect(screen.getAllByText("32%")).toHaveLength(2);
    expect(screen.queryByRole("heading", { name: "Active goals" })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Yearly" }));
    expect(screen.getByRole("heading", { name: "Last 12 months" })).toBeDefined();
    expect(screen.getByText("Yearly budget summary")).toBeDefined();
    expect(screen.getByText("Budget vs actual")).toBeDefined();
    expect(screen.getByRole("heading", { name: "Month-wise breakdown" })).toBeDefined();
    expect(screen.getByRole("heading", { name: "Category analysis" })).toBeDefined();
    expect(screen.getByRole("heading", { name: "Yearly trends and insights" })).toBeDefined();
    expect(screen.getByText("Projected yearly savings")).toBeDefined();
    expect(screen.getByText("1 of 12 monthly plans entered")).toBeDefined();
    await user.click(screen.getByRole("button", { name: "Monthly" }));

    await user.click(screen.getByRole("link", { name: "Home" }));
    await user.click(screen.getByRole("link", { name: "Budget" }));
    expect(await screen.findByText("₹80.00 spent of ₹250.00")).toBeDefined();

    await user.click(screen.getByRole("button", { name: "Edit Food budget" }));
    budgetDialog = screen.getByRole("dialog", { name: "Edit budget category" });
    const amount = within(budgetDialog).getByLabelText("Amount");
    await user.clear(amount);
    await user.type(amount, "400");
    await user.click(within(budgetDialog).getByRole("button", { name: "Save budget category" }));

    expect(screen.getAllByRole("heading", { name: "₹400.00" })).toHaveLength(1);
    expect(screen.getByText("₹80.00 spent of ₹400.00")).toBeDefined();
    expect(screen.getAllByText("20%")).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: "Delete Food budget" }));
    expect(screen.getAllByRole("heading", { name: "₹0.00" })).toHaveLength(1);
    expect(screen.getByText("No monthly budget yet")).toBeDefined();
  });

  it("quick-fills the current monthly budget from the previous month", async () => {
    const fetchMock = globalThis.fetch as jest.MockedFunction<typeof fetch>;

    mockAuthenticatedFinanceSession(fetchMock, {
      budgets: [
        {
          categoryId: "cat_food",
          currency: "INR",
          deletedAt: null,
          id: "bgt_june_food",
          limitAmount: "10000.00",
          periodEnd: "2026-06-30T00:00:00.000Z",
          periodStart: "2026-06-01T00:00:00.000Z",
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
          periodEnd: "2026-06-30T00:00:00.000Z",
          periodStart: "2026-06-01T00:00:00.000Z",
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
    expect(JSON.parse(String(createBudgetCall?.[1]?.body))).toEqual(
      expect.objectContaining({
        categoryId: "cat_food",
        limitAmount: { amount: "10000.00", currency: "INR" },
        periodEnd: "2026-07-31",
        periodStart: "2026-07-01",
      }),
    );
    expect(await screen.findByText("₹0.00 spent of ₹10,000.00")).toBeDefined();
    expect(screen.getAllByText("₹0.00 spent of ₹10,000.00")).toHaveLength(1);
    expect(screen.queryByText("Monthly budget required")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Previous month" }));
    expect(await screen.findByText("June 2026 categories")).toBeDefined();
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

  it("blocks guest budget category CRUD and prompts for authentication", async () => {
    window.history.replaceState({}, "", "/budget");
    const user = userEvent.setup();
    render(
      <App repository={createRepository()} transactionRepository={createTransactionRepository()} />,
    );

    expect(await screen.findByRole("heading", { name: "Budget" })).toBeDefined();
    await user.click(screen.getByRole("button", { name: "Add budget category" }));

    expect(
      await screen.findByRole("dialog", { name: "Sign in to save budget changes" }),
    ).toBeDefined();
    expect(screen.queryByRole("dialog", { name: "Add budget category" })).toBeNull();
    expect(screen.getByRole("link", { name: "Log in" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Sign up" })).toBeDefined();
  });

  it("validates and saves the local guest display name", async () => {
    window.history.replaceState({}, "", "/you");
    const repository = createRepository();
    const user = userEvent.setup();
    render(<App repository={repository} transactionRepository={createTransactionRepository()} />);

    const displayName = await screen.findByLabelText("Display name");
    await user.clear(displayName);
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByText("Enter a name between 1 and 40 characters.")).toBeDefined();
    expect(repository.save).not.toHaveBeenCalled();

    await user.type(displayName, "Maya");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(repository.save).toHaveBeenCalledWith({
        ...defaultPreferences,
        displayName: "Maya",
      }),
    );
    expect(screen.getByText("Preferences saved on this device.")).toBeDefined();
  });

  it("has no automated accessibility violations on the guest home screen", async () => {
    window.history.replaceState({}, "", "/");
    const { container } = render(
      <App repository={createRepository()} transactionRepository={createTransactionRepository()} />,
    );

    await screen.findByRole("heading", { name: /Guest/ });

    expect((await axe(container)).violations).toHaveLength(0);
  });

  it("blocks guest transaction writes and prompts for authentication", async () => {
    window.history.replaceState({}, "", "/");
    const user = userEvent.setup();
    render(
      <App repository={createRepository()} transactionRepository={createTransactionRepository()} />,
    );

    await user.click(await screen.findByRole("link", { name: /Add income/ }));

    expect(await screen.findByRole("heading", { name: "Sign in to save changes" })).toBeDefined();
    expect(screen.queryByLabelText("Amount")).toBeNull();
    expect(screen.getByRole("link", { name: "Log in" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Sign up" })).toBeDefined();
  });

  it("opens the income form from Activity when the income filter is selected", async () => {
    mockAuthenticatedFinanceSession(globalThis.fetch as jest.MockedFunction<typeof fetch>);
    window.history.replaceState({}, "", "/activity");
    const user = userEvent.setup();
    render(
      <App repository={createRepository()} transactionRepository={createTransactionRepository()} />,
    );

    await user.click(await screen.findByRole("button", { name: "Income" }));
    await user.click(screen.getByRole("link", { name: "Add transaction" }));

    expect(await screen.findByRole("heading", { name: "Add Income" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Salary" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Save Income" })).toBeDefined();
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
    expect(screen.getByRole("button", { name: "Food" }).getAttribute("aria-pressed")).toBe("true");
    expect((amount as HTMLInputElement).value).toBe("10.99");
    expect(screen.getByLabelText<HTMLTextAreaElement>(/Note/).value).toBe(longNote);
  }, 10000);

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
    expect(screen.getByRole("button", { name: "Home" })).toBeDefined();
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
    window.history.replaceState({}, "", "/flow");
    const { container } = render(
      <App repository={createRepository()} transactionRepository={createTransactionRepository()} />,
    );

    await screen.findByRole("heading", { name: "Flow" });
    expect((await axe(container)).violations).toHaveLength(0);
  });

  it("has no automated accessibility violations on the You page", async () => {
    window.history.replaceState({}, "", "/you");
    const { container } = render(
      <App repository={createRepository()} transactionRepository={createTransactionRepository()} />,
    );

    await screen.findByRole("heading", { name: "You" });
    expect((await axe(container)).violations).toHaveLength(0);
  });
});
