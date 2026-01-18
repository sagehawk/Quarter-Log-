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

export const sendNotification = (title: string, body: string) => {
  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: 'https://picsum.photos/192/192', // Placeholder icon
        tag: 'quarter-log-reminder',
        // Cast to any because renotify is missing in some NotificationOptions type definitions
        renotify: true,
      } as any);
    } catch (e) {
      console.error("Notification failed", e);
    }
  }
};