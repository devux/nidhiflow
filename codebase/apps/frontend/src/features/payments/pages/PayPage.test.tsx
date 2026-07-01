import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import { PayPage } from "./PayPage";

const authState = {
  accessToken: "access-token",
  isAuthenticated: true,
};

jest.mock("../../../app/providers/AuthProvider", () => ({
  useAuth: () => authState,
}));

jest.mock("../native/upiPayments", () => ({
  isNativeAndroid: () => false,
  upiPayments: {},
}));

describe("PayPage", () => {
  it("requires authentication before collecting payment details", () => {
    authState.accessToken = "";
    authState.isAuthenticated = false;

    render(
      <MemoryRouter>
        <PayPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Pay with UPI" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Log in" })).toBeDefined();
  });

  it("validates manual details and explains Android availability", async () => {
    authState.accessToken = "access-token";
    authState.isAuthenticated = true;
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <PayPage />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText("UPI ID"), "shop@bank");
    await user.type(screen.getByLabelText("Amount (INR)"), "10.50");
    await user.click(screen.getByRole("button", { name: "Choose UPI app" }));

    expect(
      screen.getByText("Direct UPI payment launch requires the NidhiFlow Android app."),
    ).toBeDefined();
  });
});
