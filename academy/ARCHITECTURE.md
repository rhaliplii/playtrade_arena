# Profit.com Academy — architecture

Static site, built by Python, enhanced by plain JavaScript. Same approach as `trading_calculators/`.
No framework, no Node. Works from `http://` and from `file://`.

```
python3 academy/build/build.py            # validate content + locales, write every route
python3 academy/build/build.py --check    # validate only (CI)
python3 academy/build/build.py --pseudo   # also build the en-XA pseudo-locale (+35% text) under /xa/academy
```

## Folders

| Path | What |
|---|---|
| `academy/content/<locale>/paths/<path>.json` | Path: meta, chapter order, skills, finale (chapter summaries are synced from the chapter files at build time) |
| `academy/content/<locale>/chapters/<chapter>.json` | Chapter: meta, lesson order, Challenge (+ `retry` set), refresher (+ `plan` rows on the last chapter) |
| `academy/content/<locale>/lessons/<chapter>/<lesson>.json` | Lesson: list of typed cards |
| `academy/content/<locale>/glossary.json` | Terms |
| `academy/content/<locale>/onboarding.json` | Guest onboarding: the 5-question onboarding quiz (one per area: question, 3 options, answer, feedback ≤ 40 words, chapter, topic, visual) |
| `academy/content/schema/*.json` | JSON Schema for the files above (validated at build time) |
| `academy/locales/<locale>.json` | Every UI string. Components never hard-code text |
| `academy/build/` | `build.py` (entry), `lib.py` (shell, i18n, html helpers), `validate.py`, `pages/*.py` (one module per route) |
| `academy/static/css/` | `tokens.css` (the only place with colours), `base.css`, then one file per area |
| `academy/static/js/` | Plain scripts on the `window.AC` namespace (no modules: `file://` must work) |
| `academy/static/img/` | Rico poses, rank looks, path art (webp) |
| `academy/<route>/index.html` | **Generated.** Never edit by hand |
| `academy/backend/` | Server contract for what the prototype keeps in the browser: `001_certificates.sql`, `API.md` |
| `academy/content/demo/` | Demo data with no backend yet: `peers.json` (Top Learners, profiles), `certificates.json` (verify registry) |

`content/en` is the source language. A missing key or file in another locale falls back to English and is
reported by the build (never rendered as a raw key).

## Routes (spec sitemap)

| Route | Index | Rendered |
|---|---|---|
| `/academy` | yes | SSR guest state, JS swaps to "new" / "learning" |
| `/academy/paths` | yes | SSR |
| `/academy/learn-to-trade` | yes | SSR + progress islands |
| `/academy/learn-to-trade/<chapter>` | yes | the path page (SSR + progress islands) with that chapter open; own SEO |
| `/academy/learn-to-trade/<chapter>/<lesson>` | no | JS player, lesson JSON inlined |
| `/academy/learn-to-trade/<chapter>/challenge` | no | JS |
| `/academy/learn-to-trade/finish` | no | JS |
| `/academy/gym`, `/academy/gym/today` | no | JS |
| `/academy/placement`, `/academy/setup` | no | JS |
| `/academy/start` (onboarding quiz + its result), `/academy/welcome` | no | JS (guest onboarding, see below) |
| `/academy/how-it-works`, `/academy/glossary`, `/academy/glossary/<term>`, `/academy/guide`, `/academy/pro` | yes | SSR |
| `/academy/me`, `/me/rewards`, `/me/notes`, `/me/certificates`, `/academy/my-plan`, `/academy/leaderboard`, `/academy/settings`, `/academy/search` | no | JS |
| `/academy/u/<handle>` | no | JS (static host: `/academy/u/?h=<handle>`) |
| `/academy/verify/<ID>` | no (never in the sitemap) | JS, public, own minimal shell (static host: `/academy/verify/?id=<ID>`; see Certificates) |

Locale prefix: English at `/academy`, other locales at `/<locale>/academy` (configured in `build/lib.py`).

## Rules for components

