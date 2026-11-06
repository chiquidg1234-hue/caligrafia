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
