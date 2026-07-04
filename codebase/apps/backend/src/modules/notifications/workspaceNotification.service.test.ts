import { describe, expect, it, vi } from "vitest";

import type { Queryable } from "../../shared/database/database.js";
import { notifyWorkspaceMembers } from "./workspaceNotification.service.js";

describe("workspace activity notifications", () => {
  it("creates a safe personal notification for every other opted-in workspace member", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({
        rows: [{ actorDisplayName: "Nila", workspaceName: "Home team" }],
      })
      .mockResolvedValueOnce({
        rows: [{ userId: "usr_two" }, { userId: "usr_three" }],
      })
      .mockResolvedValue({ rows: [] });
    const database = { query } as unknown as Queryable;

    await notifyWorkspaceMembers(
      {
        action: "transaction.updated",
        actorUserId: "usr_one",
        resourceId: "txn_one",
        workspaceId: "wsp_one",
      },
      database,
    );

    expect(query).toHaveBeenCalledTimes(4);
    for (const call of query.mock.calls.slice(2)) {
      const values = call[1] as unknown[];
      expect(values[2]).toBe("wsp_one");
      expect(values[3]).toBe("workspace_activity");
      expect(values[4]).toBe("Transaction updated");
      expect(values[5]).toBe("Nila edited a transaction in Home team.");
      expect(JSON.parse(values[6] as string)).toEqual({
        action: "transaction.updated",
        actorUserId: "usr_one",
        path: "/activity",
        resourceId: "txn_one",
        resourceType: "transaction",
      });
    }
  });

  it("does not create a notification when no other opted-in member exists", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({
        rows: [{ actorDisplayName: "Nila", workspaceName: "Personal" }],
      })
      .mockResolvedValueOnce({ rows: [] });
    const database = { query } as unknown as Queryable;

    await notifyWorkspaceMembers(
      {
        action: "goal.created",
        actorUserId: "usr_one",
        resourceId: "gol_one",
        workspaceId: "wsp_one",
      },
      database,
    );

    expect(query).toHaveBeenCalledTimes(2);
  });
});