1. **No hex values** outside `tokens.css`. Use `var(--ac-*)` tokens only.
2. **No hard-coded strings.** Python: `t("key", n=3)`. JS: `AC.t("key", {n: 3})`. Keys live in `locales/en.json`.
3. **Numbers, money and dates** go through `AC.fmt.num / money / date` (JS) and `fmt_num / fmt_money / fmt_date` (Python), which use the locale.
4. **Text can grow 35%.** No fixed widths on buttons, chips or labels; let them wrap or grow. Check with `--pseudo`.
5. **Accessibility:** real `<button>`/`<a>`, touch targets ≥ 44px, contrast ≥ 4.5:1, visible focus, `prefers-reduced-motion` respected.
6. **Rico** is an `<img>` with a pose from `AC.rico(pose)` / `rico(pose)`; never text inside images.
7. **Classes** are BEM-ish with the `ac-` prefix (`ac-card`, `ac-card__title`, `ac-btn--primary`).

## Services (swap for Profit.com in production)

All learner data goes through `AC.progress` (the progress engine). In this build it runs in the browser and
stores to `localStorage` through `AC.store`; on Profit.com the same calls go to the server, which becomes the
source of truth. XP is **computed by the engine from answers**, never sent by the UI.

| Service | File | Production replacement |
|---|---|---|
| `AC.store` | `js/store.js` | Profit.com API |
| `AC.auth` | `js/services.js` | Profit.com auth (guest ↔ member, sign-up merges guest progress) |
| `AC.gsearch` | `js/gsearch.js` | The top bar's search panel (Figma "Global search"): platform tabs plus an Academy tab, selected first; Academy results from `static/data/search-index.js` (written by the build from the `/search` index; `window.AC_SEARCH_INDEX`), loaded as a script on first open so it works on file:// too; Enter or "See all" opens `/academy/search` |
| `AC.certs` | `js/certs.js` | Certificates API (`backend/API.md`): issued by the server on path finish, public lookup |
| `AC.wallet` | `js/services.js` | Profit Coins wallet |
| `AC.analytics` | `js/services.js` | Profit.com analytics (`dataLayer`) |

Analytics events: `lesson_start`, `card_answer`, `lesson_complete`, `challenge_start`, `challenge_pass`,
`challenge_fail`, `gym_session`, `signup_from_academy`, `streak_day`.

## Chapter content is the source of truth

- **Availability:** a chapter is available as soon as `chapters/<id>.json` and every lesson file it lists exist
  (`lib.mark_available`, run whenever a path file is loaded). No `available` flag to flip.
- **Path summary:** for an available chapter the build overwrites the path entry's `title`, `short`, `promise`,
  `minutes` and `lessons` (lesson titles) from the chapter and lesson files
  (`lib.sync_chapter`), and recomputes the path's `hours` (to the half hour) and maximum `xp` (`lib.sync_path_totals`).
  `catalog.json`'s card for the path takes `chapters`, `lessons`, `hours`, `xp` from the synced path (`Ctx._sync_catalog`).
  Path page (and the chapter routes), home, All paths, certificates, How it works, search and the sitemap all read these.
- **Chapter fields** (see `chapter.schema.json`): `challenge.questions[]` and `challenge.retry[]` (a second set shown on
  a retake after a fail; same order: one question per lesson), each question may carry `visual` (a visual object, e.g.
  candles) and `work` (the worked numbers shown after answering). The path's last chapter also has `plan[]`: five
  `{label, value}` rows, in lesson order (the My Trading Plan sections; see below).
- **No chapter Bonus.** The per-chapter "Level Up / Bonus" step (tool hand-off, +75 XP) was removed on the owner's
  request. A chapter is lessons + Chapter Challenge; the path pays at most 7,600 XP (55 × 90 + 10 perfect Challenges
  + the 500 XP finale) and 1,000 Profit Coins. Records saved earlier may still carry `levelUp` / `levelUpXp` /
  `levelUpOpened` on a chapter and `src: "levelup"` history rows: they load as before and the XP already earned stays
  in the total, but nothing reads or awards them any more.

## Guest onboarding (canvas Onb-01…06)

`build/pages/start.py`, `js/onboarding.js`, `css/onboarding.css`, strings `locales/en/onboarding.json`, questions
`content/en/onboarding.json` (schema `onboarding.schema.json`).

- **Guest home hero:** always "Take the quiz" → `/academy/start` + "Start learning free" → the Trading Foundations path page (the sticky phone bar mirrors
  the first; the "Ready when you are" card has its own "Sign up free": the sign-up sheet, then Lesson 1). The quiz page opens where the guest is: question 1, the next
  question, or the saved result with the sign-up buttons. Members never see the guest hero or the quiz.
