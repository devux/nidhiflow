const jsonContent = "application/json";

const bearerSecurity = [{ bearerAuth: [] }];

function ref(name: string) {
  return { $ref: `#/components/schemas/${name}` };
}

function parameterRef(name: string) {
  return { $ref: `#/components/parameters/${name}` };
}

function requestBody(schema: unknown, required = true) {
  return {
    required,
    content: {
      [jsonContent]: {
        schema,
      },
    },
  };
}

function successResponse(description: string, data: unknown, statusMessage = description) {
  return {
    description,
    content: {
      [jsonContent]: {
        schema: {
          allOf: [
            ref("SuccessResponse"),
            {
              type: "object",
              required: ["data"],
              properties: {
                message: { example: statusMessage, type: "string" },
                data,
              },
            },
          ],
        },
      },
    },
  };
}

function binaryResponse(description: string, mediaType = "text/csv") {
  return {
    description,
    content: {
      [mediaType]: {
        schema: {
          format: "binary",
          type: "string",
        },
      },
    },
  };
}

function errorResponse(description: string) {
  return {
    description,
    content: {
      [jsonContent]: {
        schema: ref("ErrorResponse"),
      },
    },
  };
}

function responseSet(
  success: Record<string, unknown>,
  options: {
    auth?: boolean;
    conflict?: boolean;
    forbidden?: boolean;
    notFound?: boolean;
    rateLimit?: boolean;
    validation?: boolean;
  } = {},
) {
  return {
    ...success,
    "400": errorResponse("Malformed request or invalid token."),
    ...(options.auth
      ? { "401": errorResponse("Authentication is required or the session expired.") }
      : {}),
    ...(options.forbidden
      ? { "403": errorResponse("The authenticated actor is not allowed to perform this action.") }
      : {}),
    ...(options.notFound ? { "404": errorResponse("The requested resource was not found.") } : {}),
    ...(options.conflict
      ? { "409": errorResponse("The request conflicts with the current resource state.") }
      : {}),
    ...(options.validation
      ? { "422": errorResponse("Validation failed for the request body, path, query, or headers.") }
      : {}),
    ...(options.rateLimit ? { "429": errorResponse("The rate limit was exceeded.") } : {}),
    "500": errorResponse(
      "An unexpected server error occurred. Stack traces and internal details are never returned.",
    ),
  };
}

function operation(input: {
  description: string;
  operationId: string;
  parameters?: unknown[];
  requestBody?: unknown;
  responses: Record<string, unknown>;
  security?: unknown[];
  summary: string;
  tags: string[];
}) {
  return {
    tags: input.tags,
    summary: input.summary,
    description: input.description,
    operationId: input.operationId,
    ...(input.security ? { security: input.security } : {}),
    ...(input.parameters ? { parameters: input.parameters } : {}),
    ...(input.requestBody ? { requestBody: input.requestBody } : {}),
    responses: input.responses,
  };
}

const moneySchema = {
  type: "object",
  required: ["amount", "currency"],
  properties: {
    amount: {
      description: "Fixed-precision decimal string. Financial values are never JSON numbers.",
      example: "1250.0000",
      pattern: "^-?\\d+(\\.\\d{1,4})?$",
      type: "string",
    },
    currency: {
      description: "Uppercase ISO 4217 currency code.",
      example: "INR",
      pattern: "^[A-Z]{3}$",
      type: "string",
    },
  },
};

const dateOnly = {
  description: "Date-only finance field in YYYY-MM-DD format.",
  example: "2026-06-15",
  format: "date",
  type: "string",
};

const timestamp = {
  description: "UTC ISO 8601 timestamp.",
  example: "2026-06-15T10:30:00.000Z",
  format: "date-time",
  type: "string",
};

const id = {
  description: "Opaque server-generated identifier.",
  example: "usr_123",
  type: "string",
};

const emptyStatus = {
  type: "object",
  required: ["status"],
  properties: {
    status: { type: "string" },
  },
};

const createAccountRequest = {
  type: "object",
  required: ["currency", "name", "openingBalance", "type"],
  properties: {
    currency: { example: "INR", pattern: "^[A-Z]{3}$", type: "string" },
    name: { maxLength: 80, minLength: 1, type: "string" },
    openingBalance: moneySchema,
    type: { enum: ["cash", "bank", "credit_card", "loan", "wallet", "other"], type: "string" },
  },
};

const updateAccountRequest = {
  type: "object",
  minProperties: 1,
  properties: createAccountRequest.properties,
};

const createCategoryRequest = {
  type: "object",
  required: ["name", "transactionType"],
  properties: {
    colorToken: { maxLength: 40, type: "string" },
    iconKey: { maxLength: 40, type: "string" },
    name: { maxLength: 80, minLength: 1, type: "string" },
    parentCategoryId: { type: "string" },
    transactionType: { enum: ["income", "expense"], type: "string" },
  },
};

const updateCategoryRequest = {
  type: "object",
  minProperties: 1,
  properties: {
    ...createCategoryRequest.properties,
    colorToken: { maxLength: 40, nullable: true, type: "string" },
    iconKey: { maxLength: 40, nullable: true, type: "string" },
    parentCategoryId: { nullable: true, type: "string" },
  },
};

const createTransactionRequest = {
  type: "object",
  required: ["accountId", "money", "transactionDate", "type"],
  properties: {
    accountId: { type: "string" },
    categoryId: {
      description: "Required for income and expense. Omitted for transfers.",
      type: "string",
    },
    destinationAccountId: { description: "Required for transfers.", type: "string" },
    money: moneySchema,
    note: { maxLength: 100, type: "string" },
    transactionDate: dateOnly,
    type: { enum: ["income", "expense", "transfer"], type: "string" },
  },
};

const createBudgetRequest = {
  type: "object",
  required: ["currency", "limitAmount", "periodEnd", "periodStart"],
  properties: {
    categoryId: { nullable: true, type: "string" },
    currency: { example: "INR", pattern: "^[A-Z]{3}$", type: "string" },
    limitAmount: moneySchema,
    periodEnd: dateOnly,
    periodStart: dateOnly,
  },
};

const updateBudgetRequest = {
  type: "object",
  minProperties: 1,
  properties: createBudgetRequest.properties,
};

const createGoalRequest = {
  type: "object",
  required: ["currency", "name", "targetAmount", "type"],
  properties: {
    currency: { example: "INR", pattern: "^[A-Z]{3}$", type: "string" },
    name: { maxLength: 80, minLength: 1, type: "string" },
    targetAmount: moneySchema,
    targetDate: dateOnly,
    type: { enum: ["savings", "debt"], type: "string" },
  },
};

const updateGoalRequest = {
  type: "object",
  minProperties: 1,
  properties: {
    ...createGoalRequest.properties,
    status: { enum: ["active", "completed", "archived"], type: "string" },
  },
};

const createContributionRequest = {
  type: "object",
  required: ["amount", "contributionDate"],
  properties: {
    amount: moneySchema,
    contributionDate: dateOnly,
    transactionId: { type: "string" },
  },
};

const createBillRequest = {
  type: "object",
  required: ["accountId", "amount", "dueDate", "name"],
  properties: {
    accountId: { type: "string" },
    amount: moneySchema,
    categoryId: { type: "string" },
    dueDate: dateOnly,
    name: { maxLength: 80, minLength: 1, type: "string" },
    recurrenceRule: { type: "string" },
  },
};

const updateBillRequest = {
  type: "object",
  minProperties: 1,
  properties: {
    ...createBillRequest.properties,
    status: { enum: ["pending", "paid", "overdue"], type: "string" },
  },
};

const createRecurringTransactionRequest = {
  type: "object",
  required: ["accountId", "amount", "name", "scheduleRule", "timezone", "type"],
  properties: {
    accountId: { type: "string" },
    amount: moneySchema,
    categoryId: {
      description: "Required for income and expense. Omitted for transfers.",
      type: "string",
    },
    destinationAccountId: { description: "Required for transfers.", type: "string" },
    name: { maxLength: 80, minLength: 1, type: "string" },
    nextOccurrence: dateOnly,
    note: { maxLength: 100, type: "string" },
    scheduleRule: {
      description: "Application-defined recurrence rule string.",
      minLength: 1,
      type: "string",
    },
    timezone: { example: "Asia/Kolkata", minLength: 1, type: "string" },
    type: { enum: ["income", "expense", "transfer"], type: "string" },
  },
};

const updateRecurringTransactionRequest = {
  type: "object",
  minProperties: 1,
  properties: {
    ...createRecurringTransactionRequest.properties,
    isActive: { type: "boolean" },
  },
};

const reportFilters = [
  {
    in: "query",
    name: "period",
    required: false,
    schema: { enum: ["thisMonth", "lastMonth", "thisYear", "custom"], type: "string" },
  },
  { in: "query", name: "from", required: false, schema: dateOnly },
  { in: "query", name: "to", required: false, schema: dateOnly },
];

const createReportExportRequest = {
  type: "object",
  required: ["reportType"],
  properties: {
    reportType: { enum: ["summary", "categories", "cashFlow"], type: "string" },
    period: { enum: ["thisMonth", "lastMonth", "thisYear", "custom"], type: "string" },
    from: dateOnly,
    to: dateOnly,
  },
};

const guestTransaction = {
  type: "object",
  required: [
    "amountMinor",
    "category",
    "createdAt",
    "currency",
    "id",
    "note",
    "transactionDate",
    "type",
    "updatedAt",
  ],
  properties: {
    amountMinor: {
      description: "Positive whole-number minor-unit string from the guest device.",
      example: "125000",
      pattern: "^\\d+$",
      type: "string",
    },
    category: { type: "string" },
    createdAt: timestamp,
    currency: { example: "INR", pattern: "^[A-Z]{3}$", type: "string" },
    deletedAt: timestamp,
    id: { maxLength: 120, minLength: 1, type: "string" },
    note: { maxLength: 100, type: "string" },
    transactionDate: dateOnly,
    type: { enum: ["income", "expense"], type: "string" },
    updatedAt: timestamp,
  },
};

