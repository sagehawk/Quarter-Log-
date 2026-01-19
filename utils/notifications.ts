// Simple blue square icon in Base64
const ICON_BASE64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAADIAQMAAACXljzdAAAABlBMVEUAAAD7gov///+XjNlAAAAAFnRSTlMA8Emu7wAAAAlwSFlzAAAOxAAADsQBlSsOGwAAABxJREFUeF7NwTEBAAAAwqD1T20JT6AAAAAAAADgBxM4AAGdNb2yAAAAAElFTkSuQmCC";

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (e) {
    console.error("Permission request failed", e);
    return false;
  }
};

export const sendNotification = async (title: string, body: string, isTest: boolean = false) => {
  // 1. Basic Check
  if (!('Notification' in window)) {
    console.warn("Notifications not supported in this browser.");
    if (isTest) alert("This browser does not support web notifications.");
    return;
  }

  // 2. Permission Check
  if (Notification.permission !== 'granted') {
    console.warn("Notification permission not granted.");
    if (isTest) alert("Notification permission is not granted. Please enable it in browser settings.");
    return;
  }

  const timestamp = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

  // Unique tag for test ensures it always pops up as new
  const tag = isTest ? `ql-test-${Date.now()}` : 'ql-alert-v1';

  const options: any = {
    body: `${body} [${timestamp}]`,
    icon: ICON_BASE64,
    tag: tag,
    renotify: true, // Forces sound/vibration again
    requireInteraction: true,
    silent: false,
    vibrate: [1000, 500, 1000], // Vibration pattern
    data: { url: '/' }
  };

  try {
    if ('serviceWorker' in navigator) {
      // Ensure SW is ready
      const registration = await navigator.serviceWorker.ready;

      // PREFERRED METHOD: Send message to SW to trigger notification.
      // This is much more reliable on Android than calling showNotification from the window.
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SHOW_NOTIFICATION',
          title: title,
          options: options
        });
        console.log('Notification delegated to Service Worker via postMessage');
        return;
      }

      // Fallback: If no controller (e.g. first load), try direct call via registration
      await registration.showNotification(title, options);
      console.log('Notification sent via Service Worker Registration (Fallback)');
      return;
    }

    // Legacy Fallback
    new Notification(title, options);

  } catch (e) {
    console.error("Notification failed to send:", e);
    if (isTest) alert("Error sending notification: " + e);
  }
};