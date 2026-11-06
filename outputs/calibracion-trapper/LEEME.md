# Calibración Trapper (ronda 1)

Imprime `Calibracion-Trapper-Letter.pdf` (2 páginas: 1 = anverso, 2 = reverso por detrás). Es una hoja Letter, que es lo único que ofrece la Mac. `…-211x280.pdf` es lo mismo con página de 211×280 mm, para comparar si el tamaño de página cambia algo.

**Imprimir:** Escala 100 % (nada de «ajustar a la página»), sin «Alta velocidad», misma calidad que los prácticos. Anotar con qué opciones se imprimió.

**Qué mandar:**
1. Foto de cada cara, de frente y bien iluminada, sobre todo las 4 franjas de marcas rojas (arriba, abajo, izquierda, derecha). La marca roja que tape exactamente la línea azul de la hoja da el corrimiento (el número impreso al lado).
2. Con regla: distancia entre las cruces A–B y entre A–C (deben ser 190 y 260 mm), y de A al borde izquierdo y al borde superior del papel (deben ser 10 mm).

Con eso se calculan desplazamiento, escala e inclinación. Luego viene una ronda 2 con verniers finos alrededor del valor encontrado.
Se genera con `node work/practicos/calibracion.mjs`.

## Ronda 2 (`Calibracion2-Trapper-Letter.pdf`)
La ronda 1 no era medible: los círculos tenían 0,8 mm de holgura y los verniers eran difíciles de leer en foto. Ahora son 4 bandas por cara (X-A…X-D, Y-A…Y-D) con marcas cada 0,1 mm y números grandes (décimas de mm). Se lee a ojo sobre el papel: la marca roja que TAPA su línea verde da el valor; se anotan los 8 números por cara. Se genera con `node work/practicos/calibracion2.mjs`.

## Ronda 4 (`Calibracion4-Trapper-Letter.pdf`) y cómo comparar
Corrección medida en la ronda 2 (`work/practicos/calibracion-trapper.json`): rotación ≈0,25° más desplazamiento. En esta hoja las franjas finas (−1,0…+1,0 mm) ya están corregidas: si el modelo es bueno, la marca que tapa la línea es la «0» en las 8 franjas. Hay además un parche de 9×6 cuadros (no toda la hoja).
Comparación: antes de corregir X-A/B = −1,0, X-C/D ≈ 0 a −0,3, Y-A/B = +1,5, Y-C/D = +1,0. Después de corregir, lo leído es el error que queda; la diferencia entre ambas tablas es lo que se arregló.
La página 2 es el reverso sin corregir (vernier de la ronda 2).

## Resultado de la ronda 4 (medido sobre la foto) y ronda 5
- X (horizontal): con la corrección quedó un error de ≈ +0,3 mm en las tres franjas visibles (antes +1,0 arriba y +0,1 abajo): el modelo X funciona, falta sumar ≈0,3 mm.
- Y (vertical): con la corrección quedó −1,9 mm (izq.) y −1,6 mm (der.); sin corregir en la ronda 2 era −1,55 y −1,0. Es decir, la hoja cayó ≈1,7 mm más arriba que en la impresión anterior: **el avance vertical no se repite de una impresión a otra** (X sí, ±0,3 mm).
- La impresión se cortó hacia y≈239 mm (X-C con las marcas truncadas, X-D, rótulos y cruces C/D no salieron). En la ronda 2 sí llegó a 270 mm.
- `Calibracion5-Trapper-Letter.pdf`: sin corrección, rango ±2,4 mm, regla de límite de impresión. Imprimir la página 1 DOS veces (dos hojas, cargando como siempre) para medir cuánto varía la Y entre hojas; página 2 = reverso.
