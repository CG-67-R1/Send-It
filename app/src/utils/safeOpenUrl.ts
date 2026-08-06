import { Alert, Linking } from 'react-native';

const SAFE_SCHEMES = ['http:', 'https:', 'mailto:'];

/**
 * Open only http(s) / mailto URLs. Blocks javascript:, intent:, and other schemes.
 */
export async function safeOpenUrl(url: string, label = 'link'): Promise<void> {
  if (!url?.trim()) {
    Alert.alert('Link unavailable', `This ${label} is not available right now.`);
    return;
  }
  try {
    const parsed = new URL(url);
    if (!SAFE_SCHEMES.includes(parsed.protocol)) {
      Alert.alert('Unsafe link', 'This link uses an unsupported scheme and was blocked.');
      return;
    }
  } catch {
    Alert.alert('Invalid link', 'Could not open this link.');
    return;
  }
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('Could not open link', 'Try again or open it from your browser.');
  }
}
