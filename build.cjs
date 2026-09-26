const fs = require("fs");
const path = require("path");
const AdmZip = require("adm-zip");

const baseZipName = "TROSECNIK_3D_3_1_SURVIVAL_EXPEDITION_VERCEL (1).zip";
const visualZipName = "TROSECNIK_3D_3_2_VISUAL_FINAL_GITHUB.zip";
const baseZipPath = path.join(__dirname, baseZipName);
const visualZipPath = path.join(__dirname, visualZipName);
const outDir = path.join(__dirname, "dist");
const visualTmp = path.join(__dirname, ".visual-final-tmp");

for (const p of [baseZipPath, visualZipPath]) {
  if (!fs.existsSync(p)) throw new Error("Missing source package: " + path.basename(p));
}

fs.rmSync(outDir, { recursive: true, force: true });
fs.rmSync(visualTmp, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(visualTmp, { recursive: true });

new AdmZip(baseZipPath).extractAllTo(outDir, true);
new AdmZip(visualZipPath).extractAllTo(visualTmp, true);

function findProjectRoot(root) {
  if (fs.existsSync(path.join(root, "index.html"))) return root;
  const queue=[root];
  while(queue.length){
    const dir=queue.shift();
    for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
      if(!ent.isDirectory()) continue;
      const p=path.join(dir,ent.name);
      if(fs.existsSync(path.join(p,"index.html"))) return p;
      queue.push(p);
    }
  }
  throw new Error("Visual Final package has no index.html");
}

const visualRoot=findProjectRoot(visualTmp);

function copyIfExists(src,dst){
  if(!fs.existsSync(src)) return false;
  fs.mkdirSync(path.dirname(dst),{recursive:true});
  const st=fs.statSync(src);
  if(st.isDirectory()) fs.cpSync(src,dst,{recursive:true,force:true});
  else fs.copyFileSync(src,dst);
  return true;
}

// Visual Final is allowed to own the graphics layer, not gameplay/save/UI logic.
copyIfExists(path.join(visualRoot,"assets"),path.join(outDir,"assets"));
copyIfExists(path.join(visualRoot,"graphics"),path.join(outDir,"graphics"));
for(const f of ["renderer.js","glb_loader.js","graphics_debug.js"]){
  copyIfExists(path.join(visualRoot,"src",f),path.join(outDir,"src",f));
}
// Preserve Visual Final CSS as a lower-priority layer; 3.3.1 UI CSS loads after it.
copyIfExists(path.join(visualRoot,"src","style.css"),path.join(outDir,"src","visual_final.css"));

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
        if (src[srcIndex] !== text) throw new Error("Patch context mismatch near source line " + (srcIndex + 1));
        out.push(src[srcIndex++]);
      } else if (mark === "-") {
        if (src[srcIndex] !== text) throw new Error("Patch deletion mismatch near source line " + (srcIndex + 1));
        srcIndex++;
      } else if (mark === "+") out.push(text);
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

// Gameplay progression from 3.1 -> 3.2 -> 3.3.
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

// Keep the 3.3 weather modes even when Visual Final supplies a newer renderer.
const rendererPath = path.join(outDir, "src/renderer.js");
let renderer = fs.readFileSync(rendererPath, "utf8");
function rendererUpgrade(from,to,label){
  if(renderer.includes(to)) return;
  if(renderer.includes(from)) renderer=renderer.replace(from,to);
  else console.warn("Visual renderer has no legacy anchor for "+label+"; keeping its implementation.");
}
rendererUpgrade(
  "    const badWeather=weather==='storm'?.53:weather==='rain'?.25:0;",
  "    const badWeather=weather==='storm'?.53:weather==='rain'?.25:weather==='fog'?.18:0;\n    const heat=weather==='heat'?1:0, mist=weather==='fog'?1:0;",
  "weather modes"
);
rendererUpgrade(
  "    const skyDay=new THREE.Color(0x79aebc);",
  "    const skyDay=new THREE.Color(0x79aebc).lerp(new THREE.Color(0x9ab8b2),mist*.55).lerp(new THREE.Color(0xaac6cc),heat*.22);",
  "fog/heat sky"
);
rendererUpgrade(
  "    this.sun.intensity=.10+day*(1.92+golden*.55)*(1-badWeather*.6);",
  "    this.sun.intensity=.10+day*(1.92+golden*.55)*(1-badWeather*.6)*(1+heat*.12);",
  "heat sunlight"
);
fs.writeFileSync(rendererPath, renderer);

