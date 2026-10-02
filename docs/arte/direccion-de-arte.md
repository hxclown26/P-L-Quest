# Dirección de arte de P&L Quest (Demo 5)

Una hoja para que todo lo que se dibuje se vea del mismo juego. Sigue el método de la skill
`create-game-assets`: fijar el marco técnico, nombrar el sistema visual, aprobar **un** héroe a escala real y
solo entonces rehacer la familia. Todo es dibujo propio hecho en código; no hay imágenes externas ni arte
generado.

## Marco técnico

- Lienzo lógico de 256×256 px, escalado por enteros, sin suavizado. Cada escena de problema mide 116×42 px.
- Todo se dibuja con rectángulos, discos, líneas y pequeños sprites escritos como filas de letras
  (`src/render/draw.js`). Ningún archivo de imagen: el juego sigue siendo un solo HTML.
- Una escena es una función del tiempo `t` (segundos) y de un ánimo: `draw(g, t, mood)`. No guarda estado.

## Sistema visual

| Aspecto | Regla |
|---|---|
| Formas | Compactas y legibles a 1×. Contorno de 1 px en `ink` en todo objeto y personaje; los fondos lejanos van sin contorno. |
| Paleta | Cada material tiene una rampa de tres tonos, `[sombra, base, luz]`, en `src/render/palette.js` (`ramp`). No se escriben colores nuevos en el código del renderer: lo vigila `tests/palette.test.js`. |
| Luz | Desde arriba a la izquierda: tono de luz en el borde superior e izquierdo de cada forma, tono de sombra abajo y a la derecha. |
| Valor | El fondo es más oscuro y apagado que el primer plano; el foco de la escena (el personaje o el fenómeno) lleva el mayor contraste. |
| Detalle | Tres planos: fondo plano, medio con un detalle, primer plano con dos o tres. No más de unos seis objetos por escena. |
| Movimiento | Bucles suaves de 0,5 a 2 Hz (parpadeo, vapor, luces). Nada que parpadee más de 3 veces por segundo. |
| Zona calma | La esquina inferior derecha (`Mes N - p/4`) es piso plano de la rampa `floor`: una prueba lo comprueba píxel a píxel. |
| Ánimo | `neutral` mientras la pregunta está abierta; `good` o `bad` después de responder, según lo que le pasó al medidor del que trata el problema (lo mismo que ya dicen las flechas de la pantalla de resultado, así que no adelanta nada). El cliente no sonríe tras un atajo que sube el OI y le hace daño. Los efectos (destello, chispas, humo) siguen en cambio al OI, como el P&L. |

## Efectos (de `game-feel`)

Los efectos añaden énfasis sin tapar números y siempre vuelven al reposo (`src/ui/fx.js`): sacudida por «trauma»
de 0 a 3 px enteros (menos de medio segundo), un destello tenue (≤ 20 %, ≤ 120 ms) y partículas dentro de la
ventana de la escena. Se gradúan en pequeño, mediano y grande según el efecto de la respuesta frente al
máximo de un año. El **modo calmo** (tecla E; sigue `prefers-reduced-motion` mientras no se elija) los quita todos.

## Aprobación del héroe

La escena del cliente es el héroe. Se mira a 1× dentro de la pantalla real y a 6× junto a la versión anterior.
Pasa si: se lee a 1×, la silueta del personaje es clara, los tres ánimos se distinguen, convive con la ventana
azul y no toca la zona calma. Con el héroe aprobado se rehacen las otras 11 escenas con las mismas reglas.

## Procedencia

Todo el arte del juego es original y está escrito en código. Las skills de `gamedev-skills` solo guían el
método y no aportan archivos al juego: están instaladas en la máquina de quien desarrolla, fuera del repositorio.
