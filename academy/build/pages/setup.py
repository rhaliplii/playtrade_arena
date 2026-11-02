"""First visit after sign-up (/academy/setup): experience and daily goal (Casual 1 / Regular 2 / Serious 4, the same names
as Settings) → AC.progress.setOnboarded(goal), then on to the next lesson or, for anyone who has traded before, the
placement quiz. Guests get a sign-up prompt instead (goal and streak live in the account). Not indexed; JS runs the choices."""
import lib
from lib import esc
from pages.path import CSS, JS, ltt, learn_data, icon, rico_src, base_of, href, lesson_route, disclaimer


def group(t, n, key, opts, sel, extra=None):
    btns = []
    for v in opts:
        on = v == sel
        inner = f'<span class="ac-opt__dot"></span><b class="ac-opt__title">{esc(t("setup." + key + "." + v))}</b>'
        if extra:
            inner += extra(v)
        else:
            inner += f'<span class="ac-opt__text">{esc(t("setup." + key + "." + v + ".text"))}</span>'
        btns.append(f'<button type="button" role="radio" class="ac-opt" aria-checked="{"true" if on else "false"}" tabindex="{0 if on else -1}" data-value="{v}">{inner}</button>')
    return (f'<div class="ac-setup__q"><h2 id="q-{key}" class="ac-setup__qh"><span class="ac-setup__qn">{n}</span>{esc(t("setup." + key))}</h2>'
            f'<div role="radiogroup" class="ac-opts" aria-labelledby="q-{key}" data-group="{key}">{"".join(btns)}</div></div>')


def routes(ctx):
    t = ctx.t
    L = ltt(ctx)
    route = "setup"
    base = base_of(route, ctx.locale)
    first_c = L["first"]
    first_r = lesson_route(L["id"], *L["first_lesson"]) if L["first_lesson"] else L["id"]
    goal_extra = lambda v: (f'<span class="ac-opt__lessons ac-num">{esc(t("setup.goal." + v + ".lessons"))}</span>'
                            f'<span class="ac-opt__text">{esc(t("setup.goal." + v + ".time"))}</span>')
    body = f'''<div class="ac-wrap ac-lp ac-setup" data-setup>
  <section class="ac-card ac-setup__card" aria-labelledby="setup-guest-title" data-show="guest">
    <header class="ac-setup__head">
      <img src="{rico_src(base, "present")}" alt="{esc(t("setup.ricoAlt"))}" width="100" height="120">
      <div class="ac-sechead"><span class="ac-eyebrow ac-eyebrow--mint">{esc(t("setup.eyebrow"))}</span>
        <h1 id="setup-guest-title" class="ac-setup__bubble">{esc(t("setup.guest.title"))}</h1><p class="ac-lead">{esc(t("setup.guest.text"))}</p></div>
    </header>
    <footer class="ac-setup__foot"><a class="ac-link" href="{href(base, "")}">{esc(t("setup.guest.back"))}</a>
      <button type="button" class="ac-btn ac-btn--primary ac-btn--lg" data-action="signup">{esc(t("setup.guest.cta"))}</button></footer>
  </section>
  <section class="ac-card ac-setup__card" aria-labelledby="setup-title" data-show="member" hidden>
    <header class="ac-setup__head">
      <img src="{rico_src(base, "present")}" alt="{esc(t("setup.ricoAlt"))}" width="100" height="120">
      <div class="ac-sechead"><span class="ac-eyebrow ac-eyebrow--mint">{esc(t("setup.eyebrow"))}</span>
        <h1 id="setup-title" class="ac-setup__bubble">{esc(t("setup.title"))}</h1></div>
    </header>
    {group(t, 1, "exp", ("never", "little", "lost"), "never")}
    <div class="ac-setup__goal">{group(t, 2, "goal", ("casual", "regular", "serious"), "regular", goal_extra)}<span class="ac-small ac-muted">{esc(t("setup.goalNote"))}</span></div>
    <div class="ac-setup__suggest" data-suggest hidden>
      <span class="ac-sechead"><b class="ac-h3">{esc(t("setup.suggest.title"))}</b><span class="ac-small ac-muted" data-suggest-text></span></span>
      <a class="ac-btn ac-btn--soft ac-btn--sm" href="{href(base, "placement")}" data-go="placement">{esc(t("setup.placement"))}</a>
    </div>
    <footer class="ac-setup__foot">
      <div class="ac-sechead">
        <a class="ac-link" href="{href(base, "placement")}" data-go="placement" data-suggest-link>{esc(t("setup.placementLink"))}</a>
        <span class="ac-small ac-muted" data-next-sub>{esc(t("setup.nextSub", n=first_c["n"] if first_c else 1, title=first_c["title"] if first_c else ""))}</span>
      </div>
      <a class="ac-btn ac-btn--primary ac-btn--lg" href="{href(base, first_r)}" data-go="next"><span data-next-label>{esc(t("setup.cta.start", n=first_c["n"] if first_c else 1))}</span>{icon("arrow", 18, 2.4)}</a>
    </footer>
  </section>
  {disclaimer(t)}
</div>'''
    yield route, lib.page(t, route=route, title=t("setup.meta.title"), description=t("setup.meta.desc"), body=body, active="home",
                          index=False, css=CSS, js=JS, data={"ac-learn": learn_data(ctx, L)}, body_class="ac-page-setup", locale=ctx.locale)
