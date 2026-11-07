#!/usr/bin/env python3
"""
Standalone 1920x1080 MP4 renderer for 'Bad Actors: How Politicians Pretend'
— Episode 01: J.D. Vance.

HYBRID VISUAL STYLE (user selection):
  Base      : Appearance 01 — Swiss Broadsheet
              Warm eggshell #F6F4EE · carbon-black ink #111111 · signal-vermilion
              accent #D62818 · sharp 2px hairline grid · left full-height
              silver B&W photo bleed · monumental sans typeset.
  Graphs    : Appearance 05 — Poster Brutalist
              Thick black cells · International Orange #E03C1F stats.
  Quotes    : Appearance 08 — Oxford Transcript
              Yellow #FACC15 citation-yellow highlighter strike · serif italic
              verbatim type · line-numbered feel.

Rendered via PIL at 15fps, encoded H.264/AAC at 15fps => 360s (6:00).
"""

import io
import json
import os
import subprocess
import sys
import time
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FFMPEG = os.path.join(ROOT, "node_modules/@remotion/compositor-linux-x64-gnu/ffmpeg")
PUBLIC_DIR = os.path.join(ROOT, "public")
MANIFEST_PATH = os.path.join(ROOT, "runs/bad-actors-ep01-jd-vance/episode-manifest.json")
OUT_MP4 = os.path.join(ROOT, "episodes/bad-actors-ep01-jd-vance.mp4")
PREVIEW_DIR = os.path.join(ROOT, "out/preview-frames")

W, H = 1920, 1080
FPS = 15          # Render step (t = frame / FPS covers 0..360s over 5400 frames)
OUT_FPS = 15      # Encoded frame rate => 5400 frames / 15 = 360s exactly

FONT_DIR = "/usr/share/fonts/truetype/dejavu"
FONT_CACHE: dict = {}

# ---------- Hybrid palette ----------
PAPER        = (246, 244, 238)   # #F6F4EE warm eggshell (01 base)
INK          = (17, 17, 17)      # #111111 carbon black (01 base)
MUTED_INK    = (87, 83, 78)      # #57534E
ACCENT       = (214, 40, 24)     # #D62818 signal vermilion (01 base)
ACCENT_ORANGE = (224, 60, 31)    # #E03C1F international orange (05 graphs)
YELLOW       = (250, 204, 21)    # #FACC15 citation yellow (08 quotes)


def get_font(kind: str, size: int) -> ImageFont.FreeTypeFont:
    key = (kind, size)
    if key not in FONT_CACHE:
        mapping = {
            "bold": "DejaVuSans-Bold.ttf",
            "reg": "DejaVuSans.ttf",
            "mono": "DejaVuSansMono-Bold.ttf",
            "serif": "DejaVuSerif.ttf",
            "serif_bold": "DejaVuSerif-Bold.ttf",
            "serif_italic": "DejaVuSerif-Bold.ttf",
        }
        FONT_CACHE[key] = ImageFont.truetype(os.path.join(FONT_DIR, mapping[kind]), size)
    return FONT_CACHE[key]


def hex_rgb(h: str) -> tuple:
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


def blend_rgb(bg, fg, a):
    a = max(0.0, min(1.0, a))
    return (
        int(bg[0] * (1 - a) + fg[0] * a),
        int(bg[1] * (1 - a) + fg[1] * a),
        int(bg[2] * (1 - a) + fg[2] * a),
    )


def clamp01(v: float) -> float:
    return 0.0 if v < 0.0 else (1.0 if v > 1.0 else v)


def ease_out_cubic(t: float) -> float:
    c = clamp01(t)
    return 1.0 - (1.0 - c) ** 3


def fmt_tc(sec: float) -> str:
    s = max(0, int(sec))
    return f"{s // 60:02d}:{s % 60:02d}"


