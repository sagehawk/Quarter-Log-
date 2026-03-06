
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

const CHANNEL_ID = 'battleplan_daily_v1';

export const checkNotificationPermission = async (): Promise<boolean> => {
  try {
    if (Capacitor.getPlatform() === 'web') {
      return Notification.permission === 'granted';
    }
    const status = await LocalNotifications.checkPermissions();
    return status.display === 'granted';
  } catch (e) {
    console.error("Failed to check permissions", e);
    return false;
  }
};

export const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    if (Capacitor.getPlatform() === 'web') {
      if (!('Notification' in window)) return false;
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
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
    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: 'Battle Plan Daily',
      description: 'Morning and evening battle plan reminders',
      importance: 4,
      visibility: 1,
      sound: 'beep.wav',
      vibration: true,
      lights: true,
      lightColor: '#22c55e'
    });
  } catch (e) {
    console.error("Failed to create notification channel", e);
  }
};

export const cancelAllNotifications = async () => {
  try {
    if (Capacitor.getPlatform() === 'web') return;
    await LocalNotifications.cancel({ notifications: [{ id: 10 }, { id: 11 }] });
  } catch (e) { }
};

const getNextOccurrence = (timeStr: string): Date => {
  const [h, m] = timeStr.split(':').map(Number);
  const now = new Date();
  const target = new Date();
  target.setHours(h, m, 0, 0);
  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1);
  }
  return target;
};

export const scheduleMorningNotification = async (time: string) => {
  try {
    if (Capacitor.getPlatform() === 'web') return;

    await LocalNotifications.cancel({ notifications: [{ id: 10 }] });

    const at = getNextOccurrence(time);
    await LocalNotifications.schedule({
      notifications: [{
        title: "Time to set your Battle Plan",
        body: "Define your North Star, strategies, and sacrifice for today.",
        id: 10,
        schedule: {
          at,
          every: 'day',
          allowWhileIdle: true
        },
        sound: 'beep.wav',
        smallIcon: 'ic_stat_status_bar_logo',
        channelId: CHANNEL_ID,
      }]
    });
  } catch (e) {
    console.error("Failed to schedule morning notification", e);
  }
};

export const scheduleEveningNotification = async (time: string) => {
  try {
    if (Capacitor.getPlatform() === 'web') return;

    await LocalNotifications.cancel({ notifications: [{ id: 11 }] });

    const at = getNextOccurrence(time);
    await LocalNotifications.schedule({
      notifications: [{
        title: "Battle Report Ready",
        body: "Check in and see how you did today.",
        id: 11,
        schedule: {
          at,
          every: 'day',
          allowWhileIdle: true
        },
        sound: 'beep.wav',
        smallIcon: 'ic_stat_status_bar_logo',
        channelId: CHANNEL_ID,
      }]
    });
  } catch (e) {
    console.error("Failed to schedule evening notification", e);
  }
};
