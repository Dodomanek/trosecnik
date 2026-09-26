# Trosečník 3D 3.1.1 · Survival+ 10

Tato větev rozšiřuje 3.1 Survival Expedition o deset survival mechanik. Vercel build nejdřív rozbalí původní 3.1 balíček a potom aplikuje Survival+ patch.

## Přidané systémy

1. Rozšířené dynamické počasí: mlha a vedro.
2. Mokrý stav postavy a rychlejší prochladnutí za mokra.
3. Morálka s vlivem na energii a pohyb.
4. Postih rychlosti při hladu, žízni, únavě a nízké morálce.
5. Komfort tábora, který zlepšuje odpočinek a léčení.
6. Palivo ohniště, spotřeba při vaření a možnost přikládat dřevo.
7. Třístupňový sběrač dešťové vody.
8. Série přežitých dnů s postupnou XP odměnou.
9. Broušení zbraní ve skladu za kámen a dočasný bonus poškození.
10. Tři jednorázové nouzové schránky na vzdálených místech ostrova.

## Kompatibilita

Stávající uložené pozice používají stejný save formát verze 2. Nové hodnoty se při načtení doplní výchozími hodnotami.

## Build

- Build command: `npm run build`
- Output directory: `dist`
- Zdroj: původní 3.1 ZIP + `patches/survival_plus10_game_logic.patch`
- Úpravy rendereru pro mlhu a vedro se aplikují v `build.cjs`.
