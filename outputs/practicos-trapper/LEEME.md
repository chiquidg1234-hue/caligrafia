# Prácticos en hoja Trapper

Todos se regeneraron el 30/10 con tinta real (calibrada con la foto de tu lapicero), sin negritas y con las rayitas «//» solo en los resultados.

| Carpeta | Letra | Contenido | Páginas |
| --- | --- | --- | --- |
| [`Practico-5-Fisica-Normal`](Practico-5-Fisica-Normal) | **Mi letra · normal** | Práctico 5 de física (presión), 17 ejercicios | 6 (3 hojas) |
| [`Practico-5-Fisica-2Y`](Practico-5-Fisica-2Y) | **Fuente 2Y** | El mismo Práctico 5 | 7 (4 hojas) |
| [`Practico-Quimica-2A`](Practico-Quimica-2A) | **Fuente 2A** | Ley de los gases ideales, ejercicios 1 al 10 | 6 (3 hojas) |
| [`Practico-Fisica-Energia-2Y`](Practico-Fisica-Energia-2Y) | **Fuente 2Y** | Trabajo, potencia y energía, ejercicios 1 al 17 | 6 (3 hojas) |
| [`Practico-Fisica-6-2Y`](Practico-Fisica-6-2Y) | **Fuente 2Y** | El práctico corto de 4 ejercicios (cubo de aluminio, pistón, prensa hidráulica, empuje) | 2 (1 hoja) |

Cada carpeta tiene lo mismo que los prácticos anteriores:
- `…-1-anversos.pdf` y `…-2-reversos.pdf`
- `….pdf` con todo
- `…-hoja-blanca-con-cuadricula.pdf` para probar en hoja blanca
- un PNG de cada página

Los textos están en [`fuentes`](fuentes). Se pueden pegar en **Trazo → Tareas**.

## La hoja Trapper (tus medidas)

| | Hoja | Área útil | Izquierda | Derecha | Arriba | Abajo |
| --- | --- | --- | --- | --- | --- | --- |
| Anverso | 21,1 × 28,0 cm | 17,0 × 25,0 cm | 3,0 cm (agujeros) | 1,1 cm | 2,0 cm | 1,0 cm |
| Reverso | 21,1 × 28,0 cm | 17,0 × 24,9 cm | 1,2 cm | 2,9 cm (agujeros) | 2,1 cm | 1,0 cm |

- La app ya tiene esta hoja. En **Tareas → Hoja** elige «Trapper cuadriculada», o escribe `[[hoja trapper]]` en el primer renglón del texto.
- Se aplican las mismas reglas que en el Oficio:
  - 1 cuadrito libre a la izquierda y 2 a la derecha;
  - con la corrección de la impresora quedan **2 cuadritos** a la izquierda;
  - el título va centrado; los datos a la izquierda y la resolución a la derecha;
  - tinta de bolígrafo azul y títulos en rojo;
  - cada renglón empieza un poquito distinto.
- **Corrección de la impresora:** la misma de la Epson T50 que gustó en la prueba 3: anverso 5 mm → y 1 mm ↓, reverso 6 mm → y 1 mm ↓. Si en la Trapper se corre distinto, cámbiala en **Tareas → Hoja · tinta · impresora**.

## Cómo imprimir

1. En el diálogo de impresión: **tamaño real / 100 %**, papel definido por el usuario de **211 × 280 mm**.
2. Imprime `…-1-anversos.pdf` con la cara de los agujeros a la **izquierda**.
3. Deja secar, da vuelta las hojas (ahora los agujeros quedan a la **derecha**) e imprime `…-2-reversos.pdf`.
4. Si quieres probar primero, imprime `…-hoja-blanca-con-cuadricula.pdf` en una hoja blanca y ponla sobre una Trapper, contra la luz.

## Lo que hay que mirar en esta prueba

- **Fuente 2Y y la «t»:** esta letra escribe la «t» casi como una «T». En física se confunde **t** (tiempo) con **T** (trabajo), por ejemplo en «t = 15 s» y «T = 1350 J». Si te molesta, dímelo: puedo usar otra «t» para la 2Y o cambiar trabajo por **W**.
- **Fuente 2Y y la «s»:** la «s» parece un «)». Así está en la foto.
- **Unidades:** ahora se escriben en el mismo renglón (`g/mol`, `m/s²`) y ya no como fracción. Así los datos quedan juntos, sin renglones vacíos. En el texto se escriben con doble barra: `g//mol`.
- **Química 6, 7 y 8:** los datos no coinciden entre sí. Por ejemplo, 0,30 mol de O₂ son 9,6 g y no 5 libras. Puse la densidad, que no depende de eso, y el radio de las dos formas: A) con los moles y B) con las libras, como en tu PDF.
- **Física 7:** usé 1 cal = 4,184 J (464,89 m). La respuesta de la hoja (469,96 m) usa 1 cal ≈ 4,23 J. Lo anoté debajo.
- **Física 13:** supuse que parte del reposo (v₀ = 0); el enunciado no lo dice.
- **Física 16:** el enunciado dice «0,15 gramos»; el coeficiente no lleva unidades. La respuesta es el trabajo de la fuerza (960 J). Debajo agregué el trabajo neto (842,4 J).
- No copié las respuestas «R:» de los enunciados.

## Volver a generar

```
node work/practicos/componer.mjs outputs/practicos-trapper/fuentes/practico-quimica.txt outputs/practicos-trapper/Practico-Quimica-2A Practico-Quimica --perfil personal-2a-v1
node work/practicos/componer.mjs outputs/practicos-trapper/fuentes/practico-fisica-energia.txt outputs/practicos-trapper/Practico-Fisica-Energia-2Y Practico-Fisica-Energia --perfil personal-2y-v1
node work/practicos/componer.mjs outputs/practicos-trapper/fuentes/practico-fisica-6.txt outputs/practicos-trapper/Practico-Fisica-6-2Y Practico-Fisica-6 --perfil personal-2y-v1
```
