# Progreso de Trazo

Encargo: construir la herramienta y avanzar sin preguntas intermedias.

Decisiones: app local Python/HTML en carpeta independiente, sin repositorio previo. Los datos personales se mantienen en disco y las entradas de cada letra son explícitas. La lectura de plantillas automatiza la asignación con geometría y marcas; no afirma reconocimiento de texto. La reproducción fiel de dibujos conserva su imagen, y los modos de conversión se identifican como transformaciones.

- Motor y primeras pruebas: 8 pruebas iniciales verdes.
- Cola, recuperación y validación: 13 pruebas verdes tras cerrar conexiones SQLite y ajustar inserción.
- Captura orientada: pruebas de 90/180/270 grados añadidas y verificadas.
- Recorridos HTTP y navegador: plantilla PDF, TTF, PDF de texto, PNG fiel, SVG, aviso de letras ausentes, persistencia de borrador y adaptación de 1440 a 390 px comprobados. 19 pruebas antes de la revisión final.
- Accesos Windows: inicio oculto y parada del proceso propio verificados. La detección de disponibilidad usa la página HTML para evitar el analizador JSON sin distinción de mayúsculas de PowerShell 5.
- Revisión independiente: 7 hallazgos entregados; corrección independiente en curso. Se identificó además una fuente de demostración sin acentos y se incluyó su corrección.
- Datos usados en QA: conservados aparte en work/trazo/datos-de-pruebas. No se recibieron muestras reales del usuario.

Cierre: correcciones independientes integradas. Suite fresca 32/32 y comprobación de JavaScript válidas. Navegador: ejemplo Vera con ñ/tildes y PDF renderizado, borrado del ejemplo, importación de plantilla y recorte real de prueba, reconstrucción de fuente, PDF y restauración del modo Vector tras recargar. La carpeta observada recogió y procesó una imagen hasta PNG/PDF/SVG. Sin errores de consola ni desbordamiento horizontal en móvil. Biblioteca de pruebas conservada aparte y app preparada limpia para las muestras del usuario.
