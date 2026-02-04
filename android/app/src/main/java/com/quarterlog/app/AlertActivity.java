package com.quarterlog.app;

import android.app.Activity;
import android.app.KeyguardManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

public class AlertActivity extends Activity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
            KeyguardManager keyguardManager = (KeyguardManager) getSystemService(Context.KEYGUARD_SERVICE);
            if (keyguardManager != null) {
                keyguardManager.requestDismissKeyguard(this, null);
            }
        } else {
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
                    | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
                    | WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
                    | WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD);
        }
        
        // Hide system bars
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_FULLSCREEN
            | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);

        ScrollView scrollView = new ScrollView(this);
        scrollView.setFillViewport(true);
        scrollView.setBackgroundColor(Color.parseColor("#050505"));

        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setGravity(Gravity.CENTER);
        int padding = dpToPx(24);
        layout.setPadding(padding, padding, padding, dpToPx(280)); // Increased from 120 to 280 to move up

        TextView title = new TextView(this);
        title.setText("CYCLE COMPLETE");
        title.setTextColor(Color.WHITE);
        title.setTextSize(32);
        title.setTypeface(null, Typeface.BOLD_ITALIC);
        title.setGravity(Gravity.CENTER);
        title.setPadding(0, 0, 0, dpToPx(16));
        layout.addView(title);
        
        TextView sub = new TextView(this);
        sub.setText("Declare your status");
        sub.setTextColor(Color.parseColor("#eab308")); // Yellow-500
        sub.setTextSize(14);
        sub.setLetterSpacing(0.2f);
        sub.setGravity(Gravity.CENTER);
        sub.setPadding(0, 0, 0, dpToPx(40));
        layout.addView(sub);

        // Input removed per request

        LinearLayout btnContainer = new LinearLayout(this);
        btnContainer.setOrientation(LinearLayout.HORIZONTAL);
        btnContainer.setGravity(Gravity.CENTER);
        
        Button btnWin = new Button(this);
        btnWin.setText("DONE");
        btnWin.setBackgroundColor(Color.parseColor("#eab308")); 
        btnWin.setTextColor(Color.BLACK);
        btnWin.setTypeface(null, Typeface.BOLD);
        btnWin.setOnClickListener(v -> submit("ACTION_WIN", ""));
        LinearLayout.LayoutParams p1 = new LinearLayout.LayoutParams(0, dpToPx(60), 1f);
        p1.setMargins(0, 0, dpToPx(10), 0);
        btnContainer.addView(btnWin, p1);

        Button btnLoss = new Button(this);
        btnLoss.setText("MISS");
        btnLoss.setBackgroundColor(Color.parseColor("#dc2626")); 
        btnLoss.setTextColor(Color.WHITE);
        btnLoss.setTypeface(null, Typeface.BOLD);
        btnLoss.setOnClickListener(v -> submit("ACTION_LOSS", ""));
        LinearLayout.LayoutParams p2 = new LinearLayout.LayoutParams(0, dpToPx(60), 1f);
        p2.setMargins(dpToPx(10), 0, 0, 0);
        btnContainer.addView(btnLoss, p2);

        layout.addView(btnContainer, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT));
        
        scrollView.addView(layout);
        setContentView(scrollView);
    }

    private void submit(String action, String text) {
        // Save to Persistent Storage for Cold Starts / Resume
        getSharedPreferences("NativeLog", MODE_PRIVATE).edit()
            .putString("pending_input", text)
            .putString("pending_type", "ACTION_WIN".equals(action) ? "WIN" : "LOSS")
            .apply();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            KeyguardManager keyguardManager = (KeyguardManager) getSystemService(Context.KEYGUARD_SERVICE);
            if (keyguardManager != null) {
                keyguardManager.requestDismissKeyguard(this, null);
            }
        }
        finish();
    }
    
    private int dpToPx(int dp) {
        return (int) (dp * getResources().getDisplayMetrics().density);
    }
}