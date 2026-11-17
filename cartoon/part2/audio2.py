import numpy as np, wave
from scipy.signal import butter, sosfilt, resample_poly
from math import gcd
SR = 48000; DUR = 74.0; N = int(SR * DUR)
rng = np.random.default_rng(11)
t = np.arange(N) / SR
L = np.zeros(N); R = np.zeros(N)
def env(pts): xs, ys = zip(*pts); return np.interp(t, xs, ys)
def bp(x, lo, hi, o=2): return sosfilt(butter(o, [lo, hi], 'band', fs=SR, output='sos'), x)
def lpf(x, f, o=2): return sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x)
def hpf(x, f, o=2): return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x)
def add(sig, at, gain=1.0, pan=0.0):
    i = int(at * SR); n = min(len(sig), N - i)
    if n <= 0 or i < 0: return
    gl = np.cos((pan + 1) * np.pi / 4) * 1.41; gr = np.sin((pan + 1) * np.pi / 4) * 1.41
    L[i:i + n] += sig[:n] * gain * gl; R[i:i + n] += sig[:n] * gain * gr
def tt_(d): return np.arange(int(SR * d)) / SR
def echo(x, delays=(0.07, 0.13, 0.21, 0.33), g=0.35):
    y = x.copy()
    for k, d in enumerate(delays):
        s = int(d * SR); y[s:] += x[:-s] * g * (0.75 ** k)
    return y

# shot times (must match index2.html)
WALK, PRY, INSIDE, SMELL, STAIRS, MECH, ROOM, BOX, NEWS, DATE = 6, 11, 17, 21, 25.2, 33, 38, 48.8, 57, 63.6
outside = env([(0, 1), (17.4, 1), (19.5, 0.0), (74, 0)])
inside = 1 - outside
master = env([(0, 0), (0.8, 1), (70.6, 1), (72.4, 0), (74, 0)])

# ---------- exterior ambience: calm sea, wind, gulls
brown = np.cumsum(rng.standard_normal(N)); brown = hpf(brown, 20); brown /= np.abs(brown).max()
surf = lpf(brown, 700) * (0.5 + 0.5 * np.sin(2 * np.pi * t / 8.5) ** 2) + bp(rng.standard_normal(N), 400, 2500) * (np.sin(2 * np.pi * t / 8.5 + 0.5) ** 10) * 0.12
wind = bp(rng.standard_normal(N), 300, 1200) * (0.5 + 0.5 * np.sin(2 * np.pi * t / 11) * np.sin(2 * np.pi * t / 5.3)) * 0.08
amb_out = (surf * 0.45 + wind) * outside
amb_in = lpf(surf * 0.45 + wind * 2.0, 300) * inside * 0.35   # muffled outside heard from inside
L += amb_out + amb_in; R += np.roll(amb_out + amb_in, 1200)
def gull():
    d = 0.5; x = tt_(d); f = 1500 + 700 * np.sin(np.pi * x / d) - 600 * x
    ph = 2 * np.pi * np.cumsum(f) / SR; s = (np.sin(ph) + 0.4 * np.sin(2 * ph)) * np.sin(np.pi * x / d) ** 1.5
    return bp(s, 700, 4000)
for ts, p in [(1.2, -0.6), (1.75, -0.6), (3.9, 0.5), (8.3, 0.7), (8.8, 0.7), (12.6, -0.4), (16.0, 0.3)]: add(gull(), ts, 0.03, p)
# footsteps on grass (walk shot)
k = 0
while True:
    ts = WALK + (np.pi / 2 + np.pi * k) / 7.0; k += 1
    if ts > PRY - 0.1: break
    x = tt_(0.2); s = lpf(rng.standard_normal(len(x)), 1200) * np.exp(-x * 25) + bp(rng.standard_normal(len(x)), 2000, 7000) * np.exp(-x * 30) * 0.25
    add(s, ts, 0.06, 0.1)

# ---------- prying the lock
snap = PRY + (INSIDE - PRY) - 1.6
for ts, d in [(PRY + 0.4, 1.0), (PRY + 1.6, 1.4), (PRY + 3.2, 1.2)]:  # metal strain / scrape
    x = tt_(d); f = 380 + 120 * np.sin(x * 9) + rng.uniform(-40, 40)
    s = bp(rng.standard_normal(len(x)), 300, 3000) * 0.3 + np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.4 * (np.sin(x * 37) > 0.2)
    add(bp(s, 250, 4000) * np.sin(np.pi * x / d), ts, 0.07, 0.2)
