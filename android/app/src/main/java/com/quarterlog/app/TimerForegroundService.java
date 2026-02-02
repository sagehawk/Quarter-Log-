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
    public static final String CHANNEL_ID = "QuarterLogLive_v3";
    public static final String ALERT_CHANNEL_ID = "quarterlog_timer_v4";
    public static final int NOTIFICATION_ID = 1;
    
    private ScheduledExecutorService scheduler;
    private ScheduledFuture<?> timerHandle;
    private PowerManager.WakeLock wakeLock;
    
    private int totalCycles = 0;
    private int cyclesLeft = 0;
    private long endTime = 0;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        scheduler = Executors.newSingleThreadScheduledExecutor();
        PowerManager powerManager = (PowerManager) getSystemService(POWER_SERVICE);
        wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "QuarterLog::TimerWakeLock");
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) return START_NOT_STICKY;
        
        if ("STOP".equals(intent.getAction())) {
            stopTimer();
            stopForeground(true);
            stopSelf();
            if (wakeLock != null && wakeLock.isHeld()) wakeLock.release();
            return START_NOT_STICKY;
        }

        long durationMs = intent.getLongExtra("duration", 15 * 60 * 1000); 
        totalCycles = intent.getIntExtra("totalCycles", 0);
        cyclesLeft = intent.getIntExtra("cyclesLeft", 0);
        
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
                stopSelf();
                if (timerHandle != null) timerHandle.cancel(false);
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
                    NotificationManager.IMPORTANCE_HIGH 
            );
            serviceChannel.setDescription("Shows the active cycle countdown");
            serviceChannel.setSound(null, null);
            serviceChannel.enableVibration(false);
            serviceChannel.setShowBadge(false);
            manager.createNotificationChannel(serviceChannel);
            
            NotificationChannel alertChannel = new NotificationChannel(
                    ALERT_CHANNEL_ID,
                    "IronLog Tactical",
                    NotificationManager.IMPORTANCE_HIGH
            );
            manager.createNotificationChannel(alertChannel);
        }
    }

    private Notification createNotification(long millisUntilFinished) {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(this, 
                0, notificationIntent, PendingIntent.FLAG_IMMUTABLE);

        long seconds = Math.max(0, millisUntilFinished / 1000);
        long min = seconds / 60;
        long sec = seconds % 60;
        String timeString = String.format("%02d:%02d", min, sec);
        
        String title = "Cycle Active";
        if (totalCycles > 0) {
            int current = Math.max(1, totalCycles - cyclesLeft + 1);
            title = "Cycle " + current + "/" + totalCycles;
        }

        int iconResId = getResources().getIdentifier("ic_stat_status_bar_logo", "drawable", getPackageName());
        if (iconResId == 0) iconResId = R.mipmap.ic_launcher;

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle(title)
                .setContentText(timeString)
                .setSmallIcon(iconResId)
                .setContentIntent(pendingIntent)
                .setOnlyAlertOnce(true) 
                .setOngoing(true)
                .setCategory(NotificationCompat.CATEGORY_PROGRESS)
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
            stopForeground(false);
            
            Intent notificationIntent = new Intent(this, MainActivity.class);
            notificationIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP); 
            PendingIntent pendingIntent = PendingIntent.getActivity(this, 
                    0, notificationIntent, PendingIntent.FLAG_IMMUTABLE);

            int iconResId = getResources().getIdentifier("ic_stat_status_bar_logo", "drawable", getPackageName());
            if (iconResId == 0) iconResId = R.mipmap.ic_launcher;
            
            int current = Math.max(1, totalCycles - cyclesLeft + 1);
            String contentText = "Declare your status for Cycle " + current + "/" + totalCycles;
            
            RemoteInput remoteInput = new RemoteInput.Builder("KEY_TEXT_REPLY")
                    .setLabel("How did you win/lose?")
                    .build();

            Intent winIntent = new Intent(this, MainActivity.class);
            winIntent.setAction("ACTION_WIN");
            winIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            PendingIntent winPendingIntent = PendingIntent.getActivity(this, 10, winIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE);

            NotificationCompat.Action winAction = new NotificationCompat.Action.Builder(
                    0, "WIN", winPendingIntent)
                    .addRemoteInput(remoteInput)
                    .build();
            
            Intent lossIntent = new Intent(this, MainActivity.class);
            lossIntent.setAction("ACTION_LOSS");
            lossIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            PendingIntent lossPendingIntent = PendingIntent.getActivity(this, 11, lossIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE);

            NotificationCompat.Action lossAction = new NotificationCompat.Action.Builder(
                    0, "LOSS", lossPendingIntent)
                    .addRemoteInput(remoteInput)
                    .build();

            Notification notification = new NotificationCompat.Builder(this, ALERT_CHANNEL_ID)
                    .setContentTitle("Win or Loss?")
                    .setContentText(contentText)
                    .setSmallIcon(iconResId)
                    .setContentIntent(pendingIntent)
                    .setAutoCancel(true)
                    .setDefaults(Notification.DEFAULT_ALL)
                    .setPriority(NotificationCompat.PRIORITY_HIGH)
                    .addAction(winAction)
                    .addAction(lossAction)
                    .build();

            NotificationManager mNotificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (mNotificationManager != null) {
                mNotificationManager.cancel(2); 
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