# Trazo · Caligrafía personal

Sistema para escribir, editar, organizar e imprimir contenido con una caligrafía propia. Incluye aplicación web, APK Android autónoma, versión local para computadora y tres perfiles de letra reutilizables.

## Empezar

- **Android:** descarga [Trazo4.apk](outputs/trazo-android/Trazo4.apk?raw=true), versión **2.2.0** (20003), Android 8 o posterior. Funciona sin computadora y sin conexión. Mantiene la firma de las APK anteriores incluidas; instálala sobre la anterior para conservar datos.
- **Web local:** desde esta carpeta ejecuta `python -m http.server 8767 --bind 127.0.0.1 --directory outputs/trazo-android/web` y abre <http://127.0.0.1:8767>. No necesita paquetes Python adicionales. Los datos de cada navegador se guardan en ese dispositivo.
- **Versión para computadora:** instala las dependencias con `python -m pip install -r outputs/trazo/requirements.txt`; ejecuta `python outputs/trazo/server.py --port 8767` y abre <http://127.0.0.1:8767>. Para el estudio de fuentes personales, abre `/personal.html`. Usa un servidor u otro en el mismo puerto, según la versión que quieras probar.

No es necesario instalar las fuentes para utilizarlas dentro de Trazo.

## Funciones de la versión web y Android

- Letra personal incluida: **Uniforme**, **Original** y **Optimizada**. Uniforme usa 111 formas seleccionadas, una por carácter, con ajustes moderados de altura, base e inclinación; las otras bibliotecas mantienen 390 muestras cada una.
- Páginas con texto editable, negrita, cursiva, color, tamaños propios, cuatro márgenes, renglones, cuadrícula de 5 mm ajustable y presets de cuaderno.
- Mapas conceptuales, mentales, diagramas de flujo, jerarquías y líneas de tiempo: ideas y conexiones editables, arrastre, organización automática, zoom, deshacer/rehacer y copias `.trazomap`.
- PDF y SVG con los trazos reales; fuentes OpenType `.otf` y copias de biblioteca `.trazo` exportables.
- Dibujos en modo original, limpio o contornos y cola de procesamiento local.
- Guardado local y recuperación de cambios. La app avisa si faltan caracteres o un contenido no cabe antes de exportarlo.

Imprime al **100 %**, sin ajustar a la página, para conservar las medidas en milímetros.

## Archivos del proyecto

| Carpeta | Contenido |
| --- | --- |
| [`outputs/trazo-android/web`](outputs/trazo-android/web) | Código de la app web y los recursos incluidos en Android. |
| [`outputs/trazo-android/native`](outputs/trazo-android/native) | Contenedor Android, scripts de construcción y comprobaciones. |
| [`outputs/trazo-android/tests`](outputs/trazo-android/tests) | Pruebas del motor, perfiles, mapas, persistencia y exportación. |
| [`outputs/trazo-android/dist`](outputs/trazo-android/dist) | Copia estática preparada para alojamiento, con APK descargable. |
| [`outputs/trazo`](outputs/trazo) | Aplicación local Python, interfaz, pruebas y documentación. |
| [`outputs/mi-caligrafia`](outputs/mi-caligrafia) | Fuentes `.ttf`, bibliotecas, comparación visual, calibración y validación. |
| [`work/caligrafia-2026-10-21`](work/caligrafia-2026-10-21) | Scripts y datos derivados de extracción, selección y normalización de la letra. |
| [`work/trazo-android/maps`](work/trazo-android/maps) | Ejemplos de los cinco tipos de mapa y pruebas visuales. |
| [`work/investigaciones`](work/investigaciones) | Investigación inicial y referencias consultadas. |

Guías detalladas: [web y Android](outputs/trazo-android/LEEME.md), [versión local](outputs/trazo/LEEME.md), [letra Uniforme](outputs/mi-caligrafia/Mi-letra-Uniforme-LEEME.md).

## Pruebas

```powershell
node --test "outputs/trazo-android/tests/*.test.mjs"
python -m unittest discover -s outputs/trazo/tests
```

Las pruebas de navegador adicionales están en `outputs/trazo-android/tests/maps-browser-regression.mjs`. Requieren Playwright y un navegador ya disponibles; consulta las variables `TRAZO_TEST_URL` y `PLAYWRIGHT_PACKAGE` al comienzo del archivo. No se incluyen ni descargan automáticamente estas herramientas al abrir la app.

La entrega 2.2.0 validó 74 pruebas Node, 3 regresiones de navegador, 22 comprobaciones nativas y 23 recursos web idénticos a los empaquetados. El informe de la APK está en [native/verification.json](outputs/trazo-android/native/verification.json). La instalación, cámara y selector de archivos en Android físico siguen pendientes de comprobar en un dispositivo.

## Construcción de Android

El código y los scripts se conservan en `outputs/trazo-android/native`. La guía explica la preparación de herramientas y la construcción. Las herramientas descargadas y la **clave privada de firma** no se publican. Las APK existentes sí están incluidas; para producir una actualización con su misma firma es necesaria la clave privada conservada por el propietario. Una clave nueva no permite actualizar una instalación firmada con la anterior.

## Datos y dependencias

Este repositorio incluye los contornos y fuentes personales autorizados. Se excluyen fotografías originales, bases de datos locales, documentos de usuarios, contraseñas, claves privadas, cachés y herramientas descargadas. Los scripts de extracción fotográfica requieren aportar las imágenes localmente y adaptar las rutas de origen; el uso normal de la app funciona con las bibliotecas incluidas.

Las dependencias binarias de Python se declaran en `outputs/trazo/requirements.txt`. Las dependencias web incluidas conservan sus licencias en `outputs/trazo-android/web/vendor`. No se añade una licencia general a la letra personal ni al proyecto; las licencias de terceros se conservan.
