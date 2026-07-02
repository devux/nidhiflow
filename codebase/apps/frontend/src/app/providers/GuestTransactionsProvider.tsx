import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  IndexedDbGuestTransactionRepository,
  type GuestTransactionRepository,
} from "../../data/guest/guestTransactionRepository";
import { useAuth } from "./AuthProvider";
import {
  createAccount,
  createNotificationTransaction,
  createTransaction as createApiTransaction,
  deleteTransaction as deleteApiTransaction,
  listAccounts,
  listCategories,
  listTransactions,
  restoreAccount,
  updateTransaction as updateApiTransaction,
  type AccountResource,
} from "../../data/api/financeClient";
import { environment } from "../../config/environment";
import {
  notificationTransactions,
  supportsNotificationTransactions,
} from "../../features/notifications/native/notificationTransactions";
import type {
  GuestTransaction,
  GuestTransactionInput,
} from "../../domain/transactions/transaction";
import { ErrorState } from "../../shared/components/ErrorState";
import { LoadingScreen } from "../../shared/components/LoadingScreen";

interface GuestTransactionsContextValue {
  canWrite: boolean;
  createTransaction: (input: GuestTransactionInput) => Promise<GuestTransaction>;
  removeTransaction: (id: string) => Promise<void>;
  requiresAuthentication: boolean;
  transactions: GuestTransaction[];
  updateTransaction: (id: string, input: GuestTransactionInput) => Promise<GuestTransaction>;
}

interface GuestTransactionsProviderProps {
  children: ReactNode;
  repository?: GuestTransactionRepository;
}

const GuestTransactionsContext = createContext<GuestTransactionsContextValue | null>(null);
const defaultRepository = new IndexedDbGuestTransactionRepository();

async function findOrCreateWritableAccount(input: {
  accessToken: string;
  accounts: AccountResource[];
  currency: GuestTransactionInput["currency"];
  workspaceId: string;
}) {
  const activeAccount = input.accounts.find(
    (account) => !account.isArchived && account.currency === input.currency,
  );

  if (activeAccount) {
    return activeAccount;
  }

  const archivedCashAccount = input.accounts.find(
    (account) =>
      account.isArchived && account.currency === input.currency && account.name === "Cash",
  );

  if (archivedCashAccount) {
    return restoreAccount({
      accessToken: input.accessToken,
      accountId: archivedCashAccount.id,
      workspaceId: input.workspaceId,
    });
  }

  return createAccount({
    accessToken: input.accessToken,
    currency: input.currency,
    workspaceId: input.workspaceId,
  });
}

