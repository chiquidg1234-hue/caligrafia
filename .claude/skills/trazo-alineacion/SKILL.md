---
name: trazo-alineacion
description: Úsala siempre que generes, regeneres o cambies algo que termine en un PDF de Trazo (prácticos, investigaciones, pruebas en hoja Trapper u Oficio). Asegura que la letra caiga sobre los renglones, que nada toque el marco y que se compruebe a la vista antes de entregar. También para cuando la usuaria diga que la letra salió «descoordinada», fuera del renglón o a media línea.
---

# Trazo: que la letra siempre caiga en el renglón

Lo que importa es que **la base de cada letra toque el renglón de la cuadrícula**, en las dos caras, en todas las hojas. La app ya lo calcula; este procedimiento sirve para comprobarlo y no entregar nada sin comprobar.

## Antes de entregar cualquier PDF

1. **Genera siempre con** `node work/practicos/componer.mjs fuente.txt carpeta Nombre [--perfil id]`. Por dentro:
   - `margins` revisa que la tinta no toque el marco ni los cuadritos libres;
   - `work/practicos/alineacion.mjs` toma, en cada renglón de texto, la mediana de la base de las letras y la compara con la línea de la cuadrícula. **Si alguna queda a más de 0,5 mm, no genera.** Un resultado normal es de 0,1 a 0,4 mm.
   - No esquives esos avisos: si fallan, arregla la causa; no subas la tolerancia.
2. **Mira las imágenes** (`…-pagina-N-….png`) de la primera página, de una del medio y de la última, una anverso y una reverso. Fíjate en que:
   - las bases tocan las líneas azules, no quedan a media altura;
   - ninguna letra, ni siquiera la `g`, `p`, `y`, baja hasta la mitad del renglón de abajo (la cola más larga mide unos 2 mm; la mitad del renglón son 2,5);
   - no hay letras convertidas en puntos (pasaba con la «D» chica en una fracción) ni letras pegadas al margen.
3. **Si cambiaste una letra o un perfil** (una D nueva, `personal-normal-v1`…), prueba la letra en tamaño chico (fracciones `D/2`, subíndices) y en la tinta real: algunas formas se vuelven puntos al achicarse.
4. **Corre las pruebas**: `cd outputs/trazo-android && node --test tests/*.test.mjs`.
5. **Sube todo a GitHub** (rama de trabajo) y manda los PDF.

## Lo que NO se debe tocar sin medir

- `drop`, `offsets` y `insetRight` de la hoja (`TRAPPER_TOP`, `DOCUMENT_DEFAULTS` en `outputs/trazo-android/web/document.mjs`), y `graphDx` (las gráficas van 1,5 mm a la izquierda). Se cambian solo con una medición en una foto de la hoja impresa.
- El tamaño de la letra y los tamaños de palabra (`naturalise` en `core.mjs`): el cambio de tamaño de una palabra a otra no pasa de ±10 %.

## Si ella dice que «salió descoordinado»

El archivo ya pasó la comprobación, así que lo más probable es la impresión (la hoja se corre o el avance de papel no es exacto), no el texto. No «arregles» a ciegas:

1. Pídele que imprima `outputs/prueba-alineacion-trapper/Prueba-Alineacion-Trapper.pdf` (46 renglones por cara, ambas caras, al 100 %, papel 211 × 280 mm, «Alta velocidad» apagada) y mande una foto de cada cara con las filas de arriba, del medio y de abajo.
2. Mide en la foto cuánto se separa la base de la letra del renglón en cada zona de la hoja:
   - separación **igual** en toda la hoja → ajustar `drop` (vertical) o `offsets`;
   - separación que **crece hacia abajo** → la impresión se estira: corregir con una escala vertical (pendiente) y no con un simple desplazamiento;
   - distinta en anverso y reverso → ajustar `offsets` de cada cara.
3. Cambia el valor, vuelve a generar, y registra la medición en `outputs/RESUMEN-PARA-NUEVO-CHAT.md`.

## Reglas de sus tareas (resumen)

- Letra: **solo la suya** (Natural; modo `[[letra intermedia]]`, o la «normal» `personal-normal-v1`). Nada de mezclas con 2A/2Y.
- Rojo: títulos, «Ejercicio N.-», preguntas (`?? `) y resultados (`[[resultados rojo]]`). Azul: todo lo demás.
- Matemáticas: enunciado seguido; resolución corta con una fila libre entre pasos; resultados con «//»; 3 gráficas como máximo por cara.
- `[[sin graficas]]` y `[[sin resultados]]` dejan el lugar en blanco para que ella los haga a mano.

## Modo calibrado (desde 06/11 noche)
Los PDF para imprimir en la Mac (página Letter) se generan con `--calibrado`: `node work/practicos/componer.mjs fuente.txt carpeta Nombre [--perfil id] --calibrado`.
- Usa `work/practicos/calibracion-trapper.json` (modelo medido: la tinta cae en E(x,y) mm respecto a la línea; se dibuja en p−E(p)), sustituye `offsets`/`drop` y pone `graphDx: 0`.
- Pone cruces de control en las 4 esquinas del marco: si no caen exactamente sobre la esquina, la hoja entró mal → reimprimir (la hoja entra distinta ~±0,3 mm normal, ~2 mm si entra torcida).
- El reverso del modelo es un ESTIMADO hasta medirlo con `Calibracion6-Trapper-Letter.pdf` (página 2).
- Para recalibrar: imprime `work/practicos/calibracion6.mjs` (verniers) y mide con foto; ver `outputs/calibracion-trapper/LEEME.md`.
- La compuerta de alineación ignora las letras de gráficas/dibujos (`free: true`), que no van sobre renglón.
- Colores: los prácticos y trabajos van en **azul (letra) y rojo (títulos, preguntas, gráficas)**. No usar negro (la impresora de ella no tiene tinta negra). Las flags `--titulo`/`--grafica` existen pero no se usan.
- Las cruces de control del marco solo salen con `--control` (a ella no le gustan en los trabajos finales).
- Gráficas que ella dibuja a mano: subtítulo `## Gráfica N` + `[[espacio N]]`; nada de rótulos pequeños.
