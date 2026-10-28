# Fuente 2A y Fuente 2Y

Dos letras nuevas, sacadas de las dos fotos que me pasaste. Las dejé **normales, del promedio**: no las embellecí. Solo igualé el tamaño (todas las letras miden lo mismo que en Mi letra Natural, y las colas de g, p, q, y no bajan más que en tu letra, para que no dejen renglones vacíos) y suavicé los bordes de los píxeles de la foto. También saqué las muestras que se leían mal (una «J» sin techo parecía «)», «T» que parecían «1»).

| Letra | Sale de | Letras propias (de la foto) |
| --- | --- | --- |
| **Fuente 2A** | la foto de matemáticas, la de los números | `a b c d e i j l m n o p r s t x y z`, `L P R`, `0 1 2 3 4 5 6 7 9`, `( ) + - , ? ±` |
| **Fuente 2Y** | la foto de religión (el sello y la firma no entran) | `a b c d e f g h i l m n o p q r s t u v x y ó`, `D E F H J S T U Y`, `2 4 5 7 )` |

Cada letra tiene hasta 8 versiones distintas, como en la foto. La app las va turnando, así que nunca salen dos «a» iguales seguidas.

## Lo que no estaba en la foto

Una foto no trae todas las letras, así que completé el resto en este orden:

1. **Tildes y ñ:** á é í ó ú ñ se hacen con las vocales y la «n» de la misma letra. Les agregué una tilde o una virgulilla hecha a mano, del mismo grosor de su trazo.
2. **De la otra foto:**
   - a la 2A le presté de la 2Y: `D E F f g H h J q S T U u v Y ó`
   - a la 2Y le presté de la 2A: `j L P R z 0 1 3 6 9 ( ? , - + ±`
   - El punto y los dos puntos son puntitos hechos con la misma pluma.
   - La «μ» (rozamiento) es la «u» de cada letra con un palito hacia abajo.
3. **De Mi letra Natural (tu letra):** lo poco que no aparece en ninguna de las dos fotos. Son mayúsculas poco usadas (`A B C G I K M N Ñ O Q V W X Z`), `k w 8` y los signos (¿ ¡ ! ; « » < > ≤ ≥ π Δ …).

El detalle está en `Fuente-2A-origen.json` y `Fuente-2Y-origen.json`. Si me mandas otra foto con esas letras (por ejemplo, una hoja con el abecedario en mayúsculas y los números), las cambio por las de esa misma letra.

## Cómo usarlas

- **En Trazo:** arriba, en **Biblioteca activa**, elige **Fuente 2A** o **Fuente 2Y** y entra a **Tareas** o a **Páginas**. Todo lo demás funciona igual: lapicero, márgenes, gráficas y PDF de anversos y reversos.
- **En la computadora (Word, LibreOffice, etc.; Google Docs no deja subir fuentes):** instala `Fuente-2A.otf` o `Fuente-2Y.otf` con doble clic → Instalar. Ahí sale una sola versión de cada letra, porque Word no turna las versiones.
- **En otro celular con Trazo:** **Mi letra → Importar biblioteca** y elige el archivo `.trazo`.

## Archivos

- `Fuente-2A-letras-de-la-foto.png`, `Fuente-2Y-letras-de-la-foto.png`: todas las letras propias de cada foto, con sus versiones.
- `Fuente-2A-prueba.png/.pdf`, `Fuente-2Y-prueba.png/.pdf`: una hoja de prueba escrita con cada letra. El texto está en `prueba.txt`.
- `Fuente-2A.otf`, `Fuente-2Y.otf`: fuentes para la computadora.
- `Fuente-2A.trazo`, `Fuente-2Y.trazo`: bibliotecas para importar en Trazo.

## Volver a generarlas

Las herramientas están en `work/fuentes-2a-2y`:

1. `preparar.py` limpia la foto y quita la cuadrícula.
2. `componentes.py` y `miniaturas.py` separan los trazos en hojas numeradas.
3. En `etiquetas-2a.txt` y `etiquetas-2y.txt` está anotado qué letra es cada número.
4. Después se corren `muestras.py`, `construir.mjs`, `completar.mjs`, `integrar.mjs` y `entregar.mjs`, en ese orden.

## ¿Lo puede hacer otra IA o un modelo gratis?

- **Escribir la tarea** en formato Trazo: sí, cualquier chat, incluso gratis (ChatGPT, Gemini, Claude). Usa la indicación de `outputs/practicos/FORMATO-TRAZO.md`.
- **Sacar una letra nueva de una foto:** hay que limpiar la imagen, separar cientos de trazos, reconocer cada letra y probar el resultado en la app. Eso necesita un asistente que pueda correr programas en el repositorio, como Claude Code. Un modelo más chico, como Sonnet, también puede hacerlo, pero conviene revisar más su trabajo. Un chat gratis sin acceso a archivos ni a programas no puede hacerlo.
- **Sin ninguna IA:** en **Trazo → Mi letra** está la **Plantilla completa** (6 hojas). Imprímela, llénala a mano, sácale foto y Trazo arma la letra solo. Así sale mejor que desde una foto de cuaderno, porque cada letra queda en su casilla.
