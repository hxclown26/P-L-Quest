# P&L Quest

A 16-bit style game, in one HTML file, that teaches two things: who controls each line of
the P&L, and how a decision ends up in OI. All data is fictional. Spanish and English.

**Play it online:** https://hxclown26.github.io/P-L-Quest/ (the link opens version 1, the published build;
Demo 6 stays at https://hxclown26.github.io/P-L-Quest/pl-quest-demo6.html, Demo 5 at https://hxclown26.github.io/P-L-Quest/pl-quest-demo5.html, Demo 4 at
https://hxclown26.github.io/P-L-Quest/pl-quest-demo4.html and Demo 3 at
https://hxclown26.github.io/P-L-Quest/pl-quest-demo3.html). In creator mode:
https://hxclown26.github.io/P-L-Quest/?creator

| File | What it is |
|---|---|
| `pl-quest.html` | Demo 1: the 5-floor tutorial. A frozen copy, never rebuilt. |
| `pl-quest-demo2.html` | Demo 2, frozen as it was tested: the full year, the endings list and the group workshop. |
| `pl-quest-demo3.html` | Demo 3, frozen (the build that was published first): a P&L that reads like a finance report, a year-end report against the plan, a game code, and a menu with only the two ways to play. |
| `pl-quest-demo4.html` | Demo 4, frozen: the build the review and pilot kits were written against. Net sales and separate Freight and Direct Chg lines in the P&L, honest model assumptions, 48 rewritten problems whose answers do not give themselves away, and the kits to review and measure it (see "Domain review and pilot"). Game codes and result codes of earlier demos do not work in it. |
| `pl-quest-demo5.html` | Demo 5, frozen: Demo 4 with a visual pass and nothing else. Same rules, numbers, problems and game codes; new type, art, effects and a calm mode (see "Look and feel"). The fallback of the pilot. |
| `pl-quest-demo6.html` | Demo 6, frozen: the model, the problems and the way a year ends, reworked after a CFO read of Demo 5 (see "What Demo 6 changes"). A game code still gives the same order of problems, but the numbers and the endings differ: codes and results of earlier demos do not carry over. |
| `pl-quest-v1.html` | **Version 1, the current one**: Demo 6 with the screen of a 16:9 stage (see "What version 1 changes"), every situation played in five units of business drawn from the game code, water treated and reused in industrial processes instead of sold, and mining with its chemical inputs. Codes and results of earlier demos do not carry over. |

## Play

Open the link above, or `pl-quest-v1.html` (double click, no internet needed). Pick **Año completo** (the full
year, about 50 minutes), **Medio año** (six months at double pace, about 25 minutes) or **Tutorial**
(5 floors, about 10 minutes). The times are estimates from the amount of text a year has; the game
measures the real one and shows it at the end of every game. To compare players, send the link (or
the file) and ask for a screenshot of the result screen.

