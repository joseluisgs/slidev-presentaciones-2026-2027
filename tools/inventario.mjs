#!/usr/bin/env node
// tools/inventario.mjs — inventario previo de una UD (P1): cruza el DECK con el APUNTE
// antes de escribir ni una slide: títulos, componentes, clases, imágenes, grafo…
// y señala títulos del apunte sin cobertura aparente (POSIBLE LAGUNA → §7.4).
//
// Uso: node tools/inventario.mjs --md PROG/UDXX.md --doc C:/…/1DAW-Programacion/UDXX
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const __dir = path.dirname(fileURLToPath(import.meta.url))
const RAIZ = path.resolve(__dir, '..')
const req = createRequire(path.join(RAIZ, 'package.json'))

const argv = process.argv.slice(2)
const opt = (k, d) => {
  const i = argv.indexOf(k)
  return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : d
}
const MD = opt('--md', null)
const DOC = opt('--doc', null)
if (!MD || !DOC) {
  console.error('Uso: node tools/inventario.mjs --md PROG/UDXX.md --doc C:/…/apuntes/UDXX')
  process.exit(2)
}
const FICHERO = path.resolve(RAIZ, MD)
if (!fs.existsSync(FICHERO)) { console.error(`ERROR: no existe ${MD}`); process.exit(2) }
if (!fs.existsSync(DOC)) { console.error(`ERROR: no existe ${DOC}`); process.exit(2) }
const fuente = fs.readFileSync(FICHERO, 'utf8')

// ---------- DECK (parser real) ----------
let slides = []
try {
  const P = req('@slidev/parser')
  const parse = P.parse || (P.default && P.default.parse)
  const r = await parse(fuente)
  slides = Array.isArray(r) ? r : r.slides || []
} catch (e) {
  console.error(`ERROR: no se pudo analizar ${MD} → ${e}`)
  process.exit(2)
}
const titulosDeck = []
slides.forEach((s, i) => {
  const c = typeof s.content === 'string' ? s.content : ''
  for (const m of c.matchAll(/^##\s+(.+)$/gm)) titulosDeck.push({ slide: i + 1, t: m[1].trim() })
})
const comps = {}
for (const m of fuente.matchAll(/<([A-Z][A-Za-z0-9]*)/g)) comps[m[1]] = (comps[m[1]] || 0) + 1
const clases = [...new Set([...fuente.matchAll(/class="([^"]+)"/g)].flatMap((m) => m[1].split(/\s+/)).filter((c) => c.startsWith('ud-')))]
const imgs = [...new Set([...fuente.matchAll(/src="([^"]+)"/g)].map((m) => m[1]))]
const grafos = [...new Set([...fuente.matchAll(/```mermaid\s*\{?\s*(\w+)/g)].map((m) => m[1]))]
const layouts = [...new Set([...fuente.matchAll(/^layout:\s*(\S+)/gm)].map((m) => m[1]))]
const mermaidTotal = (fuente.match(/```mermaid/g) || []).length

// ---------- APUNTE (sin README: no es contenido de la UD) ----------
const files = fs.readdirSync(DOC).filter((f) => f.endsWith('.md') && !/^README/i.test(f)).sort()
const titulosDoc = []
let marcadores = 0
let tablas = 0
for (const f of files) {
  const t = fs.readFileSync(path.join(DOC, f), 'utf8')
  for (const m of t.matchAll(/^#{2,3}\s+(.+)$/gm)) titulosDoc.push({ fich: f, t: m[1].trim() })
  marcadores += (t.match(/⚠️|📝|💡|📌/g) || []).length
  tablas += (t.match(/^\|/gm) || []).length
}

// ---------- cruce: cobertura por similitud de tokens ----------
const norm = (s) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/^\s*\d+(?:\.\d+)*\.?\s*/, '') // numeración 2.1. / 5.6
    .replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim()
const tokens = (s) => new Set(norm(s).split(' ').filter((w) => w.length > 2))
const sim = (a, b) => {
  const na = norm(a), nb = norm(b)
  // subcadena directa: "¿Qué es .NET?" está en "2 · ¿Qué es .NET?"
  if (na && nb && (na.includes(nb) || nb.includes(na))) return 1
  const A = tokens(a), B = tokens(b)
  if (!A.size || !B.size) return 0
  let hit = 0
  for (const w of A) if (B.has(w)) hit++
  return hit / Math.min(A.size, B.size)
}
const lagunas = []
const cubiertos = []
const vistas = new Set()
for (const d of titulosDoc) {
  const k = norm(d.t)
  if (vistas.has(k)) continue // "Buenas prácticas" ×N → una sola vez
  vistas.add(k)
  let mejor = 0, donde = ''
  for (const kd of titulosDeck) {
    const s = sim(d.t, kd.t)
    if (s > mejor) { mejor = s; donde = kd.t }
  }
  if (mejor >= 0.5) cubiertos.push({ d, donde, mejor })
  else lagunas.push({ d, mejor, donde })
}

// ---------- informe ----------
console.log(`\n=== INVENTARIO · ${MD} ===`)
console.log(`Deck: ${slides.length} slides · ${titulosDeck.length} títulos h2 · ${mermaidTotal} diagramas`)
console.log(`Layouts: ${layouts.join(', ') || '(default)'}`)
console.log(`Componentes: ${Object.entries(comps).filter(([k]) => /^[A-Z]/.test(k)).map(([k, v]) => `${k}×${v}`).join(' · ') || 'ninguno'}`)
console.log(`Clases ud-*: ${clases.join(', ') || 'ninguna'}`)
console.log(`Imágenes: ${imgs.join(', ') || 'ninguna'}`)
console.log(`Orientaciones mermaid: ${grafos.join(', ') || 'ninguna'}`)
console.log(`\nApunte: ${files.length} ficheros · ${titulosDoc.length} títulos h2/h3 (únicos: ${vistas.size}) · ${marcadores} marcadores (⚠️📝💡📌) · ${tablas} filas de tabla`)

console.log(`\n=== TÍTULOS DEL DECK ===`)
for (const t of titulosDeck) console.log(`  ${String(t.slide).padStart(3)} · ${t.t}`)

console.log(`\n=== LAGUNAS CANDIDATAS (título del apunte sin cobertura aparente) ===`)
if (!lagunas.length) console.log('  (ninguna — todo el apunte tiene cobertura aparente)')
for (const { d, mejor, donde } of lagunas)
  console.log(`  [${d.fich}] ${d.t}\n       → mejor match: ${mejor > 0 ? `«${donde}» (${Math.round(mejor * 100)}%)` : 'ninguno'}`)

console.log(`\n${cubiertos.length}/${vistas.size} títulos únicos del apunte con cobertura aparente · ${lagunas.length} lagunas candidatas (revisar a mano, §7.4)`)
