import fs from "node:fs";
import path from "node:path";

console.log("=== RUNNING FULL AUDIT ===");

function walk(dir, fileList = []) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const file of files) {
    const full = path.join(dir, file.name);
    if (file.isDirectory()) {
      if (
        file.name === "node_modules" ||
        file.name === ".git" ||
        file.name === ".agents" ||
        file.name === "dist" ||
        file.name === "release"
      ) {
        continue;
      }
      walk(full, fileList);
    } else {
      fileList.push(full);
    }
  }
  return fileList;
}

const files = walk(".");
console.log(`Auditing ${files.length} project files...`);

const issues = [];
const externalUrlExemptions = [
  "https://ilyas-portfolio.carrd.co",
  "https://www.instagram.com/ilyas_rah",
  "https://wa.me",
  "http://localhost",
  "https://github.com",
];

for (const filePath of files) {
  if (
    filePath.endsWith(".ts") ||
    filePath.endsWith(".tsx") ||
    filePath.endsWith(".html") ||
    filePath.endsWith(".css") ||
    filePath.endsWith(".cjs") ||
    filePath.endsWith(".js")
  ) {
    const content = fs.readFileSync(filePath, "utf-8");

    // Check Lovable
    if (content.toLowerCase().includes("lovable") && !filePath.includes("AGENTS.md")) {
      issues.push(`[Lovable ref]: ${filePath}`);
    }

    // Check Supabase
    if (content.toLowerCase().includes("supabase")) {
      issues.push(`[Supabase ref]: ${filePath}`);
    }

    // Check external CDN / URLs
    const urls = content.match(/https?:\/\/[^\s"'`)]+/g) || [];
    for (const url of urls) {
      const isExempt = externalUrlExemptions.some((ex) => url.startsWith(ex));
      if (!isExempt) {
        issues.push(`[External URL]: ${filePath} -> ${url}`);
      }
    }
  }
}

if (issues.length === 0) {
  console.log("✓ AUDIT PASSED: Zero Lovable, zero Supabase, zero unwanted external URLs/CDNs!");
} else {
  console.log("Found issues:");
  issues.forEach((i) => console.log(i));
}
