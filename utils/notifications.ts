export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.warn('This browser does not support desktop notification');
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
  if (Notification.permission === 'granted') {
    try {
      // Try to use ServiceWorker registration if available (better for PWAs)
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          registration.showNotification(title, {
            body,
            icon: 'https://placehold.co/192x192/3b82f6/ffffff.png?text=QL',
            badge: 'https://placehold.co/96x96/3b82f6/ffffff.png?text=QL',
            tag: 'quarter-log-reminder',
            renotify: true,
            // "Heartbeat" pattern: Short pulse (100ms), Pause (100ms), Longer pulse (250ms)
            vibrate: [100, 100, 250], 
            actions: [
              {
                action: 'log',
                title: 'Log Activity',
              }
            ],
            data: {
              url: '/' // Used by sw.js to open the window
            }
          } as any);
          return;
        }
      }

      // Fallback to standard Notification API if SW not ready
      new Notification(title, {
        body,
        icon: 'https://placehold.co/192x192/3b82f6/ffffff.png?text=QL', 
        tag: 'quarter-log-reminder',
        // Cast to any because renotify is missing in some NotificationOptions type definitions
        renotify: true,
      } as any);
    } catch (e) {
      console.error("Notification failed", e);
    }
  }
};