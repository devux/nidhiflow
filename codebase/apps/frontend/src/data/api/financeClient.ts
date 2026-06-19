import { environment } from "../../config/environment";
import { refreshAccessToken } from "./authClient";
import type { SupportedCurrency } from "../../domain/preferences/guestPreferences";
import type {
  GuestTransaction,
  GuestTransactionInput,
  TransactionCategory,
  TransactionType,
} from "../../domain/transactions/transaction";

interface ApiEnvelope<Data> {
  data: Data;
  message: string;
  success: boolean;
}

interface ApiMoney {
  amount: string;
  currency: SupportedCurrency;
}

const sessionAccessTokenKey = "nidhiflow.accessToken";
const sessionAuthSnapshotKey = "nidhiflow.authSession";

export interface AccountResource {
  currency: SupportedCurrency;
  id: string;
  isArchived: boolean;
  name: string;
  type: string;
}

export interface CategoryResource {
  id: string;
  isArchived: boolean;
  name: TransactionCategory;
  transactionType: TransactionType;
}

export interface BudgetResource {
  categoryId: string | null;
  currency: SupportedCurrency;
  deletedAt: string | null;
  id: string;
  limitAmount: string;
  periodEnd: string;
  periodStart: string;
  progressPercent: string;
  remainingAmount: string;
  spentAmount: string;
  updatedAt: string;
  workspaceId: string;
}

interface TransactionResource {
  amount?: string;
  categoryId: string | null;
  createdAt: string;
  currency?: SupportedCurrency;
  id: string;
  money?: ApiMoney;
  note: string | null;
  transactionDate: string;
  type: TransactionType | "transfer";
  updatedAt: string;
}

class FinanceApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "FinanceApiRequestError";
  }
}

async function parseResponse<Data>(response: Response): Promise<ApiEnvelope<Data>> {
  const body = (await response.json()) as ApiEnvelope<Data>;

  if (!response.ok) {
    throw new FinanceApiRequestError(body.message || "Request failed.", response.status);
  }

  return body;
}

function storeRefreshedAccessToken(accessToken: string) {
  try {
    window.sessionStorage.setItem(sessionAccessTokenKey, accessToken);
    const snapshot = window.sessionStorage.getItem(sessionAuthSnapshotKey);

    if (snapshot) {
      window.sessionStorage.setItem(
        sessionAuthSnapshotKey,
        JSON.stringify({ ...JSON.parse(snapshot), accessToken }),
      );
    }
  } catch {
    // The refresh cookie still carries the server session.
  }
}

