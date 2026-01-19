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

export const sendNotification = async (title: string, body: string) => {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  // Robust vibration pattern
  const vibratePattern = [200, 100, 200, 100, 200, 100, 500];
  
  // Use a tag to group notifications, but renotify to ensure sound/vibration plays every time
  const tag = 'quarter-log-timer';

  // Use 'any' type here because some TypeScript definitions for NotificationOptions 
  // do not include 'renotify' or 'actions', even though they are supported in modern browsers.
  const options: any = {
    body: `${body} (${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})})`,
    icon: 'https://placehold.co/192x192/3b82f6/ffffff.png?text=QL',
    badge: 'https://placehold.co/96x96/3b82f6/ffffff.png?text=QL',
    tag: tag,
    renotify: true, 
    requireInteraction: true, // Crucial for keeping it on screen
    silent: false,
    timestamp: Date.now(),
    vibrate: vibratePattern,
    data: { url: '/' },
    // Actions can sometimes cause issues if not handled perfectly in SW, 
    // keeping them simple or removing them if issues persist.
    // For now, we keep a simple "Open" action which is default behavior anyway, 
    // but explicit actions help visibility on some Android versions.
    actions: [
      { action: 'open', title: 'Log Activity' }
    ]
  };

  try {
    if ('serviceWorker' in navigator) {
      // Wait for the service worker to be ready. 
      // This is more reliable than getRegistration() which might return undefined or an installing worker.
      const registration = await navigator.serviceWorker.ready;
      
      if (registration) {
        await registration.showNotification(title, options);
        return;
      }
    }

    // Fallback
    new Notification(title, options);
  } catch (e) {
    console.error("Notification failed", e);
  }
};