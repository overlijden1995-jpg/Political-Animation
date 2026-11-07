#!/usr/bin/env python3
"""
Render 10 distinct Minimalist Eggshell + Bold Typeset + Snappy Transition
visual appearances for 'Bad Actors: How Politicians Pretend'.

Outputs:
  1. 10 full-HD (1920x1080) style boards:
       public/bad-actors/appearances/01-swiss-broadsheet.png
       ...
       public/bad-actors/appearances/10-kinetic-letterpress.png
  2. A 2x5 master comparison contact sheet (3840x2160 -> 1920x1080):
       public/bad-actors/appearances/00-all-10-appearances-overview.png
  3. A 50-second 1920x1080 @ 30fps animated showcase video demonstrating
     both the bold eggshell typeset layouts AND each style's signature
     4-to-6-frame snappy transition (Slide A -> Slide B):
       episodes/bad-actors-10-appearances-lookbook.mp4
"""

import io
import math
import os
import subprocess
import sys
import tempfile
import time
import wave
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FFMPEG = os.path.join(ROOT, "node_modules/@remotion/compositor-linux-x64-gnu/ffmpeg")
FONT_DIR = os.path.join(ROOT, "public/bad-actors/fonts")
PHOTO_DIR = os.path.join(ROOT, "public/bad-actors/ep01-jd-vance/photos")
MASTER_MP3 = os.path.join(ROOT, "public/bad-actors/ep01-jd-vance/audio/episode-master.mp3")
OUT_APPEAR_DIR = os.path.join(ROOT, "public/bad-actors/appearances")
OUT_LOOKBOOK_MP4 = os.path.join(ROOT, "episodes/bad-actors-10-appearances-lookbook.mp4")

W, H = 1920, 1080
FPS = 30
SLOT_SEC = 5.0
SLOT_FRAMES = int(SLOT_SEC * FPS)  # 150 frames per style (0..71 Slide A, 72..77 Snappy Transition, 78..149 Slide B)

FONT_CACHE: dict[tuple[str, int], ImageFont.FreeTypeFont] = {}


def font(filename: str, size: int) -> ImageFont.FreeTypeFont:
    key = (filename, size)
    if key not in FONT_CACHE:
        FONT_CACHE[key] = ImageFont.truetype(os.path.join(FONT_DIR, filename), size)
    return FONT_CACHE[key]


def hex_rgb(h: str) -> tuple[int, int, int]:
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


def lerp_rgb(a: tuple[int, int, int], b: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    t = max(0.0, min(1.0, t))
    return (
        int(a[0] + (b[0] - a[0]) * t),
        int(a[1] + (b[1] - a[1]) * t),
        int(a[2] + (b[2] - a[2]) * t),
    )


def snap_out_quint(t: float) -> float:
    """Ultra-snappy editorial ease-out: locks into place with crisp authority."""
    c = max(0.0, min(1.0, t))
    return 1.0 - (1.0 - c) ** 5


def snap_in_out_expo(t: float) -> float:
    """Razor-sharp shutter transition curve."""
    c = max(0.0, min(1.0, t))
    if c == 0.0 or c == 1.0:
        return c
    if c < 0.5:
        return 0.5 * (2.0 ** (20.0 * c - 10.0))
    return 1.0 - 0.5 * (2.0 ** (-20.0 * c + 10.0))


def measure_tracked(draw: ImageDraw.ImageDraw, text: str, fnt: ImageFont.FreeTypeFont, tracking: float = 0.0) -> float:
    if not text:
        return 0.0
    if abs(tracking) < 0.05:
        bb = draw.textbbox((0, 0), text, font=fnt)
        return float(bb[2] - bb[0])
    total = 0.0
    for i, ch in enumerate(text):
        adv = fnt.getlength(ch)
        total += adv + (tracking if i < len(text) - 1 else 0.0)
    return total


def draw_tracked(
    draw: ImageDraw.ImageDraw,
    pos: tuple[float, float],
    text: str,
    fnt: ImageFont.FreeTypeFont,
    fill: tuple[int, int, int],
    tracking: float = 0.0,
) -> float:
    x, y = pos
    if not text:
        return x
    if abs(tracking) < 0.05:
        draw.text((x, y), text, font=fnt, fill=fill)
        return x + fnt.getlength(text)
    cx = float(x)
    for ch in text:
        draw.text((cx, y), ch, font=fnt, fill=fill)
        cx += fnt.getlength(ch) + tracking
    return cx - tracking


def wrap_tracked(
    draw: ImageDraw.ImageDraw,
    text: str,
    fnt: ImageFont.FreeTypeFont,
    max_w: float,
    tracking: float = 0.0,
) -> list[str]:
    words = text.split()
    if not words:
        return []
    lines: list[str] = []
    cur = words[0]
    for w in words[1:]:
        cand = cur + " " + w
        if measure_tracked(draw, cand, fnt, tracking) <= max_w:
            cur = cand
        else:
            lines.append(cur)
            cur = w
    lines.append(cur)
    return lines


def build_eggshell_sheet(hex_color: str, seed: int) -> Image.Image:
    """Create tactile matte 300gsm archival eggshell paper stock (zero digital flatness)."""
    rng = np.random.default_rng(seed)
    base = np.array(hex_rgb(hex_color), dtype=np.float32)
    sheet = np.broadcast_to(base, (H, W, 3)).copy()

    # Fine cotton-rag micro-grain + subtle laid horizontal paper fiber
    fine = rng.normal(0.0, 2.3, size=(H, W, 1)).astype(np.float32)
    fiber_row = rng.normal(0.0, 0.85, size=(H, 1, 1)).astype(np.float32)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    nx = (xx - W * 0.5) / (W * 0.5)
    ny = (yy - H * 0.5) / (H * 0.5)
    vignette = np.clip((nx * nx + ny * ny) * 3.8, 0.0, 5.5)[..., None]

    sheet = np.clip(sheet + fine + fiber_row - vignette, 0, 255).astype(np.uint8)
    return Image.fromarray(sheet, mode="RGB")


def grade_editorial_photo(
    filename: str,
    tw: int,
    th: int,
    style: str,
    paper_hex: str,
    x_bias: float = 0.5,
    y_bias: float = 0.18,
) -> Image.Image:
    """Crop & grade politician photo so it reads like archival magazine/broadsheet print."""
    src = Image.open(os.path.join(PHOTO_DIR, filename)).convert("RGB")
    if "08-munich" in filename and abs(x_bias - 0.5) < 0.01:
        x_bias = 0.78
    iw, ih = src.size
    scale = max(tw / iw, th / ih)
    nw, nh = max(tw, int(iw * scale)), max(th, int(ih * scale))
    resized = src.resize((nw, nh), Image.Resampling.LANCZOS)
    left = max(0, min(nw - tw, int((nw - tw) * x_bias)))
    top = max(0, min(nh - th, int((nh - th) * y_bias)))
    crop = resized.crop((left, top, left + tw, top + th))

    arr = np.asarray(crop, dtype=np.float32) / 255.0
    paper = np.array(hex_rgb(paper_hex), dtype=np.float32) / 255.0
    luma = 0.299 * arr[..., 0] + 0.587 * arr[..., 1] + 0.114 * arr[..., 2]

    if style == "silver-bw":
        # Rich silver-gelatin S-curve mapped between #121110 ink and eggshell paper highlight
        sc = np.clip((luma - 0.48) * 1.38 + 0.50, 0.0, 1.0)
        sc = sc * sc * (3.0 - 2.0 * sc)
        ink_dark = np.array([0.07, 0.067, 0.063], dtype=np.float32)
        out = ink_dark[None, None, :] * (1.0 - sc[..., None]) + paper[None, None, :] * sc[..., None]
    elif style == "sepia-press":
        sc = np.clip((luma - 0.47) * 1.30 + 0.50, 0.0, 1.0)
        sc = sc * sc * (3.0 - 2.0 * sc)
        ink_dark = np.array([0.11, 0.09, 0.075], dtype=np.float32)
        out = ink_dark[None, None, :] * (1.0 - sc[..., None]) + paper[None, None, :] * sc[..., None]
    elif style == "halftone-ink":
        sc = np.clip((luma - 0.48) * 1.42 + 0.50, 0.0, 1.0)
        yy, xx = np.mgrid[0:th, 0:tw].astype(np.float32)
        # 45-degree lithographic screen modulation
        ang = 0.785398
        u = xx * math.cos(ang) - yy * math.sin(ang)
        v = xx * math.sin(ang) + yy * math.cos(ang)
        dots = 0.5 + 0.25 * (np.cos(u * (2 * math.pi / 5.0)) + np.cos(v * (2 * math.pi / 5.0)))
        screened = np.where(sc > dots * 0.85 + 0.07, 1.0, 0.0)
        blend = 0.72 * sc + 0.28 * screened
        ink_dark = np.array([0.06, 0.06, 0.055], dtype=np.float32)
        out = ink_dark[None, None, :] * (1.0 - blend[..., None]) + paper[None, None, :] * blend[..., None]
    else:  # warm-editorial
        # Desaturate 32%, lift matte blacks slightly, warm highlights toward eggshell
        gray = luma[..., None]
        desat = arr * 0.68 + gray * 0.32
        desat = np.clip((desat - 0.5) * 1.12 + 0.51, 0.0, 1.0)
        ink_floor = np.array([0.08, 0.075, 0.07], dtype=np.float32)
        out = ink_floor + desat * (paper - ink_floor + 0.04)
        out = np.clip(out, 0.0, 1.0)

    return Image.fromarray((out * 255.0).astype(np.uint8), mode="RGB")


def draw_registration_marks(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], color: tuple[int, int, int], size: int = 10):
    x0, y0, x1, y1 = box
    for cx, cy in [(x0, y0), (x1, y0), (x0, y1), (x1, y1)]:
        draw.line([(cx - size, cy), (cx + size, cy)], fill=color, width=2)
        draw.line([(cx, cy - size), (cx, cy + size)], fill=color, width=2)


