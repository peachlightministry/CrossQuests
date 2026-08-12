#!/usr/bin/env python3
"""Generates the site's sound effects as WAV files. Pure stdlib, no external assets."""
import math
import struct
import wave
import os

SAMPLE_RATE = 44100

def envelope(i, n, attack, release):
    if i < attack:
        return i / attack
    if i > n - release:
        return max(0.0, (n - i) / release)
    return 1.0

def note(freq, duration, volume=0.5, attack_ratio=0.08, release_ratio=0.35, harmonic=0.0):
    n = int(SAMPLE_RATE * duration)
    attack = max(1, int(n * attack_ratio))
    release = max(1, int(n * release_ratio))
    samples = []
    for i in range(n):
        t = i / SAMPLE_RATE
        env = envelope(i, n, attack, release)
        val = math.sin(2 * math.pi * freq * t)
        if harmonic > 0:
            val += harmonic * math.sin(2 * math.pi * freq * 2 * t)
        samples.append(val * env * volume)
    return samples

def sequence(*parts):
    out = []
    for p in parts:
        out.extend(p)
    return out

def save_wav(filename, samples):
    peak = max(0.0001, max(abs(s) for s in samples))
    scale = 0.9 / peak if peak > 0.9 else 1.0
    with wave.open(filename, 'w') as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(SAMPLE_RATE)
        frames = b''.join(
            struct.pack('<h', int(max(-1.0, min(1.0, s * scale)) * 32767))
            for s in samples
        )
        f.writeframes(frames)
    print(f'wrote {filename} ({len(samples) / SAMPLE_RATE:.2f}s)')

out_dir = os.path.join(os.path.dirname(__file__), '..', 'sounds')
os.makedirs(out_dir, exist_ok=True)

# Tick: short blip used while a reel is spinning.
tick = note(880, 0.045, volume=0.35, attack_ratio=0.05, release_ratio=0.5)
save_wav(os.path.join(out_dir, 'tick.wav'), tick)

# Click: soft button press.
click = note(660, 0.035, volume=0.3, attack_ratio=0.1, release_ratio=0.6)
save_wav(os.path.join(out_dir, 'click.wav'), click)

# Reveal sounds, graduated by rarity: more notes, a touch more volume/length and
# shimmer as rarity increases, without any one of them becoming overblown.

reveal_1 = sequence(  # Mustard Seed - simple two-note ding
    note(659.25, 0.11, volume=0.32),
    note(880.00, 0.16, volume=0.34, release_ratio=0.55),
)
save_wav(os.path.join(out_dir, 'reveal-1.wav'), reveal_1)

reveal_2 = sequence(  # Loaves & Fishes - gentle three-note chime
    note(523.25, 0.13, volume=0.34),
    note(659.25, 0.13, volume=0.36),
    note(880.00, 0.22, volume=0.4, release_ratio=0.55),
)
save_wav(os.path.join(out_dir, 'reveal-2.wav'), reveal_2)

reveal_3 = sequence(  # Widow's Mite - three-note chime with a touch of shimmer
    note(523.25, 0.13, volume=0.36, harmonic=0.08),
    note(659.25, 0.13, volume=0.38, harmonic=0.08),
    note(783.99, 0.13, volume=0.4, harmonic=0.1),
    note(1046.50, 0.24, volume=0.44, harmonic=0.1, release_ratio=0.6),
)
save_wav(os.path.join(out_dir, 'reveal-3.wav'), reveal_3)

reveal_4 = sequence(  # Wilderness Wanderer - four-note ascending run
    note(440.00, 0.12, volume=0.36, harmonic=0.1),
    note(523.25, 0.12, volume=0.38, harmonic=0.1),
    note(659.25, 0.12, volume=0.4, harmonic=0.12),
    note(880.00, 0.28, volume=0.46, harmonic=0.14, release_ratio=0.6),
)
save_wav(os.path.join(out_dir, 'reveal-4.wav'), reveal_4)

reveal_5 = sequence(  # Refiner's Fire - five-note run with warmer shimmer
    note(392.00, 0.12, volume=0.36, harmonic=0.14),
    note(523.25, 0.12, volume=0.38, harmonic=0.14),
    note(659.25, 0.12, volume=0.4, harmonic=0.16),
    note(783.99, 0.12, volume=0.43, harmonic=0.18),
    note(1046.50, 0.34, volume=0.48, harmonic=0.2, release_ratio=0.65),
)
save_wav(os.path.join(out_dir, 'reveal-5.wav'), reveal_5)

reveal_6 = sequence(  # Burning Bush (secret) - grandest, longest, most shimmer
    note(392.00, 0.14, volume=0.35, harmonic=0.15),
    note(523.25, 0.14, volume=0.38, harmonic=0.15),
    note(659.25, 0.14, volume=0.4, harmonic=0.18),
    note(783.99, 0.14, volume=0.42, harmonic=0.18),
    note(1046.50, 0.22, volume=0.46, harmonic=0.22),
    note(1318.51, 0.55, volume=0.5, harmonic=0.25, release_ratio=0.7),
)
save_wav(os.path.join(out_dir, 'reveal-6.wav'), reveal_6)

# Belief-reveal: a brief "uneasy" interval resolving into a bright tone -
# a lie being named, then answered with truth.
belief_reveal = sequence(
    note(587.33, 0.10, volume=0.26),
    note(493.88, 0.09, volume=0.24),
    note(783.99, 0.13, volume=0.4),
    note(1046.50, 0.28, volume=0.48, release_ratio=0.6),
)
save_wav(os.path.join(out_dir, 'belief-reveal.wav'), belief_reveal)

# Conquered: a short, decisive confirmation - a low thump then a bright ping.
conquered = sequence(
    note(130.81, 0.09, volume=0.5, attack_ratio=0.02, release_ratio=0.55),
    note(659.25, 0.09, volume=0.38),
    note(1046.50, 0.22, volume=0.5, release_ratio=0.6),
)
save_wav(os.path.join(out_dir, 'conquered.wav'), conquered)
