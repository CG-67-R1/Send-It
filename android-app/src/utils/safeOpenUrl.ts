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
  let parsed: URL;
  try {
    parsed = new URL(url);
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
    if (parsed.protocol === 'mailto:') {
      const address = decodeURIComponent(
        parsed.pathname || parsed.href.replace(/^mailto:/i, '').split('?')[0]
      );
      Alert.alert(
        'Could not open email',
        `No email app available. Write to ${address || 'projectapex@outlook.com.au'}.`
      );
      return;
    }
    Alert.alert('Could not open link', 'Try again or open it from your browser.');
  }
}
