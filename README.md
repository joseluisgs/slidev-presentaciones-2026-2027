# Slidev Presentaciones

Presentaciones para los módulos impartidos en el ciclo de Desarrollo de Aplicaciones Web (DAW) en el curso 2026-2027. 

![imagen](https://raw.githubusercontent.com/joseluisgs/Programacion-00-2022-2023/master/images/programacion.png)


## Contenidos

**Módulos:**

1. [PROG](PROG/) — **1DAW. Programación**
   - [UD01 · Introducción a la Programación Software](PROG/UD01.md)
   - [UD02 · Programación Estructurada y Modular](PROG/UD02.md)
   - [UD03 · Almacenamiento estático y cadenas](PROG/UD03.md)
   - [UD04 · Programación Orientada a Objetos](PROG/UD04.md)

2. [EDS](EDS/) — **1DAW. Entornos de Desarrollo**
   - [UD02 · Entornos de desarrollo](EDS/UD02.md)
   - [UD03 · Sistema de Control de Versiones](EDS/UD03.md)

**Plantilla:**

- [XX](XX/) — plantilla demo (`UDXX.md`), el molde del que se copian las UD nuevas




## Cómo se usa

Una línea npm por presentación, con el nombre **`<MÓDULO>-<UD>`** (`XX-UDXX`
es el placeholder: `PROG-UD01`, `EDS-UD03`…). Los PDF salen en
`presentaciones/<MÓDULO>/`:

```bash
npm run dev:XX-UDXX          # desarrollo en local (slidev XX/UDXX.md)
npm run build:XX-UDXX        # build de producción (dist/XX-UDXX)
npm run export:XX-UDXX       # exporta PDF tema claro → presentaciones/XX/UDXX-claro.pdf
npm run export:XX-UDXX:dark  # exporta PDF tema oscuro → presentaciones/XX/UDXX-oscuro.pdf
npm run check:XX-UDXX        # auditoría visual (tools/visual-check.mjs)
```

Ejemplos: `npm run dev:PROG-UD01` · `npm run export:EDS-UD03:dark` ·
`npm run check:EDS-UD03`.

Herramientas de QA (siempre con su `--md`, sin navegador salvo la auditoría):

```bash
node tools/validar.mjs --md PROG/UD01.md                      # validador estático (<2s): estructura, frontmatter, cierre, métricas
node tools/inventario.mjs --md PROG/UD01.md --doc <apuntes>   # inventario doc↔deck: lagunas candidatas antes de escribir
node tools/medir.mjs --md PROG/UD01.md --slides 46,61 [--ejecutar]  # medición con MARGEN por slide tras cada arreglo (gap ≥35)
node tools/cerrar-ud.mjs --md PROG/UD01.md --url <dev>        # cierra la UD: estático → auditoría → 2 PDFs
```

## Autor

Codificado con :sparkling_heart: por [José Luis González Sánchez](https://joseluisgs.dev)

[![Twitter](https://img.shields.io/twitter/follow/JoseLuisGS_?style=social)](https://x.com/JoseLuisGSDev)
[![GitHub](https://img.shields.io/github/followers/joseluisgs?style=social)](https://github.com/joseluisgs)
[![GitHub](https://img.shields.io/github/stars/joseluisgs?style=social)](https://github.com/joseluisgs)

## Contacto

<p>
  Cualquier cosa que necesites házmelo saber por si puedo ayudarte 💬.
</p>
<p>
    <a href="https://joseluisgs.dev/" target="_blank">
        <img loading="lazy" src="https://github.com/joseluisgs/joseluisgs/raw/master/images/social-icons/favicon.png" height="32">
    </a>&nbsp;
    <a href="https://github.com/joseluisgs" target="_blank">
        <img loading="lazy" src="https://github.com/joseluisgs/joseluisgs/raw/master/images/social-icons/github.svg" height="32">
    </a>&nbsp;
    <a href="https://www.linkedin.com/in/JoseLuisGSDev" target="_blank">
        <img loading="lazy" src="https://github.com/joseluisgs/joseluisgs/raw/master/images/social-icons/linkedin.png" height="32">
    </a>&nbsp;
    <a href="https://www.youtube.com/@joseluisgs" target="_blank">
        <img loading="lazy" src="https://github.com/joseluisgs/joseluisgs/raw/master/images/social-icons/youtube.png" height="32">
    </a>&nbsp;
    <a href="https://x.com/JoseLuisGSDev" target="_blank">
        <img loading="lazy" src="https://github.com/joseluisgs/joseluisgs/raw/master/images/social-icons/twitter.png" height="32">
    </a>&nbsp;
    <a href="https://www.instagram.com/joseluisgs.dev/" target="_blank">
        <img loading="lazy" src="https://github.com/joseluisgs/joseluisgs/raw/master/images/social-icons/instagram.png" height="32">
    </a>
</p>

## Licencia de uso

Este repositorio y todo su contenido está licenciado bajo licencia **Creative Commons**, si desea saber más, vea
la [LICENSE](https://joseluisgs.dev/docs/license/). Por favor si compartes, usas o modificas este proyecto cita a su
autor, y usa las mismas condiciones para su uso docente, formativo o educativo y no comercial.

<a rel="license" href="http://creativecommons.org/licenses/by-nc-sa/4.0/"><img alt="Licencia de Creative Commons" style="border-width:0" src="https://i.creativecommons.org/l/by-nc-sa/4.0/88x31.png" /></a><br /><span xmlns:dct="http://purl.org/dc/terms/" property="dct:title">
JoseLuisGS</span> by <a xmlns:cc="http://creativecommons.org/ns#" href="https://joseluisgs.dev/" property="cc:attributionName" rel="cc:attributionURL">
José Luis González Sánchez</a> is licensed under
<a rel="license" href="http://creativecommons.org/licenses/by-nc-sa/4.0/">Creative Commons
Reconocimiento-NoComercial-CompartirIgual 4.0 Internacional License</a>.<br />Creado a partir de la obra
en <a xmlns:dct="http://purl.org/dc/terms/" href="https://github.com/joseluisgs" rel="dct:source">https://github.com/joseluisgs</a>.
