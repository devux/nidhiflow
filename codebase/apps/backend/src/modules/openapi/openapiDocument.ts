export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "NidhiFlow API",
    version: "0.1.0",
    description: "Executable contract for the NidhiFlow backend foundation.",
  },
  servers: [{ url: "/api/v1" }],
  paths: {
    "/openapi.json": {
      get: {
        operationId: "getOpenApiDocument",
        responses: {
          "200": {
            description: "OpenAPI contract",
          },
        },
      },
    },
    "/categories/system": {
      get: {
        operationId: "listSystemCategories",
        parameters: [
          {
            in: "query",
            name: "transactionType",
            required: false,
            schema: {
              enum: ["income", "expense"],
              type: "string",
            },
          },
        ],
        responses: {
          "200": {
            description: "System categories retrieved successfully",
          },
          "422": {
            description: "Validation error",
          },
        },
      },
    },
    "/auth/register": {
      post: {
        operationId: "registerAccount",
        responses: {
          "202": {
            description: "Registration accepted",
          },
          "422": {
            description: "Validation error",
          },
          "429": {
            description: "Rate limited",
          },
        },
      },
    },
    "/auth/login": {
      post: {
        operationId: "login",
        responses: {
          "200": {
            description: "Login successful",
          },
          "401": {
            description: "Invalid credentials or unverified account",
          },
          "422": {
            description: "Validation error",
          },
        },
      },
    },
    "/auth/refresh": {
      post: {
        operationId: "refreshSession",
        responses: {
          "200": {
            description: "Session refreshed",
          },
          "401": {
            description: "Session invalid or expired",
          },
        },
      },
    },
    "/auth/logout": {
      post: {
        operationId: "logout",
        responses: {
          "200": {
            description: "Session closed",
          },
        },
      },
    },
    "/auth/logout-all": {
      post: {
        operationId: "logoutAllSessions",
        responses: {
          "200": {
            description: "All sessions closed",
          },
          "401": {
            description: "Authentication required",
          },
        },
      },
    },
    "/auth/verify-email": {
      post: {
        operationId: "verifyEmail",
        responses: {
          "200": {
            description: "Email verified and personal workspace created",
          },
          "400": {
            description: "Verification token invalid or expired",
          },
        },
      },
    },
    "/auth/resend-verification": {
      post: {
        operationId: "resendVerification",
        responses: {
          "202": {
            description: "Verification resend accepted",
          },
        },
      },
    },
    "/auth/forgot-password": {
      post: {
        operationId: "forgotPassword",
        responses: {
          "202": {
            description: "Password reset request accepted",
          },
        },
      },
    },
    "/auth/reset-password": {
      post: {
        operationId: "resetPassword",
        responses: {
          "200": {
            description: "Password reset successful",
          },
          "400": {
            description: "Password reset token invalid or expired",
          },
        },
      },
    },
    "/feedback": {
      post: {
        operationId: "createFeedback",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["category", "description"],
                properties: {
                  category: {
                    enum: ["suggestion", "issue", "general"],
                    type: "string",
                  },
                  description: {
                    maxLength: 1000,
                    minLength: 10,
                    type: "string",
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Feedback received successfully",
          },
          "422": {
            description: "Validation error",
          },
          "429": {
            description: "Rate limited",
          },
        },
      },
    },
    "/users/me": {
      get: {
        operationId: "getCurrentUser",
        responses: {
          "200": {
            description: "Current profile retrieved",
          },
          "401": {
            description: "Authentication required",
          },
        },
      },
      patch: {
        operationId: "updateCurrentUser",
        responses: {
          "200": {
            description: "Current profile updated",
          },
          "401": {
            description: "Authentication required",
          },
          "422": {
            description: "Validation error",
          },
        },
      },
    },
    "/users/me/guest-migrations/preview": {
      post: {
        operationId: "previewGuestMigration",
        responses: {
          "200": {
            description: "Guest migration preview generated",
          },
          "401": {
            description: "Authentication required",
          },
          "422": {
            description: "Validation error",
          },
        },
      },
    },
    "/users/me/guest-migrations": {
      post: {
        operationId: "commitGuestMigration",
        responses: {
          "201": {
            description: "Guest migration committed",
          },
          "401": {
            description: "Authentication required",
          },
          "409": {
            description: "Duplicate migration or idempotency conflict",
          },
          "422": {
            description: "Validation error",
          },
        },
      },
    },
    "/users/me/sessions": {
      get: {
        operationId: "listCurrentUserSessions",
        responses: {
          "200": {
            description: "Active sessions retrieved",
          },
          "401": {
            description: "Authentication required",
          },
        },
      },
    },
    "/users/me/sessions/{sessionId}": {
      delete: {
        operationId: "revokeUserSession",
        parameters: [
          {
            in: "path",
            name: "sessionId",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          "200": {
            description: "Session revoked",
          },
          "401": {
            description: "Authentication required",
          },
          "404": {
            description: "Session not found",
          },
        },
      },
    },
    "/workspaces": {
      get: {
        operationId: "listWorkspaces",
        responses: {
          "200": {
            description: "Workspace memberships retrieved",
          },
          "401": {
            description: "Authentication required",
          },
        },
      },
    },
    "/workspaces/{workspaceId}": {
      get: {
        operationId: "getWorkspace",
        parameters: [
          {
            in: "path",
            name: "workspaceId",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          "200": {
            description: "Workspace retrieved",
          },
          "401": {
            description: "Authentication required",
          },
          "404": {
            description: "Workspace not found",
          },
        },
      },
    },
    "/workspaces/{workspaceId}/accounts": {
      get: {
        operationId: "listAccounts",
        responses: {
          "200": { description: "Accounts retrieved" },
          "401": { description: "Authentication required" },
        },
      },
      post: {
        operationId: "createAccount",
        responses: {
          "201": { description: "Account created" },
          "401": { description: "Authentication required" },
          "422": { description: "Validation error" },
        },
      },
    },
    "/workspaces/{workspaceId}/accounts/{accountId}": {
      get: {
        operationId: "getAccount",
        responses: {
          "200": { description: "Account retrieved" },
          "401": { description: "Authentication required" },
          "404": { description: "Account not found" },
        },
      },
      patch: {
        operationId: "updateAccount",
        responses: {
          "200": { description: "Account updated" },
          "401": { description: "Authentication required" },
          "404": { description: "Account not found" },
          "422": { description: "Validation error" },
        },
      },
      delete: {
        operationId: "archiveAccount",
        responses: {
          "200": { description: "Account archived" },
          "401": { description: "Authentication required" },
          "404": { description: "Account not found" },
        },
      },
    },
    "/workspaces/{workspaceId}/accounts/summary": {
      get: {
        operationId: "getAccountSummary",
        responses: {
          "200": { description: "Account summary retrieved" },
          "401": { description: "Authentication required" },
        },
      },
    },
    "/workspaces/{workspaceId}/categories": {
      get: {
        operationId: "listWorkspaceCategories",
        responses: {
          "200": { description: "Categories retrieved" },
          "401": { description: "Authentication required" },
        },
      },
      post: {
        operationId: "createWorkspaceCategory",
        responses: {
          "201": { description: "Category created" },
          "401": { description: "Authentication required" },
          "422": { description: "Validation error" },
        },
      },
    },
    "/workspaces/{workspaceId}/categories/{categoryId}": {
      get: {
        operationId: "getWorkspaceCategory",
        responses: {
          "200": { description: "Category retrieved" },
          "401": { description: "Authentication required" },
          "404": { description: "Category not found" },
        },
      },
      patch: {
        operationId: "updateWorkspaceCategory",
        responses: {
          "200": { description: "Category updated" },
          "401": { description: "Authentication required" },
          "404": { description: "Category not found" },
          "422": { description: "Validation error" },
        },
      },
      delete: {
        operationId: "archiveWorkspaceCategory",
        responses: {
          "200": { description: "Category archived" },
          "401": { description: "Authentication required" },
          "404": { description: "Category not found" },
        },
      },
    },
    "/workspaces/{workspaceId}/transactions": {
      get: {
        operationId: "listTransactions",
        responses: {
          "200": { description: "Transactions retrieved" },
          "401": { description: "Authentication required" },
        },
      },
      post: {
        operationId: "createTransaction",
        responses: {
          "201": { description: "Transaction created" },
          "401": { description: "Authentication required" },
          "404": { description: "Linked resource not found" },
          "422": { description: "Validation error" },
        },
      },
    },
    "/workspaces/{workspaceId}/budgets": {
      get: {
        operationId: "listBudgets",
        responses: {
          "200": { description: "Budgets retrieved" },
          "401": { description: "Authentication required" },
        },
      },
      post: {
        operationId: "createBudget",
        responses: {
          "201": { description: "Budget created" },
          "401": { description: "Authentication required" },
          "422": { description: "Validation error" },
        },
      },
    },
    "/workspaces/{workspaceId}/budgets/summary": {
      get: {
        operationId: "getBudgetSummary",
        responses: {
          "200": { description: "Budget summary retrieved" },
          "401": { description: "Authentication required" },
        },
      },
    },
    "/workspaces/{workspaceId}/budgets/{budgetId}": {
      get: {
        operationId: "getBudget",
        responses: {
          "200": { description: "Budget retrieved" },
          "401": { description: "Authentication required" },
          "404": { description: "Budget not found" },
        },
      },
      patch: {
        operationId: "updateBudget",
        responses: {
          "200": { description: "Budget updated" },
          "401": { description: "Authentication required" },
          "404": { description: "Budget not found" },
          "422": { description: "Validation error" },
        },
      },
      delete: {
        operationId: "archiveBudget",
        responses: {
          "200": { description: "Budget archived" },
          "401": { description: "Authentication required" },
          "404": { description: "Budget not found" },
        },
      },
    },
    "/workspaces/{workspaceId}/goals": {
      get: {
        operationId: "listGoals",
        responses: {
          "200": { description: "Goals retrieved" },
          "401": { description: "Authentication required" },
        },
      },
      post: {
        operationId: "createGoal",
        responses: {
          "201": { description: "Goal created" },
          "401": { description: "Authentication required" },
          "422": { description: "Validation error" },
        },
      },
    },
    "/workspaces/{workspaceId}/goals/{goalId}": {
      get: {
        operationId: "getGoal",
        responses: {
          "200": { description: "Goal retrieved" },
          "401": { description: "Authentication required" },
          "404": { description: "Goal not found" },
        },
      },
      patch: {
        operationId: "updateGoal",
        responses: {
          "200": { description: "Goal updated" },
          "401": { description: "Authentication required" },
          "404": { description: "Goal not found" },
          "409": { description: "Goal cannot be completed yet" },
          "422": { description: "Validation error" },
        },
      },
      delete: {
        operationId: "archiveGoal",
        responses: {
          "200": { description: "Goal archived" },
          "401": { description: "Authentication required" },
          "404": { description: "Goal not found" },
        },
      },
    },
    "/workspaces/{workspaceId}/goals/{goalId}/contributions": {
      post: {
        operationId: "createGoalContribution",
        responses: {
          "201": { description: "Goal contribution created" },
          "401": { description: "Authentication required" },
          "404": { description: "Goal not found" },
          "409": { description: "Goal not active" },
          "422": { description: "Validation error" },
        },
      },
    },
    "/workspaces/{workspaceId}/goals/{goalId}/contributions/{contributionId}": {
      delete: {
        operationId: "deleteGoalContribution",
        responses: {
          "200": { description: "Goal contribution deleted" },
          "401": { description: "Authentication required" },
          "404": { description: "Goal not found" },
        },
      },
    },
    "/workspaces/{workspaceId}/bills": {
      get: {
        operationId: "listBills",
        responses: {
          "200": { description: "Bills retrieved" },
          "401": { description: "Authentication required" },
        },
      },
      post: {
        operationId: "createBill",
        responses: {
          "201": { description: "Bill created" },
          "401": { description: "Authentication required" },
          "422": { description: "Validation error" },
        },
      },
    },
    "/workspaces/{workspaceId}/bills/{billId}": {
      get: {
        operationId: "getBill",
        responses: {
          "200": { description: "Bill retrieved" },
          "401": { description: "Authentication required" },
          "404": { description: "Bill not found" },
        },
      },
      patch: {
        operationId: "updateBill",
        responses: {
          "200": { description: "Bill updated" },
          "401": { description: "Authentication required" },
          "404": { description: "Bill not found" },
          "422": { description: "Validation error" },
        },
      },
      delete: {
        operationId: "archiveBill",
        responses: {
          "200": { description: "Bill archived" },
          "401": { description: "Authentication required" },
          "404": { description: "Bill not found" },
        },
      },
    },
    "/workspaces/{workspaceId}/bills/{billId}/mark-paid": {
      post: {
        operationId: "markBillPaid",
        responses: {
          "200": { description: "Bill marked paid" },
          "401": { description: "Authentication required" },
          "404": { description: "Bill not found" },
          "422": { description: "Validation error" },
        },
      },
    },
    "/workspaces/{workspaceId}/recurring-transactions": {
      get: {
        operationId: "listRecurringTransactions",
        responses: {
          "200": { description: "Recurring transactions retrieved" },
          "401": { description: "Authentication required" },
        },
      },
      post: {
        operationId: "createRecurringTransaction",
        responses: {
          "201": { description: "Recurring transaction created" },
          "401": { description: "Authentication required" },
          "422": { description: "Validation error" },
        },
      },
    },
    "/workspaces/{workspaceId}/recurring-transactions/{recurringTransactionId}": {
      get: {
        operationId: "getRecurringTransaction",
        responses: {
          "200": { description: "Recurring transaction retrieved" },
          "401": { description: "Authentication required" },
          "404": { description: "Recurring transaction not found" },
        },
      },
      patch: {
        operationId: "updateRecurringTransaction",
        responses: {
          "200": { description: "Recurring transaction updated" },
          "401": { description: "Authentication required" },
          "404": { description: "Recurring transaction not found" },
          "422": { description: "Validation error" },
        },
      },
      delete: {
        operationId: "archiveRecurringTransaction",
        responses: {
          "200": { description: "Recurring transaction archived" },
          "401": { description: "Authentication required" },
          "404": { description: "Recurring transaction not found" },
        },
      },
    },
    "/workspaces/{workspaceId}/recurring-transactions/{recurringTransactionId}/pause": {
      post: {
        operationId: "pauseRecurringTransaction",
        responses: {
          "200": { description: "Recurring transaction paused" },
          "401": { description: "Authentication required" },
          "404": { description: "Recurring transaction not found" },
        },
      },
    },
    "/workspaces/{workspaceId}/recurring-transactions/{recurringTransactionId}/resume": {
      post: {
        operationId: "resumeRecurringTransaction",
        responses: {
          "200": { description: "Recurring transaction resumed" },
          "401": { description: "Authentication required" },
          "404": { description: "Recurring transaction not found" },
        },
      },
    },
  },
} as const;