| Key | Action |
|---|---|
| Up / Down (or W / S) | move down the list of answers (or the menu) |
| Enter / Space / Z | read the brief of a problem and show its answers (while the brief is still typing, the first press finishes it); pick; continue |
| 0-9 | on the year intro: type a 4-digit **game code** (see below). Backspace erases a digit |
| N | tutorial: technical note. Year: the rules (two pages: rules and grades, then the model's assumptions; arrows turn the page) |
| Esc / X | back; during a game it asks before leaving |
| M | mute |
| L | switch language (ES / EN) |
| E | calm mode: no screen shake, flashes or particles (it starts on when the system asks for reduced motion) |

Mouse and touch work too: tap the brief to show the answers, tap an answer to select it, tap again to pick it.

## Reading the P&L

The statement on the left is laid out like a finance report. Figures are fictional, in
**US$ millions**, and the plan has net sales of 100 (sales 102 less incentives 2).

- Every line is shown in money, and under it (in blue italics) its **ratio**: the line as a
  percentage of **net sales**, the way the finance report this follows reads it. Net sales are the
  base of every ratio, so they have none; sales and incentives, the two lines above them, go
  without one too. Freight carries its ratio, as in the report; direct charges (Direct Chg) do not.
- Deductions (Incentivos, Costo, Flete, Direct Chg, SG&A) are positive amounts; the results
  (Ventas netas, M. contribución, Gross Profit, OI) are in bold with a light band. A loss shows
  between brackets, `(5,0)`.
- The cascade: Ventas - Incentivos = **Ventas netas**; - Costo = **M. contribución**; - Flete -
  Direct Chg = **Gross Profit**; - SG&A = **OI**. OI is also a ratio (OI / net sales) and the plan
  is 15%. More incentives shrink the net sales, so every ratio thickens. Freight and direct
  charges are two lines because the team reads them apart (the old cost to serve was their sum);
  the service COGS of the source report sit inside direct charges.
- After each answer the rows that moved are green (better) or red (worse) and carry a small
  triangle (up or down), so the colour is never the only sign; the numbers roll to their new value,
  the change in OI floats up from its row in percentage points (pp) and, when the answer moved the
  net sales by half a percent or more, the growth floats up from the sales row.
- While you choose, the line the highlighted answer moves is marked with a gold band.
- The figures are annualized at the close of each month, not accumulated.

The **first page of the verdict** reads the year the way a CFO does, next to the margin: the OI in
money (US$ M) and the **growth of the net sales** against the plan, with a label when growth and
profit part ways: *Crece sin margen* (sales up, OI in money not) or *Margen sin crecer* (the margin
kept by shrinking). The analysis page then gives the lesson in place of the usual meter tip.

At the end of the year the **second page of the verdict** is the same statement as a report:
**Plan | Real | Var.**, with the variance read the way a report reads it (green when it helps the
business, red and between brackets when it hurts; ratios in points). That page, with the game code
in its corner, is the one to screenshot.

## What version 1 changes

Version 1 is Demo 6 with five corrections and additions:

- **A 16:9 stage.** The game is drawn on a 480 by 270 surface at 4 times its size, with vector type, twelve scenes and a factory that goes from shining to ruins
  with the OI. Every screen (title, menus, problem, month close, verdict, ranking, tutorial) was recomposed for it.
- **Five units of business.** Each of the 48 situations is written for hotels, hospitals, food, industry and mining, with another client, other figures and its own
  story; the dilemma, the four answers and what each does to the P&L are the same. The game code draws the unit of each situation: a full year brings 9 or 10 cases of
  each unit (2 or 3 of each voice) and a half year 4 or 5, and the chip over the scene names the unit. Mining is a unit the situations are played in, not one they were
  written for, so the pinned endings do not move.
- **The water is treated and reused, never sold.** The unit sells hygiene, chemical inputs and programs to reuse industrial water (boilers, cooling towers, process
  water). The introduction says so, the three situations about water (a reuse program, a water rule and a drought) talk about the systems where it is reused,
  and the drought is answered with an emergency reuse at a high cost instead of tankers.
- **Mining and its chemical inputs.** 48 cases for a mine or its concentrator that buys flotation reagents, flocculants, antiscalants and technical service with dosing
  systems on loan; the water of mining is the water recovered from thickeners and tailings. Mining words are allowed in the mining unit only.
- **The same honesty rules.** The audits that keep the answers from giving themselves away now run on five sets of cases, one block of a voice and a unit each
  (`tests/content-tells.test.js`, `tests/helpers/cases.js`).

## What Demo 6 changes

Demo 5 was read as a CFO would read it, and Demo 6 answers that read:

- **The P&L moves the way the text says.** An answer that gives a rebate shows incentives going up;
  one that halts a shipment loses sales and saves freight; a giveaway discount raises sales and pays
  for them in incentives. Each answer moves one or two lines in the direction its wording says
  (`tests/year-direction.test.js` pins the ones the CFO found wrong). A deduction can never go below
  zero.
- **Growth and margin are different things.** Four problems (a rival 8% cheaper, a new buyer who
  tenders, volume for price, a three-year contract at a fixed price) and two mixed ones (a new
  product, a new country) are priced in **volume and price** and the P&L works out the result: a
  tender won at the lowest price sells 5.7% more and leaves a smaller OI in money. The verdict shows
  the sales growth and the OI in US$ M.
- **A year ends by its P&L, as it would in a company.** A meter at zero is no longer an ending but a
  **blow** to the P&L (the client leaves: volume -16%; the plant stops: sales and cost; the market
  stops respecting the price: -6%), and the meter restarts at 35. **OI at zero at a close** brings
  the board's one-time **restructuring plan** (SG&A -15%, cost -2%, every meter -5, up to month 9;
  the balanced answer earns 5x OI until the OI is back to the plan, and the year can end no better
  than "fair"). **Bankruptcy** is a gross profit that covers 70% of the SG&A or less at two closes
  in a row. Six **red lines** (breaking a contract price, inflating a forecast, hiding an incident,
  mixing doubtful batches, leaving obsolete stock at book value, bringing next month's invoices
  forward) are shortcuts that cross the rules: a fine in the SG&A, every meter loses trust, no
  hidden bill, and the year cannot end better than "bad".
