"""Package the generated strip as review assets, without changing game assets."""
from pathlib import Path
import importlib.util
from PIL import Image, ImageDraw

ROOT = Path(__file__).parent

def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--normalizer', required=True)
    args = parser.parse_args()
    spec = importlib.util.spec_from_file_location('normalizer', args.normalizer)
    normalizer = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(normalizer)
    source = Image.open(ROOT / 'generated-strip.png').convert('RGBA')
    contents = [normalizer.crop_to_content(slot, 8) for slot in normalizer.split_strip(source, 8)]
    width, height = normalizer.max_content_size(contents)
    scale = min(40 / width, 40 / height)
    frames = []
    (ROOT / 'frames').mkdir(exist_ok=True)
    strip = Image.new('RGBA', (384, 48))
    for index, content in enumerate(contents):
        frame = Image.new('RGBA', (48, 48))
        frame.alpha_composite(normalizer.compose_frame(content, 40, scale), (4, 4))
        frame.save(ROOT / 'frames' / f'{index + 1:02d}.png')
        strip.alpha_composite(frame, (index * 48, 0))
        frames.append(frame)
    strip.save(ROOT / 'celebrate-48.png')
    preview = Image.new('RGB', (8 * 208, 260), '#132d36')
    draw = ImageDraw.Draw(preview)
    labels = ['READY', 'CROUCH', 'TAKEOFF', 'CHEER', 'DESCEND', 'LAND', 'RISE', 'VICTORY']
    for index, frame in enumerate(frames):
        enlarged = frame.resize((192, 192), Image.Resampling.NEAREST)
        preview.paste(enlarged, (index * 208 + 8, 20), enlarged)
        draw.text((index * 208 + 12, 226), f'{index + 1}. {labels[index]}', fill='#ffda75')
    preview.save(ROOT / 'preview.png')
    print('Verified frame count:', len(frames))
    print('Shared scale:', scale)
    print('Frame bounds:', [frame.getbbox() for frame in frames])
    assert len(frames) == 8
    for frame in frames:
        assert frame.size == (48, 48)
        alpha_min, alpha_max = frame.getchannel('A').getextrema()
        assert alpha_min == 0 and alpha_max >= 250
        x0, y0, x1, y1 = frame.getbbox()
        assert x0 >= 4 and y0 >= 4 and x1 <= 44 and y1 <= 44

if __name__ == '__main__':
    main()
