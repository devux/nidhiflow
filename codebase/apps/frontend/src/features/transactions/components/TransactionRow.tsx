import Avatar from "@mui/material/Avatar";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import { Link } from "react-router-dom";

import { formatMoney } from "../../../domain/money/money";
import type { GuestTransaction } from "../../../domain/transactions/transaction";
import type { SupportedLocale } from "../../../domain/preferences/guestPreferences";
import { getTransactionAvatarStyle } from "./transactionAvatarTheme";

interface TransactionRowProps {
  locale: SupportedLocale;
  transaction: GuestTransaction;
}

function formatTransactionDate(value: string, locale: SupportedLocale) {
  const [datePart] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const date = year && month && day ? new Date(year, month - 1, day) : new Date(value);

  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
  }).format(date);
}

export function TransactionRow({ locale, transaction }: TransactionRowProps) {
  const sign = transaction.type === "income" ? "positive" : "negative";
  const title = transaction.note.trim() || transaction.category;
  const formattedDate = formatTransactionDate(transaction.transactionDate, locale);

  return (
    <ListItemButton
      aria-label={`Edit ${title} ${transaction.type} from ${formattedDate}`}
      className="transaction-history-row"
      component={Link}
      to={`/transactions/${transaction.id}/edit`}
    >
      <ListItemAvatar>
        <Avatar
          className={`transaction-history-row__avatar transaction-history-row__avatar--${transaction.type}`}
          style={getTransactionAvatarStyle(transaction)}
        >
          {transaction.category.charAt(0)}
        </Avatar>
      </ListItemAvatar>
      <ListItemText
        className="transaction-history-row__details"
        primary={title}
        secondary={
          <>
            {formattedDate}
            {transaction.source === "ANDROID_NOTIFICATION" ? (
              <span className="transaction-source-label">From notification</span>
            ) : null}
          </>
        }
      />
      <Typography
        className={`transaction-history-row__amount transaction-history-row__amount--${transaction.type}`}
        component="span"
      >
        <span className="sr-only">{transaction.type === "income" ? "Income" : "Expense"}:</span>
        {formatMoney(
          { amountMinor: transaction.amountMinor, currency: transaction.currency },
          locale,
          { sign },
        )}
      </Typography>
    </ListItemButton>
  );
}
