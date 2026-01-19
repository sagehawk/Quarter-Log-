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
    // CRITICAL FIX: Android requires notifications to be sent via Service Worker.
    // 'new Notification()' throws "Illegal constructor" on many mobile browsers.
    if ('serviceWorker' in navigator) {
      // await .ready ensures the SW is active and ready to handle the request
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, options);
      console.log('Notification sent via Service Worker');
      return;
    }

    // Fallback only if Service Worker is completely unsupported (e.g. very old browsers)
    // We try-catch this specifically because it might throw on Android if SW check failed strangely.
    try {
      new Notification(title, options);
    } catch (err) {
      // If direct construction fails, we can't do anything else.
      console.error("Direct notification construction failed", err);
      if (isTest) throw new Error("Mobile browsers require a Service Worker. Please refresh and try again.");
    }
  } catch (e) {
    console.error("Notification failed to send:", e);
    if (isTest) alert("Error sending notification: " + e);
  }
};