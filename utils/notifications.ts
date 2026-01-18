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
  // Always check permission first
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  // Aggressive options for high visibility
  const options: any = {
    body,
    icon: 'https://placehold.co/192x192/3b82f6/ffffff.png?text=QL',
    tag: 'quarter-log-reminder',
    renotify: true, // Alert again even if a notification with this tag exists
    requireInteraction: true, // Keep notification visible until user interacts
    silent: false,
    timestamp: Date.now(),
    vibrate: [500, 200, 500, 200, 500, 200, 500], // Long, noticeable vibration pattern
    data: {
      url: '/'
    }
  };

  try {
    // 1. Try Service Worker (Best for PWA/Mobile background handling)
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration && registration.active) {
        await registration.showNotification(title, {
          ...options,
          badge: 'https://placehold.co/96x96/3b82f6/ffffff.png?text=QL',
          actions: [
            {
              action: 'log',
              title: 'Log Activity',
            }
          ]
        } as any);
        return;
      }
    }

    // 2. Fallback to standard Notification API
    new Notification(title, options);
  } catch (e) {
    console.error("Notification failed", e);
  }
};