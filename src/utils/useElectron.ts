import { useEffect } from 'react';
import { Platform } from 'react-native';

declare global {
  interface Window {
    deepaBMS?: {
      isElectron: boolean;
      platform: string;
      getAppInfo: () => Promise<Record<string, string>>;
      getSystemTheme: () => Promise<'light' | 'dark'>;
      saveFile: (opts: {
        content: string;
        defaultName?: string;
        filters?: { name: string; extensions: string[] }[];
      }) => Promise<string | null>;
      openFile: (opts: {
        filters?: { name: string; extensions: string[] }[];
      }) => Promise<string | null>;
      saveCSV: (opts: {
        content: string;
        defaultName?: string;
      }) => Promise<string | null>;
      showNotification: (opts: {
        title: string;
        body: string;
      }) => Promise<void>;
      print: () => Promise<void>;
      minimize: () => void;
      maximize: () => void;
      close: () => void;
      isMaximized: () => Promise<boolean>;
      openExternal: (url: string) => void;
      onThemeChange: (cb: (theme: 'light' | 'dark') => void) => () => void;
      onNewEntry: (cb: () => void) => () => void;
      onSave: (cb: () => void) => () => void;
      onSearch: (cb: () => void) => () => void;
      onToggleDark: (cb: () => void) => () => void;
      onExport: (cb: () => void) => () => void;
      onSync: (cb: () => void) => () => void;
      onPowerSuspend: (cb: () => void) => () => void;
      onPowerResume: (cb: () => void) => () => void;
      onPowerAC: (cb: () => void) => () => void;
      onPowerBattery: (cb: () => void) => () => void;
    };
  }
}

const api = (): Window['deepaBMS'] | undefined => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.deepaBMS;
  }
  return undefined;
};

export const useElectron = () => {
  const electron = api();
  return {
    isDesktop: !!electron,
    platform: electron?.platform ?? null,
    getAppInfo: electron?.getAppInfo ?? null,
    getSystemTheme: electron?.getSystemTheme ?? null,
    saveFile: electron?.saveFile ?? null,
    openFile: electron?.openFile ?? null,
    saveCSV: electron?.saveCSV ?? null,
    showNotification: electron?.showNotification ?? null,
    print: electron?.print ?? null,
    minimize: electron?.minimize ?? null,
    maximize: electron?.maximize ?? null,
    close: electron?.close ?? null,
    isMaximized: electron?.isMaximized ?? null,
    openExternal: electron?.openExternal ?? null,
    onThemeChange: electron?.onThemeChange ?? null,
    onNewEntry: electron?.onNewEntry ?? null,
    onSave: electron?.onSave ?? null,
    onSearch: electron?.onSearch ?? null,
    onToggleDark: electron?.onToggleDark ?? null,
    onExport: electron?.onExport ?? null,
    onSync: electron?.onSync ?? null,
    onPowerSuspend: electron?.onPowerSuspend ?? null,
    onPowerResume: electron?.onPowerResume ?? null,
    onPowerAC: electron?.onPowerAC ?? null,
    onPowerBattery: electron?.onPowerBattery ?? null,
  };
};

export const useElectronShortcut = (
  event:
    | 'onNewEntry'
    | 'onSave'
    | 'onSearch'
    | 'onToggleDark'
    | 'onExport'
    | 'onSync',
  handler: () => void,
) => {
  useEffect(() => {
    const electron = api();
    if (!electron || !electron[event]) return;
    const unsubscribe = electron[event](handler);
    return unsubscribe;
  }, [event, handler]);
};

export const useElectronThemeSync = (toggleTheme: () => void) => {
  useEffect(() => {
    const electron = api();
    if (!electron?.onThemeChange) return;

    const unsubscribe = electron.onThemeChange(() => {
      toggleTheme();
    });

    return unsubscribe;
  }, [toggleTheme]);
};
