# Trading Foundations, Chapters 2–10: build report

Oct 30, 2026. Source of truth: the design canvas, page "Path 1 · Lessons". The boards are copied into `academy/_source/canvas-p1/project/` (252 files).

**Change after the report:** chapter Bonuses (the per-chapter Level Up step) were removed on the owner's request; the path maximum is now 7,600 XP (1,000 Profit Coins unchanged).

**Change after the report:** the standalone chapter pages were removed; each chapter URL (`/academy/learn-to-trade/<chapter>/`) opens the merged path page with that chapter open and in view (own title, description, canonical, breadcrumb and JSON-LD kept).

Nothing is committed or pushed. A backup of the repo state before this work is in the session scratchpad (`backup-before-ch3-10.tgz`).

## Summary

- **Status:** Trading Foundations is complete. That is 10 chapters, 55 lessons, 10 Chapter Challenges and the path finale with its certificate.
- **Full replay:** a fresh account played the whole path through the real UI. Every answer was right first time, plus all 10 Challenges and the finale.
- **Totals:** it ended at exactly **7,600 XP and 1,000 Profit Coins**, the totals the rules predict, with **0 failures and 0 errors**. This was re-run after the Bonuses were removed.
- **Tests:** engine tests **ALL PASS (129)**, up from 59 (Bonus tests replaced by a full-path 7,600 XP check and a saved-Bonus-XP load check).
- **Crawl:** all **208 pages** (218 before the Bonus routes were removed). The original crawl covered guest, new, member and Pro at 390 and 1440 wide; the re-crawl after the removal (guest and mid-path member, 390 and 1440) showed **0 JS errors, 0 404s**, no sideways scroll and no Bonus text or links.

## 1. What was built

### Content
| Ch | Chapter | Lessons | Challenge | Retry set | Minutes |
|---|---|---|---|---|---|
| 1 | How Markets Actually Work | 4 | 4 q | – | 16 |
| 2 | Orders, Leverage & the Mechanics | 5 | 5 q | 5 q | 24 |
| 3 | Reading Charts | 5 | 5 q | 5 q | 25 |
| 4 | Trends, Patterns & Indicators | 8 | 8 q | 8 q | 40 |
| 5 | Risk Management: The Real Edge | 6 | 6 q | 6 q | 30 |
| 6 | Trading Psychology | 5 | 5 q | 5 q | 25 |
| 7 | Company Fundamentals | 5 | 5 q | 5 q | 25 |
| 8 | Markets & the Economy | 5 | 5 q | 5 q | 25 |
| 9 | Building a Portfolio | 7 | 7 q | 7 q | 35 |
| 10 | Building Your Trading Plan | 5 | 5 q | 5 q | 25 |

- **Lessons:** each lesson follows the boards' card order: Rico's Call → Rico says → walkthrough → Pro Move / Rico's warning / Myth → Try it → Quick check → lesson complete with Keep notes. Each has exactly 3 scored questions.
- **Copy:** text, numbers and "The working" lines are copied from the boards.
- **Shared reference data:**
  - The glossary grew to 106 terms, linked from the lessons.
  - 168 Rico's Gym ideas, one per scored question.
- **Chapter extras:** each chapter has its unlock lines, key terms, guide pages and a refresher per idea.
- **Path data:** path and catalog data are now generated from the chapter files, so titles, counts and minutes can't drift. The path shows 55 lessons and about 4.5 hours.

### Components (reusable, built from JSON numbers; no chart images)
- **22 new visual types:**
  - Charts: `series`, `trades`, `barchart`, `hbars`, `split`, `donut`, `table`, `gauge`, `cycle`, `units`, `rr`, `calendar`, `candle`, `shapes`.
  - Text and layout: `headline`, `list`, `checklist`, `planbar`, `stats`, `formula`, `tabs`.
  - Interactive: `drawline`.
- **`candles` extended** with:
  - waypoint paths;
  - volume bars with an average;
  - moving averages;
  - trendlines and channels;
  - swing labels;
  - event lines;
  - faded candles;
  - indicator panels (RSI with 30/70 bands, MACD with line, signal and histogram).
