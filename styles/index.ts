/**
 * Punto de entrada de estilos del tema local (`theme: ../`).
 *
 * Al ser la raíz el tema, Slidev carga SOLO `styles/index.*` de aquí: si no
 * importamos la base de Slidev, la presentación sale sin padding, sin altura
 * y sin tamaños de título (bug: "todo pegado arriba y en miniatura").
 *
 * Orden: base de Slidev → layouts del tema por defecto → nuestro sistema.
 */
import '@slidev/client/styles/layouts-base.css'
import '@slidev/theme-default/styles/layouts.css'
import '@slidev/theme-default/styles/prism.css'

// Nuestro sistema de diseño: tokens, maquetación, componentes, pie y portada
import './ud.css'