export function GuestTransactionsProvider({
  children,
  repository = defaultRepository,
}: GuestTransactionsProviderProps) {
  const { accessToken, activeWorkspace, isAuthenticated, isCheckingSession, user } = useAuth();
  const [transactions, setTransactions] = useState<GuestTransaction[]>();
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const workspaceId = activeWorkspace?.id ?? null;

  useEffect(() => {
    let isActive = true;
    setLoadError(false);

    if (isCheckingSession) {
      return () => {
        isActive = false;
      };
    }

    setTransactions(undefined);

    const load =
      isAuthenticated && accessToken && workspaceId
        ? listTransactions({ accessToken, workspaceId })
        : repository.list();

    load
      .then((records) => {
        if (isActive) setTransactions(records);
      })
      .catch(() => {
        if (!isActive) return;
        if (isAuthenticated) {
          setTransactions((current) => current ?? []);
          return;
        }
        setLoadError(true);
      });

    return () => {
      isActive = false;
    };
  }, [accessToken, isAuthenticated, isCheckingSession, loadAttempt, repository, workspaceId]);

  useEffect(() => {
    if (!supportsNotificationTransactions() || isCheckingSession) return;
    if (
      !environment.ANDROID_NOTIFICATION_TRANSACTIONS_ENABLED ||
      !isAuthenticated ||
      !accessToken ||
      !workspaceId ||
      !user
    ) {
      void notificationTransactions.disableAndClear().catch(() => undefined);
      return;
    }

    void notificationTransactions
      .getStatus()
      .then((status) => {
        if (
          status.captureEnabled &&
          (status.userId !== user.id || status.workspaceId !== workspaceId)
        ) {
          return notificationTransactions.disableAndClear();
        }
        return undefined;
      })
      .catch(() => undefined);
  }, [accessToken, isAuthenticated, isCheckingSession, user, workspaceId]);

  useEffect(() => {
    if (
      !environment.ANDROID_NOTIFICATION_TRANSACTIONS_ENABLED ||
      !supportsNotificationTransactions() ||
      !isAuthenticated ||
      !accessToken ||
      !workspaceId ||
      !user
    ) {
      return;
    }
    const notificationAccessToken = accessToken;
    const notificationUserId = user.id;
    const notificationWorkspaceId = workspaceId;

    let isActive = true;
    let syncing = false;
    async function syncDetectedTransactions() {
      if (syncing) return;
      syncing = true;
      try {
        const status = await notificationTransactions.getStatus();
        if (
          !status.captureEnabled ||
          !status.permissionGranted ||
          !status.accountId ||
          status.userId !== notificationUserId ||
          status.workspaceId !== notificationWorkspaceId
        ) {
          return;
        }
        const pending = await notificationTransactions.getPendingTransactions();
        if (pending.transactions.length === 0) return;
        const categories = await listCategories({
          accessToken: notificationAccessToken,
          workspaceId: notificationWorkspaceId,
        });
        const acknowledged: string[] = [];
        const synced: GuestTransaction[] = [];

        for (const detected of pending.transactions) {
          try {
            const result = await createNotificationTransaction({
              accessToken: notificationAccessToken,
              accountId: status.accountId,
              categories,
              detected,
              workspaceId: notificationWorkspaceId,
            });
            acknowledged.push(detected.localId);
            synced.push(result.transaction);
          } catch {
            // Keep the item queued for a later retry or account correction.
          }
        }

        if (acknowledged.length > 0) {
          await notificationTransactions.acknowledgeTransactions({ localIds: acknowledged });
        }
        if (isActive && synced.length > 0) {
          setTransactions((current) => {
            const records = [...(current ?? [])];
            for (const transaction of synced) {
              const index = records.findIndex((record) => record.id === transaction.id);
              if (index >= 0) records[index] = transaction;
              else records.unshift(transaction);
            }
            return records;
          });
        }
      } finally {
        syncing = false;
      }
    }

    const handleForeground = () => {
      if (document.visibilityState === "visible") void syncDetectedTransactions();
    };
    void syncDetectedTransactions();
    window.addEventListener("focus", handleForeground);
    window.addEventListener("nidhiflow:notification-settings-changed", handleForeground);
    document.addEventListener("visibilitychange", handleForeground);
    return () => {
      isActive = false;
      window.removeEventListener("focus", handleForeground);
      window.removeEventListener("nidhiflow:notification-settings-changed", handleForeground);
      document.removeEventListener("visibilitychange", handleForeground);
    };
  }, [accessToken, isAuthenticated, user, workspaceId]);

  const createTransaction = useCallback(
    async (input: GuestTransactionInput) => {
      if (!isAuthenticated || !accessToken || !workspaceId) {
        throw new Error("AUTHENTICATION_REQUIRED");
      }

      const [accounts, categories] = await Promise.all([
        listAccounts({ accessToken, workspaceId }),
        listCategories({ accessToken, workspaceId }),
      ]);
      const activeAccount = await findOrCreateWritableAccount({
        accessToken,
        accounts,
        currency: input.currency,
        workspaceId,
      });
      const category = categories.find(
        (item) => item.name === input.category && item.transactionType === input.type,
      );

      if (!category) {
        throw new Error("The selected category is not available for this workspace.");
      }

      const created = await createApiTransaction({
        accessToken,
        accountId: activeAccount.id,
        categoryId: category.id,
        transaction: input,
        workspaceId,
      });

      setTransactions((current) => [created, ...(current ?? [])]);
      return created;
    },
    [accessToken, isAuthenticated, workspaceId],
  );

  const updateTransaction = useCallback(
    async (id: string, input: GuestTransactionInput) => {
      if (!isAuthenticated || !accessToken || !workspaceId) {
        throw new Error("AUTHENTICATION_REQUIRED");
      }

      const [accounts, categories] = await Promise.all([
        listAccounts({ accessToken, workspaceId }),
        listCategories({ accessToken, workspaceId }),
      ]);
      const activeAccount = await findOrCreateWritableAccount({
        accessToken,
        accounts,
        currency: input.currency,
        workspaceId,
      });
      const category = categories.find(
        (item) => item.name === input.category && item.transactionType === input.type,
      );

      if (!category) {
        throw new Error("The selected category is not available for this workspace.");
      }

      const updated = await updateApiTransaction({
        accessToken,
        accountId: activeAccount.id,
        categoryId: category.id,
        transaction: input,
        transactionId: id,
        workspaceId,
      });
      setTransactions((current) =>
        (current ?? []).map((transaction) => (transaction.id === id ? updated : transaction)),
      );
      return updated;
    },
    [accessToken, isAuthenticated, workspaceId],
  );

  const removeTransaction = useCallback(
    async (id: string) => {
      if (!isAuthenticated || !accessToken || !workspaceId) {
        throw new Error("AUTHENTICATION_REQUIRED");
      }

      await deleteApiTransaction({ accessToken, transactionId: id, workspaceId });
      setTransactions((current) => (current ?? []).filter((transaction) => transaction.id !== id));
    },
    [accessToken, isAuthenticated, workspaceId],
  );

  const contextValue = useMemo(
    () =>
      transactions
        ? {
            canWrite: isAuthenticated,
            createTransaction,
            removeTransaction,
            requiresAuthentication: !isAuthenticated,
            transactions,
            updateTransaction,
          }
        : null,
    [createTransaction, isAuthenticated, removeTransaction, transactions, updateTransaction],
  );

  if (loadError) {
    return (
      <ErrorState
        actionLabel="Try again"
        description="Your local transactions could not be opened. No data was uploaded."
        onAction={() => setLoadAttempt((attempt) => attempt + 1)}
        title="Transaction history is unavailable"
      />
    );
  }

  if (!contextValue) {
    return <LoadingScreen />;
  }

  return (
    <GuestTransactionsContext.Provider value={contextValue}>
      {children}
    </GuestTransactionsContext.Provider>
  );
}

export function useGuestTransactions(): GuestTransactionsContextValue {
  const context = useContext(GuestTransactionsContext);

  if (!context) {
    throw new Error("useGuestTransactions must be used within GuestTransactionsProvider.");
  }

  return context;
}
