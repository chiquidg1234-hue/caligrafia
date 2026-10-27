# Trazo

Abre **Iniciar Trazo.cmd**. La app se abre en http://127.0.0.1:8767 y funciona en esta computadora sin cuentas ni conexión a servicios externos.

## Tu caligrafía personal y tu cuaderno · actualización del 21 de octubre

En la barra lateral abre **Mi caligrafía · 5 mm** o http://127.0.0.1:8767/personal.html. Se incorporaron dos perfiles extraídos de las cinco fotos: **Original** y **Optimizada**, cada uno con 390 muestras de 111 caracteres. Optimizada ajusta moderadamente el grosor para que la tinta se vea más uniforme; Original conserva las formas recuperadas sin ese ajuste. No reemplazan la biblioteca previa ni sus trabajos.

El editor permite negrita, cursiva y color por selección; papel con medidas propias; cuatro márgenes independientes; cuadrícula, origen y línea de margen; colores de tinta, papel y guías, y guardar «Mi cuaderno». Vista previa y PDF comparten trazos y posiciones. La guía y las fuentes instalables están en `../mi-caligrafia/`, junto a bibliotecas `.trazo` para importar por separado en Android.

Las muestras originales se conservaron y no se instalaron fuentes automáticamente. Hay pruebas de comparación y calibración; el parecido y la alineación final requieren una prueba impresa. Se mantienen las herramientas anteriores descritas a continuación.

## Tu letra

En **Mi letra**, descarga la plantilla, imprímela a tamaño real y escribe dentro de las casillas con tinta oscura. Escanea o fotografía la hoja completa, derecha, sin sombras y con las cuatro marcas visibles. Sube varias hojas para conservar variantes de la misma letra. La app corrige perspectiva mediante las marcas. Las muestras se conservan en la biblioteca; puedes eliminar las que hayan salido mal.

También puedes elegir **Una letra**, abrir una foto de tus apuntes y arrastrar para recortar un carácter. Asigna su letra y ajusta la línea roja a la base de la escritura. Incluye puntos y tildes en el recorte. No hay reconocimiento automático del texto: la asignación explícita evita guardar una letra con un nombre equivocado.

Pulsa **Crear mi fuente**. Descarga un TTF instalable o ve a **Componer páginas**. Se admiten hasta 15 muestras por carácter; si superas ese límite, la app te avisa y conserva las anteriores. Si cambias las muestras, vuelve a crear la fuente. Para explorar la app sin muestras, usa **Explorar con un ejemplo**. El ejemplo está identificado y debe quitarse antes de añadir tu letra real. Esta versión captura las formas de tus letras; no aprende automáticamente todas las uniones de la escritura cursiva.

## Imprimir

El compositor usa únicamente los caracteres de la fuente creada y avisa si falta alguno. Elige papel, margen, interlineado y tinta. El PDF incorpora las muestras como fuente y distribuye textos largos en varias páginas. Las variaciones se eligen entre muestras reales. La vista previa muestra la primera página; el archivo final es la referencia de las medidas.

Imprime al 100 %, sin ajustar a la página. Para hojas ya rayadas elige **Sin guías**. Usa hojas compatibles con tu impresora; esto no permite meter un cuaderno encuadernado en una impresora común. Ajusta márgenes e interlineado mediante una prueba de alineación.

## Dibujos y trabajo automático

- **Fiel** conserva los píxeles de la imagen después de corregir la orientación EXIF. Entrega PNG sin pérdida y PDF. La impresión no puede garantizar colores o textura física idénticos.
- **Limpiar** convierte a blanco y negro según el umbral de tinta. Puede eliminar detalles claros o incluir sombras.
- **Convertir en trazos** genera SVG con contornos y huecos en blanco y negro. No es una reconstrucción de capas, trazos ocultos, color ni orden del dibujo. El PDF de este modo imprime la versión en blanco y negro; el SVG se entrega aparte para edición.

Añade hasta 10 imágenes por lote y 16 MB por imagen. La cola se guarda en SQLite. En **Trabajo automático**, activa la carpeta y copia su ruta al Explorador. Los PNG, JPG, WebP, BMP y TIFF nuevos o modificados se añaden automáticamente. Los originales no se borran. Los resultados se guardan en `data/jobs/<id>/` y aparecen en **Mis dibujos**.

Puedes cerrar la pestaña. El proceso de Trazo y la computadora deben seguir activos y sin suspensión. No empieza al encender Windows: abre el iniciador. Para cerrarlo completamente, usa **Detener Trazo.cmd**. Si se interrumpe, al arrancar recupera los trabajos pendientes. Una foto de mayor calidad ayuda más que dejarla procesando muchas horas. No hay una IA que invente detalles ni una promesa universal del 100 %.

## Archivos y requisitos

Todo se guarda en `data/`. No borres esa carpeta si quieres conservar muestras y trabajos. Los archivos de ejemplo no son tu caligrafía y sirven solo para probar el recorrido.

El iniciador usa el Python incluido con Codex en este equipo. Las dos bibliotecas añadidas al proyecto son fontTools 4.67.0 y OpenCV headless 5.0.0.93, dentro de `vendor/`; Pillow, NumPy y ReportLab vienen con el runtime de Codex. Para otro equipo instala las dependencias de `requirements.txt` con Python 3.12 y ejecuta `python server.py`. La app escucha únicamente en 127.0.0.1.

Verificación del 19 de octubre de 2026: 32 pruebas automatizadas pasan; recorridos comprobados en navegador a 1440 y 390 px, importación de plantilla y recorte, fuente TTF, PDF con ñ y tildes, PNG/SVG, recuperación y procesamiento automático de carpeta. Iniciadores de Windows probados. Se realizó una revisión independiente y se corrigieron sus hallazgos.

Pruebas: `python -m unittest discover -s tests -v`. Actualización del 21 de octubre: 61 pruebas ejecutadas, sin fallos; una omitida por falta de permisos para enlaces simbólicos. También se verificaron los dos perfiles reales, textos de diez páginas, estilos, medidas personalizadas y conservación de los datos anteriores. La semejanza de la caligrafía todavía requiere revisión del usuario e impresión física. Esta versión prepara archivos; no maneja un bolígrafo físico ni controla el ratón en otra app.
