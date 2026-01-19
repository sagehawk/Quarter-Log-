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

  // Mobile vibration pattern (longer for better noticeability)
  const vibrationPattern = [200, 100, 200, 100, 200, 100, 400];

  const options: any = {
    body: `${body} [${timestamp}]`,
    icon: ICON_BASE64,
    tag: tag,
    renotify: true, // Forces sound/vibration again even if tag exists
    requireInteraction: true, // Keeps notification on screen until dismissed
    silent: false,
    vibrate: vibrationPattern, // CRITICAL for Android background vibration
    data: { url: '/' }
  };

  try {
    // CRITICAL: On Android, we MUST use the Service Worker Registration to show notifications.
    // We do NOT use postMessage here anymore as it can be flaky if the SW isn't updated.
    // registration.showNotification is the direct, standard API.
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      
      // Direct call - reliable and standard
      await registration.showNotification(title, options);
      console.log('Notification sent via Service Worker Registration');
      return;
    }

    // Fallback for Desktop Safari or browsers without Service Workers
    // Note: This WILL throw "Illegal constructor" on Android, so we only reach here if SW is missing.
    new Notification(title, options);

  } catch (e) {
    console.error("Notification failed to send:", e);
    if (isTest) alert("Error sending notification: " + e + ". Try reinstalling the app/clearing cache.");
  }
};