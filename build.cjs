const fs = require("fs");
const path = require("path");
const AdmZip = require("adm-zip");
const { applyPatch } = require("diff");

const zipName = "TROSECNIK_3D_3_1_SURVIVAL_EXPEDITION_VERCEL (1).zip";
const zipPath = path.join(__dirname, zipName);
const outDir = path.join(__dirname, "dist");

if (!fs.existsSync(zipPath)) {
  throw new Error("Missing source package: " + zipName);
}

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
new AdmZip(zipPath).extractAllTo(outDir, true);

function applyUnifiedPatch(relativePath, patchPath) {
  const target = path.join(outDir, relativePath);
  const patch = fs.readFileSync(path.join(__dirname, patchPath), "utf8");
  const source = fs.readFileSync(target, "utf8");
  const result = applyPatch(source, patch);
  if (result === false) throw new Error("Patch failed: " + patchPath);
  fs.writeFileSync(target, result);
}

applyUnifiedPatch("src/game_logic.js", "patches/survival_plus10_game_logic.patch");

const rendererPath = path.join(outDir, "src/renderer.js");
let renderer = fs.readFileSync(rendererPath, "utf8");
function replaceRequired(from, to, label) {
  if (!renderer.includes(from)) throw new Error("Renderer upgrade anchor missing: " + label);
  renderer = renderer.replace(from, to);
}

replaceRequired(
  "    const badWeather=weather==='storm'?.53:weather==='rain'?.25:0;",
  "    const badWeather=weather==='storm'?.53:weather==='rain'?.25:weather==='fog'?.18:0;\n    const heat=weather==='heat'?1:0, mist=weather==='fog'?1:0;",
  "weather modes"
);
replaceRequired(
  "    const skyDay=new THREE.Color(0x79aebc);",
  "    const skyDay=new THREE.Color(0x79aebc).lerp(new THREE.Color(0x9ab8b2),mist*.55).lerp(new THREE.Color(0xaac6cc),heat*.22);",
  "fog/heat sky"
);
replaceRequired(
  "    this.scene.fog.far=(weather==='storm'?54:weather==='rain'?72:118);if(zone==='fogForest'){this.scene.fog.near=7;this.scene.fog.far=39;this.scene.fog.color.lerp(new THREE.Color(0x71837a),.45)}else if(zone==='blackBeach'){this.scene.fog.near=12;this.scene.fog.far=Math.min(this.scene.fog.far,70);this.scene.fog.color.lerp(new THREE.Color(0x3d4650),.35)}else if(zone==='ravine'){this.scene.fog.far=Math.min(this.scene.fog.far,86);}",
  "    this.scene.fog.far=(weather==='storm'?54:weather==='rain'?72:weather==='fog'?46:118);if(weather==='fog'){this.scene.fog.near=8;this.scene.fog.color.lerp(new THREE.Color(0x899b91),.52)}if(weather==='heat'){this.scene.fog.near=25;this.scene.fog.far=105;this.scene.fog.color.lerp(new THREE.Color(0xcdbb96),.16)}if(zone==='fogForest'){this.scene.fog.near=7;this.scene.fog.far=39;this.scene.fog.color.lerp(new THREE.Color(0x71837a),.45)}else if(zone==='blackBeach'){this.scene.fog.near=12;this.scene.fog.far=Math.min(this.scene.fog.far,70);this.scene.fog.color.lerp(new THREE.Color(0x3d4650),.35)}else if(zone==='ravine'){this.scene.fog.far=Math.min(this.scene.fog.far,86);}",
  "fog distances"
);
replaceRequired(
  "    this.sun.intensity=.10+day*(1.92+golden*.55)*(1-badWeather*.6);",
  "    this.sun.intensity=.10+day*(1.92+golden*.55)*(1-badWeather*.6)*(1+heat*.12);",
  "heat sunlight"
);
fs.writeFileSync(rendererPath, renderer);

const entry = path.join(outDir, "index.html");
if (!fs.existsSync(entry)) {
  throw new Error("Build completed, but dist/index.html is missing.");
}

console.log("Trosečník 3.1.1 Survival+ 10 prepared in dist/");