- **New exercise types:** `point` (tap the candle), `order` (put in order), `line` (drag a stop or trendline). Answer options can also be small candle glyphs.
- **Card features:**
  - toned note boxes: red, gold, green, sky;
  - the myth card's gold "Rule:" box, with an optional visual;
  - a red note on Rico's warning cards;
  - a 2×2 grid for short numeric answers;
  - the boards' eyebrow labels ("Rico says", "Rico walks you through it · …", "Rico's warning").
- **Catalog:** every type is documented with its JSON fields and examples in `_source/VISUALS.md`. A test page renders all 49 types: `build/tests/visuals.html`.

### Flows and rules
- **XP:** +60 per lesson, +10 for each first-try right answer (up to 90). A replay pays 0.
- **Challenge:**
  - One question per lesson, 30 XP per right answer, +50 for a perfect score.
  - You pass with at most one wrong answer. A pass after a fail pays half.
  - **+50 Profit Coins on the first pass of each Challenge.** This rule is new in the engine.
- **Finale:** Chapter 10 → "Finish the path" → certificate, +500 XP and +500 coins. The finale needs all 10 Challenges passed and the 5 plan sections filled.
- **Gates:**
  - Lessons open in order.
  - A chapter opens after the previous Challenge is passed.
  - The Challenge opens after the chapter's last lesson.
  - Opening a locked page by its address shows a "Not open yet" screen.
- **Rico's Gym:** every wrong answer saves its idea there.
- **Interaction:**
  - Answer → feedback flip with "Good call +10 XP" or "Not quite".
  - XP pop, segmented progress bar, tap-to-reveal walkthroughs and charts that draw in.
  - Coin and confetti burst on a Challenge pass and the finale.
  - Every animation lasts 300 ms or less, and none run with reduced motion (system setting or Settings › Reduce motion).
- **Completion screens:** XP rows, level bar, streak, daily goal and coins are all read from the engine result. Rank-up to Analyst happens at Level 6 / 1,000 XP. A "Level up!" cue shows on lesson and Challenge screens.
- **Chapter pages:** ~~every chapter page follows the Ch2 board~~ (removed after the report: chapter URLs now open the merged path page with that chapter open).
- **My Trading Plan:** the plan is now the **5 sections Chapter 10 teaches**: Style, Entry, Exit & risk, Checklist, Review.
  - Each section fills itself in when you finish its lesson, and the lesson-complete screen says "Added to My Trading Plan · Section N of 5 · Open plan".
  - My Trading Plan edits and saves the plan; the Chapter 10 Challenge passed screen links to it next to "Finish the path".
  - Old 8-field plans are carried over automatically.

## 2. Flows tested and results

Four separate testers drove the real UI with Playwright and Chrome, at 390×844 (touch) and 1440×900. Their logs are in the scratchpad under `p4/` and `p6/`.

| Flow | Width | Result | Evidence |
|---|---|---|---|
| Guest plays Lesson 1 → sign-up popup on Lesson 2 → sign up mid-path → setup → back to the path | both | PASS | 90 XP and the 1-day streak carried into the new account |
| Every lesson of Ch1–3, odd lessons all right, even lessons with misses | desktop | PASS | 13 lessons, each +60 +10×first-try; screens equal the engine |
| Every lesson of Ch4–6, mixed answers, every tap / drag / Play | mobile | PASS | +640, +480, +390 |
| Every lesson of Ch7–9, mixed answers | desktop | PASS | +90 / +70 per lesson, matching the engine |
| All 131 cards of Ch4–6 opened | desktop | PASS | no overflow, no errors |
| Challenge, perfect (Ch1, Ch4, Ch7) | both | PASS | 30n + 50, +50 coins, confetti, next chapter opens |
| Challenge fail → not passed yet → refresher → retry with new questions → pass (Ch2, Ch5, Ch8) | both | PASS | e.g. Ch5: 0 XP on the fail, then +180 +50 −115 = **+115**, +50 coins |
| Challenge, one miss (Ch3, Ch6, Ch9) | both | PASS | 30 × right, no perfect bonus, +50 coins |
| Retaking a passed Challenge | both | PASS | 0 XP, 0 coins, no confetti, no "newly unlocked" message |
| Gates by direct address (lesson out of order, early Challenge, next chapter) | both | PASS | "Not open yet" screen with the right button |
| Rico's Gym: misses saved, one session +30 XP per day | desktop | PASS | 16 ideas saved; second session pays 0 |
| Rank-up to Analyst at Level 6 | both | PASS | fired only on the step crossing 1,000 XP; share sheet works |
| Replaying a finished lesson | both | PASS | +0, "Review · no XP the second time" |
| **Whole path, every answer right, all Challenges perfect, finale** | desktop | **PASS** | **7,600 XP** (4,950 lessons + 2,150 Challenges + 500 finale), **1,000 coins** |
| Chapter 10: plan fills 0 → 5 of 5, plan edit on My Trading Plan, finish, certificate | both | PASS | after the fix: an edit made in another tab is kept |
| After finishing: home, path page, Ch10 page, All paths, Certificates | both | PASS | "Completed", "View certificate" |
| Reduced motion (system and app setting) | both | PASS | 0 running animations, no confetti |
| Totals agree on home, path page, chapter pages, My progress, leaderboard row, Rewards | both | PASS | |
| Crawl of all 218 pages × 4 states × 2 widths | both | PASS | 0 errors, 0 failed requests |
| Engine tests (XP maths, Challenge maths for 4–8 questions, coins, finale, 10-chapter gating, rank-up, plan, cross-tab saves, stats) | – | **ALL PASS (129)** | `build/tests/engine.html` |

