import json,hashlib,pathlib,shutil,collections,struct,sys,zlib,base64
root=pathlib.Path.cwd();raw=root/sys.argv[1];out=root/sys.argv[2];out.mkdir(parents=True,exist_ok=True)
sha=lambda p:hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
read=lambda p:json.loads(pathlib.Path(p).read_text())
def pngInfo(p):
 b=p.read_bytes();assert b[:8]==bytes.fromhex('89504e470d0a1a0a');offset=8;compressed=b'';header=None;ended=False
 while offset<len(b):
  length=int.from_bytes(b[offset:offset+4],'big');kind=b[offset+4:offset+8];data=b[offset+8:offset+8+length];end=offset+12+length
  assert end<=len(b) and zlib.crc32(kind+data)==int.from_bytes(b[end-4:end],'big')
  if kind==b'IHDR':header=struct.unpack('>IIBBBBB',data)
  if kind==b'IDAT':compressed+=data
  if kind==b'IEND':assert length==0 and end==len(b);ended=True
  offset=end
 assert header and ended
 w,h,depth,colour,compression,filtering,interlace=header
 assert depth==8 and colour in [2,6] and compression==filtering==interlace==0
 decoder=zlib.decompressobj();pixels=decoder.decompress(compressed)+decoder.flush();assert decoder.eof and not decoder.unused_data
 row=w*({2:3,6:4}[colour])+1;assert len(pixels)==row*h and all(pixels[y*row]<=4 for y in range(h))
 return [w,h]
r=read(raw/'browser-report.json');cases=[]
def walk(s):
 for p in s.get('specs',[]):
  for t in p['tests']:cases.append(dict(project=t['projectName'],file=p['file'],title=p['title'],id=p['id'],status=t['status'],expectedStatus=t['expectedStatus'],results=t['results']))
 for c in s.get('suites',[]):walk(c)
for s in r['suites']:walk(s)
if len(sys.argv)>3:
 configured=read(root/sys.argv[3]);key=lambda c:(c['project'],c['file'],c['title'],c['id'])
 assert collections.Counter(map(key,cases))==collections.Counter(map(key,configured))
assert all(len(c['results'])==1 and c['results'][0]['retry']==0 for c in cases)
attachments={};curated=[];inline=[]
for c in cases:
 for result in c['results']:
  for a in result.get('attachments',[]):
   if a.get('path'):
    attachments[a['path']]=sha(a['path'])
    if a['contentType']=='image/png':pngInfo(pathlib.Path(a['path']))
   elif a.get('body'):
    body=base64.b64decode(a['body'],validate=True);digest=hashlib.sha256(body).hexdigest()
    suffix={'image/png':'.png','application/json':'.json','text/plain':'.txt'}.get(a['contentType'],'.bin')
    target=out/'inline'/(digest+suffix);target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(body)
    entry=dict(caseId=c['id'],project=c['project'],name=a['name'],contentType=a['contentType'],sha256=digest,path=str(target.relative_to(root)))
    if suffix=='.png':entry['dimensions']=pngInfo(target)
    if suffix=='.json':
     value=json.loads(body);entry['jsonKeys']=list(value) if isinstance(value,dict) else None
    inline.append(entry)
for directory in (raw/'artifacts').iterdir():
 if not directory.is_dir():continue
 for p in directory.iterdir():
  if not p.is_file():continue
  if (directory.name.startswith('timbers-art-') and p.suffix in ['.json','.png']) or p.name in ['error-context.md','test-failed-1.png']:
   target=out/directory.name/p.name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(p,target);assert sha(target)==sha(p)
   curated.append(dict(original=str(p.relative_to(root)),path=str(target.relative_to(root)),sha256=sha(p)))
journeys=[]
for p in sorted((raw/'artifacts').glob('timbers-art-*/*journey.json')):
 j=read(p);captures=[];visible=set();gaps=[];allDraws=[]
 for meta in sorted(p.parent.glob('*.json')):
  m=read(meta)
  for kind in ['native','css']:
   if kind+'Sha256' not in m:continue
   png=p.parent/(meta.stem+'-'+kind+'.png');assert sha(png)==m[kind+'Sha256']
   dims=pngInfo(png);assert dims[0]==(426 if kind=='native' else j['width'])
   captures.append(dict(path=str(png.relative_to(root)),sha256=sha(png),dimensions=dims))
  if meta.name=='pause.json':assert sha(p.parent/'pause.png')==m['sha256']
  if not m.get('probe'):continue
  draws=m['probe']['frameDraws'];ground=next(d for d in draws if d['source'].endswith('/terrain-kit-v1/ground.png'))
  camera=dict(x=40-ground['x'],y=1080-ground['y'])
  inv=read(root/'docs/evidence/issue-241/inventory.json')
  for support in inv['supports']:
   matched=[d for d in draws if d['source'].endswith('/branch-'+str(support['width'])+'.png') and abs(d['x']-(support['x']-camera['x']))<1e-6 and abs(d['y']-(support['y']-camera['y']))<1e-6]
   assert len(matched)==1,(p,support['id']);d=matched[0];assert d['width']==support['width'] and d['height']==17
   if d['x']<426 and d['x']+d['width']>0 and d['y']<240 and d['y']+d['height']>0:visible.add(support['id'])
  if meta.stem=='under-spring':
   spring=next(d for d in draws if d['width']==150 and abs(d['y']-(m['probe']['actor']['feet']['y']-60))<1)
   gap=m['probe']['actor']['bounds']['top']-spring['y']-spring['height'];assert gap>=2;gaps.append(gap)
 # Successful cases require complete bindings; failed pilot observations retain partial evidence honestly.
 case=next(c for c in cases if any(a.get('path') and pathlib.Path(a['path']).parent.parent==p.parent and a['name'] in ['journey','left-journey'] for result in c['results'] for a in result.get('attachments',[])))
 if case['status']=='expected':
  assert not j['errors'] and all(h['result']['done'] and not h['result']['error'] for h in j['histories'])
  for response in j.get('responses',[]):
   if response.get('sha256'):assert response['sha256']==response['buildSha256']==sha(root/('dist'+response['path']))
  # Test source may belong to an earlier preserved pilot; runtime and build must still match.
  for path,h in j['files'].items():
   if len(sys.argv)>3 or not path.startswith('tests/'):assert sha(root/path)==h,path
 journeys.append(dict(directory=str(p.parent.relative_to(root)),browser=j['browser'],width=j['width'],kind=p.name,status=case['status'],routeGroups=len(j['histories']),pngs=captures,visibleSupports=sorted(visible),springGap=gaps,bodyReadErrors=[x for x in j.get('responses',[]) if x.get('error')]))
summary=dict(rawReport=str((raw/'browser-report.json').relative_to(root)),reportSha256=sha(raw/'browser-report.json'),stats=r['stats'],cases=[{k:v for k,v in c.items() if k!='results'}|{'attempts':[{'status':a['status'],'retry':a['retry'],'duration':a['duration'],'errors':a.get('errors',[]),'annotations':a.get('annotations',[])} for a in c['results']]} for c in cases],journeys=journeys,fileAttachments=attachments,inlineAttachments=inline,curatedFiles=curated,note='Complete original report/traces/file outputs remain in the ignored local archive. This repository packet contains curated captures and exact hashes; historical failures are retained, not relabelled.')
(out/'verification.json').write_text(json.dumps(summary,indent=2)+'\n')
print(r['stats']);print('Cases',len(cases),'attachments',len(attachments),'journeys',len(journeys),'curated',len(curated),'inline',len(inline));print('Visible support union',len(set(x for j in journeys for x in j['visibleSupports'])))
