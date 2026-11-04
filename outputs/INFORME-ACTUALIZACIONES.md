# Informe de actualizaciones de Trazo

Repositorio `chiquidg1234-hue/caligrafia`, rama `ccr-6e94865d-c20f7c`. Para seguir en un chat nuevo, pide: «lee `outputs/INFORME-ACTUALIZACIONES.md` y `outputs/RESUMEN-PARA-NUEVO-CHAT.md` de la rama `ccr-6e94865d-c20f7c`».

## 1. Lo que tiene Trazo hoy

| Parte | Qué hace | Dónde |
| --- | --- | --- |
| Tu letra | «Mi letra Natural» en tres manos: bonita, intermedia y normal | `web/personal-letter.json`, `LETRAS` en `document.mjs` |
| Tinta real | Cada letra se redibuja como un lapicero BIC azul (`#34405e`, 0,13 mm) | `web/ink.mjs` |
| Hojas | Oficio espiral y Trapper, con la corrección de la Epson T50 | `OFICIO_ESPIRAL` y `TRAPPER_TOP` en `document.mjs` |
| Verificación de márgenes | No genera el PDF si algo toca el marco | `margins()` y `work/practicos/componer.mjs` |
| Gráficas | Ejes, rectas, puntos y ahora también **circunferencias a compás** y **líneas punteadas** | `[[grafica]]` |
| Dibujos | A mano alzada, solo cuando los pides | `[[dibujo]]` |
| Abrir la app en Windows | Doble clic | `ABRIR-TRAZO.bat` |
| Indicaciones para otras IA | Indicación universal y la de DeepSeek | `outputs/PROMPT-UNIVERSAL-PARA-IA.md`, `PROMPT-PARA-DEEPSEEK.md` |

## 2. Cambios de esta vez (04/11)

### a) La letra no caía en los renglones

- **Medido en tus fotos:** la base de la letra quedaba cerca de **1 mm por debajo** del renglón, en las dos caras. Las gráficas, además, quedaban **medio cuadrito** fuera de la cuadrícula.
- **Arreglos:**
  - **Altura de la Trapper:** se cambió `drop` de 2,2 a **1,2 mm**.
  - **Renglón recto:** el renglón entero ya casi no sube ni baja, como mucho ±0,15 mm. La letra se ve «a mano» por la forma, el giro y el tamaño de cada letra, no porque se salga de la línea.

### b) Gráficas proporcionales a los cuadritos

- Cada unidad cae **siempre sobre una línea de la cuadrícula**: 1 unidad = 1 cuadrito, o 2 unidades = 1 cuadrito si no cabe. Los ejes, las rayitas y el centro quedan sobre las líneas.
- **Nuevo en `[[grafica]]`:**
  - `circulo h k r | etiqueta` se traza como con compás: radio exacto y un cierre que pasa un poquito del inicio.
  - `trazos x1 y1 x2 y2` dibuja con regla una línea punteada, para el radio o el diámetro.
- Una gráfica puede medir hasta 12 cuadritos de alto.

### c) Práctico de Circunferencia rehecho (`outputs/practicos-trapper/Practico-Circunferencia/`)

- Es la resolución completa, como lo pide el profesor.
- **Ejercicios 1 a 12:**
  - la ecuación ordinaria `//`;
  - después **la ecuación general** desarrollada `//`, que usa r², no la raíz.
- **Ejercicio 11:** r = √37 ≈ 6,08 `//`, luego r² = 37, la ecuación ordinaria `//` y la general `//`.
- **Ejercicio 12:** tiene el dato correcto, **B(5,5)**, que DeepSeek había copiado mal como B(8,5). C(1,2) `//`, r = 5 `//`, la ordinaria y la general.
- **Ecuación general 1 a 7:** se completan cuadrados, y luego C `//` y r `//`.
- **Formato:** 19 gráficas, letra intermedia, Trapper y 7 caras.
- **Fuente:** `work/practicos/circunferencia.mjs` genera `fuentes/practico-circunferencia.txt`.

### d) Letra un poco más fea

- `[[letra intermedia]]` ahora es más suelta: desorden 0,6, letras un poco más separadas y desparejas, y trazo más fino.
- Queda entre la bonita y la normal.

### e) Letra nueva

- Las fotos están guardadas en `outputs/nueva-letra/fotos/`.
- **No se pudo hacer la fuente con ellas:** las letras van unidas, faltan muchas y la cuadrícula y el sello las tapan.
- Se dejó `outputs/nueva-letra/Plantilla-letra-nueva.pdf`: una sola hoja para llenar letra por letra. La explicación está en `outputs/nueva-letra/LEEME.md`.

### f) Indicación universal para IA

- Ahora exige resolver todo:
  - la raíz y su decimal;
  - la ecuación ordinaria y la general;
  - C y r;
  - una gráfica en cada «Graficar».
- Exige también copiar los datos exactos.

## 3. Lo que hizo DeepSeek (revisión)

| Qué | Estado |
| --- | --- |
| Cuentas de los ejercicios 1–11 y de la ecuación general 1–7 | Bien |
| Ejercicio 12 | **Mal:** usó B(8,5) en vez de B(5,5) |
| Ecuación general en los ejercicios 1–12 | **Faltó** |
| r = √37 ≈ 6,08 como resultado | **Faltó** |
| Formato | **Mal:** LaTeX, negritas y «Enunciado:/Respuesta:». La app no lo lee |

## 4. Para que no vuelva a pasar

1. **Antes de imprimir mucho,** imprime una cara y mira con lupa si la base de las letras toca el renglón. Si no, mándame una foto de cerca: se ajusta `drop` (vertical) o `offsets` (horizontal).
2. **Las gráficas siempre se alinean solas** a la cuadrícula; no hace falta revisarlas a mano.
3. **Cada vez que cambie la impresora, el papel o la bandeja,** hay que medir de nuevo con `outputs/prueba-altura-trapper/`.
4. **Los PDF Trapper hechos antes del 04/11** tienen la altura vieja (2,2 mm). Si vas a imprimir uno de esos, pide que se regenere.
5. **Lo que entregue otra IA,** pásamelo antes de imprimir y lo reviso.

## 5. Lo que falta

- **Revisar en papel la altura nueva de 1,2 mm.** Si la letra queda alta, súbela a 1,5; si queda baja, bájala a 0,8.
- **Letra nueva:** espera la plantilla llena.
- **Horizontal:** en una foto, el eje y quedaba cerca de 1 mm a la derecha en el anverso. No se cambió con una sola medición. Si se repite, se ajusta x 5 a x 4.
- **Pendientes de antes:** la APK sin firmar, el selector de las tres letras en la app y el rojo rosado (amarillo tapado).
