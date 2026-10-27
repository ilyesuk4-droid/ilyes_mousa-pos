const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const rootDir = path.resolve(__dirname, "..");
const releaseDir = path.join(rootDir, "release");
const deliveryDir = path.join(rootDir, "delivery");
const zipPath = path.join(rootDir, "MobileShopManager-Delivery-1.0.0.zip");

if (!fs.existsSync(deliveryDir)) {
  fs.mkdirSync(deliveryDir, { recursive: true });
}

const setupSrc = path.join(releaseDir, "MobileShopManager-Setup-1.0.0.exe");
const portableSrc = path.join(releaseDir, "MobileShopManager-Portable-1.0.0.exe");
const pdfPath = path.join(deliveryDir, "README-CLIENT.pdf");

if (!fs.existsSync(setupSrc)) {
  console.error("Missing setup file:", setupSrc);
  process.exit(1);
}

if (!fs.existsSync(portableSrc)) {
  console.error("Missing portable file:", portableSrc);
  process.exit(1);
}

if (!fs.existsSync(pdfPath)) {
  console.error("Missing PDF file:", pdfPath);
  process.exit(1);
}

const setupDest = path.join(deliveryDir, "MobileShopManager-Setup-1.0.0.exe");
const portableDest = path.join(deliveryDir, "MobileShopManager-Portable-1.0.0.exe");

console.log("Copying installer to delivery/...");
fs.copyFileSync(setupSrc, setupDest);

console.log("Copying portable executable to delivery/...");
fs.copyFileSync(portableSrc, portableDest);

// Validate delivery contents
const filesInDelivery = fs.readdirSync(deliveryDir);
console.log("Files inside delivery/:", filesInDelivery);

const allowed = [
  "MobileShopManager-Setup-1.0.0.exe",
  "MobileShopManager-Portable-1.0.0.exe",
  "README-CLIENT.pdf"
];

for (const file of filesInDelivery) {
  if (!allowed.includes(file)) {
    console.warn("Removing unauthorized file from delivery:", file);
    fs.rmSync(path.join(deliveryDir, file), { recursive: true, force: true });
  }
}

// Remove old zip if exists
if (fs.existsSync(zipPath)) {
  fs.unlinkSync(zipPath);
}

console.log("Zipping delivery directory into MobileShopManager-Delivery-1.0.0.zip...");
const psCommand = `powershell -NoProfile -Command "Compress-Archive -Path '${deliveryDir}\\*' -DestinationPath '${zipPath}' -Force"`;
execSync(psCommand, { stdio: "inherit" });

const zipStats = fs.statSync(zipPath);
console.log("=== DELIVERY PACKAGE READY ===");
console.log("Zip Path:", zipPath);
console.log("Zip Size:", (zipStats.size / (1024 * 1024)).toFixed(2), "MB (" + zipStats.size + " bytes)");

for (const f of fs.readdirSync(deliveryDir)) {
  const s = fs.statSync(path.join(deliveryDir, f));
  console.log(` - ${f}: ${(s.size / (1024 * 1024)).toFixed(2)} MB (${s.size} bytes)`);
}
