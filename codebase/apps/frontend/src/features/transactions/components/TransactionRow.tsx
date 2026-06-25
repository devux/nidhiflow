import Avatar from "@mui/material/Avatar";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
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
    <ListItemButton
      aria-label={`Edit ${transaction.category} ${transaction.type}`}
      className="transaction-row"
      component={Link}
      to={`/transactions/${transaction.id}/edit`}
    >
      <ListItemAvatar>
        <Avatar className={`transaction-row__icon transaction-row__icon--${transaction.type}`}>
          <Icon name={transaction.type} size={21} />
        </Avatar>
      </ListItemAvatar>
      <ListItemText
        className="transaction-row__details"
        primary={transaction.category}
        secondary={transaction.note || `${transaction.type === "income" ? "Income" : "Expense"}`}
      />
      <Typography
        className={`transaction-amount transaction-amount--${transaction.type}`}
        component="span"
      >
        <span className="sr-only">{transaction.type === "income" ? "Income" : "Expense"}:</span>
        {formatMoney(
          { amountMinor: transaction.amountMinor, currency: transaction.currency },
          locale,
          { sign },
        )}
      </Typography>
      <Icon name="chevron" size={18} />
    </ListItemButton>
  );
}