const guestMigrationPayload = {
  type: "object",
  required: ["clientMigrationId", "guestProfile", "transactions"],
  properties: {
    clientMigrationId: { maxLength: 120, minLength: 1, type: "string" },
    guestProfile: {
      type: "object",
      required: ["currency", "displayName", "locale", "timezone"],
      properties: {
        currency: { example: "INR", pattern: "^[A-Z]{3}$", type: "string" },
        displayName: { maxLength: 80, minLength: 1, type: "string" },
        locale: { example: "en-IN", type: "string" },
        timezone: { example: "Asia/Kolkata", type: "string" },
      },
    },
    transactions: { items: guestTransaction, maxItems: 2000, type: "array" },
    workspace: {
      type: "object",
      properties: {
        currency: { example: "INR", pattern: "^[A-Z]{3}$", type: "string" },
        name: { maxLength: 80, minLength: 1, type: "string" },
        timezone: { example: "Asia/Kolkata", type: "string" },
      },
    },
  },
};

const flowChatRequest = {
  type: "object",
  required: ["messages"],
  properties: {
    messages: {
      maxItems: 12,
      minItems: 1,
      type: "array",
      items: {
        type: "object",
        required: ["role", "content"],
        properties: {
          role: { enum: ["assistant", "user"], type: "string" },
          content: { maxLength: 2000, minLength: 1, type: "string" },
        },
      },
    },
  },
};

const flowChatResponse = {
  type: "object",
  required: ["message", "model", "tools", "toolResults"],
  properties: {
    message: { type: "string" },
    model: { example: "llama3.2:3b", type: "string" },
    tools: {
      type: "array",
      items: {
        type: "object",
        required: ["name", "description"],
        properties: {
          name: { type: "string" },
          description: { type: "string" },
        },
      },
    },
    toolResults: {
      type: "array",
      items: {
        type: "object",
        required: ["name", "result"],
        properties: {
          name: { type: "string" },
          result: {},
        },
      },
    },
  },
};

