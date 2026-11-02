"""Placement quiz (/academy/placement): 8 questions drawn from the lessons' own Check questions (falling back to a
lesson's choice exercise), never from the Chapter Challenge sets, over the available chapters (the path's last chapter,
Your plan, can't be tested out). All of a chapter's questions right → AC.progress.testOut(chapter): the chapter and its
Challenge count as passed and its lessons stay open to review (XP is paid once, so they give none).
The result screen recommends where to start. Not indexed; the quiz runs in learn-pages.js."""
import lib
from lib import esc
from pages.path import CSS, JS, PLACEMENT_XP, ltt, learn_data, rico_src, base_of, href, lesson_route, disclaimer

TOTAL = 8


def lesson_question(lesson):
    """A lesson's Check question (or, without one, a plain choice exercise with no templated numbers)."""
    cards = lesson.get("cards", [])
    for want in ("check", "exercise"):
        for c in cards:
            if c.get("type") != want or not c.get("options") or c.get("answer") is None:
                continue
            if want == "exercise" and (c.get("kind") != "choice" or "{" in c.get("q", "")):
                continue
            opts = [o["text"] if isinstance(o, dict) else o for o in c["options"]]
            return {"q": c["q"], "options": opts, "answer": c["answer"], "idea": c.get("idea")}
    return None


def pick(ctx, L):
    """Spread TOTAL questions over the testable chapters (at least 2 each), one per lesson, keeping lesson order."""
    last = L["chapters"][-1]["id"]
    chs = [c for c in L["chapters"] if c["available"] and c["id"] != last]
    pools = []
    for c in chs:
        qs = [q for q in (lesson_question(ctx.lessons[lid]) for lid in c["full"]["lessons"]) if q]
        if qs:
            pools.append((c, qs))
    if not pools:
        return []
    per = max(2, TOTAL // len(pools))
    out = []
    for c, qs in pools:
        take = min(per, len(qs))
        # evenly spaced through the chapter so each lesson area gets a look
        idx = sorted(set(round(i * (len(qs) - 1) / max(1, take - 1)) for i in range(take))) if take > 1 else [0]
        for i in idx:
            out.append(dict(qs[i], chapter=c["id"], n=c["n"], short=c["short"]))
    return out[:max(TOTAL, 2 * len(pools))]


def routes(ctx):
    t = ctx.t
    L = ltt(ctx)
    route = "placement"
    base = base_of(route, ctx.locale)
    qs = pick(ctx, L)
    first_r = lesson_route(L["id"], *L["first_lesson"]) if L["first_lesson"] else L["id"]
    last = L["chapters"][-1]
    minutes = max(1, round(len(qs) * 0.4))
    covers = sorted(set((q["n"], q["short"], q["chapter"]) for q in qs))
    cover_rows = "".join(f'<li data-cover="{esc(cid)}"><span>{n} · {esc(short)}</span><span class="ac-pl__st" data-st>{esc(t("placement.st.not"))}</span></li>'
                         for n, short, cid in covers)
    body = f'''<div class="ac-wrap ac-wrap--tight ac-lp ac-pl" data-placement data-first="{esc(href(base, first_r))}">
  <header class="ac-pathshead">
    <div class="ac-sechead"><span class="ac-chip ac-chip--xs">{esc(t("placement.badge"))}</span><h1 class="ac-h1">{esc(t("placement.title"))}</h1>
      <p class="ac-lead">{esc(t("placement.sub", n=len(qs), min=minutes))}</p></div>
    <a class="ac-link" href="{href(base, first_r)}" data-skip>{esc(t("placement.skip"))}</a>
  </header>
  <div class="ac-lpgrid">
    <main class="ac-lpgrid__main">
      <section class="ac-card ac-pl__prev" aria-labelledby="pl-prev" data-prev hidden>
        <div class="ac-sechead"><span class="ac-eyebrow ac-eyebrow--mint" id="pl-prev">{esc(t("placement.prev.title"))}</span>
          <p class="ac-lead" data-prev-text></p><p class="ac-small ac-muted">{esc(t("placement.prev.note"))}</p></div>
        <div class="ac-pl__actions"><a class="ac-btn ac-btn--ghost" href="{href(base, L["id"])}">{esc(t("placement.result.map"))}</a>
          <button type="button" class="ac-btn ac-btn--primary" data-retake>{esc(t("placement.prev.retake"))}</button></div>
      </section>
      <section class="ac-card ac-pl__card" aria-labelledby="pl-q" data-quiz>
        <div class="ac-pl__top"><div class="ac-pl__dots" role="progressbar" aria-valuemin="1" aria-valuemax="{len(qs)}" data-dots></div><span class="ac-pl__count ac-num" data-count></span></div>
        <span class="ac-chip ac-chip--mint ac-chip--xs" data-q-chapter></span>
        <h2 id="pl-q" class="ac-pl__q" data-q></h2>
        <div role="radiogroup" class="ac-pl__opts" aria-labelledby="pl-q" data-opts></div>
        <div class="ac-pl__actions"><button type="button" class="ac-btn ac-btn--ghost" data-dunno>{esc(t("placement.dunno"))}</button>
          <button type="button" class="ac-btn ac-btn--primary" data-next aria-disabled="true">{esc(t("placement.next"))}</button></div>
        <noscript><p>{esc(t("placement.noscript"))}</p></noscript>
      </section>
      <section class="ac-card ac-pl__result" aria-labelledby="pl-r" data-result hidden tabindex="-1">
        <header class="ac-setup__head"><img src="{rico_src(base, "celebrate")}" alt="{esc(t("placement.result.ricoAlt"))}" width="100" height="120" data-r-rico>
          <div class="ac-sechead"><span class="ac-eyebrow ac-eyebrow--mint">{esc(t("placement.result.eyebrow"))}</span><h2 id="pl-r" class="ac-setup__bubble" data-r-title></h2></div></header>
        <p class="ac-lead" data-r-text></p>
        <ol class="ac-pl__rows" data-r-rows></ol>
        <p class="ac-small ac-muted" data-r-gym hidden></p>
        <div class="ac-pl__actions"><a class="ac-btn ac-btn--ghost" href="{href(base, L["id"])}">{esc(t("placement.result.map"))}</a>
          <a class="ac-btn ac-btn--primary ac-btn--lg" href="{href(base, first_r)}" data-r-cta></a></div>
      </section>
    </main>
    <aside class="ac-lpgrid__aside">
      <section class="ac-card ac-side"><b class="ac-h3">{esc(t("placement.aside.title"))}</b><p class="ac-side__p">{esc(t("placement.aside.p1"))}</p><p class="ac-side__p">{esc(t("placement.aside.p2", xp=PLACEMENT_XP))}</p></section>
      <section class="ac-card ac-side"><h2 class="ac-side__title">{esc(t("placement.covers"))}</h2><ol class="ac-pl__covers">{cover_rows}</ol>
        <span class="ac-pl__note">{esc(t("placement.coversNote", n=last["n"], short=last["short"]))}</span></section>
      <p class="ac-fine" data-show="guest">{esc(t("placement.signin"))}</p>
    </aside>
  </div>
  {disclaimer(t)}
</div>'''
    yield route, lib.page(t, route=route, title=t("placement.meta.title"), description=t("placement.meta.desc"), body=body,
                          active="paths", index=False, css=CSS, js=JS,
                          data={"ac-learn": learn_data(ctx, L), "ac-placement": qs}, body_class="ac-page-placement", locale=ctx.locale)
