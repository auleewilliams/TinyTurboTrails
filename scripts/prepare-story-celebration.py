"""Run with Python + Pillow from repository root. No generation or network calls."""
from pathlib import Path
from PIL import Image
import json

root = Path(__file__).resolve().parents[1]
original = Image.open(root / 'public/assets/henry/starter.png').convert('RGBA')
strip = Image.open(root / 'assets/source/henry/celebration/celebrate-48.png').convert('RGBA')
atlas = Image.new('RGBA', (192, 288))
atlas.paste(original, (0, 0))
for i in range(8):
    atlas.paste(strip.crop((i*48, 0, (i+1)*48, 48)), ((i%4)*48, 192+(i//4)*48))
assert atlas.crop((0, 0, 192, 192)).tobytes() == original.tobytes()
atlas.save(root / 'public/assets/henry/henry-celebration.png')
path = root / 'public/assets/henry/manifest.json'
manifest = json.loads(path.read_text())
manifest['image'] = 'henry-celebration.png'
manifest['frames'] = manifest['frames'][:16] + [dict(x=i%4*48, y=192+i//4*48, width=48, height=48) for i in range(8)]
manifest['animations']['celebrate'] = dict(frames=list(range(16,24)), frameSeconds=0.15, loop=False)
path.write_text(json.dumps(manifest, indent=2) + '\n')
out = root / 'public/assets/story'
out.mkdir(exist_ok=True)
Image.open(root / 'assets/source/story/generated-panels.png').resize((768,512), Image.Resampling.NEAREST).save(out / 'patchwork-vale.png')
print('Packaged story and celebration; original 16 gameplay frames pixel-identical.')
