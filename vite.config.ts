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
}
