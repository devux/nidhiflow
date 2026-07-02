package com.nidhiflow.app;

import android.app.Notification;
import android.content.ComponentName;
import android.os.Bundle;
import android.provider.Telephony;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import org.json.JSONObject;

public class TransactionNotificationListenerService extends NotificationListenerService {
  @Override
  public void onNotificationPosted(StatusBarNotification notification) {
    if (!BuildConfig.ANDROID_NOTIFICATION_TRANSACTIONS_ENABLED) {
      NotificationTransactionStore.disableAndClear(this);
      return;
    }
    if (!NotificationTransactionStore.captureEnabled(this)) return;
    Bundle extras = notification.getNotification().extras;
    CharSequence title = extras.getCharSequence(Notification.EXTRA_TITLE);
    CharSequence text = extras.getCharSequence(Notification.EXTRA_BIG_TEXT);
    if (text == null) text = extras.getCharSequence(Notification.EXTRA_TEXT);
    String packageName = notification.getPackageName();
    String defaultSmsPackage = Telephony.Sms.getDefaultSmsPackage(this);
    JSONObject parsed =
      packageName.equals(defaultSmsPackage)
        ? NotificationTransactionParser.parseDefaultSms(
          packageName,
          notification.getKey(),
          title == null ? "" : title.toString(),
          text == null ? "" : text.toString(),
          notification.getPostTime()
        )
        : NotificationTransactionParser.parse(
          packageName,
          notification.getKey(),
          title == null ? "" : title.toString(),
          text == null ? "" : text.toString(),
          notification.getPostTime()
        );
    if (parsed != null) NotificationTransactionStore.enqueue(this, parsed);
  }

  @Override
  public void onListenerDisconnected() {
    if (NotificationTransactionStore.notificationAccessGranted(this)) {
      requestRebind(new ComponentName(this, TransactionNotificationListenerService.class));
    } else {
      NotificationTransactionStore.disableAndClear(this);
    }
    super.onListenerDisconnected();
  }
}
