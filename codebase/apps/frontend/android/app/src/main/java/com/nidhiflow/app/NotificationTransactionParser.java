package com.nidhiflow.app;

import java.math.BigDecimal;
import java.security.MessageDigest;
import java.text.SimpleDateFormat;
import java.util.Collections;
import java.util.Date;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TimeZone;
import java.util.TreeSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.json.JSONException;
import org.json.JSONObject;

final class NotificationTransactionParser {
  private static final Map<String, String> SOURCE_NAMES;
  private static final Map<String, Integer> PARSER_VERSIONS;
  private static final Set<String> SUPPORTED_PACKAGES;
  private static final Pattern AMOUNT = Pattern.compile(
    "(?:₹|\\brs\\.?|\\binr)\\s*((?:[0-9]{1,3}(?:,[0-9]{2})*,[0-9]{3}|[0-9]{1,3}(?:,[0-9]{3})+|[0-9]+)(?:\\.[0-9]{1,2})?)(?![0-9,.])",
    Pattern.CASE_INSENSITIVE
  );
  private static final Pattern MERCHANT = Pattern.compile(
    "\\b(?:to|at|from)\\s+([\\p{L}\\p{N}][\\p{L}\\p{N} .&_'\\-]{1,48}?)(?=\\s+(?:on|using|via|ref|upi|a/c|account|₹|rs\\.?|inr)\\b|[.,]|$)",
    Pattern.CASE_INSENSITIVE
  );
  private static final Pattern BLOCKED = Pattern.compile(
    "\\b(otp|one[ -]?time password|verification code|login|sign[ -]?in|password|offer|sale|coupon|promo|reward points?)\\b",
    Pattern.CASE_INSENSITIVE
  );
  private static final Pattern INCOME = Pattern.compile(
    "\\b(credited|received|deposited|salary credit|refund received)\\b",
    Pattern.CASE_INSENSITIVE
  );
  private static final Pattern EXPENSE = Pattern.compile(
    "\\b(debited|paid|sent|spent|purchase|withdrawn|transaction of)\\b",
    Pattern.CASE_INSENSITIVE
  );

  static {
    Map<String, String> sourceNames = new HashMap<>();
    sourceNames.put("com.google.android.apps.nbu.paisa.user", "Google Pay");
    sourceNames.put("com.phonepe.app", "PhonePe");
    sourceNames.put("net.one97.paytm", "Paytm");
    sourceNames.put("in.org.npci.upiapp", "BHIM");
    sourceNames.put("com.idfcfirstbank.optimus", "IDFC FIRST Bank");
    SOURCE_NAMES = Collections.unmodifiableMap(sourceNames);

    Map<String, Integer> parserVersions = new HashMap<>();
    for (String packageName : sourceNames.keySet()) parserVersions.put(packageName, 1);
    PARSER_VERSIONS = Collections.unmodifiableMap(parserVersions);
    SUPPORTED_PACKAGES = Collections.unmodifiableSet(parserVersions.keySet());
  }

  private NotificationTransactionParser() {}

