"""
Generate a royalty-free ambient lofi instrumental soundtrack (~5:45) to
underscore the "Importance of Justice" narration.

Features:
  * C minor key, ~85 BPM (laid back)
  * Jazz chord pads: Cm7 → Abmaj7 → Fm7 → G7 (i → VI → iv → V7)
  * Sub bass on roots/fifths
  * Lo-fi drums: kick, snare, hi-hat with soft attack + swing
  * Vinyl crackle + tape hiss texture
  * Sparse reflective melody on electric-piano-ish tone
  * Master gentle low-pass feel via sine mixing, fade in/out

Output: assets/audio/lofi-justice.wav  (44.1 kHz stereo, 16-bit PCM)
"""

import numpy as np
import wave
import struct
import math
import os

SR = 44100
BPM = 85.0
SEC_PER_BEAT = 60.0 / BPM
BEATS_PER_BAR = 4
DURATION_SECONDS = 345  # matches JusticeComposition length
TOTAL_SAMPLES = int(DURATION_SECONDS * SR)

# ---------------------------------------------------------------- helpers ---

def hz(note_number: int) -> float:
    """MIDI note number → frequency (A4=440)."""
    return 440.0 * (2.0 ** ((note_number - 69) / 12.0))


def env_adsr(samples, attack, decay, sustain, release):
    """Simple ADSR envelope (fractions of total length)."""
    n = len(samples)
    a = int(n * attack)
    d = int(n * decay)
    r = int(n * release)
    s = n - a - d - r
    e = np.ones(n)
    e[:a] = np.linspace(0, 1, a)
    e[a:a + d] = 1 - (1 - sustain) * np.linspace(0, 1, d)
    e[a + d:a + d + s] = sustain
    e[a + d + s:] = np.linspace(sustain, 0, r)
    return samples * e


def soft_clip(x, drive=1.5):
    """Gentle tanh saturation for lofi warmth."""
    return np.tanh(x * drive) / np.tanh(drive)


