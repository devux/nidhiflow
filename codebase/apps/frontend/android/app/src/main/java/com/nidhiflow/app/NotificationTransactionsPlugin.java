package com.nidhiflow.app;

import android.content.Intent;
import android.provider.Settings;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONArray;

@CapacitorPlugin(name = "NotificationTransactions")
public class NotificationTransactionsPlugin extends Plugin {
  @PluginMethod
  public void getStatus(PluginCall call) {
    if (!BuildConfig.ANDROID_NOTIFICATION_TRANSACTIONS_ENABLED) {
      NotificationTransactionStore.disableAndClear(getContext());
    }
    JSObject result = new JSObject();
    result.put(
      "permissionGranted",
      NotificationTransactionStore.notificationAccessGranted(getContext())
    );
    result.put("captureEnabled", NotificationTransactionStore.captureEnabled(getContext()));
    result.put("accountId", NotificationTransactionStore.accountId(getContext()));
    result.put("userId", NotificationTransactionStore.userId(getContext()));
    result.put("workspaceId", NotificationTransactionStore.workspaceId(getContext()));
    result.put("pendingCount", NotificationTransactionStore.pending(getContext()).length());
    call.resolve(result);
  }

  @PluginMethod
  public void openNotificationAccessSettings(PluginCall call) {
    Intent intent = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
    getContext().startActivity(intent);
    call.resolve();
  }

  @PluginMethod
  public void configure(PluginCall call) {
    boolean captureEnabled = Boolean.TRUE.equals(call.getBoolean("captureEnabled", false));
    String accountId = call.getString("accountId", "");
    String userId = call.getString("userId", "");
    String workspaceId = call.getString("workspaceId", "");
    if (captureEnabled && !BuildConfig.ANDROID_NOTIFICATION_TRANSACTIONS_ENABLED) {
      NotificationTransactionStore.disableAndClear(getContext());
      call.reject("Notification transactions are disabled in this build.", "FEATURE_DISABLED");
      return;
    }
    if (captureEnabled && (accountId == null || accountId.trim().isEmpty())) {
      call.reject("Select an account before enabling notification transactions.", "ACCOUNT_REQUIRED");
      return;
    }
    if (
      captureEnabled &&
      (
        userId == null ||
        userId.trim().isEmpty() ||
        workspaceId == null ||
        workspaceId.trim().isEmpty()
      )
    ) {
      call.reject("An authenticated workspace is required.", "AUTHENTICATED_WORKSPACE_REQUIRED");
      return;
    }
    NotificationTransactionStore.configure(
      getContext(),
      captureEnabled,
      accountId,
      userId,
      workspaceId
    );
    call.resolve();
  }

  @PluginMethod
  public void disableAndClear(PluginCall call) {
    NotificationTransactionStore.disableAndClear(getContext());
    call.resolve();
  }

  @PluginMethod
  public void getPendingTransactions(PluginCall call) {
    JSObject result = new JSObject();
    result.put("transactions", NotificationTransactionStore.pending(getContext()));
    call.resolve(result);
  }

  @PluginMethod
  public void acknowledgeTransactions(PluginCall call) {
    JSONArray localIds = call.getArray("localIds");
    if (localIds == null) {
      call.reject("localIds is required.", "LOCAL_IDS_REQUIRED");
      return;
    }
    NotificationTransactionStore.acknowledge(getContext(), localIds);
    call.resolve();
  }
}
