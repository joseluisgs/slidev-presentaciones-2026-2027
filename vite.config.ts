import { fileURLToPath } from 'node:url'

/**
 * Slidev fija `publicDir` a `<carpeta del entry>/public` (es decir,
 * `PROG/public`), pero las imágenes comunes a todos los módulos viven en la
 * raíz (`public/`), que a su vez es el tema local. Sin esto, las rutas del
 * markdown (`/media/global/logo.webp`) devolverían 404.
 *
 * Se declara aquí —y no moviendo carpetas— para que la estructura sea exactamente
 * la objetivo: entry por módulo en `PROG/`, recursos compartidos en la raíz.
 */
export default {
  publicDir: fileURLToPath(new URL('./public', import.meta.url)),
  define: {
    // `slidev export --dark` corre en ESTE mismo proceso: el flag se inyecta
    // al cliente como constante para que mermaid hornee la caja oscura desde
    // el primer render (el exportador aplica emulateMedia DESPUÉS de cargar,
    // demasiado tarde para detectar el tema en tiempo de ejecución).
    __UD_EXPORT_DARK__: JSON.stringify(process.argv.includes('--dark')),
  },
}