## 3. Differences from the design, and why

1. **Copy the boards don't show was written to match.** The boards show feedback for the right answer and one wrong answer per question, so feedback for the other options was written in the same voice: 40 words or fewer, never naming the answer. The same applies to:
   - Challenge "why" lines, except the one question each board shows;
   - most refreshers;
   - every **retry question set**, since the boards show "Retry with new questions" but not the questions;
   - lesson descriptions, unlock lines, and tap notes for "tap a row / bar" walkthroughs.

   Files mark these with an `added` field.
2. **No Rico picture on Pro Move or Quick check cards.** Several boards draw him there. I kept your standing rule that Rico appears only on the Call, feedback, Rico's warning and completion screens.
3. **Prices are drawn as candles.** Some Challenge and walkthrough boards draw a price as a plain line; the house rule is candlesticks. Non-price series stay lines, e.g. the CPI futures and oil in Ch8, and P&L and equity curves.
4. **No clip-art.** Ch6 L1's fear/greed drawing is a gauge, Ch6 L4's coins are plain tiles, and the Ch2 L3 coin stacks are a flow diagram.
5. **Some "tap a row / tap a bar / tap a goal" walkthroughs are a single ▶ Play.** This happens where the chart type can't be tapped part by part.
6. **Chapter 2 keeps your earlier factual corrections where its board differs:**
   - Market fill ≈ $49.60.
   - Leverage: US stocks about 2×; 10–100× only on forex, CFDs, futures and crypto. Margin calls are covered, and the title says "sword".
   - Regular-hours wording.
   - Short-selling costs; slippage both ways and payment for order flow.
7. **Small layout choices on phones:**
   - The docked feedback sheet covers part of a wrong answer, as on the board.
8. **US English.** The board text "Best defence" became "defense" and "colour" became "color".
9. **Chapter "XP earned" counts lessons + Challenge,** the only XP a chapter pays.

## 4. Bugs found and fixed

