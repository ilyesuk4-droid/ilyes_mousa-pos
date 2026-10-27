const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  isElectron: true,
  openDataFolder: () => ipcRenderer.invoke("open-data-folder"),
  openBackupFolder: () => ipcRenderer.invoke("open-backup-folder"),
  backupNow: (data) => ipcRenderer.invoke("backup-now", data),
  getBackupInfo: () => ipcRenderer.invoke("get-backup-info"),
  chooseBackupFolder: () => ipcRenderer.invoke("choose-backup-folder"),
  getPrinters: () => ipcRenderer.invoke("get-printers"),
  printSilent: (options) => ipcRenderer.invoke("print-silent", options),
  printTestPage: (options) => ipcRenderer.invoke("print-test-page", options),
  setAutoLaunch: (enabled) => ipcRenderer.invoke("set-auto-launch", enabled),
  getAutoLaunch: () => ipcRenderer.invoke("get-auto-launch"),
});
