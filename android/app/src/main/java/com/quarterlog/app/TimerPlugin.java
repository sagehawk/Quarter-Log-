package com.quarterlog.app;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import android.content.Intent;

import com.getcapacitor.JSObject;
import android.content.Context;

import android.app.AlarmManager;
import android.app.PendingIntent;
import java.util.Calendar;

@CapacitorPlugin(name = "TimerPlugin")
public class TimerPlugin extends Plugin {

    @PluginMethod
    public void start(PluginCall call) {
        // ... existing start code ...
        long duration = call.getInt("duration", 0); 
        int totalCycles = call.getInt("totalCycles", 0);
        int cyclesLeft = call.getInt("cyclesLeft", 0);
        
        Intent serviceIntent = new Intent(getContext(), TimerForegroundService.class);
        serviceIntent.putExtra("duration", duration);
        serviceIntent.putExtra("totalCycles", totalCycles);
        serviceIntent.putExtra("cyclesLeft", cyclesLeft);
        
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            getContext().startForegroundService(serviceIntent);
        } else {
            getContext().startService(serviceIntent);
        }
        call.resolve();
    }

    @PluginMethod
    public void scheduleDailyStart(PluginCall call) {
        int hour = call.getInt("hour", 9);
        int minute = call.getInt("minute", 0);
        long duration = call.getInt("duration", 15 * 60 * 1000);
        int totalCycles = call.getInt("totalCycles", 32);

        // Persist schedule for boot restoration
        getContext().getSharedPreferences("DailySchedule", Context.MODE_PRIVATE).edit()
            .putInt("hour", hour)
            .putInt("minute", minute)
            .putLong("duration", duration)
            .putInt("totalCycles", totalCycles)
            .putBoolean("enabled", true)
            .apply();

        AlarmManager alarmManager = (AlarmManager) getContext().getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) {
            call.reject("AlarmManager not available");
            return;
        }

        Intent intent = new Intent(getContext(), DailyStartReceiver.class);
        intent.putExtra("duration", duration);
        intent.putExtra("totalCycles", totalCycles);
        intent.putExtra("cyclesLeft", totalCycles); // Start fresh

        PendingIntent pendingIntent = PendingIntent.getBroadcast(
            getContext(), 
            1001, 
            intent, 
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Calendar calendar = Calendar.getInstance();
        calendar.set(Calendar.HOUR_OF_DAY, hour);
        calendar.set(Calendar.MINUTE, minute);
        calendar.set(Calendar.SECOND, 0);

        if (calendar.getTimeInMillis() <= System.currentTimeMillis()) {
            calendar.add(Calendar.DAY_OF_YEAR, 1);
        }

        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S) {
            if (alarmManager.canScheduleExactAlarms()) {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, calendar.getTimeInMillis(), pendingIntent);
            } else {
                // Fallback or request permission (omitted for brevity, assuming permission granted)
                alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, calendar.getTimeInMillis(), pendingIntent);
            }
        } else {
            alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, calendar.getTimeInMillis(), pendingIntent);
        }

        call.resolve();
    }

    @PluginMethod
    public void cancelDailyStart(PluginCall call) {
        // Disable schedule persistence
        getContext().getSharedPreferences("DailySchedule", Context.MODE_PRIVATE).edit()
            .putBoolean("enabled", false)
            .apply();

        AlarmManager alarmManager = (AlarmManager) getContext().getSystemService(Context.ALARM_SERVICE);
        Intent intent = new Intent(getContext(), DailyStartReceiver.class);
        PendingIntent pendingIntent = PendingIntent.getBroadcast(
            getContext(), 
            1001, 
            intent, 
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        
        if (alarmManager != null) {
            alarmManager.cancel(pendingIntent);
        }
        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        Intent serviceIntent = new Intent(getContext(), TimerForegroundService.class);
        serviceIntent.setAction("STOP");
        getContext().startService(serviceIntent);
        call.resolve();
    }

    @PluginMethod
    public void checkPendingLog(PluginCall call) {
        android.content.SharedPreferences prefs = getContext().getSharedPreferences("NativeLog", Context.MODE_PRIVATE);
        String input = prefs.getString("pending_input", null);
        String type = prefs.getString("pending_type", null);
        
        if (input != null && type != null) {
            JSObject ret = new JSObject();
            ret.put("input", input);
            ret.put("type", type);
            
            // Retrieve timer state sync info
            android.content.SharedPreferences timerPrefs = getContext().getSharedPreferences("TimerState", Context.MODE_PRIVATE);
            long endTime = timerPrefs.getLong("endTime", 0);
            int cyclesLeft = timerPrefs.getInt("cyclesLeft", 0);
            
            if (endTime > System.currentTimeMillis()) {
                ret.put("activeEndTime", endTime);
                ret.put("cyclesLeft", cyclesLeft);
            }
            
            // Clear pending log
            prefs.edit().clear().apply();
            
            call.resolve(ret);
        } else {
            call.resolve();
        }
    }
}