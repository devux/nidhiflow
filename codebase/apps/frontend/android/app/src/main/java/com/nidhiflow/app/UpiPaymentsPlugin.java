package com.nidhiflow.app;

import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.net.Uri;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.tasks.Task;
import com.google.mlkit.vision.barcode.common.Barcode;
import com.google.mlkit.vision.codescanner.GmsBarcodeScanner;
import com.google.mlkit.vision.codescanner.GmsBarcodeScannerOptions;
import com.google.mlkit.vision.codescanner.GmsBarcodeScanning;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@CapacitorPlugin(name = "UpiPayments")
public class UpiPaymentsPlugin extends Plugin {
  private static final Map<String, String> KNOWN_APPS = new LinkedHashMap<>();
  private static final Uri DISCOVERY_URI = Uri.parse(
    "upi://pay?pa=nidhiflow%40upi&pn=NidhiFlow&am=1.00&cu=INR&tr=NIDHIFLOWDISCOVERY"
  );

  static {
    KNOWN_APPS.put("com.google.android.apps.nbu.paisa.user", "Google Pay");
    KNOWN_APPS.put("com.phonepe.app", "PhonePe");
    KNOWN_APPS.put("net.one97.paytm", "Paytm");
    KNOWN_APPS.put("in.org.npci.upiapp", "BHIM");
  }

  @PluginMethod
  public void getInstalledApps(PluginCall call) {
    PackageManager manager = getContext().getPackageManager();
    Map<String, JSObject> discoveredApps = new LinkedHashMap<>();

    for (Map.Entry<String, String> knownApp : KNOWN_APPS.entrySet()) {
      Intent targetedIntent = createPaymentIntent(DISCOVERY_URI, knownApp.getKey());

      if (targetedIntent.resolveActivity(manager) != null) {
        discoveredApps.put(
          knownApp.getKey(),
          createAppResult(knownApp.getKey(), knownApp.getValue(), true)
        );
      }
    }

    Intent intent = createPaymentIntent(DISCOVERY_URI, null);
    List<ResolveInfo> handlers = manager.queryIntentActivities(
      intent,
      PackageManager.MATCH_DEFAULT_ONLY
    );
    JSArray apps = new JSArray();

    for (ResolveInfo handler : handlers) {
      String packageName = handler.activityInfo.packageName;
      discoveredApps.putIfAbsent(
        packageName,
        createAppResult(
          packageName,
          KNOWN_APPS.getOrDefault(packageName, handler.loadLabel(manager).toString()),
          KNOWN_APPS.containsKey(packageName)
        )
      );
    }

    for (JSObject app : discoveredApps.values()) {
      apps.put(app);
    }

    JSObject result = new JSObject();
    result.put("apps", apps);
    call.resolve(result);
  }

  @PluginMethod
  public void scanUpiQr(PluginCall call) {
    GmsBarcodeScannerOptions options = new GmsBarcodeScannerOptions.Builder()
      .setBarcodeFormats(Barcode.FORMAT_QR_CODE)
      .enableAutoZoom()
      .build();
    GmsBarcodeScanner scanner = GmsBarcodeScanning.getClient(getActivity(), options);
    Task<Barcode> scan = scanner.startScan();
    scan.addOnSuccessListener(barcode -> {
      String value = barcode.getRawValue();
      if (value == null || !value.toLowerCase(Locale.ROOT).startsWith("upi://pay")) {
        call.reject("The scanned QR code is not a UPI payment code.", "INVALID_UPI_QR");
        return;
      }
      JSObject result = new JSObject();
      result.put("value", value);
      call.resolve(result);
    });
    scan.addOnCanceledListener(() -> call.reject("QR scan cancelled.", "SCAN_CANCELLED"));
    scan.addOnFailureListener(error -> call.reject("QR code could not be scanned.", "SCAN_FAILED", error));
  }

  @PluginMethod
  public void launchPayment(PluginCall call) {
    String upiUri = call.getString("upiUri");
    String packageName = call.getString("packageName");
    if (upiUri == null || !upiUri.toLowerCase(Locale.ROOT).startsWith("upi://pay")) {
      call.reject("A valid UPI payment URI is required.", "INVALID_UPI_URI");
      return;
    }

    Intent intent = createPaymentIntent(
      Uri.parse(upiUri),
      packageName != null && !packageName.isBlank() ? packageName : null
    );
    if (intent.resolveActivity(getContext().getPackageManager()) == null) {
      call.reject("The selected UPI app is not available.", "UPI_APP_UNAVAILABLE");
      return;
    }
    startActivityForResult(call, intent, "handlePaymentResult");
  }

  @ActivityCallback
  private void handlePaymentResult(PluginCall call, ActivityResult activityResult) {
    if (call == null) return;
    Intent data = activityResult.getData();
    String raw = "";
    if (data != null) {
      if (data.getStringExtra("response") != null) raw = data.getStringExtra("response");
      else if (data.getDataString() != null) raw = data.getDataString();
    }
    Map<String, String> values = parseResponse(raw);
    String reported = values.getOrDefault("status", "").toUpperCase(Locale.ROOT);
    String status;
    if (activityResult.getResultCode() == Activity.RESULT_CANCELED && raw.isBlank()) status = "CANCELLED";
    else if ("SUCCESS".equals(reported)) status = "SUCCESS";
    else if ("FAILURE".equals(reported) || "FAILED".equals(reported)) status = "FAILURE";
    else status = "UNKNOWN";

    JSObject result = new JSObject();
    result.put("appReportedStatus", status);
    result.put("rawResponse", raw);
    result.put("approvalRefNo", first(values, "approvalrefno", "approvalrefnum", "txnref"));
    result.put("responseCode", first(values, "responsecode", "response_code"));
    call.resolve(result);
  }

  private Map<String, String> parseResponse(String raw) {
    Map<String, String> values = new HashMap<>();
    for (String pair : raw.replace("?", "&").split("&")) {
      String[] parts = pair.split("=", 2);
      if (parts.length == 2) {
        values.put(parts[0].trim().toLowerCase(Locale.ROOT), Uri.decode(parts[1].trim()));
      }
    }
    return values;
  }

  private Intent createPaymentIntent(Uri upiUri, String packageName) {
    Intent intent = new Intent(Intent.ACTION_VIEW, upiUri);
    if (packageName != null) intent.setPackage(packageName);
    return intent;
  }

  private JSObject createAppResult(String packageName, String name, boolean known) {
    JSObject app = new JSObject();
    app.put("packageName", packageName);
    app.put("name", name);
    app.put("known", known);
    return app;
  }

  private String first(Map<String, String> values, String... keys) {
    for (String key : keys) if (values.containsKey(key)) return values.get(key);
    return null;
  }
}
