package com.quarterlog.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.CountDownTimer;
import android.os.IBinder;
import androidx.core.app.NotificationCompat;
import com.quarterlog.app.MainActivity;
import com.quarterlog.app.R;

public class TimerForegroundService extends Service {
    public static final String CHANNEL_ID = "QuarterLogTimerChannel";
    private CountDownTimer timer;
    private int totalCycles = 0;
    private int cyclesLeft = 0;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) return START_NOT_STICKY;
        
        if ("STOP".equals(intent.getAction())) {
            stopForeground(true);
            stopSelf();
            return START_NOT_STICKY;
        }

        // Default to 15 mins if missing
        long durationMs = intent.getLongExtra("duration", 15 * 60 * 1000); 
        totalCycles = intent.getIntExtra("totalCycles", 0);
        cyclesLeft = intent.getIntExtra("cyclesLeft", 0);

        startForeground(1, createNotification(durationMs));

        if (timer != null) timer.cancel();

        timer = new CountDownTimer(durationMs, 1000) {
            @Override
            public void onTick(long millisUntilFinished) {
                updateNotification(millisUntilFinished);
            }

            @Override
            public void onFinish() {
                stopForeground(true);
                stopSelf();
            }
        }.start();

        return START_STICKY;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel serviceChannel = new NotificationChannel(
                    CHANNEL_ID,
                    "Live Timer Channel",
                    NotificationManager.IMPORTANCE_LOW 
            );
            serviceChannel.setDescription("Shows the active cycle countdown");
            serviceChannel.setShowBadge(false);
            NotificationManager manager = getSystemService(NotificationManager.class);
            manager.createNotificationChannel(serviceChannel);
        }
    }

    private Notification createNotification(long millisUntilFinished) {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(this, 
                0, notificationIntent, PendingIntent.FLAG_IMMUTABLE);

        long seconds = millisUntilFinished / 1000;
        long min = seconds / 60;
        long sec = seconds % 60;
        String timeString = String.format("%02d:%02d", min, sec);
        
        String title = "Cycle Active";
        if (totalCycles > 0) {
            int current = Math.max(1, totalCycles - cyclesLeft + 1);
            title = "Cycle " + current + "/" + totalCycles;
        }

        // Try to use the status bar icon if available, else launcher
        int iconResId = getResources().getIdentifier("ic_stat_status_bar_logo", "drawable", getPackageName());
        if (iconResId == 0) iconResId = R.mipmap.ic_launcher;

        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle(title)
                .setContentText(timeString)
                .setSmallIcon(iconResId)
                .setContentIntent(pendingIntent)
                .setOnlyAlertOnce(true) 
                .setOngoing(true)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .build();
    }

    private void updateNotification(long millisUntilFinished) {
        Notification notification = createNotification(millisUntilFinished);
        NotificationManager mNotificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        mNotificationManager.notify(1, notification);
    }

    @Override
    public void onDestroy() {
        if (timer != null) timer.cancel();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}