const paths = {
  "/health/live": {
    get: operation({
      tags: ["Health"],
      summary: "Check backend liveness",
      description:
        "Confirms that the backend process is running. This endpoint is outside the /api/v1 prefix.",
      operationId: "getHealthLive",
      responses: responseSet({
        "200": successResponse("Backend process is alive.", {
          type: "object",
          required: ["status"],
          properties: { status: { example: "ok", type: "string" } },
        }),
      }),
    }),
  },
  "/health/ready": {
    get: operation({
      tags: ["Health"],
      summary: "Check backend readiness",
      description: "Confirms PostgreSQL connectivity. This endpoint is outside the /api/v1 prefix.",
      operationId: "getHealthReady",
      responses: responseSet({
        "200": successResponse("Backend is ready.", {
          type: "object",
          required: ["status"],
          properties: { status: { example: "ready", type: "string" } },
        }),
        "503": successResponse("Backend is not ready.", {
          type: "object",
          required: ["status"],
          properties: { status: { example: "unavailable", type: "string" } },
        }),
      }),
    }),
  },
  "/api/v1/openapi.json": {
    get: operation({
      tags: ["OpenAPI"],
      summary: "Get OpenAPI contract",
      description: "Returns this OpenAPI contract as JSON.",
      operationId: "getOpenApiDocument",
      responses: responseSet({ "200": { description: "OpenAPI contract." } }),
    }),
  },
  "/api/v1/auth/register": {
    post: operation({
      tags: ["Auth"],
      summary: "Register account",
      description:
        "Creates an active account, creates the personal workspace, starts a browser session, and sets the rotating HttpOnly refresh cookie. Email verification is deferred.",
      operationId: "registerAccount",
      requestBody: requestBody(ref("RegisterRequest")),
      responses: responseSet(
        { "201": successResponse("Account created successfully.", ref("AuthSession")) },
        { conflict: true, rateLimit: true, validation: true },
      ),
    }),
  },
  "/api/v1/auth/login": {
    post: operation({
      tags: ["Auth"],
      summary: "Log in",
      description:
        "Starts an authenticated browser session and sets the rotating HttpOnly refresh cookie.",
      operationId: "login",
      requestBody: requestBody(ref("LoginRequest")),
      responses: responseSet(
        { "200": successResponse("Login successful.", ref("AuthSession")) },
        { auth: true, rateLimit: true, validation: true },
      ),
    }),
  },
  "/api/v1/auth/refresh": {
    post: operation({
      tags: ["Auth"],
      summary: "Refresh session",
      description: "Rotates the refresh session cookie and returns a short-lived access token.",
      operationId: "refreshSession",
      responses: responseSet(
        { "200": successResponse("Session refreshed successfully.", ref("RefreshResult")) },
        { auth: true, rateLimit: true },
      ),
    }),
  },
  "/api/v1/auth/logout": {
    post: operation({
      tags: ["Auth"],
      summary: "Log out current session",
      description:
        "Revokes the current refresh session when present and clears the refresh cookie.",
      operationId: "logout",
      responses: responseSet({
        "200": successResponse("Session closed successfully.", emptyStatus),
      }),
    }),
  },
  "/api/v1/auth/logout-all": {
    post: operation({
      tags: ["Auth"],
      summary: "Log out all sessions",
      description: "Revokes every active session for the authenticated user.",
      operationId: "logoutAllSessions",
      security: bearerSecurity,
      responses: responseSet(
        { "200": successResponse("All sessions closed successfully.", emptyStatus) },
        { auth: true },
      ),
    }),
  },
  "/api/v1/auth/verify-email": {
    post: operation({
      tags: ["Auth"],
      summary: "Verify email",
      description:
        "Consumes a verification token, creates the personal workspace, and starts the first session.",
      operationId: "verifyEmail",
      requestBody: requestBody(ref("TokenRequest")),
      responses: responseSet(
        { "200": successResponse("Email verified successfully.", ref("VerifyEmailResult")) },
        { conflict: true, rateLimit: true, validation: true },
      ),
    }),
  },
  "/api/v1/auth/resend-verification": {
    post: operation({
      tags: ["Auth"],
      summary: "Resend verification",
      description: "Accepts a resend request without revealing whether the email exists.",
      operationId: "resendVerification",
      requestBody: requestBody(ref("EmailRequest")),
      responses: responseSet(
        { "202": successResponse("Verification resend accepted.", ref("DebugTokenResult")) },
        { rateLimit: true, validation: true },
      ),
    }),
  },
  "/api/v1/auth/forgot-password": {
    post: operation({
      tags: ["Auth"],
      summary: "Request password reset",
      description: "Accepts a password reset request without revealing whether the email exists.",
      operationId: "forgotPassword",
      requestBody: requestBody(ref("EmailRequest")),
      responses: responseSet(
        { "202": successResponse("Password reset request accepted.", ref("DebugTokenResult")) },
        { rateLimit: true, validation: true },
      ),
    }),
  },
  "/api/v1/auth/reset-password": {
    post: operation({
      tags: ["Auth"],
      summary: "Reset password",
      description:
        "Consumes a password reset token, changes the password, and clears browser refresh cookies.",
      operationId: "resetPassword",
      requestBody: requestBody(ref("ResetPasswordRequest")),
      responses: responseSet(
        { "200": successResponse("Password reset successful.", emptyStatus) },
        { rateLimit: true, validation: true },
      ),
    }),
  },
  "/api/v1/users/me": {
    get: operation({
      tags: ["Users"],
      summary: "Get current user",
      description: "Returns the authenticated user's profile and preferences.",
      operationId: "getCurrentUser",
      security: bearerSecurity,
      responses: responseSet(
        { "200": successResponse("Current profile retrieved.", ref("User")) },
        { auth: true },
      ),
    }),
    patch: operation({
      tags: ["Users"],
      summary: "Update current user",
      description: "Updates profile and preference fields for the authenticated user.",
      operationId: "updateCurrentUser",
      security: bearerSecurity,
      requestBody: requestBody(ref("UpdateUserRequest")),
      responses: responseSet(
        { "200": successResponse("Current profile updated.", ref("User")) },
        { auth: true, validation: true },
      ),
    }),
  },
  "/api/v1/users/me/sessions": {
    get: operation({
      tags: ["Users"],
      summary: "List active sessions",
      description:
        "Lists refresh sessions for the authenticated user without exposing token secrets.",
      operationId: "listCurrentUserSessions",
      security: bearerSecurity,
      responses: responseSet(
        { "200": successResponse("Sessions retrieved.", { items: ref("Session"), type: "array" }) },
        { auth: true },
      ),
    }),
  },
  "/api/v1/users/me/sessions/{sessionId}": {
    delete: operation({
      tags: ["Users"],
      summary: "Revoke session",
      description: "Revokes a single session belonging to the authenticated user.",
      operationId: "revokeCurrentUserSession",
      security: bearerSecurity,
      parameters: [parameterRef("sessionId")],
      responses: responseSet(
        { "200": successResponse("Session revoked.", emptyStatus) },
        { auth: true, notFound: true, validation: true },
      ),
    }),
  },
  "/api/v1/users/me/guest-migrations/preview": {
    post: operation({
      tags: ["Users", "Guest Migrations"],
      summary: "Preview guest migration",
      description:
        "Validates local guest finance data and returns importability, duplicate, and skipped-deleted summaries. Does not upload changes permanently.",
      operationId: "previewGuestMigration",
      security: bearerSecurity,
      requestBody: requestBody(ref("GuestMigrationPayload")),
      responses: responseSet(
        {
          "200": successResponse(
            "Guest migration preview generated.",
            ref("GuestMigrationPreview"),
          ),
        },
        { auth: true, notFound: true, validation: true },
      ),
    }),
  },
  "/api/v1/users/me/guest-migrations": {
    post: operation({
      tags: ["Users", "Guest Migrations"],
      summary: "Commit guest migration",
      description:
        "Idempotently imports confirmed guest data into the authenticated user's personal workspace.",
      operationId: "commitGuestMigration",
      security: bearerSecurity,
      parameters: [parameterRef("idempotencyKey")],
      requestBody: requestBody(ref("GuestMigrationCommitRequest")),
      responses: responseSet(
        {
          "201": successResponse("Guest data migrated successfully.", ref("GuestMigrationCommit")),
        },
        { auth: true, conflict: true, notFound: true, validation: true },
      ),
    }),
  },
  "/api/v1/workspaces": {
    get: operation({
      tags: ["Workspaces"],
      summary: "List workspaces",
      description: "Lists workspaces where the authenticated user is a member.",
      operationId: "listWorkspaces",
      security: bearerSecurity,
      responses: responseSet(
        {
          "200": successResponse("Workspaces retrieved.", {
            items: ref("Workspace"),
            type: "array",
          }),
        },
        { auth: true },
      ),
    }),
    post: operation({
      tags: ["Workspaces"],
      summary: "Create workspace",
      description:
        "Creates a personal or family workspace and makes the authenticated user the manager.",
      operationId: "createWorkspace",
      security: bearerSecurity,
      requestBody: requestBody(ref("CreateWorkspaceRequest")),
      responses: responseSet(
        { "201": successResponse("Workspace created.", ref("Workspace")) },
        { auth: true, conflict: true, validation: true },
      ),
    }),
  },
  "/api/v1/workspaces/{workspaceId}": {
    get: operation({
      tags: ["Workspaces"],
      summary: "Get workspace",
      description: "Returns workspace details for an accessible workspace.",
      operationId: "getWorkspace",
      security: bearerSecurity,
      parameters: [parameterRef("workspaceId")],
      responses: responseSet(
        { "200": successResponse("Workspace retrieved.", ref("Workspace")) },
        { auth: true, notFound: true, validation: true },
      ),
    }),
    patch: operation({
      tags: ["Workspaces"],
      summary: "Update workspace",
      description: "Updates workspace display settings.",
      operationId: "updateWorkspace",
      security: bearerSecurity,
      parameters: [parameterRef("workspaceId")],
      requestBody: requestBody(ref("UpdateWorkspaceRequest")),
      responses: responseSet(
        { "200": successResponse("Workspace updated.", ref("Workspace")) },
        { auth: true, forbidden: true, notFound: true, validation: true },
      ),
    }),
    delete: operation({
      tags: ["Workspaces"],
      summary: "Archive workspace",
      description:
        "Archives a family workspace when the authenticated user has manager capability. Personal workspaces cannot be deleted here.",
      operationId: "archiveWorkspace",
      security: bearerSecurity,
      parameters: [parameterRef("workspaceId")],
      responses: responseSet(
        { "200": successResponse("Workspace archived.", ref("Workspace")) },
        { auth: true, conflict: true, forbidden: true, notFound: true, validation: true },
      ),
    }),
  },
  "/api/v1/workspaces/{workspaceId}/members": {
    get: operation({
      tags: ["Workspace Members"],
      summary: "List workspace members",
      description: "Lists members of an accessible workspace.",
      operationId: "listWorkspaceMembers",
      security: bearerSecurity,
      parameters: [parameterRef("workspaceId")],
      responses: responseSet(
        {
          "200": successResponse("Workspace members retrieved.", {
            items: ref("WorkspaceMember"),
            type: "array",
          }),
        },
        { auth: true, notFound: true, validation: true },
      ),
    }),
  },
  "/api/v1/workspaces/{workspaceId}/invitations": {
    post: operation({
      tags: ["Workspace Members"],
      summary: "Invite workspace member",
      description:
        "Creates a family workspace invitation. Non-production responses may include debugToken.",
      operationId: "createWorkspaceInvitation",
      security: bearerSecurity,
      parameters: [parameterRef("workspaceId")],
      requestBody: requestBody(ref("CreateWorkspaceInvitationRequest")),
      responses: responseSet(
        { "201": successResponse("Workspace invitation created.", ref("WorkspaceInvitation")) },
        { auth: true, conflict: true, forbidden: true, notFound: true, validation: true },
      ),
    }),
  },
  "/api/v1/workspaces/{workspaceId}/share-codes": {
    post: operation({
      tags: ["Workspace Members"],
      summary: "Create workspace share code",
      description:
        "Creates a short-lived family workspace share code. The code is returned once and stored only as a hash.",
      operationId: "createWorkspaceShareCode",
      security: bearerSecurity,
      parameters: [parameterRef("workspaceId")],
      responses: responseSet(
        { "201": successResponse("Workspace share code created.", ref("WorkspaceShareCode")) },
        { auth: true, conflict: true, forbidden: true, notFound: true, validation: true },
      ),
    }),
  },
  "/api/v1/workspaces/{workspaceId}/members/{userId}": {
    delete: operation({
      tags: ["Workspace Members"],
      summary: "Remove workspace member",
      description:
        "Removes a member from a family workspace when the authenticated user has manager capability.",
      operationId: "removeWorkspaceMember",
      security: bearerSecurity,
      parameters: [parameterRef("workspaceId"), parameterRef("userId")],
      responses: responseSet(
        { "200": successResponse("Workspace member removed.", emptyStatus) },
        { auth: true, conflict: true, forbidden: true, notFound: true, validation: true },
      ),
    }),
  },
  "/api/v1/workspaces/{workspaceId}/leave": {
    post: operation({
      tags: ["Workspace Members"],
      summary: "Leave workspace",
      description: "Allows the authenticated user to leave a family workspace.",
      operationId: "leaveWorkspace",
      security: bearerSecurity,
      parameters: [parameterRef("workspaceId")],
      responses: responseSet(
        { "200": successResponse("Workspace left.", emptyStatus) },
        { auth: true, conflict: true, notFound: true, validation: true },
      ),
    }),
  },
  "/api/v1/workspace-invitations/{token}/accept": {
    post: operation({
      tags: ["Workspace Members"],
      summary: "Accept workspace invitation",
      description: "Accepts a pending workspace invitation for the authenticated user.",
      operationId: "acceptWorkspaceInvitation",
      security: bearerSecurity,
      parameters: [parameterRef("token")],
      responses: responseSet(
        { "200": successResponse("Workspace invitation accepted.", ref("Workspace")) },
        { auth: true, conflict: true, notFound: true, validation: true },
      ),
    }),
  },
  "/api/v1/workspace-invitations/share-codes/{code}/join": {
    post: operation({
      tags: ["Workspace Members"],
      summary: "Join workspace by share code",
      description:
        "Lets an authenticated user join a family workspace with a pending, unexpired share code.",
      operationId: "joinWorkspaceByShareCode",
      security: bearerSecurity,
      parameters: [
        {
          in: "path",
          name: "code",
          required: true,
          schema: { example: "ABCD-2345", maxLength: 12, minLength: 8, type: "string" },
        },
      ],
      responses: responseSet(
        { "200": successResponse("Workspace joined.", ref("Workspace")) },
        { auth: true, conflict: true, forbidden: true, notFound: true, validation: true },
      ),
    }),
  },
  "/api/v1/workspaces/{workspaceId}/accounts": {
    get: operation({
      tags: ["Accounts"],
      summary: "List accounts",
      description: "Lists non-deleted accounts in the workspace with derived current balances.",
      operationId: "listAccounts",
      security: bearerSecurity,
      parameters: [parameterRef("workspaceId")],
      responses: responseSet(
        { "200": successResponse("Accounts retrieved.", { items: ref("Account"), type: "array" }) },
        { auth: true, notFound: true, validation: true },
      ),
    }),
    post: operation({
      tags: ["Accounts"],
      summary: "Create account",
      description:
        "Creates a manual cash, bank, credit card, loan, wallet, or other account. Exact duplicate create requests return the existing account so safe retries do not fail.",
      operationId: "createAccount",
      security: bearerSecurity,
      parameters: [parameterRef("workspaceId")],
      requestBody: requestBody(ref("CreateAccountRequest")),
      responses: responseSet(
        {
          "200": successResponse("Existing matching account returned.", ref("Account")),
          "201": successResponse("Account created.", ref("Account")),
        },
        { auth: true, conflict: true, notFound: true, validation: true },
      ),
    }),
  },
  "/api/v1/workspaces/{workspaceId}/accounts/summary": {
    get: operation({
      tags: ["Accounts"],
      summary: "Get account summary",
      description:
        "Returns account list plus asset, liability, and net-worth totals in minor units.",
      operationId: "getAccountSummary",
      security: bearerSecurity,
      parameters: [parameterRef("workspaceId")],
      responses: responseSet(
        { "200": successResponse("Account summary retrieved.", ref("AccountSummary")) },
        { auth: true, notFound: true, validation: true },
      ),
    }),
  },
  "/api/v1/workspaces/{workspaceId}/accounts/{accountId}": {
    get: operation({
      tags: ["Accounts"],
      summary: "Get account",
      description: "Returns one accessible account.",
      operationId: "getAccount",
      security: bearerSecurity,
      parameters: [parameterRef("workspaceId"), parameterRef("accountId")],
      responses: responseSet(
        { "200": successResponse("Account retrieved.", ref("Account")) },
        { auth: true, notFound: true, validation: true },
      ),
    }),
    patch: operation({
      tags: ["Accounts"],
      summary: "Update account",
      description: "Updates account display fields, type, currency, or opening balance.",
      operationId: "updateAccount",
      security: bearerSecurity,
      parameters: [parameterRef("workspaceId"), parameterRef("accountId")],
      requestBody: requestBody(ref("UpdateAccountRequest")),
      responses: responseSet(
        { "200": successResponse("Account updated.", ref("Account")) },
        { auth: true, conflict: true, notFound: true, validation: true },
      ),
    }),
    delete: operation({
      tags: ["Accounts"],
      summary: "Archive account",
      description: "Archives an account without destroying historical references.",
      operationId: "deleteAccount",
      security: bearerSecurity,
      parameters: [parameterRef("workspaceId"), parameterRef("accountId")],
      responses: responseSet(
        { "200": successResponse("Account archived.", ref("Account")) },
        { auth: true, conflict: true, notFound: true, validation: true },
      ),
    }),
  },
  "/api/v1/workspaces/{workspaceId}/accounts/{accountId}/archive": {
    post: operation({
      tags: ["Accounts"],
      summary: "Archive account",
      description: "Archives an account without destroying historical references.",
      operationId: "archiveAccount",
      security: bearerSecurity,
      parameters: [parameterRef("workspaceId"), parameterRef("accountId")],
      responses: responseSet(
        { "200": successResponse("Account archived.", ref("Account")) },
        { auth: true, conflict: true, notFound: true, validation: true },
      ),
    }),
  },
  "/api/v1/workspaces/{workspaceId}/accounts/{accountId}/restore": {
    post: operation({
      tags: ["Accounts"],
      summary: "Restore account",
      description: "Restores an archived account.",
      operationId: "restoreAccount",
      security: bearerSecurity,
      parameters: [parameterRef("workspaceId"), parameterRef("accountId")],
      responses: responseSet(
        { "200": successResponse("Account restored.", ref("Account")) },
        { auth: true, notFound: true, validation: true },
      ),
    }),
  },
  "/api/v1/categories/system": {
    get: operation({
      tags: ["Categories"],
      summary: "List system categories",
      description: "Lists read-only system income and expense categories. This endpoint is public.",
      operationId: "listSystemCategories",
      parameters: [
        {
          in: "query",
          name: "transactionType",
          required: false,
          schema: { enum: ["income", "expense"], type: "string" },
        },
      ],
      responses: responseSet(
        {
          "200": successResponse("System categories retrieved.", {
            items: ref("Category"),
            type: "array",
          }),
        },
        { validation: true },
      ),
    }),
  },
  "/api/v1/workspaces/{workspaceId}/categories": {
    get: operation({
      tags: ["Categories"],
      summary: "List workspace categories",
      description: "Lists workspace categories available to the authenticated member.",
      operationId: "listWorkspaceCategories",
      security: bearerSecurity,
      parameters: [parameterRef("workspaceId")],
      responses: responseSet(
        {
          "200": successResponse("Categories retrieved.", {
            items: ref("Category"),
            type: "array",
          }),
        },
        { auth: true, notFound: true, validation: true },
      ),
    }),
    post: operation({
      tags: ["Categories"],
      summary: "Create workspace category",
      description: "Creates a custom income or expense category.",
      operationId: "createWorkspaceCategory",
      security: bearerSecurity,
      parameters: [parameterRef("workspaceId")],
      requestBody: requestBody(ref("CreateCategoryRequest")),
      responses: responseSet(
        { "201": successResponse("Category created.", ref("Category")) },
        { auth: true, conflict: true, notFound: true, validation: true },
      ),
    }),
  },
  "/api/v1/workspaces/{workspaceId}/categories/{categoryId}": {
    get: operation({
      tags: ["Categories"],
      summary: "Get category",
      description: "Returns one workspace category.",
      operationId: "getWorkspaceCategory",
      security: bearerSecurity,
      parameters: [parameterRef("workspaceId"), parameterRef("categoryId")],
      responses: responseSet(
        { "200": successResponse("Category retrieved.", ref("Category")) },
        { auth: true, notFound: true, validation: true },
      ),
    }),
    patch: operation({
      tags: ["Categories"],
      summary: "Update category",
      description: "Updates a custom workspace category.",
      operationId: "updateWorkspaceCategory",
      security: bearerSecurity,
      parameters: [parameterRef("workspaceId"), parameterRef("categoryId")],
      requestBody: requestBody(ref("UpdateCategoryRequest")),
      responses: responseSet(
        { "200": successResponse("Category updated.", ref("Category")) },
        { auth: true, conflict: true, notFound: true, validation: true },
      ),
    }),
    delete: operation({
      tags: ["Categories"],
      summary: "Archive category",
      description: "Archives a category without breaking historical records.",
      operationId: "deleteWorkspaceCategory",
      security: bearerSecurity,
      parameters: [parameterRef("workspaceId"), parameterRef("categoryId")],
      responses: responseSet(
        { "200": successResponse("Category archived.", ref("Category")) },
        { auth: true, conflict: true, notFound: true, validation: true },
      ),
    }),
  },
  "/api/v1/workspaces/{workspaceId}/categories/{categoryId}/archive": {
    post: operation({
      tags: ["Categories"],
      summary: "Archive category",
      description: "Archives a category without breaking historical records.",
      operationId: "archiveWorkspaceCategory",
      security: bearerSecurity,
      parameters: [parameterRef("workspaceId"), parameterRef("categoryId")],
      responses: responseSet(
        { "200": successResponse("Category archived.", ref("Category")) },
        { auth: true, conflict: true, notFound: true, validation: true },
      ),
    }),
  },
  "/api/v1/workspaces/{workspaceId}/categories/{categoryId}/restore": {
    post: operation({
      tags: ["Categories"],
      summary: "Restore category",
      description: "Restores an archived category.",
      operationId: "restoreWorkspaceCategory",
      security: bearerSecurity,
      parameters: [parameterRef("workspaceId"), parameterRef("categoryId")],
      responses: responseSet(
        { "200": successResponse("Category restored.", ref("Category")) },
        { auth: true, notFound: true, validation: true },
      ),
    }),
  },
  "/api/v1/workspaces/{workspaceId}/transactions": {
    get: operation({
      tags: ["Transactions"],
      summary: "List transactions",
      description:
        "Lists workspace transactions with optional type, account, category, and date filters.",
      operationId: "listTransactions",
      security: bearerSecurity,
      parameters: [
        parameterRef("workspaceId"),
        parameterRef("transactionTypeQuery"),
        parameterRef("accountIdQuery"),
        parameterRef("categoryIdQuery"),
        parameterRef("fromQuery"),
        parameterRef("toQuery"),
      ],
      responses: responseSet(
        {
          "200": successResponse("Transactions retrieved.", {
            items: ref("Transaction"),
            type: "array",
          }),
        },
        { auth: true, notFound: true, validation: true },
      ),
    }),
    post: operation({
      tags: ["Transactions"],
      summary: "Create transaction",
      description:
        "Creates an income, expense, or transfer transaction. Transfers require a destination account and no category.",
      operationId: "createTransaction",
      security: bearerSecurity,
      parameters: [parameterRef("workspaceId")],
      requestBody: requestBody(ref("CreateTransactionRequest")),
      responses: responseSet(
        { "201": successResponse("Transaction created.", ref("Transaction")) },
        { auth: true, conflict: true, notFound: true, validation: true },
      ),
    }),
  },
  "/api/v1/workspaces/{workspaceId}/transactions/{transactionId}": {
    patch: operation({
      tags: ["Transactions"],
      summary: "Update transaction",
      description:
        "Replaces an income, expense, or transfer transaction after validating workspace access, account ownership, and category rules.",
      operationId: "updateTransaction",
      security: bearerSecurity,
      parameters: [parameterRef("workspaceId"), parameterRef("transactionId")],
      requestBody: requestBody(ref("UpdateTransactionRequest")),
      responses: responseSet(
        { "200": successResponse("Transaction updated.", ref("Transaction")) },
        { auth: true, conflict: true, notFound: true, validation: true },
      ),
    }),
    delete: operation({
      tags: ["Transactions"],
      summary: "Delete transaction",
      description: "Soft-deletes a workspace transaction so historical audit data remains intact.",
      operationId: "deleteTransaction",
      security: bearerSecurity,
      parameters: [parameterRef("workspaceId"), parameterRef("transactionId")],
      responses: responseSet(
        { "200": successResponse("Transaction deleted.", ref("Transaction")) },
        { auth: true, notFound: true, validation: true },
      ),
    }),
  },
  "/api/v1/workspaces/{workspaceId}/budgets": {
    get: operation({
      tags: ["Budgets"],
      summary: "List budgets",
      description: "Lists workspace budgets.",
      operationId: "listBudgets",
      security: bearerSecurity,
      parameters: [parameterRef("workspaceId")],
      responses: responseSet(
        { "200": successResponse("Budgets retrieved.", { items: ref("Budget"), type: "array" }) },
        { auth: true, notFound: true, validation: true },
      ),
    }),
    post: operation({
      tags: ["Budgets"],
      summary: "Create budget",
      description: "Creates a total or category budget for a period.",
      operationId: "createBudget",
      security: bearerSecurity,
      parameters: [parameterRef("workspaceId")],
      requestBody: requestBody(ref("CreateBudgetRequest")),
      responses: responseSet(
        { "201": successResponse("Budget created.", ref("Budget")) },
        { auth: true, conflict: true, notFound: true, validation: true },
      ),
    }),
  },
  "/api/v1/workspaces/{workspaceId}/budgets/summary": {
    get: operation({
      tags: ["Budgets"],
      summary: "Get budget summary",
      description: "Returns budget usage, remaining amounts, and overspending status.",
      operationId: "getBudgetSummary",
      security: bearerSecurity,
      parameters: [parameterRef("workspaceId")],
      responses: responseSet(
        { "200": successResponse("Budget summary retrieved.", ref("BudgetSummary")) },
        { auth: true, notFound: true, validation: true },
      ),
    }),
  },
  "/api/v1/workspaces/{workspaceId}/budgets/{budgetId}": {
    get: operation({
      tags: ["Budgets"],
      summary: "Get budget",
      description: "Returns one workspace budget.",
      operationId: "getBudget",
      security: bearerSecurity,
      parameters: [parameterRef("workspaceId"), parameterRef("budgetId")],
      responses: responseSet(
        { "200": successResponse("Budget retrieved.", ref("Budget")) },
        { auth: true, notFound: true, validation: true },
      ),
    }),
    patch: operation({
      tags: ["Budgets"],
      summary: "Update budget",
      description: "Updates a workspace budget.",
      operationId: "updateBudget",
      security: bearerSecurity,
      parameters: [parameterRef("workspaceId"), parameterRef("budgetId")],
      requestBody: requestBody(ref("UpdateBudgetRequest")),
      responses: responseSet(
        { "200": successResponse("Budget updated.", ref("Budget")) },
        { auth: true, conflict: true, notFound: true, validation: true },
      ),
    }),
    delete: operation({
      tags: ["Budgets"],
      summary: "Archive budget",
      description: "Archives a workspace budget.",
      operationId: "archiveBudget",
      security: bearerSecurity,
      parameters: [parameterRef("workspaceId"), parameterRef("budgetId")],
      responses: responseSet(
        { "200": successResponse("Budget archived.", ref("Budget")) },
        { auth: true, notFound: true, validation: true },
      ),
    }),
  },
  "/api/v1/workspaces/{workspaceId}/goals": {
    get: operation({
      tags: ["Goals"],
      summary: "List goals",
      description: "Lists workspace savings and debt goals.",
      operationId: "listGoals",
      security: bearerSecurity,
      parameters: [parameterRef("workspaceId")],
      responses: responseSet(
        { "200": successResponse("Goals retrieved.", { items: ref("Goal"), type: "array" }) },
        { auth: true, notFound: true, validation: true },
      ),
    }),
    post: operation({
      tags: ["Goals"],
      summary: "Create goal",
      description: "Creates a savings or debt repayment goal.",
      operationId: "createGoal",
      security: bearerSecurity,
      parameters: [parameterRef("workspaceId")],
      requestBody: requestBody(ref("CreateGoalRequest")),
      responses: responseSet(
        { "201": successResponse("Goal created.", ref("Goal")) },
        { auth: true, conflict: true, notFound: true, validation: true },
      ),
    }),
  },
  "/api/v1/workspaces/{workspaceId}/goals/{goalId}": {
    get: operation({
      tags: ["Goals"],
      summary: "Get goal",
      description: "Returns one workspace goal.",
      operationId: "getGoal",
      security: bearerSecurity,
      parameters: [parameterRef("workspaceId"), parameterRef("goalId")],
      responses: responseSet(
        { "200": successResponse("Goal retrieved.", ref("Goal")) },
        { auth: true, notFound: true, validation: true },
      ),
    }),
    patch: operation({
      tags: ["Goals"],
      summary: "Update goal",
      description: "Updates goal fields or status.",
      operationId: "updateGoal",
      security: bearerSecurity,
      parameters: [parameterRef("workspaceId"), parameterRef("goalId")],
      requestBody: requestBody(ref("UpdateGoalRequest")),
      responses: responseSet(
        { "200": successResponse("Goal updated.", ref("Goal")) },
        { auth: true, conflict: true, notFound: true, validation: true },
      ),
    }),
    delete: operation({
      tags: ["Goals"],
      summary: "Archive goal",
      description: "Archives a workspace goal.",
      operationId: "archiveGoal",
      security: bearerSecurity,
      parameters: [parameterRef("workspaceId"), parameterRef("goalId")],
      responses: responseSet(
        { "200": successResponse("Goal archived.", ref("Goal")) },
        { auth: true, notFound: true, validation: true },
      ),
    }),
  },
  "/api/v1/workspaces/{workspaceId}/goals/{goalId}/contributions": {
    post: operation({
      tags: ["Goals"],
      summary: "Create goal contribution",
      description: "Adds a contribution to a goal.",
      operationId: "createGoalContribution",
      security: bearerSecurity,
      parameters: [parameterRef("workspaceId"), parameterRef("goalId")],
      requestBody: requestBody(ref("CreateContributionRequest")),
      responses: responseSet(
        { "201": successResponse("Goal contribution created.", ref("GoalContribution")) },
        { auth: true, conflict: true, notFound: true, validation: true },
      ),
    }),
  },
  "/api/v1/workspaces/{workspaceId}/goals/{goalId}/contributions/{contributionId}": {
    delete: operation({
      tags: ["Goals"],
      summary: "Delete goal contribution",
      description: "Soft-deletes a goal contribution.",
      operationId: "deleteGoalContribution",
      security: bearerSecurity,
      parameters: [
        parameterRef("workspaceId"),
        parameterRef("goalId"),
        parameterRef("contributionId"),
      ],
      responses: responseSet(
        { "200": successResponse("Goal contribution deleted.", emptyStatus) },
        { auth: true, notFound: true, validation: true },
      ),
    }),
  },
  "/api/v1/workspaces/{workspaceId}/bills": {
    get: operation({
      tags: ["Bills"],
      summary: "List bills",
      description: "Lists workspace bills.",
      operationId: "listBills",
      security: bearerSecurity,
      parameters: [parameterRef("workspaceId")],
      responses: responseSet(
        { "200": successResponse("Bills retrieved.", { items: ref("Bill"), type: "array" }) },
        { auth: true, notFound: true, validation: true },
      ),
    }),
    post: operation({
      tags: ["Bills"],
      summary: "Create bill",
      description: "Creates a bill with due date, amount, account, and optional recurrence.",
      operationId: "createBill",
      security: bearerSecurity,
      parameters: [parameterRef("workspaceId")],
      requestBody: requestBody(ref("CreateBillRequest")),
      responses: responseSet(
        { "201": successResponse("Bill created.", ref("Bill")) },
        { auth: true, conflict: true, notFound: true, validation: true },
      ),
    }),
  },
  "/api/v1/workspaces/{workspaceId}/bills/{billId}": {
    get: operation({
      tags: ["Bills"],
      summary: "Get bill",
      description: "Returns one workspace bill.",
      operationId: "getBill",
      security: bearerSecurity,
      parameters: [parameterRef("workspaceId"), parameterRef("billId")],
      responses: responseSet(
        { "200": successResponse("Bill retrieved.", ref("Bill")) },
        { auth: true, notFound: true, validation: true },
      ),
    }),
    patch: operation({
      tags: ["Bills"],
      summary: "Update bill",
      description: "Updates bill fields or status.",
      operationId: "updateBill",
      security: bearerSecurity,
      parameters: [parameterRef("workspaceId"), parameterRef("billId")],
      requestBody: requestBody(ref("UpdateBillRequest")),
      responses: responseSet(
        { "200": successResponse("Bill updated.", ref("Bill")) },
        { auth: true, conflict: true, notFound: true, validation: true },
      ),
    }),
    delete: operation({
      tags: ["Bills"],
      summary: "Archive bill",
      description: "Archives a workspace bill.",
      operationId: "archiveBill",
      security: bearerSecurity,
      parameters: [parameterRef("workspaceId"), parameterRef("billId")],
      responses: responseSet(
        { "200": successResponse("Bill archived.", ref("Bill")) },
        { auth: true, notFound: true, validation: true },
      ),
    }),
  },
  "/api/v1/workspaces/{workspaceId}/bills/{billId}/mark-paid": {
    post: operation({
      tags: ["Bills"],
      summary: "Mark bill paid",
      description: "Marks a bill as paid and links payment behavior implemented by the service.",
      operationId: "markBillPaid",
      security: bearerSecurity,
      parameters: [parameterRef("workspaceId"), parameterRef("billId")],
      responses: responseSet(
        { "200": successResponse("Bill marked paid.", ref("Bill")) },
        { auth: true, conflict: true, notFound: true, validation: true },
      ),
    }),
  },
  "/api/v1/workspaces/{workspaceId}/recurring-transactions": {
    get: operation({
      tags: ["Recurring Transactions"],
      summary: "List recurring transactions",
      description: "Lists recurring transaction templates for a workspace.",
      operationId: "listRecurringTransactions",
      security: bearerSecurity,
      parameters: [parameterRef("workspaceId")],
      responses: responseSet(
        {
          "200": successResponse("Recurring transactions retrieved.", {
            items: ref("RecurringTransaction"),
            type: "array",
          }),
        },
        { auth: true, notFound: true, validation: true },
      ),
    }),
    post: operation({
      tags: ["Recurring Transactions"],
      summary: "Create recurring transaction",
      description: "Creates an income, expense, or transfer recurrence template.",
      operationId: "createRecurringTransaction",
      security: bearerSecurity,
      parameters: [parameterRef("workspaceId")],
      requestBody: requestBody(ref("CreateRecurringTransactionRequest")),
      responses: responseSet(
        { "201": successResponse("Recurring transaction created.", ref("RecurringTransaction")) },
        { auth: true, conflict: true, notFound: true, validation: true },
      ),
    }),
  },
  "/api/v1/workspaces/{workspaceId}/recurring-transactions/{recurringTransactionId}": {
    get: operation({
      tags: ["Recurring Transactions"],
      summary: "Get recurring transaction",
      description: "Returns one recurrence template.",
      operationId: "getRecurringTransaction",
      security: bearerSecurity,
      parameters: [parameterRef("workspaceId"), parameterRef("recurringTransactionId")],
      responses: responseSet(
        { "200": successResponse("Recurring transaction retrieved.", ref("RecurringTransaction")) },
        { auth: true, notFound: true, validation: true },
      ),
    }),
    patch: operation({
      tags: ["Recurring Transactions"],
      summary: "Update recurring transaction",
      description: "Updates a recurrence template.",
      operationId: "updateRecurringTransaction",
      security: bearerSecurity,
      parameters: [parameterRef("workspaceId"), parameterRef("recurringTransactionId")],
      requestBody: requestBody(ref("UpdateRecurringTransactionRequest")),
      responses: responseSet(
        { "200": successResponse("Recurring transaction updated.", ref("RecurringTransaction")) },
        { auth: true, conflict: true, notFound: true, validation: true },
      ),
    }),
    delete: operation({
      tags: ["Recurring Transactions"],
      summary: "Archive recurring transaction",
      description: "Archives a recurrence template.",
      operationId: "archiveRecurringTransaction",
      security: bearerSecurity,
      parameters: [parameterRef("workspaceId"), parameterRef("recurringTransactionId")],
      responses: responseSet(
        { "200": successResponse("Recurring transaction archived.", ref("RecurringTransaction")) },
        { auth: true, notFound: true, validation: true },
      ),
    }),
  },
  "/api/v1/workspaces/{workspaceId}/recurring-transactions/{recurringTransactionId}/pause": {
    post: operation({
      tags: ["Recurring Transactions"],
      summary: "Pause recurring transaction",
      description: "Pauses a recurrence template.",
      operationId: "pauseRecurringTransaction",
      security: bearerSecurity,
      parameters: [parameterRef("workspaceId"), parameterRef("recurringTransactionId")],
      responses: responseSet(
        { "200": successResponse("Recurring transaction paused.", ref("RecurringTransaction")) },
        { auth: true, notFound: true, validation: true },
      ),
    }),
  },
  "/api/v1/workspaces/{workspaceId}/recurring-transactions/{recurringTransactionId}/resume": {
    post: operation({
      tags: ["Recurring Transactions"],
      summary: "Resume recurring transaction",
      description: "Resumes a paused recurrence template.",
      operationId: "resumeRecurringTransaction",
      security: bearerSecurity,
      parameters: [parameterRef("workspaceId"), parameterRef("recurringTransactionId")],
      responses: responseSet(
        { "200": successResponse("Recurring transaction resumed.", ref("RecurringTransaction")) },
        { auth: true, notFound: true, validation: true },
      ),
    }),
  },
  "/api/v1/workspaces/{workspaceId}/reports/summary": {
    get: operation({
      tags: ["Reports"],
      summary: "Get report summary",
      description: "Returns income, expense, and net savings totals for a report period.",
      operationId: "getReportSummary",
      security: bearerSecurity,
      parameters: [parameterRef("workspaceId"), ...reportFilters],
      responses: responseSet(
        { "200": successResponse("Report summary retrieved.", ref("ReportSummary")) },
        { auth: true, notFound: true, validation: true },
      ),
    }),
  },
  "/api/v1/workspaces/{workspaceId}/reports/categories": {
    get: operation({
      tags: ["Reports"],
      summary: "Get category report",
      description: "Returns expense category breakdown for a report period.",
      operationId: "getReportCategories",
      security: bearerSecurity,
      parameters: [parameterRef("workspaceId"), ...reportFilters],
      responses: responseSet(
        { "200": successResponse("Category report retrieved.", ref("CategoryReport")) },
        { auth: true, notFound: true, validation: true },
      ),
    }),
  },
  "/api/v1/workspaces/{workspaceId}/reports/cash-flow": {
    get: operation({
      tags: ["Reports"],
      summary: "Get cash-flow report",
      description: "Returns cash-flow points for a report period.",
      operationId: "getReportCashFlow",
      security: bearerSecurity,
      parameters: [parameterRef("workspaceId"), ...reportFilters],
      responses: responseSet(
        { "200": successResponse("Cash-flow report retrieved.", ref("CashFlowReport")) },
        { auth: true, notFound: true, validation: true },
      ),
    }),
  },
  "/api/v1/workspaces/{workspaceId}/reports/exports": {
    post: operation({
      tags: ["Reports"],
      summary: "Create report export",
      description: "Generates a CSV report export.",
      operationId: "createReportExport",
      security: bearerSecurity,
      parameters: [parameterRef("workspaceId")],
      requestBody: requestBody(ref("CreateReportExportRequest")),
      responses: responseSet(
        { "201": successResponse("Report export created.", ref("ReportExport")) },
        { auth: true, conflict: true, notFound: true, validation: true },
      ),
    }),
  },
  "/api/v1/workspaces/{workspaceId}/reports/exports/{exportId}": {
    get: operation({
      tags: ["Reports"],
      summary: "Get report export",
      description: "Returns export status and metadata.",
      operationId: "getReportExport",
      security: bearerSecurity,
      parameters: [parameterRef("workspaceId"), parameterRef("exportId")],
      responses: responseSet(
        { "200": successResponse("Report export retrieved.", ref("ReportExport")) },
        { auth: true, notFound: true, validation: true },
      ),
    }),
  },
  "/api/v1/workspaces/{workspaceId}/reports/exports/{exportId}/download": {
    get: operation({
      tags: ["Reports"],
      summary: "Download report export",
      description: "Downloads a generated CSV report export after membership authorization.",
      operationId: "downloadReportExport",
      security: bearerSecurity,
      parameters: [parameterRef("workspaceId"), parameterRef("exportId")],
      responses: responseSet(
        { "200": binaryResponse("CSV report export.", "text/csv") },
        { auth: true, notFound: true, validation: true },
      ),
    }),
  },
  "/api/v1/workspaces/{workspaceId}/flow/chat": {
    post: operation({
      tags: ["Flow"],
      summary: "Chat with Flow",
      description:
        "Runs a protected read-only Flow assistant turn through the configured local model and allowlisted MCP-style tools. Flow can search transactions and summarize reports, but it does not create, update, or delete financial records.",
      operationId: "chatWithFlow",
      security: bearerSecurity,
      parameters: [parameterRef("workspaceId")],
      requestBody: requestBody(ref("FlowChatRequest")),
      responses: responseSet(
        { "200": successResponse("Flow response generated.", ref("FlowChatResponse")) },
        { auth: true, notFound: true, validation: true },
      ),
    }),
  },
  "/api/v1/notifications": {
    get: operation({
      tags: ["Notifications"],
      summary: "List notifications",
      description: "Lists notifications for the authenticated user.",
      operationId: "listNotifications",
      security: bearerSecurity,
      responses: responseSet(
        {
          "200": successResponse("Notifications retrieved.", {
            items: ref("Notification"),
            type: "array",
          }),
        },
        { auth: true },
      ),
    }),
  },
  "/api/v1/notifications/{notificationId}/read": {
    patch: operation({
      tags: ["Notifications"],
      summary: "Mark notification read",
      description: "Marks one notification as read.",
      operationId: "markNotificationRead",
      security: bearerSecurity,
      parameters: [parameterRef("notificationId")],
      responses: responseSet(
        { "200": successResponse("Notification marked read.", ref("Notification")) },
        { auth: true, notFound: true, validation: true },
      ),
    }),
  },
  "/api/v1/notifications/read-all": {
    post: operation({
      tags: ["Notifications"],
      summary: "Mark all notifications read",
      description: "Marks all notifications for the authenticated user as read.",
      operationId: "markAllNotificationsRead",
      security: bearerSecurity,
      responses: responseSet(
        { "200": successResponse("Notifications marked read.", emptyStatus) },
        { auth: true },
      ),
    }),
  },
  "/api/v1/users/me/notification-preferences": {
    get: operation({
      tags: ["Notifications"],
      summary: "Get notification preferences",
      description: "Returns notification preferences for the authenticated user.",
      operationId: "getNotificationPreferences",
      security: bearerSecurity,
      responses: responseSet(
        {
          "200": successResponse(
            "Notification preferences retrieved.",
            ref("NotificationPreferences"),
          ),
        },
        { auth: true },
      ),
    }),
    patch: operation({
      tags: ["Notifications"],
      summary: "Update notification preferences",
      description: "Updates notification preferences for the authenticated user.",
      operationId: "updateNotificationPreferences",
      security: bearerSecurity,
      requestBody: requestBody(ref("UpdateNotificationPreferencesRequest")),
      responses: responseSet(
        {
          "200": successResponse(
            "Notification preferences updated.",
            ref("NotificationPreferences"),
          ),
        },
        { auth: true, validation: true },
      ),
    }),
  },
  "/api/v1/flow-launch-subscriptions": {
    post: operation({
      tags: ["Notifications"],
      summary: "Subscribe to Flow launch",
      description:
        "Creates a consented Flow launch notification subscription. This endpoint is public.",
      operationId: "createFlowLaunchSubscription",
      requestBody: requestBody(ref("FlowLaunchSubscriptionRequest")),
      responses: responseSet(
        {
          "201": successResponse(
            "Flow launch subscription created.",
            ref("FlowLaunchSubscription"),
          ),
        },
        { conflict: true, validation: true },
      ),
    }),
  },
  "/api/v1/flow-launch-subscriptions/{token}": {
    delete: operation({
      tags: ["Notifications"],
      summary: "Unsubscribe from Flow launch",
      description:
        "Unsubscribes from Flow launch notifications using the opaque unsubscribe token.",
      operationId: "unsubscribeFlowLaunch",
      parameters: [parameterRef("token")],
      responses: responseSet(
        { "200": successResponse("Flow launch subscription removed.", emptyStatus) },
        { notFound: true, validation: true },
      ),
    }),
  },
  "/api/v1/feedback": {
    post: operation({
      tags: ["Feedback"],
      summary: "Create feedback",
      description: "Creates anonymous public feedback. Guest finance data must not be included.",
      operationId: "createFeedback",
      requestBody: requestBody(ref("CreateFeedbackRequest")),
      responses: responseSet(
        { "201": successResponse("Feedback received.", ref("Feedback")) },
        { rateLimit: true, validation: true },
      ),
    }),
  },
};

