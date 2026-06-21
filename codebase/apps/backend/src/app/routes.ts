import { Router } from "express";

import type { Environment } from "./config/environment.js";
import { createCategoriesRouter } from "../modules/categories/category.routes.js";
import { createWorkspaceCategoriesRouter } from "../modules/categories/workspace-category.routes.js";
import { createFeedbackRouter } from "../modules/feedback/feedback.routes.js";
import {
  createFlowLaunchSubscriptionsRouter,
  createNotificationPreferencesRouter,
  createNotificationsRouter,
} from "../modules/notifications/notification.routes.js";
import { createAuthRouter } from "../modules/auth/auth.routes.js";
import { createOpenApiRouter } from "../modules/openapi/openapi.routes.js";
import { createUsersRouter } from "../modules/users/user.routes.js";
import { createWorkspacesRouter } from "../modules/workspaces/workspace.routes.js";
import { createWorkspaceInvitationsRouter } from "../modules/workspaces/workspace-invitation.routes.js";
import { createAccountsRouter } from "../modules/accounts/account.routes.js";
import { createTransactionsRouter } from "../modules/transactions/transaction.routes.js";
import { createBudgetsRouter } from "../modules/budgets/budget.routes.js";
import { createGoalsRouter } from "../modules/goals/goal.routes.js";
import { createBillsRouter } from "../modules/bills/bill.routes.js";
import { createRecurringTransactionsRouter } from "../modules/recurringTransactions/recurringTransaction.routes.js";
import { createReportsRouter } from "../modules/reports/report.routes.js";
import { createFlowRouter } from "../modules/flow/flow.routes.js";
import type { Database } from "../shared/database/database.js";
import { createRateLimit } from "./middleware/rateLimit.js";

interface ApiRoutesDependencies {
  database: Database;
  environment: Environment;
  feedbackRateLimitMax: number;
  feedbackRateLimitWindowMs: number;
}

export function createApiRoutes({
  database,
  environment,
  feedbackRateLimitMax,
  feedbackRateLimitWindowMs,
}: ApiRoutesDependencies) {
  const router = Router();

  router.use("/openapi.json", createOpenApiRouter());
  router.use("/auth", createAuthRouter({ database, environment }));
  router.use("/users", createUsersRouter({ database, environment }));
  router.use(
    "/users/me/notification-preferences",
    createNotificationPreferencesRouter({ database, environment }),
  );
  router.use("/notifications", createNotificationsRouter({ database, environment }));
  router.use(
    "/flow-launch-subscriptions",
    createFlowLaunchSubscriptionsRouter({ database, environment }),
  );
  router.use("/workspace-invitations", createWorkspaceInvitationsRouter({ database, environment }));
  router.use("/workspaces", createWorkspacesRouter({ database, environment }));
  router.use("/workspaces/:workspaceId/accounts", createAccountsRouter({ database, environment }));
  router.use(
    "/workspaces/:workspaceId/categories",
    createWorkspaceCategoriesRouter({ database, environment }),
  );
  router.use(
    "/workspaces/:workspaceId/transactions",
    createTransactionsRouter({ database, environment }),
  );
  router.use("/workspaces/:workspaceId/budgets", createBudgetsRouter({ database, environment }));
  router.use("/workspaces/:workspaceId/goals", createGoalsRouter({ database, environment }));
  router.use("/workspaces/:workspaceId/bills", createBillsRouter({ database, environment }));
  router.use("/workspaces/:workspaceId/reports", createReportsRouter({ database, environment }));
  router.use("/workspaces/:workspaceId/flow", createFlowRouter({ database, environment }));
  router.use(
    "/workspaces/:workspaceId/recurring-transactions",
    createRecurringTransactionsRouter({ database, environment }),
  );
  router.use("/categories/system", createCategoriesRouter({ database }));
  router.use(
    "/feedback",
    createRateLimit({
      keyPrefix: "feedback",
      limit: feedbackRateLimitMax,
      windowMs: feedbackRateLimitWindowMs,
    }),
    createFeedbackRouter({ database }),
  );

  return router;
}
