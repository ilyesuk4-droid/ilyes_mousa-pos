const { app, BrowserWindow } = require("electron");
const path = require("path");
const fs = require("fs");

app.whenReady().then(async () => {
  try {
    const win = new BrowserWindow({
      show: false,
      width: 1200,
      height: 1600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    const htmlPath = path.join(__dirname, "readme-client-template.html");
    await win.loadFile(htmlPath);

    // Give font and layout time to render
    await new Promise((resolve) => setTimeout(resolve, 800));

    const pdfBuffer = await win.webContents.printToPDF({
      pageSize: "A4",
      printBackground: true,
      margins: {
        top: 0.3,
        bottom: 0.3,
        left: 0.4,
        right: 0.4,
      },
    });

    const deliveryDir = path.join(__dirname, "..", "delivery");
    if (!fs.existsSync(deliveryDir)) {
      fs.mkdirSync(deliveryDir, { recursive: true });
    }

    const pdfPath = path.join(deliveryDir, "README-CLIENT.pdf");
    fs.writeFileSync(pdfPath, pdfBuffer);
    console.log("README-CLIENT.pdf generated successfully:", pdfPath, "Size:", pdfBuffer.length);
  } catch (err) {
    console.error("Error generating PDF:", err);
  } finally {
    app.quit();
  }
});
