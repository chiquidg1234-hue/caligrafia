# Resumen para empezar un chat nuevo (Trazo · caligrafía)

Pide: «lee `outputs/RESUMEN-PARA-NUEVO-CHAT.md` del repositorio `chiquidg1234-hue/caligrafia`, rama `ccr-6e94865d-c20f7c`». Es la rama más reciente; continúa a `claude/handwriting-review-improve-uj49ll`.

## Qué es

**Trazo** escribe tareas con la letra de la usuaria y las imprime en hojas de cuaderno con una **Epson Stylus Photo T50**, para que parezcan escritas con lapicero.

| Dónde | Qué hay |
| --- | --- |
| `outputs/trazo-android/web` | La app. `dist/` es una copia: después de cada cambio, `cp web/*.mjs dist/`. |
| `work/practicos/componer.mjs` | Genera los PDF desde la terminal: `node work/practicos/componer.mjs fuente.txt carpeta Nombre [--perfil id] [--ploter]`. |
| Pruebas | `cd outputs/trazo-android && node --test tests/*.test.mjs` (108 pasan). |

## Letras

En `web/personal-letter.json`, con tres copias iguales: `web/`, `dist/` y `work/caligrafia-2026-10-21/bundled-letter.json`.

- **Mi letra Natural** (`personal-natural-v1`) es la de ella. Es la que se usa.
- **Fuente 2A y Fuente 2Y** salieron de fotos de cuadernos ajenos. Por ahora ella pidió **solo su letra**.
- **Tres manos** con las mismas letras de Natural (`LETRAS` en `document.mjs`):

| Mano | Directiva | Cómo es |
| --- | --- | --- |
| Bonita | `[[letra bonita]]` | Su letra con dedicación: la Natural tal cual. |
| Intermedia | `[[letra intermedia]]` | Entre las otras dos. |
| Normal | `[[letra normal]]` | Imita su letra apurada (foto de la hoja «Nuevas normas de la RAE»): letras más chicas, espacios anchos y desparejos, renglón suelto y trazo más fino. |

- Por dentro usa `desorden` (en `core.mjs → naturalise`: giro, tamaño, base, deriva), `tracking` y `trackJitter` (espacio entre letras, también en `core.mjs`), `escala` (tamaño) y `grosor`.
- **Pidió no hacer la versión fea.** En unos 3 meses irá mejorando su letra normal.

## Tinta real (`web/ink.mjs`)

**Cómo funciona:**
- Cada letra se reduce a su línea central y se redibuja como lapicero.
- Las líneas de cada muestra se calculan una sola vez y se mueven con transformaciones afines.
- Las fotos con ruido (2A y 2Y) usan el contorno suavizado.

**Calibración con su foto** (lapicero real al lado de lo impreso):
- La impresión salía al doble de grosor y con un azul demasiado saturado; las gotitas se veían como manchas.
- Ajustes actuales:
  - `bic-azul` es `#34405e`;
  - el grosor en el PDF es de 0,125–0,14 mm, porque la impresora lo abre unos 0,2 mm;
  - las gotitas y las rayitas pálidas son casi nulas;
  - la opacidad es 0,94.

**Directivas:**
- `[[tinta real|plana]]` · `[[grosor 0.14]]` · `[[desorden 0.7]]` · `[[titulos a mano]]`
- `[[dibujo ancho alto]]`: dibujos a mano alzada, que no salen perfectos. Acepta `circulo x y r`, `arco x y r desde hasta` (en grados), `elipse x y rx ry`, `linea`, `trazos` (línea cortada), `punto`, `sector`/`segmento x y r desde hasta` (rayado a mano), `texto` (chico) y `rotulo` (tamaño normal) `x y | palabra`, `color rojo|verde|morado|negro|tinta` y `grueso n`.

## Reglas de sus tareas

