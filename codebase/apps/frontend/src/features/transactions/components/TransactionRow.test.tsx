import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { TransactionRow } from "./TransactionRow";

describe("TransactionRow", () => {
  it("labels Android notification-derived transactions", () => {
    render(
      <MemoryRouter>
        <TransactionRow
          locale="en-IN"
          transaction={{
            amountMinor: "24550",
            category: "Food",
            createdAt: "2026-07-02T10:00:00.000Z",
            currency: "INR",
            id: "txn_notification",
            note: "Corner Cafe",
            source: "ANDROID_NOTIFICATION",
            sourceDetectedAt: "2026-07-02T10:00:00.000Z",
            sourcePackage: "com.google.android.apps.nbu.paisa.user",
            transactionDate: "2026-07-02",
            type: "expense",
            updatedAt: "2026-07-02T10:00:00.000Z",
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("From notification")).toBeDefined();
    expect(screen.getByRole("link").getAttribute("href")).toBe(
      "/transactions/txn_notification/edit",
    );
  });
});
