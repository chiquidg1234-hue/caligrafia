# Prácticos con tu letra · Oficio con espiral

Tres prácticos listos para imprimir sobre tu cuaderno Oficio de cuadritos de 5 mm. Están escritos con **Mi letra Natural**, con tinta de **bolígrafo azul tipo BIC** (cada letra varía un poco de tono) y los títulos y rectas de respuesta en rojo.

| Carpeta | Contenido | Páginas |
| --- | --- | --- |
| [`Practico-Matematicas`](Practico-Matematicas) | Ejercicio 1 (a–e): teoría. Ejercicios 2, 3 y 4 (1 al 5): ecuación de la recta con su gráfica de coordenadas. Coordenadas a la izquierda, resolución a la derecha; como máximo 3 gráficas por cara. | 6 (3 hojas) |
| [`Practico-Fisica`](Practico-Fisica) | Los 4 problemas: enunciado, datos a la izquierda y resolución a la derecha. | 2 (1 hoja) |
| [`Practico-5`](Practico-5) | Los 17 ejercicios, sin los «Resp.» del indicador. Cada uno con enunciado, datos, resolución y respuesta encerrada. | 6 (3 hojas) |

Cada carpeta tiene:
- `…-1-anversos.pdf` y `…-2-reversos.pdf`: para imprimir cada cara en una sola tanda.
- `….pdf`: todas las páginas.
- `…-hoja-blanca-con-cuadricula.pdf`: para probar antes en una hoja blanca.
- Una imagen PNG de cada página, para revisarla.

Las fuentes en texto están en [`fuentes`](fuentes): las puedes abrir, corregir y pegar en **Trazo → Tareas**. El formato está explicado en [FORMATO-TRAZO.md](FORMATO-TRAZO.md).

## Lo que aprendí de tu prueba impresa

- **Desfase:** la impresora corre la hoja ≈5 mm a la izquierda y ≈1 mm hacia arriba. Los PDF llevan anverso 5 mm → y 1 mm ↓, reverso 6 mm → y 1 mm ↓. Así la letra empieza a **dos cuadritos** del marco, como en tu tercera prueba, que es la que más te gustó. Si algún día quieres un solo cuadrito, pon 0 y 1 en **Trazo → Tareas → Hoja Oficio espiral · tinta · impresora**.
- **Inicio de los renglones:** cada renglón empieza un poquito más adentro o más afuera (hasta ≈1 mm, unos 2 mm entre el más adentro y el más afuera), como cuando escribes a mano. Ya no queda una línea recta a la izquierda. Depende de la **Naturalidad**: con 0 % vuelve a salir recto.
- **Giro:** el anverso salió girado ≈0,8° porque la hoja entró chueca. El reverso, empujado contra la guía derecha, salió casi recto (0,3°). Eso se corrige al poner la hoja, no en el PDF:
  1. Quita los pedacitos que deja el espiral.
  2. Mete una sola hoja, plana, y empújala contra la **guía derecha**.
  3. Cierra la **guía izquierda** hasta que toque la hoja, sin doblarla.
  4. La cara que se va a imprimir mira hacia ti y el borde de arriba entra primero.
- **Tinta:** salen bien el cian y el magenta. El amarillo casi no sale (inyectores tapados; el nivel que muestra la Mac es de 11/2/22 y no es real). El negro está casi vacío. Por eso el azul queda perfecto y los títulos rojos salen rosados. Cuando limpies el amarillo (Utilidad → Test de inyectores y Limpieza de cabezales) y cambies el negro, el rojo saldrá rojo sin tocar nada.

## Cómo imprimir

1. Abre el PDF y elige **Tamaño real / 100 %** y papel definido por el usuario de **211 × 322 mm**. No uses «Ajustar a la página».
2. Imprime `…-1-anversos.pdf`. Cada hoja sale con su página 1, 3, 5…
3. Deja secar 5 minutos. Vuelve a meter cada hoja, ahora por el reverso (el espiral queda a la derecha), en el mismo orden, e imprime `…-2-reversos.pdf`.

## Detalles que conviene revisar

- **π, ρ y Δ** están armados con tus propios trazos (dos rayitas de «l», la «o», «/» y «\»), porque todavía no tengo tus muestras. Si me mandas foto de los cuadros de la hoja de prueba con las letras griegas, los cambio por los tuyos.
- **Práctico 5, ejercicio 10:** al enunciado le falta la altura del cono. Puse la respuesta de la hoja (1 747,30 Pa) y la altura que le corresponde (≈4,69 cm), como en tu resolución.
- **Práctico 5, ejercicio 12:** el enunciado dice 320π cm². Usé A₁ = 16π cm² para que coincida con él; el resultado no cambia (313,6 N).
- **Matemáticas:** las resoluciones son las que me pasaste. Agregué solo las gráficas: los puntos dados, la recta de respuesta en rojo y, en los ejercicios 3 y 4, la recta de referencia en azul fino.

## Volver a generar

```
node work/practicos/matematicas.mjs
node work/practicos/componer.mjs outputs/practicos/fuentes/practico-matematicas.txt outputs/practicos/Practico-Matematicas Practico-Matematicas
node work/practicos/componer.mjs outputs/practicos/fuentes/practico-fisica.txt outputs/practicos/Practico-Fisica Practico-Fisica
node work/practicos/componer.mjs outputs/practicos/fuentes/practico-5.txt outputs/practicos/Practico-5 Practico-5
```

Para escribirlos con otra letra, agrega `--perfil personal-2a-v1` (Fuente 2A) o `--perfil personal-2y-v1` (Fuente 2Y).

Usa el mismo motor que la app (`outputs/trazo-android/web/document.mjs`).
