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

  // Use a unique tag if testing, otherwise keep it consistent to allow grouping/replacement
  const tag = isTest ? `quarter-log-test-${Date.now()}` : 'quarter-log-alert-v2';

  const options: any = {
    body: `${body} • ${timestamp}`,
    tag: tag,
    renotify: true, // Force sound/vibrate every time
    requireInteraction: true, // Keep it on screen until user dismisses
    silent: false,
    vibrate: [500, 250, 500, 250, 1000], // Distinct pattern
    data: { url: '/' }
  };

  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration) {
        await registration.showNotification(title, options);
        console.log('Notification sent via Service Worker');
        return;
      }
    }

    // Fallback for non-SW environments
    new Notification(title, options);
    console.log('Notification sent via Standard API');
  } catch (e) {
    console.error("Notification failed to send:", e);
  }
};