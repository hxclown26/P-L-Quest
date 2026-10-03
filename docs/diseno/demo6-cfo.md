# Demo 6: de la lectura CFO al juego

**Conclusión.** Demo 6 cambia cómo se mueve el P&L, cómo termina un año y cuánto contexto tiene cada
decisión, para que un lector de finanzas no encuentre en pantalla cosas que un negocio real no haría.
Es como pasar de un simulador de vuelo donde el avión se estrella al tocar un indicador, a uno donde
primero suena la alarma, luego hay un plan de emergencia y solo al final se pierde el avión.

## 1. Qué se leyó y qué se hizo

| Lo que encontró la lectura CFO de Demo 5 | Qué hace Demo 6 | Dónde se vigila |
|---|---|---|
| Una quiebra con OI de 8 % y margen de contribución de 60 %: un medidor en 0 mataba la empresa. | Un medidor en 0 es un **golpe** al P&L (el cliente se va, la planta para, el mercado deja de respetar el precio) y el medidor reinicia en 35. **OI en 0** en un cierre trae el **plan de reestructuración** (una vez). La **quiebra** es del P&L: el Gross Profit cubre 70 % del SG&A o menos en dos cierres seguidos. | `tests/year-ladder.test.js`, `tests/year-balance.test.js` |
| Respuestas cuyo texto decía una cosa y cuyo P&L hacía otra (un rebate que bajaba incentivos, un despacho detenido que "gastaba" flete). | Cada respuesta mueve **una o dos líneas** en el sentido que dice su texto: más ventas **y** más incentivos, venta perdida **y** flete ahorrado. | `tests/year-direction.test.js` (los casos del CFO), `tests/year-problems.test.js` |
| Atajos que incumplen reglas (subir un precio fijado por contrato, inflar un pronóstico) se trataban como un atajo más. | **Seis líneas rojas**: multa en el SG&A en el acto, todos los medidores pierden confianza, sin cuenta oculta, y el año no puede terminar mejor que «malo». | `tests/year-direction.test.js`, `tests/year-archetypes.test.js` |
| Una deducción podía quedar negativa. | Una deducción nunca baja de cero (también en el medio año). | `tests/model.test.js` |
| Las chispas celebraban atajos. | Solo celebra la respuesta que mejora a la vez el OI y el medidor del problema. | `tests/fx.test.js` |
| Un solo cliente minero para todo; no se veía crecimiento, solo margen. | Cuatro **segmentos** (hoteles, hospitales, alimentos, industria; 12 problemas cada uno) con distinto arrastre de flete y servicio por volumen. **Crecimiento de ventas** y **OI en US$ M** en el veredicto, el cierre y como número que flota tras cada respuesta. Cuatro problemas de **volumen y precio** (y dos mixtos): vender mucho a mal precio es un mal negocio aunque las ventas crezcan. | `tests/year-kpis.test.js`, `tests/year-kpis-render.test.js`, `tests/year-direction.test.js` |
| «Las preguntas quedan cortas»: no se entendía lo que pasaba. | Cada problema abre con una **ficha** (quién pide, por qué ahora, tres datos) y, tras responder, cuenta la **historia específica** de esa respuesta. | `tests/year-case.test.js`, `tests/year-brief.test.js` |

## 2. Qué no cambió

Los seis finales y sus umbrales (21,5 / 17 / 13 / 8 de OI y 55 / 45 / 36 / 24 de medidor más débil), el
orden barajado a partir del código de partida, los cuatro tipos de respuesta, el tutorial y el taller en
grupo. Los códigos de partida dan el mismo **orden** de problemas, pero los números y los finales
difieren de Demo 5: los códigos de resultado del taller no se transfieren.

## 3. Lo que Demo 6 aún no resuelve (decisiones tuyas)

1. **La escala del experto.** Quien juega perfecto llega a ~27 % de OI y +17 % de ventas. Los umbrales de
   «excelente» (21,5 %) se calibraron con esa escala. Un lector de finanzas puede encontrarla generosa; bajar los
   bonos de medidores y reajustar los umbrales es una recalibración completa, y no se hizo para no mover el
   piloto de este lunes.
2. **El puente del OI** sigue atribuyendo el apalancamiento operativo al paso «Ventas»; una versión por precio,
   volumen y mezcla sería más fiel a lo que hace un controller, y no se hizo.
3. **Economía estilizada.** Las magnitudes de cada respuesta (por ejemplo, que licitar al mínimo venda 5,7 % más
   y deje el OI en dinero 0,35 por debajo) enseñan la lógica, no predicen una empresa. Las revisan las dos
   personas del negocio con la ficha rehecha (`docs/revision/revision-dominio.xlsx`).
4. **Tiempos.** Con la ficha el medio año toma ~25 minutos y el año ~50 (estimados, sin medir con personas); la
   meta 2 del piloto (30 minutos) puede quedar justa.
5. **La guía del creador** (el Artifact y la presentación) sigue describiendo Demo 5 y no se actualizó, a pedido.
