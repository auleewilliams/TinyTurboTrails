import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { beforeOwnerHud } from './hud-owner-preservation.mjs';
import { beforeWaterLanding } from './water-landing-preservation.mjs';
import { beforeBay1 } from './bay1-preservation.mjs';
import { createHash } from 'node:crypto';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const root=new URL('../',import.meta.url),read=path=>readFileSync(new URL(path,root));
test('exact HUD changes reverse before unchanged historical guards; unrelated mutations reject',()=>{
  const catalog=JSON.parse(read('assets/source/cove/materials/prechange-byte-pins.json'));
  for(const path of ['src/game/hud.ts','src/game/adventure-scene.ts']) {
    const bytes=read(path),baseline=beforeOwnerHud(path,bytes);
    assert.throws(()=>beforeOwnerHud(path,baseline), 'old HUD bytes cannot masquerade as new presentation');
    assert.equal(hash(beforeWaterLanding(path,beforeBay1(path,baseline))),catalog.files[path]);
    for(const bad of [Buffer.concat([bytes,Buffer.from('\n// unapproved')]),Buffer.from(bytes.toString().replace(path.endsWith('hud.ts')?'325':'this.player.x',path.endsWith('hud.ts')?'324':'this.player.x + 1'))]) {
      assert.notDeepEqual(bad,bytes);assert.throws(()=>beforeOwnerHud(path,bad));
    }
  }
  const movement=read('src/game/movement.ts');assert.equal(beforeOwnerHud('src/game/movement.ts',movement),movement);
});
