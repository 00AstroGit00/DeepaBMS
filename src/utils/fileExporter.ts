import { Platform, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';

export const csvEscape = (val: any): string => {
  const s = String(val ?? '');
  if (/[",\n\r]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
};

export const toCSV = (headers: string[], rows: string[][]): string => {
  const lines: string[] = [];
  if (headers && headers.length > 0) {
    lines.push(headers.map(csvEscape).join(','));
  }
  rows.forEach((row) => {
    lines.push(row.map(csvEscape).join(','));
  });
  return lines.join('\n');
};

export const warnUser = (title: string, msg: string) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${msg}`);
  } else {
    Alert.alert(title, msg);
  }
};

export const saveTextFile = async (
  filename: string,
  content: string,
  mimeType: string
): Promise<boolean> => {
  if (Platform.OS === 'web') {
    try {
      const blob = new Blob(['\ufeff' + content], { type: `${mimeType};charset=utf-8` });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      return true;
    } catch (err) {
      warnUser('Export Failed', String(err));
      return false;
    }
  } else {
    try {
      const fileUri = FileSystem.cacheDirectory + filename;
      await FileSystem.writeAsStringAsync(fileUri, content, {
        encoding: FileSystem.EncodingType.UTF8
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { mimeType, dialogTitle: filename });
      } else {
        warnUser('Saved', `File saved to app storage: ${filename}`);
      }
      return true;
    } catch (err) {
      warnUser('Export Failed', String(err));
      return false;
    }
  }
};

export const exportPDF = async (filename: string, htmlContent: string): Promise<boolean> => {
  try {
    await Print.printAsync({ html: htmlContent });
    return true;
  } catch (err) {
    warnUser('PDF Export Failed', String(err));
    return false;
  }
};