- **Sin negritas.** A mano no existen. Solo si ella las pide.
- **Rayitas «//» solo en el resultado de un ejercicio de verdad.** Nunca en fórmulas de teoría. Nada de recuadro, salvo con `[[respuesta recuadro]]`.
- **Títulos y «Ejercicio N.-» en rojo `#b02a33`.** Como el amarillo está tapado, el rojo sale rosado.
- **Datos a la izquierda y resolución a la derecha** (`[[columnas 12]]`).
- **Paginación:**
  - una pregunta o un enunciado nunca queda solo al pie de la hoja;
  - como máximo 3 gráficas por cara.
- **Dibujos solo cuando los pida,** y que no queden perfectos.
- **Hojas:**

| Hoja | Directiva | Medidas | Corrección de la Epson T50 |
| --- | --- | --- | --- |
| Oficio espiral | `[[hoja oficio]]` | 211 × 322 mm | anverso x 5, y 1; reverso x 6, y 1 |
| Trapper | `[[hoja trapper]]` | 211 × 280 mm, casi carta | la de `TRAPPER_TOP` |

- **Para imprimir:**
  - tamaño real 100 %, Papel normal y «Alta velocidad» desmarcada;
  - la hoja se empuja contra la guía derecha;
  - primero los anversos y luego los reversos.
- **Si ya imprimió una cara,** usa `---` para fijar los saltos de página y que la otra cara coincida.

## Lo último que se entregó

| Carpeta | Qué hay |
| --- | --- |
| `outputs/investigaciones-trapper/Investigacion-Circunferencia-Graficas/` | Copia de su investigación a mano (fotos del 30/10): 25 preguntas en su formato («1-¿…?» / «-respuesta») y las 25 gráficas, en Trapper con letra normal. No se copió la firma ni el sello del profesor. |
| `outputs/practicos-trapper/` | Práctico 5 en letra normal y en 2Y; Física de energía y Física corta en 2Y; Química en 2A. Todos en Trapper, con tinta real y sin negritas. |
| `outputs/practicos/Practico-5-tres-letras/` | Práctico 5 de física (Oficio) en letra bonita, intermedia y normal, para que elija. |
| `outputs/practicos/Practico-5/` | Práctico 5 con `[[desorden 0.7]]`. |
| `outputs/investigaciones-trapper/Investigacion-Circunferencia/` | 25 preguntas en Trapper, con 2 dibujos a mano alzada. Ya imprimió las caras 1 y 3; se le dieron los reversos (páginas 2 y 4) con tinta nueva. |
| `outputs/prueba-tinta-real/` | Guía «que no se note impreso» y hoja de prueba. |

## Lo que falta o hay que mejorar

1. **Revisar la impresión de las tres manos.** Que mande foto con su lapicero al lado y elija una. Si la «normal» queda muy separada o muy chica, ajustar `LETRAS.normal`.
2. **Una letra «normal» de verdad.** Hoy es su letra bonita deformada. Lo ideal es sacar las muestras de su letra apurada a partir de fotos nítidas de una plantilla escrita rápido, con el mismo proceso de `work/fuentes-2a-2y`.
3. **Tinta:** confirmar en papel el grosor de 0,125–0,14 y el color `#34405e`. En la foto, la tinta impresa todavía se veía más pareja que la de lapicero.
4. **Lo que el PDF no puede hacer:** el surco y el relieve. Para eso, repasar en seco con un palito o un bolígrafo sin tinta, o usar un plóter (`--ploter`). Lo mismo con el brillo: repasar algunas palabras con lapicero.
5. **El rojo rosado:** limpiar el amarillo en la impresora o usar `[[titulos a mano]]`.
6. **La app:**
   - falta la pestaña Páginas con tinta real;
   - en Tareas falta un selector de las tres letras (por ahora solo existe como directiva);
   - la APK no se reconstruyó (no hay clave de firma).

## Cuidados

- Nunca publicar la clave privada de `work/trazo-android/signing`.
- No abrir PR sin que lo pida.
- Responder en español.
