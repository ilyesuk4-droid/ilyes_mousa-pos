export interface ElectronPrinterInfo {
  name: string;
  displayName?: string;
  description?: string;
  status?: number;
  isDefault?: boolean;
}

export interface ElectronBackupInfo {
  folder: string;
  files: string[];
}

export interface ElectronAPI {
  isElectron: boolean;
  openDataFolder: () => Promise<boolean>;
  openBackupFolder: () => Promise<boolean>;
  backupNow: (data: string) => Promise<{ success: boolean; path?: string; error?: string }>;
  getBackupInfo: () => Promise<ElectronBackupInfo>;
  chooseBackupFolder: () => Promise<string | null>;
  getPrinters: () => Promise<ElectronPrinterInfo[]>;
  printSilent: (options?: { deviceName?: string | undefined }) => Promise<boolean>;
  printTestPage: (options?: { silent?: boolean | undefined; deviceName?: string | undefined }) => Promise<{ success: boolean; error?: string }>;
  setAutoLaunch: (enabled: boolean) => Promise<boolean>;
  getAutoLaunch: () => Promise<boolean>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
