# Trazo

Objetivo: crear una letra digital desde varias muestras, componer páginas imprimibles y reproducir imágenes automáticamente. App local en español. El usuario autoriza avanzar sin consultas intermedias.

Decisiones de implementación: Python local con bibliotecas incluidas; interfaz web sin dependencias externas. Fuente TrueType real con variantes. Plantilla con casillas y cuatro marcas de alineación para importar escaneos/fotos. Recortes individuales para aprovechar fotos existentes. La asignación de caracteres es explícita: no se inventa una lectura OCR.

La composición usa los trazos capturados, mantiene la línea base y permite tamaño, interlineado, márgenes y papel. Detecta caracteres sin muestra antes de exportar. Dibujos: conservar píxeles, limpiar a blanco/negro o convertir contornos a SVG. Ningún modo anuncia fidelidad física universal del 100 %. La cola se guarda en disco y puede observar una carpeta local mientras la app está abierta en segundo plano.

Dirección visual: estudio de impresión sobre mesa azul gris (#e8edf2), tinta azul (#193c66), papel blanco (#ffffff), grafito (#263442), verde de estado (#34745a). Títulos Georgia, controles Segoe UI. Una página de cuaderno grande es el foco, con herramientas a la izquierda y resultados a la derecha. Sin hero comercial ni funciones simuladas.

Cierre: probar generación TTF, importación de varias muestras, conservación exacta de píxeles del modo fiel, PDF multipágina, persistencia/errores de cola y recorrido en navegador a dos tamaños. Sin muestras del usuario la fidelidad de su letra queda pendiente, identificada como tal.
