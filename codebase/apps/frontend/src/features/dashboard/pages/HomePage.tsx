import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowTrendUp,
  faBagShopping,
  faLightbulb,
  faPiggyBank,
  faWallet,
} from "@fortawesome/free-solid-svg-icons";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import MuiCard from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { type CSSProperties, type MouseEvent, useMemo, useState } from "react";

import { useGuestPreferences } from "../../../app/providers/GuestPreferencesProvider";
import { useGuestTransactions } from "../../../app/providers/GuestTransactionsProvider";
import { formatMoney } from "../../../domain/money/money";
import type { SupportedLocale } from "../../../domain/preferences/guestPreferences";
import { calculateTransactionTotals } from "../../../domain/transactions/transaction";
import type { GuestTransaction } from "../../../domain/transactions/transaction";
import { Brand } from "../../../shared/components/Brand";
import { EmptyState } from "../../../shared/components/EmptyState";
import { Icon } from "../../../shared/components/Icon";

function toDateValue(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function getCurrentMonthRange() {
  const today = new Date();

  return {
    from: toDateValue(new Date(today.getFullYear(), today.getMonth(), 1)),
    to: toDateValue(new Date(today.getFullYear(), today.getMonth() + 1, 0)),
  };
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

interface TransactionHistoryRowProps {
  locale: SupportedLocale;
  transaction: GuestTransaction;
}

function TransactionHistoryRow({ locale, transaction }: TransactionHistoryRowProps) {
  const title = transaction.note.trim() || transaction.category;
  const amount = formatMoney(
    { amountMinor: transaction.amountMinor, currency: transaction.currency },
    locale,
    transaction.type === "income" ? { sign: "positive" } : undefined,
  );

  return (
    <ListItemButton
      aria-label={`Edit ${title} ${transaction.type} from ${formatTransactionDate(
        transaction.transactionDate,
        locale,
      )}`}
      className="transaction-history-row"
      component={Link}
      to={`/transactions/${transaction.id}/edit`}
    >
      <ListItemAvatar>
        <Avatar
          className={`transaction-history-row__avatar transaction-history-row__avatar--${transaction.type}`}
        >
          {transaction.category.charAt(0)}
        </Avatar>
      </ListItemAvatar>
      <ListItemText
        className="transaction-history-row__details"
        primary={title}
        secondary={formatTransactionDate(transaction.transactionDate, locale)}
      />
      <Typography
        className={`transaction-history-row__amount transaction-history-row__amount--${transaction.type}`}
        component="span"
      >
        <span className="sr-only">{transaction.type === "income" ? "Income" : "Expense"}:</span>
        {amount}
      </Typography>
    </ListItemButton>
  );
}

export function HomePage() {
  const { preferences } = useGuestPreferences();
  const { transactions } = useGuestTransactions();
  const [headerMenuAnchor, setHeaderMenuAnchor] = useState<HTMLElement | null>(null);
  const currentMonthRange = useMemo(() => getCurrentMonthRange(), []);
  const currentMonthTransactions = useMemo(
    () =>
      transactions.filter((transaction) => {
        if (transaction.deletedAt) return false;
        if (transaction.transactionDate < currentMonthRange.from) return false;
        if (transaction.transactionDate > currentMonthRange.to) return false;
        return true;
      }),
    [currentMonthRange.from, currentMonthRange.to, transactions],
  );
  const totals = calculateTransactionTotals(currentMonthTransactions);
  const recentTransactions = transactions
    .filter((transaction) => !transaction.deletedAt)
    .slice(0, 5);
  const money = (amountMinor: string) =>
    formatMoney({ amountMinor, currency: preferences.currency }, preferences.locale);
  const incomeMinor = BigInt(totals.incomeMinor);
  const expenseMinor = BigInt(totals.expenseMinor);
  const budgetTotalMinor = incomeMinor;
  const budgetRemainingMinor = incomeMinor - expenseMinor;
  const budgetProgress = incomeMinor === 0n ? 0 : Number((expenseMinor * 100n) / incomeMinor);
  const budgetProgressValue = Math.min(100, budgetProgress);
  const isBudgetUnderControl = budgetRemainingMinor >= 0n;
  const progressRingStyle = {
    "--transaction-progress": `${budgetProgressValue * 3.6}deg`,
  } as CSSProperties;
  const showcaseTip = isBudgetUnderControl
    ? "Tip: You're saving better than 68% of users!"
    : "Tip: Expenses are above income. Review spending.";
  const isHeaderMenuOpen = Boolean(headerMenuAnchor);

  function openHeaderMenu(event: MouseEvent<HTMLButtonElement>) {
    setHeaderMenuAnchor(event.currentTarget);
  }

  function closeHeaderMenu() {
    setHeaderMenuAnchor(null);
  }

  return (
    <main className="page page--home" id="main-content">
      <Stack className="home-header" component="header" direction="row">
        <Box className="home-header__identity">
          <Brand />
        </Box>
        <Box className="home-header-menu">
          <IconButton
            aria-controls={isHeaderMenuOpen ? "home-header-menu" : undefined}
            aria-expanded={isHeaderMenuOpen}
            aria-haspopup="menu"
            aria-label="More options"
            className="home-header-menu__button"
            onClick={openHeaderMenu}
            size="small"
          >
            <MoreVertIcon aria-hidden="true" focusable="false" fontSize="small" />
          </IconButton>
          <Menu
            anchorEl={headerMenuAnchor}
            id="home-header-menu"
            onClose={closeHeaderMenu}
            open={isHeaderMenuOpen}
          >
            <MenuItem component={Link} onClick={closeHeaderMenu} to="/you#preferences">
              <ListItemIcon>
                <Icon name="bell" size={18} />
              </ListItemIcon>
              <Typography variant="body2">Notification preferences</Typography>
            </MenuItem>
          </Menu>
        </Box>
      </Stack>

      <section aria-label="Budget summaries" className="home-budget-section">
        <div className="home-summary-grid">
          <MuiCard
            className={`home-summary-card transaction-showcase-card__panel${
              isBudgetUnderControl ? "" : " transaction-showcase-card--alert"
            }`}
            elevation={0}
          >
            <CardContent className="transaction-showcase-card__content">
              <Box className="transaction-showcase-card__progress">
                <Box
                  aria-label={`Budget usage: ${budgetProgressValue} percent`}
                  aria-valuemax={100}
                  aria-valuemin={0}
                  aria-valuenow={budgetProgressValue}
                  className="transaction-progress-ring"
                  role="progressbar"
                  style={progressRingStyle}
                >
                  <span className="transaction-progress-ring__content">
                    <Typography component="strong">{budgetProgressValue}%</Typography>
                    <Typography component="small">
                      of budget
                      <br />
                      used <span aria-hidden="true">😎</span>
                    </Typography>
                  </span>
                </Box>
              </Box>

              <List className="transaction-showcase-card__stats" component="dl">
                <Box className="transaction-showcase-card__stat" component="div">
                  <Typography component="dt">
                    <span className="transaction-showcase-card__stat-icon transaction-showcase-card__stat-icon--total">
                      <FontAwesomeIcon icon={faWallet} />
                    </span>
                    <span>Total</span>
                  </Typography>
                  <Typography component="dd">{money(budgetTotalMinor.toString())}</Typography>
                </Box>
                <Box className="transaction-showcase-card__stat" component="div">
                  <Typography component="dt">
                    <span className="transaction-showcase-card__stat-icon transaction-showcase-card__stat-icon--spent">
                      <FontAwesomeIcon icon={faBagShopping} />
                    </span>
                    <span>Spent</span>
                  </Typography>
                  <Typography component="dd">{money(expenseMinor.toString())}</Typography>
                </Box>
                <Box className="transaction-showcase-card__stat" component="div">
                  <Typography component="dt">
                    <span className="transaction-showcase-card__stat-icon transaction-showcase-card__stat-icon--remaining">
                      <FontAwesomeIcon icon={faPiggyBank} />
                    </span>
                    <span>Balance</span>
                  </Typography>
                  <Typography
                    className={
                      isBudgetUnderControl
                        ? "transaction-showcase-card__amount--positive"
                        : "transaction-showcase-card__amount--alert"
                    }
                    component="dd"
                  >
                    {money(budgetRemainingMinor.toString())}
                  </Typography>
                </Box>
              </List>

              <Box className="transaction-showcase-card__tip">
                <span className="transaction-showcase-card__tip-icon" aria-hidden="true">
                  <FontAwesomeIcon icon={faLightbulb} />
                </span>
                <Typography component="span">{showcaseTip}</Typography>
                <Link className="transaction-showcase-card__insights" to="/reports">
                  See Insights
                  <FontAwesomeIcon icon={faArrowTrendUp} />
                </Link>
              </Box>
            </CardContent>
          </MuiCard>

          <section aria-label="Quick actions" className="home-actions-section">
            <div className="quick-actions">
              <Link
                aria-label="Add income"
                className="quick-action"
                to="/transactions/new?type=income"
              >
                <span className="quick-action__icon">
                  <Icon name="income" />
                </span>
                <strong>Add income</strong>
              </Link>
              <Link
                aria-label="Add expense"
                className="quick-action"
                to="/transactions/new?type=expense"
              >
                <span className="quick-action__icon">
                  <Icon name="expense" />
                </span>
                <strong>Add expense</strong>
              </Link>
              <Link aria-label="Open budget" className="quick-action" to="/budget">
                <span className="quick-action__icon">
                  <Icon name="plan" />
                </span>
                <strong>Budget</strong>
              </Link>
              <Link aria-label="Open reports" className="quick-action" to="/reports">
                <span className="quick-action__icon">
                  <Icon name="report" />
                </span>
                <strong>Reports</strong>
              </Link>
            </div>
          </section>
        </div>
      </section>

      <MuiCard
        aria-labelledby="recent-activity-title"
        className="transaction-history-card"
        component="section"
        elevation={0}
      >
        <div className="section-heading">
          <Typography component="h2" id="recent-activity-title">
            Transaction history
          </Typography>
          <Link className="transaction-history-card__see-all" to="/activity">
            See all
            <Icon name="chevron" size={20} />
          </Link>
        </div>
        {recentTransactions.length > 0 ? (
          <List className="transaction-history-list" disablePadding>
            {recentTransactions.map((transaction) => (
              <TransactionHistoryRow
                key={transaction.id}
                locale={preferences.locale}
                transaction={transaction}
              />
            ))}
          </List>
        ) : (
          <EmptyState
            action={
              <Link className="button button--secondary" to="/transactions/new?type=expense">
                Add your first transaction
              </Link>
            }
            description="Income and expenses will appear here after you add them."
            icon="activity"
            title="No activity yet"
          />
        )}
      </MuiCard>
    </main>
  );
}
