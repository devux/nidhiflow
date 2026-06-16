import type {
  GuestTransaction,
  GuestTransactionInput,
  TransactionCategory,
  TransactionType,
} from "../../domain/transactions/transaction";
import { createTransactionId } from "../../domain/transactions/transaction";
import { openGuestDatabase } from "./guestDatabase";

export interface TransactionListFilters {
  category?: TransactionCategory;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  query?: string;
  type?: TransactionType;
}

export interface GuestTransactionRepository {
  create: (input: GuestTransactionInput) => Promise<GuestTransaction>;
  findById: (id: string) => Promise<GuestTransaction | undefined>;
  list: (filters?: TransactionListFilters) => Promise<GuestTransaction[]>;
  remove: (id: string) => Promise<void>;
  update: (id: string, input: GuestTransactionInput) => Promise<GuestTransaction>;
}

export class IndexedDbGuestTransactionRepository implements GuestTransactionRepository {
  async create(input: GuestTransactionInput): Promise<GuestTransaction> {
    const database = await openGuestDatabase();
    const now = new Date().toISOString();
    const transaction: GuestTransaction = {
      ...input,
      createdAt: now,
      id: createTransactionId(),
      updatedAt: now,
    };
    await database.add("transactions", transaction);
    return transaction;
  }

  async findById(id: string): Promise<GuestTransaction | undefined> {
    const database = await openGuestDatabase();
    const transaction = await database.get("transactions", id);
    return transaction?.deletedAt ? undefined : transaction;
  }

  async list(filters: TransactionListFilters = {}): Promise<GuestTransaction[]> {
    const database = await openGuestDatabase();
    const records = await database.getAllFromIndex("transactions", "by-date");
    const query = filters.query?.trim().toLocaleLowerCase();

    return records
      .filter((transaction) => {
        if (transaction.deletedAt) return false;
        if (filters.type && transaction.type !== filters.type) return false;
        if (filters.category && transaction.category !== filters.category) return false;
        if (filters.dateFrom && transaction.transactionDate < filters.dateFrom) return false;
        if (filters.dateTo && transaction.transactionDate > filters.dateTo) return false;
        if (
          query &&
          !`${transaction.category} ${transaction.note}`.toLocaleLowerCase().includes(query)
        )
          return false;
        return true;
      })
      .sort(
        (left, right) =>
          right.transactionDate.localeCompare(left.transactionDate) ||
          right.createdAt.localeCompare(left.createdAt),
      )
      .slice(0, filters.limit ?? 100);
  }

  async remove(id: string): Promise<void> {
    const database = await openGuestDatabase();
    const transaction = await database.get("transactions", id);

    if (!transaction || transaction.deletedAt) {
      throw new Error("Transaction not found.");
    }

    const now = new Date().toISOString();
    await database.put("transactions", {
      ...transaction,
      deletedAt: now,
      updatedAt: now,
    });
  }

  async update(id: string, input: GuestTransactionInput): Promise<GuestTransaction> {
    const database = await openGuestDatabase();
    const existing = await database.get("transactions", id);

    if (!existing || existing.deletedAt) {
      throw new Error("Transaction not found.");
    }

    const transaction: GuestTransaction = {
      ...existing,
      ...input,
      updatedAt: new Date().toISOString(),
    };
    await database.put("transactions", transaction);
    return transaction;
  }
}
