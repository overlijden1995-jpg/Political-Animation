#!/usr/bin/env python3
"""
Standalone 1920x1080 MP4 renderer for 'Bad Actors: How Politicians Pretend'.

Reads the approved episode manifest (`runs/bad-actors-ep01-jd-vance/episode-manifest.json`)
and master AI voiceover (`public/bad-actors/ep01-jd-vance/audio/episode-master.mp3`),
renders animated slides, Ken Burns politician photographs, kinetic text reveals,
buzzword bar charts, specificity meters, verbatim quote highlighters, voting
scorecards, and word-synced subtitles, and encodes H.264 + AAC MP4 via Remotion's
bundled FFmpeg binary.
"""

import io
import json
import math
import os
import subprocess
import sys
import time
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FFMPEG = os.path.join(ROOT, "node_modules/@remotion/compositor-linux-x64-gnu/ffmpeg")
PUBLIC_DIR = os.path.join(ROOT, "public")
MANIFEST_PATH = os.path.join(ROOT, "runs/bad-actors-ep01-jd-vance/episode-manifest.json")
OUT_MP4 = os.path.join(ROOT, "episodes/bad-actors-ep01-jd-vance.mp4")
PREVIEW_DIR = os.path.join(ROOT, "out/preview-frames")

W, H = 1920, 1080
FPS = 15  # Smooth 66ms kinetic step across 6 minutes (5,400 full-HD frames)

FONT_DIR = "/usr/share/fonts/truetype/dejavu"
FONT_CACHE: dict[tuple[str, int], ImageFont.FreeTypeFont] = {}


def get_font(kind: str, size: int) -> ImageFont.FreeTypeFont:
    key = (kind, size)
    if key not in FONT_CACHE:
        mapping = {
            "bold": "DejaVuSans-Bold.ttf",
            "reg": "DejaVuSans.ttf",
            "mono": "DejaVuSansMono-Bold.ttf",
            "serif": "DejaVuSerif.ttf",
            "serif_bold": "DejaVuSerif-Bold.ttf",
        }
        FONT_CACHE[key] = ImageFont.truetype(os.path.join(FONT_DIR, mapping[kind]), size)
    return FONT_CACHE[key]


def hex_rgb(h: str) -> tuple[int, int, int]:
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


def blend_rgb(bg: tuple[int, int, int], fg: tuple[int, int, int], alpha: float) -> tuple[int, int, int]:
    a = max(0.0, min(1.0, alpha))
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


def wrap_text(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont, max_w: int) -> list[str]:
    words = text.split()
    if not words:
        return []
    lines: list[str] = []
    cur = words[0]
    for w in words[1:]:
        cand = cur + " " + w
        bbox = draw.textbbox((0, 0), cand, font=font)
        if bbox[2] - bbox[0] <= max_w:
            cur = cand
        else:
            lines.append(cur)
            cur = w
    lines.append(cur)
    return lines


def build_base_background() -> Image.Image:
    """1920x1080 dark editorial slate radial gradient + subtle 64px hairline grid."""
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    dx = (xx - W * 0.22) / W
    dy = (yy - H * 0.18) / H
    dist = np.clip(np.sqrt(dx * dx + dy * dy) * 1.35, 0.0, 1.0)

    c_inner = np.array([23, 37, 84], dtype=np.float32)   # #172554
    c_mid = np.array([11, 17, 32], dtype=np.float32)     # #0B1120
    c_outer = np.array([7, 11, 20], dtype=np.float32)    # #070B14

    rgb = np.zeros((H, W, 3), dtype=np.float32)
    m1 = np.clip(dist / 0.6, 0.0, 1.0)[..., None]
    m2 = np.clip((dist - 0.6) / 0.4, 0.0, 1.0)[..., None]
    rgb = np.where(dist[..., None] < 0.6, c_inner * (1 - m1) + c_mid * m1, c_mid * (1 - m2) + c_outer * m2)

    # Subtle 64px architectural grid
    grid_mask = (( np.arange(H)[:, None] % 64 == 0 ) | ( np.arange(W)[None, :] % 64 == 0 ))
    rgb[grid_mask] = rgb[grid_mask] * 0.94 + np.array([148, 163, 184]) * 0.06

    return Image.fromarray(rgb.astype(np.uint8), mode="RGB")


