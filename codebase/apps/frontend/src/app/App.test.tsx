import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { axe } from "jest-axe";

import type { GuestPreferencesRepository } from "../data/guest/guestPreferencesRepository";
import type { GuestTransactionRepository } from "../data/guest/guestTransactionRepository";
import type { GuestPreferences } from "../domain/preferences/guestPreferences";
import type { GuestTransaction, GuestTransactionInput } from "../domain/transactions/transaction";
import { App } from "./App";

function createJsonResponse(body: unknown, ok = true): Response {
  return {
    json: jest.fn(() => Promise.resolve(body)),
    ok,
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

describe("App", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
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

    expect(links).toEqual(["Home", "Activity", "Flow", "Plan", "You"]);

    await user.click(screen.getByRole("link", { name: "Activity" }));
    expect(await screen.findByRole("heading", { name: "Activity" })).toBeDefined();

    await user.click(screen.getByRole("link", { name: "Flow" }));
    expect(await screen.findByRole("heading", { name: "Flow" })).toBeDefined();

    await user.click(screen.getByRole("link", { name: "Plan" }));
    expect(await screen.findByRole("heading", { name: "Plan" })).toBeDefined();

    await user.click(screen.getByRole("link", { name: "You" }));
    expect(await screen.findByRole("heading", { name: "You" })).toBeDefined();
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

  it("offers immediate guest data migration after signup with consent", async () => {
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

      if (url.endsWith("/api/v1/users/me/guest-migrations") && method === "POST") {
        return Promise.resolve(
          createJsonResponse(
            {
              data: {
                clientMigrationId: "migration-test",
                summary: {
                  importedTransactions: 1,
                  totalTransactions: 1,
                },
                workspaceId: "wsp_789",
              },
              message: "Guest data migrated successfully.",
              success: true,
            },
            true,
          ),
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
    await user.click(screen.getByRole("button", { name: "Create account" }));
    await user.click(await screen.findByRole("button", { name: "Verify and continue" }));

    expect(await screen.findByRole("region", { name: "Move local data" })).toBeDefined();
    expect(screen.getByText(/We found 1 local transaction/)).toBeDefined();

    await user.click(screen.getByRole("button", { name: "Move my data" }));

    await waitFor(() =>
      expect(screen.getByText("Local finance data copied to your account.")).toBeDefined(),
    );
    await user.click(screen.getByRole("link", { name: "Home" }));
    expect(
      within(screen.getByRole("region", { name: "Current balance" })).getByText("-$25.00"),
    ).toBeDefined();
    const migrationCall = fetchMock.mock.calls.find(([input]) =>
      getRequestUrl(input).endsWith("/api/v1/users/me/guest-migrations"),
    );

    expect(migrationCall).toBeDefined();
    expect(migrationCall?.[1]).toEqual(
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer access-token-789",
          "Idempotency-Key": expect.any(String),
        }),
        method: "POST",
      }),
    );
    const migrationBody = migrationCall?.[1]?.body;

    expect(typeof migrationBody).toBe("string");
    expect(JSON.parse(migrationBody as string)).toEqual(
      expect.objectContaining({
        confirm: true,
        transactions: [
          expect.objectContaining({
            amountMinor: "2500",
            id: "guest_txn_1",
          }),
        ],
      }),
    );
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
    const budgetSection = screen.getByRole("region", { name: "Budget plan" });
    const balanceCard = screen.getByRole("region", { name: "Current balance" });

    expect(within(budgetSection).getAllByText("$250.00")).toHaveLength(2);
    expect(within(budgetSection).getByText("$80.00")).toBeDefined();
    expect(within(budgetSection).getAllByText("$170.00")).toHaveLength(2);
    expect(within(budgetSection).getAllByText("68%")).toHaveLength(2);
    expect(within(balanceCard).getByText("$170.00")).toBeDefined();
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

  it("lets a guest add, edit, search, and remove a transaction with accurate totals", async () => {
    window.history.replaceState({}, "", "/");
    const user = userEvent.setup();
    render(
      <App repository={createRepository()} transactionRepository={createTransactionRepository()} />,
    );

    await user.click(await screen.findByRole("link", { name: /Add income/ }));
    await user.type(await screen.findByLabelText("Amount"), "1250.75");
    await user.click(screen.getByRole("button", { name: "Salary" }));
    await user.type(screen.getByLabelText(/Note/), "June salary");
    await user.click(screen.getByRole("button", { name: "Save income" }));

    expect(await screen.findByText("+$1,250.75")).toBeDefined();

    await user.click(screen.getByRole("link", { name: "Home" }));
    expect(
      within(screen.getByRole("region", { name: "Current balance" })).getAllByText("$1,250.75"),
    ).toHaveLength(2);

    await user.click(screen.getByRole("link", { name: "Activity" }));
    await user.type(screen.getByLabelText("Search transactions"), "June");
    expect(screen.getByText("June salary")).toBeDefined();

    await user.click(screen.getByRole("link", { name: "Edit Salary income" }));
    const amount = screen.getByLabelText("Amount");
    await user.clear(amount);
    await user.type(amount, "1300.25");
    await user.click(screen.getByRole("button", { name: "Save income" }));
    expect(await screen.findByText("+$1,300.25")).toBeDefined();

    await user.click(screen.getByRole("link", { name: "Edit Salary income" }));
    await user.click(screen.getByRole("button", { name: "Remove transaction" }));
    await user.click(screen.getByRole("button", { name: "Yes, remove" }));
    expect(await screen.findByText("No activity yet")).toBeDefined();
  });

  it("preserves entered transaction values after validation errors", async () => {
    window.history.replaceState({}, "", "/transactions/new?type=expense");
    const user = userEvent.setup();
    render(
      <App repository={createRepository()} transactionRepository={createTransactionRepository()} />,
    );

    const amount = await screen.findByLabelText("Amount");
    await user.type(amount, "10.999");
    await user.type(screen.getByLabelText(/Note/), "Needs a category");
    await user.click(screen.getByRole("button", { name: "Save expense" }));

    expect(
      screen.getByText("Enter an amount greater than zero with up to 2 decimal places."),
    ).toBeDefined();
    expect(screen.getByText("Choose a category.")).toBeDefined();
    expect((amount as HTMLInputElement).value).toBe("10.999");
    expect(screen.getByLabelText<HTMLTextAreaElement>(/Note/).value).toBe("Needs a category");
  });

  it("has no automated accessibility violations on transaction entry", async () => {
    window.history.replaceState({}, "", "/transactions/new?type=expense");
    const { container } = render(
      <App repository={createRepository()} transactionRepository={createTransactionRepository()} />,
    );

    await screen.findByRole("heading", { name: "Add expense" });
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