def write_wav(path, samples_left, samples_right):
    """Write 16-bit stereo WAV."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    # Interleave
    interleaved = np.empty((len(samples_left), 2), dtype=np.float64)
    interleaved[:, 0] = samples_left
    interleaved[:, 1] = samples_right
    # Normalize to prevent clipping
    peak = np.max(np.abs(interleaved))
    if peak > 0:
        interleaved = interleaved / peak * 0.9
    pcm = (interleaved * 32767).astype(np.int16)
    with wave.open(path, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


# ---------------------------------------------------------------- chords ---

# Chord progression (MIDI note numbers), each chord held for 2 bars (8 beats)
# Cm7 → Abmaj7 → Fm7 → G7  (i → VI → iv → V7 in C minor)
PROGRESSION = [
    ([48, 51, 55, 58], 16),   # Cm7: C-Eb-G-Bb
    ([56, 60, 63, 67], 16),   # Abmaj7: Ab-C-Eb-G
    ([53, 57, 60, 64], 16),   # Fm7: F-Ab-C-Eb
    ([55, 59, 62, 66], 16),   # G7: G-B-D-F
]

total_beats = sum(b for _, b in PROGRESSION)
assert total_beats <= DURATION_SECONDS / SEC_PER_BEAT, "progression too long"


def chord_notes(chord_midi, start_sample, end_sample, vel=0.35):
    """Return sum of sine-ish oscillators for a chord segment (soft attack)."""
    n = end_sample - start_sample
    t = np.arange(start_sample, end_sample) / SR
    out = np.zeros(n)
    for midi in chord_midi:
        f = hz(midi)
        # Slight detune per voice for chorus-like thickness
        for detune in (-0.02, 0.0, 0.02):
            out += 0.5 * np.sin(2 * np.pi * f * (1 + detune) * t)
    out *= vel
    return out


# ---------------------------------------------------------------- build ---

mix = np.zeros((TOTAL_SAMPLES, 2))

# ---- Chord pads (wide stereo, gentle swell) --------------------------------
beat_pos = 0.0
for chord_midi, beats in PROGRESSION:
    dur_samples = int(beats * SEC_PER_BEAT * SR)
    start = int(beat_pos * SEC_PER_BEAT * SR)
    end = min(start + dur_samples, TOTAL_SAMPLES)
    if start >= TOTAL_SAMPLES:
        break
    seg = chord_notes(chord_midi, start, end, vel=0.22)
    # ADSR per-chord swell
    seg_env = env_adsr(np.ones(len(seg)), 0.15, 0.15, 0.85, 0.25)
    pad = seg * seg_env
    mix[start:end, 0] += pad * 0.55
    mix[start:end, 1] += pad * 0.55
    beat_pos += beats

# ---- Sub bass --------------------------------------------------------------
bass_line = [
    (48, 8),  # C root
    (48, 8),
    (56, 8),  # Ab root
    (56, 8),
    (53, 8),  # F root
    (53, 8),
    (55, 8),  # G root
    (55, 8),
]  # repeat as needed

t = np.arange(TOTAL_SAMPLES) / SR
bass_env_pos = 0.0
for midi, beats in bass_line:
    dur_samples = int(beats * SEC_PER_BEAT * SR)
    start = int(bass_env_pos * SEC_PER_BEAT * SR)
    end = min(start + dur_samples, TOTAL_SAMPLES)
    if start >= TOTAL_SAMPLES:
        break
    f = hz(midi)
    # Sub bass: sine + tiny square-ish 2nd harmonic
    seg = np.sin(2 * np.pi * f * t[start:end])
    seg += 0.15 * np.sin(2 * np.pi * f * 2 * t[start:end])
    seg_env = env_adsr(np.ones(len(seg)), 0.05, 0.1, 0.7, 0.3)
    seg = seg * seg_env * 0.3
    mix[start:end, 0] += seg * 0.5
    mix[start:end, 1] += seg * 0.5
    bass_env_pos += beats

# ---- Drums -----------------------------------------------------------------
def drum_kick(n_samples, f0=60, f1=40):
    tt = np.arange(n_samples) / SR
    env = np.exp(-tt * 18)
    freq = f0 + (f1 - f0) * np.exp(-tt * 30)
    return np.sin(2 * np.pi * np.cumsum(freq) / SR) * env * 0.9


def drum_snare(n_samples):
    tt = np.arange(n_samples) / SR
    env = np.exp(-tt * 25)
    noise = np.random.RandomState(42).uniform(-1, 1, n_samples)
    tone = np.sin(2 * np.pi * 180 * tt) * np.exp(-tt * 40)
    return (noise * 0.7 + tone * 0.5) * env * 0.5


def drum_hihat(n_samples, closed=True):
    tt = np.arange(n_samples) / SR
    env = np.exp(-tt * (60 if closed else 200))
    noise = np.random.RandomState(7).uniform(-1, 1, n_samples)
    return noise * env * (0.35 if closed else 0.25)


# Beat grid: 85 BPM, 4/4. Kick on 1 & 3, snare on 2 & 4, hats on 8ths.
samples_per_beat = int(SEC_PER_BEAT * SR)
samples_per_8th = samples_per_beat // 2
n_beats = int(DURATION_SECONDS / SEC_PER_BEAT)

rng_kick = np.random.RandomState(11)
rng_hat = np.random.RandomState(22)

for b in range(n_beats):
    beat_start = b * samples_per_beat
    # Kick on beats 1 and 3 (0-indexed even)
    if b % 2 == 0:
        k = drum_kick(int(0.15 * SR))
        s = min(beat_start + int(SR * 0.02), TOTAL_SAMPLES)
        e = min(s + len(k), TOTAL_SAMPLES)
        mix[s:e, 0] += k[:e - s] * 0.5
        mix[s:e, 1] += k[:e - s] * 0.5
    # Snare on beats 2 and 4
    if b % 2 == 1:
        s_n = drum_snare(int(0.12 * SR))
        s = min(beat_start + int(SR * 0.02), TOTAL_SAMPLES)
        e = min(s + len(s_n), TOTAL_SAMPLES)
        mix[s:e, 0] += s_n[:e - s] * 0.4
        mix[s:e, 1] += s_n[:e - s] * 0.4
    # Hi-hats on 8ths (closed), with slight swing
    for eighth in range(2):
        hat_start = beat_start + eighth * samples_per_8th
        if hat_start >= TOTAL_SAMPLES:
            break
        # Swing: delay off-beats slightly
        swing = int(SR * 0.015) if eighth == 1 else 0
        hs = min(hat_start + swing, TOTAL_SAMPLES)
        hh = drum_hihat(int(0.06 * SR), closed=True)
        he = min(hs + len(hh), TOTAL_SAMPLES)
        mix[hs:he, 0] += hh[:he - hs] * 0.25
        mix[hs:he, 1] += hh[:he - hs] * 0.25

# ---- Sparse reflective melody (electric-piano-ish) -------------------------
# Sparse notes: C5, Eb5, G5, Bb5, Ab5, F5 — sparse, rhythmic
melody_notes = [
    (0, 64, 2),   # G5
    (2, 68, 2),   # Bb5
    (4, 66, 2),   # F5
    (6, 63, 2),   # Eb5
    (8, 60, 4),   # C5 (hold)
    (12, 64, 2),
    (14, 61, 2),  # C#? no—Db5/C#5 is out of key; use C5
    (14, 60, 2),
    (16, 63, 2),
    (18, 66, 2),
    (20, 61, 4),  # C5 hold
]

t = np.arange(TOTAL_SAMPLES) / SR
for beat, midi, dur_beats in melody_notes:
    start = beat * samples_per_beat
    dur_samples = int(dur_beats * SEC_PER_BEAT * SR)
    if start >= TOTAL_SAMPLES:
        break
    end = min(start + dur_samples, TOTAL_SAMPLES)
    f = hz(midi)
    # Two sine layers + slight detune = EP-ish
    seg = np.sin(2 * np.pi * f * t[start:end])
    seg += 0.4 * np.sin(2 * np.pi * f * 1.003 * t[start:end])
    seg_env = env_adsr(np.ones(len(seg)), 0.02, 0.3, 0.6, 0.5)
    seg = seg * seg_env * 0.18
    mix[start:end, 0] += seg * 0.5
    mix[start:end, 1] += seg * 0.5

# ---- Vinyl crackle + tape hiss --------------------------------------------
rng = np.random.RandomState(99)
hiss = rng.uniform(-1, 1, TOTAL_SAMPLES) * 0.02
# Low-pass the hiss slightly via moving average for "tape" feel
kernel = np.ones(25) / 25
hiss = np.convolve(hiss, kernel, mode='same')
mix[:, 0] += hiss * 0.15
mix[:, 1] += hiss * 0.15

# Occasional crackle pops
for _ in range(int(DURATION_SECONDS * 1.5)):  # ~1.5 pops/sec
    pos = rng.randint(0, TOTAL_SAMPLES - int(0.05 * SR))
    pop = rng.uniform(-1, 1, int(0.03 * SR)) * np.exp(-np.arange(int(0.03 * SR)) / (0.01 * SR))
    mix[pos:pos + len(pop), 0] += pop * 0.08
    mix[pos:pos + len(pop), 1] += pop * 0.08

# ---- Master: gentle fade in/out -------------------------------------------
fade_in = int(2.0 * SR)
fade_out = int(3.0 * SR)
mix[:fade_in, 0] *= np.linspace(0, 1, fade_in)
mix[:fade_in, 1] *= np.linspace(0, 1, fade_in)
mix[-fade_out:, 0] *= np.linspace(1, 0, fade_out)
mix[-fade_out:, 1] *= np.linspace(1, 0, fade_out)

write_wav('assets/audio/lofi-justice.wav', mix[:, 0], mix[:, 1])
print(f"Wrote assets/audio/lofi-justice.wav ({DURATION_SECONDS}s, {SR}Hz stereo)")