def prepare_photo_crop(src_img: Image.Image, target_w: int, target_h: int, zoom: float, x_bias: float = 0.5) -> Image.Image:
    """Cover-crop with configurable horizontal bias and Ken Burns zoom."""
    iw, ih = src_img.size
    scale = max(target_w / iw, target_h / ih) * zoom
    nw, nh = max(target_w, int(iw * scale)), max(target_h, int(ih * scale))
    resized = src_img.resize((nw, nh), Image.Resampling.BILINEAR)
    left = int((nw - target_w) * x_bias)
    top = int((nh - target_h) * 0.18)
    cropped = resized.crop((left, top, left + target_w, top + target_h))
    # Darken bottom 28% for crisp caption legibility
    arr = np.array(cropped, dtype=np.float32)
    grad_start = int(target_h * 0.68)
    ramp = np.linspace(0.0, 0.88, target_h - grad_start, dtype=np.float32)[:, None, None]
    arr[grad_start:] = arr[grad_start:] * (1.0 - ramp) + np.array([9, 14, 26], dtype=np.float32) * ramp
    return Image.fromarray(arr.astype(np.uint8), mode="RGB")


def draw_header_and_chapters(
    img: Image.Image,
    draw: ImageDraw.ImageDraw,
    episode: dict,
    t: float,
    active_section: dict,
):
    # Badge: BAD ACTORS
    draw.rounded_rectangle((64, 24, 218, 56), radius=6, fill=(239, 68, 68))
    draw.text((80, 30), "BAD ACTORS", font=get_font("bold", 17), fill=(255, 255, 255))

    title_str = f"HOW POLITICIANS PRETEND  ·  EPISODE 0{episode['episodeNumber']}: VICE PRESIDENT {episode['politician'].upper()}"
    draw.text((234, 29), title_str, font=get_font("bold", 19), fill=(226, 232, 240))

    tc_str = f"{fmt_tc(t)} / {fmt_tc(episode['durationSeconds'])}"
    tc_font = get_font("mono", 19)
    tb = draw.textbbox((0, 0), tc_str, font=tc_font)
    draw.text((W - 64 - (tb[2] - tb[0]), 29), tc_str, font=tc_font, fill=(148, 163, 184))

    # 5-segment proportional progress bar
    bar_x = 64
    total_w = W - 128
    gap = 10
    avail_w = total_w - gap * (len(episode["sections"]) - 1)
    total_dur = episode["durationSeconds"]

    cx = bar_x
    for idx, sec in enumerate(episode["sections"]):
        sw = int(avail_w * (sec["durationSeconds"] / total_dur))
        if idx == len(episode["sections"]) - 1:
            sw = (bar_x + total_w) - cx
        acc = hex_rgb(sec["accentColor"])
        is_cur = sec["id"] == active_section["id"]
        border_col = acc if is_cur else (51, 65, 85)
        draw.rounded_rectangle((cx, 68, cx + sw, 118), radius=8, fill=(22, 32, 50), outline=border_col, width=2 if is_cur else 1)

        lbl = f"{sec['number']} · {sec['shortLabel']}"
        draw.text((cx + 12, 75), lbl, font=get_font("bold", 13), fill=acc if is_cur else (148, 163, 184))

        # Inner progress track
        tx0, tx1 = cx + 12, cx + sw - 12
        draw.rounded_rectangle((tx0, 100, tx1, 107), radius=3, fill=(11, 17, 32))
        fill_p = clamp01((t - sec["start"]) / sec["durationSeconds"])
        if fill_p > 0.005:
            fw = max(4, int((tx1 - tx0) * fill_p))
            draw.rounded_rectangle((tx0, 100, tx0 + fw, 107), radius=3, fill=acc)
        cx += sw + gap