def wrap_text(draw, text, font, max_w):
    words = text.split()
    if not words:
        return []
    lines, cur = [], words[0]
    for w in words[1:]:
        cand = cur + " " + w
        if draw.textbbox((0, 0), cand, font=font)[2] <= max_w:
            cur = cand
        else:
            lines.append(cur)
            cur = w
    lines.append(cur)
    return lines


def build_base_background() -> Image.Image:
    """Solid warm eggshell with a sharp 2px Swiss hairline grid."""
    img = Image.new("RGB", (W, H), PAPER)
    arr = np.array(img, dtype=np.float32)
    grid = (np.arange(H)[:, None] % 64 == 0) | (np.arange(W)[None, :] % 64 == 0)
    arr[grid] = np.array(MUTED_INK, dtype=np.float32) * 0.5 + np.array(PAPER, dtype=np.float32) * 0.5
    return Image.fromarray(arr.astype(np.uint8), "RGB")


def prepare_photo_crop(src_img, target_w, target_h, zoom, x_bias=0.5):
    """Silver black-and-white cover-crop with a subtle warm eggshell tint."""
    iw, ih = src_img.size
    scale = max(target_w / iw, target_h / ih) * zoom
    nw, nh = max(target_w, int(iw * scale)), max(target_h, int(ih * scale))
    resized = src_img.resize((nw, nh), Image.Resampling.BILINEAR)
    left = int((nw - target_w) * x_bias)
    top = int((nh - target_h) * 0.18)
    cropped = resized.crop((left, top, left + target_w, top + target_h))
    bw = ImageOps.grayscale(cropped).convert("RGB")
    arr = np.array(bw, dtype=np.float32)
    warm = np.array(PAPER, dtype=np.float32)
    arr = arr * 0.80 + warm * 0.20
    return Image.fromarray(arr.astype(np.uint8), "RGB")


# ---------------------------------------------------------------------------
# Header + chapter timeline
# ---------------------------------------------------------------------------
def draw_header_and_chapters(img, draw, episode, t, active_sec):
    # Left badge
    draw.text((64, 24), "BAD ACTORS", font=get_font("bold", 18), fill=INK)
    draw.rectangle((64, 46, 218, 48), fill=ACCENT)  # vermilion underline bar

    title_str = f"HOW POLITICIANS PRETEND  ·  EPISODE 0{episode['episodeNumber']}: VICE PRESIDENT {episode['politician'].upper()}"
    draw.text((250, 24), title_str, font=get_font("bold", 19), fill=INK)

    tc_str = f"{fmt_tc(t)} / {fmt_tc(episode['durationSeconds'])}"
    tc_font = get_font("mono", 18)
    tb = draw.textbbox((0, 0), tc_str, font=tc_font)
    draw.text((W - 64 - (tb[2] - tb[0]), 26), tc_str, font=tc_font, fill=MUTED_INK)

    # 5-segment segmented progress bar (sharp, hairline)
    bar_y = 84
    bar_h = 20
    gap = 10
    bar_x = 64
    total_w = W - 128
    n_sec = len(episode["sections"])
    avail_w = total_w - gap * (n_sec - 1)
    total_dur = episode["durationSeconds"]
    cx = bar_x
    for idx, sec in enumerate(episode["sections"]):
        sw = int(avail_w * (sec["durationSeconds"] / total_dur))
        if idx == n_sec - 1:
            sw = (bar_x + total_w) - cx
        is_cur = sec["id"] == active_sec["id"]
        # segment border
        draw.rectangle((cx, bar_y, cx + sw, bar_y + bar_h), outline=INK, width=2)
        lbl = f"{sec['number']} · {sec['shortLabel']}"
        draw.text((cx + 10, bar_y + 3), lbl, font=get_font("bold", 12),
                  fill=ACCENT if is_cur else MUTED_INK)
        # inner progress track + fill
        tx0, tx1 = cx + 10, cx + sw - 10
        draw.rectangle((tx0, bar_y + 13, tx1, bar_y + 17), fill=(210, 206, 194))
        fill_p = clamp01((t - sec["start"]) / sec["durationSeconds"])
        if fill_p > 0.005:
            fw = max(3, int((tx1 - tx0) * fill_p))
            draw.rectangle((tx0, bar_y + 13, tx0 + fw, bar_y + 17), fill=ACCENT)
        cx += sw + gap


