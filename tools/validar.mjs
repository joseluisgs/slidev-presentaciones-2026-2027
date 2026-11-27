#!/usr/bin/env node
// tools/validar.mjs — validador ESTÁTICO de un deck (sin navegador, sin dev, <2s)
// Propuesta P2 del informe: fallas baratas antes de la auditoría visual cara.
//
// Uso: node tools/validar.mjs --md PROG/UDXX.md
// exit 0 = sin fallos · exit 1 = hay fallos · exit 2 = error de entorno
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { calcularMetricas, imprimirMetricas } from './metricas.mjs'

const __dir = path.dirname(fileURLToPath(import.meta.url))
const RAIZ = path.resolve(__dir, '..')
const req = createRequire(path.join(RAIZ, 'package.json'))

const argv = process.argv.slice(2)
const opt = (k, d) => {
  const i = argv.indexOf(k)
  return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : d
}
const MD = opt('--md', null)
if (!MD) {
  console.error('Uso: node tools/validar.mjs --md PROG/UDXX.md')
  process.exit(2)
}
const FICHERO = path.resolve(RAIZ, MD)
if (!fs.existsSync(FICHERO)) {
  console.error(`ERROR: no existe ${MD}`)
  process.exit(2)
}
const fuente = fs.readFileSync(FICHERO, 'utf8')

const FALLOS = []
const AVISOS = []
const fallo = (s) => FALLOS.push(s)
const aviso = (s) => AVISOS.push(s)

// ---------- parsear slides ----------
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
if (!slides.length) {
  console.error('ERROR: el parser no devolvió ninguna slide')
  process.exit(2)
}

const TIPOS_TIPBOX = new Set(['consejo', 'analogia', 'nota', 'truco', 'advertencia'])
const TAGS_HTML = new Set(
  ('div span p b i em strong br img a ul ol li table thead tbody tr th td h1 h2 h3 h4 code pre ' +
    'blockquote hr details summary sub sup small kbd mark section article header footer nav aside ' +
    'main form input button select option label textarea video audio source canvas svg path g text ' +
    'rect circle line tspan style script').split(' ')
)
const compsDir = path.join(RAIZ, 'components')
const cssUd = fs.existsSync(path.join(RAIZ, 'styles/ud.css'))
  ? fs.readFileSync(path.join(RAIZ, 'styles/ud.css'), 'utf8')
  : ''

// ---------- lenguajes de fence (bundle de Shiki/Slidev) ----------
// Un fence fuera del bundle revienta el dev: "Language X is not included
// in this bundle". mermaid lo intercepta Slidev antes que Shiki.
const RESERVADOS = new Set(['mermaid', 'text'])
let LANGS = null
try {
  const sh = await import('shiki')
  LANGS = new Set([
    ...Object.keys(sh.bundledLanguages || {}),
    ...Object.keys(sh.bundledLanguagesAlias || {}),
  ])
} catch {
  LANGS = new Set(['csharp', 'bash', 'xml', 'text', 'java', 'powershell', 'ini', 'json', 'yaml'])
}