- **`/academy/start`:** 5 questions, one per screen (the shared player frame), tapping an option answers it; feedback
  right away (right: "Good call · +10 XP"; not right: the idea + "You'll learn this in Chapter N"; only the learner's pick
  is marked, the right option is never shown). Exit asks first; answers are kept and the next visit resumes. Finished →
  the result (a state of the same route: a finished quiz always reopens on it): score, 5 topics with their chapter,
  XP "waiting", Continue with Google / Apple (prototype: an instant demo sign-in, no OAuth), Use email instead (the
  sign-up sheet), Not now.
- **Data:** `rec.onboarding = {answers:[{pick, correct}], done, d, credited, creditedXp}` on the
  progress record (guests: the `guest` / `preview-guest` record; once per device as a guest, once per account).
  `AC.auth` `startSession` merges the guest record into a new account (or, for an account that already has progress and
  never took the quiz, `onbAdopt` moves just this result over) and calls `onbCredit`: 10 XP per right answer +
  the one-time welcome bonus (`ONB.welcome`, 20), history `src: "onboarding" / "welcome"`, Day 1 streak (today counts
  as met). This XP is never lesson, Chapter or path XP (the path maximum stays 7,600). `reset()` keeps the result.
- **`/academy/welcome`:** after sign-up only: greeting (first name; none → "Welcome! You're in."), the saved result and
  bonus, level, Day 1 streak, the 10 chapters with the five the questions came from highlighted, Start Lesson 1 (the
  path's first lesson, its own unchanged "Hi, I'm Rico" intro) and See the full path, whatever the score: Chapter 1
  can't be skipped.

## Path page and chapter routes (one merged page)

There is no separate chapter page. `/academy/learn-to-trade` and every `/academy/learn-to-trade/<chapter>` render the same
merged path page (`build/pages/path.py` `merged_body`; canvas-path Path1-Final-D / Path1-Final-M / Path1-State-*): hero,
every chapter as an accordion (lessons + Chapter Challenge), side column (rank or save, finish-and-earn, practice tool,
Key terms). `build/pages/chapter.py` only calls `merged_body(ctx, L, base, open_id=<chapter>)` and adds the chapter's
title, description, canonical, breadcrumb (`… / Trading Foundations / Chapter N`; BreadcrumbList Academy › Paths ›
Trading Foundations › chapter) and Course + ItemList JSON-LD; the chapter title is the h1. `data-open` on `.ac-pm` tells
`learn-pages.js` `pathPage()` which chapter to open (desktop: expanded) and scroll into view below the sticky topnav
(phones: the full-scroll path at that chapter). Every "Back to chapter", "Start Chapter N", "Go to Chapter N" link points
at the chapter route, so it lands on the merged page with that chapter open.

## My Trading Plan (5 sections)

The plan has five sections, one per lesson of the path's last chapter (Building Your Trading Plan):
`style` (L1) · `entry` (L2) · `risk` (L3, exit and risk) · `checklist` (L4) · `review` (L5). Keys are fixed (they are
stored); labels and defaults come from that chapter's `plan` rows (in lesson order) and reach the browser as
`#ac-index.plan = {chapter, n, sections:[{key, label, value, lesson}]}` (`Ctx.plan`).

- Finishing a section's lesson (or testing the chapter out) fills it with `value` unless the learner already wrote it
  or cleared it (`rec.planAuto` remembers which ones were filled by a lesson). Replays never overwrite.
- Records saved with the old 8-field plan (style, markets, setup, stop, target, risk, limits, checklist) migrate on load:
  style + markets → style, setup → entry, stop + target + risk + limits → risk, checklist → checklist (joined with " · ";
  the old object is kept in `rec.planV1`; `rec.planV = 2`).
- `/academy/my-plan` edits the sections and has **Save my plan**; after a save it links to the finale ("Finish the path")
  when it is ready. The Chapter 10 Challenge passed screen links here ("Review My Trading Plan") next to "Finish the path".
- The finale (`/learn-to-trade/finish`) needs every Chapter Challenge passed or tested out **and** all five sections
  with text (auto-filled counts).

## Lesson card JSON

See `content/schema/lesson.schema.json`. Card order is fixed:
`call` → 1–5 learn cards (`learn`, `walkthrough`, `trap`, `myth`, `pro`) → `exercise` → `check` → `keep`.
Exactly three scored questions (`call`, `exercise`, `check`). Inline text markup allowed in `text` fields:
`**bold**`, `[[term-id|shown text]]` (glossary pop), `{up}…{/up}` and `{down}…{/down}` (colour words).
Visuals are data: `{"kind": "<visual kind>", ...}` rendered by `js/visuals.js`.

## Engine API (`AC.progress`)

| Call | Returns / does |
|---|---|
| `summary()` | `{level:{level, rank, progress, levelFrom, levelTo, nextRank, nextRankAt}, xp, monthXp, coins, streak, bestStreak, freezes, streakLost, goal:{target, done, met, kind}, lessonsDone, gymDue, started, onboarded}` |
| `stats()` | `{played, firstTry, firstTryPct, gymSessions}`: lessons finished by playing (tested-out ones excluded), their first-try rights and rate, every Gym session (not days) |
| `state()` | the full record (lessons, chapters, gym, notes, answers, plan, certificates, history, settings) |
| `lesson(id)` / `chapter(id)` | saved state of one lesson / chapter |
| `startLesson(id, {chapter})`, `saveCard(id, i)` | resume support (progress saved after every card) |
| `answer(id, "call"\|"exercise"\|"check", correct, idea)` | `{firstTry, xp}`; a first-try miss adds the idea to Rico's Gym |
| `completeLesson(id, {chapter, keep:[3 lines]})` | `{xp (awarded now), totalXp, levelReached?, rankUp?, goalMet?, streak, firstTryRight, plan, …summary}`; saves the 3 takeaways to notes; fills the lesson's plan section (`plan` = `planSection(id)`). Every action result has `xp`/`coins` = awarded by that action and `totalXp`/`totalCoins` = lifetime |
| `startChallenge(ch)`, `submitChallenge(ch, [{lesson, correct, idea}])` | `{passed, right, total, missed, xp, coins, totalCoins, firstPass, full, everFailed, attempt, …summary}`: `coins` = +50 on the first pass only; `full` = the pass's value before the retry halving |
| `testOut(ch)` | placement: marks a chapter passed |
| `chapterXp(ch)` | `{lessons, challenge, total}`: XP the chapter actually paid |
| `gymQueue()` / `gymIdeas()` / `gymAnswer(idea, ok)` / `completeGym(n)` | at most 5 due ideas; +30 XP a session |
| `addAnswer(lesson, q, text)`, `settings(patch)`, `setOnboarded(goal)`, `setPlacement(r)` | notes, settings |
| `plan()` | `{sections:[{key, n, label, value, fallback, lesson, done, auto, filled}], filled, total, complete, saved, chapter}` |
| `planSection(lessonId)` | `{n, total: 5, title, key}` for a Chapter 10 lesson, else `null` ("Added to My Trading Plan · Section n of 5") |
| `setPlan(key, value)`, `savePlan({key: text})` | edit one section / save all (trimmed; sets `saved`) |
| `finishStatus(chapterIds?)` | `{challenges, total, plan, planTotal, ready}` |
| `finishPath(path, chapterIds)` | when `finishStatus().ready`: +500 XP, +500 Profit Coins, certificate (once, through `AC.certs.issue`, with the learner's name now); `{ok, xp, coins, certificate: {path, id, d, name}, rankUp?, …}` |
| `levelOf(xp)`, `levelStart(lv)`, `RANKS`, `XP`, `COINS` | rank maths for How it works / My progress; `COINS = {challenge: 50, path: 500}` |
| `seedDemo(lessonIds, chapterIds)` | a mid-path learner for `?as=member` previews |
| `onboarding()`, `onbAnswer(i, pick, correct)`, `onbFinish()`, `onbCredit()`, `onbAdopt(from)`, `ONB` | guest onboarding (see Guest onboarding) |

Several tabs can hold the same record (e.g. My Trading Plan open next to a lesson). Every save stamps the
record with a new `rev` (also kept under a small `rev_<account>` key, `AC.store.rev`); the engine re-reads storage
before any read or write when the stored rev differs from its own, and on the `storage` event, so a change made in
another tab is never overwritten by a stale copy.

Page conventions: `[data-show="guest|new|learning|member"]` blocks are toggled by `shell.js`; `[data-bind="xp|month-xp|coins|level|rank|streak|goal-done|goal-target|gym-due|name|level-to-go"]` get live values; `[data-bind-width="level|goal"]` progress bars; `[data-action=signup]` opens the sign-up sheet. Page scripts register with `AC.ready(fn)`.

## Certificates

One template for every path: `static/js/cert.js` (`AC.cert`) + `static/css/cert.css` (canvas Certificate-Design,
Certificate-Pro). It is shown on the certificates page, the finale, the verify page and (as a link) the public profile.

- **Template:** a 1200 × 848 design canvas (A4 landscape ratio) that scales to its container: `.ac-cert` is an
  inline-size container and every size is `N × --u` (`--u: calc(100cqw / 1200)`). Montserrat only. Free paths: green
  (`--ac-cert-green` / `-ink`); Pro paths: violet (`--ac-cert-violet` / `-ink`) and a "PRO PATH" pill. The seal
  (PROFIT.COM ACADEMY · CERTIFIED COMPLETION, the Profit mark) is the same on every path, coloured by the accent. Paper
  colours are fixed (both themes). It shows the holder's name only (no signature, no other person, no company name).
  Summary line: free = lessons · Chapter Challenges · Personal trading plan; Pro = lessons · Chapter Challenges ·
  `{certLevel}` level (catalog `certLevel`, by default the end of the `level` range). Dates: `AC.fmt.date` (US: Mar 12, 2027).
- **Data:** `AC.cert.model({id, name, path, d})` + the path's facts, inlined by the build as `#ac-certpaths`
  (`build/pages/certificates.py cert_paths`: title, tier, lessons, chapter names, level, prefix).
- **ID** `PREFIX-XXXX-XXXX` (`AC.certs`): prefix per path (`catalog.json certPrefix`, also in `#ac-index.certPrefix`),
  8 characters from `23456789ABCDEFGHJKMNPQRSTUVWXYZ` (no 0/O/1/I/L), regenerated on a collision with the registry.
  `finishPath` issues it (`AC.certs.issue({path, userId, name})`) and keeps `{path, id, d, name}` in the record; the
  name is a snapshot. Records with the old random `LTR-xxxx-xxxx` IDs are re-issued once on load (path prefix, same
  date, current name; the old ID stays in `oldId`).
- **Registry (prototype):** `AC.store` key `cert_registry` (certificates issued on this device) + the demo registry
  `content/demo/certificates.json` (inlined as `#ac-cert-seed` on the verify, certificates and finale pages), so the
  verify page works for everyone locally (TF-7K2Q-9D4M free, TA-3M8V-6P7X Pro). Production: `backend/`.
- **Lookup:** trim, uppercase, strip spaces and dashes, then an **exact** match on that canonical form. Never a
  partial match.
- **Verify URL:** `https://www.profit.com/academy/verify/<ID>` (`AC.certs.verifyUrl`, built from one constant in
  `certs.js`) is what the QR code, LinkedIn and share links carry. Links on the pages use `AC.certs.pageUrl` (the
  built page, `verify/index.html?id=<ID>`, off profit.com; the public address on it). The page reads `?id=` or the
  path after `/verify/`, so the server needs one rewrite (or a 301):
  `/academy/verify/<ID>` → `/academy/verify/index.html?id=<ID>` (no trailing slash after the ID, so the page's
  relative `../static/` links resolve).
- **Verify page** (`build/pages/verify.py`, `js/verify.js`, `css/verify.css`): `noindex, nofollow`, not in the sitemap,
  its own shell (logo · ACADEMY, Start learning free; no side nav). States: search (no ID), verified (banner,
  certificate, facts, what it took, earn-it CTA, copy link), not found. `<title>` and description follow the state.
  Its footer line is the only place the operator (Darqube Ltd) is named.
- **QR:** `static/js/vendor/qrcode.js` (Kazuhiko Arase, MIT), rendered as an inline SVG path in `--ac-paper-ink`.
- **PDF:** `AC.cert.print(m)` adds a print-only copy of the certificate and calls `window.print()`; `cert.css`
  `@media print` + `@page { size: A4 landscape; margin: 0 }` prints just that, one page.
- **Share image:** `AC.cert.shareImage(m)` draws the 1200 × 627 image (gradient, logo, headline, CTA pill, the tilted
  certificate, Rico) with Canvas 2D from the same data and tokens (no html2canvas); `downloadShare` saves the PNG and
  `share` passes it to `AC.share({image, url: verify URL})`. LinkedIn: `AC.cert.linkedIn(m)` (Add to profile with
  `organizationName`, `issueYear`, `issueMonth`, `certId`, `certUrl`).
- Strings: `locales/en/cert.json` (the certificate and its actions), `locales/en/verify.json` (the verify page).
