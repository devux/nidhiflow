import { describe, expect, it } from "@jest/globals";

import { buildFlowConversation, type ChatEntry } from "./FlowPage";

describe("buildFlowConversation", () => {
  it("keeps the welcome message visible without sending it to the backend", () => {
    const entries: ChatEntry[] = [
      {
        content: "Ask me to search transactions or explain this month.",
        id: "welcome",
        isWelcome: true,
        role: "assistant",
      },
      {
        content: "Show my food expenses this month",
        id: "user-message",
        role: "user",
      },
    ];

    expect(buildFlowConversation(entries)).toEqual([
      {
        content: "Show my food expenses this month",
        role: "user",
      },
    ]);
  });
});
