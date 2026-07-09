import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Platform } from 'react-native';
import { warnUser } from './fileExporter';

const MAX_FILE_SIZE = 1572864; // 1.5 MB

const makeUid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

const getBase64Size = (base64Str: string): number => {
  const index = base64Str.indexOf('base64,');
  if (index < 0) return base64Str.length;
  // Calculate size in bytes from base64 length
  return Math.floor((3 * (base64Str.length - index - 7)) / 4);
};

export interface AttachmentResult {
  id: string;
  name: string;
  kind: 'pdf' | 'image';
  uri: string;
  size: number;
}

const processImageResult = (result: ImagePicker.ImagePickerResult): AttachmentResult | null => {
  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];

  let uri = asset.uri;
  let size = 0;

  if (asset.base64) {
    uri = `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`;
    size = getBase64Size(uri);
  } else {
    // Fallback size estimation if base64 isn't populated
    size = asset.width && asset.height ? asset.width * asset.height * 0.2 : 500000;
  }

  if (size > MAX_FILE_SIZE) {
    warnUser(
      'Image Too Large',
      'Please attach a smaller photo (bill photos compress automatically; very large originals are rejected to protect storage).'
    );
    return null;
  }

  const name = asset.fileName || `bill-${new Date().toISOString().slice(0, 10)}.jpg`;

  return {
    id: makeUid(),
    name,
    kind: 'image',
    uri,
    size
  };
};

export const pickBillImage = async (): Promise<AttachmentResult | null> => {
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.35,
      base64: true
    });
    return processImageResult(result);
  } catch (err) {
    warnUser('Library Access Error', String(err));
    return null;
  }
};

export const captureBillPhoto = async (): Promise<AttachmentResult | null> => {
  try {
    // Request permission first
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      warnUser('Permission Denied', 'Camera permission is required to capture bill photos.');
      return null;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.35,
      base64: true
    });
    return processImageResult(result);
  } catch (err) {
    warnUser('Camera Launch Error', String(err));
    return null;
  }
};

export const pickBillDocument = async (): Promise<AttachmentResult | null> => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      copyToCacheDirectory: true,
      multiple: false
    });

    if (result.canceled || !result.assets?.length) return null;
    const asset = result.assets[0];

    const size = asset.size || 0;
    if (size > MAX_FILE_SIZE) {
      warnUser('File Too Large', 'Maximum attachment size is 1.5 MB. Please attach a compressed scan.');
      return null;
    }

    const isPdf =
      (asset.mimeType || '').includes('pdf') || asset.name.toLowerCase().endsWith('.pdf');

    return {
      id: makeUid(),
      name: asset.name,
      kind: isPdf ? 'pdf' : 'image',
      uri: asset.uri,
      size
    };
  } catch (err) {
    warnUser('Document Pick Error', String(err));
    return null;
  }
};
