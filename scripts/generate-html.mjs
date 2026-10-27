import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

async function generateHtml() {
  console.log("Generating static index.html from server bundle...");
  const serverPath = path.resolve("dist/server/server.js");
  if (!fs.existsSync(serverPath)) {
    throw new Error("dist/server/server.js not found. Run vite build first.");
  }

  const server = (await import(pathToFileURL(serverPath).href)).default;
  const res = await server.fetch(new Request("http://localhost/"));
  if (res.status !== 200) {
    throw new Error(`Failed to render HTML, status: ${res.status}`);
  }

  const html = await res.text();
  const clientDir = path.resolve("dist/client");
  if (!fs.existsSync(clientDir)) {
    fs.mkdirSync(clientDir, { recursive: true });
  }

  const outPath = path.join(clientDir, "index.html");
  fs.writeFileSync(outPath, html, "utf-8");
  console.log(`Generated ${outPath} (${html.length} bytes) successfully!`);

  // Ensure all public files (including offline fonts) are copied to dist/client
  const publicDir = path.resolve("public");
  if (fs.existsSync(publicDir)) {
    fs.cpSync(publicDir, clientDir, { recursive: true });
    console.log("Ensured all public assets copied to dist/client/");
  }
}

generateHtml().catch((err) => {
  console.error("HTML generation error:", err);
  process.exit(1);
});
