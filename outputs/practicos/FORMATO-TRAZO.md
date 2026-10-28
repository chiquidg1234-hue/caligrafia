# Formato Trazo para tareas

Con este formato, cualquier tarea queda escrita con tu letra en la hoja Oficio cuadriculada. Lo escribes tú, me lo pasas a mí o se lo pides a otra IA, lo pegas en **Trazo → Tareas** y descargas el PDF.

## Reglas del formato

| Escribes | Sale en la hoja |
| --- | --- |
| `# Práctico de Física` | Título centrado, más grande y en color, con un renglón libre debajo. |
| `## 2. Encuentra la ecuación…` | Subtítulo en color, a la izquierda, con un renglón libre arriba. |
| `### Ejercicio 1.-` | Encabezado del ejercicio, en color. |
| Una línea de texto | Un párrafo. Si no cabe, sigue abajo y corta las palabras con guion por sílabas («gue-rra»). |
| Línea vacía | Un renglón libre. |
| `- texto` | Viñeta «·» con sangría. |
| `!! P = 125 000 Pa` | Respuesta encerrada en un recuadro hecho a mano. |
| `**Datos:**` | Negrita. |
| `---` | Pasa a la otra cara de la hoja. |

**Fórmulas** (en cualquier línea):

| Escribes | Sale |
| --- | --- |
| `x^2`, `x^{n+1}`, `10^-3` | potencias |
| `v_0`, `P_{atm}`, `m_2` | subíndices |
| `a/b`, `(x+1)/(x-1)`, `{2x}/3` | fracciones. Los paréntesis de afuera no se dibujan. |
| `3/2x`, `-1/4(x - 5)` | (3/2)·x y (−1/4)·(x − 5) |
| `raiz(x)`, `raiz[3](27)` | raíz cuadrada y raíz con índice |
| `log_2(8)` | logaritmo en base 2 |
| `<=` `>=` `!=` `+-` `->` `*` | ≤ ≥ ≠ ± → · |
| `π ρ Δ ≈ × ° |` | se escriben directo |

**Datos a la izquierda, resolución a la derecha:**

```
[[columnas 12]]
**Datos:**
F = 50 N
A = 4 cm^2
P = ?
[[|]]
P = F/A
P = (50 N)/(0,0004 m^2)
!! P = 125 000 Pa
[[fin]]
```

`12` es el ancho de la columna izquierda, en cuadritos.

**Coordenadas** (van dentro de la columna izquierda):

```
[[grafica -2 10 -2 10]]
recta 1 4 -33 | x+4y-33=0
punto 5 7 | (5,7)
punto 9 6 | (9,6)
[[fin]]
```

- Los cuatro números son x mínimo, x máximo, y mínimo, y máximo.
- `recta a b c` dibuja la recta a·x + b·y + c = 0. Con etiqueta sale en rojo (la respuesta); sin etiqueta sale en azul fino (la recta de referencia).
- Los ejes, las marcas y los números van a mano, apoyados en la cuadrícula.

**Ajustes:**
- `[[tamaño 18]]`: tamaño de la letra.
- `[[renglon medio]]` y `[[renglon seguido]]`: dejar o no un renglón libre entre líneas.
- `[[espacio 2]]`: dos renglones libres.
- `[[graficas-por-hoja 3]]`: como máximo 3 gráficas por cara.
- `[[color #1f3a93]]`: color del texto.
- `[[lapicero bic-azul]]`: tinta de un lapicero. Puede ser `bic-azul`, `bic-negro`, `bic-rojo`, `gel-azul` (microgel), `gel-negro` o `lapiz`; con `libre`, el color va fijo, sin variación.

## Reglas de tu cuaderno (la app las aplica sola)

- **Márgenes:** en tu hoja impresa la letra empieza a 2 cuadritos del marco rosado a la izquierda (1 de margen y la corrección de la impresora) y termina 2 antes del de la derecha. Cada renglón empieza un poquito distinto, como a mano. Empieza 1 renglón debajo del borde de arriba.
- **Letra:** elígela arriba, en **Biblioteca activa**: Mi letra Natural, Fuente 2A o Fuente 2Y.
- **Colores:** el texto va con tinta de bolígrafo azul tipo BIC (#283a7c, cada letra con un tono un poco distinto); los títulos, subtítulos y rectas de respuesta en rojo (#b02a33).
- **Gráficas:** como máximo 3 por cara en matemáticas.
- **Hojas:** un título o enunciado nunca queda solo al final de una hoja; se pasa con su resolución a la siguiente.

## Para pedírselo a otra IA

Copia esto y agrega tu tarea al final:

> Escribe la resolución de esta tarea en «formato Trazo», en texto plano, sin Markdown extra ni LaTeX. Usa `# Título` una sola vez (por ejemplo «# Práctico de Física»). Para cada ejercicio, escribe `### Ejercicio N.-` y copia el enunciado tal cual en la línea siguiente. Deja una línea vacía y abre `[[columnas 12]]`. A la izquierda va `**Datos:**`, con un dato por línea (por ejemplo `m = 95 kg`, `P = ?`). Después va `[[|]]`, y a la derecha la resolución paso a paso, una igualdad por línea. Termina con la respuesta en una línea que empiece con `!! ` y cierra con `[[fin]]`. Deja una línea vacía entre ejercicios.
>
> Fórmulas: `x^2`, `v_0`, `P_{atm}`, fracciones `a/b` o `(a+b)/(c+d)`, `raiz(x)`, `raiz[3](x)`, `·` para multiplicar, comas decimales (`9,8`) y unidades como `m/s^2`. Si hay coordenadas, pon en la columna izquierda `[[grafica xmin xmax ymin ymax]]`, con líneas `recta a b c | ecuación` y `punto x y | (x,y)`, y cierra con `[[fin]]`. No uses tablas, imágenes, `$`, `\frac` ni `\boxed`.

Si la otra IA se equivoca en algo, la app te muestra el error con el número de renglón, sin imprimir nada.

## ¿Otra IA, un chat o Claude?

- **Para escribir la tarea** (el contenido): sirve cualquier chat. ChatGPT, Gemini o Claude pueden usar la indicación de arriba. Revisa siempre que la resolución esté bien; la app copia lo que le des.
- **Para cambiar la app** (agregar funciones, arreglar algo): conviene un asistente que pueda leer y modificar el repositorio completo y correr las pruebas, como Claude Code en esta misma rama. Un chat sin acceso al código puede proponer cambios, pero no comprobarlos.
