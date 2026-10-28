# Resumen para empezar un chat nuevo (Trazo · caligrafía)

Pega este archivo o pide: «lee `outputs/RESUMEN-PARA-NUEVO-CHAT.md` del repositorio `chiquidg1234-hue/caligrafia`, rama `ccr-6e94865d-c20f7c`». Esa rama continúa a `claude/handwriting-review-improve-uj49ll` y es la más reciente.

## Qué es

**Trazo** es una app web/Android que escribe con letra a mano.
- La app está en `outputs/trazo-android/web`.
- `dist/` es una copia de `web/`: después de cada cambio se copia web → dist.
- Pruebas: `cd outputs/trazo-android && node --test tests/*.test.mjs` (108 pasan).

## Letras incluidas (`web/personal-letter.json`)

Hay que mantener tres copias iguales: `web/`, `dist/` y `work/caligrafia-2026-10-21/bundled-letter.json`.

| id | Nombre | De dónde |
| --- | --- | --- |
| `personal-natural-v1` | Mi letra Natural | La letra de la usuaria (la principal) |
| `personal-2a-v1` | Fuente 2A | Foto de matemáticas (números) |
| `personal-2y-v1` | Fuente 2Y | Foto de religión (sin el sello) |
| uniforme / original / optimizada | versiones anteriores | |

- **Cómo se hizo la 2A y la 2Y** (`work/fuentes-2a-2y`): `preparar.py` → `componentes.py` → `miniaturas.py` → etiquetas a mano en `etiquetas-2a.txt` / `etiquetas-2y.txt` → `muestras.py` → `construir.mjs` → `completar.mjs` → `integrar.mjs` → `entregar.mjs`.
- `completar.mjs` iguala los tamaños a Natural (mayúsculas hasta 1,1×, colas hasta 270 unidades) y hace á é í ó ú ñ μ.
- Lo que falta se toma primero de la otra foto y después de Natural.
- Los datos intermedios estaban en el scratchpad de la sesión anterior y se pierden. Las fotos están en las cargas de esa sesión.
- **Pedido de la usuaria:** letras «normales, promedio», no muy bonitas.
- **Pendiente de su opinión:** la «t» de la 2Y parece «T».

## Hojas (`web/document.mjs`, cuadrícula de 5 mm)

| Hoja | Tamaño | Anverso (izq/der/arr/abajo) | Reverso |
| --- | --- | --- | --- |
| `OFICIO_ESPIRAL` | 211 × 322 mm | 20 / 16 / 20 / 17 | 16 / 20 / 22 / 15 |
| `TRAPPER_TOP` | 211 × 280 mm | 30 / 11 / 20 / 10 (agujeros a la izquierda) | 12 / 29 / 21 / 10 |

- Se elige en **Tareas → Hoja** o con `[[hoja trapper]]` en el primer renglón.
- **Márgenes dentro del marco:** 1 cuadrito a la izquierda, 2 a la derecha, 1 arriba y 1 abajo.
- **Impresora Epson T50:**
  - corrección de anverso 5 mm → y 1 mm ↓; reverso 6 mm → y 1 mm ↓;
  - así la letra queda a 2 cuadritos del marco, que es lo que le gusta (prueba 3);
  - el amarillo está tapado y el negro casi vacío: el azul sale bien y el rojo sale rosado;
  - la hoja se empuja contra la guía derecha.

## Tinta real (`web/ink.mjs`)

Antes, de cerca, la letra impresa se notaba: el borde quedaba mordido por la foto y la tinta, plana.
- **Tinta real**, por defecto en Tareas y en los prácticos:
  - cada letra se adelgaza a su línea central y el ancho se mide con área ÷ largo;
  - se redibuja como bolígrafo: el tono varía por trazo, es más oscuro en los cruces, deja gotitas al empezar y alguna rayita pálida;
  - cada letra se dobla un poco distinto;
  - las líneas de cada muestra se guardan en caché y se trasladan con una transformación afín.
- **Si no encaja:** cuando las líneas no reconstruyen bien la letra (sobra o falta tinta, o un ojo cerrado), se usa el contorno suavizado (desenfoque + marching squares).
  - `inkMode(muestras)` elige `lineas` (Natural) o `contorno` (2A y 2Y, fotos con ruido).
