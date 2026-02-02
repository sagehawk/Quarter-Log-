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
            Bundle remoteInput = androidx.core.app.RemoteInput.getResultsFromIntent(intent);
            String input = "";
            if (remoteInput != null) {
                CharSequence val = remoteInput.getCharSequence("KEY_TEXT_REPLY");
                if (val != null) input = val.toString();
            }
            
            // Send to JS
            // Note: bridge might be null if called too early in onCreate, but usually fine in onNewIntent
            if (getBridge() != null) {
                 // Trigger a window event: window.addEventListener('nativeLogInput', (e) => ...)
                 // The data is passed in e.detail? No, triggerWindowJSEvent(eventName, data)
                 // Capacitor formats it as a CustomEvent.
                 String json = "{\"type\":\"" + ("ACTION_WIN".equals(action) ? "WIN" : "LOSS") + "\", \"input\":\"" + input.replace("\"", "\\\"") + "\"}";
                 getBridge().triggerWindowJSEvent("nativeLogInput", json);
            }
        }
    }
}