x = tt_(1.2); crack = hpf(rng.standard_normal(len(x)), 1200) * np.exp(-x * 40)
ring = sum(a * np.sin(2 * np.pi * f * x) * np.exp(-x * dd) for f, dd, a in [(870, 9, 0.5), (1930, 14, 0.3), (3100, 20, 0.2)])
add(crack + ring, snap, 0.3, 0.2)
for ts, g in [(snap + 0.46, 0.22), (snap + 0.62, 0.1), (snap + 0.75, 0.05)]:  # padlock hits ground
    x = tt_(0.4); s = sum(a * np.sin(2 * np.pi * f * x) * np.exp(-x * dd) for f, dd, a in [(640, 25, 0.6), (1450, 35, 0.4), (2600, 45, 0.2)]) + lpf(rng.standard_normal(len(x)), 900) * np.exp(-x * 50)
    add(s, ts, g, 0.1)
def creak(d, f0=210, f1=120, g=1.0):
    x = tt_(d); f = np.interp(x, [0, d * 0.3, d], [f0, f0 * 0.9, f1]) * (1 + 0.04 * np.sin(x * 23))
    pulses = (np.sin(2 * np.pi * np.cumsum(f * 0.12) / SR) > 0.7).astype(float)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.6 + np.sin(2 * np.pi * np.cumsum(f * 2.7) / SR) * 0.3
    s = bp(s * (0.5 + pulses), 150, 3000) * np.sin(np.pi * x / d) ** 0.7
    return s * g
add(creak(0.9, 260, 220), snap + 0.3, 0.06, 0.2)   # door budges
# ---------- door opens (inside)
add(echo(creak(2.4, 230, 140)), INSIDE + 0.1, 0.12, 0.3)
x = tt_(0.8); add(echo(lpf(rng.standard_normal(len(x)), 300) * np.exp(-x * 6)), INSIDE + 2.3, 0.15, 0.3)
# room tone + drips inside
tone = lpf(rng.standard_normal(N), 160) * 0.05 + np.sin(2 * np.pi * 55 * t) * 0.004
L += tone * inside; R += tone * inside
ts = 18.3
while ts < 60:
    x = tt_(0.5); f = rng.uniform(900, 1400); s = np.sin(2 * np.pi * (f + 900 * np.exp(-x * 40)) * x) * np.exp(-x * 30)
    add(echo(s, g=0.4), ts, 0.025 if ts < 38 else 0.008, rng.uniform(-0.6, 0.6)); ts += rng.uniform(1.1, 2.2)
# ---------- footsteps on iron stairs + squeaks
k = 0
while True:
    ts = STAIRS + (np.pi / 2 + np.pi * k) / 4.2; k += 1
    if ts > MECH + 0.5: break
    x = tt_(0.6); s = sum(a * np.sin(2 * np.pi * f * x + rng.random()) * np.exp(-x * dd) for f, dd, a in [(rng.uniform(170, 210), 18, 0.7), (rng.uniform(520, 600), 26, 0.35), (1340, 40, 0.15)]) + lpf(rng.standard_normal(len(x)), 1500) * np.exp(-x * 60) * 0.6
    add(echo(s, (0.11, 0.23, 0.37, 0.55), 0.4), ts, 0.11, rng.uniform(-0.3, 0.3))
    if rng.random() < 0.7: add(creak(rng.uniform(0.25, 0.45), rng.uniform(500, 700), rng.uniform(350, 450)), ts + 0.08, 0.03, rng.uniform(-0.3, 0.3))
# ---------- mechanism creak + clock ticking (integer seconds) from MECH onward
add(creak(1.6, 140, 95), MECH + 1.0, 0.05, -0.3)
for sec in range(int(MECH) + 1, 70):
    x = tt_(0.12); s = bp(rng.standard_normal(len(x)), 2500, 7000) * np.exp(-x * 120) + np.sin(2 * np.pi * 3200 * x) * np.exp(-x * 90) * 0.3
    g = 0.035 if sec < ROOM else 0.06
    if sec >= 64: g = 0.08
    add(s, sec, g, 0.35)
# wooden floor creaks in top room
for ts in (ROOM + 1.2, ROOM + 2.6, ROOM + 6.5): add(creak(0.6, 330, 250), ts, 0.04, 0)
# ---------- box hinge + paper
add(creak(2.0, 900, 700, 0.6), BOX + 0.6, 0.025, 0.1)
x = tt_(1.6); paper = bp(rng.standard_normal(len(x)), 1500, 9000) * (np.abs(np.sin(x * 9)) ** 3) * np.sin(np.pi * x / 1.6)
add(paper, NEWS + 0.1, 0.12, 0)

