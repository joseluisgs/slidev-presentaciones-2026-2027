<script setup lang="ts">
import { computed } from 'vue'
import { useNav } from '@slidev/client'

/**
 * Pie de marca: capa global, se pinta en TODAS las slides.
 *
 * El texto izquierdo lo define cada deck en su frontmatter (`udFooter`),
 * así los globals nunca se tocan por módulo. El derecho es fijo.
 *
 * Mermaid NO se toca desde aquí: se configura en setup/mermaid.ts.
 */
const { slides, currentSlideRoute } = useNav()

/**
 * `udFooter` vive en el HEADMATTER, es decir, en el frontmatter de la slide 1:
 * las demás slides no lo traen, por eso se lee de ahí y no de la actual.
 */
const udFooter = computed(() => {
  const head = slides.value?.[0]?.meta?.slide?.frontmatter
  if (head?.udFooter) return head.udFooter
  // Respaldo: algún deck podría declararlo por slide
  const fm = currentSlideRoute.value?.meta?.slide?.frontmatter
  return fm?.udFooter ?? ''
})

/**
 * Derecha: módulo · curso · centro · web. El módulo lo define cada deck
 * (`udModule`), el resto es fijo para todo el ciclo.
 */
const udModule = computed(() => {
  const head = slides.value?.[0]?.meta?.slide?.frontmatter
  return head?.udModule || 'Programación'
})

/**
 * Curso: 1DAW en los módulos de 1º, 2DAW en los de 2º.
 * Igual que los anteriores, se define en el headmatter de cada deck.
 */
const udCourse = computed(() => {
  const head = slides.value?.[0]?.meta?.slide?.frontmatter
  return head?.udCourse || '1DAW'
})
</script>

<template>
  <div class="ud-brand-footer">
    <span class="ud-brand-footer-left">{{ udFooter }}</span>
    <span class="ud-brand-footer-right">{{ udModule }} · {{ udCourse }} · IES Luis Vives · joseluisgs.dev</span>
  </div>
</template>
