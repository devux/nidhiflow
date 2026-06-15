import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "@jest/globals";

import { App } from "./App";

describe("App", () => {
  it("renders the project foundation status", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "NidhiFlow is ready to grow." })).toBeDefined();
  });
});
