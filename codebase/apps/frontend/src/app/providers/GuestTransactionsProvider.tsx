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
import type {
  GuestTransaction,
  GuestTransactionInput,
} from "../../domain/transactions/transaction";
import { ErrorState } from "../../shared/components/ErrorState";
import { LoadingScreen } from "../../shared/components/LoadingScreen";

interface GuestTransactionsContextValue {
  createTransaction: (input: GuestTransactionInput) => Promise<GuestTransaction>;
  removeTransaction: (id: string) => Promise<void>;
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
  const [transactions, setTransactions] = useState<GuestTransaction[]>();
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    let isActive = true;
    setLoadError(false);

    repository
      .list()
      .then((records) => {
        if (isActive) setTransactions(records);
      })
      .catch(() => {
        if (isActive) setLoadError(true);
      });

    return () => {
      isActive = false;
    };
  }, [loadAttempt, repository]);

  const createTransaction = useCallback(
    async (input: GuestTransactionInput) => {
      const created = await repository.create(input);
      setTransactions((current) => [created, ...(current ?? [])]);
      return created;
    },
    [repository],
  );

  const updateTransaction = useCallback(
    async (id: string, input: GuestTransactionInput) => {
      const updated = await repository.update(id, input);
      setTransactions((current) =>
        (current ?? []).map((transaction) => (transaction.id === id ? updated : transaction)),
      );
      return updated;
    },
    [repository],
  );

  const removeTransaction = useCallback(
    async (id: string) => {
      await repository.remove(id);
      setTransactions((current) => (current ?? []).filter((transaction) => transaction.id !== id));
    },
    [repository],
  );

  const contextValue = useMemo(
    () =>
      transactions
        ? {
            createTransaction,
            removeTransaction,
            transactions,
            updateTransaction,
          }
        : null,
    [createTransaction, removeTransaction, transactions, updateTransaction],
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
