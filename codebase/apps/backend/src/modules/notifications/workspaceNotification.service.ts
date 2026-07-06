import type { Queryable } from "../../shared/database/database.js";
import { createId } from "../../shared/security/ids.js";
import { NotificationRepository } from "./notification.repository.js";

export type WorkspaceActivityAction =
  | "transaction.created"
  | "transaction.updated"
  | "transaction.deleted"
  | "budget.created"
  | "budget.updated"
  | "budget.archived"
  | "goal.created"
  | "goal.updated"
  | "goal.archived"
  | "goal.contribution.created"
  | "goal.contribution.deleted"
  | "liability.created"
  | "liability.updated"
  | "liability.archived"
  | "liability.payment.created"
  | "liability.restored";

const activityCopy: Record<
  WorkspaceActivityAction,
  { phrase: string; resourceType: "budget" | "goal" | "liability" | "transaction"; title: string }
> = {
  "transaction.created": {
    phrase: "added a transaction",
    resourceType: "transaction",
    title: "Transaction added",
  },
  "transaction.updated": {
    phrase: "edited a transaction",
    resourceType: "transaction",
    title: "Transaction updated",
  },
  "transaction.deleted": {
    phrase: "deleted a transaction",
    resourceType: "transaction",
    title: "Transaction deleted",
  },
  "budget.created": {
    phrase: "created a budget",
    resourceType: "budget",
    title: "Budget created",
  },
  "budget.updated": {
    phrase: "edited a budget",
    resourceType: "budget",
    title: "Budget updated",
  },
  "budget.archived": {
    phrase: "deleted a budget",
    resourceType: "budget",
    title: "Budget deleted",
  },
  "goal.created": {
    phrase: "created a goal",
    resourceType: "goal",
    title: "Goal created",
  },
  "goal.updated": {
    phrase: "edited a goal",
    resourceType: "goal",
    title: "Goal updated",
  },
  "goal.archived": {
    phrase: "archived a goal",
    resourceType: "goal",
    title: "Goal archived",
  },
  "goal.contribution.created": {
    phrase: "added a goal contribution",
    resourceType: "goal",
    title: "Goal contribution added",
  },
  "goal.contribution.deleted": {
    phrase: "removed a goal contribution",
    resourceType: "goal",
    title: "Goal contribution removed",
  },
  "liability.created": {
    phrase: "added a loan",
    resourceType: "liability",
    title: "Loan added",
  },
  "liability.updated": {
    phrase: "edited a loan",
    resourceType: "liability",
    title: "Loan updated",
  },
  "liability.archived": {
    phrase: "archived a loan",
    resourceType: "liability",
    title: "Loan archived",
  },
  "liability.payment.created": {
    phrase: "recorded a loan payment",
    resourceType: "liability",
    title: "Loan payment recorded",
  },
  "liability.restored": {
    phrase: "restored a loan",
    resourceType: "liability",
    title: "Loan restored",
  },
};

const resourcePaths = {
  budget: "/budget",
  goal: "/goals",
  liability: "/liabilities",
  transaction: "/activity",
} as const;

export async function notifyWorkspaceMembers(
  input: {
    action: WorkspaceActivityAction;
    actorUserId: string;
    resourceId: string;
    workspaceId: string;
  },
  queryable: Queryable,
) {
  const repository = new NotificationRepository(queryable);
  const [context, recipients] = await Promise.all([
    repository.getWorkspaceNotificationContext(input.workspaceId, input.actorUserId, queryable),
    repository.listWorkspaceNotificationRecipients(input.workspaceId, input.actorUserId, queryable),
  ]);

  if (!context || recipients.length === 0) return;

  const copy = activityCopy[input.action];
  await Promise.all(
    recipients.map((recipient) =>
      repository.createNotification(
        {
          body: `${context.actorDisplayName} ${copy.phrase} in ${context.workspaceName}.`,
          id: createId("ntf"),
          payload: {
            action: input.action,
            actorUserId: input.actorUserId,
            path: resourcePaths[copy.resourceType],
            resourceId: input.resourceId,
            resourceType: copy.resourceType,
          },
          title: copy.title,
          type: "workspace_activity",
          userId: recipient.userId,
          workspaceId: input.workspaceId,
        },
        queryable,
      ),
    ),
  );
}
