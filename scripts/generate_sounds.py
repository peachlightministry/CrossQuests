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

def silence(duration):
    return [0.0] * int(SAMPLE_RATE * duration)

def mix(*tracks):
    length = max(len(t) for t in tracks)
    out = [0.0] * length
    for t in tracks:
        for i, v in enumerate(t):
            out[i] += v
    return out

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

# Tick: short blip used while the reel is spinning.
tick = note(880, 0.045, volume=0.35, attack_ratio=0.05, release_ratio=0.5)
save_wav(os.path.join(out_dir, 'tick.wav'), tick)

# Reveal: a friendly rising major arpeggio (C5 - E5 - G5 - C6).
reveal = sequence(
    note(523.25, 0.16, volume=0.4),
    note(659.25, 0.16, volume=0.42),
    note(783.99, 0.16, volume=0.45),
    note(1046.50, 0.32, volume=0.5, release_ratio=0.6),
)
save_wav(os.path.join(out_dir, 'reveal.wav'), reveal)

# Secret reveal: grander, longer arpeggio with a soft shimmering harmonic.
secret = sequence(
    note(392.00, 0.14, volume=0.35, harmonic=0.15),
    note(523.25, 0.14, volume=0.38, harmonic=0.15),
    note(659.25, 0.14, volume=0.4, harmonic=0.18),
    note(783.99, 0.14, volume=0.42, harmonic=0.18),
    note(1046.50, 0.22, volume=0.46, harmonic=0.22),
    note(1318.51, 0.55, volume=0.5, harmonic=0.25, release_ratio=0.7),
)
save_wav(os.path.join(out_dir, 'reveal-secret.wav'), secret)

# Click: soft button press.
click = note(660, 0.035, volume=0.3, attack_ratio=0.1, release_ratio=0.6)
save_wav(os.path.join(out_dir, 'click.wav'), click)
