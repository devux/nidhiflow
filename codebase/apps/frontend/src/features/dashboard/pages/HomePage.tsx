import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowTrendUp,
  faBagShopping,
  faLightbulb,
  faPiggyBank,
  faWallet,
} from "@fortawesome/free-solid-svg-icons";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ConfirmationNumberOutlinedIcon from "@mui/icons-material/ConfirmationNumberOutlined";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import MuiButton from "@mui/material/Button";
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
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import { type CSSProperties, type FormEvent, type MouseEvent, useMemo, useState } from "react";

import { useAuth } from "../../../app/providers/AuthProvider";
import { useGuestPreferences } from "../../../app/providers/GuestPreferencesProvider";
import { useGuestTransactions } from "../../../app/providers/GuestTransactionsProvider";
import {
  createFamilyWorkspace,
  createWorkspaceShareCode,
  joinWorkspaceByShareCode,
  type WorkspaceShareCode,
} from "../../../data/api/workspaceClient";
import { formatMoney } from "../../../domain/money/money";
import type { SupportedLocale } from "../../../domain/preferences/guestPreferences";
import { calculateTransactionTotals } from "../../../domain/transactions/transaction";
import type { GuestTransaction } from "../../../domain/transactions/transaction";
import { Brand } from "../../../shared/components/Brand";
import { Button } from "../../../shared/components/Button";
import { EmptyState } from "../../../shared/components/EmptyState";
import { Icon } from "../../../shared/components/Icon";
import { getTransactionAvatarStyle } from "../../transactions/components/transactionAvatarTheme";

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
          style={getTransactionAvatarStyle(transaction)}
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
  const {
    accessToken,
    activeWorkspace,
    isAuthenticated,
    refreshWorkspaces,
    setActiveWorkspace,
    user,
    workspaces,
  } = useAuth();
  const { preferences } = useGuestPreferences();
  const { transactions } = useGuestTransactions();
  const [headerMenuAnchor, setHeaderMenuAnchor] = useState<HTMLElement | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [shareCode, setShareCode] = useState<WorkspaceShareCode | null>(null);
  const [shareStatus, setShareStatus] = useState<
    "copied" | "creating" | "error" | "idle" | "joining" | "joined"
  >("idle");
  const [shareMessage, setShareMessage] = useState("");
  const [workspaceTab, setWorkspaceTab] = useState<"personal" | "shared">("personal");
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
  const familyWorkspace = workspaces.find((workspace) => workspace.type === "family");
  const personalWorkspace = workspaces.find((workspace) => workspace.type === "personal");
  const manageableFamilyWorkspace = workspaces.find(
    (workspace) => workspace.type === "family" && workspace.membershipRole === "manager",
  );

  function openHeaderMenu(event: MouseEvent<HTMLButtonElement>) {
    setHeaderMenuAnchor(event.currentTarget);
  }

  function closeHeaderMenu() {
    setHeaderMenuAnchor(null);
  }

  function openShareModal() {
    setIsShareModalOpen(true);
    setShareStatus("idle");
    setShareMessage("");
    setWorkspaceTab(activeWorkspace?.type === "family" ? "shared" : "personal");

    if (isAuthenticated && accessToken && manageableFamilyWorkspace) {
      void handleCreateShareCode(manageableFamilyWorkspace.id);
    }
  }

  function closeShareModal() {
    setIsShareModalOpen(false);
    setShareStatus("idle");
    setShareMessage("");
  }

  async function handleCreateShareCode(workspaceId: string) {
    if (!accessToken) return;

    setShareStatus("creating");
    setShareMessage("");

    try {
      const createdShareCode = await createWorkspaceShareCode(accessToken, workspaceId);
      setShareCode(createdShareCode);
      setShareStatus("idle");
    } catch {
      setShareStatus("error");
      setShareMessage("Share code could not be created. Please try again.");
    }
  }

  async function handleCreateFamilyWorkspace() {
    if (!accessToken) return;

    setShareStatus("creating");
    setShareMessage("");

    try {
      const workspace = await createFamilyWorkspace(accessToken, {
        name: `${user?.displayName ?? preferences.displayName}'s Shared Space`,
        reportingCurrency: user?.preferredCurrency ?? preferences.currency,
        timezone: user?.timezone ?? preferences.timezone,
      });
      await refreshWorkspaces();
      await handleCreateShareCode(workspace.id);
    } catch {
      setShareStatus("error");
      setShareMessage("Shared space could not be created. Please try again.");
    }
  }

  async function handleJoinWorkspace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedCode = joinCode.trim().toUpperCase();

    if (!isAuthenticated || !accessToken) {
      setShareStatus("error");
      setShareMessage("Log in or create an account before joining a shared workspace.");
      return;
    }

    if (!normalizedCode) {
      setShareStatus("error");
      setShareMessage("Enter a sharing code.");
      return;
    }

    setShareStatus("joining");
    setShareMessage("");

    try {
      const joinedWorkspace = await joinWorkspaceByShareCode(accessToken, normalizedCode);
      await refreshWorkspaces(joinedWorkspace.id);
      setJoinCode("");
      setShareStatus("joined");
      setShareMessage("Joined. You are now viewing the shared workspace.");
    } catch {
      setShareStatus("error");
      setShareMessage("Code did not work. Ask for a new one.");
    }
  }

  async function handleCopyShareCode() {
    if (!shareCode) return;

    try {
      await navigator.clipboard.writeText(shareCode.code);
      setShareStatus("copied");
      setShareMessage("Code copied.");
    } catch {
      setShareStatus("error");
      setShareMessage("Copy failed. Select the code instead.");
    }
  }

  function handleSwitchWorkspace(workspaceId: string) {
    closeShareModal();
    setActiveWorkspace(workspaceId);
  }

  return (
    <main className="page page--home" id="main-content">
      <Stack className="home-header" component="header" direction="row">
        <Box className="home-header__identity">
          <Brand />
        </Box>
        <Box className="home-header-menu">
          <IconButton
            aria-label="Shared workspace"
            className="home-header-menu__button home-share-button"
            onClick={openShareModal}
            size="small"
          >
            <GroupsRoundedIcon aria-hidden="true" focusable="false" fontSize="small" />
          </IconButton>
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

      {isShareModalOpen ? (
        <div
          aria-labelledby="family-collaboration-title"
          aria-modal="true"
          className="modal-backdrop"
          role="dialog"
        >
          <section className="modal-card family-share-modal">
            <IconButton
              aria-label="Close sharing"
              className="family-share-modal__close"
              onClick={closeShareModal}
              size="small"
            >
              <CloseRoundedIcon aria-hidden="true" focusable="false" fontSize="small" />
            </IconButton>
            <div className="family-share-modal__header">
              <span className="icon-tile" aria-hidden="true">
                <GroupsRoundedIcon fontSize="small" />
              </span>
              <div>
                <h2 id="family-collaboration-title">Shared space</h2>
                <p>Work together on finances</p>
              </div>
            </div>

            {!isAuthenticated ? (
              <div className="family-share-modal__auth">
                <p>Sign in to share or join safely.</p>
                <div className="family-share-modal__actions">
                  <Link className="button button--primary" to="/signup">
                    Create account
                  </Link>
                  <Link className="button button--secondary" to="/login">
                    Log in
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <Tabs
                  aria-label="Workspace sections"
                  className="family-share-modal__tabs"
                  onChange={(_event, value: "personal" | "shared") => setWorkspaceTab(value)}
                  value={workspaceTab}
                  variant="fullWidth"
                >
                  <Tab
                    aria-controls="personal-workspace-panel"
                    id="personal-workspace-tab"
                    label="Personal"
                    value="personal"
                  />
                  <Tab
                    aria-controls="shared-workspace-panel"
                    id="shared-workspace-tab"
                    label="Shared"
                    value="shared"
                  />
                </Tabs>

                <div
                  aria-labelledby="personal-workspace-tab"
                  className="family-share-modal__panel-content"
                  hidden={workspaceTab !== "personal"}
                  id="personal-workspace-panel"
                  role="tabpanel"
                >
                  {manageableFamilyWorkspace ? (
                    <div className="share-code-panel">
                      <div className="share-code-panel__top">
                        <div className="share-code-panel__meta">
                          <span className="share-code-panel__label">Invite code</span>
                          <span className="share-code-panel__validity">
                            <ShieldOutlinedIcon aria-hidden="true" fontSize="small" />
                            Valid for 7 days
                          </span>
                        </div>
                      </div>
                      <small>For {manageableFamilyWorkspace.name}</small>
                      <output
                        className={
                          shareCode ? "share-code-panel__code" : "share-code-panel__pending"
                        }
                      >
                        {shareCode?.code ??
                          (shareStatus === "creating" ? "Getting code" : "Code loading")}
                      </output>
                      <div className="family-share-modal__actions">
                        <MuiButton
                          className="family-share-modal__compact-action"
                          disabled={shareStatus === "creating"}
                          onClick={() => void handleCreateShareCode(manageableFamilyWorkspace.id)}
                          startIcon={<RefreshRoundedIcon />}
                          variant="outlined"
                        >
                          New code
                        </MuiButton>
                        <MuiButton
                          className="family-share-modal__compact-action family-share-modal__compact-action--primary"
                          disabled={!shareCode}
                          onClick={() => void handleCopyShareCode()}
                          startIcon={<ContentCopyRoundedIcon />}
                          variant="contained"
                        >
                          Copy code
                        </MuiButton>
                      </div>
                    </div>
                  ) : (
                    <div className="share-code-panel">
                      <div className="share-code-panel__top">
                        <div className="share-code-panel__meta">
                          <span className="share-code-panel__label">Invite code</span>
                        </div>
                      </div>
                      <strong>Create a shared space you manage.</strong>
                      <small>Your personal records and other shared spaces stay separate.</small>
                      <Button
                        disabled={shareStatus === "creating"}
                        onClick={() => void handleCreateFamilyWorkspace()}
                      >
                        {shareStatus === "creating" ? "Creating" : "Create invite code"}
                      </Button>
                    </div>
                  )}
                </div>

                <div
                  aria-labelledby="shared-workspace-tab"
                  hidden={workspaceTab !== "shared"}
                  id="shared-workspace-panel"
                  role="tabpanel"
                >
                  <div className="family-share-modal__panel-content">
                    {familyWorkspace?.membershipRole === "member" ? (
                      <section
                        aria-label="Shared workspace details"
                        className="family-share-modal__workspace"
                      >
                        <span className="family-share-modal__workspace-label">
                          Current shared space
                        </span>
                        <strong>{familyWorkspace.ownerDisplayName ?? familyWorkspace.name}</strong>
                        {familyWorkspace.ownerDisplayName &&
                        familyWorkspace.ownerDisplayName !== familyWorkspace.name ? (
                          <span>{familyWorkspace.name}</span>
                        ) : null}
                        <dl>
                          <div>
                            <dt>Your role</dt>
                            <dd>Member</dd>
                          </div>
                          <div>
                            <dt>Currency</dt>
                            <dd>{familyWorkspace.reportingCurrency ?? "Not set"}</dd>
                          </div>
                        </dl>
                      </section>
                    ) : null}

                    {familyWorkspace ? (
                      activeWorkspace?.id === familyWorkspace.id ? (
                        personalWorkspace ? (
                          <Button onClick={() => handleSwitchWorkspace(personalWorkspace.id)}>
                            Switch to personal workspace
                          </Button>
                        ) : null
                      ) : (
                        <Button onClick={() => handleSwitchWorkspace(familyWorkspace.id)}>
                          Switch to shared workspace
                        </Button>
                      )
                    ) : null}

                    <form
                      className="family-share-modal__join"
                      onSubmit={(event) => void handleJoinWorkspace(event)}
                    >
                      <div className="family-share-modal__join-heading">
                        <span aria-hidden="true">
                          <LinkRoundedIcon />
                        </span>
                        <div>
                          <label htmlFor="workspace-share-code">Join with code</label>
                          <small>Enter a code shared by another workspace member.</small>
                        </div>
                      </div>
                      <div className="family-share-modal__join-row">
                        <div className="family-share-modal__join-input">
                          <ConfirmationNumberOutlinedIcon aria-hidden="true" fontSize="small" />
                          <input
                            autoComplete="off"
                            id="workspace-share-code"
                            inputMode="text"
                            onChange={(event) => setJoinCode(event.target.value)}
                            placeholder="Enter code (e.g. ABCD-2345)"
                            value={joinCode}
                          />
                        </div>
                        <MuiButton
                          className="family-share-modal__compact-action"
                          disabled={shareStatus === "joining"}
                          type="submit"
                          variant="outlined"
                        >
                          {shareStatus === "joining" ? "Joining" : "Join"}
                        </MuiButton>
                      </div>
                    </form>
                  </div>
                </div>
              </>
            )}

            {shareMessage ? (
              <div
                className={
                  shareStatus === "error"
                    ? "family-share-modal__message family-share-modal__message--error"
                    : "family-share-modal__message"
                }
                role={shareStatus === "error" ? "alert" : "status"}
              >
                {shareStatus === "error" ? (
                  <span className="family-share-modal__message-icon" aria-hidden="true">
                    <ErrorOutlineRoundedIcon />
                  </span>
                ) : null}
                {shareMessage === "Share code could not be created. Please try again." ? (
                  <span className="family-share-modal__message-copy">
                    <strong>Share code could not be created.</strong>
                    <span>Please try again.</span>
                  </span>
                ) : (
                  <span>{shareMessage}</span>
                )}
              </div>
            ) : null}
          </section>
        </div>
      ) : null}

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
