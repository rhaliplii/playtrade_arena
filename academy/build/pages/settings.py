"""Settings (/academy/settings): daily goal, weekend mode, reminders, motion, privacy and the account
card (download, reset progress, log out, delete account). Reminders and Privacy are for signed-in learners. Kept lean, exactly as on the canvas. SSR ships the defaults; ref-pages.js reads and writes
AC.progress.settings(patch) as you go."""
import lib
from lib import esc
from pages.how import base_of

GOALS = [("casual", 1), ("regular", 2), ("serious", 4)]   # engine GOALS
DOWNLOAD = ('<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" '
            'stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>')


def switch(t, key, title, text, on, first=False):
    sub = f'<span>{esc(text)}</span>' if text else ""
    return f'''<div class="ac-set-row{" ac-set-row--first" if first else ""}">
  <span class="ac-set-row__text" id="set-{key}-l"><b>{esc(title)}</b>{sub}</span>
  <button type="button" role="switch" class="ac-toggle" aria-checked="{"true" if on else "false"}" aria-labelledby="set-{key}-l" data-set="{key}"><span class="ac-toggle__knob"></span></button>
</div>'''


def routes(ctx):
    t = ctx.t
    route = "settings"
    base = base_of(route)
    goals = "".join(
        f'''<button type="button" role="radio" class="ac-set-goal{" is-on" if k == "regular" else ""}" aria-checked="{"true" if k == "regular" else "false"}" data-goal="{k}">
  <b class="ac-num">{lib.fmt_num(n)}</b><span>{esc(t("settings.goal.label", name=t("settings.goal." + k), lessons=t("settings.goal.lessons", n=n)))}</span></button>'''
        for k, n in GOALS)
    notes = {k: t("settings.goal.note." + k) for k, _ in GOALS}

    body = f'''<div class="ac-wrap ac-ref ac-set">
  <header class="ac-set-head">
    <h1 class="ac-h1">{esc(t("settings.title"))}</h1>
    <p class="ac-lead ac-faint">{esc(t("settings.lead"))} <span class="ac-set-saved" data-set-saved role="status" hidden>{esc(t("settings.saved"))}</span></p>
  </header>

  <div class="ac-set-grid">
    <section class="ac-card ac-set-card" aria-labelledby="set-goal">
      <h2 id="set-goal" class="ac-h3">{esc(t("settings.goal.title"))}</h2>
      <div class="ac-set-goals" role="radiogroup" aria-labelledby="set-goal">{goals}</div>
      <p class="ac-set-note" data-goal-note>{esc(notes["regular"])}</p>
      <div class="ac-set-foot">{switch(t, "weekendMode", t("settings.weekend.title"), t("settings.weekend.text"), False, first=True)}</div>
    </section>

    <section class="ac-card ac-set-card" aria-labelledby="set-rem" data-show="member">
      <h2 id="set-rem" class="ac-h3">{esc(t("settings.rem.title"))}</h2>
      {switch(t, "reminders", t("settings.rem.daily"), t("settings.rem.dailyText"), True, first=True)}
      <div class="ac-set-pair" data-rem-fields>
        <label class="ac-field">{esc(t("settings.rem.time"))}<input type="time" value="19:00" data-set-input="reminderTime"></label>
        <label class="ac-field">{esc(t("settings.rem.channel"))}<select data-set-input="reminderChannel">
          <option value="push">{esc(t("settings.rem.push"))}</option><option value="email">{esc(t("settings.rem.email"))}</option></select></label>
      </div>
      <p class="ac-set-note ac-set-note--foot">{esc(t("settings.rem.note"))}</p>
    </section>

    <section class="ac-card ac-set-card ac-set-card--list" aria-labelledby="set-sm">
      <h2 id="set-sm" class="ac-h3">{esc(t("settings.sm.title"))}</h2>
      {switch(t, "sound", t("settings.sound.title"), t("settings.sound.text"), True, first=True)}
      {switch(t, "reduceMotion", t("settings.motion.title"), t("settings.motion.text"), False)}
    </section>

    <section class="ac-card ac-set-card ac-set-card--list" aria-labelledby="set-pv" data-show="member">
      <h2 id="set-pv" class="ac-h3">{esc(t("settings.pv.title"))}</h2>
      {switch(t, "leaderboard", t("settings.board.title"), t("settings.board.text"), True, first=True)}
      {switch(t, "publicProfile", t("settings.profile.title"), t("settings.profile.text"), False)}
      <a class="ac-link ac-set-profile" href="{base}u/index.html" data-profile-link data-show="member">{esc(t("settings.profile.link"))}</a>
    </section>
  </div>

  <section class="ac-card ac-set-acc" aria-labelledby="set-acc" data-show="member">
    <span class="ac-set-acc__avatar" role="img" data-acc-avatar aria-label=""></span>
    <div class="ac-set-acc__text">
      <h2 id="set-acc" class="ac-h3" data-acc-line></h2>
      <span class="ac-set-acc__sub" data-acc-joined></span>
    </div>
    <button type="button" class="ac-btn ac-btn--ghost ac-btn--sm" data-acc-download>{DOWNLOAD}{esc(t("settings.acc.download"))}</button>
    <div class="ac-set-acc__actions">
      <button type="button" class="ac-btn ac-btn--ghost ac-btn--sm" data-acc-reset>{esc(t("settings.acc.reset"))}</button>
      <button type="button" class="ac-btn ac-btn--ghost ac-btn--sm" data-action="logout">{esc(t("settings.acc.logout"))}</button>
      <button type="button" class="ac-set-danger" data-action="delete-account">{esc(t("settings.acc.delete"))}</button>
    </div>
  </section>
  <dialog class="ac-dialog" data-reset-dialog aria-labelledby="set-reset-t" aria-describedby="set-reset-d">
    <div class="ac-dialog__box">
      <h2 id="set-reset-t" class="ac-h3">{esc(t("settings.reset.title"))}</h2>
      <p id="set-reset-d" class="ac-set-note">{esc(t("settings.reset.text"))}</p>
      <div class="ac-row ac-set-dialog__btns">
        <button type="button" class="ac-btn ac-btn--ghost ac-btn--sm" data-reset-cancel>{esc(t("settings.reset.cancel"))}</button>
        <button type="button" class="ac-btn ac-btn--danger ac-btn--sm" data-reset-ok>{esc(t("settings.reset.ok"))}</button>
      </div>
    </div>
  </dialog>
  <section class="ac-card ac-set-acc" aria-labelledby="set-guest" data-show="guest">
    <div class="ac-set-acc__text">
      <h2 id="set-guest" class="ac-h3">{esc(t("settings.acc.guestTitle"))}</h2>
      <span class="ac-set-acc__sub">{esc(t("settings.acc.guestText"))}</span>
    </div>
    <button type="button" class="ac-btn ac-btn--primary ac-btn--sm" data-action="signup">{esc(t("nav.save.cta"))}</button>
  </section>
</div>'''
    yield route, lib.page(t, route=route, title=t("settings.meta.title"), description=t("settings.meta.description"), body=body,
                          active="settings", index=False, css=("ref-pages.css",), js=("ref-pages.js",), body_class="ac-page-settings",
                          data={"ac-ref": {"page": "settings", "notes": notes}})
