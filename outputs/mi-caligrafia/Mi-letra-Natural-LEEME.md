# Mi letra Natural

Perfil pensado para que tu letra se vea **bonita pero no perfecta**. Es el perfil que la app elige una vez al actualizar; después respeta el que tú elijas.

## Qué tiene

- **226 muestras para 124 caracteres.** Las letras y cifras tienen 2 o 3 formas reales revisadas a ojo entre tus 390 muestras. Se descartaron las rotas, por ejemplo la ñ 3 y 4, que parecían una «x» con tilde. La primera forma de cada letra es la misma que en Uniforme. Las demás se normalizaron con las mismas reglas de altura, base e inclinación (`work/caligrafia-2026-10-28/curar_natural.mjs`, adaptado de `curar_uniforme.py`).
- **Bordes suavizados.** Se quitaron los «mordiscos» que dejaron los píxeles de las fotos, sin cambiar la forma de las letras.
- **Signos más finos.** Los signos (! ¡ ? - _ $ & comillas…) tenían casi el doble de grosor que las letras. Ahora se acercan al grosor de tu trazo (44 unidades; las letras tienen 41).
- **Arreglos puntuales:** guion más corto, ² y ³ más bajos y la j con el punto de tu propia i.
- **Símbolos nuevos hechos solo con tus trazos:** × · < > ≤ ≥ ± ≠ → ∞ ° | −. En `Mi-letra-Natural-curacion.json` está de qué trazos sale cada uno.
- No incluye letras griegas (π, Δ, θ, α, β, λ, μ, ω, Ω) ni ∫, porque no hay muestras. Escríbelos en la hoja de prueba y se agregan.

Al escribir, la app nunca repite la misma forma dos veces seguidas. Con **Naturalidad** (en Páginas) cada letra se mueve unas décimas de milímetro, gira 1–2° y cambia apenas de tamaño y espacio. La vista previa y el PDF salen idénticos y nada sale de los márgenes.

## Archivos

- `Mi-letra-Natural.trazo`: biblioteca para importar en otra instalación. La app ya la trae incluida.
- `Mi-letra-Natural.otf`: fuente instalable, con las variantes como alternativas.
- `Mi-letra-Natural-variantes-1/2/3.png`: Uniforme (fondo gris) junto a cada forma de Natural.
- `Mi-letra-Natural-curacion.json`: variantes elegidas, procedencia, grosores y límites.

Original, Optimizada y Uniforme no cambiaron: sus datos son idénticos a los de la versión anterior.
