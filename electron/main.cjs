const { app, BrowserWindow, protocol, net, ipcMain, shell, Menu, dialog } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const { pathToFileURL } = require("node:url");

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

// Custom protocol scheme for fully offline SPA loading
const SCHEME = "app";
const HOST = "shop";

protocol.registerSchemesAsPrivileged([
  {
    scheme: SCHEME,
    privileges: {
      standard: true,
      secure: true,
      allowServiceWorkers: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);

// Identity: Fixed user-data directory
// NOTE: Changing productName or appId in package.json changes this user-data path.
const appName = "MobileShopManager";
app.name = "متجر الهواتف — نقطة البيع";
const userDataPath = path.join(app.getPath("appData"), appName);
if (!fs.existsSync(userDataPath)) {
  fs.mkdirSync(userDataPath, { recursive: true });
}
app.setPath("userData", userDataPath);

const logFilePath = path.join(userDataPath, "app.log");
function logMessage(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  try {
    fs.appendFileSync(logFilePath, line, "utf-8");
  } catch {}
}

let mainWindow = null;
let customBackupFolder = null;

function getDefaultBackupFolder() {
  if (customBackupFolder && fs.existsSync(customBackupFolder)) {
    return customBackupFolder;
  }
  const docs = app.getPath("documents");
  const p = path.join(docs, "MobileShopBackups");
  if (!fs.existsSync(p)) {
    fs.mkdirSync(p, { recursive: true });
  }
  return p;
}

function cleanOldBackups(dir, maxCount = 30) {
  try {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => {
        const full = path.join(dir, f);
        return { path: full, time: fs.statSync(full).mtimeMs };
      })
      .sort((a, b) => b.time - a.time);

    if (files.length > maxCount) {
      for (const item of files.slice(maxCount)) {
        try { fs.unlinkSync(item.path); } catch {}
      }
    }
  } catch (err) {
    logMessage("Clean backups error: " + err.message);
  }
}

function performAutoBackup(dataJson) {
  try {
    const dir = getDefaultBackupFolder();
    const dateStr = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const filename = `backup-${dateStr}.json`;
    const targetPath = path.join(dir, filename);
    fs.writeFileSync(targetPath, dataJson, "utf-8");
    logMessage(`Backup created: ${targetPath}`);
    cleanOldBackups(dir, 30);
    return { success: true, path: targetPath };
  } catch (err) {
    logMessage("Auto backup failed: " + err.message);
    return { success: false, error: err.message };
  }
}

function openDataFolder() {
  const p = app.getPath("userData");
  if (!fs.existsSync(p)) {
    fs.mkdirSync(p, { recursive: true });
  }
  shell.openPath(p);
}

function createMenu(isDev) {
  const isMac = process.platform === "darwin";
  const template = [
    ...(isMac ? [{ role: "appMenu" }] : []),
    {
      label: "ملف (File)",
      submenu: [
        {
          label: "فتح مجلد البيانات (Open data folder)",
          accelerator: "CmdOrCtrl+Shift+D",
          click: () => openDataFolder(),
        },
        {
          label: "فتح مجلد النسخ الاحتياطية (Backups folder)",
          click: () => shell.openPath(getDefaultBackupFolder()),
        },
        { type: "separator" },
        {
          label: "خروج (Exit)",
          accelerator: isMac ? "Cmd+Q" : "Alt+F4",
          click: () => app.quit(),
        },
      ],
    },
    {
      label: "عرض (View)",
      submenu: [
        { label: "تكبير (Zoom in)", role: "zoomIn" },
        { label: "تصغير (Zoom out)", role: "zoomOut" },
        { label: "الحجم الافتراضي (Reset zoom)", role: "resetZoom" },
        { type: "separator" },
        { label: "ملء الشاشة (Toggle fullscreen)", role: "togglefullscreen" },
        ...(isDev ? [{ label: "أدوات المطور (DevTools)", role: "toggleDevTools" }] : []),
      ],
    },
    {
      label: "مساعدة (Help)",
      submenu: [
        {
          label: "حول التطبيق (About)",
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: "info",
              title: "متجر الهواتف — نقطة البيع",
              message: "متجر الهواتف — نقطة البيع (Mobile Shop Manager)",
              detail: `الإصدار: v${app.getVersion()}\nتم تطوير هذا النظام بواسطة إلياس بدر الدين\nDéveloppé par Ilyes Badreddin\nالموقع: https://ilyas-portfolio.carrd.co/\nالبيانات مخزنة محلياً وآمنة تماماً على هذا الجهاز.`,
              buttons: ["حسناً", "زيارة موقع المطور"],
            }).then(({ response }) => {
              if (response === 1) {
                shell.openExternal("https://ilyas-portfolio.carrd.co/");
              }
            });
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function registerProtocolHandler() {
  const clientDir = path.normalize(path.join(__dirname, "../dist/client"));

  protocol.handle(SCHEME, (request) => {
    try {
      const url = new URL(request.url);
      let pathname = decodeURIComponent(url.pathname);
      if (pathname === "/" || !pathname) {
        pathname = "/index.html";
      }

      let filePath = path.normalize(path.join(clientDir, pathname));

      if (!filePath.startsWith(clientDir)) {
        return new Response("Forbidden", { status: 403 });
      }

      if (!fs.existsSync(filePath)) {
        filePath = path.join(clientDir, "index.html");
      }

      return net.fetch(pathToFileURL(filePath).toString());
    } catch (err) {
      logMessage("Protocol error: " + err.message);
      return new Response("Error loading file", { status: 500 });
    }
  });
}

function setupIpc() {
  ipcMain.handle("open-data-folder", async () => {
    openDataFolder();
    return true;
  });

  ipcMain.handle("open-backup-folder", async () => {
    const dir = getDefaultBackupFolder();
    shell.openPath(dir);
    return true;
  });

  ipcMain.handle("backup-now", async (event, dataJson) => {
    return performAutoBackup(dataJson);
  });

  ipcMain.handle("get-backup-info", async () => {
    const dir = getDefaultBackupFolder();
    return {
      folder: dir,
      files: fs.existsSync(dir)
        ? fs.readdirSync(dir).filter((f) => f.endsWith(".json"))
        : [],
    };
  });

  ipcMain.handle("choose-backup-folder", async () => {
    const res = await dialog.showOpenDialog(mainWindow, {
      title: "اختر مجلد حفظ النسخ الاحتياطية",
      properties: ["openDirectory", "createDirectory"],
    });
    if (!res.canceled && res.filePaths.length > 0) {
      customBackupFolder = res.filePaths[0];
      return customBackupFolder;
    }
    return null;
  });

  ipcMain.handle("get-printers", async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return [];
    return win.webContents.getPrintersAsync();
  });

  ipcMain.handle("print-silent", async (event, options = {}) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return false;

    return new Promise((resolve) => {
      win.webContents.print(
        {
          silent: true,
          printBackground: true,
          deviceName: options.deviceName || "",
          margins: { marginType: "none" },
          ...options,
        },
        (success, failureReason) => {
          if (!success) {
            logMessage(`Silent print failed (${failureReason}), opening system dialog`);
            win.webContents.print({ silent: false, printBackground: true });
          }
          resolve(success);
        }
      );
    });
  });

  ipcMain.handle("print-test-page", async (event, options = {}) => {
    const testWin = new BrowserWindow({
      show: false,
      width: 400,
      height: 600,
      webPreferences: {
        nodeIntegration: false,
      },
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
            text-align: center;
            padding: 15px;
            font-size: 13px;
            margin: 0;
            color: #000;
          }
          h2 { margin: 5px 0; font-size: 16px; }
          .divider { border-top: 1px dashed #000; margin: 10px 0; }
          .time { font-size: 11px; color: #333; }
        </style>
      </head>
      <body>
        <h2>متجر الهواتف — نقطة البيع</h2>
        <div>صفحة اختبار الطابعة</div>
        <div class="divider"></div>
        <div>✓ اتصال الطابعة يعمل بنجاح</div>
        <div class="time">${new Date().toLocaleString("fr-FR")}</div>
        <div class="divider"></div>
        <div>Ilyes Badreddin — POS System</div>
      </body>
      </html>
    `;

    await testWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

    return new Promise((resolve) => {
      testWin.webContents.print(
        {
          silent: options.silent !== undefined ? !!options.silent : true,
          printBackground: true,
          deviceName: options.deviceName || "",
          margins: { marginType: "none" },
        },
        (success, failureReason) => {
          try {
            testWin.close();
          } catch {}
          resolve({ success, error: failureReason });
        }
      );
    });
  });

  ipcMain.handle("set-auto-launch", async (event, enabled) => {
    try {
      app.setLoginItemSettings({
        openAtLogin: !!enabled,
        openAsHidden: false,
      });
      return app.getLoginItemSettings().openAtLogin;
    } catch (err) {
      logMessage("set-auto-launch error: " + err.message);
      return false;
    }
  });

  ipcMain.handle("get-auto-launch", async () => {
    try {
      return app.getLoginItemSettings().openAtLogin;
    } catch {
      return false;
    }
  });
}

function createWindow() {
  const isDev = !app.isPackaged && (process.env.NODE_ENV === "development" || process.argv.includes("--dev"));
  const iconPath = path.join(__dirname, "../build/icon.ico");
  const fallbackIcon = path.join(__dirname, "../public/favicon.ico");
  const actualIcon = fs.existsSync(iconPath) ? iconPath : (fs.existsSync(fallbackIcon) ? fallbackIcon : undefined);

  mainWindow = new BrowserWindow({
    width: 1366,
    height: 850,
    minWidth: 1024,
    minHeight: 680,
    title: "متجر الهواتف — نقطة البيع",
    icon: actualIcon,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: true,
    },
  });

  createMenu(isDev);
  mainWindow.maximize();

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  // Disable DevTools and refresh shortcuts in production
  mainWindow.webContents.on("before-input-event", (event, input) => {
    if (!isDev) {
      const key = input.key.toLowerCase();
      if (
        input.key === "F12" ||
        input.key === "F5" ||
        (input.control && key === "r") ||
        (input.control && input.shift && key === "i")
      ) {
        event.preventDefault();
      }
    }
  });

  // Block external navigation and open in default OS browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http:") || url.startsWith("https:") || url.startsWith("mailto:") || url.startsWith("tel:")) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (url.startsWith("http:") || url.startsWith("https:")) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  // Friendly error handling
  mainWindow.webContents.on("render-process-gone", (event, details) => {
    logMessage(`Renderer gone: ${details.reason} (exitCode: ${details.exitCode})`);
    dialog.showMessageBox(mainWindow, {
      type: "error",
      title: "تنبيه في النظام",
      message: "توقف البرنامج مؤقتاً بسبب خطأ غير متوقع",
      detail: "يمكنك إعادة تحميل الصفحة الآن بأمان دون فقدان بياناتك.",
      buttons: ["إعادة التحميل", "فتح مجلد البيانات"],
    }).then(({ response }) => {
      if (response === 0) mainWindow.reload();
      else openDataFolder();
    });
  });

  mainWindow.webContents.on("did-fail-load", (event, errorCode, errorDescription) => {
    logMessage(`Load failed: ${errorCode} ${errorDescription}`);
    if (errorCode === -3) return; // Ignore aborted navigation
    dialog.showMessageBox(mainWindow, {
      type: "error",
      title: "تعذر تحميل الصفحة",
      message: "لم يتمكن البرنامج من قراءة الملفات المحلية",
      detail: `${errorDescription} (${errorCode})`,
      buttons: ["إعادة المحاولة", "إغلاق"],
    }).then(({ response }) => {
      if (response === 0) mainWindow.loadURL(`${SCHEME}://${HOST}/index.html`);
    });
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
  } else {
    mainWindow.loadURL(`${SCHEME}://${HOST}/index.html`);
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// Single instance focus
app.on("second-instance", () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.whenReady().then(() => {
  registerProtocolHandler();
  setupIpc();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