def draw_style_pill_stamp(draw: ImageDraw.ImageDraw, num: int, name: str, x: int, y: int, bg: tuple[int, int, int], fg: tuple[int, int, int]):
    label = f"APPEARANCE {num:02d}  ·  {name.upper()}"
    f_mono = font("IBMPlexMono_700Bold.ttf", 14)
    tw = int(measure_tracked(draw, label, f_mono, 1.8))
    draw.rectangle((x, y, x + tw + 24, y + 30), fill=bg)
    draw_tracked(draw, (x + 12, y + 6), label, f_mono, fg, 1.8)


# =============================================================================
# 10 DISTINCT EGGSHELL TYPESET LAYOUT RENDERERS (SLIDE 'A' AND SLIDE 'B')
# =============================================================================

def render_01_swiss_broadsheet(sheets: dict, photos: dict, variant: str, anim_t: float) -> Image.Image:
    """01: SWISS BROADSHEET — Exposed 2px black rules, left full-bleed B&W, giant Archivo Black."""
    img = sheets["01"].copy()
    d = ImageDraw.Draw(img)
    ink = hex_rgb("#111111")
    muted = hex_rgb("#57534E")
    red = hex_rgb("#D62818")
    paper = hex_rgb("#F6F4EE")

    # Full-height B&W portrait on left (x=0..740, y=72..992)
    ph = photos[("01_a" if variant == "A" else "01_b")]
    img.paste(ph, (0, 72))

    # Crisp Swiss exposed grid rules
    d.line([(0, 72), (W, 72)], fill=ink, width=2)
    d.line([(0, 992), (W, 992)], fill=ink, width=2)
    d.line([(740, 0), (740, H)], fill=ink, width=2)

    # Top running header
    f_meta = font("IBMPlexMono_700Bold.ttf", 15)
    draw_tracked(d, (32, 26), "BAD ACTORS // EP.01 // J.D. VANCE", f_meta, ink, 2.0)
    draw_style_pill_stamp(d, 1, "Swiss Broadsheet", 772, 21, red, paper)
    draw_tracked(d, (1690, 26), "01 / BIO" if variant == "A" else "04 / RHETORIC", f_meta, ink, 2.0)

    # Photo tag block bottom-left
    d.rectangle((0, 938, 740, 992), fill=ink)
    draw_tracked(
        d, (28, 955),
        "FIG. 01 — OFFICIAL WHITE HOUSE PORTRAIT (2025)" if variant == "A" else "FIG. 06 — CBS VICE PRESIDENTIAL DEBATE (2024)",
        font("IBMPlexMono_500Medium.ttf", 15), paper, 1.4,
    )

    # Right column monumental stacked Archivo Black headline with snappy line-reveal
    f_big = font("ArchivoBlack_400Regular.ttf", 96)
    headlines = (
        ["BORROWED", "FLANNEL,", "ELITE POWER."]
        if variant == "A"
        else ["92.6% VAGUE", "SWEEPING", "CLAIMS."]
    )
    y_cur = 114
    for idx, line in enumerate(headlines):
        p = snap_out_quint((anim_t - idx * 0.03) / 0.16)
        y_off = int((1.0 - p) * 28)
        col = red if (idx == 2 and variant == "A") or (idx == 0 and variant == "B") else ink
        draw_tracked(d, (792, y_cur + y_off), line, f_big, col, -3.0)
        y_cur += 94

    d.line([(792, 424), (1864, 424)], fill=ink, width=3)

    rows = (
        [
            ("01", "MIDDLETOWN -> YALE LAW", "USMC combat correspondent, Ohio State '09, Yale Law J.D. '13."),
            ("02", "PETER THIEL PATRONAGE", "Mithril Capital principal; $15M Super PAC launched Senate bid."),
            ("03", "FASTEST RISE IN MODERN U.S.", "Just 2 years, 7 days in Senate before becoming 50th Vice President."),
        ]
        if variant == "A"
        else [
            ("92.6%", "UNQUANTIFIED RHETORIC", "126 of 136 audited sentences rely on anecdotes or broad assertions."),
            ("25M", "FALSE HOUSING STATISTIC", "Doubled actual ~11M DHS undocumented total on the CBS debate stage."),
            ("IOU", "DEFERRED EVIDENCE", "Promised moderators to post a Fed study 'on social media' later."),
        ]
    )
    f_num = font("ArchivoBlack_400Regular.ttf", 38)
    f_rt = font("PlusJakartaSans_800ExtraBold.ttf", 23)
    f_rd = font("PlusJakartaSans_500Medium.ttf", 20)
    ry = 454
    for tag, title, desc in rows:
        draw_tracked(d, (792, ry + 4), tag, f_num, red, -1.0)
        draw_tracked(d, (956, ry), title, f_rt, ink, 0.5)
        d.text((956, ry + 34), desc, font=f_rd, fill=muted)
        d.line([(792, ry + 148), (1864, ry + 148)], fill=hex_rgb("#D6D2C6"), width=2)
        ry += 168

    # Clean typeset bottom caption strip aligned to the x=740 Swiss vertical rule
    f_sub_lbl = font("IBMPlexMono_700Bold.ttf", 16)
    f_sub = font("PlusJakartaSans_700Bold.ttf", 21)
    draw_tracked(d, (32, 1026), "NARRATION // AI VOICEOVER TRACK", f_sub_lbl, red, 1.6)
    cap = (
        '"After Hillbilly Elegy brought fame, he served two years in the Senate..."'
        if variant == "A"
        else '"In our transcript audit, 92.6% of Vance\'s sentences rely on sweeping claims..."'
    )
    draw_tracked(d, (792, 1022), cap, f_sub, ink, 0.0)
    return img


def render_02_literary_review(sheets: dict, photos: dict, variant: str, anim_t: float) -> Image.Image:
    """02: THE LITERARY REVIEW — New Yorker / NYRB high-contrast Playfair Black + italic crimson."""
    img = sheets["02"].copy()
    d = ImageDraw.Draw(img)
    ink = hex_rgb("#171513")
    muted = hex_rgb("#5C564E")
    crimson = hex_rgb("#8C1D18")
    paper = hex_rgb("#F7F3EA")

    # Double-rule literary masthead
    d.line([(88, 52), (1832, 52)], fill=ink, width=3)
    d.line([(88, 59), (1832, 59)], fill=ink, width=1)
    f_mast = font("IBMPlexMono_700Bold.ttf", 14)
    draw_tracked(d, (88, 72), "THE BAD ACTORS REVIEW  ·  ISSUE NO. 01", f_mast, ink, 2.2)
    draw_style_pill_stamp(d, 2, "The Literary Review", 740, 66, crimson, paper)
    draw_tracked(d, (1518, 72), "SUBJECT: J.D. VANCE (R-OH)", f_mast, ink, 2.0)
    d.line([(88, 106), (1832, 106)], fill=ink, width=1)

    # Right Oxford-framed sepia-press portrait (x=1256..1832, y=144..936)
    ph = photos[("02_a" if variant == "A" else "02_b")]
    d.rectangle((1246, 134, 1832, 916), outline=ink, width=2)
    d.rectangle((1254, 142, 1824, 908), outline=ink, width=1)
    img.paste(ph, (1258, 146))
    f_cap = font("LibreBaskerville_400Regular_Italic.ttf", 16)
    d.text(
        (1254, 928),
        "Vance at the 2017 National Book Festival." if variant == "A" else "Vance addressing Munich Security Conference, 2025.",
        font=f_cap, fill=muted,
    )

    # Left giant Playfair Display Black + Italic Crimson pull-head
    f_disp = font("PlayfairDisplay_900Black.ttf", 96)
    f_ital = font("PlayfairDisplay_900Black_Italic.ttf", 98)
    if variant == "A":
        draw_tracked(d, (88, 138), "The Radical", f_disp, ink, -2.0)
        draw_tracked(d, (88, 236), "Inversion", f_ital, crimson, -1.5)
        draw_tracked(d, (575, 238), "of 2021.", f_disp, ink, -2.0)
        ul_w = int(455 * snap_out_quint(anim_t / 0.18))
        d.rectangle((88, 352, 88 + ul_w, 358), fill=crimson)
    else:
        draw_tracked(d, (88, 138), "Saying the", f_disp, ink, -2.0)
        draw_tracked(d, (88, 236), "Quiet Part", f_ital, crimson, -1.5)
        draw_tracked(d, (615, 238), "Aloud.", f_disp, ink, -2.0)
        ul_w = int(495 * snap_out_quint(anim_t / 0.18))
        d.rectangle((88, 352, 88 + ul_w, 358), fill=crimson)

    # 2-column literary comparison / essay ledger below (x=88..618 | x=662..1192)
    d.line([(88, 392), (1196, 392)], fill=ink, width=2)
    d.line([(640, 412), (640, 936)], fill=hex_rgb("#CFC8B8"), width=1)

    f_kicker = font("IBMPlexMono_700Bold.ttf", 15)
    f_subh = font("PlayfairDisplay_900Black.ttf", 30)
    f_body = font("LibreBaskerville_400Regular.ttf", 20)

    if variant == "A":
        cols = [
            (88, "I. 2016 COMMENTATOR", '"America\'s Hitler?"',
             'In 2016, Vance called Donald Trump "cultural heroin" and "unfit for highest office," scolding Rust Belt voters who blamed immigrants or Chinese trade.'),
            (668, "II. 2024 STANDARD-BEARER", '"Last Best Hope"',
             'Seeking a Senate seat in 2021, he inverted every premise—recasting America as a blood-and-soil homeland besieged by migrants and coastal elites.'),
        ]
    else:
        cols = [
            (88, "I. APPELLATE AGGRESSION", '"Margaret, the Rules..."',
             'Trained at Yale Law, Vance wraps hardline claims in polite suburban softeners—then scolds moderators the instant they check his math.'),
            (668, "II. THE CONFESSION", '"If I Have to Create Stories"',
             'Pressed by CNN\'s Dana Bash on false Springfield rumors, Vance admitted openly that fabricating media narratives is deliberate strategy.'),
        ]

    for cx, kick, head, body in cols:
        draw_tracked(d, (cx, 414), kick, f_kicker, crimson, 1.8)
        draw_tracked(d, (cx, 448), head, f_subh, ink, -0.5)
        y_line = 508
        for ln in wrap_tracked(d, body, f_body, 510, 0.0):
            d.text((cx, y_line), ln, font=f_body, fill=ink)
            y_line += 34

    d.line([(88, 976), (1832, 976)], fill=ink, width=1)
    f_foot = font("LibreBaskerville_700Bold.ttf", 19)
    d.text(
        (88, 1004),
        "“By 2021, seeking Trump’s endorsement, he reversed every premise overnight.”"
        if variant == "A"
        else "“If I have to create stories so the media pays attention, that’s what I’m going to do.”",
        font=f_foot, fill=ink,
    )
    return img


