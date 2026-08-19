import type { NavigationState } from '@react-navigation/native';

type SentrySdk = typeof import('@sentry/react-native');
type SentryBreadcrumb = {
  category?: string;
  data?: Record<string, unknown>;
  message?: string;
};

let sentry: SentrySdk | null = null;

const SENSITIVE_PATH = /roadrace-ai|\/qa\//i;

function getDsn(): string | undefined {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim();
  return dsn || undefined;
}

function scrubUrl(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value) return undefined;
  try {
    const url = new URL(value);
    url.search = '';
    url.hash = '';
    if (SENSITIVE_PATH.test(url.pathname)) {
      url.pathname = '/[redacted]';
    }
    return url.toString();
  } catch {
    return SENSITIVE_PATH.test(value) ? '[redacted-url]' : value;
  }
}

function beforeBreadcrumb(breadcrumb: SentryBreadcrumb): SentryBreadcrumb | null {
  if (breadcrumb.category === 'console') return null;
  if (breadcrumb.data) {
    const data = { ...breadcrumb.data };
    delete data.request_bodySize;
    delete data.request_body;
    delete data.body;
    if (data.url) data.url = scrubUrl(data.url) ?? data.url;
    breadcrumb.data = data;
  }
  if (typeof breadcrumb.message === 'string' && SENSITIVE_PATH.test(breadcrumb.message)) {
    breadcrumb.message = '[redacted]';
  }
  return breadcrumb;
}

export function getActiveRouteName(state: NavigationState | undefined): string | undefined {
  if (!state?.routes?.length) return undefined;
  const route = state.routes[state.index ?? 0];
  if (route?.state) {
    return getActiveRouteName(route.state as NavigationState);
  }
  return route?.name;
}

/**
 * Load Sentry after the native runtime is ready. A static import can throw during
 * the initial module graph before RN is initialized (seen previously with Hermes).
 *
 * Do not add `@sentry/react-native/expo` to app.json until SENTRY_ORG,
 * SENTRY_PROJECT, and SENTRY_AUTH_TOKEN are set on EAS. That plugin wraps the
 * Xcode JS-bundle phase; without org/project the IPA can ship with no
 * main.jsbundle and crash on tap from the home screen.
 */
export async function initSentry(): Promise<void> {
  const dsn = getDsn();
  if (!dsn) {
    if (__DEV__) {
      console.warn('[Sentry] EXPO_PUBLIC_SENTRY_DSN not set — crash reporting disabled');
    }
    return;
  }
  try {
    const Sentry = await import('@sentry/react-native');
    Sentry.init({
      dsn,
      debug: __DEV__,
      enabled: true,
      environment: __DEV__ ? 'development' : 'production',
      sendDefaultPii: false,
      enableAutoSessionTracking: true,
      enableNativeCrashHandling: true,
      enableAutoPerformanceTracing: false,
      attachScreenshot: false,
      beforeBreadcrumb,
    });
    sentry = Sentry;
  } catch (e) {
    if (__DEV__) console.warn('[Sentry] init skipped:', e);
  }
}

export function captureException(error: unknown): void {
  sentry?.captureException(error);
}

export function addNavigationBreadcrumb(routeName: string): void {
  sentry?.addBreadcrumb({
    category: 'navigation',
    type: 'navigation',
    message: routeName,
  });
}