# ---------- music
def note(f, dur, a=2.0, r=3.0, harm=(1, 0.45, 0.2, 0.1), det=0.003):
    x = tt_(dur); s = np.zeros(len(x))
    for k2, h in enumerate(harm, 1):
        for d in (-det, det): s += h * np.sin(2 * np.pi * f * k2 * (1 + d) * x + rng.random() * 6)
    return s * np.minimum(1, x / a) * np.clip((dur - x) / r, 0, 1)
midi = lambda m: 440 * 2 ** ((m - 69) / 12)
chords = [(0, [38, 50, 57, 62]), (11, [34, 46, 53, 58]), (21, [36, 48, 55, 60]), (33, [33, 45, 52, 57]), (38, [38, 50, 53, 57]), (48.8, [34, 46, 50, 53]), (57, [31, 43, 50, 55]), (64, [37, 49, 52, 56])]
for i, (st, ns) in enumerate(chords):
    dur = (chords[i + 1][0] - st if i + 1 < len(chords) else 70.5 - st) + 3
    for m in ns: add(lpf(note(midi(m), dur), 1600), st, 0.03 if m > 40 else 0.045, rng.uniform(-0.5, 0.5))
# music box callback (part 1 motif) when box opens
for ts, m in [(49.4, 74), (50.0, 77), (50.6, 81), (51.2, 79), (51.8, 77), (52.4, 76), (53.0, 74), (53.9, 73), (54.6, 74)]:
    x = tt_(2.5); f = midi(m)
    s = (np.sin(2 * np.pi * f * x) + 0.3 * np.sin(2 * np.pi * f * 2.01 * x) + 0.15 * np.sin(2 * np.pi * f * 4.2 * x)) * np.exp(-x * 2.2) * np.minimum(1, x / 0.004)
    add(s, ts, 0.06, 0.2)
# tension: rising drone + heartbeat
dr = (np.sin(2 * np.pi * 73.4 * t) + 0.6 * np.sin(2 * np.pi * 77.8 * t) + 0.3 * np.sin(2 * np.pi * 146.8 * t * (1 + 0.002 * np.sin(t)))) * env([(0, 0), (56, 0), (63, 0.06), (66.5, 0.1), (68, 0.02), (69.5, 0)])
L += dr; R += dr
for ts in np.arange(61.0, 67.0, 0.85):
    for off, g in ((0, 1.0), (0.18, 0.6)):
        x = tt_(0.35); s = np.sin(2 * np.pi * (55 + 40 * np.exp(-x * 30)) * x) * np.exp(-x * 14)
        add(s, ts + off, 0.22 * g * (0.5 + 0.5 * (ts - 61) / 6))
# sting on "завтрашним" (~65.05) and final boom
x = tt_(4.0); sting = (lpf(np.sign(np.sin(2 * np.pi * 110 * x)) * 0.3 + np.sin(2 * np.pi * 55 * x), 900) + hpf(rng.standard_normal(len(x)), 3000) * np.exp(-x * 8) * 0.4) * np.exp(-x * 1.1) * np.minimum(1, x / 0.01)
add(sting, 65.05, 0.3)
x = tt_(5.0); boom = np.sin(2 * np.pi * (40 + 30 * np.exp(-x * 3)) * x) * np.exp(-x * 0.8) + lpf(rng.standard_normal(len(x)), 150) * np.exp(-x * 1.4) * 0.5
add(boom, 68.2, 0.5); add(boom, 0.4, 0.35)

# ---------- narration (unprocessed voice; only level)
def readwav(p):
    with wave.open(p) as w:
        sr = w.getframerate(); x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float64) / 32768
    if sr != SR: g = gcd(SR, sr); x = resample_poly(x, SR // g, sr // g)
    return x
vo = np.zeros(N); X = '../xtts/p2/'
for i, at in zip(range(1, 9), [6.4, 17.6, 25.8, 33.4, 38.4, 49.2, 57.6, 64.0]):
    x = readwav(f'{X}line_{i}.wav'); x = x * (0.16 / np.sqrt(np.mean(x[np.abs(x) > 0.01] ** 2))); j = int(at * SR); vo[j:j + len(x)] += x[:N - j]
vo_env = lpf(np.abs(vo), 3); duck = 1 - 0.8 * np.clip(vo_env * 16, 0, 1)
L *= duck; R *= duck
L += vo * 1.8; R += vo * 1.8
L *= master; R *= master
pk = max(np.abs(L).max(), np.abs(R).max()); g = 0.89 / pk
with wave.open('soundtrack2.wav', 'w') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.stack([L * g, R * g], 1) * 32767).astype(np.int16).tobytes())
print('ok', round(pk, 2))
