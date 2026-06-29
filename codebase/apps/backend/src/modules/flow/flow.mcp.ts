import { AccountRepository } from "../accounts/account.repository.js";
import { WorkspaceCategoryRepository } from "../categories/workspace-category.repository.js";
import { ReportService } from "../reports/report.service.js";
import { resolveReportRange } from "../reports/report.range.js";
import { TransactionRepository } from "../transactions/transaction.repository.js";
import type { Database } from "../../shared/database/database.js";

export type FlowIntent =
  | "create_budget"
  | "create_goal"
  | "create_transaction"
  | "delete_transaction"
  | "explain_spending"
  | "search_transactions"
  | "out_of_scope"
  | "update_transaction"
  | "unknown";

export interface FlowModelPlan {
  evidence?: {
    from?: string;
    limit?: string;
    period?: string;
    query?: string;
    to?: string;
    type?: string;
  };
  filters?: {
    from?: string;
    limit?: number;
    period?: "last_month" | "this_month" | "this_year";
    query?: string;
    to?: string;
    type?: "expense" | "income" | "transfer";
  };
  intent: FlowIntent;
  response: string;
}

interface FlowToolContext {
  database: Database;
  userId: string;
  workspace: {
    id: string;
    reportingCurrency: string;
    timezone: string;
  };
}

export const flowMcpTools = [
  {
    name: "flow.searchTransactions",
    description:
      "Read-only search over authorized workspace transactions. Returns a small sanitized list.",
  },
  {
    name: "flow.summarizeMonth",
    description:
      "Read-only report summary for the authorized workspace. Uses deterministic report services.",
  },
] as const;

function includesText(value: string | null | undefined, query: string) {
  return value?.toLowerCase().includes(query.toLowerCase()) ?? false;
}

export class FlowMcpToolRegistry {
  constructor(private readonly context: FlowToolContext) {}

  async searchTransactions(filters: FlowModelPlan["filters"] = {}) {
    const transactionRepository = new TransactionRepository(this.context.database);
    const categoryRepository = new WorkspaceCategoryRepository(this.context.database);
    const accountRepository = new AccountRepository(this.context.database);
    const repositoryFilters: Parameters<TransactionRepository["listByWorkspace"]>[1] = {};

    if (filters.period) {
      const period = {
        last_month: "lastMonth",
        this_month: "thisMonth",
        this_year: "thisYear",
      }[filters.period] as "lastMonth" | "thisMonth" | "thisYear";
      const range = resolveReportRange({ period }, this.context.workspace.timezone);

      repositoryFilters.from = range.from;
      repositoryFilters.to = range.to;
    } else {
      if (filters.from) repositoryFilters.from = filters.from;
      if (filters.to) repositoryFilters.to = filters.to;
    }
    if (filters.type) repositoryFilters.type = filters.type;

    const [transactions, categories, accounts] = await Promise.all([
      transactionRepository.listByWorkspace(this.context.workspace.id, repositoryFilters),
      categoryRepository.listByWorkspace(this.context.workspace.id),
      accountRepository.listByWorkspace(this.context.workspace.id),
    ]);
    const visibleCategories = categories.filter((category) => !category.isArchived);
    const visibleAccounts = accounts.filter((account) => !account.isArchived);
    const query = filters.query?.trim();

    return transactions
      .filter((transaction) => {
        if (!query) return true;
        const category = visibleCategories.find((item) => item.id === transaction.categoryId);
        const account = visibleAccounts.find((item) => item.id === transaction.accountId);

        return (
          includesText(transaction.note, query) ||
          includesText(category?.name, query) ||
          includesText(account?.name, query)
        );
      })
      .slice(0, filters.limit ?? 8)
      .map((transaction) => {
        const category = visibleCategories.find((item) => item.id === transaction.categoryId);
        const account = visibleAccounts.find((item) => item.id === transaction.accountId);

        return {
          accountName: account?.name ?? "Unknown account",
          amount: transaction.amount,
          categoryName: category?.name ?? null,
          currency: transaction.currency,
          date: transaction.transactionDate,
          note: transaction.note,
          type: transaction.type,
        };
      });
  }

  async summarizeMonth() {
    const reportService = new ReportService(this.context.database);

    return reportService.getSummary(this.context.userId, this.context.workspace.id, {
      period: "thisMonth",
    });
  }
}