def render_03_declassified_dossier(sheets: dict, photos: dict, variant: str, anim_t: float) -> Image.Image:
    """03: DECLASSIFIED DOSSIER — Archival manila eggshell, registration marks, giant Oswald + redaction bars."""
    img = sheets["03"].copy()
    d = ImageDraw.Draw(img)
    ink = hex_rgb("#141413")
    muted = hex_rgb("#524E46")
    red = hex_rgb("#C92A2A")
    paper = hex_rgb("#F2EDE2")

    draw_registration_marks(d, (42, 42, W - 42, H - 42), ink, 11)

    # Top archival case bar
    d.rectangle((76, 56, 1844, 104), fill=ink)
    f_tab = font("IBMPlexMono_700Bold.ttf", 16)
    draw_tracked(d, (96, 70), "CASE FILE: BA-01  //  SUBJECT: VANCE, J.D.  //  STATUS: AUDIT COMPLETE", f_tab, paper, 1.8)
    draw_style_pill_stamp(d, 3, "Declassified Dossier", 1365, 65, red, paper)

    # Mounted archival exhibit photo on left (x=76..636, y=140..932)
    ph = photos[("03_a" if variant == "A" else "03_b")]
    d.rectangle((76, 140, 636, 932), outline=ink, width=2)
    img.paste(ph, (86, 184))
    d.rectangle((76, 140, 636, 184), fill=ink)
    draw_tracked(
        d, (94, 152),
        "EXHIBIT A-02 · RNC MILWAUKEE" if variant == "A" else "EXHIBIT B-09 · U.S. CAPITOL",
        font("IBMPlexMono_700Bold.ttf", 15), paper, 1.6,
    )
    draw_registration_marks(d, (86, 184, 626, 922), red, 8)

    # Right monumental condensed Oswald Bold header
    f_osw = font("Oswald_700Bold.ttf", 112)
    if variant == "A":
        draw_tracked(d, (692, 122), "POSTLIBERAL", f_osw, ink, -1.5)
        draw_tracked(d, (692, 236), "ANTI-REGIME PLAN", f_osw, red, -1.5)
    else:
        draw_tracked(d, (692, 122), "POPULIST TALK", f_osw, ink, -1.5)
        draw_tracked(d, (692, 236), "VS. ELITE WALK", f_osw, red, -1.5)

    d.line([(692, 386), (1844, 386)], fill=ink, width=4)

    items = (
        [
            ("SOURCE 01 // DENEEN", "SELF-DESCRIBED 'EXPLICITLY ANTI-REGIME' POSTLIBERAL", "Rejects classical liberalism in favor of traditionalist hierarchy."),
            ("SOURCE 02 // YARVIN", "'FIRE EVERY MID-LEVEL BUREAUCRAT IN WASHINGTON'", "Urged defying courts: 'let the Chief Justice enforce his own ruling.'"),
            ("SOURCE 03 // SOIL", "'AMERICA IS NOT JUST AN IDEA — IT IS A HOMELAND'", "2024 RNC climax anchored nationhood in 7-generation burial plots."),
        ]
        if variant == "A"
        else [
            ("AUDIT 01 // DONORS", "$15,000,000 THIEL PAC + CEOS #1 OCCUPATION", "Railed against Wall Street barons while funded by Silicon Valley executives."),
            ("AUDIT 02 // SENATE", "0 OF 57 BILLS ENACTED  ·  13.6% MISSED VOTES", "0% AFL-CIO labor score vs. 83% anti-tax Club for Growth score."),
            ("AUDIT 03 // VP TIES", "8 SENATE TIE-BREAKERS  ·  MEDICAID 'MINUTIAE'", "Enacted reconciliation cuts he once called a 'moral failure' in 2017."),
        ]
    )
    f_k = font("IBMPlexMono_700Bold.ttf", 15)
    f_h = font("Oswald_700Bold.ttf", 34)
    f_p = font("IBMPlexMono_500Medium.ttf", 18)

    ry = 414
    reveal_p = snap_out_quint(anim_t / 0.20)
    for k, h_txt, p_txt in items:
        d.rectangle((692, ry, 945, ry + 26), fill=red)
        draw_tracked(d, (702, ry + 4), k, f_k, paper, 1.0)
        draw_tracked(d, (692, ry + 34), h_txt, f_h, ink, 0.2)
        d.text((692, ry + 84), p_txt, font=f_p, fill=muted)
        # Snappy receding black ink redaction bar on entry
        if reveal_p < 0.99:
            bar_x = int(692 + (1844 - 692) * reveal_p)
            d.rectangle((bar_x, ry + 34, 1844, ry + 80), fill=ink)
        d.line([(692, ry + 132), (1844, ry + 132)], fill=ink, width=1)
        ry += 162

    draw_tracked(
        d, (76, 988),
        "TRANSCRIPT STAMP // VERBATIM CORPUS SCAN (2016–2026) // 06:00 FULL EPISODE",
        font("IBMPlexMono_700Bold.ttf", 17), ink, 1.5,
    )
    return img


def render_04_criterion_monograph(sheets: dict, photos: dict, variant: str, anim_t: float) -> Image.Image:
    """04: CRITERION MONOGRAPH — 45% gallery alabaster whitespace, borderless portrait, sculptural Syne."""
    img = sheets["04"].copy()
    d = ImageDraw.Draw(img)
    ink = hex_rgb("#121212")
    muted = hex_rgb("#64615A")
    cobalt = hex_rgb("#1D4ED8")
    paper = hex_rgb("#F8F6F1")

    # Whisper-quiet wide-tracked museum running header
    f_tiny = font("IBMPlexMono_700Bold.ttf", 13)
    draw_tracked(d, (108, 64), "BAD ACTORS", f_tiny, ink, 5.0)
    draw_style_pill_stamp(d, 4, "Criterion Monograph", 720, 56, cobalt, paper)
    draw_tracked(d, (1580, 64), "MONOGRAPH NO. 01", f_tiny, muted, 4.0)

    # Borderless warm-editorial film portrait floating in generous whitespace (x=108..608)
    ph = photos[("04_a" if variant == "A" else "04_b")]
    img.paste(ph, (108, 178))
    draw_tracked(d, (108, 864), "01 — J.D. VANCE", f_tiny, cobalt, 3.5)

    # Seamless paper-grained knockout notch overlapping right edge of portrait + monumental Syne ExtraBold
    img.paste(sheets["04"].crop((548, 198, 616, 540)), (548, 198))
    f_syne = font("Syne_800ExtraBold.ttf", 84)
    if variant == "A":
        lines = ["PRETENDING", "IS THE", "ARCHITECTURE."]
    else:
        lines = ["ZERO OF 57", "SENATE BILLS", "ENACTED."]

    for i, ln in enumerate(lines):
        col = cobalt if i == 2 else ink
        draw_tracked(d, (572, 210 + i * 96), ln, f_syne, col, -2.5)

    d.line([(652, 558), (976, 558)], fill=ink, width=3)

    f_sg_b = font("SpaceGrotesk_700Bold.ttf", 26)
    f_sg_m = font("SpaceGrotesk_500Medium.ttf", 22)
    if variant == "A":
        thesis_h = "The Biographical Shield (Oct 2024 CBS Debate)"
        thesis_p = (
            "Pressed on Iran, healthcare, energy, and abortion, Vance opened every "
            "answer with childhood trauma—converting authentic Middletown memory into "
            "moral immunity before routing every crisis to a single scapegoat."
        )
    else:
        thesis_h = "Legislative Output vs. Executive Loyalty (2023–2026)"
        thesis_p = (
            "Across two years in the Senate, Vance enacted zero sponsored laws and "
            "missed 13.6% of roll-call votes—then cast eight Vice Presidential "
            "tie-breakers, dismissing millions losing Medicaid as 'minutiae.'"
        )

    draw_tracked(d, (652, 600), thesis_h, f_sg_b, ink, -0.3)
    ty = 654
    for ln in wrap_tracked(d, thesis_p, f_sg_m, 1120, 0.0):
        d.text((652, ty), ln, font=f_sg_m, fill=muted)
        ty += 36

    # Minimalist baseline progress hair-line at very bottom
    d.line([(108, 1008), (1812, 1008)], fill=hex_rgb("#DEDAD0"), width=2)
    d.line([(108, 1008), (740 if variant == "A" else 1520, 1008)], fill=cobalt, width=3)
    return img


