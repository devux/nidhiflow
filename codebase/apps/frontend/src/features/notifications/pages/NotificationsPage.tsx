import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../../app/providers/AuthProvider";
import { useGuestPreferences } from "../../../app/providers/GuestPreferencesProvider";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationResource,
} from "../../../data/api/financeClient";
import { Button } from "../../../shared/components/Button";
import { Card } from "../../../shared/components/Card";
import { EmptyState } from "../../../shared/components/EmptyState";
import { ErrorState } from "../../../shared/components/ErrorState";
import { Icon, type IconName } from "../../../shared/components/Icon";
import { PageHeader } from "../../../shared/components/PageHeader";

const allowedNotificationPaths = new Set(["/activity", "/budget", "/goals", "/liabilities"]);

function notificationIcon(notification: NotificationResource): IconName {
  switch (notification.payload.resourceType) {
    case "budget":
      return "plan";
    case "goal":
      return "goal";
    case "liability":
      return "liability";
    default:
      return "activity";
  }
}

export function NotificationsPage() {
  const navigate = useNavigate();
  const { accessToken } = useAuth();
  const { preferences } = useGuestPreferences();
  const [notifications, setNotifications] = useState<NotificationResource[]>([]);
  const [status, setStatus] = useState<"error" | "loading" | "ready">("loading");
  const unreadCount = notifications.filter((notification) => !notification.readAt).length;

  const load = useCallback(async () => {
    if (!accessToken) return;
    setStatus("loading");
    try {
      setNotifications(await listNotifications({ accessToken }));
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, [accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  async function openNotification(notification: NotificationResource) {
    if (!accessToken) return;
    if (!notification.readAt) {
      try {
        const updated = await markNotificationRead({
          accessToken,
          notificationId: notification.id,
        });
        setNotifications((current) =>
          current.map((item) => (item.id === updated.id ? updated : item)),
        );
      } catch {
        setStatus("error");
        return;
      }
    }

    const path = notification.payload.path;
    void navigate(path && allowedNotificationPaths.has(path) ? path : "/");
  }

  async function markAllRead() {
    if (!accessToken || unreadCount === 0) return;
    try {
      await markAllNotificationsRead({ accessToken });
      const readAt = new Date().toISOString();
      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          readAt: notification.readAt ?? readAt,
        })),
      );
    } catch {
      setStatus("error");
    }
  }

  return (
    <main className="page page--notifications" id="main-content">
      <PageHeader title="Notifications" />

      <div className="notifications-heading">
        <span>
          <h1>Workspace activity</h1>
          <p>Updates from people sharing your current workspace.</p>
        </span>
        <Button disabled={unreadCount === 0} onClick={() => void markAllRead()} variant="quiet">
          Mark all read
        </Button>
      </div>

      {status === "loading" ? (
        <Card className="notifications-state" role="status">
          Loading notifications…
        </Card>
      ) : null}

      {status === "error" ? (
        <ErrorState
          actionLabel="Try again"
          description="Workspace activity could not be loaded."
          onAction={() => void load()}
          title="Notifications unavailable"
        />
      ) : null}

      {status === "ready" && notifications.length === 0 ? (
        <EmptyState
          description="Changes made by other workspace members will appear here."
          icon="bell"
          title="No notifications yet"
        />
      ) : null}

      {status === "ready" && notifications.length > 0 ? (
        <section aria-label="Notification history" className="notifications-list">
          {notifications.map((notification) => (
            <button
              className={`notification-card${notification.readAt ? "" : " notification-card--unread"}`}
              key={notification.id}
              onClick={() => void openNotification(notification)}
              type="button"
            >
              <span className="notification-card__icon" aria-hidden="true">
                <Icon name={notificationIcon(notification)} size={21} />
              </span>
              <span className="notification-card__copy">
                <strong>{notification.title}</strong>
                <span>{notification.body}</span>
                <time dateTime={notification.createdAt}>
                  {new Intl.DateTimeFormat(preferences.locale, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(notification.createdAt))}
                </time>
              </span>
              {!notification.readAt ? (
                <span className="notification-card__unread">
                  <span className="sr-only">Unread</span>
                </span>
              ) : null}
              <Icon name="chevron" size={18} />
            </button>
          ))}
        </section>
      ) : null}
    </main>
  );
}
