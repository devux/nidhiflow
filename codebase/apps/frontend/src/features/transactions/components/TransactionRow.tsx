import { Link } from "react-router-dom";

import { formatMoney } from "../../../domain/money/money";
import type { GuestTransaction } from "../../../domain/transactions/transaction";
import type { SupportedLocale } from "../../../domain/preferences/guestPreferences";
import { Icon } from "../../../shared/components/Icon";

interface TransactionRowProps {
  locale: SupportedLocale;
  transaction: GuestTransaction;
}

export function TransactionRow({ locale, transaction }: TransactionRowProps) {
  const sign = transaction.type === "income" ? "positive" : "negative";

  return (
    <Link
      aria-label={`Edit ${transaction.category} ${transaction.type}`}
      className="transaction-row"
      to={`/transactions/${transaction.id}/edit`}
    >
      <span className={`transaction-row__icon transaction-row__icon--${transaction.type}`}>
        <Icon name={transaction.type} size={21} />
      </span>
      <span className="transaction-row__details">
        <strong>{transaction.category}</strong>
        <small>
          {transaction.note || `${transaction.type === "income" ? "Income" : "Expense"}`}
        </small>
      </span>
      <span className={`transaction-amount transaction-amount--${transaction.type}`}>
        <span className="sr-only">{transaction.type === "income" ? "Income" : "Expense"}:</span>
        {formatMoney(
          { amountMinor: transaction.amountMinor, currency: transaction.currency },
          locale,
          { sign },
        )}
      </span>
      <Icon name="chevron" size={18} />
    </Link>
  );
}
