# Tu caligrafía personal en Trazo

Primera versión funcional y revisable a partir de tus cinco fotografías del 21 de octubre de 2026. No se ha medido un porcentaje de parecido ni se ha comprobado una impresión física.

## Qué puedes usar ahora

- **Mi-letra-Original.ttf**: fuente instalable que conserva las variaciones de los trazos recuperados de tus fotos.
- **Mi-letra-Optimizada.ttf**: las mismas muestras, con ajuste moderado de proporciones, espacios, contornos y grosor de las letras para que la tinta se vea más uniforme. No inventa letras nuevas. Original se conserva sin este ajuste.
- **Mi-letra-Original.trazo / Mi-letra-Optimizada.trazo**: bibliotecas editables para importar en Trazo. Conservan las formas y las variantes, además de la procedencia de cada recorte en los archivos locales.
- **Comparacion-mi-letra-5mm.pdf**: una página por versión, compuestas con los mismos caracteres y parámetros para compararlas.
- **Calibracion-5mm.pdf**: cuadro de 50 mm con diez celdas por lado para comprobar la escala de impresión.

Los dos perfiles contienen **390 muestras para 111 caracteres**: las 54 letras españolas tienen seis variantes seleccionadas cada una; las vocales con tilde/diéresis, números y signos tienen menos. El número 8 se conserva con una sola muestra: se descartó otra cuyo contorno quedaba incompleto.

## En la computadora

1. Inicia Trazo con el acceso directo existente.
2. Abre **Mi caligrafía · 5 mm** desde la barra lateral, o http://127.0.0.1:8767/personal.html.
3. Elige Original u Optimizada y escribe o pega tu texto. Los cambios se guardan como borrador independiente.
4. Selecciona palabras y pulsa **B** para negrita o **I** para cursiva; también funcionan Ctrl+B y Ctrl+I. El selector Color cambia la selección. Sin selección, el formato se aplica al texto que escribas después. **Tinta de la hoja** vuelve al color general.
5. Elige A4, A5, Carta o **Personalizado** e introduce ancho y alto en milímetros. Puedes girar la hoja y definir por separado los márgenes izquierdo, derecho, superior e inferior.
6. Ajusta el tamaño de letra y el avance del renglón a 5, 10 o 15 mm. La cuadrícula empieza en 5 × 5 mm y su medida es independiente del renglón. Puedes mover el origen de las guías y la línea de margen.
7. En **Colores de la hoja** cambia tinta, papel, guías y línea de margen. El fondo de papel también se imprime: para hojas físicas ya coloreadas o cuadriculadas usa fondo blanco y **Sin líneas**. Guarda las medidas y colores con **Mi cuaderno → Guardar ajustes**.
8. Revisa todas las páginas y prepara el PDF. Conserva márgenes, colores y formato. Si falta un carácter, Trazo te lo indica; si dos renglones se solapan, pide reducir el tamaño o aumentar el interlineado.

Para escribir en otro editor, puedes instalar una de las fuentes TTF mediante el visor de fuentes de tu sistema. No se han instalado automáticamente. La selección de variantes contextuales depende del programa; el compositor de Trazo elige las muestras directamente.

## En Android

Actualiza Trazo con la versión nueva conservando los datos. En Ajustes importa cada archivo `.trazo` como **una biblioteca nueva**: Original y Optimizada. Cambia de biblioteca para compararlas; no las mezcles en una sola si quieres conservar la distinción. Las fotos y bibliotecas no se han incluido en el APK ni subido al sitio alojado.

En **Páginas** también tienes papel personalizado, cuatro márgenes, colores, cuadrícula independiente y formato B/I. Guarda una copia de cada biblioteca antes de desinstalar la app o borrar sus datos.

## Qué muestran las fotos

El material cubre mayúsculas/minúsculas, ñ, tildes/diéresis, cifras y buena parte de los signos. Las fotos repetidas de A–n y Ñ–z son las más útiles para aislar variantes. La hoja de inventario aporta diacríticos, cifras y signos; el texto preparado aporta ÷, €, ², ³, comillas angulares y ~. Los apuntes cotidianos se conservaron como referencia de ritmo y estilo; no se extrajeron letras del texto atravesado por una línea diagonal.

Hay perspectiva, sombras, compresión, cuadrícula visible y transparencia del reverso. Se corrigió la perspectiva y se separó la tinta de las líneas; por eso la versión Original reproduce el trazo recuperable de las fotos, no todos los matices físicos del lápiz.

## Qué conviene completar

No hace falta repetir los alfabetos completos. Conviene añadir 3–5 muestras claras de cada vocal acentuada, cada número y los signos que más uses. Refuerza especialmente **8**, las tildes y la diéresis.

Faltan muestras inequívocas para **×, ≤, ≥, ≠, ±, √, ∞**. La multiplicación del texto está escrita como una x, que se conserva como x. El trazo horizontal no se ha asignado automáticamente al signo matemático Unicode −. Tampoco se han inventado variantes tipográficas de comillas curvas.

Haz la siguiente captura con luz uniforme, cámara paralela o escáner a 300–600 ppp; conserva el archivo original y evita enviarlo como foto comprimida. Una sola letra o signo por zona ayuda a mantener puntos y tildes completos.

## Validación y alcance

Las fuentes se reabrieron y se verificaron sus 111 caracteres y contornos; las bibliotecas conservaron sus etiquetas y procedencia. El compositor se probó con textos multipágina, signos ausentes y papel sin líneas; vista y PDF comparten las mismas posiciones y trazos. Imprime al **100 % / tamaño real**, sin Ajustar a página, y mide el cuadro de calibración con una regla antes de usar una hoja de tu cuaderno.

La diferencia de «brillo» observada correspondía principalmente a diferencias de grosor de los contornos recuperados. La tinta se dibuja opaca, con el color elegido. Optimizada ajusta el grosor de letras y cifras; conserva los signos y no aplica ese ajuste a Original. No se afirma que todas las formas tengan idéntico peso visual: sus proporciones naturales también influyen.

El parecido debe revisarse contigo sobre una prueba impresa. El editor completo de mapas conceptuales y esquemas no forma parte de esta etapa; las fuentes ya se pueden reutilizar en programas que permitan editar esos documentos.

Herramientas ya disponibles: OpenCV para análisis y contornos; FontTools para TrueType; ReportLab para PDF. No se instalaron herramientas nuevas ni se contrataron servicios. Tus fotos originales se conservaron sin modificar, con sus hashes, en work/caligrafia-2026-10-21/originales del proyecto.

Referencias: [FontTools, fuentes TrueType/OpenType](https://fonttools.readthedocs.io/en/latest/ttLib/index.html) y [OpenCV, operaciones morfológicas](https://docs.opencv.org/4.x/d9/d61/tutorial_py_morphological_ops.html).
