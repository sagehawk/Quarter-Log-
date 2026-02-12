package com.quarterlog.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import androidx.core.app.NotificationCompat;
import androidx.core.app.RemoteInput;
import com.quarterlog.app.MainActivity;
import com.quarterlog.app.R;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;

public class TimerForegroundService extends Service {
    public static final String CHANNEL_ID = "QuarterLogLive_v6";
    public static final String ALERT_CHANNEL_ID = "QuarterLogAlert_v2_Silent";
    public static final int NOTIFICATION_ID = 1;
    public static final int ALERT_NOTIFICATION_ID = 2;
    
    private ScheduledExecutorService scheduler;
    private ScheduledFuture<?> timerHandle;
    private PowerManager.WakeLock wakeLock;
    
    private int totalCycles = 0;
    private int cyclesLeft = 0;
    private long endTime = 0;
    private long currentDuration = 15 * 60 * 1000;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        scheduler = Executors.newSingleThreadScheduledExecutor();
        PowerManager powerManager = (PowerManager) getSystemService(POWER_SERVICE);
        wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "QuarterLog::TimerWakeLock");
        
        // Restore state
        android.content.SharedPreferences prefs = getSharedPreferences("TimerState", MODE_PRIVATE);
        currentDuration = prefs.getLong("currentDuration", 15 * 60 * 1000);
        totalCycles = prefs.getInt("totalCycles", 0);
        cyclesLeft = prefs.getInt("cyclesLeft", 0);
    }
    
        @Override
        public int onStartCommand(Intent intent, int flags, int startId) {
            if (intent == null) return START_NOT_STICKY;
            
            String action = intent.getAction();
            
            if ("STOP".equals(action)) {
                stopTimer();
                stopForeground(true);
                stopSelf();
                if (wakeLock != null && wakeLock.isHeld()) wakeLock.release();
                return START_NOT_STICKY;
            }
    
                    if ("ACTION_WIN".equals(action) || "ACTION_LOSS".equals(action)) {
                        String inputText = "";
                        android.os.Bundle remoteInput = RemoteInput.getResultsFromIntent(intent);
                        if (remoteInput != null) {
                            CharSequence val = remoteInput.getCharSequence("log_input");
                            if (val != null) inputText = val.toString();
                        }

                        getSharedPreferences("NativeLog", MODE_PRIVATE).edit()
                            .putString("pending_input", inputText)
                            .putString("pending_type", "ACTION_WIN".equals(action) ? "WIN" : "LOSS")
                            .apply();
                            
                        Intent broadcast = new Intent("com.quarterlog.app.UPDATE_LOG");
                        broadcast.setPackage(getPackageName());
                        sendBroadcast(broadcast);

                        NotificationManager mNotificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
                        if (mNotificationManager != null) {
                            mNotificationManager.cancel(ALERT_NOTIFICATION_ID);
                        }
                        
                        // Loop Mechanism: Restart Timer instead of stopping, unless cycles are done
                        cyclesLeft--;
                        getSharedPreferences("TimerState", MODE_PRIVATE).edit().putInt("cyclesLeft", cyclesLeft).apply();
                        
                        if (cyclesLeft > 0) {
                            endTime = System.currentTimeMillis() + currentDuration;
                            
                            // Save new state for App sync
                            getSharedPreferences("TimerState", MODE_PRIVATE).edit()
                                .putLong("endTime", endTime)
                                .putInt("cyclesLeft", cyclesLeft)
                                .apply();

                            startForeground(NOTIFICATION_ID, createNotification(currentDuration));
                            startTimer();
                            return START_STICKY;
                        } else {
                            stopForeground(true);
                            stopSelf();
                            if (wakeLock != null && wakeLock.isHeld()) wakeLock.release();
                            return START_NOT_STICKY;
                        }
                    }    
            long durationMs = intent.getLongExtra("duration", 15 * 60 * 1000); 
            currentDuration = durationMs;
            totalCycles = intent.getIntExtra("totalCycles", 0);
            cyclesLeft = intent.getIntExtra("cyclesLeft", 0);
            
            getSharedPreferences("TimerState", MODE_PRIVATE).edit()
                .putLong("currentDuration", currentDuration)
                .putInt("totalCycles", totalCycles)
                .putInt("cyclesLeft", cyclesLeft)
                .apply();
            
            endTime = System.currentTimeMillis() + durationMs;
    
            startForeground(NOTIFICATION_ID, createNotification(durationMs));
            
            if (wakeLock != null) {
                if (wakeLock.isHeld()) wakeLock.release();
                wakeLock.acquire(durationMs + 30000); 
            }
    
            startTimer();
    
            return START_STICKY;
        }
        
        private void startTimer() {
            if (timerHandle != null && !timerHandle.isCancelled()) {
                timerHandle.cancel(false);
            }
    
            timerHandle = scheduler.scheduleAtFixedRate(() -> {
                long remaining = endTime - System.currentTimeMillis();
                if (remaining <= 0) {
                    triggerAlertNotification();
                    // Don't stopSelf() automatically here if we want to wait for input
                    // But we do need to stop the countdown
                    if (timerHandle != null) timerHandle.cancel(false);
                    // Keep WakeLock? Maybe release until next start
                    if (wakeLock != null && wakeLock.isHeld()) wakeLock.release();
                } else {
                    updateNotification(remaining);
                }
            }, 0, 1000, TimeUnit.MILLISECONDS);
        }
        
        private void stopTimer() {
            if (timerHandle != null) {
                timerHandle.cancel(false);
                timerHandle = null;
            }
        }
    
        private void createNotificationChannel() {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                NotificationManager manager = getSystemService(NotificationManager.class);
     
                                        NotificationChannel serviceChannel = new NotificationChannel(
     
                                                CHANNEL_ID,
     
                                                "Live Timer Status",
     
                                                NotificationManager.IMPORTANCE_DEFAULT 
     
                                        );                serviceChannel.setDescription("Shows the active cycle countdown");
                serviceChannel.setSound(null, null);
                serviceChannel.enableVibration(false);
                serviceChannel.setShowBadge(false);
                serviceChannel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
                manager.createNotificationChannel(serviceChannel);
    
                NotificationChannel alertChannel = new NotificationChannel(
                        ALERT_CHANNEL_ID,
                        "Cycle Complete Alert",
                        NotificationManager.IMPORTANCE_HIGH
                );
                alertChannel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
                manager.createNotificationChannel(alertChannel);
            }
        }
    
        private Notification createNotification(long millisUntilFinished) {
            Intent notificationIntent = new Intent(this, MainActivity.class);
            PendingIntent pendingIntent = PendingIntent.getActivity(this, 
                    0, notificationIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    
            long seconds = Math.max(0, millisUntilFinished / 1000);
            long min = seconds / 60;
            long sec = seconds % 60;
            String timeString = String.format("%02d:%02d", min, sec);
            
            // Title left blank per user request
            String title = ""; 
    
            int iconResId = getResources().getIdentifier("ic_stat_status_bar_logo", "drawable", getPackageName());
            if (iconResId == 0) iconResId = R.mipmap.ic_launcher;
    
            NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                    .setContentTitle(title)
                    .setContentText(timeString)
                    .setSmallIcon(iconResId)
                    .setContentIntent(pendingIntent)
                    .setOnlyAlertOnce(true) 
                    .setOngoing(true)
                    .setLocalOnly(true)
                    .setCategory(NotificationCompat.CATEGORY_ALARM)
                    .setVisibility(NotificationCompat.VISIBILITY_PUBLIC);
    
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                builder.setForegroundServiceBehavior(Notification.FOREGROUND_SERVICE_IMMEDIATE);
            }
    
            return builder.build();
        }
    
        private void updateNotification(long millisUntilFinished) {
            try {
                Notification notification = createNotification(millisUntilFinished);
                NotificationManager mNotificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
                if (mNotificationManager != null) {
                    mNotificationManager.notify(NOTIFICATION_ID, notification);
                }
            } catch (Exception e) {}
        }
        
        private void triggerAlertNotification() {
            try {
                // stopForeground(true); // Don't stop foreground, we want to stay alive to receive action
                
                Intent fullScreenIntent = new Intent(this, AlertActivity.class);
                fullScreenIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                PendingIntent fullScreenPendingIntent = PendingIntent.getActivity(this, 
                        99, fullScreenIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    
                Intent notificationIntent = new Intent(this, MainActivity.class);
                notificationIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP); 
                PendingIntent pendingIntent = PendingIntent.getActivity(this, 
                        0, notificationIntent, PendingIntent.FLAG_IMMUTABLE);
    
                int iconResId = getResources().getIdentifier("ic_stat_status_bar_logo", "drawable", getPackageName());
                if (iconResId == 0) iconResId = R.mipmap.ic_launcher;
                
                int current = Math.max(1, totalCycles - cyclesLeft + 1);
                String contentText = "Declare your status for Cycle " + current + "/" + totalCycles;
                
                // Add RemoteInput for text entry
                RemoteInput remoteInput = new RemoteInput.Builder("log_input")
                        .setLabel("What did you do?")
                        .build();

                Intent winIntent = new Intent(this, TimerForegroundService.class);
                winIntent.setAction("ACTION_WIN");
                PendingIntent winPendingIntent = PendingIntent.getService(this, 10, winIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE);
    
                NotificationCompat.Action winAction = new NotificationCompat.Action.Builder(
                        0, "DONE", winPendingIntent)
                        .addRemoteInput(remoteInput)
                        .build();
                
                Intent lossIntent = new Intent(this, TimerForegroundService.class);
                lossIntent.setAction("ACTION_LOSS");
                PendingIntent lossPendingIntent = PendingIntent.getService(this, 11, lossIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE);
    
                NotificationCompat.Action lossAction = new NotificationCompat.Action.Builder(
                        0, "MISS", lossPendingIntent)
                        .addRemoteInput(remoteInput)
                        .build();
    
                            Notification notification = new NotificationCompat.Builder(this, ALERT_CHANNEL_ID)
                                    .setContentTitle("Cycle Complete")
                                    .setContentText(contentText)
                                    .setSmallIcon(iconResId)
                                    .setContentIntent(pendingIntent)
                                    .setAutoCancel(false) // Don't dismiss on click
                                    .setOngoing(true)     // Persistent
                                    .setPriority(NotificationCompat.PRIORITY_MAX)
                                    .setCategory(NotificationCompat.CATEGORY_ALARM)
                                    .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                                    .addAction(winAction)
                                    .addAction(lossAction)
                                    .setSound(null)
                                    .setVibrate(new long[]{0L})
                                    .build();    
                NotificationManager mNotificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
                if (mNotificationManager != null) {
                    mNotificationManager.notify(NOTIFICATION_ID, notification); 
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    @Override
    public void onDestroy() {
        stopTimer();
        if (scheduler != null) {
            scheduler.shutdown();
        }
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
        }
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}