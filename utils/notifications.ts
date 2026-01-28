
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

// Incremented version to ensure channel settings (sound/vibration) are updated on user devices
const CHANNEL_ID = 'quarterlog_timer_v3';

export const checkNotificationPermission = async (): Promise<boolean> => {
  try {
    if (Capacitor.getPlatform() === 'web') {
      return Notification.permission === 'granted';
    }
    // Native Check
    const status = await LocalNotifications.checkPermissions();
    return status.display === 'granted';
  } catch (e) {
    console.error("Failed to check permissions", e);
    return false;
  }
};

export const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    // Web Fallback: Use standard browser API
    if (Capacitor.getPlatform() === 'web') {
      if (!('Notification' in window)) {
        return false;
      }
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    // Native (Android/iOS): Use Capacitor Plugin
    const status = await LocalNotifications.requestPermissions();
    return status.display === 'granted';
  } catch (e) {
    console.error("Failed to request permissions", e);
    return false;
  }
};

export const configureNotificationChannel = async () => {
  if (Capacitor.getPlatform() !== 'android') return;

  try {
    // Create a high-importance channel to ensure "Heads-up" notifications
    // Using 'beep.wav' - Ensure this file exists in android/app/src/main/res/raw/
    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: 'QuarterLog Timer',
      description: 'Alerts for the 15-minute log timer',
      importance: 5, // 5 = High Importance (Heads-up notification + Sound + Vibration)
      visibility: 1, // 1 = Public (Visible on lock screen)
      sound: 'beep.wav', // Custom sound filename (without extension in some versions, but 'beep.wav' is safe for Capacitor)
      vibration: true,
      lights: true,
      lightColor: '#ff005c'
    });
  } catch (e) {
    console.error("Failed to create notification channel", e);
  }
};

export const registerNotificationActions = async () => {
  if (Capacitor.getPlatform() === 'web') return;

  try {
    await LocalNotifications.registerActionTypes({
      types: [
        {
          id: 'LOG_ACTIVITY',
          actions: [
            {
              id: 'log_input',
              title: 'Log Activity',
              input: true,
              inputPlaceholder: 'What did you do?',
              inputButtonTitle: 'Save'
            }
          ]
        }
      ]
    });
  } catch (e) {
    console.error("Failed to register actions", e);
  }
};

export const scheduleNotification = async (title: string, body: string, delayMs: number) => {
  try {
    // Web Fallback: Use setTimeout + Notification API
    if (Capacitor.getPlatform() === 'web') {
      if (Notification.permission === 'granted') {
        setTimeout(() => {
          new Notification(title, { 
            body,
            icon: 'https://i.imgur.com/HEBJbFC.png' // Use remote icon
          });
        }, delayMs);
      }
      return;
    }

    // Native Logic: Schedule OS Alarm
    // Cancel any existing notification to ensure we only have one active timer
    await cancelNotification();
    
    await LocalNotifications.schedule({
      notifications: [
        {
          title,
          body,
          id: 1, // Fixed ID allows us to easily cancel/update the specific timer notification
          schedule: { at: new Date(Date.now() + delayMs) },
          sound: 'beep.wav', // Explicitly request the custom sound
          smallIcon: 'ic_stat_icon_config_sample', // Ensure this matches capacitor.config
          channelId: CHANNEL_ID, // Use the high-priority channel
          actionTypeId: 'LOG_ACTIVITY',
          extra: null
        }
      ]
    });
  } catch (e) {
    console.error("Failed to schedule notification", e);
  }
};

export const cancelNotification = async () => {
  try {
    if (Capacitor.getPlatform() === 'web') {
      return;
    }
    await LocalNotifications.cancel({ notifications: [{ id: 1 }] });
  } catch (e) {
    // Ignore error if nothing to cancel
  }
};

export const scheduleWakeUpNotification = async (startTime: string, daysOfWeek: number[], durationMs: number) => {
  try {
    if (Capacitor.getPlatform() === 'web') return;

    // Calculate next occurrence
    const now = new Date();
    const [hours, minutes] = startTime.split(':').map(Number);
    
    let nextDate = new Date();
    nextDate.setHours(hours, minutes, 0, 0);

    // If time has passed for today, start checking from tomorrow
    if (nextDate <= now) {
      nextDate.setDate(nextDate.getDate() + 1);
    }

    // Find the next valid day
    let attempts = 0;
    while (!daysOfWeek.includes(nextDate.getDay()) && attempts < 7) {
      nextDate.setDate(nextDate.getDate() + 1);
      attempts++;
    }

    if (attempts >= 7) return; // No valid days

    // Cancel existing wake up
    await cancelWakeUpNotification();

    // 1. Schedule "Timer Started" notification at the start time
    await LocalNotifications.schedule({
      notifications: [{
        title: "Good Morning",
        body: "Your daily timer has started automatically.",
        id: 2, 
        schedule: { at: nextDate },
        sound: 'beep.wav',
        smallIcon: 'ic_stat_icon_config_sample',
        channelId: CHANNEL_ID,
      }]
    });

    // 2. Pre-schedule the first "Time's Up" notification
    // This makes it act as if the timer was running, even if the app is closed.
    const endTime = new Date(nextDate.getTime() + durationMs);
    
    await LocalNotifications.schedule({
      notifications: [{
        title: "Time's up.",
        body: "What did you do?",
        id: 1, // Main Timer ID
        schedule: { at: endTime },
        sound: 'beep.wav',
        smallIcon: 'ic_stat_icon_config_sample',
        channelId: CHANNEL_ID,
        actionTypeId: 'LOG_ACTIVITY',
      }]
    });

    console.log("Scheduled auto-start for:", nextDate);
  } catch (e) {
    console.error("Failed to schedule wake up", e);
  }
};

export const cancelWakeUpNotification = async () => {
    try {
        if (Capacitor.getPlatform() === 'web') return;
        await LocalNotifications.cancel({ notifications: [{ id: 2 }] });
    } catch (e) {
        // Ignore
    }
};

export const sendNotification = async (title: string, body: string, isTest: boolean = false) => {
  // Use a very short delay for immediate notifications to ensure execution order
  return scheduleNotification(title, body, 100); 
};
