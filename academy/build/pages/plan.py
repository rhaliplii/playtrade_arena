"""My Trading Plan (/academy/my-plan): five sections (style, entry, risk, checklist, review), one per Chapter 10 lesson.
A finished lesson fills its section with the default from the chapter's `plan` rows (#ac-index plan); the learner edits
and saves. Rendered by me-pages.js."""
from lib import esc
from pages import me


def routes(ctx):
    t = ctx.t
    aside = (f'<span class="me-pill" data-show="member"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" '
             f'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z"/>'
             f'<path d="m9 12 2 2 4-4"/></svg>{esc(t("plan.badge"))}</span>')
    yield "my-plan", me.page(ctx, "my-plan", "plan", '<div id="meRoot" class="me-root"></div>', "progress", aside=aside)
