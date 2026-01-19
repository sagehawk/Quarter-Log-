import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

export const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    // Web Fallback: Use standard browser API
    if (Capacitor.getPlatform() === 'web') {
      if (!('Notification' in window)) {
        console.warn("Notifications not supported in this browser.");
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

export const scheduleNotification = async (title: string, body: string, delayMs: number) => {
  try {
    // Web Fallback: Use setTimeout + Notification API
    if (Capacitor.getPlatform() === 'web') {
      if (Notification.permission === 'granted') {
        setTimeout(() => {
          new Notification(title, { 
            body,
            icon: '/vite.svg' // Fallback icon for dev
          });
        }, delayMs);
        console.log(`Web notification scheduled in ${delayMs}ms`);
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
          sound: undefined, // Uses default system notification sound
          smallIcon: 'res://mipmap/ic_launcher',
          actionTypeId: "",
          extra: null
        }
      ]
    });
    console.log(`Native notification scheduled in ${delayMs}ms`);
  } catch (e) {
    console.error("Failed to schedule notification", e);
  }
};

export const cancelNotification = async () => {
  try {
    if (Capacitor.getPlatform() === 'web') {
      // Clearing web timeouts requires storing IDs, which is complex for simple dev testing.
      // For now, we just skip cancellation on web dev.
      return;
    }
    await LocalNotifications.cancel({ notifications: [{ id: 1 }] });
  } catch (e) {
    // Ignore error if nothing to cancel
  }
};

export const sendNotification = async (title: string, body: string, isTest: boolean = false) => {
  return scheduleNotification(title, body, 1000); 
};