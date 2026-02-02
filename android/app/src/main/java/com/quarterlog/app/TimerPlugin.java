package com.quarterlog.app;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import android.content.Intent;

@CapacitorPlugin(name = "TimerPlugin")
public class TimerPlugin extends Plugin {

    @PluginMethod
    public void start(PluginCall call) {
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
    public void stop(PluginCall call) {
        Intent serviceIntent = new Intent(getContext(), TimerForegroundService.class);
        getContext().stopService(serviceIntent);
        call.resolve();
    }
}