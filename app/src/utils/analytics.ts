/** Lightweight analytics stub — no third-party SDK until a provider is chosen. */
export async function logAnalyticsEvent(
  name: string,
  params?: Record<string, string | number | boolean>
): Promise<void> {
  if (__DEV__) {
    console.log('[analytics]', name, params ?? {});
  }
}
