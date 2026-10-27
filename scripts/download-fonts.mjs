import fs from "node:fs";
import path from "node:path";

async function downloadFonts() {
  const fontsDir = path.resolve("public/fonts");
  if (!fs.existsSync(fontsDir)) {
    fs.mkdirSync(fontsDir, { recursive: true });
  }

  const cssUrl = "https://fonts.googleapis.com/css2?family=Cairo:wght@600;700;800&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap";
  const res = await fetch(cssUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });
  let css = await res.text();

  const urlRegex = /url\((https:[^)]+)\)/g;
  const urls = new Set();
  let match;
  while ((match = urlRegex.exec(css)) !== null) {
    urls.add(match[1]);
  }

  console.log(`Downloading ${urls.size} font files...`);
  let index = 0;
  for (const url of urls) {
    const filename = `font-${index++}.woff2`;
    const fontRes = await fetch(url);
    const buf = Buffer.from(await fontRes.arrayBuffer());
    fs.writeFileSync(path.join(fontsDir, filename), buf);
    css = css.replaceAll(url, `/fonts/${filename}`);
  }

  fs.writeFileSync(path.join(fontsDir, "fonts.css"), css, "utf-8");
  console.log("Offline fonts downloaded and fonts.css generated successfully!");
}

downloadFonts().catch(console.error);
