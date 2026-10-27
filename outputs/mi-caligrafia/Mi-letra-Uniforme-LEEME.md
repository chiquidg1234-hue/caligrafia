# Mi letra Uniforme

Contiene 111 muestras para los mismos 111 caracteres de Original y Optimizada: una forma real por carácter. La elección se hizo comparando visualmente las variantes de las fotos y sus contornos recuperados. No se eligió automáticamente la muestra más cercana a una media.

## Qué cambió

- Se revisaron las 390 muestras y se eligió una de cada carácter. Las 63 letras/cifras con alternativas tienen una justificación individual en `Mi-letra-Uniforme-curacion.json`; para los otros 48 caracteres solo había una muestra disponible.
- Se utiliza el contorno de Optimizada correspondiente a la variante elegida. Así se conserva su suavizado y ajuste de tinta previos. La nueva versión aplica solo transformaciones afines y espacio lateral estable; no redibuja letras ni combina partes de muestras distintas.
- Las alturas del cuerpo se acercan a 510 unidades para mayúsculas/ascendentes y 340 para minúsculas, con excepciones para i, t y cifras. El cambio vertical está limitado a ±12 % en letras ordinarias y ±20 % en caracteres con diacríticos. El signo ! se reduce un 20 % por su altura excepcional en el recorte.
- Se alinean los cuerpos de las letras acentuadas y las cifras con la base. En g, p y q se usa la base del óvalo para conservar el descendente. Se centran signos como +, =, ÷, ~ y comillas angulares.
- 16 astas verticales reciben una corrección horizontal moderada, medida sobre el contorno, de hasta 4.858 grados equivalentes. Las diagonales propias de V, W, X, Y y Z conservan su construcción.
- Hay una sola variante y no hay reglas de alternancia contextual. Por eso escribir la misma letra siempre utiliza el mismo contorno; tampoco varía el avance entre repeticiones.

## Comprobaciones

- 111 caracteres presentes tanto en la biblioteca como en el mapa Unicode de la fuente; 111 identificadores únicos.
- Todos los contornos, componentes y huecos de las muestras elegidas se conservan. También se revisaron puntos, acentos, diéresis y descendentes en la lámina y el texto de prueba.
- Coordenadas finitas, márgenes laterales positivos y todos los contornos dentro del intervalo vertical seguro de −350 a 1050 unidades (1000 unidades por em).
- Los seis archivos `.trazo`, `.ttf` y `.json` de Original y Optimizada permanecen idénticos byte por byte. Sus hashes SHA-256 están en el informe.
- `perfiles.json` añade Uniforme manteniendo intactos los datos de los perfiles anteriores.

La dispersión relativa de altura entre las mayúsculas seleccionadas pasa de 0.0814 a 0.0260; en las minúsculas del conjunto `acemnorsuvwxz`, de 0.0815 a 0.0366. Se compara la misma selección antes y después del ajuste, para no atribuir a la transformación el efecto de escoger otras variantes. La desviación media absoluta de la base de los cuerpos con diacríticos pasa de 35.43 a 0.00 unidades. Son medidas geométricas de consistencia, no una valoración estética ni un porcentaje de parecido.

## Decisiones de revisión

La revisión ampliada cambió cuatro elecciones iniciales: Ñ de 2 a 1 para conservar la tilde separada; P de 2 a 3 para tener un lóbulo cerrado; Z de 3 a 6 porque la extracción de 3 había perdido la barra superior; w de 5 a 6 por una entrada más continua. El informe conserva los identificadores exactos, la variante elegida y la razón de cada elección.

La j recuperada en estas muestras no tiene punto: se conserva así. La R y algunos signos mantienen aperturas o irregularidades del trazo fotografiado. No se ha calculado un porcentaje de parecido ni se ha validado una impresión física. El resultado conserva rasgos y pequeñas irregularidades de la escritura real.

## Archivos y reproducción

- `Mi-letra-Uniforme.trazo`: biblioteca editable.
- `Mi-letra-Uniforme.ttf`: fuente instalable; no se instala automáticamente.
- `Mi-letra-Uniforme-prueba.png`: prueba de texto, letras, cifras y signos.
- `Mi-letra-Uniforme-comparacion.png`: Original, Optimizada y Uniforme al mismo tamaño y con el mismo texto; las anteriores alternan variantes con la misma semilla.
- `Mi-letra-Uniforme-seleccion.png`: las 111 elecciones, antes/después.
- `Mi-letra-Uniforme-curacion.json`: selección auditable, medidas, hashes y límites.
- `work/caligrafia-2026-10-21/curar_uniforme.py`: script reproducible. Se ejecuta con el Python ya disponible y reutiliza las bibliotecas locales de Trazo. `--review` genera las ocho hojas de candidatos completas.
- `work/caligrafia-2026-10-21/bundled-letter.json`: tres perfiles derivados para integrar en la app; solo contiene `id`, `label`, `char`, `paths`, `advance` y `baseline` por muestra. No incluye fotos, rutas personales ni metadatos de captura.

No se instalaron recursos ni se subieron fotografías.
