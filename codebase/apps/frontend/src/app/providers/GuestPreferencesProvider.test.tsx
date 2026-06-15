import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, jest } from "@jest/globals";

import type { GuestPreferencesRepository } from "../../data/guest/guestPreferencesRepository";
import { GuestPreferencesProvider } from "./GuestPreferencesProvider";

describe("GuestPreferencesProvider", () => {
  it("shows a safe retry state when IndexedDB cannot be opened", async () => {
    const user = userEvent.setup();
    const repository: GuestPreferencesRepository = {
      load: jest.fn(() => Promise.reject(new Error("private storage detail"))),
      save: jest.fn(() => Promise.resolve()),
    };

    render(
      <GuestPreferencesProvider repository={repository}>
        <p>Loaded</p>
      </GuestPreferencesProvider>,
    );

    expect(
      await screen.findByRole("heading", { name: "Local storage is unavailable" }),
    ).toBeDefined();
    expect(screen.queryByText("private storage detail")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(repository.load).toHaveBeenCalledTimes(2);
  });
});
