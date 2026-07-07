import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "@jest/globals";
import { axe } from "jest-axe";

import { SplashScreen } from "./SplashScreen";

describe("SplashScreen", () => {
  it("shows an accessible brand and session progress state", async () => {
    const view = render(<SplashScreen />);

    expect(screen.getByLabelText("NidhiFlow")).toBeDefined();
    expect(screen.getByRole("status").textContent).toContain("Preparing your finances");
    expect((await axe(view.container)).violations).toHaveLength(0);
  });
});
