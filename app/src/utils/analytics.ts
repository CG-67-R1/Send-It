/** Safe analytics — no-op when Firebase is not configured (Expo Go / no google-services). */
export async function logAnalyticsEvent(
  name: string,
  params?: Record<string, string | number | boolean>
): Promise<void> {
  try {
    const Analytics = await import('expo-firebase-analytics');
    await Analytics.logEvent(name, params);
  } catch {
    // Firebase not configured — skip silently
  }
}
