import {expect,it} from 'vitest';
import {createHash} from 'node:crypto';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,unlinkSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {createRequire} from 'node:module';
import {createRolloutEvidence,type RolloutAttachmentInfo} from './cove-rollout-evidence';
const require=createRequire(import.meta.url),{encodePng}=require('../scripts/spelling-stickers.mjs') as {encodePng(v:{width:number;height:number;data:Uint8Array}):Buffer};
const pixel=encodePng({width:1,height:1,data:Uint8Array.from([13,27,39,255])}),url='data:image/png;base64,'+pixel.toString('base64'),sha=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
function fixture(){const root=process.env.TMPDIR??'test-results';mkdirSync(root,{recursive:true});const dir=mkdtempSync(join(root,'rollout-evidence-SYNTHETIC-')),rows:{name:string;options:{body?:string|Buffer;path?:string;contentType:string}}[]=[];const info:RolloutAttachmentInfo={outputPath:(...p)=>join(dir,...p),attach:async(name,options)=>{rows.push({name,options});}};return {dir,rows,evidence:createRolloutEvidence(info)};}
// Execute the EXACT installed reporter class method (no browser/runner startup).
// Empty synthetic steps/errors/stdout avoid unrelated bundle dependencies.
function installedReport(rows:ReturnType<typeof fixture>['rows']){const source=readFileSync(join(dirname(require.resolve('playwright/package.json')),'lib/runner/index.js'),'utf8'),start=source.indexOf('var JSONReporter = class'),end=source.indexOf('async function outputReport(',start);expect(start).toBeGreaterThan(0);const Klass=new Function(source.slice(start,end)+';return JSONReporter;')() as {prototype:{_serializeTestResult(r:unknown,t:unknown):{attachments:{name:string;body?:string;path?:string;contentType:string}[]}}};const reporter=Object.create(Klass.prototype) as typeof Klass.prototype;return reporter._serializeTestResult({steps:[],errors:[],stdout:[],stderr:[],startTime:new Date('2000-01-01T00:00:00Z'),annotations:[],status:'passed',attachments:rows.map(r=>({name:r.name,...r.options}))},{});}
it('tiny SYNTHETIC repeated pose evidence stays complete in files, not amplified into the installed JSON reporter',async()=>{
 const {dir,evidence,rows}=fixture(),value={status:'synthetic, NOT native',frame:17,actor:{alphaPixels:1,overlap:0},flights:Array.from({length:64},(_,i)=>({rest:i,ascent:{status:'up'+i,png:url},descent:{status:'down'+i,png:url}}))};
 await evidence.observe('same-observation-name',value);await evidence.attach('same-independent-pose-name',{body:pixel,contentType:'image/png'});
 const observation=rows.find(r=>r.name==='same-observation-name')!;expect(observation.options.path).toBeDefined();expect(observation.options.body).toBeUndefined();const stored=JSON.parse(readFileSync(observation.options.path!,'utf8'));expect(stored.status).toBe(value.status);expect(stored.frame).toBe(17);expect(stored.actor).toEqual(value.actor);expect(stored.flights).toHaveLength(64);expect(JSON.stringify(stored)).not.toContain('data:image/png;base64,');
 const references=stored.flights.flatMap((v:{ascent:{png:{attachmentName:string;path:string;byteLength:number;sha256:string}};descent:{png:unknown}})=>[v.ascent.png,v.descent.png]);expect(new Set(references.map((r:{sha256:string})=>r.sha256)).size).toBe(1);
 for(let i=0;i<64;i++){expect(stored.flights[i].rest).toBe(i);expect(stored.flights[i].ascent.status).toBe('up'+i);expect(stored.flights[i].descent.status).toBe('down'+i);}
 for(const ref of references as {attachmentName:string;path:string;relativePath:string;byteLength:number;sha256:string}[]){const bytes=readFileSync(ref.path);expect(ref.path).toBe(join(dir,ref.relativePath));expect(bytes.equals(pixel)).toBe(true);expect(ref.byteLength).toBe(pixel.length);expect(ref.sha256).toBe(sha(pixel));expect(rows.some(r=>r.name===ref.attachmentName&&r.options.path===ref.path&&r.options.contentType==='image/png')).toBe(true);}
 const original=rows.find(r=>r.name==='same-independent-pose-name')!;expect(original.options.path).toBeDefined();expect(readFileSync(original.options.path!).equals(pixel)).toBe(true);
 const report=installedReport(rows);expect(report.attachments.every(a=>a.path&&!a.body)).toBe(true);
 const inline=installedReport([{name:'old-inline-amplification',options:{body:JSON.stringify(value),contentType:'application/json'}}]);expect(inline.attachments[0].body).toBeTruthy();expect(Buffer.byteLength(JSON.stringify(report))).toBeLessThan(Buffer.byteLength(JSON.stringify(inline)));
 const restored={...stored,flights:stored.flights.map((f:typeof stored.flights[number])=>({...f,ascent:{...f.ascent,png:'data:image/png;base64,'+readFileSync(f.ascent.png.path).toString('base64')},descent:{...f.descent,png:'data:image/png;base64,'+readFileSync(f.descent.png.path).toString('base64')}}))};expect(restored).toEqual(value);
 writeFileSync(join(dir,'SYNTHETIC-transport-measurement.json'),JSON.stringify({kind:'tiny synthetic fixture NOT native',inlineReporterBytes:Buffer.byteLength(JSON.stringify(inline)),fileBackedReporterBytes:Buffer.byteLength(JSON.stringify(report)),observationBytes:readFileSync(observation.options.path!).length,imageReferenceCount:references.length,uniqueRetainedImageCount:new Set(references.map((r:{sha256:string})=>r.sha256)).size,fullValueReconstructed:true},null,2)+'\n');
 await evidence.assertIntegrity();
});
it('shared transport fails closed on missing or corrupted retained evidence, without regenerating it',async()=>{
 const {evidence,rows}=fixture();await evidence.attach('complete-pose',{body:pixel,contentType:'image/png'});expect(rows[0].options.path).toBeDefined();const path=rows[0].options.path!;unlinkSync(path);await expect(evidence.assertIntegrity()).rejects.toThrow();
 const other=fixture();await other.evidence.observe('metadata',{status:'synthetic',png:url});const png=other.rows.find(r=>r.options.contentType==='image/png')!;expect(png.options.path).toBeDefined();const bad=Buffer.from(pixel);bad[bad.length-1]^=1;writeFileSync(png.options.path!,bad);await expect(other.evidence.assertIntegrity()).rejects.toThrow();
});

it('rejects malformed PNG transport rather than dropping image evidence',async()=>{const {evidence}=fixture();await expect(evidence.observe('bad',{png:'data:image/png;base64,not-a-complete-image'})).rejects.toThrow();});