async function sendApiRequest<Data>(
  path: string,
  accessToken: string,
  options: RequestInit,
): Promise<ApiEnvelope<Data>> {
  const response = await fetch(`${environment.NIDHIFLOW_API_BASE_URL}/api/v1${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...options.headers,
    },
    ...options,
  });

  return parseResponse<Data>(response);
}

async function apiRequest<Data>(
  path: string,
  accessToken: string,
  options: RequestInit = {},
): Promise<ApiEnvelope<Data>> {
  try {
    return await sendApiRequest<Data>(path, accessToken, options);
  } catch (error) {
    if (!(error instanceof FinanceApiRequestError) || error.status !== 401) {
      throw error;
    }

    const refreshedAccessToken = await refreshAccessToken();
    storeRefreshedAccessToken(refreshedAccessToken);

    return sendApiRequest<Data>(path, refreshedAccessToken, options);
  }
}

function decimalToMinor(amount: string): string {
  const [whole = "0", fraction = ""] = amount.split(".");
  return `${BigInt(whole) * 100n + BigInt(`${fraction}00`.slice(0, 2))}`;
}

function minorToDecimal(amountMinor: string): string {
  const minor = BigInt(amountMinor);
  const whole = minor / 100n;
  const fraction = minor % 100n;

  return `${whole}.${fraction.toString().padStart(2, "0")}`;
}

function toDateOnly(value: string): string {
  return value.slice(0, 10);
}

function toTransaction(
  resource: TransactionResource,
  categories: CategoryResource[],
): GuestTransaction | null {
  if (resource.type === "transfer") {
    return null;
  }

  const category = categories.find((item) => item.id === resource.categoryId);

  if (!category) {
    return null;
  }

  const amount = resource.money?.amount ?? resource.amount ?? "0";
  const currency = resource.money?.currency ?? resource.currency;

  if (!currency) {
    return null;
  }

  return {
    amountMinor: decimalToMinor(amount),
    category: category.name,
    createdAt: resource.createdAt,
    currency,
    id: resource.id,
    note: resource.note ?? "",
    transactionDate: toDateOnly(resource.transactionDate),
    type: resource.type,
    updatedAt: resource.updatedAt,
  };
}

export async function listAccounts(input: {
  accessToken: string;
  workspaceId: string;
}): Promise<AccountResource[]> {
  const result = await apiRequest<AccountResource[]>(
    `/workspaces/${input.workspaceId}/accounts`,
    input.accessToken,
    { method: "GET" },
  );

  return result.data;
}

export async function createAccount(input: {
  accessToken: string;
  currency: SupportedCurrency;
  workspaceId: string;
}): Promise<AccountResource> {
  try {
    const result = await apiRequest<AccountResource>(
      `/workspaces/${input.workspaceId}/accounts`,
      input.accessToken,
      {
        body: JSON.stringify({
          currency: input.currency,
          name: "Cash",
          openingBalance: { amount: "0.00", currency: input.currency },
          type: "cash",
        }),
        method: "POST",
      },
    );

    return result.data;
  } catch (error) {
    if (!(error instanceof FinanceApiRequestError) || error.status !== 409) {
      throw error;
    }

    const accounts = await listAccounts(input);
    const existingCashAccount = accounts.find(
      (account) =>
        !account.isArchived && account.currency === input.currency && account.name === "Cash",
    );

    if (!existingCashAccount) {
      throw error;
    }

    return existingCashAccount;
  }
}

export async function listCategories(input: {
  accessToken: string;
  workspaceId: string;
}): Promise<CategoryResource[]> {
  const result = await apiRequest<CategoryResource[]>(
    `/workspaces/${input.workspaceId}/categories`,
    input.accessToken,
    { method: "GET" },
  );

  return result.data.filter((category) => !category.isArchived);
}

export async function listTransactions(input: {
  accessToken: string;
  workspaceId: string;
}): Promise<GuestTransaction[]> {
  const categories = await listCategories(input);
  const result = await apiRequest<TransactionResource[]>(
    `/workspaces/${input.workspaceId}/transactions`,
    input.accessToken,
    { method: "GET" },
  );

  return result.data
    .map((transaction) => toTransaction(transaction, categories))
    .filter((transaction): transaction is GuestTransaction => Boolean(transaction));
}

export async function createTransaction(input: {
  accessToken: string;
  accountId: string;
  categoryId: string;
  transaction: GuestTransactionInput;
  workspaceId: string;
}): Promise<GuestTransaction> {
  const categories = await listCategories(input);
  const result = await apiRequest<TransactionResource>(
    `/workspaces/${input.workspaceId}/transactions`,
    input.accessToken,
    {
      body: JSON.stringify({
        accountId: input.accountId,
        categoryId: input.categoryId,
        money: {
          amount: minorToDecimal(input.transaction.amountMinor),
          currency: input.transaction.currency,
        },
        note: input.transaction.note || undefined,
        transactionDate: input.transaction.transactionDate,
        type: input.transaction.type,
      }),
      method: "POST",
    },
  );
  const transaction = toTransaction(result.data, categories);

  if (!transaction) {
    throw new Error("Transaction response could not be read.");
  }

  return transaction;
}

export async function updateTransaction(input: {
  accessToken: string;
  accountId: string;
  categoryId: string;
  transaction: GuestTransactionInput;
  transactionId: string;
  workspaceId: string;
}): Promise<GuestTransaction> {
  const categories = await listCategories(input);
  const result = await apiRequest<TransactionResource>(
    `/workspaces/${input.workspaceId}/transactions/${input.transactionId}`,
    input.accessToken,
    {
      body: JSON.stringify({
        accountId: input.accountId,
        categoryId: input.categoryId,
        money: {
          amount: minorToDecimal(input.transaction.amountMinor),
          currency: input.transaction.currency,
        },
        note: input.transaction.note || undefined,
        transactionDate: input.transaction.transactionDate,
        type: input.transaction.type,
      }),
      method: "PATCH",
    },
  );
  const transaction = toTransaction(result.data, categories);

  if (!transaction) {
    throw new Error("Transaction response could not be read.");
  }

  return transaction;
}

export async function deleteTransaction(input: {
  accessToken: string;
  transactionId: string;
  workspaceId: string;
}): Promise<void> {
  await apiRequest<TransactionResource>(
    `/workspaces/${input.workspaceId}/transactions/${input.transactionId}`,
    input.accessToken,
    { method: "DELETE" },
  );
}

export async function listBudgets(input: {
  accessToken: string;
  workspaceId: string;
}): Promise<BudgetResource[]> {
  const result = await apiRequest<BudgetResource[]>(
    `/workspaces/${input.workspaceId}/budgets`,
    input.accessToken,
    { method: "GET" },
  );

  return result.data.filter((budget) => !budget.deletedAt);
}

export async function createBudget(input: {
  accessToken: string;
  categoryId: string;
  currency: SupportedCurrency;
  limitAmountMinor: string;
  periodEnd: string;
  periodStart: string;
  workspaceId: string;
}): Promise<BudgetResource> {
  const result = await apiRequest<BudgetResource>(
    `/workspaces/${input.workspaceId}/budgets`,
    input.accessToken,
    {
      body: JSON.stringify({
        categoryId: input.categoryId,
        currency: input.currency,
        limitAmount: {
          amount: minorToDecimal(input.limitAmountMinor),
          currency: input.currency,
        },
        periodEnd: input.periodEnd,
        periodStart: input.periodStart,
      }),
      method: "POST",
    },
  );

  return result.data;
}

export async function updateBudget(input: {
  accessToken: string;
  budgetId: string;
  categoryId: string;
  currency: SupportedCurrency;
  limitAmountMinor: string;
  periodEnd: string;
  periodStart: string;
  workspaceId: string;
}): Promise<BudgetResource> {
  const result = await apiRequest<BudgetResource>(
    `/workspaces/${input.workspaceId}/budgets/${input.budgetId}`,
    input.accessToken,
    {
      body: JSON.stringify({
        categoryId: input.categoryId,
        limitAmount: {
          amount: minorToDecimal(input.limitAmountMinor),
          currency: input.currency,
        },
        periodEnd: input.periodEnd,
        periodStart: input.periodStart,
      }),
      method: "PATCH",
    },
  );

  return result.data;
}

export async function deleteBudget(input: {
  accessToken: string;
  budgetId: string;
  workspaceId: string;
}): Promise<void> {
  await apiRequest<BudgetResource>(
    `/workspaces/${input.workspaceId}/budgets/${input.budgetId}`,
    input.accessToken,
    { method: "DELETE" },
  );
}
