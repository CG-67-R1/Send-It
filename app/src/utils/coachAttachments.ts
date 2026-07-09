import { Alert, Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';

export type CoachAttachment =
  | {
      id: string;
      kind: 'image';
      name: string;
      mimeType: string;
      uri: string;
      base64: string;
    }
  | {
      id: string;
      kind: 'file';
      name: string;
      mimeType: string;
      text: string;
    };

export type CoachAttachmentPayload =
  | { type: 'image'; name: string; mimeType: string; data: string }
  | { type: 'file'; name: string; mimeType: string; content: string };

const MAX_ATTACHMENTS = 3;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_TEXT_CHARS = 24_000;

const TEXT_EXTENSIONS = new Set([
  '.csv',
  '.txt',
  '.json',
  '.log',
  '.gpx',
  '.xml',
  '.vbo',
  '.md',
]);

function newId(): string {
  return `att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function estimateBase64Bytes(base64: string): number {
  return Math.floor((base64.length * 3) / 4);
}

function isTextLikeFile(name: string, mimeType?: string | null): boolean {
  const lower = name.toLowerCase();
  if ([...TEXT_EXTENSIONS].some((ext) => lower.endsWith(ext))) return true;
  if (!mimeType) return false;
  return (
    mimeType.startsWith('text/') ||
    mimeType.includes('json') ||
    mimeType.includes('csv') ||
    mimeType.includes('xml')
  );
}

async function imageFromPicker(
  result: ImagePicker.ImagePickerResult
): Promise<CoachAttachment | null> {
  const asset = result.assets?.[0];
  if (!asset?.uri || !asset.base64) return null;

  const bytes = estimateBase64Bytes(asset.base64);
  if (bytes > MAX_IMAGE_BYTES) {
    Alert.alert('Image too large', 'Choose a smaller photo (under 4 MB).');
    return null;
  }

  const name = asset.fileName || `photo_${Date.now()}.jpg`;
  return {
    id: newId(),
    kind: 'image',
    name,
    mimeType: asset.mimeType || 'image/jpeg',
    uri: asset.uri,
    base64: asset.base64,
  };
}

export async function pickCoachPhotoFromLibrary(): Promise<CoachAttachment | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Photos', 'Allow photo access to attach tyre or setup images.', [
      { text: 'OK' },
      ...(Platform.OS !== 'web' ? [{ text: 'Settings', onPress: () => import('expo-linking').then((m) => m.openSettings()) }] : []),
    ]);
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.65,
    base64: true,
  });
  if (result.canceled) return null;
  return imageFromPicker(result);
}

export async function takeCoachPhoto(): Promise<CoachAttachment | null> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Camera', 'Allow camera access to take a photo to attach.');
    return null;
  }

  const result = await ImagePicker.launchCameraAsync({
    quality: 0.65,
    base64: true,
  });
  if (result.canceled) return null;
  return imageFromPicker(result);
}

export async function pickCoachDataFile(): Promise<CoachAttachment | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: [
      'text/*',
      'application/json',
      'application/xml',
      'application/csv',
      'application/vnd.ms-excel',
    ],
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0];
  const name = asset.name || 'data.txt';
  if (!isTextLikeFile(name, asset.mimeType)) {
    Alert.alert(
      'Unsupported file',
      'Attach CSV, JSON, GPX, log, or other text exports from your lap timer. Photos use the image option.'
    );
    return null;
  }

  const uri = asset.uri;
  let text = '';
  try {
    text = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.UTF8 });
  } catch {
    Alert.alert('Could not read file', 'Try exporting again as CSV or plain text.');
    return null;
  }

  if (text.length > MAX_TEXT_CHARS) {
    text = `${text.slice(0, MAX_TEXT_CHARS)}\n\n[File truncated for length — first ${MAX_TEXT_CHARS} characters shown.]`;
  }

  if (!text.trim()) {
    Alert.alert('Empty file', 'That file has no readable text content.');
    return null;
  }

  return {
    id: newId(),
    kind: 'file',
    name,
    mimeType: asset.mimeType || 'text/plain',
    text,
  };
}

export function showCoachAttachMenu(handlers: {
  onPhoto: () => void;
  onCamera: () => void;
  onFile: () => void;
}): void {
  Alert.alert('Attach for feedback', 'Add a tyre photo or lap-timer / telemetry export.', [
    { text: 'Photo library', onPress: handlers.onPhoto },
    { text: 'Take photo', onPress: handlers.onCamera },
    { text: 'Data file (CSV, JSON, GPX…)', onPress: handlers.onFile },
    { text: 'Cancel', style: 'cancel' },
  ]);
}

export function canAddAttachment(count: number): boolean {
  if (count >= MAX_ATTACHMENTS) {
    Alert.alert('Attachment limit', `You can attach up to ${MAX_ATTACHMENTS} files per message.`);
    return false;
  }
  return true;
}

export function attachmentsToPayload(attachments: CoachAttachment[]): CoachAttachmentPayload[] {
  return attachments.map((att) =>
    att.kind === 'image'
      ? { type: 'image', name: att.name, mimeType: att.mimeType, data: att.base64 }
      : { type: 'file', name: att.name, mimeType: att.mimeType, content: att.text }
  );
}

export function attachmentSummary(attachments: CoachAttachment[]): string {
  if (!attachments.length) return '';
  const names = attachments.map((a) => a.name).join(', ');
  return `[Attached: ${names}]`;
}