# ---------------------------------------------------------------------------
# Left photo column (full-height silver B&W bleed, sharp corners)
# ---------------------------------------------------------------------------
def draw_photo_column(img, draw, slide, photo_cache, slide_elapsed, slide_dur):
    enter = ease_out_cubic(slide_elapsed / 0.5)
    zoom = 1.0 + 0.05 * clamp01(slide_elapsed / max(slide_dur, 0.1))
    px, py, pw, ph = 64, 146, 556, 766

    def place(pinfo, sy, sh, is_primary):
        crop = prepare_photo_crop(photo_cache[pinfo["src"]], pw, sh, zoom)
        ox = int((1.0 - enter) * 10)
        img.paste(crop, (px + ox, sy))
        # Sharp 2px ink border (no radius)
        draw.rectangle((px + ox, sy, px + ox + pw, sy + sh), outline=INK, width=2)
        # Date tag: black pill, white ink
        tag = pinfo["dateTag"]
        tfont = get_font("bold", 13)
        tb = draw.textbbox((0, 0), tag, font=tfont)
        tw = tb[2] - tb[0] + 20
        draw.rectangle((px + ox + 16, sy + 14, px + ox + 16 + tw, sy + 42), fill=INK)
        draw.text((px + ox + 26, sy + 19), tag, font=tfont, fill=PAPER)
        # Caption: black ink bar at bottom of photo, white text
        cfont = get_font("bold", 15)
        lines = wrap_text(draw, pinfo["caption"], cfont, pw - 34)[:2]
        bar_h = 44 + len(lines) * 20
        draw.rectangle((px + ox, sy + sh - bar_h, px + ox + pw, sy + sh), fill=INK)
        for li, line in enumerate(lines):
            draw.text((px + ox + 18, sy + sh - bar_h + 12 + li * 20), line,
                      font=cfont, fill=PAPER)

    if slide.get("secondaryPhoto"):
        sub_h = (ph - 16) // 2
        place(slide["photo"], py, sub_h, True)
        place(slide["secondaryPhoto"], py + sub_h + 16, sub_h, False)
    else:
        pinfo = slide["photo"]
        xbias = 0.80 if "08-munich" in pinfo["src"] else 0.50
        place(pinfo, py, ph, True)