- **Formato:**
  - `[[tinta real|plana]]`;
  - `[[titulos a mano]]` deja libre el lugar de los títulos y «Ejercicio N.-», que se ven tenues solo en pantalla;
  - `componer.mjs … --ploter` genera SVG de líneas centrales para un plóter.
- La guía para que no se note impreso y la hoja de prueba están en `outputs/prueba-tinta-real/`.
- **Pendiente de la usuaria:**
  - imprimir la prueba, escribir el bloque 4 con su lapicero y mandar foto para igualar color y grosor;
  - decir si prefiere la tinta real o la plana.
- **Falta:** la pestaña Páginas (`exports.mjs`) sigue con tinta plana. La APK no se reconstruyó (no hay clave de firma).

## Reglas de sus tareas

- **Título y encabezados:** título centrado con un renglón libre debajo; `### Ejercicio N.-` en rojo.
- **Datos y resolución:** datos a la izquierda y resolución a la derecha (`[[columnas 12]]`); la respuesta (`!!`) termina con dos rayitas «//». **El recuadro solo cuando ella lo pida** (`[[respuesta recuadro]]`).
- **Gráficas:** máximo 3 por cara, a la izquierda, «bonitas pero no perfectas». Sin dibujos.
- **Tinta:** bolígrafo azul tipo BIC (`#283a7c`, el tono varía letra por letra); títulos en rojo `#b02a33`.
- **Renglones:**
  - cada renglón empieza hasta ~1 mm más adentro o más afuera, como a mano;
  - corta palabras con guion por sílabas, 2 cuadritos antes del margen derecho;
  - un enunciado nunca queda solo al pie de una hoja.
- **Enunciados:** no copiar las respuestas «R:» del enunciado.
- **«//» solo en resultados de ejercicios de verdad**, no en fórmulas de teoría.
- **Dibujos:** `[[dibujo ancho alto]]` con circulo/linea/punto/texto, a mano alzada (no perfectos). Solo cuando los pida.
- **Sin negritas** (`**`): a mano no existen y delatan la impresión. Solo si ella las pide.
- **Preguntas y respuestas:** una pregunta (renglón que termina en «?») nunca queda sola al pie de la hoja.
- **Formato:**
  - la guía completa está en `outputs/practicos/FORMATO-TRAZO.md`;
  - las unidades en línea se escriben con doble barra (`g//mol`) y las fracciones con una (`a/b`);
  - `[[lapicero bic-azul|gel-azul|lapiz…]]`.

## Para generar un práctico

```
node work/practicos/componer.mjs fuente.txt carpeta Nombre [--perfil personal-2y-v1]
```

Genera el PDF completo, anversos, reversos, la hoja blanca con cuadrícula y los PNG.

## Lo que ya está hecho (carpeta `outputs/`)

- `practicos/`: Matemáticas, Física (4 ejercicios) y Práctico 5, en Oficio con Natural.
- `practicos-trapper/`: Química (2A), Física de energía (17 ejercicios, 2Y) y Física corta (2Y), en Trapper.
- `fuentes-2a-2y/`: las dos fuentes (.otf, .trazo, muestras y pruebas).
- `investigaciones-trapper/`: Investigación sobre circunferencia (25 preguntas, Trapper, Natural, tinta real, sin negritas, con los dos esquemas a mano alzada y sin «//», porque es teoría).
- `prueba-tinta-real/`: guía «que no se note impreso», hoja de prueba antes/ahora y comparación ampliada. Los prácticos de arriba se generaron antes y tienen tinta plana; al regenerarlos salen con tinta real.
- `mi-caligrafia/`: Natural y las versiones anteriores.
- `hoja-prueba-oficio/`, `prueba-lapiceros/`: pruebas de impresión.

## Cuidados

- Nunca publicar la clave privada de `work/trazo-android/signing`.
- Trabajar en la rama indicada por la sesión (la última es `ccr-6e94865d-c20f7c`) y no abrir PR sin que lo pida.
- Responder en español.
