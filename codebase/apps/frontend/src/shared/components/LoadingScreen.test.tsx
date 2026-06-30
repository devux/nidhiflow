import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "@jest/globals";

import { LoadingScreen } from "./LoadingScreen";

describe("LoadingScreen", () => {
  it("shows a route-matched reports skeleton without a loading spinner", () => {
    const { container } = render(<LoadingScreen routePath="/reports" />);

    expect(screen.getByRole("status", { name: "Loading page content" })).toBeDefined();
    expect(container.querySelector(".page-loading--reports")).not.toBeNull();
    expect(container.querySelector(".page-loading__donut")).not.toBeNull();
    expect(container.querySelector(".loading-spinner")).toBeNull();
  });

  it("shows the transaction form structure while a transaction route loads", () => {
    const { container } = render(<LoadingScreen routePath="/transactions/new" variant="overlay" />);

    expect(container.querySelector(".state-screen--overlay")).not.toBeNull();
    expect(container.querySelector(".page-loading--transaction")).not.toBeNull();
    expect(container.querySelectorAll(".page-loading__category")).toHaveLength(8);
  });
});