# ---------------------------------------------------------------------------
# Right slide content (hybrid layouts)
# ---------------------------------------------------------------------------
def draw_slide_content(draw, slide, slide_elapsed, slide_dur):
    rx, ry, rw = 660, 146, 1196
    acc = ACCENT  # global vermilion accent (01 base dominant)

    # Headline + subheadline
    head_p = ease_out_cubic(slide_elapsed / 0.45)
    hy = ry + int((1.0 - head_p) * 14)
    draw.text((rx, hy), slide["headline"], font=get_font("bold", 40), fill=INK)
    draw.text((rx, hy + 48), slide["subheadline"], font=get_font("reg", 19), fill=MUTED_INK)
    draw.rectangle((rx, hy + 82, rx + int(260 * head_p), hy + 86), fill=ACCENT)

    cy = ry + 108
    col_bottom = 944  # content column ends above the subtitle strip (y=978)

    # ---------- bullets (bio / worldview / semantics / verdict) ----------
    if slide.get("bullets"):
        bullets = slide["bullets"]
        n = len(bullets)
        gap = 16
        card_h = min(262, max(150, (col_bottom - cy - gap * (n - 1)) // n))
        for i, b in enumerate(bullets):
            delay = 0.35 + i * (min(slide_dur * 0.48, 11.5) / max(n, 1))
            p = ease_out_cubic((slide_elapsed - delay) / 0.55)
            if p <= 0.02:
                continue
            ox = int((1.0 - p) * 26)
            y0 = cy + i * (card_h + gap)
            # Eggshell card, sharp 2px ink border, vermilion left bar
            draw.rectangle((rx + ox, y0, rx + rw + ox, y0 + card_h), fill=PAPER, outline=INK, width=2)
            draw.rectangle((rx + ox, y0, rx + ox + 7, y0 + card_h), fill=ACCENT)
            tfont = get_font("bold", 12)
            t_font = get_font("bold", 21)
            d_font = get_font("reg", 16)
            dlines = wrap_text(draw, b["detail"], d_font, rw - 210)[:3]
            block_h = 16 + 26 + 30 + len(dlines) * 21
            # Swiss ghosted index numeral fills the card's negative space
            gnum = f"{i + 1:02d}"
            gcol = blend_rgb(PAPER, MUTED_INK, 0.26)
            gfont = get_font("bold", min(104, max(58, card_h - 76)))
            gb = draw.textbbox((0, 0), gnum, font=gfont)
            gw, gh = gb[2] - gb[0], gb[3] - gb[1]
            draw.text((rx + rw + ox - 30 - gw, y0 + (card_h - gh) // 2 - gb[1]),
                      gnum, font=gfont, fill=gcol)
            top = y0 + max(18, (card_h - block_h) // 2)
            draw.text((rx + ox + 22, top), b["tag"], font=tfont, fill=MUTED_INK)
            draw.text((rx + ox + 22, top + 26), b["title"], font=t_font, fill=INK)
            for li, dl in enumerate(dlines):
                draw.text((rx + ox + 22, top + 56 + li * 21), dl, font=d_font, fill=MUTED_INK)

    # ---------- contradictions ----------
    elif slide.get("contradictions"):
        items = slide["contradictions"]
        gap = 18
        card_h = min(268, max(190, (col_bottom - cy - gap * (len(items) - 1)) // len(items)))
        for i, c in enumerate(items):
            delay = 0.4 + i * 3.6
            p = ease_out_cubic((slide_elapsed - delay) / 0.6)
            if p <= 0.02:
                continue
            oy = int((1.0 - p) * 20)
            y0 = cy + i * (card_h + gap) + oy
            draw.rectangle((rx, y0, rx + rw, y0 + card_h), fill=PAPER, outline=INK, width=2)
            draw.text((rx + 22, y0 + 14), c["topic"].upper(), font=get_font("bold", 14), fill=ACCENT)
            col_w = (rw - 100) // 2
            bx0 = rx + 22
            bx1 = bx0 + col_w + 56
            # THEN box
            draw.rectangle((bx0, y0 + 42, bx0 + col_w, y0 + card_h - 16), fill=PAPER, outline=INK, width=2)
            etxt = wrap_text(draw, c["earlierPosition"], get_font("reg", 16), col_w - 30)[:4]
            eblk = 22 + len(etxt) * 22
            eyt = y0 + 42 + max(24, ((card_h - 58) - eblk) // 2)
            draw.text((bx0 + 14, eyt), f"{c['earlierDate']} · THEN", font=get_font("bold", 12), fill=MUTED_INK)
            for li, ln in enumerate(etxt):
                draw.text((bx0 + 14, eyt + 22 + li * 22), ln, font=get_font("reg", 16), fill=INK)
            # Arrow
            draw.text((bx0 + col_w + 20, y0 + 96), "→", font=get_font("bold", 26), fill=ACCENT)
            # NOW box
            draw.rectangle((bx1, y0 + 42, bx1 + col_w, y0 + card_h - 16), fill=PAPER, outline=INK, width=2)
            ntxt = wrap_text(draw, c["laterPosition"], get_font("bold", 16), col_w - 30)[:4]
            nblk = 22 + len(ntxt) * 22
            nyt = y0 + 42 + max(24, ((card_h - 58) - nblk) // 2)
            draw.text((bx1 + 14, nyt), f"{c['laterDate']} · NOW", font=get_font("bold", 12), fill=MUTED_INK)
            for li, ln in enumerate(ntxt):
                draw.text((bx1 + 14, nyt + 22 + li * 22), ln, font=get_font("bold", 16), fill=INK)

    # ---------- buzzword-bars (05 brutalist graph cells) ----------
    elif slide.get("buzzwords"):
        bws = slide["buzzwords"]
        gap = 16
        card_h = min(138, max(94, (col_bottom - cy - gap * (len(bws) - 1)) // len(bws)))
        for i, bw in enumerate(bws):
            delay = 0.35 + i * 1.5
            p = ease_out_cubic((slide_elapsed - delay) / 0.85)
            if p <= 0.02:
                continue
            y0 = cy + i * (card_h + gap)
            # Thick black cell (brutalist), eggshell inside
            draw.rectangle((rx, y0, rx + rw, y0 + card_h), fill=PAPER, outline=INK, width=4)
            lfont = get_font("bold", 22)
            top = y0 + max(10, (card_h - 66) // 2)
            draw.text((rx + 24, top), bw["label"], font=lfont, fill=INK)
            lb = draw.textbbox((0, 0), bw["label"], font=lfont)
            draw.text((rx + 30 + (lb[2] - lb[0]), top + 3), f"— {bw['note']}",
                      font=get_font("reg", 15), fill=MUTED_INK)
            val_str = f"{bw['perThousandWords'] * p:4.1f} / 1k"
            vfont = get_font("bold", 26)
            vb = draw.textbbox((0, 0), val_str, font=vfont)
            draw.text((rx + rw - 24 - (vb[2] - vb[0]), top - 4), val_str, font=vfont, fill=ACCENT_ORANGE)
            # Bar: black track, vermilion fill
            bx0, bx1 = rx + 24, rx + rw - 24
            bh = max(18, min(30, card_h // 4))
            by = top + 44
            draw.rectangle((bx0, by, bx1, by + bh), fill=INK)
            fill_w = max(6, int((bx1 - bx0) * (bw["perThousandWords"] / 8.5) * p))
            draw.rectangle((bx0, by, bx0 + fill_w, by + bh), fill=ACCENT)

    # ---------- specificity-meter ----------
    elif slide.get("specificityStats"):
        st = slide["specificityStats"]
        mp = ease_out_cubic((slide_elapsed - 0.25) / 0.95)
        draw.rectangle((rx, cy, rx + rw, cy + 92), fill=INK, outline=ACCENT, width=3)
        draw.text((rx + 24, cy + 12), f"{st['vaguePercent'] * mp:4.1f}% SWEEPING / ANECDOTAL / UNQUANTIFIED",
                  font=get_font("bold", 17), fill=ACCENT)
        sp_str = f"{st['specificPercent'] * mp:3.1f}% CITED NUMBERS / STATUTES"
        sb = draw.textbbox((0, 0), sp_str, font=get_font("bold", 17))
        draw.text((rx + rw - 24 - (sb[2] - sb[0]), cy + 12), sp_str, font=get_font("bold", 17), fill=ACCENT_ORANGE)
        gx0, gx1 = rx + 24, rx + rw - 24
        gw = gx1 - gx0
        draw.rectangle((gx0, cy + 46, gx1, cy + 72), fill=(210, 206, 194))
        vw = int(gw * (st["vaguePercent"] / 100.0) * mp)
        sw = int(gw * (st["specificPercent"] / 100.0) * mp)
        if vw > 4:
            draw.rectangle((gx0, cy + 46, gx0 + vw, cy + 72), fill=ACCENT)
        if sw > 4:
            draw.rectangle((gx0 + vw, cy + 46, gx0 + vw + sw, cy + 72), fill=ACCENT_ORANGE)
        claims = slide.get("claims", [])
        cl_gap = 16
        cl_h = min(140, max(118, (col_bottom - (cy + 104) - cl_gap * (len(claims) - 1)) // max(1, len(claims))))
        for i, c in enumerate(claims):
            delay = 2.0 + i * 3.6
            p = ease_out_cubic((slide_elapsed - delay) / 0.55)
            if p <= 0.02:
                continue
            ox = int((1.0 - p) * 24)
            y0 = cy + 104 + i * (cl_h + cl_gap)
            draw.rectangle((rx + ox, y0, rx + rw + ox, y0 + cl_h), fill=PAPER, outline=INK, width=2)
            rlines = wrap_text(draw, c["reality"], get_font("reg", 15), rw - 300)[:2]
            blk = 26 + 8 + len(rlines) * 21
            ty = y0 + max(16, (cl_h - blk) // 2)
            draw.text((rx + ox + 22, ty), c["claim"], font=get_font("bold", 18), fill=INK)
            vcol = ACCENT_ORANGE if c["verdict"] == "Deferred" else ACCENT
            vtxt = c["verdict"].upper()
            vf = get_font("bold", 14)
            vb = draw.textbbox((0, 0), vtxt, font=vf)
            vw_box = vb[2] - vb[0] + 26
            vx = rx + rw + ox - 22 - vw_box
            vy = y0 + (cl_h - 36) // 2
            draw.rectangle((vx, vy, vx + vw_box, vy + 36), outline=vcol, width=2)
            draw.text((vx + 13, vy + 8), vtxt, font=vf, fill=vcol)
            for li, ln in enumerate(rlines):
                draw.text((rx + ox + 22, ty + 34 + li * 21), ln, font=get_font("reg", 15), fill=MUTED_INK)

    # ---------- verbatim-quotes (08 Oxford: yellow highlighter, serif italic) ----------
    elif slide.get("quotes"):
        quotes = slide["quotes"]
        gap = 18
        card_h = min(238, max(200, (col_bottom - cy - gap * (len(quotes) - 1)) // len(quotes)))
        line_no = 1
        for i, q in enumerate(quotes):
            delay = 0.5 + i * 7.2
            p = ease_out_cubic((slide_elapsed - delay) / 0.65)
            if p <= 0.02:
                continue
            oy = int((1.0 - p) * 20)
            y0 = cy + i * (card_h + gap) + oy
            draw.rectangle((rx, y0, rx + rw, y0 + card_h), fill=PAPER, outline=INK, width=2)
            # tiny line-number gutter on the left (Oxford feel)
            draw.text((rx + 14, y0 + 18), f"{line_no:02d}", font=get_font("mono", 12), fill=MUTED_INK)
            line_no += 1
            draw.text((rx + 42, y0 + 16), q["context"], font=get_font("bold", 12), fill=ACCENT)
            qfont = get_font("serif_italic", 26)
            lines = wrap_text(draw, q["quote"], qfont, rw - 110)[:4]
            q_block = 34 + len(lines) * 36
            qy0 = y0 + max(40, (card_h - q_block) // 2 + 6)
            hl_lower = q["highlight"].lower()
            hl_p = ease_out_cubic((slide_elapsed - (delay + 0.8)) / 0.8)
            for li, ln in enumerate(lines):
                ly = qy0 + li * 36
                idx = ln.lower().find(hl_lower)
                if idx != -1 and hl_p > 0.05:
                    pre = ln[:idx]
                    mat = ln[idx:idx + len(q["highlight"])]
                    pre_w = draw.textbbox((0, 0), pre, font=qfont)[2] if pre else 0
                    mat_w = draw.textbbox((0, 0), mat, font=qfont)[2]
                    hl_bg = blend_rgb(PAPER, YELLOW, 0.55 * hl_p)
                    draw.rectangle((rx + 40 + pre_w - 4, ly - 3, rx + 40 + pre_w + mat_w + 6, ly + 24), fill=hl_bg)
                draw.text((rx + 42, ly), ln, font=qfont, fill=INK)

    # ---------- record-scorecard ----------
    elif slide.get("scorecard"):
        rows = slide["scorecard"]
        gap = 14
        card_h = min(158, max(112, (col_bottom - cy - gap * (len(rows) - 1)) // len(rows)))
        for i, row in enumerate(rows):
            delay = 0.4 + i * 3.4
            p = ease_out_cubic((slide_elapsed - delay) / 0.55)
            if p <= 0.02:
                continue
            ox = int((1.0 - p) * 24)
            y0 = cy + i * (card_h + gap)
            draw.rectangle((rx + ox, y0, rx + rw + ox, y0 + card_h), fill=PAPER, outline=INK, width=2)
            draw.text((rx + ox + 22, y0 + 14), row["metric"].upper(), font=get_font("bold", 12), fill=MUTED_INK)
            draw.text((rx + ox + 24, y0 + 40), row["value"], font=get_font("bold", 23), fill=ACCENT)
            clines = wrap_text(draw, row["rhetoricContrast"], get_font("reg", 15), rw - 640)[:3]
            start_y = y0 + (card_h - len(clines) * 20) // 2
            for li, cl in enumerate(clines):
                draw.text((rx + ox + 600, start_y + li * 20), cl, font=get_font("reg", 15), fill=INK)


# ---------------------------------------------------------------------------
# Subtitle strip (eggshell bg, ink text, vermilion active word)
# ---------------------------------------------------------------------------
def draw_subtitle_strip(draw, slide, t):
    s_start, s_end = slide["speechStart"], slide["speechEnd"]
    if t < s_start - 0.15 or t > s_end + 0.4:
        return
    words = [w for w in slide["narration"].split() if w]
    if not words:
        return
    rel = clamp01((t - s_start) / max(0.1, s_end - s_start))
    active_idx = min(len(words) - 1, int(rel * len(words)))
    chunk_size = 11
    c_start = (active_idx // chunk_size) * chunk_size
    vis = words[c_start:c_start + chunk_size]

    draw.rounded_rectangle((64, 978, W - 64, 1048), radius=10, fill=PAPER, outline=INK, width=2)
    reg_f = get_font("bold", 22)
    widths, space_w = [], 12
    for w in vis:
        b = draw.textbbox((0, 0), w, font=reg_f)
        widths.append(b[2] - b[0])
    total_tw = sum(widths) + space_w * (len(vis) - 1)
    cx = (W - total_tw) // 2
    for idx, (w, ww) in enumerate(zip(vis, widths)):
        is_cur = (c_start + idx) == active_idx
        if is_cur:
            draw.rounded_rectangle((cx - 6, 992, cx + ww + 6, 1034), radius=5, fill=ACCENT)
        draw.text((cx, 1000), w, font=reg_f, fill=PAPER if is_cur else INK)
        cx += ww + space_w


# ---------------------------------------------------------------------------
# Section bumper (eggshell overlay, ink title, vermilion rule)
# ---------------------------------------------------------------------------
def draw_section_bumper(img, active_sec, sec_elapsed):
    if sec_elapsed >= 1.25:
        return
    alpha = 0.94 if sec_elapsed < 0.88 else 0.94 * (1.0 - (sec_elapsed - 0.88) / 0.37)
    if alpha <= 0.02:
        return
    overlay = Image.new("RGB", (W, H), PAPER)
    d = ImageDraw.Draw(overlay)
    sub = f"SECTION {active_sec['number']}  ·  {active_sec['durationSeconds']} SECONDS"
    sf = get_font("bold", 20)
    sb = d.textbbox((0, 0), sub, font=sf)
    d.text(((W - (sb[2] - sb[0])) // 2, 430), sub, font=sf, fill=ACCENT)
    tf = get_font("bold", 62)
    tb = d.textbbox((0, 0), active_sec["title"], font=tf)
    d.text(((W - (tb[2] - tb[0])) // 2, 472), active_sec["title"], font=tf, fill=INK)
    d.rectangle(((W - 160) // 2, 560, (W + 160) // 2, 566), fill=ACCENT)
    blended = Image.blend(img, overlay, alpha)
    img.paste(blended, (0, 0))


# ---------------------------------------------------------------------------
# Main render loop
# ---------------------------------------------------------------------------
def main():
    with open(MANIFEST_PATH, "r") as f:
        episode = json.load(f)

    os.makedirs(os.path.dirname(OUT_MP4), exist_ok=True)
    os.makedirs(PREVIEW_DIR, exist_ok=True)

    base_bg = build_base_background()

    photo_cache: dict = {}
    for sl in episode["slides"]:
        for key in ("photo", "secondaryPhoto"):
            if sl.get(key):
                rel = sl[key]["src"]
                if rel not in photo_cache:
                    photo_cache[rel] = Image.open(os.path.join(PUBLIC_DIR, rel)).convert("RGB")

    audio_mp3 = os.path.join(PUBLIC_DIR, episode["audioSrc"])
    total_frames = int(episode["durationSeconds"] * FPS)

    cmd = [
        FFMPEG, "-y", "-v", "error",
        "-f", "image2pipe", "-vcodec", "mjpeg", "-framerate", str(FPS),
        "-i", "-",
        "-i", audio_mp3,
        "-c:v", "libx264", "-preset", "medium", "-crf", "23", "-pix_fmt", "yuv420p",
        "-r", str(OUT_FPS),
        "-c:a", "aac", "-b:a", "192k",
        "-movflags", "+faststart",
        "-shortest",
        OUT_MP4,
    ]

    sample_timestamps = {8.0: "01-bio.png", 74.0: "03-contradictions.png", 106.0: "04-buzzwords.png",
                         212.0: "07-specificity.png", 295.0: "09-record.png"}
    saved_samples = set()

    print(f"Rendering {total_frames} frames ({episode['durationSeconds']}s @ {FPS}fps -> {OUT_FPS}fps output, 1920x1080) to {OUT_MP4} ...")
    t0 = time.time()
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    assert proc.stdin is not None

    sections = episode["sections"]
    slides = episode["slides"]

    for f_idx in range(total_frames):
        t = f_idx / FPS
        active_sec = sections[-1]
        for s in sections:
            if s["start"] <= t < s["end"]:
                active_sec = s
                break

        active_slide = slides[-1]
        for sl in slides:
            if sl["start"] <= t < sl["end"]:
                active_slide = sl
                break

        frame_img = base_bg.copy()
        draw = ImageDraw.Draw(frame_img)

        draw_header_and_chapters(frame_img, draw, episode, t, active_sec)
        s_elapsed = max(0.0, t - active_slide["start"])
        s_dur = max(0.1, active_slide["end"] - active_slide["start"])
        draw_photo_column(frame_img, draw, active_slide, photo_cache, s_elapsed, s_dur)
        draw_slide_content(draw, active_slide, s_elapsed, s_dur)
        draw_subtitle_strip(draw, active_slide, t)
        draw_section_bumper(frame_img, active_sec, max(0.0, t - active_sec["start"]))

        for st_sec, fname in sample_timestamps.items():
            if fname not in saved_samples and abs(t - st_sec) <= (0.5 / FPS):
                frame_img.save(os.path.join(PREVIEW_DIR, fname))
                saved_samples.add(fname)

        buf = io.BytesIO()
        frame_img.save(buf, format="JPEG", quality=90)
        proc.stdin.write(buf.getvalue())
        if (f_idx + 1) % 900 == 0 or f_idx + 1 == total_frames:
            elapsed = time.time() - t0
            pct = (f_idx + 1) / total_frames * 100
            print(f"  [{pct:5.1f}%] frame {f_idx+1}/{total_frames} ({elapsed:.1f}s elapsed)")

    proc.stdin.close()
    rc = proc.wait()
    if rc != 0:
        sys.exit(rc)
    sz_mb = os.path.getsize(OUT_MP4) / 1024 / 1024
    print(f"Done in {time.time() - t0:.1f}s -> {OUT_MP4} ({sz_mb:.2f} MB)")


if __name__ == "__main__":
    main()
