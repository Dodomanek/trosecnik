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

function applyUnifiedDiff(source, patchText) {
  const src = source.split("\n");
  const patch = patchText.split("\n");
  const out = [];
  let srcIndex = 0;
  let i = 0;

  while (i < patch.length) {
    const header = patch[i].match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
    if (!header) { i++; continue; }

    const oldStart = Number(header[1]) - 1;
    while (srcIndex < oldStart) out.push(src[srcIndex++]);
    i++;

    while (i < patch.length && !patch[i].startsWith("@@ ")) {
      const line = patch[i];
      if (line.startsWith("--- ") || line.startsWith("+++ ")) { i++; continue; }
      if (line === "\\ No newline at end of file") { i++; continue; }

      const mark = line[0];
      const text = line.slice(1);

      if (mark === " ") {
        if (src[srcIndex] !== text) {
          throw new Error("Patch context mismatch near source line " + (srcIndex + 1));
        }
        out.push(src[srcIndex++]);
      } else if (mark === "-") {
        if (src[srcIndex] !== text) {
          throw new Error("Patch deletion mismatch near source line " + (srcIndex + 1));
        }
        srcIndex++;
      } else if (mark === "+") {
        out.push(text);
      } else if (line.length === 0) {
        // Empty line between hunks or trailing newline.
      }
      i++;
    }
  }

  while (srcIndex < src.length) out.push(src[srcIndex++]);
  return out.join("\n");
}

function applyPatchFile(relativePath, patchPath) {
  const target = path.join(outDir, relativePath);
  const patch = fs.readFileSync(path.join(__dirname, patchPath), "utf8");
  const source = fs.readFileSync(target, "utf8");
  fs.writeFileSync(target, applyUnifiedDiff(source, patch));
}
function applyPatchFiles(relativePath, patchPaths) {
  const target = path.join(outDir, relativePath);
  const patch = patchPaths.map(p => fs.readFileSync(path.join(__dirname, p), "utf8")).join("\n");
  const source = fs.readFileSync(target, "utf8");
  fs.writeFileSync(target, applyUnifiedDiff(source, patch));
}

applyPatchFile("src/game_logic.js", "patches/survival_plus10_game_logic.patch");
applyPatchFiles("src/game_logic.js", [
  "patches/island32_game_logic_01.patch",
  "patches/island32_game_logic_02.patch",
  "patches/island32_game_logic_03.patch",
  "patches/island32_game_logic_04.patch",
  "patches/island32_game_logic_05.patch",
  "patches/island32_game_logic_06.patch",
  "patches/island32_game_logic_07.patch",
  "patches/island32_game_logic_08.patch"
]);
applyPatchFile("src/camp_logistics.js", "patches/island32_camp_logistics.patch");
applyPatchFile("src/game_logic.js", "patches/living33_game_logic.patch");

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

const indexPath = path.join(outDir, "index.html");
let index = fs.readFileSync(indexPath, "utf8")
  .replaceAll("Trosečník 3D 3.1 · Survival Expedition", "Trosečník 3D 3.3 · Living Island & Progression")
  .replace("SURVIVAL EXPEDITION · <i>3.1</i>", "LIVING ISLAND & PROGRESSION · <i>3.3</i>")
  .replace("TROSEČNÍK 3D 3.1 · SURVIVAL EXPEDITION", "TROSEČNÍK 3D 3.3 · LIVING ISLAND & PROGRESSION")
  .replace("Trosečník 3D 3.0 Alfa 1: Živý ostrov. První hratelná část verze 3.0 s táborovým skladem, nosností, novým batohem a dosavadními čtyřmi kapitolami.", "Trosečník 3D 3.3: Living Island & Progression. Skill tree, kvalita výbavy, stealth, zranění, jeskyně, vor, vztahy s NPC a dynamické události.")
  .replace('<button id="run" class="subaction">↟<small>BĚH</small></button>', '<button id="run" class="subaction">↟<small>BĚH</small></button><button id="crouchBtn" class="subaction">🤫<small>PLÍŽIT</small></button>');
fs.writeFileSync(indexPath, index);

const stylePath = path.join(outDir, "src/style.css");
fs.appendFileSync(stylePath, "\n#rightActions{flex-wrap:wrap;justify-content:flex-end;max-width:235px}\n");

const manifestPath = path.join(outDir, "manifest.webmanifest");
fs.writeFileSync(manifestPath, JSON.stringify({
  name:"Trosečník 3D 3.3 · Living Island & Progression",
  short_name:"Trosečník 3D",
  description:"Hlubší survival: skill tree, kvalita výbavy, stealth a hluk, zranění, jeskyně, vor, vztahy s NPC a dynamické události.",
  start_url:"./",scope:"./",display:"standalone",orientation:"any",
  background_color:"#0c2229",theme_color:"#132c31",
  icons:[{src:"assets/icon.svg",sizes:"any",type:"image/svg+xml",purpose:"any maskable"}]
}));

const entry = path.join(outDir, "index.html");
if (!fs.existsSync(entry)) {
  throw new Error("Build completed, but dist/index.html is missing.");
}

console.log("Trosečník 3.3 Living Island & Progression prepared in dist/");
