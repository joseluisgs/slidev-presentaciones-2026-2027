# Programación · 1DAW

Módulo de **Programación** del ciclo de Desarrollo de Aplicaciones Web (DAW),
curso **2026-2027**, IES Luis Vives.

## Unidades

| UD | Título | Deck |
|---|---|---|
| **UD01** | Introducción a la Programación Software | [PROG/UD01.md](UD01.md) |
| **UD02** | Programación Estructurada y Modular | [PROG/UD02.md](UD02.md) |
| **UD03** | Almacenamiento estático y cadenas | [PROG/UD03.md](UD03.md) |
| **UD04** | Programación Orientada a Objetos | [PROG/UD04.md](UD04.md) |

## Comandos

Una línea npm por presentación, desde la raíz del proyecto (nombre
`<MÓDULO>-<UD>`):

```bash
npm run dev:PROG-UD01          # desarrollo en local
npm run build:PROG-UD01        # build de producción
npm run export:PROG-UD01       # PDF tema claro
npm run export:PROG-UD01:dark  # PDF tema oscuro
npm run check:PROG-UD01        # auditoría visual
```

Los PDF de este módulo salen en `presentaciones/PROG/`.

Las imágenes de este módulo van en `public/PROG/<NUD>/` (las comunes a todo el
ciclo en `public/media/global/`).
