import { Platform, Share } from 'react-native';

export type ShareBikeSetupOptions = {
  /** Short title for the share sheet (e.g. "Phillip Island – 2026-07-26") */
  title: string;
  /** Plain-text setup body */
  body: string;
};

/**
 * Share a bike setup as plain text via the system share sheet
 * (Messages, WhatsApp, Email, etc.). Data leaves the device only if the
 * rider chooses a share destination.
 */
export async function shareBikeSetupAsText(options: ShareBikeSetupOptions): Promise<void> {
  const { title, body } = options;
  const trimmed = body.trim();
  if (!trimmed) {
    throw new Error('Nothing to share — fill in some setup values first.');
  }
  const message = `${title}\n\n${trimmed}\n\n— Shared from RoadRacer (setup kept private on your device until you share)`;
  await Share.share({
    message,
    title: Platform.OS === 'ios' ? title : undefined,
  });
}
