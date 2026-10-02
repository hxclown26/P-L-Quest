# P&L Quest

A 16-bit style game, in one HTML file, that teaches two things: who controls each line of
the P&L, and how a decision ends up in OI. All data is fictional. Spanish and English.

**Play it online:** https://hxclown26.github.io/P-L-Quest/ (the link opens Demo 5, the published build;
Demo 4 stays at https://hxclown26.github.io/P-L-Quest/pl-quest-demo4.html and Demo 3 at
https://hxclown26.github.io/P-L-Quest/pl-quest-demo3.html). In creator mode:
https://hxclown26.github.io/P-L-Quest/?creator

| File | What it is |
|---|---|
| `pl-quest.html` | Demo 1: the 5-floor tutorial. A frozen copy, never rebuilt. |
| `pl-quest-demo2.html` | Demo 2, frozen as it was tested: the full year, the endings list and the group workshop. |
| `pl-quest-demo3.html` | Demo 3, frozen (the build that was published first): a P&L that reads like a finance report, a year-end report against the plan, a game code, and a menu with only the two ways to play. |
| `pl-quest-demo4.html` | Demo 4, frozen: the build the review and pilot kits were written against. Net sales and separate Freight and Direct Chg lines in the P&L, honest model assumptions, 48 rewritten problems whose answers do not give themselves away, and the kits to review and measure it (see "Domain review and pilot"). Game codes and result codes of earlier demos do not work in it. |
| `pl-quest-demo5.html` | **Demo 5, the final one**: Demo 4 with a visual pass and nothing else. Same rules, numbers, problems and game codes; new type, art, effects and a calm mode (see "Look and feel"). |

## Play

Open the link above, or `pl-quest-demo5.html` (double click, no internet needed). Pick **Año completo** (the full
year, about 40 minutes), **Medio año** (six months at double pace, about 20 minutes) or **Tutorial**
(5 floors, about 10 minutes). The times are estimates from the amount of text a year has; the game
measures the real one and shows it at the end of every game. To compare players, send the link (or
the file) and ask for a screenshot of the result screen.

| Key | Action |
|---|---|
| Up / Down (or W / S) | move down the list of answers (or the menu) |
| Enter / Space / Z | pick, continue |
| 0-9 | on the year intro: type a 4-digit **game code** (see below). Backspace erases a digit |
| N | tutorial: technical note. Year: the rules (two pages: rules and grades, then the model's assumptions; arrows turn the page) |
| Esc / X | back; during a game it asks before leaving |
| M | mute |
| L | switch language (ES / EN) |
| E | calm mode: no screen shake, flashes or particles (it starts on when the system asks for reduced motion) |

Mouse and touch work too: tap an answer to select it, tap again to pick it.

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
  and the change in OI floats up from its row in percentage points (pp).
- While you choose, the line the highlighted answer moves is marked with a gold band.
- The figures are annualized at the close of each month, not accumulated.

At the end of the year the **second page of the verdict** is the same statement as a report:
**Plan | Real | Var.**, with the variance read the way a report reads it (green when it helps the
business, red and between brackets when it hurts; ratios in points). That page, with the game code
in its corner, is the one to screenshot.

## Look and feel (Demo 5)

Demo 5 changes what you see and feel, nothing else: `src/year/`, `src/rng.js`, `src/engine.js` and
`src/model.js` are byte for byte those of Demo 4, so the rules, the numbers, the 48 problems and the
game codes are the same (a code gives the same year in both). The only new texts are the two
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
month later and the rescue plan lasts until month 4. The grades and their thresholds are the same,
so a half year earns the same endings: an expert closes it excellent, the shortcut and doing nothing
end in bankruptcy, giving in to everyone is terrible (`tests/year-balance.test.js` checks it). It does
not count for "Mejor año", and the group workshop and the endings list stay with the full year.

The **play time** (mm:ss, from the first problem to the verdict, rules included) shows on the first
page of the result next to the plan. It is how a pilot measures the length of a game without timing
each player.

## The full year in one minute

- 12 months, 4 problems per month: **client, plant, environment, strategy**. Each problem has
  four answers and you only see which P&L line each one moves, not what it does to the meters.
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
  both). Each answer shows only the P&L line it moves (no arrow): the direction shows after
  choosing, in the numbers that roll.
- A zero in OI or in a meter triggers a one-time **rescue plan** (up to month 9): a stressed
  P&L with OI 2% and a goal of OI 10% or more (double digit). A second zero, or a zero from month 10, is bankruptcy.
- The result is the lower of the OI grade and the weakest-meter grade; a rescue caps it at "fair".

| Ending | OI margin at least | Weakest meter at least |
|---|---|---|
| Excellent year | 21.5% | 55 |
| Good year | 17% | 45 |
| Fair year | 13% | 36 |
| Bad year | 8% | 24 |
| Terrible year | anything below | |
| Bankruptcy | a second zero, or a zero after month 9 | |