def draw_photo_column(
    img: Image.Image,
    draw: ImageDraw.ImageDraw,
    slide: dict,
    photo_cache: dict[str, Image.Image],
    slide_elapsed: float,
    slide_dur: float,
):
    enter = ease_out_cubic(slide_elapsed / 0.5)
    y_off = int((1.0 - enter) * 20)
    zoom = 1.0 + 0.065 * clamp01(slide_elapsed / max(slide_dur, 0.1))
    acc = hex_rgb(slide["accentColor"])

    px, py, pw, ph = 64, 146 + y_off, 556, 766

    if slide.get("secondaryPhoto"):
        sub_h = (ph - 18) // 2
        for idx, pinfo in enumerate([slide["photo"], slide["secondaryPhoto"]]):
            sy = py + idx * (sub_h + 18)
            crop = prepare_photo_crop(photo_cache[pinfo["src"]], pw, sub_h, zoom)
            img.paste(crop, (px, sy))
            bcol = (100, 116, 139) if idx == 0 else acc
            draw.rounded_rectangle((px, sy, px + pw, sy + sub_h), radius=14, outline=bcol, width=3)

            tag = pinfo["dateTag"]
            tfont = get_font("bold", 14)
            tb = draw.textbbox((0, 0), tag, font=tfont)
            tw = tb[2] - tb[0] + 22
            tag_bg = (15, 23, 42) if idx == 0 else acc
            tag_fg = (226, 232, 240) if idx == 0 else (11, 17, 32)
            draw.rounded_rectangle((px + 14, sy + 14, px + 14 + tw, sy + 42), radius=5, fill=tag_bg)
            draw.text((px + 25, sy + 19), tag, font=tfont, fill=tag_fg)

            cfont = get_font("bold", 15)
            for li, line in enumerate(wrap_text(draw, pinfo["caption"], cfont, pw - 32)[:2]):
                draw.text((px + 16, sy + sub_h - 44 + li * 19), line, font=cfont, fill=(241, 245, 249))
        return

    pinfo = slide["photo"]
    xbias = 0.80 if "08-munich" in pinfo["src"] else 0.50
    crop = prepare_photo_crop(photo_cache[pinfo["src"]], pw, ph, zoom, x_bias=xbias)
    img.paste(crop, (px, py))
    draw.rounded_rectangle((px, py, px + pw, py + ph), radius=16, outline=acc, width=3)

    tag = pinfo["dateTag"]
    tfont = get_font("bold", 15)
    tb = draw.textbbox((0, 0), tag, font=tfont)
    tw = tb[2] - tb[0] + 26
    draw.rounded_rectangle((px + 18, py + 18, px + 18 + tw, py + 48), radius=6, fill=acc)
    draw.text((px + 31, py + 24), tag, font=tfont, fill=(11, 17, 32))

    cfont = get_font("bold", 17)
    lines = wrap_text(draw, pinfo["caption"], cfont, pw - 36)[:2]
    base_y = py + ph - 24 - len(lines) * 22
    for li, line in enumerate(lines):
        draw.text((px + 18, base_y + li * 22), line, font=cfont, fill=(248, 250, 252))


