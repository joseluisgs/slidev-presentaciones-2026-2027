#!/usr/bin/env node
/**
 * visual-check.mjs — auditoría visual genérica de decks Slidev (plantilla UDxx)
 *
 * Fusiona lo mejor de: nuestro verificar-p4 (gap ≥ umbral con texto culpable) +
 * dwes01/02-audit (espera condicionada, ?clicks=99, footer como límite, mermaid
 * en 2 capas, doble tema light/dark) + ud03-auditoria (captura SOLO de fallos).
 *
 * Uso:
 *   node tools/visual-check.mjs [--url http://[::1]:3030] [--slides 1-60,120]
 *        [--temas light,dark|both] [--capturas fallos|todas|ninguna]
 *        [--umbral 25] [--fuente slides.md | --md PROG/UDXX.md] [--salida tools/out]
 *        [--excluir-layout cover] [--solo-mermaid] [--check-enlaces]
 *
 * Salida: <salida>/layout-report.json + capturas <tema>-<n>.png SOLO de fallos.
 * exit 0 = todo OK · exit 1 = hay fallos · exit 2 = error de entorno.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { calcularMetricas, imprimirMetricas } from './metricas.mjs';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const DECK = path.resolve(__dir, '..'); // raíz del deck (…/slidev)
const req = createRequire(path.join(DECK, 'package.json'));
const { chromium } = req('playwright-chromium');

// ---------- CLI ----------
const argv = process.argv.slice(2);
const opt = (k, d) => {
  const i = argv.indexOf(k);
  return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : d;
};
const flag = (k) => argv.includes(k);

const URL_BASE = opt('--url', 'http://[::1]:3030').replace(/\/+$/, '');
const FUENTE = path.resolve(DECK, opt('--fuente', opt('--md', 'slides.md')));
const SALIDA = path.resolve(DECK, opt('--salida', 'tools/out'));
const TEMAS_ARG = opt('--temas', 'light'); // 🔴 un solo tema (§10): el dark es el mismo layout
const TEMAS =
  TEMAS_ARG === 'both' || TEMAS_ARG === 'light,dark'
    ? ['light', 'dark']
    : TEMAS_ARG.split(',').map((s) => s.trim()).filter(Boolean);
const CAPTURAS = opt('--capturas', 'fallos'); // fallos | todas | ninguno
const UMBRAL = Number(opt('--umbral', '25'));
const EXCLUIR = new Set(
  opt('--excluir-layout', '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
);
const SOLO_MERMAID = flag('--solo-mermaid');
const CHECK_ENLACES = flag('--check-enlaces');
const CLICKS = opt('--clicks', '99');

// ---------- 1. slides del fuente con @slidev/parser (nada de regex) ----------
let slidesSrc = [];
try {
  const P = req('@slidev/parser');
  const parse = P.parse || (P.default && P.default.parse);
  const r = await parse(fs.readFileSync(FUENTE, 'utf8'));
  slidesSrc = Array.isArray(r) ? r : r.slides || [];
} catch (e) {
  console.error('ERROR: no se pudo analizar ' + FUENTE + ' con @slidev/parser → ' + e);
  process.exit(2);
}
const TOTAL = slidesSrc.length;
if (!TOTAL) {
  console.error('ERROR: el parser no devolvió ninguna slide');
  process.exit(2);
}

// ---------- 1b. auditoría EXTREMA: comprobaciones ESTÁTICAS (sin navegador) ----------
const TIPOS_TIPBOX = new Set(['consejo', 'analogia', 'nota', 'truco', 'advertencia']);
const TAGS_HTML = new Set(
  ('div span p b i em strong br img a ul ol li table thead tbody tr th td h1 h2 h3 h4 code pre ' +
    'blockquote hr details summary sub sup small kbd mark section article header footer nav aside ' +
    'main form input button select option label textarea video audio source canvas svg path g text ' +
    'rect circle line tspan style script').split(' '),
);
const compsDir = path.join(DECK, 'components');
const cssPath = path.join(DECK, 'styles/ud.css');
const cssUd = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : '';
const ESTATICOS = [];
slidesSrc.forEach((s, i) => {
  const n = i + 1;
  const c = typeof s.content === 'string' ? s.content : '';
  // TipBox con tipo inválido (p.ej. "analogía" con tilde → no pinta estilo)
  for (const m of c.matchAll(/<TipBox\s+type="([^"]+)"/g))
    if (!TIPOS_TIPBOX.has(m[1]))
      ESTATICOS.push(`${n}: TipBox type="${m[1]}" inválido (válido: consejo|analogia|nota|truco|advertencia)`);
  // componentes inexistentes (fuera de bloques de código y de cadenas '...')
  const sinFences = c.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '').replace(/'[^'\n]*'/g, '');
  for (const m of sinFences.matchAll(/<([A-Z][A-Za-z0-9]*)/g)) {
    const tag = m[1];
    if (TAGS_HTML.has(tag)) continue;
    if (!fs.existsSync(path.join(compsDir, `${tag}.vue`)))
      ESTATICOS.push(`${n}: <${tag}> no existe en components/`);
  }
  // divs desbalanceados
  const abre = (sinFences.match(/<div\b/g) || []).length;
  const cierra = (sinFences.match(/<\/div>/g) || []).length;
  if (abre !== cierra) ESTATICOS.push(`${n}: divs desbalanceados (${abre} abren / ${cierra} cierran)`);
  // v-click en markdown (solo permitido dentro de RaaCcee/Objetivos, que es en .vue)
  if (/v-click/.test(sinFences)) ESTATICOS.push(`${n}: v-click en el markdown (solo en RaaCcee/Objetivos)`);
  // clases ud-* sin definir
  for (const m of sinFences.matchAll(/class="([^"]+)"/g))
    for (const cl of m[1].split(/\s+/)) {
      if (cl && cl.startsWith('ud-') && cssUd && !cssUd.includes(`.${cl}`))
        ESTATICOS.push(`${n}: clase .${cl} sin definir en styles/ud.css`);
    }
});
if (ESTATICOS.length) {
  console.log(`\n=== FALLOS ESTÁTICOS (${ESTATICOS.length}) — sin navegador ===`);
  for (const e of ESTATICOS) console.log('ESTÁTICO slide ' + e);
}

// rango --slides 1-60,120
let rango = null;
const rangoArg = opt('--slides', null);
if (rangoArg) {
  rango = new Set();
  for (const parte of rangoArg.split(',')) {
    const t = parte.trim();
    const m = t.match(/^(\d+)-(\d+)$/);
    if (m) for (let i = +m[1]; i <= +m[2]; i++) rango.add(i);
    else if (/^\d+$/.test(t)) rango.add(+t);
  }
}

const pendientes = [];
for (let i = 1; i <= TOTAL; i++) {
  const s = slidesSrc[i - 1] || {};
  const fm = s.frontmatter || {};
  const layout = fm.layout || (i === 1 && fm.theme ? 'cover' : 'default');
  if (EXCLUIR.has(layout)) continue;
  if (rango && !rango.has(i)) continue;
  if (SOLO_MERMAID) {
    const c = typeof s.content === 'string' ? s.content : JSON.stringify(s);
    if (!/```mermaid/.test(c)) continue;
  }
  pendientes.push({ n: i, layout });
}

console.log(
  `visual-check · ${TOTAL} slides en el fuente · auditando ${pendientes.length} × ${TEMAS.length} tema(s) · umbral ${UMBRAL}px · ${URL_BASE}`
);

// ---------- 2. comprobación de servidor + de que sirve ESTE md (P4) ----------
try {
  const ctl = new AbortController();
  setTimeout(() => ctl.abort(), 5000);
  const resp = await fetch(URL_BASE + '/1', { signal: ctl.signal });
  const html = await resp.text();
  // P4: el puerto debe servir EL md pedido — nunca auditar el dev de otra UD
  const titleMd = (fs.readFileSync(FUENTE, 'utf8').match(/^title:\s*['"]?(.+?)['"]?\s*$/m) || [])[1];
  const titleHtml = ((html.match(/<title>([^<]*)<\/title>/) || [])[1] || '').trim();
  if (titleMd && titleHtml && !titleHtml.includes(titleMd) && !titleMd.includes(titleHtml)) {
    console.error(
      `ERROR: ${URL_BASE} sirve «${titleHtml}» y no «${titleMd}» — PUERTO EQUIVOCADO (¿dev de otra UD?). Pasa --url con el puerto correcto.`
    );
    process.exit(2);
  }
} catch (e) {
  if (e && e.message && e.message.includes('PUERTO EQUIVOCADO')) throw e;
  console.error(`ERROR: no responde ${URL_BASE} — arranca el deck (npm run dev) o pasa --url`);
  process.exit(2);
}

// ---------- 3. auditoría ----------
const SALIDA_CAP = path.join(SALIDA, 'capturas');
fs.mkdirSync(SALIDA_CAP, { recursive: true });

const browser = await chromium.launch({ args: ['--no-proxy-server'] });
const resultados = [];
let fallosTotales = 0;
let fallosGotoSeguidos = 0;

const ESPERA = (num) => (num) => {
  const el = document.elementFromPoint(window.innerWidth / 2, 140);
  const pg = el && el.closest('.slidev-page');
  if (!pg) return false;
  const m = String(pg.className).match(/slidev-page-(\d+)/);
  if (!m || +m[1] !== num) return false;
  if (!pg.querySelector('h1, h2')) return false;
  const mer = [...pg.querySelectorAll('.mermaid')];
  if (!mer.every((x) => x.shadowRoot && x.shadowRoot.querySelector('svg'))) return false;
  if (![...pg.querySelectorAll('img')].every((i) => i.complete)) return false;
  return document.fonts.status === 'loaded';
};

for (const tema of TEMAS) {
  const ctx = await browser.newContext({ viewport: { width: 1680, height: 945 } });
  await ctx.addInitScript((t) => {
    try {
      localStorage.setItem('slidev-color-schema', t);
    } catch (e) {
      /* noop */
    }
  }, tema);
  const page = await ctx.newPage();
  let okTema = 0;

  for (const { n, layout } of pendientes) {
    let r;
    try {
      await page.goto(`${URL_BASE}/${n}?clicks=${CLICKS}`, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });
      fallosGotoSeguidos = 0;
      await page.waitForFunction(ESPERA(n), n, { timeout: 20000 }).catch(() => {});
      await page.waitForTimeout(300);
      r = await page.evaluate(
        ({ umbral, conEnlaces }) => {
          const punto = document.elementFromPoint(window.innerWidth / 2, 140);
          const pg = punto && punto.closest('.slidev-page');
          if (!pg) return { error: 'layout no visible' };
          const mm = String(pg.className).match(/slidev-page-(\d+)/);
          const h = pg.querySelector('h1, h2');
          const box = pg.getBoundingClientRect();
          const footer = document.querySelector('.ud-brand-footer');
          const pieTop = footer ? footer.getBoundingClientRect().top : box.bottom;

          const SEL =
            'h1,h2,h3,p,li,pre,table,img,a,.mermaid,[class*="ud-"]';
          const desc = (e) => {
            const t = ((e && (e.innerText || e.alt)) || '')
              .replace(/\s+/g, ' ')
              .trim()
              .slice(0, 60);
            let cls = '';
            if (typeof e.className === 'string' && e.className) {
              cls = '.' + e.className.split(/\s+/).filter((c) => c && !/\d/.test(c)).slice(0, 2).join('.');
            }
            return (e.tagName || '?').toLowerCase() + cls + (t ? ` «${t}»` : '');
          };
          const items = [...pg.querySelectorAll(SEL)].filter((e) => {
            if (e.closest && e.closest('.ud-brand-footer')) return false;
            // el propio contenedor (p.ej. .ud-cover-bg en la portada) no es contenido
            if (e.classList && (e.classList.contains('slidev-layout') || e.classList.contains('slidev-page')))
              return false;
            const cs = getComputedStyle(e);
            if (cs.display === 'none' || cs.visibility === 'hidden') return false;
            const rr = e.getBoundingClientRect();
            return rr.width > 0 && rr.height > 0;
          });

          // gap hasta el pie (límite real = top del footer)
          let maxBot = -Infinity,
            peor = null;
          for (const e of items) {
            const b = e.getBoundingClientRect().bottom;
            if (b > maxBot) {
              maxBot = b;
              peor = e;
            }
          }
          const gap = Math.round(pieTop - maxBot);

          // EXTREMA: hueco bajo el título (h2 → primer bloque de contenido)
          let minTop = Infinity;
          const h2El = pg.querySelector('h2');
          const h2Bottom = h2El ? h2El.getBoundingClientRect().bottom : box.top;
          for (const e of items) {
            if (h2El && e === h2El) continue;
            const t = e.getBoundingClientRect().top;
            if (t < minTop) minTop = t;
          }
          const topGap = Number.isFinite(minTop) ? Math.round(minTop - h2Bottom) : 0;

          // EXTREMA: columnas de grid sin contenido
          const gridVacias = [];
          for (const grid of pg.querySelectorAll('.grid')) {
            const hijos = [...grid.children].filter((h) => h.tagName && h.tagName.toLowerCase() === 'div');
            hijos.forEach((h, i) => {
              if (!h.querySelector(SEL)) gridVacias.push(`columna ${i + 1} de «${desc(grid).slice(0, 40)}»`);
            });
          }

          // desbordes laterales
          const overflow = [];
          for (const e of items) {
            const rr = e.getBoundingClientRect();
            if (rr.right > box.right + 2)
              overflow.push({ lado: 'derecha', px: Math.round(rr.right - box.right), elem: desc(e) });
            else if (rr.left < box.left - 2)
              overflow.push({ lado: 'izquierda', px: Math.round(box.left - rr.left), elem: desc(e) });
          }

          // mermaid: existe / sintaxis / recorte
          const mer = [];
          for (const host of pg.querySelectorAll('.mermaid')) {
            const sr = host.shadowRoot;
            const svg = sr && sr.querySelector('svg');
            if (!svg) {
              mer.push({ estado: 'sin-svg', elem: desc(host) });
              continue;
            }
            const txt = svg.textContent || '';
            if (/Syntax error/i.test(txt)) {
              mer.push({ estado: 'syntax-error', elem: txt.replace(/\s+/g, ' ').slice(0, 80) });
              continue;
            }
            const hr = host.getBoundingClientRect();
            const vr = svg.getBoundingClientRect();
            if (vr.bottom > hr.bottom + 2)
              mer.push({ estado: 'recortado', px: Math.round(vr.bottom - hr.bottom), elem: desc(host) });
            // P6: centrado horizontal del SVG dentro de su host
            const off = Math.abs(vr.left + vr.width / 2 - (hr.left + hr.width / 2));
            if (off > 8) mer.push({ estado: 'descentrado', px: Math.round(off), elem: desc(host) });
          }

          // código con scroll (desborde interno)
          const scrolls = [];
          for (const pre of pg.querySelectorAll('pre, .slidev-code-wrapper')) {
            const w = pre.scrollWidth - pre.clientWidth;
            const h2 = pre.scrollHeight - pre.clientHeight;
            if (w > 2 || h2 > 2) scrolls.push({ w: Math.max(0, w), h: Math.max(0, h2), elem: desc(pre) });
          }

          // imágenes rotas
          const imgsRotos = [...pg.querySelectorAll('img')]
            .filter((i) => i.complete && i.naturalWidth === 0)
            .map((i) => i.getAttribute('src') || '(sin src)');

          // markdown literal sin renderizar
          const inner = pg.innerText || '';
          let mdLiteral = null;
          const ix = inner.indexOf('**');
          if (ix >= 0) mdLiteral = inner.slice(Math.max(0, ix - 20), ix + 40).replace(/\s+/g, ' ');

          // enlaces externos (solo si --check-enlaces: en nuestra plantilla son legítimos)
          const enlaces = conEnlaces
            ? [...pg.querySelectorAll('a[href^="http"]')].map((a) => a.href)
            : [];

          // v-click aún ocultos (señal de que ?clicks=N no funcionó)
          const ocultos = pg.querySelectorAll('.slidev-vclick-hidden').length;

          return {
            num: mm ? +mm[1] : null,
            titulo: h ? h.innerText.trim().slice(0, 60) : '',
            gap,
            topGap,
            gridVacias,
            peor: peor ? desc(peor) : '',
            overflow,
            mermaid: mer,
            codeScroll: scrolls,
            imgsRotos,
            mdLiteral,
            enlaces,
            vclickOcultos: ocultos,
            dark: document.documentElement.classList.contains('dark'),
          };
        },
        { umbral: UMBRAL, conEnlaces: CHECK_ENLACES }
      );
    } catch (e) {
      fallosGotoSeguidos++;
      r = { error: String(e && e.message ? e.message : e).slice(0, 140) };
      if (fallosGotoSeguidos >= 3) {
        console.error(`ERROR: 3 navegaciones seguidas fallando en ${URL_BASE} — ¿servidor caído?`);
        await browser.close();
        process.exit(2);
      }
    }

    // construir lista de problemas
    const probs = [];
    if (r.error) probs.push('ERROR: ' + r.error);
    else {
      if (r.num !== n) probs.push(`DESYNC: visible la ${r.num}`);
      if (r.gap < 0) probs.push(`DESBORDA el pie en ${-r.gap}px (${r.peor})`);
      else if (r.gap < UMBRAL) probs.push(`apretado: gap ${r.gap}px < ${UMBRAL} (${r.peor})`);
      // vacío solo en layouts de contenido: section/center/cover van centrados por diseño
      if (layout === 'default') {
        // con centrado vertical activo, el slack se reparte: hueco >260 bajo
        // el título = slide realmente corta (rellenar con doc)
        if (r.topGap > 260) probs.push(`vacío arriba +${r.topGap}px`);
        // umbral calibrado contra UD01 (diseño de referencia del profesor):
        // sus slides admiten hasta ~449px de aire abajo sin quejarse
        if (r.gap > 460) probs.push(`vacío abajo +${r.gap}px`);
        for (const g of r.gridVacias || []) probs.push(`grid con ${g} vacía`);
      }
      for (const o of r.overflow || [])
        probs.push(`overflowX ${o.lado} +${o.px}px (${o.elem})`);
      for (const m of r.mermaid || [])
        probs.push(`mermaid ${m.estado}${m.px ? ' +' + m.px + 'px' : ''}${m.elem ? ' ' + m.elem : ''}`);
      for (const s of r.codeScroll || [])
        probs.push(`codigo con scroll ${s.w}x${s.h}px (${s.elem})`);
      for (const i of r.imgsRotos || []) probs.push(`imagen rota: ${i}`);
      if (r.mdLiteral) probs.push(`** sin renderizar: …${r.mdLiteral}…`);
      for (const l of r.enlaces || []) probs.push(`enlace externo: ${l}`);
      if (r.vclickOcultos > 0) probs.push(`v-click ocultos: ${r.vclickOcultos} (¿falla ?clicks=?)`);
    }

    let captura = null;
    const quiere = CAPTURAS === 'todas' || (CAPTURAS === 'fallos' && probs.length > 0);
    if (quiere) {
      captura = `${tema}-${n}.png`;
      try {
        await page.screenshot({ path: path.join(SALIDA_CAP, captura) });
      } catch (e) {
        captura = null;
      }
    }

    const fila = {
      slide: n,
      layout,
      tema,
      titulo: r.titulo || '',
      gap: r.gap,
      problemas: probs,
      captura,
    };
    if (r.dark !== undefined) fila.dark = r.dark;
    resultados.push(fila);
    if (probs.length) {
      fallosTotales++;
      console.log(`FALLO ${tema}/${n} ${probs[0]}` + (probs.length > 1 ? ` (+${probs.length - 1})` : ''));
      for (const p of probs.slice(1)) console.log(`        · ${p}`);
    } else okTema++;
    if ((n % 25 === 0 || n === pendientes[pendientes.length - 1].n) && !probs.length)
      process.stdout.write(`… ${tema} ${n}/${pendientes[pendientes.length - 1].n}\n`);
  }
  console.log(`tema ${tema}: ${okTema}/${pendientes.length} OK`);
  await ctx.close();
}

