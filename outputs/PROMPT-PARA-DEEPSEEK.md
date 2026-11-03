# Indicación corta para DeepSeek (cópiala entera al empezar el chat)

---

Vas a escribir tareas en **«formato Trazo»**. Es un texto plano que una app convierte en hojas escritas a mano. **No resuelvas «a tu manera»: copia exactamente este formato.**

**Reglas, sin excepción:**

1. Entrega **todo dentro de UN solo bloque de código** (tres comillas invertidas al inicio y al final), sin texto antes ni después. Así el chat no lo convierte en Markdown.
2. **Prohibido:** LaTeX (`\frac`, `\boxed`, `$`, `\[`), negritas `**`, tablas, viñetas `*`, «Tema:», «Curso:», «Fórmula:», «Procedimiento:», «Nota:», resúmenes y comentarios.
3. Primer renglón: `[[hoja trapper]]`. Segundo renglón: `[[letra intermedia]]` (o la letra que te pida).
4. Un solo título: `# Práctico de Química` (o la materia que corresponda).
5. Cada ejercicio:
   - `### Ejercicio N.-`
   - en la línea siguiente, el enunciado copiado tal cual;
   - una línea vacía;
   - si hay reacción química, la ecuación igualada en su propia línea, y otra línea vacía.
6. Después:
   - `[[columnas 12]]`, luego `Datos:` y un dato por línea;
   - `[[|]]`, luego la resolución con una igualdad corta por línea;
   - `[[fin]]`.
7. Cada resultado final va en su propia línea, que empieza con `!! `. La app le agrega «//».
   - Solo en resultados de ejercicios, nunca en fórmulas sueltas.
   - El renglón del resultado debe ser corto: primero escribe la cuenta en una línea y después `!! m = 400 g`.
8. Escritura de fórmulas:
   - Subíndices con `_`: `H_2SO_4`, `Ca_3(PO_4)_2`, `m_s`. **Nunca** uses H₂SO₄ con números chiquitos.
   - Potencias con `^`, fracciones con `/`: `(25 · 900)/100`.
   - Unidades con barra en la misma línea, con doble barra: `g//mol`, `g//ml`, `g//L`, `m//m`, `m//v`.
   - Multiplicar con `·`, flecha con `->`, coma decimal: `1,05`.
9. Los renglones de la columna derecha deben ser **cortos** (unos 30 caracteres). Si una cuenta es larga, divídela en dos renglones.
10. Línea vacía entre ejercicios. Nada más.

**Ejemplo exacto de cómo debe quedar:**

```
[[hoja trapper]]
[[letra intermedia]]
# Práctico de Química

### Ejercicio 1.-
Calcule el porcentaje en masa de una solución de sulfato de cobre en agua si contiene 90 g de soluto en 600 g de disolución.

[[columnas 12]]
Datos:
m_s = 90 g
m_d = 600 g
%m//m = ?
[[|]]
%m//m = m_s/m_d · 100
%m//m = 90/600 · 100
!! %m//m = 15 %
[[fin]]

### Ejercicio 2.-
Con 0,30 moles de nitrato plumboso y 0,65 moles de yoduro de sodio, ¿cuántos gramos de yoduro plumboso se obtienen? ¿Qué cantidad de masa sobra?

Pb(NO_3)_2 + 2NaI -> PbI_2 + 2NaNO_3

[[columnas 12]]
Datos:
n Pb(NO_3)_2 = 0,30 mol
n NaI = 0,65 mol
PM PbI_2 = 461 g//mol
PM NaI = 150 g//mol
[[|]]
NaI necesario = 0,30 · 2
NaI necesario = 0,60 mol
Limitante: Pb(NO_3)_2
m = 0,30 · 461
!! m PbI_2 = 138,3 g
n sobrante = 0,65 - 0,60
m = 0,05 · 150
!! m sobrante = 7,5 g
[[fin]]
```

Si un resultado no coincide con la respuesta de la guía, **no lo escribas en la tarea**. Avísame aparte, después del bloque, en una sola línea.
