package com.nidhiflow.app;

import android.content.ComponentName;
import android.content.Context;
import android.content.SharedPreferences;
import android.provider.Settings;
import android.text.TextUtils;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

final class NotificationTransactionStore {
  private static final String PREFERENCES = "nidhiflow_notification_transactions";
  private static final String QUEUE = "pending";
  private static final String CAPTURE_ENABLED = "capture_enabled";
  private static final String ACCOUNT_ID = "account_id";
  private static final String USER_ID = "user_id";
  private static final String WORKSPACE_ID = "workspace_id";
  private static final int MAX_PENDING = 100;

  private NotificationTransactionStore() {}

  static synchronized void enqueue(Context context, JSONObject transaction) {
    JSONArray current = pending(context);
    JSONArray next = new JSONArray();
    String cutoff = formatUtcTimestamp(System.currentTimeMillis() - 7L * 24 * 60 * 60 * 1_000);
    String localId = transaction.optString("localId");
    for (int index = 0; index < current.length(); index++) {
      JSONObject item = current.optJSONObject(index);
      if (item == null || item.optString("detectedAt").compareTo(cutoff) < 0) continue;
      if (item.optString("localId").equals(localId)) return;
      next.put(item);
    }
    next.put(transaction);
    JSONArray bounded = new JSONArray();
    int start = Math.max(0, next.length() - MAX_PENDING);
    for (int index = start; index < next.length(); index++) bounded.put(next.opt(index));
    preferences(context).edit().putString(QUEUE, bounded.toString()).commit();
  }

  static synchronized JSONArray pending(Context context) {
    try {
      return new JSONArray(preferences(context).getString(QUEUE, "[]"));
    } catch (JSONException error) {
      return new JSONArray();
    }
  }

  static synchronized void acknowledge(Context context, JSONArray localIds) {
    JSONArray current = pending(context);
    JSONArray next = new JSONArray();
    for (int index = 0; index < current.length(); index++) {
      JSONObject item = current.optJSONObject(index);
      if (item == null || contains(localIds, item.optString("localId"))) continue;
      next.put(item);
    }
    preferences(context).edit().putString(QUEUE, next.toString()).commit();
  }

  static boolean captureEnabled(Context context) {
    return preferences(context).getBoolean(CAPTURE_ENABLED, false);
  }

  static String accountId(Context context) {
    return preferences(context).getString(ACCOUNT_ID, "");
  }

  static String userId(Context context) {
    return preferences(context).getString(USER_ID, "");
  }

  static String workspaceId(Context context) {
    return preferences(context).getString(WORKSPACE_ID, "");
  }

  static synchronized void configure(
    Context context,
    boolean enabled,
    String accountId,
    String userId,
    String workspaceId
  ) {
    SharedPreferences preferences = preferences(context);
    boolean scopeChanged =
      !preferences.getString(USER_ID, "").equals(userId == null ? "" : userId) ||
      !preferences.getString(WORKSPACE_ID, "").equals(workspaceId == null ? "" : workspaceId);
    SharedPreferences.Editor editor = preferences.edit().putBoolean(CAPTURE_ENABLED, enabled);
    if (accountId == null || accountId.trim().isEmpty()) editor.remove(ACCOUNT_ID);
    else editor.putString(ACCOUNT_ID, accountId);
    if (userId == null || userId.trim().isEmpty()) editor.remove(USER_ID);
    else editor.putString(USER_ID, userId);
    if (workspaceId == null || workspaceId.trim().isEmpty()) editor.remove(WORKSPACE_ID);
    else editor.putString(WORKSPACE_ID, workspaceId);
    if (scopeChanged) editor.remove(QUEUE);
    editor.commit();
  }

  static synchronized void disableAndClear(Context context) {
    preferences(context)
      .edit()
      .putBoolean(CAPTURE_ENABLED, false)
      .remove(ACCOUNT_ID)
      .remove(USER_ID)
      .remove(WORKSPACE_ID)
      .remove(QUEUE)
      .commit();
  }

  static boolean notificationAccessGranted(Context context) {
    String enabled = Settings.Secure.getString(
      context.getContentResolver(),
      "enabled_notification_listeners"
    );
    if (enabled == null || enabled.trim().isEmpty()) return false;
    ComponentName expected = new ComponentName(
      context,
      TransactionNotificationListenerService.class
    );
    TextUtils.SimpleStringSplitter splitter = new TextUtils.SimpleStringSplitter(':');
    splitter.setString(enabled);
    for (String value : splitter) {
      ComponentName component = ComponentName.unflattenFromString(value);
      if (expected.equals(component)) return true;
    }
    return false;
  }

  private static SharedPreferences preferences(Context context) {
    return context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE);
  }

  private static boolean contains(JSONArray values, String target) {
    for (int index = 0; index < values.length(); index++) {
      if (target.equals(values.optString(index))) return true;
    }
    return false;
  }

  private static String formatUtcTimestamp(long timestamp) {
    SimpleDateFormat formatter = new SimpleDateFormat(
      "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
      Locale.ROOT
    );
    formatter.setTimeZone(TimeZone.getTimeZone("UTC"));
    return formatter.format(new Date(timestamp));
  }
}
