#!/usr/bin/env node
// tools/medir.mjs — medición con MARGEN por slide (tras cada arreglo, medir la slide)
// Uso: node tools/medir.mjs --md EDS/UD03.md --slides 145,148,156 [--url http://localhost:3030] [--ejecutar]
//      sin --ejecutar: lee tools/out/layout-report.json de la última auditoría
// Criterios: gap ≥ umbral+10 (35) · vacío arriba ≤200 · sin mermaid recortado · sin errores
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dir = path.dirname(fileURLToPath(import.meta.url))
const RAIZ = path.resolve(__dir, '..')
const argv = process.argv.slice(2)
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : d }
const flag = (k) => argv.includes(k)

const MD = opt('--md', null)
const RANGO = opt('--slides', null)
const URL_ = opt('--url', 'http://localhost:3030')
const UMBRAL = Number(opt('--umbral', 25))
const OBJETIVO = UMBRAL + 10 // margen: no valgap-en-el-límite
if (!MD || !RANGO) { console.error('Uso: node tools/medir.mjs --md X.md --slides 1,2,3 [--ejecutar]'); process.exit(2) }

if (flag('--ejecutar')) {
  const r = spawnSync(process.execPath, [path.join(__dir, 'visual-check.mjs'), '--md', MD, '--slides', RANGO, '--url', URL_, '--umbral', String(UMBRAL)], { cwd: RAIZ, stdio: 'inherit' })
  if (r.status === 2) process.exit(2) // entorno: sin servidor
}

const informe = JSON.parse(fs.readFileSync(path.join(RAIZ, 'tools/out/layout-report.json'), 'utf8'))
const pedidos = new Set(RANGO.split(',').map((s) => s.trim()).filter(Boolean).flatMap((p) => {
  const m = p.match(/^(\d+)-(\d+)$/)
  if (m) { const a = []; for (let i = +m[1]; i <= +m[2]; i++) a.push(String(i)); return a }
  return [p]
}))

console.log(`\n=== MEDICIÓN (objetivo: gap ≥ ${OBJETIVO} · vacío ≤ 200 · sin recortes) ===`)
let mal = 0
for (const f of informe.resultados) {
  if (f.tema !== 'light' || !pedidos.has(String(f.slide))) continue
  const recorte = (f.problemas || []).find((p) => /recortado/.test(p))
  const ok = f.gap >= OBJETIVO && f.gap < 900 && (f.problemas || []).length === 0
  if (!ok) mal++
  const donde = f.gap < 0 ? `DESBORDA ${-f.gap}px` : f.gap < OBJETIVO ? `apretado ${f.gap}px` : `gap ${f.gap}px`
  console.log(`${ok ? '✅' : '❌'} ${String(f.slide).padStart(3)} · ${donde}${recorte ? ' · ' + recorte.slice(0, 60) : ''} · «${(f.titulo || '').slice(0, 45)}»`)
  for (const p of (f.problemas || [])) if (!/recortado/.test(p)) console.log(`      - ${p.slice(0, 100)}`)
}
console.log(mal ? `\n${mal} slide(s) por debajo del objetivo` : '\nTODO EN OBJETIVO ✅')
process.exit(mal ? 1 : 0)