def render_05_poster_brutalist(sheets: dict, photos: dict, variant: str, anim_t: float) -> Image.Image:
    """05: POSTER BRUTALIST — Thick 4px black frame, monumental 148px Anton banner, halftone ink."""
    img = sheets["05"].copy()
    d = ImageDraw.Draw(img)
    ink = hex_rgb("#0D0D0D")
    orange = hex_rgb("#E03C1F")
    paper = hex_rgb("#F1ECE1")

    # Outer 4px brutalist frame
    d.rectangle((48, 48, 1872, 1032), outline=ink, width=5)
    d.line([(48, 118), (1872, 118)], fill=ink, width=4)
    d.line([(48, 412), (1872, 412)], fill=ink, width=5)
    d.line([(680, 412), (680, 1032)], fill=ink, width=4)
    d.line([(1276, 412), (1276, 1032)], fill=ink, width=4)

    # Top masthead strip
    d.rectangle((48, 48, 480, 118), fill=orange)
    f_mono = font("IBMPlexMono_700Bold.ttf", 18)
    draw_tracked(d, (72, 71), "BAD ACTORS · EPISODE 01", f_mono, paper, 1.5)
    draw_style_pill_stamp(d, 5, "Poster Brutalist", 510, 68, ink, paper)
    draw_tracked(d, (1520, 71), "VANCE, J.D. // 06:00", f_mono, ink, 1.5)

    # Giant 152px Anton uppercase poster banner
    f_anton = font("Anton_400Regular.ttf", 154)
    banner_txt = "THE BUZZWORD ENGINE." if variant == "A" else "CHAMELEON IN FLANNEL."
    draw_tracked(d, (76, 146), banner_txt, f_anton, ink, 1.0)

    # Cell 1 (x=48..680, y=412..1032): Halftone ink photo
    ph = photos[("05_a" if variant == "A" else "05_b")]
    img.paste(ph, (53, 417))
    d.rectangle((53, 976, 676, 1028), fill=ink)
    draw_tracked(
        d, (72, 991),
        "CORPUS SCAN · 2,951 WORDS" if variant == "A" else "FINAL VERDICT · 2017 VS. 2026",
        font("IBMPlexMono_700Bold.ttf", 16), paper, 1.4,
    )

    # Cell 2 (x=680..1276, y=412..1032): Giant Anton stat callout
    f_stat = font("Anton_400Regular.ttf", 164)
    f_lbl = font("SpaceGrotesk_700Bold.ttf", 28)
    f_sub = font("SpaceGrotesk_500Medium.ttf", 21)
    if variant == "A":
        draw_tracked(d, (718, 444), "7.4 / 1K", f_stat, orange, -1.0)
        draw_tracked(d, (718, 676), "FAMILY & 'MAMAW'", f_lbl, ink, 0.5)
        txt2 = "Top lexical cluster across 7 speeches & debates—ahead of Workers (4.8), Illegal Aliens (4.8), and Experts (4.8)."
    else:
        draw_tracked(d, (712, 456), "0% / 83%", font("Anton_400Regular.ttf", 136), orange, -1.5)
        draw_tracked(d, (718, 676), "AFL-CIO VS. CLUB FOR GROWTH", f_lbl, ink, 0.2)
        txt2 = "Ranked 5th furthest-right economic voting record in the U.S. Senate despite pro-worker convention speeches."

    sy = 732
    for ln in wrap_tracked(d, txt2, f_sub, 516, 0.0):
        d.text((718, sy), ln, font=f_sub, fill=ink)
        sy += 33

    # Cell 3 (x=1276..1872, y=412..1032): Solid International Orange block with stark black ink typeset
    d.rectangle((1280, 416, 1868, 1028), fill=orange)
    f_c3h = font("Anton_400Regular.ttf", 64)
    f_c3b = font("SpaceGrotesk_700Bold.ttf", 24)
    if variant == "A":
        draw_tracked(d, (1314, 448), "CODE SWITCHES:", f_c3h, ink, 0.5)
        bullets = [
            "• 'COMMON SENSE' (2.6/1k) waves away CBO & Wharton math.",
            "• 'CENSORSHIP' (3.7/1k) flips Jan. 6 & EU norms onto critics.",
            "• 'LOOK,' & 'FRANKLY' soften nativist terms in polite speech.",
        ]
    else:
        draw_tracked(d, (1314, 448), "SELF-PROPHECY:", f_c3h, ink, 0.5)
        bullets = [
            "• 2017 NYT Op-Ed: warned GOP Medicaid cuts betrayed voters.",
            "• 2025 VP Tie-Breaker: passed those exact Medicaid cuts.",
            "• 2026 VP Tie-Breaker: backed Venezuela military action.",
        ]
    by = 562
    for b in bullets:
        for ln in wrap_tracked(d, b, f_c3b, 510, 0.0):
            d.text((1314, by), ln, font=f_c3b, fill=paper)
            by += 34
        by += 26
    return img


def render_06_financial_broadsheet(sheets: dict, photos: dict, variant: str, anim_t: float) -> Image.Image:
    """06: FINANCIAL BROADSHEET — FT warm oat-eggshell, claret masthead, Fraunces Black + razor bar ledger."""
    img = sheets["06"].copy()
    d = ImageDraw.Draw(img)
    ink = hex_rgb("#1A1715")
    muted = hex_rgb("#59514A")
    claret = hex_rgb("#9E1B32")
    navy = hex_rgb("#0F5499")
    paper = hex_rgb("#F5EDE2")

    # Thick 7px Claret broadsheet top bar
    d.rectangle((76, 44, 1844, 52), fill=claret)
    f_meta = font("IBMPlexMono_700Bold.ttf", 14)
    draw_tracked(d, (76, 68), "BAD ACTORS DATA DESK  ·  LEXICAL & LEGISLATIVE AUDIT", f_meta, claret, 2.0)
    draw_style_pill_stamp(d, 6, "Financial Broadsheet", 730, 62, claret, paper)
    draw_tracked(d, (1530, 68), "EPISODE 01 · J.D. VANCE", f_meta, ink, 1.8)
    d.line([(76, 104), (1844, 104)], fill=ink, width=1)

    # Full-width spanning Fraunces Black headline
    f_fr = font("Fraunces_900Black.ttf", 84)
    f_sub = font("PlusJakartaSans_500Medium.ttf", 23)
    if variant == "A":
        draw_tracked(d, (76, 118), "A Disciplined Six-Pillar Buzzword Engine", f_fr, ink, -2.0)
        d.text((76, 224), "Mentions per 1,000 words across RNC keynote, CBS debate, Munich address & media Q&As (n = 2,951 words)", font=f_sub, fill=muted)
    else:
        draw_tracked(d, (76, 118), "Where the Concrete Numbers Collapse", f_fr, ink, -2.0)
        d.text((76, 224), "Only 7.4% of audited sentences cite specific figures—and flagship stage numbers fail verification", font=f_sub, fill=muted)

    d.line([(76, 274), (1844, 274)], fill=ink, width=2)

    # Left compact portrait + dossier spec box (x=76..536, y=304..956)
    ph = photos[("06_a" if variant == "A" else "06_b")]
    img.paste(ph, (76, 304))
    d.rectangle((76, 304, 536, 824), outline=ink, width=1)
    d.text((76, 842), "J.D. Vance (50th Vice President)", font=font("Fraunces_700Bold.ttf", 22), fill=ink)
    d.text((76, 874), "Corpus: 7 verbatim transcripts (2016–2026)", font=font("PlusJakartaSans_500Medium.ttf", 18), fill=muted)
    d.text((76, 902), "Post-2021 sample: 136 sentences", font=font("PlusJakartaSans_500Medium.ttf", 18), fill=muted)

    # Right razor-sharp FT-style horizontal data ledger (x=596..1844, y=304..956)
    bar_p = snap_out_quint(anim_t / 0.18)
    f_row = font("PlusJakartaSans_800ExtraBold.ttf", 23)
    f_note = font("PlusJakartaSans_500Medium.ttf", 18)
    f_val = font("Fraunces_900Black.ttf", 34)

    if variant == "A":
        bars = [
            ('Family / Children / "Mamaw"', "Emotional anchor & pronatalist credential", 7.4, claret),
            ('Workers / "Working Man"', "Blue-collar class signifier", 4.8, ink),
            ('Open Border / "Illegal Aliens"', "Universal culprit for housing & budgets", 4.8, claret),
            ('Ruling Class / "Experts"', "Discredits economists, courts & press", 4.8, navy),
            ("Tariffs / Made in USA", "All-purpose industrial cure-all", 4.1, ink),
            ('"Censorship" / Free Speech', "Flips Jan. 6 & EU norms onto critics", 3.7, navy),
        ]
        ry = 308
        for lbl, note, val, col in bars:
            d.text((596, ry), lbl, font=f_row, fill=ink)
            d.text((1015, ry + 4), f"— {note}", font=f_note, fill=muted)
            draw_tracked(d, (1712, ry - 4), f"{val:.1f}", f_val, col, -0.5)
            # Crisp unrounded 14px print bar on hairline track
            d.line([(596, ry + 48), (1844, ry + 48)], fill=hex_rgb("#D8CFC2"), width=2)
            bw = int((val / 8.2) * 1100 * bar_p)
            d.rectangle((596, ry + 40, 596 + bw, ry + 55), fill=col)
            ry += 108
    else:
        claims = [
            ('"25 million illegal aliens competing for homes"', "FALSE", "More than double ~11M DHS & Pew undocumented total.", claret),
            ('"Donald Trump salvaged Obamacare"', "FALSE", "Trump backed ACA repeal; Vance himself condemned 2017 GOP bill.", claret),
            ('"Iran received over $100B in unfrozen assets"', "FALSE", "No $100B transfer existed; $6B humanitarian account unspent.", claret),
            ('"Federal Reserve study we\'ll put on social media"', "DEFERRED", "Rhetorical IOU when pressed for empirical housing proof.", navy),
        ]
        ry = 316
        for q, verd, real, col in claims:
            d.rectangle((596, ry + 4, 744, ry + 36), fill=col)
            draw_tracked(d, (612, ry + 10), verd, font("IBMPlexMono_700Bold.ttf", 16), paper, 1.5)
            d.text((768, ry + 2), q, font=f_row, fill=ink)
            d.text((768, ry + 38), real, font=font("PlusJakartaSans_500Medium.ttf", 20), fill=muted)
            d.line([(596, ry + 124), (1844, ry + 124)], fill=hex_rgb("#D8CFC2"), width=2)
            ry += 156

    d.line([(76, 992), (1844, 992)], fill=ink, width=2)
    draw_tracked(d, (76, 1016), "SOURCE: BAD ACTORS TRANSCRIPT CORPUS ANALYZER  ·  SECTION 03 & 04", f_meta, muted, 1.6)
    return img


