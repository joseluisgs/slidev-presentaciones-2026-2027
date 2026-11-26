// tools/metricas.mjs — Métricas §7.2 del proyecto (prosa, componentes, emojis, densidad)
// Las usan validar.mjs (pre-check) y visual-check.mjs (resumen, P8).
const RE_EMOJI = /\p{Extended_Pictographic}/gu

export function calcularMetricas(slides) {
  const porSlide = []
  slides.forEach((s, i) => {
    const raw = typeof s.content === 'string' ? s.content : ''
    const fm = s.frontmatter || {}
    const layout = fm.layout || (i === 0 && fm.theme ? 'cover' : 'default')
    const esContenido = layout === 'default'

    const sinFences = raw.replace(/```[\s\S]*?```/g, '\n')
    // prosa: fuera de tablas, marcas de componente y sintaxis markdown
    const lineas = sinFences.split('\n').filter((l) => !/^\s*\|/.test(l))
    const prosa = lineas
      .join(' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/::[a-z]+::/g, ' ')
      .replace(/[#*`>_]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    const parrafosLargos = sinFences
      .split(/\n\s*\n/)
      .map((p) =>
        p
          .replace(/<[^>]+>/g, ' ')
          .replace(/^\s*\|.*$/gm, ' ')
          .replace(/\s+/g, ' ')
          .trim()
      )
      // Los listados NO son párrafo: se miden como prosa (§7.2)
      .filter((p) => p.length > 350 && !/^([-*] |\d+\. )/.test(p)).length
    const comps =
      (sinFences.match(/<[A-Z][A-Za-z0-9]*/g) || []).length +
      (sinFences.match(/<img\b/g) || []).length + // imágenes = componentes visuales
      ((raw.match(/```mermaid/g) || []).length) // diagramas = componentes visuales
    const emojis = (prosa.match(RE_EMOJI) || []).length

    porSlide.push({ n: i + 1, layout, esContenido, prosa: prosa.length, parrafosLargos, comps, emojis })
  })

  const cont = porSlide.filter((p) => p.esContenido)
  const n = Math.max(1, cont.length)
  const suma = (k) => cont.reduce((a, p) => a + p[k], 0)
  return {
    porSlide,
    contenido: cont.length,
    prosaMedia: Math.round(suma('prosa') / n),
    parrafosLargos: suma('parrafosLargos'),
    compsMedia: +(suma('comps') / n).toFixed(2),
    emojisMedia: +(suma('emojis') / n).toFixed(2),
    densas: cont.filter((p) => p.prosa > 2000).length,
    // slides de contenido sin casi prosa (posible hueco → mirar)
    casiVacias: cont.filter((p) => p.prosa > 0 && p.prosa < 300).length,
  }
}

export function imprimirMetricas(m) {
  console.log('=== MÉTRICAS §7.2 (solo las de contenido) ===')
  console.log(
    `  prosa/slide media: ${m.prosaMedia} chars (objetivo 228-313 · alarma >355)` +
      `  ·  párrafos >350: ${m.parrafosLargos} (alarma >5)`
  )
  console.log(
    `  componentes/slide: ${m.compsMedia} (objetivo 1,31-1,92 · alarma <1,3)` +
      `  ·  emojis/slide: ${m.emojisMedia} (objetivo 0,57-1,4 · alarma <0,3)`
  )
  console.log(
    `  slides densas >2.000 chars: ${m.densas} (alarma >0)`
  )
  const peores = [...m.porSlide.filter((p) => p.esContenido)]
    .sort((a, b) => b.prosa - a.prosa)
    .slice(0, 3)
  if (peores.length)
    console.log('  más densas: ' + peores.map((p) => `${p.n} (${p.prosa})`).join(' · '))
}
