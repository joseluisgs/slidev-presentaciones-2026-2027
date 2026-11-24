<template>
  <!--
    Portada de unidad. Tres franjas con slot sugar en el markdown:

      ::top::     → logo del módulo + pill del curso
      (default)   → título oficial + subtítulo (una frase)
      ::bottom::  → autoría con avatar + PacMan

    El `class` del frontmatter (p. ej. ud-cover-bg) cae por fallthrough
    sobre este div raíz, igual que en las layouts nativas de Slidev.
  -->
  <div class="slidev-layout ud-cover">
    <div class="ud-cover-top">
      <slot name="top" />
    </div>

    <div class="ud-cover-main">
      <slot />
    </div>

    <div class="ud-cover-bottom">
      <slot name="bottom" />
    </div>
  </div>
</template>