def render_07_bauhaus_constructivist(sheets: dict, photos: dict, variant: str, anim_t: float) -> Image.Image:
    """07: BAUHAUS CONSTRUCTIVIST — Solid black spine, geometric red/ochre color blocks, League Spartan Black."""
    img = sheets["07"].copy()
    d = ImageDraw.Draw(img)
    ink = hex_rgb("#111111")
    red = hex_rgb("#D12B1E")
    ochre = hex_rgb("#D98218")
    paper = hex_rgb("#F5F1E6")

    # Left solid black chapter spine (x=0..118)
    d.rectangle((0, 0, 118, H), fill=ink)
    f_ch = font("LeagueSpartan_900Black.ttf", 28)
    active_ch = 2 if variant == "A" else 3
    for idx in range(1, 6):
        cy = 80 + (idx - 1) * 190
        if idx == active_ch:
            d.rectangle((0, cy - 18, 118, cy + 56), fill=red)
        draw_tracked(d, (36, cy), f"0{idx}", f_ch, paper, 1.0)

    # Top constructivist bar
    draw_style_pill_stamp(d, 7, "Bauhaus Constructivist", 168, 48, red, paper)
    draw_tracked(d, (1480, 54), "BAD ACTORS · PROFILE 01", font("IBMPlexMono_700Bold.ttf", 15), ink, 2.0)
    d.line([(168, 96), (1856, 96)], fill=ink, width=4)

    # Geometric offset color-blocks framing halftone portrait (x=188..716, y=156..920)
    d.rectangle((168, 136, 560, 520), fill=red if variant == "A" else ochre)
    d.rectangle((360, 560, 740, 944), fill=ink)
    ph = photos[("07_a" if variant == "A" else "07_b")]
    img.paste(ph, (192, 160))
    d.rectangle((192, 160, 716, 920), outline=ink, width=4)

    # Right stepped geometric League Spartan Black typography (x=792..1856)
    f_sp = font("LeagueSpartan_900Black.ttf", 100)
    if variant == "A":
        steps = [("BLOOD & SOIL", ink, 0), ("OVER CIVIC", red, 36), ("CREED.", ink, 72)]
        cards = [
            (red, "NATION AS GRAVEYARD", '2024 RNC climax defined America not as an idea, but a Kentucky burial plot.'),
            (ochre, "EXECUTIVE SUPREMACY", 'Feb 2025: declared "judges aren\'t allowed to control executive power."'),
        ]
    else:
        steps = [("COMMON SENSE", ink, 0), ("AS AN ELITE", ochre, 36), ("SHIELD.", red, 72)]
        cards = [
            (ink, '2.6 / 1K "COMMON SENSE"', 'Deployed on CBS stage to wave away PhD economists & $5.8T deficit math.'),
            (red, '3.7 / 1K "CENSORSHIP"', 'Flips Jan. 6 election refusal & Munich far-right firewalls onto critics.'),
        ]

    sy = 140
    for txt, col, indent in steps:
        draw_tracked(d, (792 + indent, sy), txt, f_sp, col, -2.5)
        sy += 102

    # Crisp sharp-cornered geometric blocks below
    cy = 500
    f_bh = font("LeagueSpartan_900Black.ttf", 28)
    f_bp = font("PlusJakartaSans_700Bold.ttf", 21)
    for badge_col, bh, bp in cards:
        d.rectangle((792, cy, 816, cy + 172), fill=badge_col)
        d.rectangle((816, cy, 1856, cy + 172), outline=ink, width=3)
        draw_tracked(d, (848, cy + 24), bh, f_bh, badge_col if badge_col != ink else ink, 0.5)
        ty = cy + 72
        for ln in wrap_tracked(d, bp, f_bp, 960, 0.0):
            d.text((848, ty), ln, font=f_bp, fill=ink)
            ty += 32
        cy += 206

    # Constructivist bottom rule
    d.rectangle((168, 988, 1856, 994), fill=ink)
    draw_tracked(d, (168, 1012), "GEOMETRIC EDITORIAL GRID  //  ZERO ROUNDED CORNERS  //  SNAPPY BLOCK WIPE", font("IBMPlexMono_700Bold.ttf", 15), ink, 1.8)
    return img


def render_08_oxford_transcript(sheets: dict, photos: dict, variant: str, anim_t: float) -> Image.Image:
    """08: OXFORD DEBATE TRANSCRIPT — Numbered court margin, Bodoni Moda Black, yellow marker highlight."""
    img = sheets["08"].copy()
    d = ImageDraw.Draw(img)
    ink = hex_rgb("#141414")
    muted = hex_rgb("#57554E")
    forest = hex_rgb("#14532D")
    yellow = hex_rgb("#FACC15")
    paper = hex_rgb("#F7F5EE")

    # Left courtroom brief line-number gutter (x=0..124)
    d.line([(124, 0), (124, H)], fill=ink, width=2)
    f_ln = font("IBMPlexMono_500Medium.ttf", 14)
    for i in range(1, 26):
        ly = 36 + (i - 1) * 41
        draw_tracked(d, (52, ly), f"{i:02d}", f_ln, hex_rgb("#9CA3AF"), 1.0)

    # Header
    draw_style_pill_stamp(d, 8, "Oxford Debate Transcript", 168, 44, forest, paper)
    draw_tracked(d, (1390, 50), "VERBATIM Q&A RECORD · 2024–2025", font("IBMPlexMono_700Bold.ttf", 15), forest, 1.8)
    d.line([(168, 92), (1856, 92)], fill=ink, width=2)

    # Monumental Bodoni Moda Black headline with natural typographic spacing
    f_bod = font("BodoniModa_900Black.ttf", 92)
    f_bodi = font("BodoniModa_900Black_Italic.ttf", 92)
    if variant == "A":
        nx = draw_tracked(d, (168, 108), "Procedural", f_bod, ink, -2.0)
        draw_tracked(d, (nx + 28, 108), "Aggression.", f_bodi, forest, -1.5)
    else:
        nx = draw_tracked(d, (168, 108), "“If I Have to", f_bod, ink, -2.0)
        draw_tracked(d, (nx + 28, 108), "Create Stories.”", f_bodi, forest, -1.5)

    d.line([(168, 238), (1856, 238)], fill=ink, width=1)

    # Portrait on left of brief (x=168..668, y=272..948)
    ph = photos[("08_a" if variant == "A" else "08_b")]
    img.paste(ph, (168, 272))
    d.rectangle((168, 272, 668, 948), outline=ink, width=2)

    # Verbatim court-style Q&A blocks with snappy yellow marker strike (x=720..1856)
    hl_p = snap_out_quint(anim_t / 0.22)
    f_ctx = font("IBMPlexMono_700Bold.ttf", 16)
    f_q = font("LibreBaskerville_400Regular.ttf", 25)
    f_qb = font("LibreBaskerville_700Bold.ttf", 26)

    if variant == "A":
        exchanges = [
            (
                "EXCHANGE 01 · CBS VP DEBATE (OCT 1, 2024 — ON SPRINGFIELD LEGAL STATUS)",
                "“Margaret, the rules were that ",
                "you guys weren't going to fact-check,",
                " and since you're fact-checking me, I think it's important to say what's actually going on.”",
            ),
            (
                "EXCHANGE 02 · OVAL OFFICE (FEB 28, 2025 — TO PRES. VOLODYMYR ZELENSKYY)",
                "“In this entire meeting, ",
                "have you said thank you once?",
                " You went to Pennsylvania and campaigned for the opposition in October.”",
            ),
        ]
    else:
        exchanges = [
            (
                "EXCHANGE 03 · CNN STATE OF THE UNION (SEPT 15, 2024 — TO DANA BASH)",
                "“The American media totally ignored this stuff until Donald Trump and I started talking about cat memes. ",
                "If I have to create stories",
                " so that the American media actually pays attention, then that's what I'm going to do, Dana.”",
            ),
            (
                "EXCHANGE 04 · 61ST MUNICH SECURITY CONFERENCE (FEB 14, 2025)",
                "“The threat that I worry the most about vis-à-vis Europe is not Russia, it's not China — what I worry about is ",
                "the threat from within.”",
                " (Demanding allies drop firewalls against far-right parties.)",
            ),
        ]

    qy = 286
    for ctx, pre, hi, post in exchanges:
        draw_tracked(d, (720, qy), ctx, f_ctx, forest, 1.0)
        # Render wrapped paragraph with bold yellow highlighter band behind `hi`
        full = pre + hi + post
        lines = wrap_tracked(d, full, f_q, 1100, 0.0)
        ly = qy + 42
        for ln in lines:
            if hi in ln or any(tok in ln for tok in [hi[:18], hi[-18:]]):
                # Highlight the matching span on this line
                sub = hi if hi in ln else (hi[:18] if hi[:18] in ln else hi[-18:])
                idx = ln.find(sub)
                if idx >= 0:
                    x_start = 720 + int(f_q.getlength(ln[:idx]))
                    w_span = int(f_q.getlength(sub) * hl_p)
                    d.rectangle((x_start - 3, ly - 1, x_start + w_span + 3, ly + 33), fill=yellow)
            d.text((720, ly), ln, font=f_q, fill=ink)
            ly += 42
        d.line([(720, qy + 286), (1856, qy + 286)], fill=hex_rgb("#D4D0C4"), width=2)
        qy += 328

    draw_tracked(d, (168, 996), "COURTROOM BRIEF MARGIN  ·  BODONI MODA BLACK  ·  VERBATIM HIGHLIGHT STRIKE", f_ctx, ink, 1.5)
    return img


