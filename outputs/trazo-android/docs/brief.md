# Trazo 2 para Android

Encargo: abrir la app existente, explicar captura y cantidad de muestras, crear una app descargable Android y mejorar sustancialmente la experiencia y fidelidad. Se mantiene la autorización previa para avanzar sin revisiones intermedias del usuario.

Decisiones: APK con WebView y todos los recursos incluidos, motor JavaScript local sin Python ni PC. Misma base como web instalable para probar y entregar. La versión anterior y sus datos se conservan. 6–8 muestras por carácter es una recomendación inicial de trabajo, no una promesa de parecido cuantificado. Hasta 15 variantes por etiqueta. La cobertura y los avisos de calidad no se presentan como precisión de identidad.

Mejoras observables: guía de captura integrada, acceso a cámara/galería, revisión de muestras antes de guardar, agrupación por carácter y cantidad, avisos de contraste/recorte, captura de palabras/uniones, previsualización idéntica al trazado PDF, exportación de fuente OpenType, PDF con guías/tamaño, dibujos fieles/limpios/SVG y lotes persistentes, copia/importación de biblioteca y papel en blanco. Datos en IndexedDB. No se envían muestras a servicios externos.

Limitación transparente: no se recuperan detalles ocultos de una foto ni se garantiza una copia física del 100 %. Android puede suspender una app cerrada; la cola debe reanudarse y la pantalla puede mantenerse encendida mientras procesa.

Dirección visual: estudio de papel azul gris de Trazo existente. Tinta #193c66, mesa #e8edf2, blanco #ffffff, grafito #263442, verde #34745a. Títulos Georgia, sistema en controles. Móvil con barra inferior fija y botones táctiles de al menos 44px; escritorio con navegación lateral. El contenido principal es siempre la tarea, sin landing comercial.

## Reparto e interfaces

- core.mjs: motor puro, propiedad del agente core. Sin DOM, Node y navegador. Usa OpenType JS local.
- native/: Android Java, manifest, build y APK, propiedad del agente Android. Recursos web se copian al ensamblar, sin modificarlos.
- app.mjs, index.html, style.css, db.mjs, worker.mjs, exports.mjs: interfaz, persistencia y exportación, propiedad del padre.

## Contrato del motor core.mjs

`CHARS`: string con el juego español de 92 caracteres de la versión anterior.
`traceMask(mask:Uint8Array,width,height,tolerance=0.5): number[][][]`: polígonos cerrados, píxel negro=1/255, conserva huecos; no repetir vértice final.
`extractSampleRGBA(image:{data:Uint8ClampedArray,width,height}, label:string, options={baseline:0.78,threshold:190,template:false}): Sample`.
Sample = `{id?,label,char:label,paths:number[][][],advance:number,preview?,quality:{warnings:string[],contrast:number,inkFraction:number},baseline:number}`. `paths` están en unidades tipográficas de 1000em con y hacia arriba. La interfaz añade preview, id, created.
`extractTemplateRGBA(image,options={}): {samples:Sample[],info:{detected:number,expected:number,aligned:boolean},aligned:{data,width,height}}`. Plantilla conserva cuadrícula 10 columnas, x15/y42mm, celdas18x22mm, coordenadas210x297mm, marcas en (10,30),(200,30),(10,280),(200,280)mm con TL6mm y otras4mm. Escala de referencia6px/mm. Aceptar 4 orientaciones, perspectiva moderada o fallar claramente.
`buildFont(samples, name='Mi letra'): {buffer:ArrayBuffer,meta:{name,characters,samples,variants}}`. Exporta OTF real, no TTF disfrazado. Incluye ligaduras de etiquetas de 2–12 caracteres cuando existen los caracteres base. Rechaza entradas inválidas y variante16 explícitamente.
`layoutText(text,samples,options={width:210,height:297,margin:18,size:15,leading:8,seed:17}): {pages:Array<Array<{sampleId?:string,label:string,paths:number[][][],x:number,y:number,scale:number}>>,missing:string[]}`. Coordenadas x/y en mm, y es línea base desde arriba; scale es mm por unidad tipográfica: size*25.4/72/1000. Elegir las palabras/uniones más largas disponibles, variantes deterministas, mismos paths para canvas y PDF. Texto NFC, tabs a4espacios, CR/LF normalizados. Sin fallback inventado. Manejo de palabras largas, saltos y validación de márgenes/interlineado.
`coverage(samples,goal=6): {total:number,covered:number,ready:number,counts:Object<string,number>,missing:string[]}`. counts sin contaminación de prototipo; evitar etiquetas __proto__.

## Puente Android

`window.TrazoNative.saveFile(base64,name,mime)` guarda bytes en Descargas/Trazo, devuelve callback por evento `trazo-file-saved` detail{name,uri?,error?}. El guardado depende de API/selector y se informa sin éxito falso.
`window.TrazoNative.setProcessing(boolean)` mantiene pantalla encendida durante lotes visibles. `window.TrazoNative.version()` devuelve versión. Importación por input file WebChromeClient, capture="environment" si el usuario elige cámara.
Origen de recursos: https://trazo.local/ (interceptado sin red). Solo navegación interna, sin acceso a archivos arbitrarios ni interfaz JS en páginas externas. APK Android8+ (min26), target disponible actual. Conservar llave de firma en work/, no incluirla en entregables.


## 22 octubre: letra incluida y mapas
Autorización: el usuario pide añadir su letra a la app privada existente, seleccionar mejores formas con menos irregularidad y crear mapas/diagramas. Se incorporan únicamente contornos derivados, nunca fotos originales, conservando audiencia privada. Nuevo perfil Uniforme, una forma por carácter, por defecto una sola vez; Original y Optimizada permanecen disponibles. Bibliotecas y borradores anteriores se preservan.
Editor de cinco formatos: conceptual, mental, flujo, jerarquía y línea de tiempo. Ideas, conexiones etiquetadas, posiciones, forma, negrita/cursiva/color, distribución automática, papel con márgenes y cuadrícula, guardado local, copia editable y exportación SVG/PDF comparten los trazos. Escritorio con inspector lateral y móvil con vista previa primero. Comprobar datos existentes, recarga, formato, errores de cobertura, límites del papel, salida impresa y recursos APK firmados. Sin instalar herramientas.