- **Context before and after.** Each problem opens with a **brief**: who is asking and why now, in
  up to five rows, and three facts (client, weight, deadline). Enter shows the answers. After an
  answer the game tells the **specific story** of that answer in that problem, not a generic line.
- **Clients of four segments**: hotels, hospitals, food industry and general industry (twelve
  problems each; three of each voice). The picture window names the segment, and the segment decides
  how much of freight and direct charges follows a change in volume (a hospital asks for more service
  than a hotel).
- **The kits** (domain review sheet, pilot template) follow the new content.

Not changed: the 6 outcomes and their thresholds, the shuffling from a game code, the four kinds of
answer, the tutorial and the group workshop.

## Look and feel (Demo 5)

Demo 5 changed what you see and feel, nothing else: `src/year/`, `src/rng.js`, `src/engine.js` and
`src/model.js` were byte for byte those of Demo 4, so the rules, the numbers, the 48 problems and the
game codes were the same (a code gave the same year in both). The only new texts were the two
calm-mode notices and the "DEMO 5" label of the menu. The picture is still 256x256, drawn entirely
in code, in one HTML file.

- **Art direction** (`docs/arte/direccion-de-arte.md`): a 1 px ink outline on every object, materials
  in three tones (shadow, base, light) with the light from the top left, and every colour taken from
  the palette (`tests/palette.test.js` fails on a colour written anywhere else in the new art). The 12
  problem scenes are redrawn with small loops (blinking, steam, lights) and three moods: neutral
  while you choose, good or bad once you answer, following the meter the problem is about, which the
  result screen already shows, so a scene never gives an answer away.
- **Type**: the font has descenders, so `g`, `j`, `p`, `q` and `y` are no longer squeezed into the
  line ("Direct Chg" used to read "Direct Cha", "negocio" "nesocio").
- **Contrast**: body text tones read at 4.5:1 or better on a window, red at 3.5:1 (it is never the
  only cue: the moved rows have triangles, the meters arrows) and the dim tone at 3:1 (checked in
  `tests/palette.test.js`).
- **Feedback in proportion**: what an answer does is sized small, medium or large against the biggest
  answer of a year, and the effects follow the size. Sparks (to gain) or smoke (to lose) rise inside the
  picture window, never over a number, a few for small and more for medium and large; a large result
  also gives one faint flash (green or red, at most 20% opacity, 120 ms); only a large loss, the rescue
  plan and bankruptcy shake the scene, by up to 2 whole pixels for about a third of a second (never the
  footer). Every effect is a pure function of time and ends on its own. The gauges drain with a pale
  ghost of what they had and their label pulses when a meter falls below 42 or 32, the month-close bars
  grow and their figures count up, and the verdict has its own air: confetti for an excellent or good
  year, drizzle for a bad or terrible one, embers for bankruptcy.
- **Calm mode** (key **E**): removes the shake, the flashes, the particles, the weather and the
  bounces; the gauges, the month-close bars and the verdict bridge show their final value at once. It
  starts on when the system asks for reduced motion (`prefers-reduced-motion`) until you press E, and
  the choice is remembered like the language. The footer says which mode you switched to.

## The half year

