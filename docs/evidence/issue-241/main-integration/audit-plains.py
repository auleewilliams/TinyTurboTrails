"""Read back the six integrated Plains journeys and both Retry observations."""
import hashlib, json, struct, subprocess
from pathlib import Path
root = Path.cwd()
packet = root / 'docs/evidence/issue-241/main-integration'
raw = root / 'playwright-report/issue-241/main-integration/artifacts'
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
read = lambda p: json.loads(Path(p).read_text())
journeys = []
for path in sorted(raw.glob('plains-contour-*/pilot-evidence.json')):
    data = read(path)
    assert data['errors'] == data['cleanupErrors'] == [] and data['historyError'] is None
    for file, digest in data['sourceHashes'].items():
        assert sha(root / file) == digest, file
    for response in data['served']:
        if response.get('sha256'):
            assert response['sha256'] == response['fileSha256'] == sha(root / ('dist' + response['path']))
    pngs = []
    for capture in data['captures']:
        assert capture['witness']['coherent'] and capture['accepted']
        for kind in ['canvas', 'viewport']:
            image = Path(capture[kind + 'Path'])
            assert sha(image) == capture[kind + 'SHA256']
            dimensions = struct.unpack('>II', image.read_bytes()[16:24])
            if kind == 'canvas': assert dimensions == (426, 240)
            pngs.append({'path': str(image.relative_to(root)), 'sha256': sha(image)})
    raster = read(path.parent / 'actual-ribbon-observer.json')
    cache = read(path.parent / 'actual-A-C-cache-hashes.json')
    assert raster['pixelFailures'] == raster['failures'] == []
    assert raster['columns'] == 4300 and raster['bodyPixelsCompared'] > 0
    assert raster['sourceSize'] == [80, 16] and raster['soilSize'] == [64, 64]
    image = path.parent / 'actual-A-C-cache.png'
    assert sha(image) == cache['PNGsha256']
    decoded = json.loads(subprocess.check_output(['node', '--input-type=module', '-e',
        "import { readFileSync } from 'node:fs'; import { createHash } from 'node:crypto'; import { decodePng } from './scripts/timbers-art.mjs'; const p = decodePng(readFileSync(process.argv[1])); console.log(JSON.stringify({ dimensions: [p.width,p.height], hash: createHash('sha256').update(p.data).digest('hex') }));", str(image)]))
    assert decoded['dimensions'] == cache['dimensions'] == raster['ribbonSize']
    assert decoded['hash'] == cache['RGBAsha256']
    assert raster['ribbonPixels']['sha256'] == cache['RGBAsha256']
    assert raster['ribbonPixels']['byteLength'] == cache['dimensions'][0] * cache['dimensions'][1] * 4
    assert sha(raster['ribbonPNG']['path']) == raster['ribbonPNG']['sha256'] == cache['PNGsha256']
    journeys.append({'project': data['project'], 'width': data['width'], 'evidenceSha256': sha(path),
        'cache': cache, 'comparedBodyPixels': raster['bodyPixelsCompared'], 'captures': pngs,
        'bodyReadErrors': [r for r in data['served'] if r.get('error')]})
assert {(j['project'], j['width']) for j in journeys} == {(b, w) for b in ['chromium', 'firefox', 'webkit'] for w in [426, 320]}
failed = raw / 'plains-contour-pilot-Plain-d2556-fers-ordinary-Retry-loading-webkit'
history = read(failed / 'raw-frame-contact-input-history.json')
samples = [r for r in history['controller']['records'] if r.get('goal') == 'traverse']
retry_raw = root / 'playwright-report/issue-241/main-integration-retry/artifacts'
retry = next(retry_raw.glob('*/retry-recovery-evidence.json'))
data = read(retry)
assert data['historyError'] is None and data['cleanupErrors'] == []
assert len(data['recoveryWitnesses']) == 3
result = {'journeys': journeys, 'failedRetry': {'historySha256': sha(failed / 'raw-frame-contact-input-history.json'),
    'recoveryEvidenceSha256': sha(failed / 'retry-recovery-evidence.json'), 'traverseSamples': len(samples),
    'lateSamples': sum(bool(r.get('late')) for r in samples), 'lastSample': samples[-1]['sample'],
    'completedGoals': len(history['controller']['results']), 'controllerError': history['controller']['error']},
    'unchangedIsolatedRetry': {'path': str(retry.relative_to(root)), 'sha256': sha(retry), 'recoveryWitnesses': data['recoveryWitnesses']}}
(packet / 'plains-readback.json').write_text(json.dumps(result, indent=2) + '\n')
print('Plains source/body/capture/cache readback:', len(journeys), 'journeys;', sum(len(j['captures']) for j in journeys), 'PNGs')
print('Failed Retry:', result['failedRetry'])
