/** Web stub — expo-notifications local/push APIs are not available in the browser. */

export async function requestNotificationPermissions(): Promise<boolean> {
  return false;
}

export async function notifyNewPriority1Headlines(
  _sourceName: string,
  _count: number
): Promise<void> {
  // no-op on web
}
