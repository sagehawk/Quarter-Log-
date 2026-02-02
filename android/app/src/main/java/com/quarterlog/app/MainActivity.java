package com.quarterlog.app;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.JSObject;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(TimerPlugin.class);
        super.onCreate(savedInstanceState);
        handleIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        handleIntent(intent);
    }

    private void handleIntent(Intent intent) {
        if (intent == null || intent.getAction() == null) return;
        
        String action = intent.getAction();
        if ("ACTION_WIN".equals(action) || "ACTION_LOSS".equals(action)) {
            String input = "";
            
            // Check direct extra from AlertActivity
            if (intent.hasExtra("NATIVE_INPUT_TEXT")) {
                input = intent.getStringExtra("NATIVE_INPUT_TEXT");
            } else {
                // Check notification inline reply
                Bundle remoteInput = androidx.core.app.RemoteInput.getResultsFromIntent(intent);
                if (remoteInput != null) {
                    CharSequence val = remoteInput.getCharSequence("KEY_TEXT_REPLY");
                    if (val != null) input = val.toString();
                }
            }
            
            // Save to Persistent Storage for Cold Starts
            getSharedPreferences("NativeLog", MODE_PRIVATE).edit()
                .putString("pending_input", input)
                .putString("pending_type", "ACTION_WIN".equals(action) ? "WIN" : "LOSS")
                .apply();
            
            // Trigger event for Hot Resume
            if (getBridge() != null) {
                 String json = "{\"type\":\"" + ("ACTION_WIN".equals(action) ? "WIN" : "LOSS") + "\", \"input\":\"" + input.replace("\"", "\\\"") + "\"}";
                 getBridge().triggerWindowJSEvent("nativeLogInput", json);
            }
        }
    }
}