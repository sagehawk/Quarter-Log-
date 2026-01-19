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

  // Simplified options to maximize compatibility across Android versions
  const options: any = {
    body: `${body} [${timestamp}]`,
    icon: ICON_BASE64,
    tag: tag,
    renotify: true, // Required to make sound/vibrate again for same tag
    requireInteraction: true,
    silent: false,
    // Simpler vibration pattern: Long-Short-Long
    vibrate: [1000, 500, 1000] 
  };
  
  // Remove badge as it can cause silent failures if the image is rejected by OS
  // options.badge = ICON_BASE64; 

  try {
    // Attempt Service Worker Notification (Primary for Mobile)
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration && registration.active) {
        await registration.showNotification(title, options);
        console.log('Notification sent via SW');
        return;
      } else {
        console.log('No active Service Worker found, falling back to new Notification()');
      }
    }

    // Fallback (Desktop / non-PWA)
    new Notification(title, options);
  } catch (e) {
    console.error("Notification failed to send:", e);
    if (isTest) alert("Error sending notification: " + e);
  }
};