# Trosečník 3D 2.1: Hlasy ostrova

Hratelné rozšíření původního samostatného 3D prototypu 2.0. Nepotřebuje externí knihovny, CDN, backend ani účet.

## Spuštění

- Otevři `TROSECNIK_3D_2_1_HLASY_OSTROVA.html` pro samostatné offline hraní (soubor je dodáván samostatně vedle ZIPu).
- Pro Vercel nasaď obsah tohoto projektu jako statický web (Framework Preset: Other, bez Build Command). V tomto balíčku jsou `index.html`, `src/`, `assets/` a `manifest.webmanifest`.
- Lokálně lze projekt spustit přes `python3 -m http.server 8000` a otevřít `http://localhost:8000`.
- Na iPhonu po nasazení v Safari: Sdílet → Přidat na plochu, pokud chceš hru bez běžných lišt prohlížeče.

## Nová kapitola a její následky

Po dokončení původního signálního stanoviště přijdou do hry dva noví 3D trosečníci: Mára, pracovitý a rychlý, ale opakovaně lže, sprostě mluví a krade věci; a Ivo, technicky zdatný, ale pomalý a občas mluví nesmysly. Oba mají vlastní dialogy, pohyb, skrýš a související úkoly. Příběh následně obsahuje **nevratnou volbu, koho Robinson zabije**. Násilí je zobrazeno pouze textově při přechodu scény. Příběh se rozvětví: pokud zůstane Ivo, oprava rádia trvá déle a přístřešek se poškodí; pokud zůstane Mára, znovu ukradne součástku a musíš ji najít, ale oprava je rychlejší. Obě větve končí odlišným vysíláním a jsou uloženy do aktuální pozice.

V nabídce Hra a nastavení → Postavy ostrova se zobrazí jejich vlastnosti i následky volby. Dosavadní survival, XP, dovednosti, stavění, výroba, rybaření, mobilní ovládání a tři pozice zůstávají.

## Záloha a kompatibilita

Zůstává původní ukládací klíč i schéma verze 2. Nová data příběhu jsou přidána jako `story` do stejné pozice; starší uložené pozice z prototypu 2.0 se doplní o prázdný nový příběh. Pro zachování automaticky uloženého postupu při nasazení na Vercel použij **stejný 3D projekt i doménu**. V menu je export/import JSON.

## Omezení

Prototyp používá stylizované nízkopolygonové 3D postavy, vlastní WebGL 2 renderer a jednoduché časované pracovní animace. Není to plnohodnotná hra s profesionálním motion capture. Zatím nemá síťovou synchronizaci uložených pozic ani dabované dialogy Máry a Iva. Volba smrti postavy neobsahuje explicitní animaci násilí.
