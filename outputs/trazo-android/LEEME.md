# Trazo · Tu letra en Android · 2.2.0

Abre `Trazo4.apk` en tu Android e instálalo. Si el sistema lo pide, permite a tu navegador instalar este archivo y vuelve al instalador. Trazo funciona sin computadora y sin conexión; el motor viene incluido. Necesita Android 8 o posterior y Android System WebView actualizado. `Trazo2.apk` y `Trazo3.apk` se conservan intactos. La nueva APK mantiene el identificador de la app, la firma y una versión superior (20003), para instalarse como actualización conservando el almacenamiento; no hace falta desinstalar la anterior.

## Novedades de la versión web 2.4

- **Tareas:** nueva sección para escribir tareas completas en el formato Trazo (explicado en `outputs/practicos/FORMATO-TRAZO.md`). Incluye título centrado, subtítulos en color, viñetas, columnas de datos y resolución, gráficas de coordenadas a mano, respuestas encerradas y como máximo 3 gráficas por cara. El PDF sale completo, solo anversos o solo reversos, con la corrección medida en tu Epson T50: anverso 5 mm a la derecha y 1 mm abajo; reverso 6 mm y 1 mm.
- Las palabras largas se cortan con guion por sílabas.
- Mi letra Natural suma π, ρ, Δ y ≈ (provisionales, hechos con tus trazos).
- Los mapas nuevos tienen cajas, óvalos y flechas a mano por defecto, más irregulares.

## Novedades de la versión web 2.3

Esta versión todavía no está empaquetada en una APK: funciona en la versión web. Para crear la APK 2.3 con la misma firma hay que ejecutar `native/build.ps1` en la computadora que guarda la clave privada.

- **Mi letra Natural** viene incluida y se selecciona una vez al actualizar. Alterna 2–3 formas revisadas de cada letra, tiene bordes suavizados, signos más finos y los símbolos × · < > ≤ ≥ ± ≠ → ∞ ° |, hechos con tus propios trazos.
- **Páginas → Hoja y cuaderno → Mi cuaderno guardado** incluye **Oficio espiral · anverso** (20/16/20/17 mm) y **· reverso** (16/20/22/15 mm): hoja de 211 × 322 mm, cuadritos de 5 mm, guías solo en pantalla y renglón apoyado en la cuadrícula. Puedes cambiar algo y guardarlo con otro nombre, por ejemplo uno por materia.
- **Renglones:** renglón seguido, renglón por medio (escribes uno y dejas uno libre) o dos renglones libres.
- **Naturalidad:** de 0 % (líneas exactas) a 100 %. Mueve cada letra unas décimas de milímetro, la gira 1–2° y cambia un poco el espacio, sin salir de los márgenes. La vista previa y el PDF salen iguales.
- **Fórmulas:** activa la casilla y escribe `x^2`, `x^{n+1}`, `v_0`, `log_2(8)`, `a/b`, `(x+1)/(x-1)`, `raiz(x)` o `raiz[3](27)`. `<=`, `>=`, `!=`, `+-`, `->` y `*` se convierten en ≤ ≥ ≠ ± → ·. Si una línea tiene fracciones, ocupa los renglones que necesite. Escribe `y/o` sin la casilla activada, porque con ella se convierte en fracción.
- **Guías solo en pantalla:** ves la cuadrícula en la vista previa, pero el PDF imprime solo tu letra, para hojas que ya vienen cuadriculadas.
- **Corregir impresora → derecha / ↓ abajo (mm):** mueve todo el PDF si tu impresora imprime corrida. Mide primero con la hoja de prueba de `outputs/hoja-prueba-oficio`.
- **Mapas → Organizar y personalizar hoja → Cajas y flechas: Trazo a mano** dibuja bordes y flechas un poco irregulares, como con bolígrafo.

## Bibliotecas separadas

En **Mi letra**, **Páginas** y **Ajustes** puedes elegir la biblioteca activa. Las muestras antiguas se conservan en **Mi biblioteca**, con sus identificadores, contornos y papelera. El nombre de fuente que ya usabas también se conserva.

Tu letra ya viene incluida: **Mi letra Uniforme**, **Mi letra Original** y **Mi letra Optimizada**. La primera apertura de esta versión añade los tres perfiles y selecciona Uniforme; después respeta la biblioteca que elijas. No reemplaza tus muestras, nombres ni papelera anteriores. No necesitas importar archivos para empezar.

