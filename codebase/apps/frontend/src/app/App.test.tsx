import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, jest } from "@jest/globals";
import { axe } from "jest-axe";

import type { GuestPreferencesRepository } from "../data/guest/guestPreferencesRepository";
import type { GuestTransactionRepository } from "../data/guest/guestTransactionRepository";
import type { GuestPreferences } from "../domain/preferences/guestPreferences";
import type { GuestTransaction, GuestTransactionInput } from "../domain/transactions/transaction";
import { App } from "./App";

const defaultPreferences: GuestPreferences = {
  currency: "USD",
  displayName: "Guest",
  locale: "en-US",
  reminderEnabled: true,
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
    expect(await screen.findAllByText("$1,250.75")).toHaveLength(2);

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
});
