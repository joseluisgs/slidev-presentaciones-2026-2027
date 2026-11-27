# Entornos de Desarrollo · 1DAW

Módulo de **Entornos de Desarrollo** del ciclo de Desarrollo de Aplicaciones
Web (DAW), curso **2026-2027**, IES Luis Vives.

## Unidades

| UD | Título | Deck |
|---|---|---|
| **UD01** | Desarrollo de Software | [EDS/UD01.md](UD01.md) |
| **UD02** | Entornos de desarrollo | [EDS/UD02.md](UD02.md) |
| **UD03** | Sistema de Control de Versiones | [EDS/UD03.md](UD03.md) |

## Comandos

Una línea npm por presentación, desde la raíz del proyecto (nombre
`<MÓDULO>-<UD>`):

```bash
npm run dev:EDS-UD02          # desarrollo en local
npm run build:EDS-UD02        # build de producción
npm run export:EDS-UD02       # PDF tema claro
npm run export:EDS-UD02:dark  # PDF tema oscuro
npm run check:EDS-UD02        # auditoría visual
```

Los PDF de este módulo salen en `presentaciones/EDS/`.

Las imágenes de este módulo van en `public/EDS/<NUD>/` (las comunes a todo el
ciclo en `public/media/global/`).
