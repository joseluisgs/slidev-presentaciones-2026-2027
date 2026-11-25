import { defineMermaidSetup } from '@slidev/types'

declare const __UD_EXPORT_DARK__: boolean

/**
 * Configuración de Mermaid para todo el módulo.
 * Los colores entran POR CONFIGURACIÓN (themeVariables) — el SVG vive en un
 * shadow root y el CSS externo no llega, así que aquí no hay JS de retoques.
 * Doc: https://sli.dev/custom/config-mermaid
 */
export default defineMermaidSetup(() => {
  // El setup corre en el navegador: la exportación --dark y la auditoría
  // fijan el esquema ANTES de cargar, así que aquí sabemos el tema activo.
  const esOscuro = () => {
    if (typeof document === 'undefined') return false
    // 🔴 Exportación --dark: constante inyectada por vite.config (decision
    // ESTABLE sin depender del timing de emulateMedia, que llega tarde).
    if (typeof __UD_EXPORT_DARK__ !== 'undefined' && __UD_EXPORT_DARK__) return true
    const q = new URLSearchParams(location.search).get('color-schema')
    if (q) return q === 'dark'
    let ls = null
    try { ls = localStorage.getItem('slidev-color-schema') } catch { /* noop */ }
    // Ojo: Slidev escribe 'auto' como valor por defecto → solo decide si es
    // explícito; con 'auto' seguimos a html.dark / matchMedia.
    if (ls === 'dark') return true
    if (ls === 'light') return false
    if (document.documentElement.classList.contains('dark')) return true
    return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches
  }
  // Mismo color de fondo que los bloques de código, MEDIDO del propio deck:
  // pre en claro = rgb(246,246,247) → #f6f6f7 · pre en oscuro = rgb(22,22,24)
  // → #161618 (los vars shiki viven inline en el pre, no en :root).
  const oscuro = esOscuro()
  const bgCodigo = oscuro ? '#161618' : '#f6f6f7'

  return {
    theme: 'base',
    startOnLoad: false,
    fontSize: '19px',
    securityLevel: 'loose',
    themeVariables: {
      fontFamily: "'Ubuntu', 'Segoe UI', sans-serif",
      fontSize: '19px',
      // Paleta del módulo (blurple #7289da)
      primaryColor: '#7289da',
      primaryTextColor: '#ffffff',
      primaryBorderColor: '#4967cf',
      // 🔴 Etiquetas de flecha: mermaid genera `.label{color:${nodeTextColor
      // || textColor}}` dentro del shadow root. Con `inherit` el color
      // HEREDA del host (.mermaid) y este del slide → texto oscuro en tema
      // claro y blanco en oscuro. Los nodos con `style ... color:#fff`
      // llevan inline !important y siguen blancos siempre.
      nodeTextColor: 'inherit',
      // La caja tapa la flecha con el MISMO fondo que los bloques de código
      // del tema activo (khroma solo acepta hex/rgb/hsl/named: nada de var()).
      edgeLabelBackground: bgCodigo,
      secondaryColor: '#f6f6f7',
      secondaryTextColor: '#3c3c43',
      tertiaryColor: '#eef1fb',
      lineColor: '#7289da',
      textColor: '#3c3c43',
      noteBkgColor: '#eef1fb',
      noteTextColor: '#3c3c43',
      noteBorderColor: '#7289da',
      clusterBkg: 'transparent',
      clusterBorder: '#7289da',
      actorBorder: '#7289da',
      actorBkg: '#7289da',
      actorTextColor: '#ffffff',
      // Neutro legible sobre fondo claro Y oscuro (el gris anterior era
      // invisible en el tema oscuro: flechas y textos del sequenceDiagram)
      signalColor: '#6b6b73',
      signalTextColor: '#6b6b73',
      actorLineColor: '#8b8b93',
    },
  }
})