// ---------- 1. frontmatter global (headmatter de la slide 1) ----------
const primeraLinea = (re) => {
  const m = fuente.match(re)
  return m ? m[1].replace(/^['"]|['"]$/g, '').trim() : null
}
if (!/^theme:\s*(\S+)/m.test(fuente)) fallo('frontmatter: falta "theme:"')
else if (primeraLinea(/^theme:\s*(\S+)/m) !== '../') fallo('frontmatter: theme debe ser "../" (tema local, §2)')
for (const campo of ['title', 'udFooter', 'udModule', 'udCourse']) {
  if (!new RegExp(`^${campo}:`, 'm').test(fuente)) fallo(`frontmatter: falta "${campo}:" (§2.3/§11)`)
}
const usaRepoBadge = /<RepoBadge/.test(fuente)
if (usaRepoBadge && !/^udRepo:/m.test(fuente))
  fallo('frontmatter: falta "udRepo:" — RepoBadge lo lee de ahí (§6.4-26)')

// fences con lenguaje fuera del bundle de Shiki (revienta el dev, §7.3)
for (const m of fuente.matchAll(/^```([A-Za-z0-9+#-]+)[ \t]*$/gm)) {
  const l = m[1].toLowerCase()
  if (RESERVADOS.has(l)) continue
  if (LANGS && !LANGS.has(l))
    fallo(`fence \`\`\`${m[1]}: lenguaje fuera del bundle de Shiki (el dev falla con "Language ... not included") — usar text`)
}

// ---------- 2. por slide ----------
const todo = [] // contenido concatenado en orden (para orden Materiales→RA→Índice)
slides.forEach((s, i) => {
  const n = i + 1
  const c = typeof s.content === 'string' ? s.content : ''
  todo.push(c)
  const sinFences = c.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '').replace(/'[^'\n]*'/g, '')

  // siglas internas prohibidas en slides (§7.5): PROG/EDS/DWES solo en rutas/scripts
  const sinRutas = c.replace(/src="[^"]*"/g, '').replace(/\]\([^)]*\)/g, '')
  const sigla = sinRutas.match(/\b(PROG|EDS|DWES)\b/)
  if (sigla) fallo(`${n}: sigla interna «${sigla[1]}» prohibida en la transparencia (§7.5) — usar el nombre completo del módulo`)

  // TipBox con tipo inválido
  for (const m of c.matchAll(/<TipBox\s+type="([^"]+)"/g))
    if (!TIPOS_TIPBOX.has(m[1]))
      fallo(`${n}: TipBox type="${m[1]}" inválido (válido: consejo|analogia|nota|truco|advertencia)`)
  // componentes inexistentes
  for (const m of sinFences.matchAll(/<([A-Z][A-Za-z0-9]*)/g)) {
    const tag = m[1]
    if (TAGS_HTML.has(tag)) continue
    if (!fs.existsSync(path.join(compsDir, `${tag}.vue`))) fallo(`${n}: <${tag}> no existe en components/`)
  }
  // divs desbalanceados
  const abre = (sinFences.match(/<div\b/g) || []).length
  const cierra = (sinFences.match(/<\/div>/g) || []).length
  if (abre !== cierra) fallo(`${n}: divs desbalanceados (${abre} abren / ${cierra} cierran)`)
  // v-click en markdown
  if (/v-click/.test(sinFences)) fallo(`${n}: v-click en el markdown (solo en RaaCcee/Objetivos)`)
  // clases ud-* sin definir
  for (const m of sinFences.matchAll(/class="([^"]+)"/g))
    for (const cl of m[1].split(/\s+/))
      if (cl && cl.startsWith('ud-') && cssUd && !cssUd.includes(`.${cl}`))
        fallo(`${n}: clase .${cl} sin definir en styles/ud.css`)
  // animaciones prohibidas / estilos ajenos (§6.4-27, §6.4-34)
  if (/md:magic-move|magic-move/.test(c)) fallo(`${n}: magic-move prohibido (§6.4-27)`)
  if (/<WindowFrame/.test(sinFences)) fallo(`${n}: WindowFrame prohibido en slides (§7.3)`)
  if (/<style[\s>]/.test(sinFences)) fallo(`${n}: bloque <style> en el deck (los estilos van en styles/ud.css, §6.4-34)`)
  for (const m of sinFences.matchAll(/<(\w+)[^>]*\sstyle="/g)) {
    const tag = m[1].toLowerCase()
    // Las imágenes usan el patrón oficial del original (mx-auto + doble tope): no avisa
    if (tag === 'img') continue
    aviso(`${n}: atributo style= en <${tag}> (§6.4-34: preferible clase grid/ud-* en styles/ud.css)`)
  }
  // palabras/prohibidas (§6.4-35)
  for (const linea of c.split('\n')) {
    if (/reglas del profesor|consejos del profesor|según el profesor|para el examen|en el examen|\bdel examen\b|tema de examen/i.test(linea))
      fallo(`${n}: referencia a examen/profesor → «${linea.trim().slice(0, 70)}» (§6.4-35)`)
    else if (/\bexamen|exámen|profesor/i.test(linea) && !/examen\s+\d/i.test(linea))
      aviso(`${n}: revisar palabra «examen/profesor» → «${linea.trim().slice(0, 70)}» (¿literal del apunte?)`)
  }
  // UDCover debe marcar sus slots (§2.4 / trampa 15)
  const fm = s.frontmatter || {}
  if (fm.layout === 'UDCover' && !/::(top|default|bottom)::/.test(c))
    fallo(`${n}: UDCover sin slots explícitos (::top:: / ::default:: / ::bottom::, §2.4)`)
})

// ---------- 3. cierre y orden de las 3 primeras slides ----------
const joined = todo.join('\n')
if (!/¡Hasta el próximo deploy!/.test(joined)) fallo('cierre: falta «¡Hasta el próximo deploy! 👋» (§7.1)')
if (!/<span class="ud-emoji">👋<\/span>/.test(joined)) fallo('cierre: el emoji 👋 debe ir en <span class="ud-emoji"> (§7.1)')
if (!/UD\d{2}\s*·\s/.test(joined)) fallo('cierre: falta la línea «UD0X · Título» (nunca «Tema 0X»)')

// ---------- PORTADA E INICIO (estructura §7.5) ----------
const c1 = typeof slides[0].content === 'string' ? slides[0].content : ''
const f1 = slides[0].frontmatter || {}
if (f1.layout !== 'UDCover') fallo('portada: layout debe ser UDCover (§7.5)')
if (!String(f1.class || '').includes('ud-cover-bg')) fallo('portada: falta class="ud-cover-bg"')
for (const slot of ['::top::', '::default::', '::bottom::'])
  if (!c1.includes(slot)) fallo(`portada: falta el slot ${slot} (§7.5)`)
if (!/^# .+/m.test(c1)) fallo('portada: falta el # Título (h1)')
if (!/^### .+/m.test(c1)) fallo('portada: falta el ### subtítulo (§8: atractivo, ≤10 palabras)')
if (!/ud-pill/.test(c1)) fallo('portada: falta el ud-pill con módulo · curso · año')
if (!/class="ud-logo"/.test(c1)) fallo('portada: falta el <img> del logo con class="ud-logo" (§7.5)')
if (!/ud-author/.test(c1) || !/ud-avatar/.test(c1)) fallo('portada: falta el bloque ud-author con avatar')
if (!/<PacMan/.test(c1) || !/Cargando ideas/.test(c1)) fallo('portada: falta el <PacMan> con label "Cargando ideas..."')
if (!f1.title) fallo('portada: falta "title" en el frontmatter')
if (/\b(PROG|EDS|DWES)\b/.test(String(f1.title || ''))) fallo('portada: el "title" no debe contener siglas internas (PROG/EDS/DWES) — §7.5')
if (slides.length < 5) fallo('inicio: el deck necesita al menos portada + Materiales + RA + Índice + portada de punto')
else {
  const c2 = typeof slides[1].content === 'string' ? slides[1].content : ''
  const c3 = typeof slides[2].content === 'string' ? slides[2].content : ''
  if (!/^## 📦 Materiales de la unidad/m.test(c2)) fallo('inicio: la slide2 debe ser «## 📦 Materiales de la unidad» (§7.5)')
  if (!/<RepoBadge/.test(c2)) fallo('inicio: Materiales sin <RepoBadge>')
  if (!/Todo el material de la UD\d{2} está publicado en el repositorio de GitHub, organizado por carpetas:/.test(c2))
    fallo('inicio: Materiales sin la prosa literal del molde «Todo el material de la UD0X está publicado en…» (§7.5)')
  if (!/Clónalo, forquéalo o descárgalo en zip: el material siempre está a un clic/.test(c2))
    fallo('inicio: Materiales sin la frase literal «Clónalo, forquéalo o descárgalo en zip…» (§7.5)')
  if (!/caption="Repositorio con materiales de la unidad"/.test(c2))
    fallo('inicio: Materiales sin caption="Repositorio con materiales de la unidad" (§7.5)')
  if (!/^## 🎯 Resultados de aprendizaje/m.test(c3) || !/<RaaCcee/.test(c3))
    fallo('inicio: la slide3 debe ser «## 🎯 Resultados de aprendizaje…» con <RaaCcee> (§7.5)')
  if (/<RaaCcee/.test(c3) && !/<RaaCcee[^>]*code=/.test(c3))
    fallo('inicio: <RaaCcee> sin prop code= — el badge del RA no pintaría (trampa 20)')
  // El Índice va en la4 o la5 (UDs con dos RA), siempre ANTES de la portada del1er punto
  const iSeccion = slides.findIndex((s, i) => i >= 2 && (s.frontmatter || {}).layout === 'section')
  const hasta = iSeccion > 0 ? iSeccion : slides.length
  let iIndice = -1
  for (let i = 3; i < hasta; i++) {
    const c = typeof slides[i].content === 'string' ? slides[i].content : ''
    if (/^## 📚 Índice/.test(c)) { iIndice = i; break }
  }
  if (iIndice < 0) fallo('inicio: no se encuentra el «## 📚 Índice» entre el RA y la portada del primer punto (§7.5)')
  else {
    const cI = typeof slides[iIndice].content === 'string' ? slides[iIndice].content : ''
    if (!/<TopicCard/.test(cI)) fallo('inicio: el Índice no tiene <TopicCard>')
    if (/<TopicCard/.test(cI) && !/<TopicCard[^>]*\s:?num=/.test(cI))
      fallo('inicio: <TopicCard> sin :num — los números no pintarían (trampa 20)')
    if (!/<RepoBadge/.test(cI)) fallo('inicio: el Índice sin franja de Materiales/RepoBadge (§7.5)')
  }
}

// ---------- CIERRE (detalle de la ÚLTIMA slide) ----------
const ult = slides[slides.length - 1]
const cU = typeof ult.content === 'string' ? ult.content : ''
if ((ult.frontmatter || {}).layout !== 'center') fallo('cierre: la última slide debe tener layout: center')
if (!/<PacMan :size="64"/.test(cU)) fallo('cierre: falta <PacMan :size="64" />')
if (!/<b class="text-lg">UD\d{2} · /.test(cU)) fallo('cierre: falta el título «UD0X · Título» en negrita')
if (!/class="ud-pill"/.test(cU)) fallo('cierre: falta el ud-pill del módulo')
if (!/<RepoBadge[^>]*size="lg"/.test(cU)) fallo('cierre: falta el <RepoBadge size="lg">')
if (!/class="ud-social"/.test(cU)) fallo('cierre: falta el bloque ud-social')
if (!/joseluisgs\.dev/.test(cU)) fallo('cierre: faltan los enlaces de ud-social')

// orden estructural (§6.4-42): portadas de punto ascendentes + cierre al final
const secciones = []
slides.forEach((s, i) => {
  const c = typeof s.content === 'string' ? s.content : ''
  const fm = s.frontmatter || {}
  if (fm.layout === 'section') {
    const num = (c.match(/ud-section-number">(\d+)/) || [])[1]
    const tit = (c.match(/^#\s+(.+)$/m) || [])[1] || ''
    secciones.push({ n: i + 1, num: num ? +num : null, tit: tit.trim() })
  }
})
let anterior = 0
for (const sec of secciones) {
  if (sec.num == null) continue
  if (sec.num <= anterior) fallo(`estructura: la portada «${sec.tit}» (${sec.num}) va DESPUÉS de la ${anterior} — orden ascendente (§6.4-42)`)
  anterior = sec.num
}
const iCierre = slides.findIndex((s) => /¡Hasta el próximo deploy/.test(typeof s.content === 'string' ? s.content : ''))
if (iCierre < 0) fallo('estructura: no se encuentra el cierre (§6.4-42)')
else if (iCierre !== slides.length - 1) fallo(`estructura: el cierre está en la slide ${iCierre + 1} y quedan ${slides.length - iCierre - 1} después — debe ser la ÚLTIMA (§6.4-42)`)

const posDe = (re) => {
  for (let i = 0; i < todo.length; i++) if (re.test(todo[i])) return i + 1
  return null
}
const pRepo = posDe(/<RepoBadge/),
  pRa = posDe(/<RaaCcee/),
  pIdx = posDe(/<TopicCard/)
if (pRa === null) fallo('estructura: falta la slide de RA/CCEE (<RaaCcee>, §7.2)')
if (pIdx === null) fallo('estructura: falta el ÍNDICE (<TopicCard>, §7.2)')
if (pRepo === null) aviso('estructura: no se ve <RepoBadge> (¿no hay slide de Materiales?)')
if (pRepo && pRa && pRepo > pRa) fallo(`estructura: Materiales (slide ${pRepo}) debe ir ANTES de RA/CCEE (slide ${pRa})`)
if (pRa && pIdx && pRa > pIdx) fallo(`estructura: RA/CCEE (slide ${pRa}) debe ir ANTES del Índice (slide ${pIdx})`)
// todo punto debe empezar por "N · Punto de partida" y terminar por "Resumen del punto N"
const títulos = slides.map((s) => (typeof s.content === 'string' ? s.content : '').match(/^##\s+(.+)$/m)?.[1] || '')
const arrancan = títulos.filter((t) => /^\d+\s*·\s*Punto de partida/.test(t)).length
const resumen = títulos.filter((t) => /^Resumen del punto \d+/.test(t)).length
if (arrancan === 0) fallo('estructura: ninguna slide «N · Punto de partida» (§7.2)')
else if (resumen < arrancan) aviso(`estructura: ${arrancan} «Punto de partida» pero ${resumen} «Resumen del punto N» (§7.2)`)

// ---------- 4. métricas §7.2 (solo informativo) ----------
const met = calcularMetricas(slides)

// ---------- salida ----------
console.log(`\nvalidar · ${MD} · ${slides.length} slides`)
if (AVISOS.length) {
  console.log(`\n=== AVISOS (${AVISOS.length}) ===`)
  for (const a of AVISOS) console.log('AVISO  ' + a)
}
imprimirMetricas(met)
if (FALLOS.length) {
  console.log(`\n=== FALLOS (${FALLOS.length}) ===`)
  for (const f of FALLOS) console.log('FALLO  ' + f)
  console.log('\nRESULTADO: KO')
  process.exit(1)
}
console.log('\nRESULTADO: OK (0 fallos)')
process.exit(0)
