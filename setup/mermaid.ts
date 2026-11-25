import { defineMermaidSetup } from '@slidev/types'

/**
 * Configuración de Mermaid para todo el módulo.
 * Los colores entran POR CONFIGURACIÓN (themeVariables) — el SVG vive en un
 * shadow root y el CSS externo no llega, así que aquí no hay JS de retoques.
 * Doc: https://sli.dev/custom/config-mermaid
 */
export default defineMermaidSetup(() => {
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
      // 🔴 Texto de las etiquetas (.label → nodos sin style + etiquetas de
      // flecha): mermaid usa `nodeTextColor || textColor`. Sin esto salía
      // #ffffff y el texto de las flechas era blanco sobre fondo blanco
      // (invisible en claro, cajita blanca en oscuro). Los nodos con
      // `style ... color:#fff` llevan inline !important y no se ven afectados.
      nodeTextColor: '#142d44',
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
      edgeLabelBackground: '#ffffff',
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
