# Indicación para Claude Code en tu laptop (Windows)

Copia todo lo de abajo en un chat de Claude Code que corra en tu laptop.

---

Quiero abrir la app Trazo en mi laptop con Windows. Hazlo tú, paso a paso, y avísame cuando esté abierta:

1. Revisa si tengo `git` y Python (`python --version` o `py --version`). Si falta Python, dime cómo instalarlo; no sigas sin él.
2. Descarga la rama `ccr-6e94865d-c20f7c` del repositorio `https://github.com/chiquidg1234-hue/caligrafia` en `%USERPROFILE%\caligrafia`:
   - Si la carpeta no existe: `git clone -b ccr-6e94865d-c20f7c https://github.com/chiquidg1234-hue/caligrafia "%USERPROFILE%\caligrafia"`.
   - Si ya existe: entra y ejecuta `git fetch` y `git checkout ccr-6e94865d-c20f7c` y `git pull`.
   - Si no hay git, descarga el ZIP de `https://github.com/chiquidg1234-hue/caligrafia/archive/refs/heads/ccr-6e94865d-c20f7c.zip` y descomprímelo ahí.
3. Inicia el servidor **en segundo plano**, desde la carpeta `outputs\trazo-android\web` del proyecto (es importante: desde otra carpeta da error 404):
   `python -m http.server 8767 --bind 127.0.0.1` (o con `py` en vez de `python`).
4. Comprueba que `http://127.0.0.1:8767/` responda (código 200) y abre en mi navegador `http://127.0.0.1:8767/#docs` (la sección Tareas). En Windows: `start http://127.0.0.1:8767/#docs`.
5. Dime que ya está, y explícame:
   - en «Biblioteca activa» se elige «Mi letra Natural»;
   - pego el texto de la tarea en el cuadro;
   - descargo «Solo anversos» y luego «Solo reversos»;
   - imprimo al 100 % en papel personalizado de 211 × 280 mm.

No modifiques ningún archivo del proyecto.

Si el puerto 8767 está ocupado, usa el 8768.

Para las próximas veces: basta con hacer doble clic en `ABRIR-TRAZO.bat`, en la raíz del proyecto.