def render_09_magazine_spread(sheets: dict, photos: dict, variant: str, anim_t: float) -> Image.Image:
    """09: MAGAZINE SPREAD — 50% zero-margin full-bleed photo + 50% open eggshell + Instrument Serif Italic."""
    img = sheets["09"].copy()
    d = ImageDraw.Draw(img)
    ink = hex_rgb("#111111")
    muted = hex_rgb("#57534A")
    verm = hex_rgb("#C8321E")
    paper = hex_rgb("#F4F1EA")

    # Left 50% FULL-BLEED zero-margin photograph (x=0..936, y=0..1080)
    ph = photos[("09_a" if variant == "A" else "09_b")]
    img.paste(ph, (0, 0))

    # Subtle book center-fold shadow/rule at x=936
    d.line([(936, 0), (936, H)], fill=ink, width=2)
    d.line([(942, 0), (942, H)], fill=hex_rgb("#DED9CC"), width=1)

    # Top folio on right page
    draw_style_pill_stamp(d, 9, "Magazine Spread", 1016, 56, verm, paper)
    draw_tracked(d, (1660, 62), "FOLIO 09 · P.14", font("IBMPlexMono_700Bold.ttf", 14), muted, 2.0)

    # Mixed Plus Jakarta Sans ExtraBold + huge Instrument Serif Italic display typography
    f_sans = font("PlusJakartaSans_800ExtraBold.ttf", 78)
    f_serif_i = font("InstrumentSerif_400Regular_Italic.ttf", 124)

    if variant == "A":
        draw_tracked(d, (1016, 134), "AMERICA AS", f_sans, ink, -2.5)
        draw_tracked(d, (1016, 214), "Homeland,", f_serif_i, verm, -1.0)
        draw_tracked(d, (1016, 344), "NOT AN IDEA.", f_sans, ink, -2.5)
        pull = (
            "At the 2024 Republican Convention, Vance redefined American citizenship "
            "around seven generations in an eastern Kentucky graveyard—fusing warm "
            "Mamaw nostalgia with hardline border exclusion."
        )
        stat_l, stat_r = ("1984", "Born Middletown, OH"), ("50TH", "U.S. Vice President")
    else:
        draw_tracked(d, (1016, 134), "MEDICAID AS", f_sans, ink, -2.5)
        draw_tracked(d, (1016, 214), "“Minutiae”", f_serif_i, verm, -1.0)
        draw_tracked(d, (1016, 344), "IN OFFICE.", f_sans, ink, -2.5)
        pull = (
            "When Senate analysts warned the One Big Beautiful Bill Act would strip "
            "health coverage from millions of working-poor Americans, Vice President "
            "Vance waved the losses away—then cast three tie-breaking votes to pass it."
        )
        stat_l, stat_r = ("8 VOTES", "VP Senate Tie-Breakers"), ("$15M", "Peter Thiel Super PAC")

    d.line([(1016, 458), (1840, 458)], fill=ink, width=2)

    f_body = font("LibreBaskerville_400Regular.ttf", 22)
    by = 496
    for ln in wrap_tracked(d, pull, f_body, 810, 0.0):
        d.text((1016, by), ln, font=f_body, fill=ink)
        by += 38

    # Two minimalist editorial callout figures at bottom of right page
    d.line([(1016, 768), (1840, 768)], fill=hex_rgb("#D5CFC2"), width=2)
    d.line([(1428, 768), (1428, 948)], fill=hex_rgb("#D5CFC2"), width=2)
    f_big_i = font("InstrumentSerif_400Regular_Italic.ttf", 84)
    f_cap = font("PlusJakartaSans_700Bold.ttf", 18)
    draw_tracked(d, (1016, 784), stat_l[0], f_big_i, verm, -1.0)
    d.text((1016, 886), stat_l[1], font=f_cap, fill=ink)
    draw_tracked(d, (1456, 784), stat_r[0], f_big_i, ink, -1.0)
    d.text((1456, 886), stat_r[1], font=f_cap, fill=ink)

    draw_tracked(d, (1016, 996), "BAD ACTORS: HOW POLITICIANS PRETEND  ·  EPISODE 01", font("IBMPlexMono_700Bold.ttf", 14), muted, 1.8)
    return img


def render_10_kinetic_letterpress(sheets: dict, photos: dict, variant: str, anim_t: float) -> Image.Image:
    """10: KINETIC LETTERPRESS — Typography-dominant 124px press sheet + watermark numeral + stomp words."""
    img = sheets["10"].copy()
    d = ImageDraw.Draw(img)
    ink = hex_rgb("#121110")
    muted = hex_rgb("#57524A")
    ultra = hex_rgb("#1E3A8A")
    paper = hex_rgb("#F6F2E9")

    # Giant subtle watermark numeral pressed into cotton sheet
    f_wm = font("ArchivoBlack_400Regular.ttf", 410)
    draw_tracked(d, (64, 340), "01" if variant == "A" else "05", f_wm, hex_rgb("#EAE3D3"), -12.0)

    # Top letterpress rule
    d.line([(76, 88), (1844, 88)], fill=ink, width=3)
    draw_style_pill_stamp(d, 10, "Kinetic Letterpress", 76, 40, ultra, paper)
    draw_tracked(d, (1390, 48), "BAD ACTORS · LETTERPRESS EDITION", font("IBMPlexMono_700Bold.ttf", 15), ink, 1.8)

    # Mechanical 4-frame stomp scale (1.08 -> 1.00) on giant headline lines
    stomp = snap_out_quint(anim_t / 0.13)
    sz = int(116 * (1.08 - 0.08 * stomp))
    f_lp = font("ArchivoBlack_400Regular.ttf", sz)
    f_lpi = font("PlayfairDisplay_900Black_Italic.ttf", sz + 4)

    if variant == "A":
        draw_tracked(d, (76, 118), "HOW", f_lp, ink, -3.5)
        draw_tracked(d, (412, 110), "Politicians", f_lpi, ultra, -2.0)
        draw_tracked(d, (76, 240), "PRETEND:", f_lp, ink, -3.5)
        draw_tracked(d, (76, 362), "J.D. VANCE.", f_lp, ultra, -3.5)
        deck = "FIVE CHAPTERS  ·  SIX MINUTES  ·  SPEECHES, DEBATES, VOTES & TIE-BREAKERS"
        stomp_words = ["MIDDLETOWN", "->", "YALE LAW", "->", "THIEL VC", "->", "VICE PRESIDENT"]
    else:
        draw_tracked(d, (76, 118), "HE WROTE", f_lp, ink, -3.5)
        draw_tracked(d, (76, 236), "The Critique", f_lpi, ultra, -2.0)
        draw_tracked(d, (76, 362), "HIMSELF.", f_lp, ink, -3.5)
        deck = "VERDICT: SELLING BILLIONAIRE DEREGULATION IN WORKING-CLASS VERNACULAR"
        stomp_words = ["ELITE", "DEREGULATION", "IN", "BORROWED", "FLANNEL."]

    d.line([(76, 514), (1330, 514)], fill=ink, width=4)
    draw_tracked(d, (76, 536), deck, font("IBMPlexMono_700Bold.ttf", 18), ink, 1.5)

    # Structured 2-block summary under deck (x=76..1330, y=598..856)
    f_sh = font("PlusJakartaSans_800ExtraBold.ttf", 24)
    f_sp = font("PlusJakartaSans_500Medium.ttf", 20)
    boxes = (
        [
            ("01–03 · IDEOLOGY & LEXICON", "Postliberal 'anti-regime' theory packaged inside Mamaw, family (7.4/1k), and 'common sense' (2.6/1k)."),
            ("04–05 · RHETORIC & RECORD", "92.6% sweeping assertions on stage vs. 0/57 bills passed and 8 VP Senate tie-breakers in office."),
        ]
        if variant == "A"
        else [
            ("2017 SELF-INDICTMENT", "Warned Republicans were 'mired in internal contradictions' cutting healthcare for working-poor voters."),
            ("2025–2026 EXECUTION", "Cast deciding Senate tie-breakers for Medicaid cuts and Venezuela military action."),
        ]
    )
    for bi, (bh, bp) in enumerate(boxes):
        bx = 76 + bi * 640
        d.line([(bx, 598), (bx + 596, 598)], fill=ultra, width=3)
        draw_tracked(d, (bx, 616), bh, f_sh, ultra, 0.4)
        ty = 658
        for ln in wrap_tracked(d, bp, f_sp, 588, 0.0):
            d.text((bx, ty), ln, font=f_sp, fill=ink)
            ty += 31

    # Upper-right stamp-framed portrait (x=1396..1844, y=124..856)
    ph = photos[("10_a" if variant == "A" else "10_b")]
    d.rectangle((1388, 116, 1844, 856), fill=ink)
    img.paste(ph, (1398, 126))
    d.rectangle((1398, 792, 1834, 846), fill=ultra)
    draw_tracked(
        d, (1416, 810),
        "SUBJECT 01 · J.D. VANCE (VPOTUS)",
        font("IBMPlexMono_700Bold.ttf", 15), paper, 1.2,
    )

    # Bottom bold letterpress Kinetic Word Strip (replaces bootleg digital subtitle pill!)
    d.rectangle((76, 896, 1844, 1018), fill=ink)
    f_kw = font("ArchivoBlack_400Regular.ttf", 38)
    kx = 108
    active_idx = min(len(stomp_words) - 1, int((anim_t / 2.2) * len(stomp_words)))
    for wi, w_tok in enumerate(stomp_words):
        is_hi = (wi == active_idx)
        tw = int(measure_tracked(d, w_tok, f_kw, -1.0))
        if is_hi:
            d.rectangle((kx - 8, 922, kx + tw + 8, 992), fill=ultra)
        draw_tracked(d, (kx, 932), w_tok, f_kw, paper, -1.0)
        kx += tw + 30
    return img


