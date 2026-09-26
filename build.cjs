const fs = require("fs");
const path = require("path");
const AdmZip = require("adm-zip");

const zipName = "TROSECNIK_3D_3_1_SURVIVAL_EXPEDITION_VERCEL (1).zip";
const zipPath = path.join(__dirname, zipName);
const outDir = path.join(__dirname, "dist");

if (!fs.existsSync(zipPath)) {
  throw new Error("Missing source package: " + zipName);
}

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

new AdmZip(zipPath).extractAllTo(outDir, true);

const entry = path.join(outDir, "index.html");
if (!fs.existsSync(entry)) {
  throw new Error("Build completed, but dist/index.html is missing.");
}

console.log("Trosečník 3.1 Survival Expedition prepared in dist/");
