package com.quarterlog.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

public class DailyStartReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;

        long duration = intent.getLongExtra("duration", 15 * 60 * 1000);
        int totalCycles = intent.getIntExtra("totalCycles", 32); 
        int cyclesLeft = intent.getIntExtra("cyclesLeft", 32);

        Intent serviceIntent = new Intent(context, TimerForegroundService.class);
        serviceIntent.putExtra("duration", duration);
        serviceIntent.putExtra("totalCycles", totalCycles);
        serviceIntent.putExtra("cyclesLeft", cyclesLeft);

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
            } else {
                context.startService(serviceIntent);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