| Bug | Fix |
|---|---|
| A plan edit made in another tab was overwritten by this tab's next save | Each save now stores a revision; the engine re-reads storage before reads and writes and listens for other tabs; tests added |
| Home, the path page and the Ch10 page still said "Finish the path" / "New chapters are on the way" after finishing | Completed states: "View certificate", "Explore Pro paths" |
| The finale could never be reached: the plan needed 8 hand-typed fields that no lesson filled | 5-section plan filled by Chapter 10 lessons; finale needs 10 Challenges + 5 sections |
| Challenge results screen and refresher stranded learners on phones | Fixed in the audit round; re-verified |
| Charts disappeared or stayed inconsistently after answering | Matched to the boards: lessons hide the chart (feedback takes its place); Challenges keep it under the question |
| The "+79 XP" count-up stopped before reaching +80 | Count-up is now ≤300 ms and always lands on the engine number |
| The retry pass showed an odd "Retry: half XP +2" row | Breakdown built from the engine's full and awarded XP, so rows always add up |
| Rico disappeared from the Call box after answering | Kept, as on the boards; still one Rico per screen |
| Red, gold and green note boxes, the myth "Rule:" box and Rico's warning note were missing | Added (`tone`, `footTone`, `rule`, `note`), plus 68 content updates |
| Assorted visual bugs | Fixed: "Try it · Try it" eyebrow, Play button squeezed into chart rows, faded candles not faded, split charts drawing the legend twice, colour options ignored, glossary words wrapping their full stop, cut-off Challenge options, the drawline label covering candles |
| Replay / retake copy offered a Challenge or an "unlocked" chapter that was already done | Now says passed / already open |
| "% right first try" counted tested-out lessons; Gym counted days not sessions; Gym list cut at 5 without saying so | New `stats()` in the engine; "+N more" on the Gym list |
| No level-up cue on Challenge screens | "Level up! You reached level N" from the engine |
| Calculator pages requested missing icons (404s) | Path prefix fixed in `trading_calculators/calc-shell.js` |
| Path, catalog and search data were out of date for Ch3–10 | Generated from the chapter files at build time |

## 5. Open issues

1. **Board copy to confirm** (left as written):
   - Ch2 L1 Call says "−0.8% in a minute", but the chart shows about 7 one-minute candles.
   - Ch5 L3 tip: "…the trade is too small" probably means "the account is too small".
   - Ch9 L1 chart label "10 stock".
   - Ch10 L2 feedback names the right option by letter ("Only B passes"), against the feedback rule.
   - Ch3 L4: the board's wrong-answer state marks the wrong option as right. The build follows the right-answer state.
   - "Stop-limit" is still a Ch2 key term, but no lesson teaches it now (the board dropped the footnote).
2. **Not shown on any board, so I didn't invent them:**
   - lesson-complete "Up next" on phones;
   - the per-section "Open plan" for Chapters 1–9.
3. **Not verified:**
   - Strategist (12,000 XP) can't be reached on this path; the maximum is 7,600. Its rank-up is covered by engine tests only.
   - Streak-milestone XP across real days is covered by tests only. The end-to-end runs happened within one day.
4. **Deploy note:** keep `academy/_source/` (boards, briefs, report shots) and `academy/build/` out of the upload.

## 6. Screenshots of key screens

All in `_source/report-shots/`:

| Screen | File |
|---|---|
| Guest → sign up mid-path | `guest-signup-mid-path-desk.png` |
| Wrong answer, saved to Rico's Gym (Ch4, mobile) | `ch4-wrong-answer-gym-m.png` |
| Call answered (Ch4, desktop) | `ch4-call-answered-desk.png` |
| Charts: RSI gauge, MACD, position-size formula, allocation donut, margins, support | `ch4-rsi-{desk,m}.png`, `ch4-macd-*.png`, `ch5-position-size-*.png`, `ch9-allocation-*.png`, `ch7-margins-*.png`, `ch3-support-*.png` |
| Drag the trendline (Ch4 L2) | `ch4-drag-trendline-desk.png` |
| Challenge not passed → refresher → retry pass (half XP) | `challenge-not-passed-desk.png`, `challenge-refresher-desk.png`, `challenge-retry-pass-half-desk.png` |
| Rank-up to Analyst, Level 6 | `rankup-analyst-level6-desk.png` |
| Chapter page (superseded: chapter URLs now open the merged path page) | `chapter-page-ch4-desk.png` |
| Path page | `path-page-desk.png` |
| Lesson complete, Chapter 10, "Added to My Trading Plan" | `lesson-complete-ch10-plan-desk.png`, `lesson-complete-ch10-m.png` |
| Plan with 5 sections; edit kept across tabs | `plan-5-sections-desk.png`, `plan-edit-kept-desk.png` |
| Chapter 10 Challenge passed → Finish the path | `challenge-passed-ch10-desk.png` |
| Finish → certificate (+500 XP, +500 coins) | `finish-certificate-desk.png`, `certificates-m.png` |
| Home after finishing | `home-finished-desk.png` |
