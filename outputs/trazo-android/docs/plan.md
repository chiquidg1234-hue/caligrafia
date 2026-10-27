# Trazo 2 Implementation Plan

> **For agentic workers:** implementar dominios independientes con superpowers:dispatching-parallel-agents y verificar integración en el padre.

**Goal:** APK Android autónoma, sin PC, con captura guiada de letra y producción imprimible.
**Architecture:** motor puro de imágenes/fuentes + interfaz web local y persistencia IndexedDB + contenedor Android sin dependencias de servidor. Distribución web privada opcional para descarga móvil.
**Tech Stack:** ES modules, OpenType.js, PDF-Lib, IndexedDB; Android Java/WebView y herramientas oficiales.
**Spec:** brief.md

## Global Constraints
- Preservar app anterior y datos existentes.
- Sin uploads de muestras, sin cuentas obligatorias para el APK, sin servicios de IA de pago.
- No usar cobertura como porcentaje de fidelidad ni prometer 100 % físico.
- Toda función principal debe terminar en un archivo o dato persistente real.

## Review Focus
- Marcas, orientación y sombras plausibles en fotografías.
- Tildes, ñ, puntos, huecos y uniones de cursiva.
- Cierre y reanudación, duplicados y restauración de biblioteca.
- PDF multipágina, límites de papel y descarga Android.
- Recursos empaquetados y ejecución sin red.

- [x] Motor: extracción, orientación, OTF, huecos, ligaduras y layout comprobados en Node y navegador.
- [x] Interfaz: guía, captura/revisión, biblioteca, compositor, dibujos y respaldo verificados en navegador real móvil/escritorio. PWA con manifiesto y caché local; instalación Android pendiente de dispositivo.
- [x] Android: toolchain oficial, APK compilada/alineada/firmada; 22 comprobaciones y 17 recursos idénticos. Sin dispositivo conectado ni emulador disponible; no se afirma prueba física.
- [x] Integración y revisión independiente: tres hallazgos corregidos; 23/23 pruebas automatizadas pasan. Configuración de origen virtual comprobada también en Chromium aislado.
- [x] APK y plantilla de seis hojas creadas; app mejorada abierta en el navegador y guía integrada. Alojamiento privado para descarga en preparación.


## Release 2.2.0 · 22 octubre
- [x] Letra personal incluida, 111 formas Uniforme seleccionadas visualmente; Original/Optimizada intactas. Instalación idempotente y migración de datos verificada.
- [x] Cinco tipos de mapas: edición, conexiones, distribución, papel, estilos, zoom, SVG/PDF y copia editable.
- [x] Revisión independiente: corregidas recarga inmediata, copia completa del papel y liberación del límite de mapas. 74 pruebas Node y 3 regresiones de navegador pasan.
- [x] APK actualizable 20003, firma anterior, 23 recursos idénticos, 22 comprobaciones nativas. Android físico pendiente.
