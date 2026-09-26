# TROSEČNÍK 3D 3.3.1 — VISUAL FINAL + UI POLISH MEGA

Tato větev spojuje dva zdroje do jednoho výsledného buildu:

- **TROSECNIK_3D_3_2_VISUAL_FINAL_GITHUB.zip** — grafická vrstva.
- **Living Island & Progression 3.3 + UI Polish 3.3.1** — novější gameplay, save systém, batoh, výroba a úkoly.

## Pravidla merge

Visual Final přebírá:
- `assets/`
- `graphics/`
- `src/renderer.js`
- `src/glb_loader.js`
- `src/graphics_debug.js`
- původní Visual Final CSS se načítá jako spodní vizuální vrstva.

Novější 3.3.1 zůstává autoritou pro:
- `src/game_logic.js`
- `src/camp_logistics.js`
- questy, inventář, crafting, XP a survival pravidla
- save kompatibilitu
- nové UI Batohu, Výroby a Úkolů
- finální `src/style.css` a `index.html`

## Build

```bash
npm install
npm run build
```

Výstup vznikne v `dist/`.

Build navíc vytvoří jeden stažitelný archiv:

`dist/TROSECNIK_3D_3_3_1_VISUAL_UI_MEGA.zip`

Tento ZIP obsahuje již sloučenou hru, ne dva vnořené projekty.
