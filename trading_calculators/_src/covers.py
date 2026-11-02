"""Hub card covers, rendered to static HTML at build time.

Same construction as the Market Games covers (.mg-flip in styles.css) and the Academy's
path covers (academy/covers.js): a saturated ground, chunky objects made of a stacked
"stock" (the side face) and a lit front face, a contact shadow, and a hover animation
that acts out what the calculator does. The CSS is in calc.css under "Hub covers".
"""

STOCK = "".join(f'<i style="transform:translateZ({-2.8 + n * 0.7:.1f}px)"></i>' for n in range(9))


def o(css):
    """A box object: stock + lit face."""
    return f'<i class="cv-o" style="{css}"><i class="cv-o__k"></i><i class="cv-o__f"></i></i>'


def sh(css):
    """A shaped object: every plane cut by --clip / --mask."""
    return f'<i class="cv-s" style="{css}">{STOCK}<i class="cv-s__f"></i></i>'


def candle(h, up=True, wick=None, w=18):
    wick = wick or h + 22
    col = "" if up else ";--f:var(--fd);--k:var(--kd)"
    return f'<i class="cv-c" style="--h:{h}px;--wk:{wick}px;--w:{w}px{col}"><i class="cv-c__w"></i>{o("")}</i>'


def at(x, y):
    return f"position:absolute;left:{x}px;top:{y}px;"


def put(x, y, inner):
    return f'<i class="cv-at" style="left:{x}px;top:{y}px">{inner}</i>'


def g(name, inner, style=""):
    """A group that moves together on card hover."""
    return f'<i class="cv-g cv-g--{name}"{f" style={chr(34)}{style}{chr(34)}" if style else ""}>{inner}</i>'


def box(w, h, inner):
    return f'<i class="cv-box" style="width:{w}px;height:{h}px">{inner}</i>'


RING = "--r:50%;--mask:radial-gradient(circle closest-side, transparent {a}%, #000 {b}%)"


def scene(cid):
    if cid == "stock":
        # candles climbing a staircase, an up-arrow breaking out above them
        cs = [(24, False, 0), (40, True, 1), (34, False, 2), (58, True, 3)]
        bars = "".join(g("bob", put(4 + n * 30, 100 - h - 5 * n, candle(h, up)), f"--i:{n}") for n, (h, up, _) in enumerate(cs))
        arrow = g("rise", sh(f"{at(122, 14)}width:28px;height:38px;--clip:polygon(50% 0, 100% 46%, 68% 46%, 68% 100%, 32% 100%, 32% 46%, 0 46%)"))
        return box(156, 100, bars + arrow)
    if cid == "crypto":
        # three coins at clearly separate depths (back pair well behind the front coin), so no
        # two solids ever share space; the rim and glyph are flat layers in front of the face
        def coin(x, y, d, z, glyph=False):
            body = sh(f"{at(x, y)}width:{d}px;height:{d}px;--r:50%")
            rim = f'<i class="cv-rim" style="{at(x + d * 0.13, y + d * 0.13)}width:{d * 0.74:.0f}px;height:{d * 0.74:.0f}px"></i>'
            mark = f'<i class="cv-glyph" style="{at(x, y)}width:{d}px;height:{d}px;font-size:{d * 0.5:.0f}px">₿</i>' if glyph else ""
            return f'<i class="cv-g" style="transform:translateZ({z}px)">{body}{rim}{mark}</i>'
        back = g("fan-l", coin(-10, 34, 50, -30)) + g("fan-r", coin(96, 38, 46, -30))
        return box(134, 92, back + g("hop", coin(30, 8, 76, 0, True)))
    if cid == "position":
        # a target: rings and a bullseye
        rings = (sh(f"{at(0, 0)}width:96px;height:96px;{RING.format(a=66, b=68)};--f:var(--fw);--k:var(--kw)")
                 + sh(f"{at(18, 18)}width:60px;height:60px;{RING.format(a=58, b=60)};transform:translateZ(2px)")
                 + o(f"{at(38, 38)}width:20px;height:20px;--r:50%;transform:translateZ(4px);--f:var(--fw);--k:var(--kw)"))
        return box(96, 96, g("pulse", rings, "transform-origin:48px 48px"))
    if cid == "options":
        # a chart card showing a call's payoff at expiry: flat until the strike, then rising
        panel = o(f"{at(0, 0)}width:150px;height:96px;--r:14px;--f:var(--fi);--k:var(--ki)")
        axis = o(f"{at(14, 76)}width:122px;height:4px;--r:2px;transform:translateZ(6px);--f:var(--fm);--k:var(--km)")
        strike = o(f"{at(70, 52)}width:4px;height:24px;--r:2px;transform:translateZ(6px);--f:var(--fw);--k:var(--kw)")
        line = sh(f"{at(14, 14)}width:122px;height:58px;transform:translateZ(9px);--clip:polygon(0 72%, 46% 72%, 86% 0, 100% 16%, 53% 94%, 0 94%)")
        dot = o(f"{at(64, 50)}width:16px;height:16px;--r:50%;transform:translateZ(13px);--f:var(--fw);--k:var(--kw)")
        return box(150, 96, g("pulse", panel + axis + strike + line + dot, "transform-origin:75px 48px"))
    if cid == "margin":
        # leverage as a seesaw: your money (green) on one end, the borrowed money (grey) on the other
        fulcrum = sh(f"{at(56, 62)}width:36px;height:34px;--clip:polygon(50% 0, 100% 100%, 0 100%);--f:var(--fw);--k:var(--kw)")
        plank = o(f"{at(0, 52)}width:148px;height:10px;--r:5px;--f:var(--fm);--k:var(--km)")
        mine = o(f"{at(10, 22)}width:34px;height:30px;--r:7px")
        loan = (o(f"{at(98, 6)}width:40px;height:46px;--r:7px;--f:var(--fm);--k:var(--km)"))
        return box(148, 96, fulcrum + g("tilt", plank + mine + loan, "transform-origin:74px 57px"))
    raise KeyError(cid)


def cover(cid):
    return f'<span class="hc hc--{cid}" aria-hidden="true"><span class="hc__s">{scene(cid)}</span></span>'