def draw_slide_content(
    draw: ImageDraw.ImageDraw,
    slide: dict,
    slide_elapsed: float,
    slide_dur: float,
):
    rx, ry, rw = 660, 146, 1196
    acc = hex_rgb(slide["accentColor"])
    bg_dark = (14, 21, 38)

    head_p = ease_out_cubic(slide_elapsed / 0.45)
    hy = ry + int((1.0 - head_p) * 14)

    hfont = get_font("bold", 36)
    sfont = get_font("reg", 19)
    draw.text((rx, hy), slide["headline"], font=hfont, fill=blend_rgb(bg_dark, (248, 250, 252), head_p))
    draw.text((rx, hy + 46), slide["subheadline"], font=sfont, fill=blend_rgb(bg_dark, (148, 163, 184), head_p))

    rule_w = max(8, int(240 * head_p))
    draw.rounded_rectangle((rx, hy + 78, rx + rule_w, hy + 82), radius=2, fill=acc)

    cy = ry + 102
    layout = slide["layout"]

    if slide.get("bullets"):
        bullets = slide["bullets"]
        n = len(bullets)
        card_h = 152 if n == 4 else 198
        gap = 14 if n == 4 else 18
        for i, b in enumerate(bullets):
            delay = 0.35 + i * (min(slide_dur * 0.48, 11.5) / max(n, 1))
            p = ease_out_cubic((slide_elapsed - delay) / 0.55)
            if p <= 0.02:
                continue
            ox = int((1.0 - p) * 28)
            y0 = cy + i * (card_h + gap)
            card_bg = blend_rgb(bg_dark, (28, 39, 58), p)
            border_c = blend_rgb(bg_dark, (60, 76, 102), p)
            acc_c = blend_rgb(bg_dark, acc, p)

            draw.rounded_rectangle((rx + ox, y0, rx + rw + ox, y0 + card_h), radius=12, fill=card_bg, outline=border_c, width=1)
            draw.rounded_rectangle((rx + ox, y0, rx + ox + 6, y0 + card_h), radius=3, fill=acc_c)

            tag_font = get_font("bold", 13)
            tb = draw.textbbox((0, 0), b["tag"], font=tag_font)
            tw = tb[2] - tb[0] + 18
            tag_fill = blend_rgb(card_bg, acc, 0.22 * p)
            draw.rounded_rectangle((rx + ox + 20, y0 + 16, rx + ox + 20 + tw, y0 + 40), radius=5, fill=tag_fill)
            draw.text((rx + ox + 29, y0 + 20), b["tag"], font=tag_font, fill=acc_c)

            t_font = get_font("bold", 21)
            draw.text((rx + ox + 20 + tw + 14, y0 + 15), b["title"], font=t_font, fill=blend_rgb(bg_dark, (248, 250, 252), p))

            d_font = get_font("reg", 17)
            dlines = wrap_text(draw, b["detail"], d_font, rw - 44)[:3]
            for li, dl in enumerate(dlines):
                draw.text((rx + ox + 20, y0 + 54 + li * 24), dl, font=d_font, fill=blend_rgb(bg_dark, (203, 213, 225), p))

    elif layout == "contradictions" and slide.get("contradictions"):
        items = slide["contradictions"]
        card_h = 202
        gap = 16
        for i, c in enumerate(items):
            delay = 0.4 + i * 3.6
            p = ease_out_cubic((slide_elapsed - delay) / 0.6)
            if p <= 0.02:
                continue
            oy = int((1.0 - p) * 20)
            y0 = cy + i * (card_h + gap) + oy
            card_bg = blend_rgb(bg_dark, (28, 39, 58), p)
            draw.rounded_rectangle((rx, y0, rx + rw, y0 + card_h), radius=12, fill=card_bg, outline=blend_rgb(bg_dark, (60, 76, 102), p), width=1)
            draw.text((rx + 20, y0 + 12), c["topic"].upper(), font=get_font("bold", 15), fill=blend_rgb(bg_dark, acc, p))

            col_w = (rw - 96) // 2
            bx0 = rx + 20
            bx1 = bx0 + col_w + 56
            # Left box (THEN)
            draw.rounded_rectangle((bx0, y0 + 40, bx0 + col_w, y0 + card_h - 14), radius=9, fill=blend_rgb(bg_dark, (15, 23, 42), p))
            draw.rounded_rectangle((bx0, y0 + 40, bx0 + 5, y0 + card_h - 14), radius=2, fill=blend_rgb(bg_dark, (100, 116, 139), p))
            draw.text((bx0 + 14, y0 + 48), f"{c['earlierDate']} · BEFORE", font=get_font("bold", 13), fill=blend_rgb(bg_dark, (148, 163, 184), p))
            for li, ln in enumerate(wrap_text(draw, c["earlierPosition"], get_font("reg", 16), col_w - 26)[:4]):
                draw.text((bx0 + 14, y0 + 72 + li * 22), ln, font=get_font("reg", 16), fill=blend_rgb(bg_dark, (226, 232, 240), p))

            # Arrow
            draw.text((bx0 + col_w + 16, y0 + 102), "->", font=get_font("mono", 22), fill=blend_rgb(bg_dark, acc, p))

            # Right box (NOW)
            draw.rounded_rectangle((bx1, y0 + 40, bx1 + col_w, y0 + card_h - 14), radius=9, fill=blend_rgb(bg_dark, (42, 33, 20), p))
            draw.rounded_rectangle((bx1, y0 + 40, bx1 + 5, y0 + card_h - 14), radius=2, fill=blend_rgb(bg_dark, acc, p))
            draw.text((bx1 + 14, y0 + 48), f"{c['laterDate']} · AFTER", font=get_font("bold", 13), fill=blend_rgb(bg_dark, acc, p))
            for li, ln in enumerate(wrap_text(draw, c["laterPosition"], get_font("bold", 16), col_w - 26)[:4]):
                draw.text((bx1 + 14, y0 + 72 + li * 22), ln, font=get_font("bold", 16), fill=blend_rgb(bg_dark, (255, 255, 255), p))

    elif layout == "buzzword-bars" and slide.get("buzzwords"):
        bws = slide["buzzwords"]
        card_h = 96
        gap = 13
        for i, bw in enumerate(bws):
            delay = 0.35 + i * 1.5
            p = ease_out_cubic((slide_elapsed - delay) / 0.85)
            if p <= 0.02:
                continue
            y0 = cy + i * (card_h + gap)
            card_bg = blend_rgb(bg_dark, (28, 39, 58), min(1.0, p * 1.4))
            draw.rounded_rectangle((rx, y0, rx + rw, y0 + card_h), radius=11, fill=card_bg, outline=(51, 65, 85), width=1)

            lfont = get_font("bold", 19)
            draw.text((rx + 20, y0 + 14), bw["label"], font=lfont, fill=(248, 250, 252))
            lb = draw.textbbox((0, 0), bw["label"], font=lfont)
            draw.text((rx + 32 + (lb[2] - lb[0]), y0 + 17), f"— {bw['note']}", font=get_font("reg", 15), fill=(148, 163, 184))

            val_str = f"{bw['perThousandWords'] * p:4.1f} / 1k"
            vfont = get_font("mono", 20)
            vb = draw.textbbox((0, 0), val_str, font=vfont)
            draw.text((rx + rw - 20 - (vb[2] - vb[0]), y0 + 14), val_str, font=vfont, fill=acc)

            # Bar
            bx0, bx1 = rx + 20, rx + rw - 20
            draw.rounded_rectangle((bx0, y0 + 56, bx1, y0 + 74), radius=6, fill=(11, 17, 32))
            fill_w = max(8, int((bx1 - bx0) * (bw["perThousandWords"] / 8.5) * p))
            draw.rounded_rectangle((bx0, y0 + 56, bx0 + fill_w, y0 + 74), radius=6, fill=acc)

    elif layout == "specificity-meter" and slide.get("specificityStats"):
        st = slide["specificityStats"]
        mp = ease_out_cubic((slide_elapsed - 0.25) / 0.95)
        draw.rounded_rectangle((rx, cy, rx + rw, cy + 94), radius=12, fill=(28, 39, 58), outline=(244, 63, 94), width=2)
        draw.text((rx + 20, cy + 14), f"{st['vaguePercent'] * mp:4.1f}% SWEEPING / ANECDOTAL / UNQUANTIFIED", font=get_font("bold", 18), fill=(244, 63, 94))
        sp_str = f"{st['specificPercent'] * mp:3.1f}% CITED NUMBERS / STATUTES"
        sfont = get_font("bold", 18)
        sb = draw.textbbox((0, 0), sp_str, font=sfont)
        draw.text((rx + rw - 20 - (sb[2] - sb[0]), cy + 14), sp_str, font=sfont, fill=(56, 189, 248))

        gx0, gx1 = rx + 20, rx + rw - 20
        gw = gx1 - gx0
        draw.rounded_rectangle((gx0, cy + 50, gx1, cy + 76), radius=7, fill=(11, 17, 32))
        vw = int(gw * (st["vaguePercent"] / 100.0) * mp)
        sw = int(gw * (st["specificPercent"] / 100.0) * mp)
        if vw > 4:
            draw.rounded_rectangle((gx0, cy + 50, gx0 + vw, cy + 76), radius=7, fill=(244, 63, 94))
        if sw > 4:
            draw.rounded_rectangle((gx0 + vw, cy + 50, gx0 + vw + sw, cy + 76), radius=4, fill=(56, 189, 248))

        for i, c in enumerate(slide.get("claims", [])):
            delay = 2.0 + i * 3.6
            p = ease_out_cubic((slide_elapsed - delay) / 0.55)
            if p <= 0.02:
                continue
            ox = int((1.0 - p) * 24)
            y0 = cy + 112 + i * 134
            draw.rounded_rectangle((rx + ox, y0, rx + rw + ox, y0 + 120), radius=11, fill=blend_rgb(bg_dark, (28, 39, 58), p), outline=(51, 65, 85), width=1)
            draw.text((rx + ox + 20, y0 + 16), c["claim"], font=get_font("bold", 18), fill=blend_rgb(bg_dark, (248, 250, 252), p))
            for li, ln in enumerate(wrap_text(draw, c["reality"], get_font("reg", 16), rw - 190)[:2]):
                draw.text((rx + ox + 20, y0 + 50 + li * 23), ln, font=get_font("reg", 16), fill=blend_rgb(bg_dark, (203, 213, 225), p))

            vcol = (245, 158, 11) if c["verdict"] == "Deferred" else (244, 63, 94)
            vtxt = c["verdict"].upper()
            vf = get_font("bold", 15)
            vb = draw.textbbox((0, 0), vtxt, font=vf)
            vw_box = vb[2] - vb[0] + 28
            vx = rx + rw + ox - 22 - vw_box
            draw.rounded_rectangle((vx, y0 + 40, vx + vw_box, y0 + 78), radius=6, outline=vcol, width=2)
            draw.text((vx + 14, y0 + 50), vtxt, font=vf, fill=vcol)

    elif layout == "verbatim-quotes" and slide.get("quotes"):
        quotes = slide["quotes"]
        card_h = 202
        gap = 16
        for i, q in enumerate(quotes):
            delay = 0.5 + i * 7.2
            p = ease_out_cubic((slide_elapsed - delay) / 0.65)
            if p <= 0.02:
                continue
            oy = int((1.0 - p) * 20)
            y0 = cy + i * (card_h + gap) + oy
            card_bg = blend_rgb(bg_dark, (28, 39, 58), p)
            draw.rounded_rectangle((rx, y0, rx + rw, y0 + card_h), radius=12, fill=card_bg, outline=(51, 65, 85), width=1)
            draw.rounded_rectangle((rx, y0, rx + 6, y0 + card_h), radius=3, fill=blend_rgb(bg_dark, acc, p))

            draw.text((rx + 22, y0 + 16), q["context"], font=get_font("bold", 14), fill=blend_rgb(bg_dark, acc, p))

            qfont = get_font("serif", 19)
            lines = wrap_text(draw, q["quote"], qfont, rw - 48)[:4]
            hl_lower = q["highlight"].lower()
            hl_p = ease_out_cubic((slide_elapsed - (delay + 0.8)) / 0.8)
            for li, ln in enumerate(lines):
                ly = y0 + 50 + li * 30
                idx = ln.lower().find(hl_lower)
                if idx != -1 and hl_p > 0.05:
                    pre = ln[:idx]
                    mat = ln[idx:idx + len(q["highlight"])]
                    pre_w = draw.textbbox((0, 0), pre, font=qfont)[2] if pre else 0
                    mat_w = draw.textbbox((0, 0), mat, font=qfont)[2]
                    hl_bg = blend_rgb(card_bg, acc, 0.38 * hl_p)
                    draw.rounded_rectangle((rx + 20 + pre_w - 3, ly - 2, rx + 20 + pre_w + mat_w + 4, ly + 26), radius=4, fill=hl_bg)
                draw.text((rx + 22, ly), ln, font=qfont, fill=blend_rgb(bg_dark, (248, 250, 252), p))

    elif layout == "record-scorecard" and slide.get("scorecard"):
        rows = slide["scorecard"]
        card_h = 116
        gap = 13
        for i, row in enumerate(rows):
            delay = 0.4 + i * 3.4
            p = ease_out_cubic((slide_elapsed - delay) / 0.55)
            if p <= 0.02:
                continue
            ox = int((1.0 - p) * 24)
            y0 = cy + i * (card_h + gap)
            draw.rounded_rectangle((rx + ox, y0, rx + rw + ox, y0 + card_h), radius=11, fill=blend_rgb(bg_dark, (28, 39, 58), p), outline=(51, 65, 85), width=1)
            draw.text((rx + ox + 20, y0 + 45), row["metric"].upper(), font=get_font("bold", 14), fill=blend_rgb(bg_dark, (148, 163, 184), p))
            draw.text((rx + ox + 266, y0 + 42), row["value"], font=get_font("bold", 20), fill=blend_rgb(bg_dark, acc, p))

            cfont = get_font("reg", 16)
            clines = wrap_text(draw, row["rhetoricContrast"], cfont, rw - 592)[:3]
            start_y = y0 + (card_h - len(clines) * 22) // 2
            for li, cl in enumerate(clines):
                draw.text((rx + ox + 572, start_y + li * 22), cl, font=cfont, fill=blend_rgb(bg_dark, (226, 232, 240), p))