await browser.close();

// ---------- 4. informe ----------
const reporte = {
  fecha: new Date().toISOString(),
  url: URL_BASE,
  fuente: path.relative(DECK, FUENTE),
  totalSlides: TOTAL,
  auditadas: pendientes.length,
  temas: TEMAS,
  umbral: UMBRAL,
  clicks: CLICKS,
  capturas: CAPTURAS,
  fallos: fallosTotales,
  resultados,
};
const rutaInforme = path.join(SALIDA, 'layout-report.json');
fs.writeFileSync(rutaInforme, JSON.stringify({ ...reporte, estaticos: ESTATICOS }, null, 2), 'utf8');

console.log('');
console.log('=== RESUMEN ===');
console.log(`slides auditadas: ${pendientes.length} × ${TEMAS.join(',')}  ·  fallos: ${fallosTotales}  ·  fallos estáticos: ${ESTATICOS.length}`);
imprimirMetricas(calcularMetricas(slidesSrc)); // P8: métricas §7.2 de un vistazo
console.log(`informe: ${path.relative(process.cwd(), rutaInforme)}`);
console.log(`capturas: ${path.relative(process.cwd(), SALIDA_CAP)} (solo fallos)`);
process.exit(fallosTotales + ESTATICOS.length > 0 ? 1 : 0);
