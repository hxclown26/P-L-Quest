# P&L Quest

A 16-bit style game, in one HTML file, that teaches two things: who controls each line of
the P&L, and how a decision ends up in OI. All data is fictional. Spanish and English.

| File | What it is |
|---|---|
| `pl-quest.html` | Demo 1: the 5-floor tutorial. A frozen copy, never rebuilt. |
| `pl-quest-demo2.html` | Demo 2, frozen as it was tested: the full year, the endings list and the group workshop. |
| `pl-quest-demo3.html` | **Demo 3**: the one to hand out. A P&L that reads like a finance report, a year-end report against the plan, a game code, and a menu with only the two ways to play. |

## Play

Open `pl-quest-demo3.html` (double click, no internet needed). Pick **Año completo** (the full
year, about 25 minutes) or **Tutorial** (5 floors, about 10 minutes). To compare players, send
the file and ask for a screenshot of the result screen.

| Key | Action |
|---|---|
| Up / Down (or W / S) | move down the list of answers (or the menu) |
| Enter / Space / Z | pick, continue |
| 0-9 | on the year intro: type a 4-digit **game code** (see below). Backspace erases a digit |
| N | tutorial: technical note. Year: the rules (two pages: rules and grades, then the model's assumptions; arrows turn the page) |
| Esc / X | back; during a game it asks before leaving |
| M | mute |
| L | switch language (ES / EN) |

Mouse and touch work too: tap an answer to select it, tap again to pick it.

## Reading the P&L

The statement on the left is laid out like a finance report. Figures are fictional, in
**US$ millions**, and the plan has sales of 100.

- Every line is shown in money, and under it (in blue italics) its **ratio**: the line as a
  percentage of sales. Sales are the base of every ratio, so they have none, and incentives are a
  small sub-line of sales that go without one, as in the report this follows.
- Deductions (Incentivos, Costo, Costo de servir, SG&A) are positive amounts; the results
  (Ventas, M. contribución, Gross Profit, OI) are in bold with a light band. A loss shows between
  brackets, `(5,0)`.
- The cascade: Ventas - Incentivos - Costo = **M. contribución**; - Costo de servir =
  **Gross Profit**; - SG&A = **OI**. OI is also a ratio (OI / sales) and the plan is 15%.
- After each answer the rows that moved are green (better) or red (worse), the numbers roll to
  their new value, and the change in OI floats up from its row in percentage points (pp).
- While you choose, the line the highlighted answer moves is marked with a gold band.
- The figures are annualized at the close of each month, not accumulated.

At the end of the year the **second page of the verdict** is the same statement as a report:
**Plan | Real | Var.**, with the variance read the way a report reads it (green when it helps the
business, red and between brackets when it hurts; ratios in points). That page, with the game code
in its corner, is the one to screenshot.

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
  both).
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
`?creator`, e.g. `file:///.../pl-quest-demo3.html?creator`:

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

`docs/screens/` holds the screenshots of every screen that matters (menu, intro with the game code,
a problem, a result, the month close, the rescue, the tutorial, both pages of the rules and, for
each of the six endings, its result and its P&L report). The guide itself, 19 slides that show the
six endings with their criteria, the P&L reading guide, the report for finance, the model's
assumptions, a 90-minute session plan and what is still missing, is a private slide deck:
https://claude.ai/artifact/HDHAEnjj2FCE21CsF76jbW (download it as PowerPoint or PDF from the page).

## Model assumptions (also on page 2 of the rules, key N)

- Everything is fictional. Sales are 100 at plan and OI is 15%.
- A price change moves sales and incentives; a volume change also moves cost and 60% of the cost
  to serve; SG&A is fixed.
- Every answer moves one line of the P&L; no line can go below zero in any simulated year (a test
  keeps it that way).
- The effects are game effects: they teach the logic of the P&L, they do not predict any company.

## Testing tips

- Play the full year twice: the problems, the months they fall in and the answer positions
  should differ. Type the same game code twice and they must not. The tutorial also deals the four
  cards of each turn in a new arrangement.
- In creator mode press **R** in the full year to see the hidden effect of each answer.
- To check the report page without playing 48 problems, use the endings list in creator mode and
  turn to the second page of each verdict.
- Rendering at a different size: the picture is 256x240 and is scaled by whole numbers; resize the
  window and it re-fits.

## Develop

```bash
npm test        # unit, UI-flow, render and smoke tests (node:test, no dependencies)
npm run build   # bundles src/ into pl-quest-demo3.html (the earlier demos are never touched)
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
| `src/ui/anim.js` | the motion of the screens as pure functions of time (rolling numbers, typing, fades) |
| `src/ui/` | UI state machines (`app.js` routes to `menu-app`, `demo-app`, `year-app`, `workshop-app`), layout, keys, view helpers |
| `src/content/es.js`, `en.js` (+ `year*.js`) | every string, in both languages |
| `src/render/scenes/statement.js` | draws the P&L window (used by both modes) |
| `src/render/` | canvas drawing: font, factory, rooms, bosses, screens; `render/year/` for the year (`report.js` is the year-end report) |
| `tests/helpers/screen.js` | draws a screen on a recording canvas and reads its text back |
| `build.js` | inlines everything into one self-contained HTML |

To change a number, a problem or a text, edit `src/year/` or `src/content/`, then `npm test`.
The balance tests in `tests/year-balance.test.js` check that a careful player reaches the top
endings, a shortcut-only player goes bankrupt, and a rescue can still reach double-digit OI.
`tests/fit.test.js` measures every long text against the window it is drawn in, in both languages.
When the balance moves, `tests/year-showcase.test.js` names the pinned year that changed.
