#!/usr/bin/env python3
"""
Assemble the 6-minute (360.0s) master audio track for
'Bad Actors: How Politicians Pretend — Episode 1: Vice President J.D. Vance'.

Places all 10 AI-synthesized voiceover clips into the exact 5-section broadcast
timeline requested for the series:
  - 0:00 - 0:30 ( 30s): Politician Info: Quick Bio
  - 0:30 - 1:30 ( 60s): Extrapolated Ideology
  - 1:30 - 2:30 ( 60s): Vocabulary Analysis
  - 2:30 - 4:30 (120s): Rhetorical Analysis
  - 4:30 - 6:00 ( 90s): Overall Assessment & Conclusion

Mixes in a subtle minimalist documentary underscore (-21 dB under voice) with
soft chapter transition tones at each section boundary, and writes exact clip
timestamps to src/data/badActorsAudioTimings.json.
"""

import json
import os
import subprocess
import tempfile
import wave
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FFMPEG = os.path.join(ROOT, "node_modules/@remotion/compositor-linux-x64-gnu/ffmpeg")
FFPROBE = os.path.join(ROOT, "node_modules/@remotion/compositor-linux-x64-gnu/ffprobe")
AUDIO_DIR = os.path.join(ROOT, "public/bad-actors/ep01-jd-vance/audio")
SR = 44100
TOTAL_SECONDS = 360.0
TOTAL_SAMPLES = int(TOTAL_SECONDS * SR)

SECTIONS = [
    {
        "sectionId": "bio",
        "sectionTitle": "Politician Info: Quick Bio",
        "start": 0.0,
        "end": 30.0,
        "clips": [
            {"id": "slide-01-bio", "file": "clip-01-bio.wav"},
        ],
    },
    {
        "sectionId": "ideology",
        "sectionTitle": "Extrapolated Ideology",
        "start": 30.0,
        "end": 90.0,
        "clips": [
            {"id": "slide-02-worldview", "file": "clip-02-ideology-a.wav"},
            {"id": "slide-03-contradictions", "file": "clip-03-ideology-b.wav"},
        ],
    },
    {
        "sectionId": "vocabulary",
        "sectionTitle": "Vocabulary Analysis",
        "start": 90.0,
        "end": 150.0,
        "clips": [
            {"id": "slide-04-buzzwords", "file": "clip-04-vocab-a.wav"},
            {"id": "slide-05-semantics", "file": "clip-05-vocab-b.wav"},
        ],
    },
    {
        "sectionId": "rhetoric",
        "sectionTitle": "Rhetorical Analysis",
        "start": 150.0,
        "end": 270.0,
        "clips": [
            {"id": "slide-06-appeals", "file": "clip-06-rhetoric-a.wav"},
            {"id": "slide-07-specificity", "file": "clip-07-rhetoric-b.wav"},
            {"id": "slide-08-cadence", "file": "clip-08-rhetoric-c.wav"},
        ],
    },
    {
        "sectionId": "conclusion",
        "sectionTitle": "Overall Assessment & Conclusion",
        "start": 270.0,
        "end": 360.0,
        "clips": [
            {"id": "slide-09-record", "file": "clip-09-conclusion-a.wav"},
            {"id": "slide-10-verdict", "file": "clip-10-conclusion-b.wav"},
        ],
    },
]


def probe_duration(path: str) -> float:
    out = subprocess.check_output(
        [FFPROBE, "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", path],
        text=True,
    ).strip()
    return float(out)


