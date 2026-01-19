// Simple blue square icon in Base64 to ensure no network requests are needed.
// This prevents the OS from dropping the notification if the network is slow or restricted.
const ICON_BASE64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAADIAQMAAACXljzdAAAABlBMVEUAAAD7gov///+XjNlAAAAAFnRSTlMA8Emu7wAAAAlwSFlzAAAOxAAADsQBlSsOGwAAABxJREFUeF7NwTEBAAAAwqD1T20JT6AAAAAAAADgBxM4AAGdNb2yAAAAAElFTkSuQmCC";

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
};

export const sendNotification = async (title: string, body: string, isTest: boolean = false) => {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    console.log('Notifications not granted or not supported');
    return;
  }

  const timestamp = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

  // Generate a unique tag for tests to prevent the OS from grouping/silencing them.
  // For regular timer alerts, we use a consistent tag so they replace each other.
  const tag = isTest ? `quarter-log-test-${Date.now()}` : 'quarter-log-alert-v2';

  const options: any = {
    body: `${body} • ${timestamp}`,
    icon: ICON_BASE64, // Critical: Embedded icon ensures display even offline/locked
    badge: ICON_BASE64,
    tag: tag,
    renotify: true, // Forces sound/vibration even if a notification with this tag exists
    requireInteraction: true, // Keeps notification visible until user interacts
    silent: false,
    vibrate: [500, 250, 500, 250, 1000], // Vibration pattern: Vibrate-Pause-Vibrate-Pause-LongVibrate
    data: { url: '/' }
  };

  try {
    // Try sending via Service Worker first (Best for Android/Background)
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration) {
        await registration.showNotification(title, options);
        console.log('Notification sent via Service Worker');
        return;
      }
    }

    // Fallback for environments without active SW
    new Notification(title, options);
    console.log('Notification sent via Standard API');
  } catch (e) {
    console.error("Notification failed to send:", e);
  }
};