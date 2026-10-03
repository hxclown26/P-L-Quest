# Protocolo del piloto de P&L Quest (Demo 6)

**Qué se decide.** Si el juego enseña lo que dice enseñar y si un líder de finanzas lo acepta, con una
sesión de 90 minutos para 12 a 15 personas. Si se cumplen las cuatro metas de la sección 6, se evalúa
el Demo 6; si no, se itera con lo que mostró el piloto. Con ese tamaño el resultado es **descriptivo**,
no una prueba estadística.

## 1. Antes de la sesión

| Qué | Detalle |
|---|---|
| Participantes | 12 a 15, mezcla de comercial, operaciones y otras áreas, y al menos 3 de finanzas (la meta de «objeción al P&L» solo tiene sentido con ellos). Sin entrenamiento previo en el juego. |
| Equipo | 1 facilitador y 1 observador. Una sala con proyector; un computador por persona con Chrome, Edge o Safari. El juego es un solo archivo, `pl-quest-demo6.html`, que no necesita internet; también abre en https://hxclown26.github.io/P-L-Quest/ (ahí sí hace falta internet). **Respaldo:** si algo falla en la sala, el Demo 5 sigue disponible, congelado, en `pl-quest-demo5.html` y en https://hxclown26.github.io/P-L-Quest/pl-quest-demo5.html (sus textos, números y finales son los anteriores). |
| Revisión previa | La ficha de dominio (`docs/revision/revision-dominio.xlsx`, rehecha con el contenido de Demo 6: segmento, efecto de cada respuesta en el P&L y la historia que el juego cuenta) revisada por 2 personas del negocio y el test de 5 preguntas (formas A y B) aprobado por ti. El test y su clave se guardan fuera del repositorio público (`docs/piloto/resultados/`, que git ignora) para que nadie vea las preguntas antes. |
| Modo de juego | **Medio año** para todas las personas (unos 25 minutos: cada problema abre con una ficha que hay que leer). El año completo toma 45 a 60 minutos y no cabe en el bloque de 30. Todas teclean el mismo código de partida de 4 dígitos, así el debrief habla de los mismos 24 problemas. |
| Efectos | Demo 6 conserva los efectos de Demo 5: sacude la escena, destella y lanza partículas un instante cuando una respuesta pesa mucho. La tecla **E** los apaga (modo calmo), y el juego ya parte calmo si el equipo tiene activado «reducir movimiento». Que todas las personas jueguen en el mismo modo (el de efectos completos, salvo quien pida el calmo por comodidad o salud) y anota quién usó el calmo. Reglas, números y problemas son idénticos en los dos modos. |
| Formularios | Las formas A y B del test como cuestionarios con puntaje por pregunta (cada acierto vale 1). Las claves viven solo dentro del formulario. |
| Grupos | Mitad hace A antes y B después (A→B), mitad al revés (B→A). Asigna alternando: IDs impares A→B, pares B→A. |
| IDs | P01, P02, etc. No se registran nombres en ningún archivo de análisis. |
| Prueba técnica | Un día antes, abre el archivo (o el enlace) en 2 equipos de los que se usarán: título, menú, un mes completo y el informe final, en español. Prueba también la tecla E y que el texto con g, j, p, q, y se lea bien en el proyector. Mira que cada problema abra con su ficha (Enter muestra las respuestas), que la imagen nombre el segmento del cliente y que el veredicto traiga ventas, OI en US$ M y, si corresponde, «Crece sin margen». |

## 2. Agenda de 90 minutos

| Min | Bloque | Quién hace qué |
|---|---|---|
| 0-10 | **Pre-test** | Cada persona responde su forma (A o B) sin calculadora. Nadie ve la clave. |
| 10-15 | **Lectura del P&L** | El facilitador proyecta la cascada (Ventas, Incentivos, Ventas netas, Costo, Flete, Direct Chg, SG&A, OI) y explica qué es cada línea con un ejemplo que **no** aparezca en el test. |
| 15-45 | **Juego** | Cada persona juega el **Medio año** con el código acordado (sin `?creator`). El observador anota dudas y reacciones; el juego mide el tiempo solo. Quien termina antes puede mirar el informe Plan | Real | Var. |
| 45-65 | **Debrief con el P&L real al lado** | El facilitador proyecta un informe final y pregunta: ¿qué línea movió más el resultado? ¿qué decisión la movió? ¿dónde se discutió si era P&L o caja? |
| 65-75 | **Post-test** | La otra forma, sin calculadora. |
| 75-80 | **Encuesta de 3 preguntas** | Ver sección 4. |
| 80-90 | **Cierre** | Dudas, agradecimiento y aviso de que los resultados son anónimos y se usan para mejorar el juego. |