def decode_to_mono_pcm(path: str, tempo: float = 1.0) -> np.ndarray:
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp_path = tmp.name
    try:
        af_parts = []
        if abs(tempo - 1.0) > 0.002:
            af_parts.append(f"atempo={tempo:.5f}")
        af_parts.append(f"aresample={SR}")
        cmd = [
            FFMPEG, "-y", "-v", "error", "-i", path,
            "-ac", "1", "-ar", str(SR),
            "-af", ",".join(af_parts),
            "-c:a", "pcm_s16le", tmp_path,
        ]
        subprocess.run(cmd, check=True)
        with wave.open(tmp_path, "rb") as w:
            raw = w.readframes(w.getnframes())
        arr = np.frombuffer(raw, dtype=np.int16).astype(np.float64) / 32768.0
        # Trim leading/trailing near-silence (> -48 dB threshold) with 80ms pad
        thresh = 0.004
        idx = np.where(np.abs(arr) > thresh)[0]
        if len(idx) > 0:
            pad = int(0.08 * SR)
            s = max(0, idx[0] - pad)
            e = min(len(arr), idx[-1] + pad)
            arr = arr[s:e]
        # Peak normalize softly to -2.5 dBFS
        peak = np.max(np.abs(arr))
        if peak > 1e-5:
            arr = arr / peak * 0.75
        # Short 20ms cosine fade in/out to avoid any click
        fade = min(int(0.02 * SR), len(arr) // 4)
        if fade > 0:
            arr[:fade] *= np.linspace(0, 1, fade)
            arr[-fade:] *= np.linspace(1, 0, fade)
        return arr
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


def generate_documentary_underscore(voice_env: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Subtle D-minor investigative documentary pulse + chapter chimes."""
    t = np.arange(TOTAL_SAMPLES, dtype=np.float64) / SR
    left = np.zeros(TOTAL_SAMPLES, dtype=np.float64)
    right = np.zeros(TOTAL_SAMPLES, dtype=np.float64)

    # Chord beds cycling gently every 8 seconds: Dm9 -> Bbmaj7 -> Gm7 -> A7sus4
    chords = [
        [146.83, 220.00, 261.63, 329.63],  # Dm9
        [116.54, 174.61, 220.00, 293.66],  # Bbmaj7
        [98.00,  146.83, 174.61, 220.00],  # Gm7
        [110.00, 164.81, 196.00, 220.00],  # A7sus4
    ]
    bar_sec = 8.0
    n_bars = int(np.ceil(TOTAL_SECONDS / bar_sec))
    for b in range(n_bars):
        s_idx = int(b * bar_sec * SR)
        e_idx = min(TOTAL_SAMPLES, int((b + 1) * bar_sec * SR))
        if e_idx <= s_idx:
            break
        seg_t = np.arange(e_idx - s_idx, dtype=np.float64) / SR
        env = np.ones_like(seg_t)
        atk = min(int(1.2 * SR), len(seg_t) // 3)
        rel = min(int(1.5 * SR), len(seg_t) // 3)
        env[:atk] = np.linspace(0, 1, atk)
        env[-rel:] = np.linspace(1, 0, rel)
        freqs = chords[b % len(chords)]
        pad_l = np.zeros_like(seg_t)
        pad_r = np.zeros_like(seg_t)
        for i, f in enumerate(freqs):
            detune = 1.0015 if i % 2 == 0 else 0.9985
            pad_l += (0.28 / len(freqs)) * np.sin(2 * np.pi * f * seg_t)
            pad_r += (0.28 / len(freqs)) * np.sin(2 * np.pi * f * detune * seg_t + 0.3)
        # Subtle pulse every 1.0s (60 BPM investigative tick)
        pulse = 0.06 * np.sin(2 * np.pi * freqs[0] * 0.5 * seg_t) * (0.5 + 0.5 * np.cos(2 * np.pi * 1.0 * seg_t))
        left[s_idx:e_idx] += (pad_l + pulse) * env
        right[s_idx:e_idx] += (pad_r + pulse) * env

    # Soft two-note chapter chime at each section start (0, 30, 90, 150, 270) + end resolve (358.2)
    for boundary in [0.05, 30.0, 90.0, 150.0, 270.0, 358.0]:
        for offset, freq in [(0.0, 587.33), (0.18, 440.00)]:  # D5 -> A4
            s_idx = int((boundary + offset) * SR)
            dur = int(1.4 * SR)
            e_idx = min(TOTAL_SAMPLES, s_idx + dur)
            if e_idx > s_idx:
                ct = np.arange(e_idx - s_idx, dtype=np.float64) / SR
                c_env = np.exp(-ct * 3.2) * np.minimum(ct / 0.015, 1.0)
                tone = 0.14 * (np.sin(2 * np.pi * freq * ct) + 0.25 * np.sin(2 * np.pi * freq * 2 * ct)) * c_env
                left[s_idx:e_idx] += tone
                right[s_idx:e_idx] += tone * 0.92

    # Duck music cleanly whenever voice is active
    duck = 1.0 - 0.58 * voice_env
    left *= 0.20 * duck
    right *= 0.20 * duck

    # Master fade-out last 1.5s
    fout = int(1.5 * SR)
    left[-fout:] *= np.linspace(1, 0, fout)
    right[-fout:] *= np.linspace(1, 0, fout)
    return left, right


def main():
    voice_track = np.zeros(TOTAL_SAMPLES, dtype=np.float64)
    voice_env = np.zeros(TOTAL_SAMPLES, dtype=np.float64)
    timings_out = {
        "totalDurationSeconds": TOTAL_SECONDS,
        "sections": [],
        "slides": [],
    }

    for sec in SECTIONS:
        sec_dur = sec["end"] - sec["start"]
        n_clips = len(sec["clips"])
        # Decode at 1.0x first to inspect trimmed speech length
        raw_arrays = []
        for c in sec["clips"]:
            arr = decode_to_mono_pcm(os.path.join(AUDIO_DIR, c["file"]), tempo=1.0)
            raw_arrays.append(arr)
        raw_total = sum(len(a) / SR for a in raw_arrays)

        # Target speech budget leaves ~0.65s lead-in at section start, ~0.85s between clips, ~0.85s tail
        lead_in = 0.65
        inter_gap = 0.80
        tail_pad = 0.85
        budget = sec_dur - lead_in - inter_gap * (n_clips - 1) - tail_pad
        if raw_total > budget:
            tempo = raw_total / budget
            arrays = [
                decode_to_mono_pcm(os.path.join(AUDIO_DIR, c["file"]), tempo=tempo)
                for c in sec["clips"]
            ]
        else:
            tempo = 1.0
            arrays = raw_arrays
            # Distribute extra breathing room evenly
            extra = budget - raw_total
            if n_clips > 1:
                inter_gap += (extra * 0.55) / (n_clips - 1)

        cursor = sec["start"] + lead_in
        sec_slides = []
        for idx, (c, arr) in enumerate(zip(sec["clips"], arrays)):
            clip_dur = len(arr) / SR
            s_sample = int(cursor * SR)
            e_sample = min(TOTAL_SAMPLES, s_sample + len(arr))
            voice_track[s_sample:e_sample] += arr[: e_sample - s_sample]
            voice_env[s_sample:e_sample] = 1.0

            slide_start = sec["start"] if idx == 0 else round(cursor - inter_gap * 0.5, 3)
            next_cursor = cursor + clip_dur + inter_gap
            slide_end = sec["end"] if idx == n_clips - 1 else round(cursor + clip_dur + inter_gap * 0.5, 3)

            slide_info = {
                "slideId": c["id"],
                "sectionId": sec["sectionId"],
                "clipFile": c["file"],
                "tempoApplied": round(tempo, 4),
                "slideStart": slide_start,
                "slideEnd": slide_end,
                "speechStart": round(cursor, 3),
                "speechEnd": round(cursor + clip_dur, 3),
                "speechDuration": round(clip_dur, 3),
            }
            sec_slides.append(slide_info)
            timings_out["slides"].append(slide_info)
            cursor = next_cursor

        timings_out["sections"].append({
            "sectionId": sec["sectionId"],
            "sectionTitle": sec["sectionTitle"],
            "start": sec["start"],
            "end": sec["end"],
            "duration": sec_dur,
            "tempoApplied": round(tempo, 4),
            "slides": sec_slides,
        })
        print(
            f"[{sec['sectionId']:10s}] {sec['start']:5.1f}s - {sec['end']:5.1f}s "
            f"(raw={raw_total:5.2f}s, tempo={tempo:.3f}x, slides={n_clips})"
        )

    # Smooth voice envelope (150ms moving average) for smooth ducking
    kernel = np.ones(int(0.15 * SR)) / int(0.15 * SR)
    voice_env_smooth = np.convolve(voice_env, kernel, mode="same")

    bg_l, bg_r = generate_documentary_underscore(voice_env_smooth)
    mix_l = np.clip(voice_track + bg_l, -0.98, 0.98)
    mix_r = np.clip(voice_track + bg_r, -0.98, 0.98)

    os.makedirs(os.path.join(ROOT, "runs/bad-actors-ep01-jd-vance"), exist_ok=True)
    wav_out = os.path.join(ROOT, "runs/bad-actors-ep01-jd-vance/voiceover.wav")
    mp3_out = os.path.join(AUDIO_DIR, "episode-master.mp3")

    interleaved = np.empty((TOTAL_SAMPLES, 2), dtype=np.int16)
    interleaved[:, 0] = (mix_l * 32767).astype(np.int16)
    interleaved[:, 1] = (mix_r * 32767).astype(np.int16)
    with wave.open(wav_out, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(interleaved.tobytes())

    subprocess.run(
        [FFMPEG, "-y", "-v", "error", "-i", wav_out, "-c:a", "libmp3lame", "-b:a", "192k", mp3_out],
        check=True,
    )

    timings_path = os.path.join(ROOT, "src/data/badActorsAudioTimings.json")
    with open(timings_path, "w") as f:
        json.dump(timings_out, f, indent=2)
    print(f"\nMaster WAV: {wav_out}")
    print(f"Master MP3: {mp3_out} ({os.path.getsize(mp3_out)/1024/1024:.2f} MB)")
    print(f"Timings   : {timings_path}")


if __name__ == "__main__":
    main()