// Bring the base document to the 3.3 layout before applying 3.3.1 UI polish.
const indexPath = path.join(outDir, "index.html");
let index = fs.readFileSync(indexPath, "utf8")
  .replaceAll("Trosečník 3D 3.1 · Survival Expedition", "Trosečník 3D 3.3 · Living Island & Progression")
  .replace("SURVIVAL EXPEDITION · <i>3.1</i>", "LIVING ISLAND & PROGRESSION · <i>3.3</i>")
  .replace("TROSEČNÍK 3D 3.1 · SURVIVAL EXPEDITION", "TROSEČNÍK 3D 3.3 · LIVING ISLAND & PROGRESSION")
  .replace("Trosečník 3D 3.0 Alfa 1: Živý ostrov. První hratelná část verze 3.0 s táborovým skladem, nosností, novým batohem a dosavadními čtyřmi kapitolami.", "Trosečník 3D 3.3: Living Island & Progression. Skill tree, kvalita výbavy, stealth, zranění, jeskyně, vor, vztahy s NPC a dynamické události.")
  .replace('<button id="run" class="subaction">↟<small>BĚH</small></button>', '<button id="run" class="subaction">↟<small>BĚH</small></button><button id="crouchBtn" class="subaction">🤫<small>PLÍŽIT</small></button>');
fs.writeFileSync(indexPath,index);

const stylePath=path.join(outDir,"src/style.css");
fs.appendFileSync(stylePath,"\n#rightActions{flex-wrap:wrap;justify-content:flex-end;max-width:235px}\n");

// Apply the real 3.3.1 inventory/crafting/quests redesign last.
applyPatchFile("src/game_logic.js","patches/ui331_game_logic.patch");
applyPatchFile("src/style.css","patches/ui331_style.patch");
applyPatchFile("index.html","patches/ui331_index.patch");

// Load Visual Final's CSS underneath the UI-polish CSS.
index=fs.readFileSync(indexPath,"utf8");
if(fs.existsSync(path.join(outDir,"src","visual_final.css")) && !index.includes("visual_final.css")){
  index=index.replace('<link rel="stylesheet" href="src/style.css">','<link rel="stylesheet" href="src/visual_final.css"><link rel="stylesheet" href="src/style.css">');
}
index=index
  .replaceAll("Trosečník 3D 3.3 · Living Island & Progression","Trosečník 3D 3.3.1 · Visual Final + UI Polish")
  .replace("LIVING ISLAND & PROGRESSION · <i>3.3</i>","VISUAL FINAL + UI POLISH · <i>3.3.1</i>")
  .replaceAll("TROSEČNÍK 3D 3.2 · EXPEDITION & ISLAND LIFE","TROSEČNÍK 3D 3.3.1 · VISUAL FINAL + UI POLISH");
fs.writeFileSync(indexPath,index);

fs.writeFileSync(path.join(outDir,"manifest.webmanifest"),JSON.stringify({
  name:"Trosečník 3D 3.3.1 · Visual Final + UI Polish",
  short_name:"Trosečník 3D",
  description:"MEGA build: Visual Final grafika spojená s Living Island 3.3 gameplayem a UI Polish 3.3.1.",
  start_url:"./",scope:"./",display:"standalone",orientation:"any",
  background_color:"#0c2229",theme_color:"#132c31",
  icons:[{src:"assets/icon.svg",sizes:"any",type:"image/svg+xml",purpose:"any maskable"}]
}));

fs.writeFileSync(path.join(outDir,"MEGA_MERGE_README.txt"),
  "TROSEČNÍK 3D 3.3.1 – VISUAL FINAL + UI POLISH\n\n"+
  "Základ gameplaye: Living Island & Progression 3.3.\n"+
  "UI: 3.3.1 UI Polish – Batoh, Výroba, Úkoly.\n"+
  "Grafická vrstva: TROSECNIK_3D_3_2_VISUAL_FINAL_GITHUB.zip.\n"+
  "Visual Final přebírá assety a renderer; gameplay/save/UI logika zůstává z novější verze.\n"
);

// Create one downloadable mega archive inside the deployed output.
const megaZipPath=path.join(outDir,"TROSECNIK_3D_3_3_1_VISUAL_UI_MEGA.zip");
const mega=new AdmZip();
mega.addLocalFolder(outDir);
mega.writeZip(megaZipPath);

fs.rmSync(visualTmp,{recursive:true,force:true});
if(!fs.existsSync(path.join(outDir,"index.html"))) throw new Error("Build completed, but dist/index.html is missing.");
console.log("Trosečník 3.3.1 Visual Final + UI Polish MEGA prepared in dist/");
console.log("Download bundle: "+path.basename(megaZipPath));
