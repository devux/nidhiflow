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
import CurrencyExchangeRoundedIcon from "@mui/icons-material/CurrencyExchangeRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import ManageAccountsRoundedIcon from "@mui/icons-material/ManageAccountsRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import ShareRoundedIcon from "@mui/icons-material/ShareRounded";
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
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import {
  type CSSProperties,
  type FormEvent,
  type PointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useAuth } from "../../../app/providers/AuthProvider";
import { useGuestPreferences } from "../../../app/providers/GuestPreferencesProvider";
import { useGuestTransactions } from "../../../app/providers/GuestTransactionsProvider";
import { listNotifications } from "../../../data/api/financeClient";
import {
  createWorkspaceShareCode,
  joinWorkspaceByShareCode,
  leaveCurrentWorkspace,
  type WorkspaceShareCode,
} from "../../../data/api/workspaceClient";
import { ApiRequestError } from "../../../data/api/authClient";
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
        secondary={
          <>
            {formatTransactionDate(transaction.transactionDate, locale)}
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
        {amount}
      </Typography>
    </ListItemButton>
  );
}

export function HomePage() {
  const { accessToken, activeWorkspace, isAuthenticated, refreshWorkspaces, user } = useAuth();
  const { preferences } = useGuestPreferences();
  const { transactions } = useGuestTransactions();
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [tipSlide, setTipSlide] = useState(0);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isShareSheetExpanded, setIsShareSheetExpanded] = useState(false);
  const shareSheetDragStart = useRef<number | null>(null);
  const shareSheetHandle = useRef<HTMLButtonElement | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [shareCode, setShareCode] = useState<WorkspaceShareCode | null>(null);
  const [shareStatus, setShareStatus] = useState<
    "copied" | "creating" | "error" | "idle" | "joining" | "joined"
  >("idle");
  const [shareMessage, setShareMessage] = useState("");
  const [pendingJoinCode, setPendingJoinCode] = useState<string | null>(null);
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
  const tipSlides = [
    {
      action: "See insights",
      copy: showcaseTip,
      href: "/reports",
      icon: "tip",
      title: "Savings tip",
    },
    {
      action: "Explore Flow",
      copy: "Flow helps turn your financial activity into clearer questions and next steps.",
      href: "/flow",
      icon: "flow",
      title: "Flow AI",
    },
  ] as const;
  const activeTip = tipSlides[tipSlide] ?? tipSlides[0];
  useEffect(() => {
    if (!accessToken) {
      setUnreadNotificationCount(0);
      return;
    }

    let active = true;
    void listNotifications({ accessToken })
      .then((notifications) => {
        if (active) {
          setUnreadNotificationCount(
            notifications.filter((notification) => !notification.readAt).length,
          );
        }
      })
      .catch(() => {
        if (active) setUnreadNotificationCount(0);
      });

    return () => {
      active = false;
    };
  }, [accessToken]);

  useEffect(() => {
    if (!isShareModalOpen) return;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeShareModal();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    shareSheetHandle.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isShareModalOpen]);

  function openShareModal() {
    setIsShareModalOpen(true);
    setIsShareSheetExpanded(false);
    setShareStatus("idle");
    setShareMessage("");
    setPendingJoinCode(null);

    if (isAuthenticated && accessToken && activeWorkspace?.membershipRole === "manager") {
      void handleCreateShareCode(activeWorkspace.id);
    }
  }

  function closeShareModal() {
    setIsShareModalOpen(false);
    setShareStatus("idle");
    setShareMessage("");
    setPendingJoinCode(null);
  }

  function handleShareSheetPointerDown(event: PointerEvent) {
    shareSheetDragStart.current = event.clientY;
  }

  function handleShareSheetPointerUp(event: PointerEvent) {
    if (shareSheetDragStart.current === null) return;
    const movement = event.clientY - shareSheetDragStart.current;
    if (movement < -24) setIsShareSheetExpanded(true);
    if (movement > 24) setIsShareSheetExpanded(false);
    shareSheetDragStart.current = null;
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

    await moveToWorkspace(normalizedCode, false);
  }

  async function moveToWorkspace(code: string, transferOwnership: boolean) {
    if (!accessToken) return;

    setShareStatus("joining");
    setShareMessage("");

    try {
      await joinWorkspaceByShareCode(accessToken, code, { transferOwnership });
      await refreshWorkspaces();
      setJoinCode("");
      setPendingJoinCode(null);
      setShareStatus("joined");
      setShareMessage("Joined. This is now your current workspace.");
    } catch (error) {
      if (error instanceof ApiRequestError && error.code === "OWNERSHIP_TRANSFER_REQUIRED") {
        setPendingJoinCode(code);
        setShareStatus("idle");
        return;
      }

      setShareStatus("error");
      setShareMessage("Code did not work. Ask for a new one.");
    }
  }

  async function handleLeaveWorkspace() {
    if (!accessToken || !activeWorkspace) return;

    setShareStatus("joining");
    setShareMessage("");

    try {
      await leaveCurrentWorkspace(accessToken, activeWorkspace.id);
      await refreshWorkspaces();
      setShareStatus("joined");
      setShareMessage("You left the workspace. A new workspace is ready for you.");
    } catch {
      setShareStatus("error");
      setShareMessage("The workspace could not be left. Please try again.");
    }
  }

  async function handleCopyShareCode() {
    if (!shareCode) return;

    if (await copyText(shareCode.code)) {
      setShareStatus("copied");
      setShareMessage("Code copied.");
    } else {
      setShareStatus("error");
      setShareMessage("Copy failed. Select the code instead.");
    }
  }

  async function copyText(text: string) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // Continue to the legacy fallback for restricted browser contexts.
    }

    const input = document.createElement("textarea");
    input.value = text;
    input.setAttribute("readonly", "");
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.append(input);
    input.select();
    const copied = typeof document.execCommand === "function" && document.execCommand("copy");
    input.remove();
    return copied;
  }

  async function handleShareWorkspace() {
    if (!shareCode || !activeWorkspace) return;
    const text = `Join ${activeWorkspace.name} in NidhiFlow with code ${shareCode.code}`;

    try {
      if (navigator.share) {
        await navigator.share({
          text,
          title: `Join ${activeWorkspace.name}`,
          url: window.location.origin,
        });
        setShareMessage("Invite shared.");
        return;
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
    }

    const copied = await copyText(text);
    setShareStatus(copied ? "copied" : "error");
    setShareMessage(
      copied
        ? "Sharing is unavailable here, so the invite was copied."
        : "Sharing is unavailable. Copy the code manually.",
    );
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
            aria-label="Notifications"
            className="home-header-menu__button home-notification-button"
            component={Link}
            size="small"
            to="/notifications"
          >
            <Icon name="bell" size={19} />
            {unreadNotificationCount > 0 ? (
              <span
                aria-label={`${unreadNotificationCount} unread notifications`}
                className="home-notification-button__count"
              >
                {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
              </span>
            ) : null}
          </IconButton>
        </Box>
      </Stack>

      {isShareModalOpen ? (
        <div
          aria-labelledby="family-collaboration-title"
          aria-modal="true"
          className="modal-backdrop"
          role="dialog"
        >
          <section
            className={`modal-card family-share-modal ${
              isShareSheetExpanded ? "family-share-modal--expanded" : "family-share-modal--peek"
            }`}
          >
            <button
              aria-label={isShareSheetExpanded ? "Collapse shared space" : "Expand shared space"}
              className="family-share-modal__drag-handle"
              onClick={() => setIsShareSheetExpanded((expanded) => !expanded)}
              onPointerDown={handleShareSheetPointerDown}
              onPointerUp={handleShareSheetPointerUp}
              ref={shareSheetHandle}
              type="button"
            >
              <span />
            </button>
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
              <div className="family-share-modal__panel-content">
                {activeWorkspace ? (
                  <section
                    aria-label="Current workspace details"
                    className="family-share-modal__workspace"
                  >
                    <span className="family-share-modal__workspace-label">Current workspace</span>
                    <div className="family-share-modal__workspace-identity">
                      <span aria-hidden="true">
                        {activeWorkspace.name.slice(0, 1).toUpperCase()}
                      </span>
                      <span>
                        <strong>{activeWorkspace.name}</strong>
                        <small>
                          Managed by {activeWorkspace.ownerDisplayName ?? activeWorkspace.name}
                        </small>
                      </span>
                    </div>
                    <div className="family-share-modal__workspace-meta">
                      <span
                        aria-label={`Role: ${
                          activeWorkspace.membershipRole === "manager" ? "Manager" : "Member"
                        }`}
                      >
                        <ManageAccountsRoundedIcon aria-hidden="true" fontSize="small" />
                        {activeWorkspace.membershipRole === "manager" ? "Manager" : "Member"}
                      </span>
                      <span
                        aria-label={`Currency: ${activeWorkspace.reportingCurrency ?? "Not set"}`}
                      >
                        <CurrencyExchangeRoundedIcon aria-hidden="true" fontSize="small" />
                        {activeWorkspace.reportingCurrency ?? "Not set"}
                      </span>
                    </div>
                    {activeWorkspace.membershipRole === "member" ? (
                      <Button
                        className="family-share-modal__leave"
                        disabled={shareStatus === "joining"}
                        onClick={() => void handleLeaveWorkspace()}
                        variant="quiet"
                      >
                        <LogoutRoundedIcon aria-hidden="true" fontSize="small" />
                        Leave and create my workspace
                      </Button>
                    ) : null}
                  </section>
                ) : null}

                {activeWorkspace?.membershipRole === "manager" ? (
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
                    <output
                      className={shareCode ? "share-code-panel__code" : "share-code-panel__pending"}
                    >
                      {shareCode?.code ??
                        (shareStatus === "creating" ? "Getting code" : "Code loading")}
                    </output>
                    <div className="family-share-modal__actions">
                      <MuiButton
                        className="family-share-modal__compact-action"
                        disabled={shareStatus === "creating"}
                        onClick={() => void handleCreateShareCode(activeWorkspace.id)}
                        startIcon={<RefreshRoundedIcon />}
                        variant="outlined"
                      >
                        New
                      </MuiButton>
                      <MuiButton
                        className="family-share-modal__compact-action family-share-modal__compact-action--primary"
                        disabled={!shareCode}
                        onClick={() => void handleCopyShareCode()}
                        startIcon={<ContentCopyRoundedIcon />}
                        variant="contained"
                      >
                        Copy
                      </MuiButton>
                      <MuiButton
                        className="family-share-modal__compact-action"
                        disabled={!shareCode}
                        onClick={() => void handleShareWorkspace()}
                        startIcon={<ShareRoundedIcon />}
                        variant="outlined"
                      >
                        Share
                      </MuiButton>
                    </div>
                  </div>
                ) : null}

                <div className="family-share-modal__expanded-content">
                  {pendingJoinCode ? (
                    <section
                      aria-labelledby="ownership-transfer-title"
                      className="workspace-transfer-confirmation"
                      role="alertdialog"
                    >
                      <h3 id="ownership-transfer-title">Transfer workspace ownership?</h3>
                      <p>
                        Members remain in your current workspace. Transfer management to the
                        longest-standing member before joining the new workspace.
                      </p>
                      <div className="family-share-modal__actions">
                        <Button
                          onClick={() => {
                            setPendingJoinCode(null);
                            setShareStatus("idle");
                          }}
                          variant="secondary"
                        >
                          Stay in current workspace
                        </Button>
                        <Button
                          onClick={() => void moveToWorkspace(pendingJoinCode, true)}
                          variant="primary"
                        >
                          Transfer ownership and join
                        </Button>
                      </div>
                    </section>
                  ) : (
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
                          <small>Joining replaces your current workspace membership.</small>
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
                            onFocus={() => setIsShareSheetExpanded(true)}
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
                  )}

                  <section className="shared-space-section">
                    <div className="section-heading">
                      <h3>Members</h3>
                      <small>Current workspace</small>
                    </div>
                    <div className="shared-space-member">
                      <span className="profile-avatar">
                        {user?.displayName?.slice(0, 1) ?? "Y"}
                      </span>
                      <span>
                        <strong>{user?.displayName ?? "You"}</strong>
                      </span>
                      <span className="local-badge">
                        {activeWorkspace?.membershipRole ?? "member"}
                      </span>
                    </div>
                  </section>
                  <section className="shared-space-section">
                    <h3>Permissions</h3>
                    <p>
                      {activeWorkspace?.membershipRole === "manager"
                        ? "You can invite people and manage this workspace."
                        : "You can view and contribute to shared finances."}
                    </p>
                  </section>
                  <section className="shared-space-section">
                    <h3>Invite history</h3>
                    <p>
                      {shareCode
                        ? `Current code expires ${new Intl.DateTimeFormat(preferences.locale, { dateStyle: "medium" }).format(new Date(shareCode.expiresAt))}.`
                        : "No active invite code."}
                    </p>
                  </section>
                  {activeWorkspace?.membershipRole === "manager" ? (
                    <section className="shared-space-section">
                      <h3>Workspace settings</h3>
                      <p>Workspace managers control invitations and membership.</p>
                    </section>
                  ) : null}
                </div>
              </div>
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

              <Box
                aria-label="Savings and Flow tips"
                aria-roledescription="carousel"
                className="transaction-showcase-card__tip-slider"
                role="region"
              >
                <Box
                  aria-live="polite"
                  className="transaction-showcase-card__tip"
                  key={activeTip.title}
                >
                  <span className="transaction-showcase-card__tip-icon" aria-hidden="true">
                    {activeTip.icon === "flow" ? (
                      <Icon name="flow" size={16} />
                    ) : (
                      <FontAwesomeIcon icon={faLightbulb} />
                    )}
                  </span>
                  <span>
                    <strong>{activeTip.title}</strong>
                    <Typography component="span">{activeTip.copy}</Typography>
                  </span>
                  <Link className="transaction-showcase-card__insights" to={activeTip.href}>
                    {activeTip.action}
                    <FontAwesomeIcon icon={faArrowTrendUp} />
                  </Link>
                </Box>
                <div className="transaction-showcase-card__tip-dots">
                  {tipSlides.map((slide, index) => (
                    <button
                      aria-label={`Show ${slide.title}`}
                      aria-pressed={tipSlide === index}
                      key={slide.title}
                      onClick={() => setTipSlide(index)}
                      type="button"
                    />
                  ))}
                </div>
              </Box>
            </CardContent>
          </MuiCard>

          <section aria-label="Quick actions" className="home-actions-section">
            <div className="quick-actions">
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
              <Link aria-label="Open goals" className="quick-action" to="/goals">
                <span className="quick-action__icon">
                  <Icon name="goal" />
                </span>
                <strong>Goals</strong>
              </Link>
              <Link aria-label="Open loans" className="quick-action" to="/liabilities">
                <span className="quick-action__icon">
                  <Icon name="liability" />
                </span>
                <strong>Loans</strong>
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