Reglas del facilitador: no corregir el pre-test ni dar pistas durante el juego; no usar el puntaje del
juego como premio; no mostrar el modo creador.

## 3. Qué anota el observador

- **Minutos** de cada persona: los lee de la primera página del resultado (el juego los muestra junto al plan, como «mm:ss min») y si terminó.
- **Dudas en voz alta**, con la pantalla en que ocurrieron (problema, resultado, cierre de mes, informe).
- **Frases reveladoras**: «¿esto es P&L o caja?», «siempre es la más larga», «la que sube el OI es la correcta». Una sola frase de las últimas dos es una señal de que una respuesta se delata.
- **Preguntas del test** que generaron discusión o se leyeron mal.

## 4. Encuesta de 3 preguntas (después del post-test)

1. ¿Qué tan útil fue el juego para entender qué mueve cada línea del P&L? (1 a 5)
2. ¿Algo del P&L en pantalla (líneas, nombres o cifras) no te pareció correcto? (Sí / No) Si respondes Sí, ¿qué? *(las objeciones de las personas de finanzas son la meta 4)*
3. ¿Qué cambiarías? (texto libre)

## 5. Dónde van los datos

La hoja `plantilla-analisis.xlsx` tiene una fila por persona: el puntaje 0 o 1 de cada pregunta antes y
después, el grupo, si terminó la partida y en cuántos minutos, la utilidad y si hubo objeción al P&L. La hoja
Resumen calcula todo sola. Guarda el archivo completado en `docs/piloto/resultados/`, que **no se sube
a GitHub** (está en `.gitignore`), o fuera del repositorio. No se publican respuestas individuales.

## 6. Metas del piloto (propuestas por mí; las confirmas o las cambias)

| # | Meta | Cómo se lee en el Resumen |
|---|---|---|
| 1 | **+20 puntos porcentuales** de aciertos entre antes y después (con 5 preguntas, +1 acierto por persona en promedio). | Ganancia (pp) |
| 2 | **Al menos 80 %** termina la partida (el medio año) en 30 minutos o menos. | % que terminó en ≤ 30 min |
| 3 | **Utilidad promedio de 4 sobre 5** o más. | Utilidad promedio |
| 4 | **Ninguna** persona de finanzas objeta el P&L en pantalla. | Objeciones al P&L |

El Resumen propone una decisión («Evaluar Demo 6» si se cumplen las cuatro; «Iterar con lo que mostró
el piloto» si falta alguna; «Faltan datos» si aún no se llena). La decisión final es tuya y se toma
mirando también las observaciones de la sección 3.

## 7. Límites que hay que decir en voz alta al leer los resultados

- **Tamaño**: con 12 a 15 personas, una ganancia de 20 puntos puede ser azar. La prueba de signos del
  Resumen es una guía, no una conclusión.
- **Sin grupo de control**: la mejora puede deberse a haber visto el P&L proyectado y el debrief, no solo al
  juego. Si importa separarlo, un segundo piloto sin juego (solo lectura y debrief) lo mide.
- **Formas A y B no validadas**: se supone que pesan lo mismo. La tabla «Por grupo» del Resumen lo
  delata: si los dos grupos ganan muy distinto, una forma es más difícil.
- **El reloj del juego** cuenta desde el primer problema hasta el veredicto, también con las reglas
  abiertas, y solo mientras la pestaña está a la vista: una pestaña en segundo plano acorta el tiempo.
- **El medio año no es el año**: son 24 de los 42 problemas que caben en esos meses y cada decisión pesa el
  doble. Mide lo mismo que el año (las notas y los umbrales son los mismos), pero con menos situaciones.
- **Contenido nuevo desde Demo 5**: Demo 6 reescribe las respuestas, agrega la ficha y la historia de cada
  problema, cambia cómo se mueve el P&L y cómo termina un año (golpes de medidor, plan de
  reestructuración, quiebra por el P&L, líneas rojas). Las dos personas del negocio deben revisar la ficha
  rehecha con ese contenido, no la anterior. Quien juegue en modo calmo ve menos énfasis al responder, pero
  lee la misma información.
- **El tiempo del medio año con la ficha** es una estimación (unos 25 minutos), todavía sin medir con
  personas: la meta 2 (30 minutos o menos) se fijó antes de la ficha y puede salir exigente. Tú decides si la
  subes a 35 minutos antes de la sesión (en `tools/make_pilot_xlsx.py`, `FINISH_MINUTES`).
- **Español solamente**: la versión en inglés no tiene revisión humana.
- **Autoría**: las 48 situaciones, el test y las metas las escribí yo; la revisión de dominio y tu
  aprobación del test son las que les dan validez.