**Medio año** is the same year at double speed: 6 months of 4 problems (24 problems, 6 of each voice,
picked at random among the 42 that fit those months), every decision and every monthly effect weighs
twice as much, the meters wear down about 4 a month, the second half of a shortcut's bill arrives a
month later and the restructuring plan lasts until month 4. The grades and their thresholds are the
same, so a half year earns the same endings: an expert closes it excellent, doing nothing ends in
bankruptcy and the shortcut or giving in to everyone ends terrible (`tests/year-balance.test.js`
checks it). It does not count for "Mejor año", and the group workshop and the endings list stay with
the full year.

The **play time** (mm:ss, from the first problem to the verdict, rules included) shows on the first
page of the result next to the plan. It is how a pilot measures the length of a game without timing
each player.

## The full year in one minute

- 12 months, 4 problems per month: **client, plant, environment, strategy**. Each problem opens
  with its **brief** (who, why now, three facts); Enter shows its four answers, and you only see which
  P&L line each one moves, not what it does to the meters.
- **Every game is shuffled** from a **game code** of 4 digits (shown on the intro and on the
  results). The 48 problems are the same, but their order changes each time. Problems tied to the
  calendar keep their season: "closing the year" never comes in March, winter snow stays in the
  cold months, and the one that measures the client's savings comes in months 1-3. To make a whole
  room play **the same year**, tell everyone to type the same code on the intro screen
  (four digits, then Enter): the order of problems and answers is then identical.
- You watch OI (it starts at the plan, 15%) and three meters that start at 60: **Client, Plant,
  Strategy**. Meters wear down about 2 per month. Below 42 they cost OI, above 70 they add to
  it (a loyal client lifts sales), below 32 the balanced answer only works at 40%.
- Four kinds of answer, scattered in a different order every time: the **balanced** one (a
  little OI, lifts the meter), the **shortcut** (OI now, the bill arrives on the meters, half of
  it two months later), **giving in** (lifts the meter, costs OI) and **doing nothing** (costs
  both). Each answer shows only the P&L line it moves most (no arrow): the direction shows after
  choosing, in the numbers that roll, and the story under them says why.
- A meter at zero is a **blow** to the P&L (and restarts at 35); OI at zero at a close brings a
  one-time **restructuring plan** (up to month 9); a gross profit that covers 70% of the SG&A or
  less at two closes in a row is **bankruptcy**; a **red line** costs a fine and caps the year at
  "bad" (see "What Demo 6 changes").
- The result is the lower of the OI grade and the weakest-meter grade; the restructuring plan caps
  it at "fair" and a red line at "bad".

| Ending | OI margin at least | Weakest meter at least |
|---|---|---|
| Excellent year | 21.5% | 55 |
| Good year | 17% | 45 |
| Fair year | 13% | 36 |
| Bad year | 8% | 24 |
| Terrible year | anything below | |
| Bankruptcy | the gross profit covers 70% of the SG&A or less at two month closes in a row | |

After the result come three pages (the numbers and the OI margin bridge from plan to real by P&L
line; the P&L report against the plan; what happened and what to try next), then GAME OVER, and the
game restarts at the menu.

## Creator mode

The endings list, the group workshop and the reviewer are tools for whoever runs the session, so a
player who is handed the file never sees them. They open when the address of the page ends in
`?creator`, e.g. `file:///.../pl-quest-v1.html?creator`:

- **Ver los 6 finales** plays a pinned simulated year for each of the 8 play styles, so you can read
  every result screen in a minute (the pleaser shows *Crece sin margen*, the half-shortcut player
  *Margen sin crecer*). Those years never count as your best year, and they always use the same fixed
  order.
- **Taller en grupo** is the group workshop of Demo 2, kept as it was: a team types its name and a
  game code, plays that year, and gets a **result code** (`NOMBRE/XXXX-XXXX-...`, with a check that
  catches any mistyped character; **C** copies it). The facilitator pastes the codes of all teams in
  **Ranking de equipos**, which replays each year and compares them. It is not offered to players;
  for a competition a game code and a screenshot of the result are enough.
- **R** switches the reviewer: under each answer it shows its hidden character (balanced,
  shortcut, give in, passive) and its effect on OI and the three meters (its badge sits at the top
  right of the picture). Use it to judge whether a wording is ambiguous; it would give the game away
  to a player.

