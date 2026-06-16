export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "NidhiFlow API",
    version: "0.1.0",
    description: "Milestone 5 executable contract for the NidhiFlow backend foundation.",
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
  },
} as const;