export const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "NidhiFlow API",
    version: "0.1.0",
    description:
      "OpenAPI contract for the NidhiFlow backend. All API JSON uses camelCase, stable response envelopes, requestId metadata, safe error codes, fixed-precision money strings, explicit ISO 4217 currencies, and UTC ISO 8601 timestamps.",
  },
  servers: [{ url: "/" }],
  tags: [
    { name: "Health", description: "Operational health checks." },
    { name: "OpenAPI", description: "API contract." },
    {
      name: "Auth",
      description:
        "Registration, login, session rotation, logout, verification, and password recovery.",
    },
    { name: "Users", description: "Current user profile, sessions, and guest migration." },
    { name: "Guest Migrations", description: "Explicit guest-to-account data migration." },
    { name: "Workspaces", description: "Personal and family workspace lifecycle." },
    { name: "Workspace Members", description: "Family workspace membership and invitations." },
    { name: "Accounts", description: "Manual accounts and derived balances." },
    { name: "Categories", description: "System and workspace categories." },
    { name: "Transactions", description: "Income, expense, and transfer transactions." },
    { name: "Budgets", description: "Monthly and category budgets." },
    { name: "Goals", description: "Savings and debt goals plus contributions." },
    { name: "Bills", description: "Bills, due dates, recurrence, and paid status." },
    { name: "Recurring Transactions", description: "Recurring transaction templates." },
    { name: "Reports", description: "Summary, category, cash-flow, and CSV export reports." },
    { name: "Flow", description: "Protected AI assistant chat and MCP-style finance tools." },
    { name: "Notifications", description: "Notifications, preferences, and Flow launch consent." },
    { name: "Feedback", description: "Public feedback submission." },
  ],
  paths,
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description:
          "Short-lived access JWT returned by register, login, verify-email, or refresh.",
      },
    },
    parameters: {
      workspaceId: { in: "path", name: "workspaceId", required: true, schema: { type: "string" } },
      accountId: { in: "path", name: "accountId", required: true, schema: { type: "string" } },
      categoryId: { in: "path", name: "categoryId", required: true, schema: { type: "string" } },
      transactionId: {
        in: "path",
        name: "transactionId",
        required: true,
        schema: { type: "string" },
      },
      budgetId: { in: "path", name: "budgetId", required: true, schema: { type: "string" } },
      goalId: { in: "path", name: "goalId", required: true, schema: { type: "string" } },
      contributionId: {
        in: "path",
        name: "contributionId",
        required: true,
        schema: { type: "string" },
      },
      billId: { in: "path", name: "billId", required: true, schema: { type: "string" } },
      recurringTransactionId: {
        in: "path",
        name: "recurringTransactionId",
        required: true,
        schema: { type: "string" },
      },
      exportId: { in: "path", name: "exportId", required: true, schema: { type: "string" } },
      sessionId: { in: "path", name: "sessionId", required: true, schema: { type: "string" } },
      notificationId: {
        in: "path",
        name: "notificationId",
        required: true,
        schema: { type: "string" },
      },
      userId: { in: "path", name: "userId", required: true, schema: { type: "string" } },
      token: {
        in: "path",
        name: "token",
        required: true,
        schema: { maxLength: 255, minLength: 20, type: "string" },
      },
      idempotencyKey: {
        in: "header",
        name: "Idempotency-Key",
        required: true,
        schema: { maxLength: 200, minLength: 1, type: "string" },
      },
      transactionTypeQuery: {
        in: "query",
        name: "type",
        required: false,
        schema: { enum: ["income", "expense", "transfer"], type: "string" },
      },
      accountIdQuery: {
        in: "query",
        name: "accountId",
        required: false,
        schema: { type: "string" },
      },
      categoryIdQuery: {
        in: "query",
        name: "categoryId",
        required: false,
        schema: { type: "string" },
      },
      fromQuery: { in: "query", name: "from", required: false, schema: dateOnly },
      toQuery: { in: "query", name: "to", required: false, schema: dateOnly },
    },
    schemas: {
      Money: moneySchema,
      Meta: {
        type: "object",
        required: ["requestId", "timestamp"],
        properties: {
          requestId: { example: "req_123", type: "string" },
          timestamp,
        },
      },
      SuccessResponse: {
        type: "object",
        required: ["success", "message", "data", "meta"],
        properties: {
          success: { example: true, type: "boolean" },
          message: { type: "string" },
          data: {},
          pagination: ref("PaginationMeta"),
          meta: ref("Meta"),
        },
      },
      ErrorResponse: {
        type: "object",
        required: ["success", "message", "error", "meta"],
        properties: {
          success: { example: false, type: "boolean" },
          message: { example: "The request could not be processed.", type: "string" },
          error: {
            type: "object",
            required: ["code"],
            properties: {
              code: {
                enum: [
                  "BAD_REQUEST",
                  "VALIDATION_ERROR",
                  "AUTHENTICATION_REQUIRED",
                  "INVALID_CREDENTIALS",
                  "INVALID_SESSION",
                  "SESSION_REUSED",
                  "FORBIDDEN",
                  "NOT_FOUND",
                  "CONFLICT",
                  "RATE_LIMITED",
                  "INTERNAL_SERVER_ERROR",
                ],
                type: "string",
              },
              details: {
                items: {
                  type: "object",
                  required: ["message"],
                  properties: {
                    field: { type: "string" },
                    message: { type: "string" },
                  },
                },
                type: "array",
              },
            },
          },
          meta: ref("Meta"),
        },
      },
      PaginationMeta: {
        type: "object",
        required: [
          "page",
          "pageSize",
          "totalItems",
          "totalPages",
          "hasNextPage",
          "hasPreviousPage",
        ],
        properties: {
          page: { minimum: 1, type: "integer" },
          pageSize: { maximum: 100, minimum: 1, type: "integer" },
          totalItems: { minimum: 0, type: "integer" },
          totalPages: { minimum: 0, type: "integer" },
          hasNextPage: { type: "boolean" },
          hasPreviousPage: { type: "boolean" },
        },
      },
      FlowChatRequest: flowChatRequest,
      FlowChatResponse: flowChatResponse,
      User: {
        type: "object",
        required: [
          "id",
          "email",
          "displayName",
          "locale",
          "preferredCurrency",
          "theme",
          "timezone",
          "createdAt",
          "updatedAt",
        ],
        properties: {
          id,
          email: { format: "email", type: "string" },
          displayName: { type: "string" },
          locale: { example: "en-IN", type: "string" },
          preferredCurrency: { example: "INR", pattern: "^[A-Z]{3}$", type: "string" },
          theme: { enum: ["system", "light", "dark"], type: "string" },
          timezone: { example: "Asia/Kolkata", type: "string" },
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      },
      Workspace: {
        type: "object",
        required: ["id", "name", "type", "reportingCurrency", "timezone", "membershipRole"],
        properties: {
          id,
          membershipId: { type: "string" },
          membershipRole: { enum: ["manager", "member"], type: "string" },
          name: { type: "string" },
          reportingCurrency: { pattern: "^[A-Z]{3}$", type: "string" },
          timezone: { type: "string" },
          type: { enum: ["personal", "family"], type: "string" },
          createdAt: timestamp,
        },
      },
      WorkspaceMember: {
        type: "object",
        required: ["userId", "email", "displayName", "membershipId", "membershipRole", "joinedAt"],
        properties: {
          userId: { type: "string" },
          email: { format: "email", type: "string" },
          displayName: { type: "string" },
          membershipId: { type: "string" },
          membershipRole: { enum: ["manager", "member"], type: "string" },
          joinedAt: timestamp,
        },
      },
      WorkspaceInvitation: {
        type: "object",
        properties: {
          id,
          workspaceId: { type: "string" },
          invitedEmail: { format: "email", nullable: true, type: "string" },
          status: { enum: ["pending", "accepted", "revoked", "expired"], type: "string" },
          expiresAt: timestamp,
          debugToken: { description: "Only returned outside production.", type: "string" },
        },
      },
      WorkspaceShareCode: {
        type: "object",
        required: ["code", "expiresAt", "id", "workspaceId"],
        properties: {
          code: { example: "ABCD-2345", type: "string" },
          expiresAt: timestamp,
          id,
          workspaceId: { type: "string" },
        },
      },
      Account: {
        type: "object",
        required: [
          "id",
          "name",
          "type",
          "openingBalance",
          "currentBalance",
          "currency",
          "isArchived",
          "createdAt",
          "updatedAt",
        ],
        properties: {
          id,
          name: { type: "string" },
          type: {
            enum: ["cash", "bank", "credit_card", "loan", "wallet", "other"],
            type: "string",
          },
          openingBalance: { type: "string" },
          currentBalance: { type: "string" },
          currency: { pattern: "^[A-Z]{3}$", type: "string" },
          isArchived: { type: "boolean" },
          archivedAt: { nullable: true, ...timestamp },
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      },
      AccountSummary: {
        type: "object",
        required: ["accounts", "assetTotalMinor", "liabilityTotalMinor", "netWorthMinor"],
        properties: {
          accounts: { items: ref("Account"), type: "array" },
          assetTotalMinor: { type: "string" },
          liabilityTotalMinor: { type: "string" },
          netWorthMinor: { type: "string" },
        },
      },
      Category: {
        type: "object",
        required: ["id", "name", "transactionType", "isSystem", "isArchived"],
        properties: {
          id,
          workspaceId: { nullable: true, type: "string" },
          parentId: { nullable: true, type: "string" },
          transactionType: { enum: ["income", "expense"], type: "string" },
          name: { type: "string" },
          iconKey: { nullable: true, type: "string" },
          colorToken: { nullable: true, type: "string" },
          isSystem: { type: "boolean" },
          isArchived: { type: "boolean" },
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      },
      Transaction: {
        type: "object",
        required: [
          "id",
          "workspaceId",
          "type",
          "amount",
          "currency",
          "accountId",
          "transactionDate",
          "createdAt",
          "updatedAt",
        ],
        properties: {
          id,
          workspaceId: { type: "string" },
          type: { enum: ["income", "expense", "transfer"], type: "string" },
          amount: { type: "string" },
          currency: { pattern: "^[A-Z]{3}$", type: "string" },
          accountId: { type: "string" },
          destinationAccountId: { nullable: true, type: "string" },
          categoryId: { nullable: true, type: "string" },
          transactionDate: dateOnly,
          note: { nullable: true, type: "string" },
          createdByUserId: { nullable: true, type: "string" },
          updatedByUserId: { nullable: true, type: "string" },
          createdAt: timestamp,
          updatedAt: timestamp,
          deletedAt: { nullable: true, ...timestamp },
        },
      },
      Budget: {
        type: "object",
        properties: {
          id,
          workspaceId: { type: "string" },
          categoryId: { nullable: true, type: "string" },
          periodStart: dateOnly,
          periodEnd: dateOnly,
          limitAmount: { type: "string" },
          currency: { pattern: "^[A-Z]{3}$", type: "string" },
          spentAmount: { type: "string" },
          remainingAmount: { type: "string" },
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      },
      BudgetSummary: {
        type: "object",
        properties: {
          budgets: { items: ref("Budget"), type: "array" },
          totalLimitMinor: { type: "string" },
          totalSpentMinor: { type: "string" },
          totalRemainingMinor: { type: "string" },
        },
      },
      Goal: {
        type: "object",
        properties: {
          id,
          workspaceId: { type: "string" },
          name: { type: "string" },
          type: { enum: ["savings", "debt"], type: "string" },
          targetAmount: { type: "string" },
          currentAmount: { type: "string" },
          currency: { pattern: "^[A-Z]{3}$", type: "string" },
          targetDate: dateOnly,
          status: { enum: ["active", "completed", "archived"], type: "string" },
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      },
      GoalContribution: {
        type: "object",
        properties: {
          id,
          goalId: { type: "string" },
          amount: { type: "string" },
          currency: { pattern: "^[A-Z]{3}$", type: "string" },
          contributionDate: dateOnly,
          transactionId: { nullable: true, type: "string" },
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      },
      Bill: {
        type: "object",
        properties: {
          id,
          workspaceId: { type: "string" },
          name: { type: "string" },
          amount: { type: "string" },
          currency: { pattern: "^[A-Z]{3}$", type: "string" },
          dueDate: dateOnly,
          recurrenceRule: { nullable: true, type: "string" },
          status: { enum: ["pending", "paid", "overdue"], type: "string" },
          categoryId: { nullable: true, type: "string" },
          accountId: { type: "string" },
          paidTransactionId: { nullable: true, type: "string" },
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      },
      RecurringTransaction: {
        type: "object",
        properties: {
          id,
          workspaceId: { type: "string" },
          name: { type: "string" },
          type: { enum: ["income", "expense", "transfer"], type: "string" },
          amount: { type: "string" },
          currency: { pattern: "^[A-Z]{3}$", type: "string" },
          accountId: { type: "string" },
          destinationAccountId: { nullable: true, type: "string" },
          categoryId: { nullable: true, type: "string" },
          scheduleRule: { type: "string" },
          timezone: { type: "string" },
          nextOccurrence: dateOnly,
          isActive: { type: "boolean" },
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      },
      Attachment: {
        type: "object",
        description:
          "Reusable schema reserved for attachment APIs. Attachment endpoints are not implemented in this backend yet.",
        properties: {
          id,
          workspaceId: { type: "string" },
          uploadedByUserId: { type: "string" },
          filename: { type: "string" },
          mimeType: { type: "string" },
          sizeBytes: { type: "integer" },
          scanStatus: { enum: ["pending", "clean", "quarantined", "failed"], type: "string" },
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      },
      Notification: {
        type: "object",
        properties: {
          id,
          userId: { type: "string" },
          workspaceId: { nullable: true, type: "string" },
          type: { type: "string" },
          title: { type: "string" },
          body: { type: "string" },
          payload: { additionalProperties: true, type: "object" },
          readAt: { nullable: true, ...timestamp },
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      },
      NotificationPreferences: {
        type: "object",
        properties: {
          inAppEnabled: { type: "boolean" },
          emailEnabled: { type: "boolean" },
          billRemindersEnabled: { type: "boolean" },
          budgetAlertsEnabled: { type: "boolean" },
          goalUpdatesEnabled: { type: "boolean" },
          flowLaunchEnabled: { type: "boolean" },
          timezone: { type: "string" },
        },
      },
      Feedback: {
        type: "object",
        properties: {
          id,
          userId: { nullable: true, type: "string" },
          category: { enum: ["suggestion", "issue", "general"], type: "string" },
          description: { type: "string" },
          status: { type: "string" },
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      },
      AuditLog: {
        type: "object",
        description:
          "Reusable schema for audit records. Public audit-log APIs are not implemented in this backend yet.",
        properties: {
          id,
          actorUserId: { nullable: true, type: "string" },
          workspaceId: { nullable: true, type: "string" },
          action: { type: "string" },
          resourceType: { type: "string" },
          resourceId: { type: "string" },
          changeMetadata: { additionalProperties: true, type: "object" },
          requestId: { nullable: true, type: "string" },
          createdAt: timestamp,
        },
      },
      ReportSummary: {
        type: "object",
        properties: {
          currency: { pattern: "^[A-Z]{3}$", type: "string" },
          period: ref("ReportPeriod"),
          totals: {
            type: "object",
            properties: {
              incomeMinor: { type: "string" },
              expenseMinor: { type: "string" },
              netSavingsMinor: { type: "string" },
            },
          },
          recentTransactions: { items: ref("Transaction"), type: "array" },
        },
      },
      CategoryReport: {
        type: "object",
        properties: {
          currency: { pattern: "^[A-Z]{3}$", type: "string" },
          period: ref("ReportPeriod"),
          categories: {
            items: {
              type: "object",
              properties: {
                categoryId: { type: "string" },
                categoryName: { type: "string" },
                amountMinor: { type: "string" },
                percentage: { type: "number" },
              },
            },
            type: "array",
          },
        },
      },
      CashFlowReport: {
        type: "object",
        properties: {
          currency: { pattern: "^[A-Z]{3}$", type: "string" },
          period: ref("ReportPeriod"),
          points: {
            items: {
              type: "object",
              properties: {
                date: dateOnly,
                incomeMinor: { type: "string" },
                expenseMinor: { type: "string" },
                netMinor: { type: "string" },
              },
            },
            type: "array",
          },
        },
      },
      ReportPeriod: {
        type: "object",
        properties: {
          from: dateOnly,
          to: dateOnly,
          period: { enum: ["thisMonth", "lastMonth", "thisYear", "custom"], type: "string" },
        },
      },
      ReportExport: {
        type: "object",
        properties: {
          id,
          workspaceId: { type: "string" },
          reportType: { enum: ["summary", "categories", "cashFlow"], type: "string" },
          status: { enum: ["completed"], type: "string" },
          downloadUrl: { type: "string" },
          createdAt: timestamp,
          expiresAt: timestamp,
        },
      },
      Session: {
        type: "object",
        properties: {
          id,
          deviceName: { nullable: true, type: "string" },
          ipAddress: { nullable: true, type: "string" },
          userAgent: { nullable: true, type: "string" },
          lastUsedAt: { nullable: true, ...timestamp },
          expiresAt: timestamp,
          createdAt: timestamp,
          revokedAt: { nullable: true, ...timestamp },
        },
      },
      RegisterRequest: {
        type: "object",
        required: ["displayName", "email", "locale", "password", "preferredCurrency", "timezone"],
        properties: {
          displayName: { maxLength: 80, minLength: 1, type: "string" },
          email: { format: "email", type: "string" },
          locale: { example: "en-IN", type: "string" },
          password: { minLength: 12, type: "string", writeOnly: true },
          preferredCurrency: {
            enum: ["USD", "EUR", "GBP", "INR", "CAD", "AUD", "SGD"],
            type: "string",
          },
          theme: { default: "system", enum: ["system", "light", "dark"], type: "string" },
          timezone: { example: "Asia/Kolkata", type: "string" },
        },
      },
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          deviceName: { maxLength: 80, minLength: 1, type: "string" },
          email: { format: "email", type: "string" },
          password: { type: "string", writeOnly: true },
        },
      },
      AuthSession: {
        type: "object",
        required: ["accessToken", "user", "workspaces"],
        properties: {
          accessToken: { type: "string" },
          user: ref("User"),
          workspaces: { items: ref("Workspace"), type: "array" },
        },
      },
      VerifyEmailResult: {
        type: "object",
        required: ["accessToken", "user", "workspace"],
        properties: {
          accessToken: { type: "string" },
          user: ref("User"),
          workspace: ref("Workspace"),
        },
      },
      RefreshResult: {
        type: "object",
        required: ["accessToken"],
        properties: { accessToken: { type: "string" } },
      },
      TokenRequest: {
        type: "object",
        required: ["token"],
        properties: { token: { maxLength: 255, minLength: 20, type: "string" } },
      },
      EmailRequest: {
        type: "object",
        required: ["email"],
        properties: { email: { format: "email", type: "string" } },
      },
      DebugTokenResult: {
        type: "object",
        properties: {
          status: { type: "string" },
          debugToken: { description: "Only returned outside production.", type: "string" },
        },
      },
      ResetPasswordRequest: {
        type: "object",
        required: ["password", "token"],
        properties: {
          password: { minLength: 12, type: "string", writeOnly: true },
          token: { maxLength: 255, minLength: 20, type: "string" },
        },
      },
      UpdateUserRequest: {
        type: "object",
        minProperties: 1,
        properties: {
          displayName: { maxLength: 80, minLength: 1, type: "string" },
          locale: { type: "string" },
          preferredCurrency: {
            enum: ["USD", "EUR", "GBP", "INR", "CAD", "AUD", "SGD"],
            type: "string",
          },
          theme: { enum: ["system", "light", "dark"], type: "string" },
          timezone: { type: "string" },
        },
      },
      GuestMigrationPayload: guestMigrationPayload,
      GuestMigrationCommitRequest: {
        allOf: [
          guestMigrationPayload,
          {
            type: "object",
            required: ["confirm"],
            properties: { confirm: { enum: [true], type: "boolean" } },
          },
        ],
      },
      GuestMigrationPreview: {
        type: "object",
        properties: {
          clientMigrationId: { type: "string" },
          targetWorkspace: ref("Workspace"),
          transactions: { items: ref("GuestMigrationPreviewItem"), type: "array" },
          summary: ref("GuestMigrationPreviewSummary"),
        },
      },
      GuestMigrationPreviewItem: {
        type: "object",
        properties: {
          clientId: { type: "string" },
          existingTransactionId: { type: "string" },
          status: { enum: ["importable", "duplicate", "skipped_deleted"], type: "string" },
          type: { enum: ["income", "expense"], type: "string" },
          amountMinor: { type: "string" },
          currency: { type: "string" },
          category: { type: "string" },
          transactionDate: dateOnly,
          note: { type: "string" },
        },
      },
      GuestMigrationPreviewSummary: {
        type: "object",
        properties: {
          totalTransactions: { type: "integer" },
          importableTransactions: { type: "integer" },
          duplicateTransactions: { type: "integer" },
          skippedDeletedTransactions: { type: "integer" },
          incomeMinor: { type: "string" },
          expenseMinor: { type: "string" },
          balanceMinor: { type: "string" },
        },
      },
      GuestMigrationCommit: {
        type: "object",
        properties: {
          clientMigrationId: { type: "string" },
          migrationId: { type: "string" },
          workspaceId: { type: "string" },
          summary: {
            allOf: [
              ref("GuestMigrationPreviewSummary"),
              { type: "object", properties: { importedTransactions: { type: "integer" } } },
            ],
          },
          idMapping: {
            type: "object",
            properties: {
              transactions: {
                items: {
                  type: "object",
                  properties: {
                    clientId: { type: "string" },
                    serverId: { type: "string" },
                    status: { enum: ["imported", "duplicate"], type: "string" },
                  },
                },
                type: "array",
              },
            },
          },
          verification: { type: "object", properties: { verified: { type: "boolean" } } },
        },
      },
      CreateWorkspaceRequest: {
        type: "object",
        required: ["name", "reportingCurrency", "timezone", "type"],
        properties: {
          name: { maxLength: 80, minLength: 1, type: "string" },
          reportingCurrency: { pattern: "^[A-Z]{3}$", type: "string" },
          timezone: { type: "string" },
          type: { enum: ["personal", "family"], type: "string" },
        },
      },
      UpdateWorkspaceRequest: {
        type: "object",
        minProperties: 1,
        properties: {
          name: { maxLength: 80, minLength: 1, type: "string" },
          reportingCurrency: { pattern: "^[A-Z]{3}$", type: "string" },
          timezone: { type: "string" },
        },
      },
      CreateWorkspaceInvitationRequest: {
        type: "object",
        required: ["email"],
        properties: { email: { format: "email", type: "string" } },
      },
      CreateAccountRequest: createAccountRequest,
      UpdateAccountRequest: updateAccountRequest,
      CreateCategoryRequest: createCategoryRequest,
      UpdateCategoryRequest: updateCategoryRequest,
      CreateTransactionRequest: createTransactionRequest,
      UpdateTransactionRequest: createTransactionRequest,
      CreateBudgetRequest: createBudgetRequest,
      UpdateBudgetRequest: updateBudgetRequest,
      CreateGoalRequest: createGoalRequest,
      UpdateGoalRequest: updateGoalRequest,
      CreateContributionRequest: createContributionRequest,
      CreateBillRequest: createBillRequest,
      UpdateBillRequest: updateBillRequest,
      CreateRecurringTransactionRequest: createRecurringTransactionRequest,
      UpdateRecurringTransactionRequest: updateRecurringTransactionRequest,
      CreateReportExportRequest: createReportExportRequest,
      UpdateNotificationPreferencesRequest: {
        type: "object",
        minProperties: 1,
        properties: {
          billRemindersEnabled: { type: "boolean" },
          budgetAlertsEnabled: { type: "boolean" },
          emailEnabled: { type: "boolean" },
          flowLaunchEnabled: { type: "boolean" },
          goalUpdatesEnabled: { type: "boolean" },
          inAppEnabled: { type: "boolean" },
          timezone: { type: "string" },
        },
      },
      FlowLaunchSubscriptionRequest: {
        type: "object",
        required: ["email"],
        properties: { email: { format: "email", type: "string" } },
      },
      FlowLaunchSubscription: {
        type: "object",
        properties: {
          id,
          email: { format: "email", type: "string" },
          consentedAt: timestamp,
          unsubscribedAt: { nullable: true, ...timestamp },
        },
      },
      CreateFeedbackRequest: {
        type: "object",
        required: ["category", "description"],
        properties: {
          category: { enum: ["suggestion", "issue", "general"], type: "string" },
          description: { maxLength: 1000, minLength: 10, type: "string" },
        },
      },
    },
  },
} as const;
