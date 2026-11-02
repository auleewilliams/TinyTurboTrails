import json, hashlib, collections, pathlib, shutil, struct
root=pathlib.Path.cwd()
raw=root/'playwright-report/issue-241/tree-full'
out=root/'docs/evidence/issue-241/tree-preview/full-browser'
verify=root/'docs/evidence/issue-241/tree-preview/verification'
sha=lambda p: hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
read=lambda p: json.loads(pathlib.Path(p).read_text())
report=read(raw/'browser-report.json')
configured=read(verify/'configured-cases.json')
candidate=read(verify/'candidate.json')
assert len(candidate['files'])==255
for p,h in candidate['files'].items(): assert sha(p)==h,p
assert sha('docs/timbers-art-plan-241.md')=='1ea684431a242f9163f817b5d5b7b39277624a67e7270f0797a3153406cf7e3c'
cases=[]
def walk(suite):
 for spec in suite.get('specs',[]):
  for test in spec['tests']:
   cases.append(dict(project=test['projectName'],file=spec['file'],title=spec['title'],id=spec['id'],status=test['status'],expectedStatus=test['expectedStatus'],timeout=test['timeout'],annotations=test.get('annotations',[]),results=test['results']))
 for s in suite.get('suites',[]): walk(s)
for s in report['suites']:walk(s)
identity=lambda c:(c['project'],c['file'],c['title'],c['id'])
assert collections.Counter(map(identity,cases))==collections.Counter(map(identity,configured))
assert len(cases)==699
assert all(len(c['results'])==1 and c['results'][0]['retry']==0 for c in cases)
out.mkdir(parents=True,exist_ok=True)
files={}; inline=0
for c in cases:
 for r in c['results']:
  for a in r.get('attachments',[]):
   if a.get('path'):
    p=pathlib.Path(a['path']);assert p.is_relative_to(raw),p
    files[str(p.relative_to(root))]=sha(p)
   elif 'body' in a: inline+=1
# Curate Timbers output files and failure screenshots/context, retaining complete raw outputs locally.
curated=[]
for directory in (raw/'artifacts').iterdir():
 if not directory.is_dir():continue
 for p in directory.iterdir():
  if not p.is_file():continue
  if (directory.name.startswith('timbers-art-') and p.suffix in ['.json','.png']) or p.name in ['error-context.md','test-failed-1.png']:
   target=out/directory.name/p.name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(p,target)
   assert sha(target)==sha(p)
   curated.append(dict(original=str(p.relative_to(root)),path=str(target.relative_to(root)),sha256=sha(p)))