After the result come three pages (the numbers and the OI margin bridge from plan to real by P&L
line; the P&L report against the plan; what happened and what to try next), then GAME OVER, and the
game restarts at the menu.

## Creator mode

The endings list, the group workshop and the reviewer are tools for whoever runs the session, so a
player who is handed the file never sees them. They open when the address of the page ends in
`?creator`, e.g. `file:///.../pl-quest-demo5.html?creator`:

- **Ver los 6 finales** plays a pinned simulated year for each play style, so you can read every
  result screen in a minute. Those years never count as your best year, and they always use the
  same fixed order. (They are also written up in the creator's guide.)
- **Taller en grupo** is the group workshop of Demo 2, kept as it was: a team types its name and a
  game code, plays that year, and gets a **result code** (`NOMBRE/XXXX-XXXX-...`, with a check that
  catches any mistyped character; **C** copies it). The facilitator pastes the codes of all teams in
  **Ranking de equipos**, which replays each year and compares them. It is not offered to players;
  for a competition a game code and a screenshot of the result are enough.
- **R** switches the reviewer: under each answer it shows its hidden character (balanced,
  shortcut, give in, passive) and its effect on OI and the three meters. Use it to judge whether a
  wording is ambiguous; it would give the game away to a player.

## Creator's guide

`docs/screens/` holds the screenshots (taken from Demo 5) of every screen that matters (menu, intro with the game code,
a problem, a result, the month close, the rescue, the tutorial, both pages of the rules and, for
each of the six endings, its result and its P&L report), plus the half year (`half_intro.png`, `half_close.png`)
and the result with its play time (`verdict_time.png`). The guide itself, 23 slides that show the
six endings with their criteria, the P&L reading guide, the report for finance, the model's
assumptions, how the answers are kept from giving themselves away, the pilot and the domain review,
what Demo 5 changed, a 90-minute session plan and what is still missing, is a private slide deck:
https://claude.ai/artifact/HDHAEnjj2FCE21CsF76jbW (download it as PowerPoint or PDF from the page).

## Domain review and pilot (Demo 4)

Two kits, both outside the game, to take it from "built" to "trusted":

| Path | What |
|---|---|
| `docs/revision/revision-dominio.xlsx` | The review sheet for two people of the business (about an hour each): the 192 answers in Spanish and English, with the line the game says each one moves. They mark realistic (yes / no / ambiguous), the right P&L line and a comment; the Summary sheet computes whether it passes (90% realistic, no line left in dispute). Rebuild it with `node tools/export-review.js \| python3 tools/make_review_xlsx.py docs/revision/revision-dominio.xlsx`. |
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
- **Full year:** every answer moves one line of the P&L, by a fixed amount set by its type and the
  size of the problem; there is no price or volume mechanic. No line can go below zero in any
  simulated year (a test keeps it that way).
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
npm run build   # bundles src/ into pl-quest-demo5.html (the earlier demos are never touched)
```

Where things live:

| Path | What |
|---|---|
| `src/model.js` | the P&L model, base numbers (`BASE_PL`) and ratios (`operatingMargin`, `ratioOf`) |
| `src/rng.js` | the seeded random generator behind every shuffle, and the 4-digit game codes |
| `src/engine.js` | tutorial state machine, stars, thresholds |
| `src/content/cards.js`, `floors.js` | tutorial cards, effects, hands per turn, shocks |
| `src/year/rules.js` | year rules: meters, decay, crisis, rescue, grading |
| `src/year/archetypes.js` | what each of the four kinds of answer does |
| `src/year/problems.js` | the 48 problems: meter at stake, size, P&L line per answer, calendar window |
| `src/year/schedule.js` | the shuffled order of a year (problems, voices and answers) from one seed |
| `src/year/engine.js` | year state machine (problem, result, month close, rescue, verdict) |
| `src/year/simulate.js`, `showcase.js` | simulated players; the pinned years of the endings list |
| `src/year/feedback.js` | the OI bridge and the coaching text of the verdict |
| `src/year/replay.js`, `result-code.js`, `standings.js` | the group workshop: replay, result code, ranking |
| `src/ui/statement.js` | the P&L as a report: rows (money and ratio), changes, the plan-real-variance report |
| `src/ui/anim.js` | the motion of the screens as pure functions of time (rolling numbers, typing, fades, growing bars, bounces) |
| `src/ui/fx.js`, `src/ui/screen-fx.js` | the feedback layer as pure functions of time and a seed: sizes (small, medium, large), shake, flash, particles, weather, and the plan each screen takes from the state of the game (calm mode turns them all off) |
| `src/ui/` | UI state machines (`app.js` routes to `menu-app`, `demo-app`, `year-app`, `workshop-app`), layout, keys, view helpers |
| `src/content/es.js`, `en.js` (+ `year*.js`) | every string, in both languages |
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
