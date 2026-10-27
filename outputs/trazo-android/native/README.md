# Trazo 2 · contenedor Android autónomo

La APK contiene todos los archivos de `../web`. Sirve esos recursos desde `https://trazo.local/` mediante interceptación de WebView, sin servidor, Python, cuenta o conexión. No solicita permiso de Internet, cámara ni acceso general al almacenamiento. La cámara se abre mediante la app de cámara elegida por Android; el selector concede acceso solamente a los archivos elegidos.

- Android 8 o posterior: minSdk 26, targetSdk 36. Requiere un Android System WebView actualizado para ejecutar la interfaz JavaScript moderna.
- Exportación en Android 10+: `Descargas/Trazo` mediante MediaStore. Android 8–9 abre el selector del sistema para elegir destino.
- La cámara usa un URI temporal de un proveedor privado con permisos puntuales; las capturas antiguas se limpian después de 24 horas al volver a abrir la cámara.
- IndexedDB guarda la biblioteca en el espacio privado de la app. Desinstalar elimina esos datos: usar la copia de biblioteca integrada antes.
- `TrazoNative.saveFile(base64,name,mime)` avisa mediante `trazo-file-saved`, con `detail.name`, `detail.uri` o `detail.error`. Cancelar o fallar jamás emite éxito. Límite por exportación: 96 MiB decodificados; solo un guardado simultáneo.
- `TrazoNative.setProcessing(bool)` mantiene encendida la pantalla mientras la ventana está visible. Android puede suspender procesos en segundo plano.
- `TrazoNative.version()` devuelve `2.2.0`.

## Construir en Windows

Desde la raíz de este proyecto, con PowerShell:

```powershell
& .\outputs\trazo-android\native\setup-toolchain.ps1
& .\outputs\trazo-android\native\build.ps1
& .\outputs\trazo-android\native\verify.ps1
```

La primera orden descarga y verifica las herramientas portables en `work/trazo-android/toolchain/`: Microsoft OpenJDK 17.0.20.1, Google Build Tools 36.0.0 y Android Platform 36 r02. Los enlaces y checksums están fijados en `toolchain.lock.json`. No cambia PATH ni instala aplicaciones globales. Se usa javac, aapt2, D8, zipalign y apksigner, sin Gradle. En entornos con sandbox de Windows, Java puede necesitar una ejecución autorizada fuera del sandbox para resolver las rutas del JAR de Android; no es necesario cambiar protecciones del sistema.

`build.ps1` toma la versión actual de `../web` y produce `outputs/trazo-android/Trazo4.apk`, su SHA-256 y un informe de construcción. Alinea el archivo y verifica sus firmas v2/v3, válidas desde Android 8; la comprobación valida las firmas v2/v3. Normaliza los separadores de nombres ZIP que aapt2 produce en Windows antes de firmar. `verify.ps1` prueba la política de recursos y compara cada recurso de la APK byte por byte con las fuentes actuales.

La llave de firma y su contraseña están **solo** en `work/trazo-android/signing/`. Guardar una copia privada de esa carpeta permite publicar actualizaciones que Android acepte sobre esta instalación. No distribuirla junto con la APK ni el código de salida.

Se puede compilar la pantalla nativa mínima de prueba sin depender del desarrollo web:

```powershell
& .\outputs\trazo-android\native\build.ps1 -WebRoot .\outputs\trazo-android\native\smoke-web -OutputPath .\work\trazo-android\toolchain\smoke-test.apk
& .\outputs\trazo-android\native\verify.ps1 -WebRoot .\outputs\trazo-android\native\smoke-web -Apk .\work\trazo-android\toolchain\smoke-test.apk
```

Compilar, inspeccionar recursos y verificar firmas no prueba el comportamiento de cámara, teclado, selector o WebView en un dispositivo. Esas pruebas deben identificarse por separado. No se incluye ni se instala un emulador.

Referencias oficiales: [JDK de Microsoft](https://learn.microsoft.com/en-us/java/openjdk/download), [herramientas Android](https://developer.android.com/tools), [contenido local en WebView](https://developer.android.com/develop/ui/views/layout/webapps/load-local-content), [MediaStore](https://developer.android.com/training/data-storage/shared/media), [cambios de Android 16](https://developer.android.com/about/versions/16/behavior-changes-16).


