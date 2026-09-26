from pathlib import Path
import re
root=Path(__file__).resolve().parent
source=(root/'index.html').read_text('utf-8')
source=source.replace('<link rel="manifest" href="manifest.webmanifest">','').replace('<link rel="icon" href="assets/icon.svg" type="image/svg+xml">','')
source=source.replace('<link rel="stylesheet" href="src/style.css">','<style>\n'+(root/'src/style.css').read_text('utf-8')+'\n</style>')
source=source.replace('<script src="src/game.js"></script>','<script>\n'+(root/'src/game.js').read_text('utf-8')+'\n</script>')
filename=root.parent/'TROSECNIK_3D_2_1_HLASY_OSTROVA.html'
filename.write_text(source,'utf-8')
print('Samostatné HTML:',filename,'velikost',filename.stat().st_size)