**Uniforme** tiene 111 caracteres, una forma seleccionada por carácter. Se revisaron las 390 muestras recuperadas, se eligieron las formas más claras y se moderaron alturas, bases e inclinación. La forma se repite sin alternancia; Original y Optimizada mantienen 390 muestras cada una para quien prefiera variación. Es una mejora digital basada en tus trazos: conserva pequeñas irregularidades y algunas limitaciones de las fotografías.

El nombre, la fuente `.otf`, la copia `.trazo`, las muestras retiradas y su recuperación corresponden a la biblioteca seleccionada. Para añadir otra biblioteca, **Importar biblioteca → Crear biblioteca nueva y usarla** conserva sus variantes separadas. La opción de combinar muestras es explícita. Cada biblioteca admite 1600 muestras activas y hasta 15 variantes por etiqueta.

Esta APK y la web privada incluyen únicamente los contornos personales derivados autorizados. No incluyen las fotografías de referencia. La web mantiene el acceso privado del propietario.

## Mapas y diagramas

En **Mapas**, elige **Mapa conceptual**, **Mapa mental**, **Diagrama de flujo**, **Árbol jerárquico** o **Línea de tiempo** y pulsa **Crear**. Se conserva cada mapa en **Mis mapas**.

- Edita el título y selecciona una idea tocando su cuadro o usando la lista. Cambia texto, forma, color, negrita y cursiva.
- Arrastra las ideas o indica su posición y tamaño en milímetros. Usa **+ Idea** para añadir cuadros y **Conexiones** para enlazarlos con un rótulo propio.
- **Ordenar automáticamente** distribuye las ideas según el tipo seleccionado. Conserva conexiones y tamaños. Si no caben, amplía el papel o reduce los cuadros.
- **Organizar y personalizar hoja** ajusta tamaño, cuatro márgenes, letra, interlineado y cuadrícula. **Usar la hoja de Páginas** recupera sus ajustes.
- Usa el zoom para leer y mover ideas en el celular. **Deshacer** y **Rehacer** recuperan los cambios de la sesión.
- **Descargar PDF** imprime la hoja; **Descargar SVG** entrega contornos vectoriales. Ambos usan los trazos reales de la biblioteca activa. La selección y el zoom de pantalla no se imprimen.
- **Copia editable** guarda un `.trazomap` con ideas, conexiones y hoja. Impórtalo para seguir editando en otro dispositivo. Las fuentes van separadas: se utiliza la biblioteca activa.

Hasta 60 ideas y 120 conexiones por mapa; hasta 100 mapas activos. **Eliminar mapa** pide una confirmación explícita y libera una plaza; conserva los otros mapas. Guarda antes una copia editable si quieres recuperar el eliminado. Las letras ausentes, cuadros fuera del área útil o textos demasiado largos muestran un aviso y bloquean la exportación, evitando una impresión recortada. El editor permite corregirlos o deshacer. Guarda copias antes de borrar datos de la app o cambiar de dispositivo.

## Personaliza tu hoja

En **Páginas → Hoja y cuaderno** elige A4, A5, Carta o medidas personalizadas. Ajusta por separado los márgenes izquierdo, derecho, superior e inferior; el tamaño de letra y el espacio entre líneas. Puedes guardar estos ajustes con un nombre como **Mi cuaderno**, editarlo y recuperarlo en este dispositivo. No se presuponen medidas de ninguna marca.

La cuadrícula usa **5 × 5 mm** de forma predeterminada y conserva su medida al cambiar el interlineado. Puedes cambiar el tamaño del cuadrito, desplazar el origen de las guías, elegir renglones o dejar la hoja sin guías. Hay colores independientes para la tinta de base, el papel, las guías y una línea vertical de margen opcional.

Selecciona texto y usa **B**, **I** o el color del texto para aplicar negrita, cursiva o color a ese fragmento. Sin selección, se aplica a todo el texto; con el editor vacío, B/I preparan el formato para escribir. También funcionan Ctrl+B y Ctrl+I. El pegado conserva texto sin HTML ni imágenes. El borrador y sus estilos se guardan al editar y se recuperan al reabrir.

La vista previa y el PDF usan el mismo diseño: la cursiva transforma los contornos y la negrita añade trazo opaco. Si una selección parte una unión o palabra guardada, se usan sus letras base cuando existen. Un título de una línea puede tener interlineado corto; para varias líneas, Trazo avisa si los trazos se superponen. Imprime el PDF al **100 %** para conservar los milímetros.

## Cómo recoger tu letra