RENDERERS = [
    ("01-swiss-broadsheet", "01 · Swiss Broadsheet", render_01_swiss_broadsheet),
    ("02-literary-review", "02 · The Literary Review", render_02_literary_review),
    ("03-declassified-dossier", "03 · Declassified Dossier", render_03_declassified_dossier),
    ("04-criterion-monograph", "04 · Criterion Monograph", render_04_criterion_monograph),
    ("05-poster-brutalist", "05 · Poster Brutalist", render_05_poster_brutalist),
    ("06-financial-broadsheet", "06 · Financial Broadsheet", render_06_financial_broadsheet),
    ("07-bauhaus-constructivist", "07 · Bauhaus Constructivist", render_07_bauhaus_constructivist),
    ("08-oxford-transcript", "08 · Oxford Debate Transcript", render_08_oxford_transcript),
    ("09-magazine-spread", "09 · Magazine Spread", render_09_magazine_spread),
    ("10-kinetic-letterpress", "10 · Kinetic Letterpress", render_10_kinetic_letterpress),
]


def compose_snappy_transition(idx: int, img_a: Image.Image, img_b: Image.Image, p: float) -> Image.Image:
    """Apply each appearance's bespoke 4-to-6-frame snappy transition between Slide A & Slide B."""
    c = max(0.0, min(1.0, p))
    s = snap_in_out_expo(c)

    if idx == 0:
        # 01 Swiss Broadsheet: Hard Vermilion + Black Guillotine Shutter Wipe
        out = img_a.copy()
        split_x = int(W * s)
        if split_x > 0:
            out.paste(img_b.crop((0, 0, split_x, H)), (0, 0))
        d = ImageDraw.Draw(out)
        d.rectangle((max(0, split_x - 28), 0, min(W, split_x + 8), H), fill=hex_rgb("#D62818"))
        d.rectangle((min(W, split_x + 8), 0, min(W, split_x + 16), H), fill=hex_rgb("#111111"))
        return out

    if idx == 1:
        # 02 Literary Review: Broadsheet Right-to-Left Page-Sheet Snap
        out = img_a.copy()
        sheet_x = int(W * (1.0 - s))
        out.paste(img_b.crop((0, 0, W - sheet_x, H)), (sheet_x, 0))
        d = ImageDraw.Draw(out)
        d.line([(sheet_x, 0), (sheet_x, H)], fill=hex_rgb("#8C1D18"), width=4)
        return out

    if idx == 2:
        # 03 Declassified Dossier: Solid Black Ink Redaction Bar Slam & Snap-Open
        base = img_a.copy() if c < 0.5 else img_b.copy()
        d = ImageDraw.Draw(base)
        cover = 1.0 - abs(c * 2.0 - 1.0)
        bar_w = int(1200 * snap_out_quint(cover))
        for ry in (122, 236, 430, 592, 754):
            d.rectangle((692, ry, 692 + bar_w, ry + 92), fill=hex_rgb("#141413"))
        return base

    if idx == 3:
        # 04 Criterion Monograph: 35mm Splice Negative Flash Jump-Cut (3 frames!)
        if 0.28 <= c <= 0.62:
            arr = 255 - np.asarray(img_b, dtype=np.uint8)
            return Image.fromarray(arr, mode="RGB")
        return img_a if c < 0.28 else img_b

    if idx == 4:
        # 05 Poster Brutalist: Opposing Split-Shutter Slam (top right->left, bottom down->up)
        out = img_a.copy()
        top_x = int(W * (1.0 - s))
        out.paste(img_b.crop((0, 0, W - top_x, 412)), (top_x, 0))
        bot_y = int(412 + (H - 412) * (1.0 - s))
        out.paste(img_b.crop((0, 412, W, H - (bot_y - 412))), (0, bot_y))
        return out

    if idx == 5:
        # 06 Financial Broadsheet: Claret Masthead Vertical Curtain Snap
        out = img_a.copy()
        cy = int(H * s)
        if cy > 0:
            out.paste(img_b.crop((0, 0, W, cy)), (0, 0))
        d = ImageDraw.Draw(out)
        d.rectangle((0, max(0, cy - 10), W, min(H, cy + 4)), fill=hex_rgb("#9E1B32"))
        return out

    if idx == 6:
        # 07 Bauhaus Constructivist: Geometric Red Block Full-Frame Sweep
        base = img_a.copy() if c < 0.5 else img_b.copy()
        d = ImageDraw.Draw(base)
        if c < 0.5:
            x1 = int(W * (c * 2.0))
            d.rectangle((0, 0, x1, H), fill=hex_rgb("#D12B1E"))
        else:
            x0 = int(W * ((c - 0.5) * 2.0))
            d.rectangle((x0, 0, W, H), fill=hex_rgb("#D12B1E"))
        return base

    if idx == 7:
        # 08 Oxford Transcript: Instant Hard Brief Cut (0f) + Marker Highlight Strike handled by anim_t
        return img_b

    if idx == 8:
        # 09 Magazine Spread: Left Full-Bleed Hard Cut + Right Eggshell Page Vertical Snap
        out = img_b.copy()
        if s < 1.0:
            ry = int(H * (1.0 - s))
            out.paste(img_a.crop((938, 0, W, ry)), (938, 0))
            d = ImageDraw.Draw(out)
            d.line([(938, ry), (W, ry)], fill=hex_rgb("#C8321E"), width=4)
        return out

    # 10 Kinetic Letterpress: Instant Press Sheet Cut + 4-frame Mechanical Stomp
    return img_b