## Creator's guide

`docs/screens/` holds the screenshots (taken from Demo 6) of every screen that matters (menu, intro with the game code,
the brief of a problem, its answers, a result, the month close, the restructuring plan, the blow of a meter, the tutorial,
both pages of the rules and, for each of the six endings, its result and its P&L report), plus the half year
(`half_intro.png`, `half_close.png`) and the result with its play time (`verdict_time.png`). The creator's guide
(a private slide deck) still describes Demo 5 and is updated at the end of the pilot preparation, not with each build.

## Domain review and pilot (Demo 4, kept up to date)

Two kits, both outside the game, to take it from "built" to "trusted":

| Path | What |
|---|---|
| `docs/revision/revision-dominio.xlsx` | The review sheet for two people of the business (an hour to an hour and a half each): the 192 answers in Spanish and English, with the segment, the line the game says each one moves most, **its effect on the P&L line by line and which way** (and the volume and price of a growth answer), the story the game tells afterwards and, on the Problems sheet, the full brief. They mark realistic (yes / no / ambiguous), the right P&L line and a comment; the Summary sheet computes whether it passes (90% realistic, no line left in dispute). Rebuild it with `node tools/export-review.js \| python3 tools/make_review_xlsx.py docs/revision/revision-dominio.xlsx`. |
| `docs/piloto/protocolo.md` | The 90-minute pilot for 12 to 15 mixed people: pre-test, P&L reading, a year of the game, debrief with the real P&L beside it, post-test and a 3-question survey; the four success goals and the limits. |
| *(not in the repository)* | The 5-question test, in two parallel forms (A and B), and its answer key are kept out of this public repository on purpose: the people who take the pilot must not see the questions beforehand. The protocol says when it is taken. |
| `docs/piloto/plantilla-analisis.xlsx` | The analysis sheet: one row per person; the Summary compares before and after against the goals and proposes a decision. Completed files go in `docs/piloto/resultados/`, which git ignores. |
| `tools/check_review_xlsx.py`, `tools/check_pilot_xlsx.py` | Rehearse each sheet with made-up data, recalculate it in LibreOffice and compare the Summary with the same figures taken in Python. |

The answers are kept honest by a permanent audit (`tests/content-tells.test.js`, in Spanish and
English): a word model that sees every problem but one cannot find the balanced answer, nor guess a
kind of answer from the first word of its name, the line it shows or its length, beyond what chance
and the meaning of "wait" or "give in" allow; figures are spread evenly over the four kinds, and the
balanced answers cover Incentivos (4) and SG&A (8) as well as sales and cost. To rewrite a batch of
problems, `tools/authoring/` has the helpers (see its README).

## Model assumptions (also on page 2 of the rules, key N)

- Everything is fictional, in US$ millions, annualized at the close of each month. At plan the
  sales are 102, the incentives 2 (net sales 100) and OI is 15%.
- Ratios are a line over the net sales (sales less incentives).
- **Full year:** every answer moves one or two lines of the P&L (a gain in one, a cost in another,
  by weight), by an amount set by its type and the size of the problem; a **growth** answer is priced
  in volume (%), price (%) and extra service, and the P&L works out the result: a price change moves
  sales and incentives, a volume change also moves cost and the share of freight and direct charges
  the segment asks for (50% for a hotel up to 90% for a hospital); SG&A is fixed. A deduction can
  never go below zero.
- **Tutorial:** a price change moves sales and incentives; a volume change also moves cost and 60%
  of freight and direct charges; SG&A is fixed.
- The game stops at OI. Cash, working capital and debt are not P&L; interest and taxes are P&L
  items below OI. None of them is played.
- The effects are game effects: they teach the logic of the P&L, they do not predict any company.

## Testing tips

- Play the full year twice: the problems, the months they fall in and the answer positions
  should differ. Type the same game code twice and they must not. The tutorial also deals the four
  cards of each turn in a new arrangement.
- In creator mode press **R** in the full year to see the hidden effect of each answer.
- To check the report page without playing 48 problems, use the endings list in creator mode and
  turn to the second page of each verdict.