1. Imprime `Trazo-6-muestras.pdf` en A4 al **100 %**, sin ajustar a página. También puedes descargar una hoja desde Mi letra.
2. Escribe una letra por casilla, en la zona grande bajo la etiqueta. Apóyala en la línea tenue y deja libres los bordes. Usa tu letra habitual y bolígrafo negro o azul oscuro; no intentes embellecerla.
3. Escáner: **300–600 ppp**, JPG o PNG, color o grises. Con celular: hoja plana, luz pareja, cámara paralela, foto nítida y las cuatro marcas negras completas. Evita filtros, sombras y modo retrato.
4. En Trazo: **Mi letra → Añadir muestras → Plantilla completa → Tomar foto o Elegir imagen**. Revisa cada contorno; desmarca muestras incompletas o sucias y guarda las buenas.
5. Empieza con una hoja de prueba. Como recomendación inicial, completa **6–8 hojas** para tener 6–8 variantes naturales de cada uno de los 92 caracteres. Puedes añadir hasta 15 variantes por etiqueta, con 1600 muestras activas por biblioteca. No equivale a un porcentaje medido de parecido.
6. Si escribes cursiva, añade recortes de uniones y palabras frecuentes con **Letra o unión** (hasta 12 caracteres sin espacios). Las letras aisladas no capturan todas tus conexiones.
7. En **Páginas**, escribe tu texto, ajusta tamaño, margen e interlineado; revisa y exporta PDF. Imprime al 100 %. Usa Sin guías si el cuaderno ya tiene renglones. Si falta una letra, la app te lo dice antes de exportar.

## Qué incluye

- Captura de plantillas, orientación y perspectiva moderada; revisión antes de guardar y avisos de contraste/recorte.
- Variantes reales agrupadas, ajuste de altura y papelera recuperable.
- Composición con las mismas formas en vista previa y PDF; cuatro márgenes, medidas propias, colores, formato de texto, renglones y cuadrícula independiente del interlineado.
- Fuente OpenType `.otf` real, con variantes y uniones cuando existen sus letras base. Su selección en otros programas depende del editor.
- Dibujos en modo Original, Limpio o Contornos. Original descarga el mismo archivo sin modificar; su PDF coloca la imagen en A4. Limpio cambia tonos por blanco y negro. Contornos genera SVG y PDF con trazado aproximado. No reconstruye información oculta de una foto.
- Lotes persistentes: se reanudan al abrir. Mantén Trazo abierto mientras trabaja; Android puede suspenderlo al cerrarlo. No es un servicio de procesamiento nocturno en segundo plano.
- Copia `.trazo` de las muestras activas y etiquetas de la biblioteca seleccionada. Impórtala para mover tu letra entre navegador, computadora y Android. Las fotos de dibujos, el borrador y los presets de cuaderno no forman parte de esa copia.

Las muestras se procesan en el dispositivo. La APK no pide permiso de Internet. En Android 10 o posterior, los archivos exportados van a **Descargas/Trazo**; Android 8–9 muestra el selector para elegir destino. Guardar la copia en Ajustes antes de desinstalar, borrar datos o cambiar de celular.

## Comprobaciones realizadas

Se verificaron los cinco formatos con letra real, las coordenadas vectoriales compartidas entre vista previa y PDF, los límites del papel, estilos y rechazo de caracteres ausentes. Se inspeccionaron capturas de escritorio y móvil y PDF rasterizados.

El navegador comprobó carga automática de 111 + 390 + 390 muestras, migración de una biblioteca y borrador anteriores sin perderlos, ausencia de duplicados al reabrir, selección persistente del perfil, edición, conexiones, arrastre, deshacer/rehacer, copia e importación y zoom sin desbordar la pantalla. Pasaron **74 pruebas Node**, **3 regresiones de navegador** para recarga inmediata, copia completa del papel y eliminación al límite de 100 mapas, además de **22 comprobaciones nativas**. Los **23 recursos web** coinciden byte por byte con la APK. El informe está en `native/verification.json`.

La APK se construye y verifica con las herramientas existentes, con la misma firma de las versiones anteriores y versión superior. Se comparan todos los recursos web con los bytes empaquetados. **La instalación, cámara, selector de archivos y WebView en un Android físico están pendientes de probar en tu celular**; no hubo dispositivo conectado ni emulador disponible.

El código está en web/ y native/. Las licencias de OpenType.js y PDF-Lib están en web/vendor/. La llave privada de futuras actualizaciones se conserva fuera de los entregables, en work/trazo-android/signing; no debe publicarse.
