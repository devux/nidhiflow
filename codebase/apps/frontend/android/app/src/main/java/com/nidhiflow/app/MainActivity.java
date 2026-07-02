package com.nidhiflow.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    registerPlugin(UpiPaymentsPlugin.class);
    registerPlugin(NotificationTransactionsPlugin.class);
    super.onCreate(savedInstanceState);
  }
}
