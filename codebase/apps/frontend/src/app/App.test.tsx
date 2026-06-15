import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, jest } from "@jest/globals";
import { axe } from "jest-axe";

import type { GuestPreferencesRepository } from "../data/guest/guestPreferencesRepository";
import type { GuestPreferences } from "../domain/preferences/guestPreferences";
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

describe("App", () => {
  it("lets a guest enter and navigate the five mobile destinations in order", async () => {
    window.history.replaceState({}, "", "/");
    const user = userEvent.setup();
    render(<App repository={createRepository()} />);

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
    render(<App repository={repository} />);

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
    const { container } = render(<App repository={createRepository()} />);

    await screen.findByRole("heading", { name: /Guest/ });

    expect((await axe(container)).violations).toHaveLength(0);
  });
});
