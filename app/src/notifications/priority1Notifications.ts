import * as Notifications from 'expo-notifications';

// Show notification when app is in foreground too (optional)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function notifyNewPriority1Headlines(
  sourceName: string,
  count: number
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'New ' + sourceName + ' headlines',
      body: count === 1 ? '1 new article' : `${count} new articles`,
    },
    trigger: null,
  });
}