  static JSONObject parse(
    String packageName,
    String notificationKey,
    String title,
    String text,
    long postedAt
  ) {
    if (!SUPPORTED_PACKAGES.contains(packageName)) return null;
    String combined = ((title == null ? "" : title) + " " + (text == null ? "" : text)).trim();
    if (combined.isEmpty() || BLOCKED.matcher(combined).find()) return null;

    Matcher amountMatcher = AMOUNT.matcher(combined);
    Set<String> amounts = new TreeSet<>();
    while (amountMatcher.find()) {
      try {
        String candidate = new BigDecimal(amountMatcher.group(1).replace(",", ""))
          .setScale(2)
          .toPlainString();
        if (new BigDecimal(candidate).signum() > 0) amounts.add(candidate);
      } catch (ArithmeticException | NumberFormatException error) {
        return null;
      }
    }
    if (amounts.size() != 1) return null;
    String amount;
    try {
      amount = amounts.iterator().next();
    } catch (RuntimeException error) {
      return null;
    }

    boolean isIncome = INCOME.matcher(combined).find();
    boolean isExpense = EXPENSE.matcher(combined).find();
    if (isIncome == isExpense) return null;
    String type;
    if (isIncome) type = "income";
    else type = "expense";

    String normalized = combined.toLowerCase(Locale.ROOT);
    int parserVersion = PARSER_VERSIONS.get(packageName);
    String categoryHint = categorize(normalized, type);
    String merchantHint = merchantHint(combined, packageName);
    Date detectedAt = new Date(postedAt);
    String detectedAtValue = formatDetectedAt(detectedAt);
    String transactionDate = new SimpleDateFormat("yyyy-MM-dd", Locale.ROOT).format(detectedAt);
    String fingerprint = sha256(
      packageName + "|" + parserVersion + "|" + notificationKey + "|" + postedAt + "|" + amount + "|" + type
    );

    try {
      JSONObject result = new JSONObject();
      result.put("localId", fingerprint.substring(0, 24));
      result.put("amount", amount);
      result.put("currency", "INR");
      result.put("type", type);
      result.put("categoryHint", categoryHint);
      result.put("merchantHint", merchantHint);
      result.put("parserVersion", parserVersion);
      result.put("detectedAt", detectedAtValue);
      result.put("transactionDate", transactionDate);
      result.put("sourcePackage", packageName);
      result.put("sourceFingerprint", fingerprint);
      return result;
    } catch (JSONException error) {
      return null;
    }
  }

  private static String merchantHint(String text, String packageName) {
    Matcher matcher = MERCHANT.matcher(text);
    if (matcher.find()) {
      String value = matcher.group(1).trim().replaceAll("\\s+", " ");
      if (value.length() >= 2) return value.substring(0, Math.min(100, value.length()));
    }
    return SOURCE_NAMES.getOrDefault(packageName, "Mobile notification");
  }

  private static String categorize(String text, String type) {
    if ("income".equals(type)) {
      if (contains(text, "salary", "payroll")) return "salary";
      if (contains(text, "freelance", "client payment")) return "freelance";
      if (contains(text, "interest")) return "interest";
      if (contains(text, "business", "settlement")) return "business";
      return "uncategorized";
    }
    if (contains(text, "swiggy", "zomato", "restaurant", "cafe", "food")) return "food";
    if (contains(text, "amazon", "flipkart", "shopping", "store", "mart")) return "shopping";
    if (contains(text, "uber", "ola", "metro", "fuel", "petrol", "diesel", "transport")) return "transport";
    if (contains(text, "electricity", "recharge", "utility", "bill", "broadband", "mobile")) return "bills";
    if (contains(text, "netflix", "spotify", "cinema", "movie", "entertainment")) return "entertainment";
    if (contains(text, "hospital", "pharmacy", "medical", "health", "clinic")) return "health";
    if (contains(text, "school", "college", "course", "education", "tuition")) return "education";
    if (contains(text, "flight", "hotel", "travel", "booking")) return "travel";
    if (contains(text, "rent", "maintenance", "home")) return "home";
    return "uncategorized";
  }

  private static boolean contains(String text, String... terms) {
    for (String term : terms) if (text.contains(term)) return true;
    return false;
  }

  private static String formatDetectedAt(Date detectedAt) {
    SimpleDateFormat formatter = new SimpleDateFormat(
      "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
      Locale.ROOT
    );
    formatter.setTimeZone(TimeZone.getTimeZone("UTC"));
    return formatter.format(detectedAt);
  }

  private static String sha256(String value) {
    try {
      byte[] digest = MessageDigest.getInstance("SHA-256").digest(value.getBytes(java.nio.charset.StandardCharsets.UTF_8));
      StringBuilder hex = new StringBuilder();
      for (byte item : digest) hex.append(String.format("%02x", item));
      return hex.toString();
    } catch (Exception error) {
      throw new IllegalStateException("SHA-256 is unavailable.", error);
    }
  }
}
