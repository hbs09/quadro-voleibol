import { zonaNaRotacao, limitar, LIMITES } from '../campo'
import { useQuadro } from '../estado'
import { assert } from 'vitest'
import { test } from "vitest"
test("rotação, limites e desfazer", () => {
assert.equal(zonaNaRotacao(2,2),1); assert.equal(zonaNaRotacao(1,2),6); assert.equal(zonaNaRotacao(1,1),1)
for (let z=1;z<=6;z++) assert.equal(zonaNaRotacao(z,7), z)
assert.deepEqual(limitar({x:-999,y:-999}), {x:Math.round(LIMITES.minX), y:Math.round(LIMITES.minY)})
const s = useQuadro.getState()
s.marcar(); s.mover('j1',{x:100,y:-50})
assert.equal(useQuadro.getState().emCampo.find(e=>e.jogadorId==='j1')!.y, Math.round(LIMITES.minY))
useQuadro.getState().desfazer()
assert.equal(useQuadro.getState().emCampo.find(e=>e.jogadorId==='j1')!.x, 750)
useQuadro.getState().repor(); useQuadro.getState().desfazer(); assert.equal(useQuadro.getState().historico.length,0)

})
