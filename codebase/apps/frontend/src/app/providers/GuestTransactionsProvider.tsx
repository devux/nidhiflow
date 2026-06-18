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
  createTransaction as createApiTransaction,
  deleteTransaction as deleteApiTransaction,
  listAccounts,
  listCategories,
  listTransactions,
  updateTransaction as updateApiTransaction,
} from "../../data/api/financeClient";
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

export function GuestTransactionsProvider({
  children,
  repository = defaultRepository,
}: GuestTransactionsProviderProps) {
  const { accessToken, isAuthenticated, isCheckingSession, workspaces } = useAuth();
  const [transactions, setTransactions] = useState<GuestTransaction[]>();
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const workspaceId = workspaces[0]?.id ?? null;

  useEffect(() => {
    let isActive = true;
    setLoadError(false);

    if (isCheckingSession) {
      return () => {
        isActive = false;
      };
    }

    const load = isAuthenticated && accessToken && workspaceId
      ? listTransactions({ accessToken, workspaceId })
      : repository.list();

    load
      .then((records) => {
        if (isActive) setTransactions(records);
      })
      .catch(() => {
        if (!isActive) return;
        if (isAuthenticated) {
          setTransactions([]);
          return;
        }
        setLoadError(true);
      });

    return () => {
      isActive = false;
    };
  }, [accessToken, isAuthenticated, isCheckingSession, loadAttempt, repository, workspaceId]);

  const createTransaction = useCallback(
    async (input: GuestTransactionInput) => {
      if (!isAuthenticated || !accessToken || !workspaceId) {
        throw new Error("AUTHENTICATION_REQUIRED");
      }

      const [accounts, categories] = await Promise.all([
        listAccounts({ accessToken, workspaceId }),
        listCategories({ accessToken, workspaceId }),
      ]);
      const activeAccount =
        accounts.find((account) => !account.isArchived && account.currency === input.currency) ??
        (await createAccount({ accessToken, currency: input.currency, workspaceId }));
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
      const activeAccount =
        accounts.find((account) => !account.isArchived && account.currency === input.currency) ??
        (await createAccount({ accessToken, currency: input.currency, workspaceId }));
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
