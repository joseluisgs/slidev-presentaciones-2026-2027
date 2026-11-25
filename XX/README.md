# XX · Plantilla (demo)

Esta carpeta es la **plantilla de referencia** del proyecto: `UDXX.md` es un deck
de prueba (basado en la UD01 de Programación) que sirve como **molde para crear
cualquier UD nueva** del ciclo.

**No es un módulo real** — por eso vive en `XX/` y no en `PROG/`, `EDS/` o
`DWES/`. El nombre `UDXX` es un placeholder: se sustituye por la UD real
(`UD01`, `UD02`…).

## Qué contiene

| Fichero | Para qué |
|---|---|
| `UDXX.md` | El deck completo (11 slides): portada, materiales, RA/CCEE, índice, contenido y cierre |
| `README.md` | Este fichero |

Todo lo demás que usa el deck (estilos, componentes, layouts, pie, mermaid,
tools) vive en la **raíz** del proyecto y es común a todos los módulos — ver
`AGENTS.md`.

## Cómo sacar una UD nueva de aquí

1. Copiar `XX/UDXX.md` → `<MODULO>/UD01.md` (o la UD que toque).
2. Cambiar el frontmatter: `title`, `info`, `udFooter` (y `udModule`/`udCourse`
   si el módulo o el curso cambian).
3. Reemplazar el contenido de cada slide por el de la UD real, **respetando el
   orden de las 3 primeras slides de contenido**: `Materiales` → `RA/CCEE` →
   `Índice`.
4. Añadir en `package.json` una línea npm por presentación (`dev:…`,
   `build:…`, `export:…`, `export:…:dark`, `check:…`) con la ruta nueva.
5. Auditar con `visual-check` y mirar las imágenes antes de dar nada por bueno.

## Comandos de la plantilla

```bash
npm run dev:UDXX          # desarrollo en local
npm run build:UDXX        # build de producción
npm run export:UDXX       # PDF tema claro
npm run export:UDXX:dark  # PDF tema oscuro
npm run check:UDXX        # auditoría visual
```