- Rendering at a different size: the picture is 256x256 and is scaled by whole numbers; resize the
  window and it re-fits.

## Develop

```bash
npm test        # unit, UI-flow, render and smoke tests (node:test, no dependencies)
npm run build   # bundles src/ into pl-quest-v1.html (the earlier demos are never touched)
```

Where things live:

| Path | What |
|---|---|
| `src/model.js` | the P&L model, base numbers (`BASE_PL`) and ratios (`operatingMargin`, `ratioOf`) |
| `src/rng.js` | the seeded random generator behind every shuffle, and the 4-digit game codes |
| `src/engine.js` | tutorial state machine, stars, thresholds |
| `src/content/cards.js`, `floors.js` | tutorial cards, effects, hands per turn, shocks |
| `src/year/rules.js` | year rules: meters, decay, blows, the restructuring plan, bankruptcy, grading |
| `src/year/archetypes.js` | what each of the four kinds of answer does, and what a red line costs |
| `src/year/problems.js` | the 48 problems: segment, meter at stake, size, the lines (and the weights, or the volume and price) each answer moves, red lines, calendar window |
| `src/year/segments.js` | the four client segments and how much service each asks for |
| `src/year/kpis.js` | sales growth, OI in money and the two labels of the verdict |
| `src/year/schedule.js` | the shuffled order of a year (problems, voices and answers) from one seed |
| `src/year/engine.js` | year state machine (problem, result, month close, rescue, verdict) |
| `src/year/simulate.js`, `showcase.js` | simulated players; the pinned years of the endings list |
| `src/year/feedback.js` | the OI bridge and the coaching text of the verdict |
| `src/year/replay.js`, `result-code.js`, `standings.js` | the group workshop: replay, result code, ranking |
| `src/ui/statement.js` | the P&L as a report: rows (money and ratio), changes, the plan-real-variance report |
| `src/ui/anim.js` | the motion of the screens as pure functions of time (rolling numbers, typing, fades, growing bars, bounces) |
| `src/ui/fx.js`, `src/ui/screen-fx.js` | the feedback layer as pure functions of time and a seed: sizes (small, medium, large), shake, flash, particles, weather, and the plan each screen takes from the state of the game (calm mode turns them all off) |
| `src/ui/` | UI state machines (`app.js` routes to `menu-app`, `demo-app`, `year-app`, `workshop-app`), layout, keys, view helpers |
| `src/content/es.js`, `en.js` (+ `year*.js`) | every string, in both languages; `year-case.es.js` / `year-case.en.js` hold the brief, the three facts and the four stories of each problem |
| `src/render/scenes/statement.js` | draws the P&L window (used by both modes), with a triangle on each row that moved |
| `src/render/palette.js`, `src/render/font.js` | the colours (with the three-tone ramps of each material) and the 6x10 font with descenders |
| `src/render/fx.js`, `src/render/year/art/` | drawing of the effects; the 12 problem scenes, one file each (`draw(g, t, mood)`) |
| `src/render/` | canvas drawing: font, factory, rooms, bosses, screens; `render/year/` for the year (`report.js` is the year-end report) |
| `tests/helpers/screen.js` | draws a screen on a recording canvas and reads its text back |
| `docs/arte/direccion-de-arte.md` | the art direction sheet: shapes, palette, light, detail, motion, moods |
| `build.js` | inlines everything into one self-contained HTML |
| `tools/` | `authoring/` (rewrite and audit the problems), `export-review.js` and the Python builders and rehearsals of the two Excel kits |
| `tests/content-tells.test.js`, `tests/helpers/tells.js` | the audit that keeps the answers from giving themselves away |

To change a number, a problem or a text, edit `src/year/` or `src/content/`, then `npm test`.
The balance tests in `tests/year-balance.test.js` check that a careful player reaches the top
endings, a shortcut-only player goes bankrupt, and a rescue can still reach double-digit OI.
`tests/fit.test.js` measures every long text against the window it is drawn in, in both languages.
When the balance moves, `tests/year-showcase.test.js` names the pinned year that changed.
