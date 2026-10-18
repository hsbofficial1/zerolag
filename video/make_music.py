"""Generate an original, royalty-free background track (no samples, no copyright).

Soft electric-piano chords + warm pad + muted pluck arpeggio + light kick/hat
at 96 BPM, with a gentle intro and outro. Written to remotion/public/music.wav.
Usage:  python video/make_music.py [seconds]
"""
import sys
import wave
from pathlib import Path

import numpy as np

SR = 44100
BPM = 96
BEAT = 60 / BPM
DUR = float(sys.argv[1]) if len(sys.argv) > 1 else 185.0
OUT = Path(__file__).resolve().parent / "remotion" / "public" / "music.wav"
rng = np.random.default_rng(7)


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def env(n, a, r):
    e = np.ones(n)
    a, r = int(a * SR), int(r * SR)
    e[:a] = np.linspace(0, 1, a)
    if r:
        e[-r:] *= np.linspace(1, 0, r)
    return e


def lowpass(x, cutoff):
    # one-pole low-pass, good enough for softening
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc = (1 - a) * x[i] + a * acc
        y[i] = acc
    return y


n = int(DUR * SR)
t_all = np.arange(n) / SR
mix = np.zeros(n)

# I – V – vi – IV in D major, two bars each
prog = [[50, 57, 62, 66], [57, 61, 64, 69], [59, 62, 66, 71], [55, 59, 62, 67]]
bar = 4 * BEAT
chord_len = 2 * bar

# pad: detuned saws softened later
pad = np.zeros(n)
for k in range(int(DUR / chord_len) + 1):
    notes = prog[k % 4]
    s0 = int(k * chord_len * SR)
    L = min(int(chord_len * SR), n - s0)
    if L <= 0:
        break
    t = np.arange(L) / SR
    tone = np.zeros(L)
    for m in notes:
        for det in (-0.07, 0.07):
            f = midi(m + det)
            tone += 2 * ((t * f) % 1) - 1
    pad[s0:s0 + L] += tone * env(L, 0.8, 0.8) / (len(notes) * 2)
pad = lowpass(pad, 900) * 0.22

# electric piano stabs on beats 1 and 3
ep = np.zeros(n)
for b in range(int(DUR / BEAT)):
    if b % 4 not in (0, 2):
        continue
    notes = prog[(b // 8) % 4]
    s0 = int(b * BEAT * SR)
    L = min(int(1.4 * SR), n - s0)
    if L <= 0:
        break
    t = np.arange(L) / SR
    tone = sum(np.sin(2 * np.pi * midi(m + 12) * t) + 0.3 * np.sin(2 * np.pi * midi(m + 24) * t) for m in notes[1:])
    ep[s0:s0 + L] += tone * np.exp(-t * 3.2) / 3
ep *= 0.10

# pluck arpeggio in 8ths
arp = np.zeros(n)
for e8 in range(int(DUR / (BEAT / 2))):
    notes = prog[(e8 // 16) % 4]
    m = notes[[1, 2, 3, 2][e8 % 4]] + 12
    s0 = int(e8 * BEAT / 2 * SR)
    L = min(int(0.35 * SR), n - s0)
    if L <= 0:
        break
    t = np.arange(L) / SR
    arp[s0:s0 + L] += (np.sin(2 * np.pi * midi(m) * t) + 0.4 * np.sin(4 * np.pi * midi(m) * t)) * np.exp(-t * 11)
arp = lowpass(arp, 2500) * 0.06

# soft kick on 1 and 3, hat on off-beats, after the intro
drums = np.zeros(n)
for b in range(int(DUR / BEAT)):
    s0 = int(b * BEAT * SR)
    if b * BEAT < 8 * BEAT:
        continue
    if b % 2 == 0:
        L = min(int(0.3 * SR), n - s0)
        t = np.arange(L) / SR
        f = 90 * np.exp(-t * 18) + 45
        drums[s0:s0 + L] += np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9) * 0.35
    s1 = s0 + int(BEAT / 2 * SR)
    L = min(int(0.05 * SR), n - s1)
    if L > 0:
        drums[s1:s1 + L] += rng.normal(0, 1, L) * np.exp(-np.arange(L) / SR * 90) * 0.035

mix = pad + ep + arp + drums
# overall fade in / out
fade = np.ones(n)
fi, fo = int(3 * SR), int(5 * SR)
fade[:fi] = np.linspace(0, 1, fi)
fade[-fo:] = np.linspace(1, 0, fo)
mix *= fade
mix /= np.max(np.abs(mix)) + 1e-9
mix *= 0.8
stereo = np.stack([mix, np.roll(mix, int(0.012 * SR))], axis=1)  # tiny Haas widening
pcm = (stereo * 32767).astype(np.int16)

OUT.parent.mkdir(parents=True, exist_ok=True)
with wave.open(str(OUT), "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print(f"wrote {OUT} ({DUR:.0f}s)")
