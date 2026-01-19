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
              placeholder: 'What did you do?',
              submitTitle: 'Save'
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
          actionTypeId: 'LOG_ACTIVITY',
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
      return;
    }
    await LocalNotifications.cancel({ notifications: [{ id: 1 }] });
  } catch (e) {
    // Ignore error if nothing to cancel
  }
};

export const sendNotification = async (title: string, body: string, isTest: boolean = false) => {
  // Use a very short delay for immediate notifications to ensure execution order
  return scheduleNotification(title, body, 100); 
};