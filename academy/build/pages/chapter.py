"""Chapter routes (/academy/learn-to-trade/<chapter>): the merged path page (path.merged_body, canvas-path Path1-Final-D /
Path1-Final-M) with this chapter open and scrolled into view (learn-pages.js pathPage reads data-open). There is no
separate chapter page. Each route keeps its own title, description, canonical, breadcrumb and Course JSON-LD; the
chapter's title is the page's h1 (the path title drops to a <p>)."""
import lib
from pages.path import CSS, JS, ltt, learn_data, base_of, crumbs_ld, ORIGIN, merged_body


def routes(ctx):
    t = ctx.t
    L = ltt(ctx)
    L["outcome"] = ctx.path["outcome"]
    data = {"ac-learn": learn_data(ctx, L)}
    for c in L["chapters"]:
        route = f'{L["id"]}/{c["id"]}'
        base = base_of(route, ctx.locale)
        title = t("chapter.meta.title", title=c["title"], n=c["n"])
        ld_crumbs = crumbs_ld([(t("path.crumb.academy"), ""), (t("path.crumb.paths"), "paths"), (L["title"], L["id"]), (c["title"], route)])
        course = {"@context": "https://schema.org", "@type": "Course", "name": c["title"], "description": c["promise"],
                  "url": f"{ORIGIN}/academy/{route}/", "inLanguage": "en-US", "isAccessibleForFree": True,
                  "provider": {"@type": "Organization", "name": "Profit.com", "sameAs": ORIGIN},
                  "isPartOf": {"@type": "Course", "name": L["title"], "url": f"{ORIGIN}/academy/{L['id']}/"},
                  "hasCourseInstance": {"@type": "CourseInstance", "courseMode": "online", "courseWorkload": f"PT{c['minutes']}M"},
                  "syllabusSections": [{"@type": "Syllabus", "name": l["title"], "description": l["desc"], "timeRequired": f"PT{l['minutes']}M"}
                                       for l in c["lessons"]]}
        items = {"@context": "https://schema.org", "@type": "ItemList", "name": c["title"],
                 "itemListElement": [{"@type": "ListItem", "position": l["n"], "name": l["title"]} for l in c["lessons"]]}
        if c["available"]:
            course["teaches"] = c["unlock"]
            desc = t("chapter.meta.desc", title=c["title"], promise=c["promise"], n=c["count"])
        else:
            desc = t("chapter.meta.soon", title=c["title"], promise=c["promise"])
        yield route, lib.page(t, route=route, title=title, description=desc, body=merged_body(ctx, L, base, open_id=c["id"]),
                              active="paths", index=c["available"], css=CSS, js=JS, jsonld=[course, items, ld_crumbs], data=data,
                              body_class="ac-page-path", locale=ctx.locale)