journeys=[]
for p in sorted((raw/'artifacts').glob('timbers-art-*/journey.json')):
 j=read(p);directory=p.parent
 assert j['errors']==[],p
 assert len(j['histories'])==12 and all(h['result']['done'] and not h['result']['error'] for h in j['histories'])
 for f,h in j['files'].items():assert sha(f)==h,(p,f)
 captures=[]
 for meta in sorted(directory.glob('*.json')):
  if meta.name=='journey.json':continue
  m=read(meta);name=meta.stem
  for kind in ['native','css']:
   if kind+'Sha256' not in m:continue
   png=directory/(name+'-'+kind+'.png');assert sha(png)==m[kind+'Sha256'],png
   dims=list(struct.unpack('>II',png.read_bytes()[16:24]))
   if kind=='native':assert dims==[426,240]
   else:assert dims[0]==j['width']
   captures.append(dict(name=png.name,sha256=sha(png),dimensions=dims))
  if name=='map':assert m['treeRenders']>0;continue
  draws=m['probe']['frameDraws'];trees=[d for d in draws if d['source'].endswith('/timbers/tree-v1/tree.png')]
  assert len(trees)==1 and [trees[0]['width'],trees[0]['height']]==[576,960]
  assert draws.index(trees[0])<next(i for i,d in enumerate(draws) if '/timbers/terrain-kit-v1/' in d['source'])
  if name in ['roots','tree-base','returned-roots']:assert abs(trees[0]['y']+940-m['probe']['actor']['feet']['y'])<1e-5
  if name=='under-spring':
   spring=[d for d in draws if d['width']==150 and abs(d['y']-(m['probe']['actor']['feet']['y']-60))<1]
   assert len(spring)==1
   gap=m['probe']['actor']['bounds']['top']-spring[0]['y']-spring[0]['height'];assert gap>=2
 assert len(captures)==25
 for r in j['responses']:
  if r.get('sha256'):assert r['sha256']==r['buildSha256']==sha(root/('dist'+r['path']))
 expected=['/assets/timbers/tree-v1/manifest.json','/assets/timbers/tree-v1/tree.png']
 expected.extend('/assets/timbers/terrain-kit-v1/'+f for f in ['manifest.json','ground.png']+sorted({p['image'] for p in read('public/assets/timbers/terrain-kit-v1/manifest.json')['platforms'].values()}))
 for path in expected:assert any(r['path']==path and r['status']==200 and r.get('sha256') for r in j['responses']),path
 journeys.append(dict(path=str(p.relative_to(root)),browser=j['browser'],version=j['version'],width=j['width'],routeGroups=len(j['histories']),pngCount=len(captures),clearancePx=gap,mapTreeRenders=read(directory/'map.json')['treeRenders'],pngs=captures,responseBodyErrors=[r for r in j['responses'] if r.get('error')]))
assert len(journeys)==6 and {(j['browser'],j['width']) for j in journeys}=={(b,w) for b in ['chromium','firefox','webkit'] for w in [426,320]}
def reduced(c):
 c=dict(c);c['results']=[{**{k:v for k,v in r.items() if k!='attachments'},'attachments':[{k:v for k,v in a.items() if k!='body'} for a in r.get('attachments',[])]} for r in c['results']];return c
summary=dict(rawReport=str((raw/'browser-report.json').relative_to(root)),reportSha256=sha(raw/'browser-report.json'),candidateSha256=sha(verify/'candidate.json'),candidateFilesUnchanged=255,configuredCases=len(configured),reportedCases=len(cases),identityReconciliation='exact match including multiplicities',stats=report['stats'],statusCounts=dict(collections.Counter(c['status'] for c in cases)),attemptStatuses=dict(collections.Counter(r['status'] for c in cases for r in c['results'])),attempts=sum(len(c['results']) for c in cases),retries=0,runnerErrors=report['errors'],nonPassing=[reduced(c) for c in cases if c['status']!='expected'],timbersCases=[reduced(c) for c in cases if c['file']=='timbers-art.spec.ts'],journeys=journeys,fileBackedAttachments=files,inlineAttachmentCount=inline,curatedFiles=curated,archiveNote='The exact raw JSON report, run log and complete original file-backed outputs remain in the ignored local playwright-report/issue-241/tree-full directory. Absolute report attachment paths resolve directly here; no remapping is needed. This repository packet contains curated Timbers captures/metadata and failed-case screenshots/context. The full raw archive is not committed or uploaded. Historical terrain-only evidence remains separate and unchanged.')
(out/'verification.json').write_text(json.dumps(summary,indent=2)+'\n')
(out/'case-results.json').write_text(json.dumps([{k:v for k,v in c.items() if k!='results'}|{'attempts':[{'status':r['status'],'retry':r['retry'],'duration':r['duration']} for r in c['results']]} for c in cases],indent=2)+'\n')
print(json.dumps({k:summary[k] for k in ['stats','statusCounts','attemptStatuses','candidateFilesUnchanged']},indent=2))
print('Verified',len(journeys),'journeys;',sum(j['pngCount'] for j in journeys),'PNGs;',len(files),'file attachments;',len(curated),'curated files')
print('Nonpassing',[(c['project'],c['title'],c['status']) for c in cases if c['status']!='expected'])
