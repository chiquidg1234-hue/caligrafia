# Prueba de alineación (hoja Trapper)

`Prueba-Alineacion-Trapper.pdf`: dos caras con 46 renglones cada una, para ver si la base de la letra toca el renglón arriba, en el medio y abajo de la hoja.

1. Imprime al 100 %, papel 211 × 280 mm, «Alta velocidad» apagada. Anverso primero y reverso por detrás.
2. Manda una foto de cada cara: se miran las filas 1, 23 y 46.
3. Con eso se sabe si el problema es un corrimiento (se corrige con `drop` u `offsets`) o un estiramiento del avance del papel (se corrige con una escala vertical).

Se genera con `node work/practicos/componer.mjs outputs/prueba-alineacion-trapper/prueba-alineacion.txt outputs/prueba-alineacion-trapper Prueba-Alineacion-Trapper`.