def build_lookbook_audio(total_sec: float, out_wav: str):
    """Build crisp 50s audio bed: real J.D. Vance voiceover excerpts + tactile shutter/paper snaps."""
    sr = 44100
    n_total = int(total_sec * sr)
    left = np.zeros(n_total, dtype=np.float64)
    right = np.zeros(n_total, dtype=np.float64)

    # Extract first 50s of master episode audio as subtle voiceover context
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp_wav = tmp.name
    try:
        subprocess.run(
            [FFMPEG, "-y", "-v", "error", "-ss", "0", "-t", str(total_sec), "-i", MASTER_MP3,
             "-ac", "2", "-ar", str(sr), "-c:a", "pcm_s16le", tmp_wav],
            check=True,
        )
        with wave.open(tmp_wav, "rb") as w:
            raw = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64) / 32768.0
        stereo = raw.reshape(-1, 2)
        m = min(n_total, len(stereo))
        left[:m] = stereo[:m, 0] * 0.85
        right[:m] = stereo[:m, 1] * 0.85
    finally:
        if os.path.exists(tmp_wav):
            os.remove(tmp_wav)

    # Add tactile mechanical shutter / letterpress snap at every style cut (0, 5, 10...) and mid-slot transition (+2.4s)
    rng = np.random.default_rng(2026)
    for slot in range(10):
        for offset, amp in [(slot * SLOT_SEC, 0.34), (slot * SLOT_SEC + 2.40, 0.28)]:
            s_i = int(offset * sr)
            dur = int(0.055 * sr)
            e_i = min(n_total, s_i + dur)
            if e_i > s_i:
                t = np.arange(e_i - s_i, dtype=np.float64) / sr
                click = (
                    0.65 * rng.normal(0.0, 1.0, len(t)) * np.exp(-t * 140.0)
                    + 0.45 * np.sin(2 * math.pi * 190.0 * t) * np.exp(-t * 85.0)
                ) * amp
                left[s_i:e_i] += click
                right[s_i:e_i] += click * 0.95

    fade = int(0.8 * sr)
    left[-fade:] *= np.linspace(1.0, 0.0, fade)
    right[-fade:] *= np.linspace(1.0, 0.0, fade)

    interleaved = np.empty(n_total * 2, dtype=np.int16)
    interleaved[0::2] = np.clip(left * 32767.0, -32768, 32767).astype(np.int16)
    interleaved[1::2] = np.clip(right * 32767.0, -32768, 32767).astype(np.int16)
    with wave.open(out_wav, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(interleaved.tobytes())


def main():
    os.makedirs(OUT_APPEAR_DIR, exist_ok=True)
    os.makedirs(os.path.dirname(OUT_LOOKBOOK_MP4), exist_ok=True)

    print("Prebuilding tactile eggshell paper stocks & editorial photo grades...")
    sheets = {
        "01": build_eggshell_sheet("#F6F4EE", 101),
        "02": build_eggshell_sheet("#F7F3EA", 102),
        "03": build_eggshell_sheet("#F2EDE2", 103),
        "04": build_eggshell_sheet("#F8F6F1", 104),
        "05": build_eggshell_sheet("#F1ECE1", 105),
        "06": build_eggshell_sheet("#F5EDE2", 106),
        "07": build_eggshell_sheet("#F5F1E6", 107),
        "08": build_eggshell_sheet("#F7F5EE", 108),
        "09": build_eggshell_sheet("#F4F1EA", 109),
        "10": build_eggshell_sheet("#F6F2E9", 110),
    }

    photos = {
        "01_a": grade_editorial_photo("01-official-vp-portrait.jpg", 740, 920, "silver-bw", "#F6F4EE"),
        "01_b": grade_editorial_photo("06-vp-debate-cbs.jpg", 740, 920, "silver-bw", "#F6F4EE"),
        "02_a": grade_editorial_photo("02-hillbilly-elegy-2017.jpg", 562, 758, "sepia-press", "#F7F3EA", x_bias=0.38),
        "02_b": grade_editorial_photo("08-munich-podium-2025.jpg", 562, 758, "sepia-press", "#F7F3EA"),
        "03_a": grade_editorial_photo("04-rnc-speech-pointing.jpg", 540, 738, "silver-bw", "#F2EDE2"),
        "03_b": grade_editorial_photo("03-capitol-2017.jpg", 540, 738, "silver-bw", "#F2EDE2"),
        "04_a": grade_editorial_photo("06-vp-debate-cbs.jpg", 500, 668, "warm-editorial", "#F8F6F1"),
        "04_b": grade_editorial_photo("03-capitol-2017.jpg", 500, 668, "warm-editorial", "#F8F6F1"),
        "05_a": grade_editorial_photo("07-munich-qa-mic.jpg", 623, 610, "halftone-ink", "#F1ECE1"),
        "05_b": grade_editorial_photo("01-official-vp-portrait.jpg", 623, 610, "halftone-ink", "#F1ECE1"),
        "06_a": grade_editorial_photo("07-munich-qa-mic.jpg", 460, 520, "warm-editorial", "#F5EDE2"),
        "06_b": grade_editorial_photo("06-vp-debate-cbs.jpg", 460, 520, "warm-editorial", "#F5EDE2"),
        "07_a": grade_editorial_photo("05-rnc-speech-gesture.jpg", 524, 760, "halftone-ink", "#F5F1E6"),
        "07_b": grade_editorial_photo("08-munich-podium-2025.jpg", 524, 760, "halftone-ink", "#F5F1E6"),
        "08_a": grade_editorial_photo("06-vp-debate-cbs.jpg", 500, 676, "silver-bw", "#F7F5EE"),
        "08_b": grade_editorial_photo("08-munich-podium-2025.jpg", 500, 676, "silver-bw", "#F7F5EE"),
        "09_a": grade_editorial_photo("04-rnc-speech-pointing.jpg", 936, 1080, "warm-editorial", "#F4F1EA"),
        "09_b": grade_editorial_photo("01-official-vp-portrait.jpg", 936, 1080, "warm-editorial", "#F4F1EA"),
        "10_a": grade_editorial_photo("01-official-vp-portrait.jpg", 436, 720, "silver-bw", "#F6F2E9"),
        "10_b": grade_editorial_photo("05-rnc-speech-gesture.jpg", 436, 720, "silver-bw", "#F6F2E9"),
    }

    # 1. Save 10 crisp 1080p Hero Style Boards + 2x5 Overview Grid
    hero_boards: list[Image.Image] = []
    for slug, label, fn in RENDERERS:
        board = fn(sheets, photos, "A", 1.0)
        out_png = os.path.join(OUT_APPEAR_DIR, f"{slug}.png")
        board.save(out_png, format="PNG", optimize=True)
        hero_boards.append(board)
        print(f"  Saved style board: {out_png}")

    # Build 2x5 contact sheet at 2560x1120 so all 10 are visible at a glance
    grid_w, grid_h = 2560, 1180
    cell_w, cell_h = 492, 277
    grid = Image.new("RGB", (grid_w, grid_h), hex_rgb("#EAE5DA"))
    gd = ImageDraw.Draw(grid)
    draw_tracked(
        gd, (36, 20),
        "BAD ACTORS: HOW POLITICIANS PRETEND  —  10 MINIMALIST EGGSHELL & BOLD TYPESET APPEARANCES",
        font("ArchivoBlack_400Regular.ttf", 30), hex_rgb("#111111"), -0.5,
    )
    for idx, (board, (_, label, _)) in enumerate(zip(hero_boards, RENDERERS)):
        col_i = idx % 5
        row_i = idx // 5
        gx = 36 + col_i * (cell_w + 15)
        gy = 82 + row_i * (cell_h + 260)
        # Put Slide A on top and Slide B right below or 2 rows of 5
        gy = 84 + row_i * 540
        thumb_a = board.resize((cell_w, cell_h), Image.Resampling.LANCZOS)
        board_b = RENDERERS[idx][2](sheets, photos, "B", 1.0)
        thumb_b = board_b.resize((cell_w, int(cell_h * 0.72)), Image.Resampling.LANCZOS)
        grid.paste(thumb_a, (gx, gy))
        gd.rectangle((gx, gy, gx + cell_w, gy + cell_h), outline=hex_rgb("#111111"), width=2)
        grid.paste(thumb_b, (gx, gy + cell_h + 6))
        gd.rectangle((gx, gy + cell_h + 6, gx + cell_w, gy + cell_h + 6 + int(cell_h * 0.72)), outline=hex_rgb("#78716C"), width=1)
        draw_tracked(gd, (gx, gy + cell_h + int(cell_h * 0.72) + 14), label.upper(), font("IBMPlexMono_700Bold.ttf", 15), hex_rgb("#111111"), 0.8)

    overview_png = os.path.join(OUT_APPEAR_DIR, "00-all-10-appearances-overview.png")
    grid.save(overview_png, format="PNG", optimize=True)
    print(f"  Saved 10-up overview sheet: {overview_png}")

    # 2. Render 50-second 1920x1080 @ 30fps animated showcase MP4 with real snappy transitions
    total_sec = len(RENDERERS) * SLOT_SEC
    total_frames = len(RENDERERS) * SLOT_FRAMES
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_a:
        audio_wav = tmp_a.name

    try:
        build_lookbook_audio(total_sec, audio_wav)
        cmd = [
            FFMPEG, "-y", "-v", "error",
            "-f", "image2pipe", "-vcodec", "mjpeg", "-framerate", str(FPS),
            "-i", "-",
            "-i", audio_wav,
            "-c:v", "libx264", "-preset", "medium", "-crf", "21", "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "192k",
            "-movflags", "+faststart",
            "-shortest",
            OUT_LOOKBOOK_MP4,
        ]
        print(f"Rendering {total_frames} frames ({total_sec:.0f}s @ {FPS}fps) animated lookbook to {OUT_LOOKBOOK_MP4} ...")
        t0 = time.time()
        proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
        assert proc.stdin is not None

        for style_i, (_, label, fn) in enumerate(RENDERERS):
            # Cache static settled frames where anim_t >= 0.30 (except style 10 which updates word stomp)
            settled_a = fn(sheets, photos, "A", 1.0) if style_i != 9 else None
            settled_b = fn(sheets, photos, "B", 1.0) if style_i != 9 else None

            for lf in range(SLOT_FRAMES):
                t_local = lf / FPS
                if lf < 72:
                    # Slide A (snappy entry in first 7 frames)
                    if settled_a is not None and t_local > 0.26:
                        frame = settled_a
                    else:
                        frame = fn(sheets, photos, "A", t_local)
                    # Style-to-style snappy 3-frame flash shutter on lf == 0..2
                    if style_i > 0 and lf < 3:
                        prev_b = RENDERERS[style_i - 1][2](sheets, photos, "B", 1.0)
                        frame = compose_snappy_transition(0, prev_b, frame, (lf + 1) / 3.0)
                elif lf < 78:
                    # 6-frame (0.20s) signature snappy transition Slide A -> Slide B!
                    p = (lf - 71) / 6.0
                    fa = settled_a if settled_a is not None else fn(sheets, photos, "A", 2.3)
                    fb = fn(sheets, photos, "B", (lf - 72) / FPS)
                    frame = compose_snappy_transition(style_i, fa, fb, p)
                else:
                    # Slide B
                    tb = (lf - 72) / FPS
                    if settled_b is not None and tb > 0.30:
                        frame = settled_b
                    else:
                        frame = fn(sheets, photos, "B", tb)

                buf = io.BytesIO()
                frame.save(buf, format="JPEG", quality=93)
                proc.stdin.write(buf.getvalue())

            print(f"  [{style_i + 1:2d}/10] {label} rendered ({time.time() - t0:.1f}s)")

        proc.stdin.close()
        rc = proc.wait()
        if rc != 0:
            sys.exit(rc)
        mb = os.path.getsize(OUT_LOOKBOOK_MP4) / (1024 * 1024)
        print(f"Lookbook MP4 ready: {OUT_LOOKBOOK_MP4} ({mb:.2f} MB)")
    finally:
        if os.path.exists(audio_wav):
            os.remove(audio_wav)


if __name__ == "__main__":
    main()
