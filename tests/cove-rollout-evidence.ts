import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {dirname} from 'node:path';

export interface RolloutAttachmentInfo {
  outputPath(...segments: string[]): string;
  attach(name: string, options: {body?: string | Buffer; path?: string; contentType: string}): Promise<void>;
}
export interface RolloutEvidenceReference {
  kind: 'rollout-evidence-file';
  attachmentName: string;
  contentType: string;
  path: string;
  relativePath: string;
  byteLength: number;
  sha256: string;
}
const hash = (bytes: Buffer): string => createHash('sha256').update(bytes).digest('hex');

/** Preserve complete evidence in the case output directory, without inlining it in JSON reports. */
export function createRolloutEvidence(info: RolloutAttachmentInfo) {
  const retained = new Map<string, {byteLength: number; sha256: string}>();
  const images = new Map<string, RolloutEvidenceReference>();
  const verify = async (path: string): Promise<void> => {
    const expected=retained.get(path);
    if(!expected)throw new Error('Unregistered rollout evidence: '+path);
    const bytes=await readFile(path);
    if(bytes.length!==expected.byteLength||hash(bytes)!==expected.sha256)throw new Error('Rollout evidence bytes changed: '+path);
  };
  const attach = async (name: string, options: {body: string | Buffer; contentType: string}): Promise<RolloutEvidenceReference> => {
    const bytes=Buffer.isBuffer(options.body)?options.body:Buffer.from(options.body),sha256=hash(bytes);
    const extension=options.contentType==='image/png'?'png':options.contentType==='application/json'?'json':'txt';
    const path=info.outputPath('rollout-evidence',sha256+'.'+extension);
    if(retained.has(path))await verify(path);
    else {
      await mkdir(dirname(path),{recursive:true});
      await writeFile(path,bytes,{flag:'wx'});
      retained.set(path,{byteLength:bytes.length,sha256});
      await verify(path);
    }
    // Playwright copies path attachments to its retained attachments directory.
    // The native JSON reporter receives a path and no body/base64 payload.
    await info.attach(name,{path,contentType:options.contentType});
    return {kind:'rollout-evidence-file',attachmentName:name,contentType:options.contentType,path,relativePath:'rollout-evidence/'+sha256+'.'+extension,byteLength:bytes.length,sha256};
  };
  const compact = async (value: unknown): Promise<unknown> => {
    if(typeof value==='string'&&value.startsWith('data:image/png;base64,')) {
      const payload=value.slice('data:image/png;base64,'.length),bytes=Buffer.from(payload,'base64');
      if(bytes.toString('base64')!==payload||!bytes.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')))throw new Error('Invalid rollout PNG data URL');
      const sha256=hash(bytes),prior=images.get(sha256);
      if(prior){await verify(prior.path);return prior;}
      const reference=await attach('rollout-image-'+sha256,{body:bytes,contentType:'image/png'});
      images.set(sha256,reference);
      return reference;
    }
    if(Array.isArray(value)){const out=[];for(const entry of value)out.push(await compact(entry));return out;}
    if(value!==null&&typeof value==='object'){
      const out:Record<string,unknown>={};
      for(const [key,entry]of Object.entries(value))out[key]=await compact(entry);
      return out;
    }
    return value;
  };
  const observe = async (name: string, value: unknown): Promise<void> => {
    const metadata=await compact(value);
    await attach(name,{body:JSON.stringify(metadata),contentType:'application/json'});
  };
  const assertIntegrity = async (): Promise<void> => {for(const path of retained.keys())await verify(path);};
  return {attach,observe,assertIntegrity};
}
