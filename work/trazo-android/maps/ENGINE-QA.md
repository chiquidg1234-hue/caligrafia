# Motor de mapas de Trazo

Fecha: 22 de octubre de 2026.

## Entrega

- `outputs/trazo-android/web/maps.mjs`: modelo editable, validación, cinco distribuciones, geometría vectorial común para SVG y PDF.
- `outputs/trazo-android/tests/maps.test.mjs`: 15 pruebas del motor.
- Esta carpeta: cinco copias editables `.trazomap`, SVG, PDF y PNG rasterizados con Poppler para revisión visual.

API pública: `MAP_TYPES`, `createMap(type)`, `validateMap(input)`, `arrangeMap(map)`, `renderMap(map, samples)` y `await mapPDF(result, map)`.

`renderMap` es síncrono. Devuelve `{svg, missing, width, height, map, geometry}`. `geometry` contiene los nodos, conexiones, guías y rótulos con sus glifos. Los grupos SVG de cada nodo llevan `data-node-id` para selección y arrastre. Todos los valores de geometría y las medidas de hoja se expresan en milímetros; el tamaño de letra se expresa en puntos.

## Comportamiento

El título, las ideas y los rótulos de conexiones se dibujan exclusivamente con los contornos de la biblioteca activa. Se reutiliza `layoutText` para selección determinista de variantes, negrita opaca, inclinación y color. No hay etiquetas `<text>`, tipografías de sistema ni imágenes de letras. El PDF conserva los mismos glifos, conexiones, cajas, papel y guías del SVG.

Los tipos son mapa conceptual, mapa mental, diagrama de flujo, árbol jerárquico y línea de tiempo. La distribución automática devuelve una copia del modelo, mantiene todas las conexiones y no modifica tamaños ni reduce la letra para hacerla caber. Los ciclos y componentes desconectados no bloquean el algoritmo.

Las flechas terminan en el contorno del nodo. Si una línea recta cruzaría un tercer nodo, se buscan recorridos ortogonales. Los rótulos se ubican dentro del papel útil sin tapar nodos ni otros rótulos. Un mapa demasiado denso genera un aviso explícito para separar nodos o ampliar el papel; no se promete un enrutador general para cualquier grafo.

Se rechazan desbordes, superposiciones de nodos, texto que necesite más de una página, rótulos sin espacio y exportaciones de una vista previa anterior a la edición actual. Las letras ausentes se devuelven en `missing` y bloquean el PDF. Incluso con márgenes cero se conserva un resguardo de 0,3 mm para que el borde de las figuras no quede cortado.

`validateMap` comprueba la estructura y permite guardar geometría temporalmente fuera de la zona imprimible para poder corregirla. `renderMap` comprueba el ajuste final. Por eso la interfaz debe validar los valores antes de persistirlos y manejar por separado los avisos de composición.

## Límites

- Versión 1; hasta 60 nodos y 120 conexiones; IDs de hasta 120 caracteres.
- Texto de nodo: hasta 2000 caracteres; rótulo de conexión: 200; título: 300. Puede estar vacío.
- Papel: ancho 70–420 mm, alto 70–594 mm. Márgenes de 0–120 mm que dejen al menos 24 mm útiles antes del título.
- Nodo: ancho 12–420 mm, alto 10–594 mm. El texto debe caber además en el rectángulo interior seguro de su forma.
- Letra: 6–48 pt; interlineado: 3–30 mm. Una letra grande puede exigir mayor interlineado.
- Colores: `#rrggbb`; se normalizan y cualquier color inseguro se sustituye por el color predeterminado.

## Verificación ejecutada

`node --test tests/*.test.mjs`, en `outputs/trazo-android`: **67 pruebas, 67 aprobadas, 0 fallos, 0 omitidas**, incluidos 15 casos del motor de mapas. Se comprobó la fase inicial de pruebas fallidas antes de la implementación y una regresión de corte de contorno con márgenes cero antes de corregirla.

Las pruebas cubren límites de hoja, no solapamiento, cinco distribuciones, conservación de grafos, clonación, validación de números e IDs, rótulos seguros frente a inyección XML, contornos reales con estilos, variantes deterministas, letras ausentes, límite de una página por mapa, extremos de flecha por forma, desvío alrededor de otro nodo, dimensiones físicas del PDF y paridad de los puntos de las conexiones.

`node work/trazo-android/maps/proofs.mjs` generó los cinco juegos de prueba usando las **390 muestras reales** de `outputs/mi-caligrafia/Mi-letra-Optimizada.trazo`. Los cinco casos tienen cero letras ausentes y tamaño A4 horizontal de 297 × 210 mm. Sus métricas están en `proof-results.json`.

Los cinco PDF se rasterizaron con Poppler a 120 ppp y se inspeccionaron visualmente: títulos legibles, figuras completas, flechas visibles, rótulos sin colisiones, nodos sin texto cortado. No se realizaron pruebas en un dispositivo Android físico en este subtrabajo.
