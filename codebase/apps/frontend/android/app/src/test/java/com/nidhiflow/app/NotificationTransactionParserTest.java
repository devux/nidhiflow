package com.nidhiflow.app;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;

import org.json.JSONObject;
import org.junit.Test;

public class NotificationTransactionParserTest {
  @Test
  public void parsesAndCategorizesSupportedExpense() {
    JSONObject parsed = NotificationTransactionParser.parse(
      "com.google.android.apps.nbu.paisa.user",
      "notification-key",
      "Payment successful",
      "₹245.50 paid to Corner Cafe on UPI",
      1_782_816_600_000L
    );

    assertEquals("245.50", parsed.optString("amount"));
    assertEquals("expense", parsed.optString("type"));
    assertEquals("food", parsed.optString("categoryHint"));
    assertEquals("Corner Cafe", parsed.optString("merchantHint"));
    assertEquals(1, parsed.optInt("parserVersion"));
    assertEquals(64, parsed.optString("sourceFingerprint").length());
  }

  @Test
  public void rejectsSecurityAndUnsupportedNotifications() {
    assertNull(NotificationTransactionParser.parse(
      "com.google.android.apps.nbu.paisa.user",
      "otp-key",
      "OTP",
      "Your OTP is 123456 for ₹10.00",
      1_782_816_600_000L
    ));
    assertNull(NotificationTransactionParser.parse(
      "com.example.social",
      "other-key",
      "Payment",
      "₹10.00 paid to Shop",
      1_782_816_600_000L
    ));
  }

  @Test
  public void parsesIncomeWithSafeFallbackCategory() {
    JSONObject parsed = NotificationTransactionParser.parse(
      "com.idfcfirstbank.optimus",
      "income-key",
      "Account update",
      "INR 1000 credited to your account",
      1_782_816_600_000L
    );

    assertEquals("income", parsed.optString("type"));
    assertEquals("uncategorized", parsed.optString("categoryHint"));
  }

  @Test
  public void rejectsAmbiguousAmountsAndDirections() {
    assertNull(NotificationTransactionParser.parse(
      "com.phonepe.app",
      "ambiguous-amount",
      "Payment update",
      "₹500 paid to Shop with ₹20 cashback",
      1_782_816_600_000L
    ));
    assertNull(NotificationTransactionParser.parse(
      "net.one97.paytm",
      "ambiguous-direction",
      "Transaction update",
      "INR 500 received and sent",
      1_782_816_600_000L
    ));
    assertNull(NotificationTransactionParser.parse(
      "com.phonepe.app",
      "malformed-amount",
      "Payment update",
      "INR 12.345 paid to Shop",
      1_782_816_600_000L
    ));
  }

  @Test
  public void fingerprintDoesNotDependOnRawNotificationText() {
    JSONObject first = NotificationTransactionParser.parse(
      "in.org.npci.upiapp",
      "stable-key",
      "Paid",
      "₹25 paid to A Cafe",
      1_782_816_600_000L
    );
    JSONObject second = NotificationTransactionParser.parse(
      "in.org.npci.upiapp",
      "stable-key",
      "Payment successful",
      "INR 25.00 spent at A Cafe",
      1_782_816_600_000L
    );

    assertEquals(
      first.optString("sourceFingerprint"),
      second.optString("sourceFingerprint")
    );
  }
}