def draw_subtitle_strip(draw: ImageDraw.ImageDraw, slide: dict, t: float):
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

    draw.rounded_rectangle((64, 984, W - 64, 1054), radius=12, fill=(10, 15, 28), outline=(51, 65, 85), width=1)
    acc = hex_rgb(slide["accentColor"])

    reg_f = get_font("bold", 23)
    # Measure total width to center horizontally
    widths = []
    space_w = 12
    for w in vis:
        b = draw.textbbox((0, 0), w, font=reg_f)
        widths.append(b[2] - b[0])
    total_tw = sum(widths) + space_w * (len(vis) - 1)
    cx = (W - total_tw) // 2
    for idx, (w, ww) in enumerate(zip(vis, widths)):
        is_cur = (c_start + idx) == active_idx
        if is_cur:
            draw.rounded_rectangle((cx - 5, 998, cx + ww + 5, 1039), radius=5, fill=blend_rgb((10, 15, 28), acc, 0.25))
        draw.text((cx, 1004), w, font=reg_f, fill=acc if is_cur else (241, 245, 249))
        cx += ww + space_w


def draw_section_bumper(img: Image.Image, active_sec: dict, sec_elapsed: float):
    if sec_elapsed >= 1.25:
        return
    alpha = 0.92 if sec_elapsed < 0.88 else 0.92 * (1.0 - (sec_elapsed - 0.88) / 0.37)
    if alpha <= 0.02:
        return
    overlay = Image.new("RGB", (W, H), (7, 11, 20))
    d = ImageDraw.Draw(overlay)
    acc = hex_rgb(active_sec["accentColor"])

    sub = f"SECTION {active_sec['number']}  ·  {active_sec['durationSeconds']} SECONDS"
    sf = get_font("bold", 21)
    sb = d.textbbox((0, 0), sub, font=sf)
    d.text(((W - (sb[2] - sb[0])) // 2, 445), sub, font=sf, fill=acc)

    tf = get_font("bold", 60)
    tb = d.textbbox((0, 0), active_sec["title"], font=tf)
    d.text(((W - (tb[2] - tb[0])) // 2, 492), active_sec["title"], font=tf, fill=(255, 255, 255))

    d.rounded_rectangle(((W - 180) // 2, 582, (W + 180) // 2, 588), radius=3, fill=acc)
    blended = Image.blend(img, overlay, alpha)
    img.paste(blended, (0, 0))


def main():
    with open(MANIFEST_PATH, "r") as f:
        episode = json.load(f)

    os.makedirs(os.path.dirname(OUT_MP4), exist_ok=True)
    os.makedirs(PREVIEW_DIR, exist_ok=True)

    base_bg = build_base_background()

    photo_cache: dict[str, Image.Image] = {}
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
        "-r", "30",
        "-c:a", "aac", "-b:a", "192k",
        "-movflags", "+faststart",
        "-shortest",
        OUT_MP4,
    ]

    sample_timestamps = {8.0: "01-bio.png", 74.0: "03-contradictions.png", 106.0: "04-buzzwords.png", 212.0: "07-specificity.png", 295.0: "09-record.png"}
    saved_samples: set[str] = set()

    print(f"Rendering {total_frames} frames ({episode['durationSeconds']}s @ {FPS}->{30}fps, 1920x1080) to {OUT_MP4} ...")
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
        frame_img.save(buf, format="JPEG", quality=92)
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
