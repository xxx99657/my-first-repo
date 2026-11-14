import numpy as np, wave, subprocess, os
KN = [[0,0],[6,6],[14.7,12],[21.4,18.5],[26.2,23.3],[37.8,31],[46.7,38],[54.0,44.5],[63.7,48.4],[66.3,51],[76.2,57.6],[80.4,60.4],[88.0,68]]
def V(x):
    for i in range(1, len(KN)):
        if x <= KN[i][1]:
            (v0, s0), (v1, s1) = KN[i-1], KN[i]; return v0 + (x - s0) / (s1 - s0) * (v1 - v0)
    return 88.0 + x - 68
SR = 48000; DUR = 88.0; N = int(SR * DUR)
rng = np.random.default_rng(7)
t = np.arange(N) / SR
L = np.zeros(N); R = np.zeros(N)

def env_pts(pts):
    xs, ys = zip(*pts); return np.interp(t, xs, ys)
def env_pts_s(pts): return env_pts([(V(x), y) for x, y in pts])
def lp(x, a):  # one-pole lowpass, a in (0,1)
    from scipy.signal import lfilter
    return lfilter([a], [1, a - 1], x)
try:
    from scipy.signal import butter, sosfilt, fftconvolve
except ImportError:
    subprocess.run(['pip', 'install', '-q', 'scipy']); from scipy.signal import butter, sosfilt, fftconvolve
def bp(x, lo, hi, o=2): return sosfilt(butter(o, [lo, hi], 'band', fs=SR, output='sos'), x)
def lpf(x, f, o=2): return sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x)
def hpf(x, f, o=2): return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x)
def add(sig, at, gain=1.0, pan=0.0):
    i = int(at * SR); n = min(len(sig), N - i)
    if n <= 0: return
    gl = np.cos((pan + 1) * np.pi / 4) * 1.41; gr = np.sin((pan + 1) * np.pi / 4) * 1.41
    L[i:i + n] += sig[:n] * gain * gl; R[i:i + n] += sig[:n] * gain * gr

# scene masks
storm = env_pts_s([(0, 0), (37.5, 0), (38.2, 1), (68, 1)])
interior = env_pts_s([(0, 0), (30.95, 0), (31.05, 1), (37.95, 1), (38.05, 0), (44.45, 0), (44.55, 1), (50.95, 1), (51.05, 0), (57.55, 0), (57.65, 1), (60.35, 1), (60.45, 0.35), (68, 0.35)])
village = env_pts_s([(0, 0), (18.4, 0), (18.6, 1), (23.2, 1), (23.4, 0), (68, 0)])
past = env_pts_s([(0, 0), (11.9, 0), (12.1, 1), (16.6, 1), (17.8, 0), (68, 0)])
master = env_pts_s([(0, 0), (0.6, 1), (65.0, 1), (67.5, 0), (68, 0)])

# ---------------- ocean / surf
brown = np.cumsum(rng.standard_normal(N)); brown = hpf(brown, 20); brown /= np.abs(brown).max()
surf_mod = 0.55 + 0.45 * np.sin(2 * np.pi * t / 7.3) ** 2 + 0.25 * np.sin(2 * np.pi * t / 3.1 + 1) ** 4
surf = lpf(brown, 900) * surf_mod
surf2 = bp(rng.standard_normal(N), 300, 2500) * (np.sin(2 * np.pi * t / 7.3 + 0.4) ** 8) * 0.25
ocean = (surf + surf2) * (0.35 + 0.9 * storm)
ocean_in = lpf(ocean, 350)
oc = ocean * (1 - interior) + ocean_in * interior * 0.5
oc *= (1 - past * 0.5)
L += oc * 0.55; R += np.roll(oc, 900) * 0.55

# ---------------- wind
wn = rng.standard_normal(N)
sweep = 0.5 + 0.5 * np.sin(2 * np.pi * t / 9.0) * np.sin(2 * np.pi * t / 4.3 + 2)
wind = bp(wn, 250, 1100, 2) * (0.3 + 0.7 * sweep) * (0.12 + 0.5 * storm)
wind = wind * (1 - interior * 0.75)
L += wind * 0.5; R += np.roll(wind, 4000) * 0.5

# ---------------- rain
rn = hpf(rng.standard_normal(N), 2500) * 0.12 + bp(rng.standard_normal(N), 800, 3000) * 0.08
drops = (rng.random(N) > 0.9993) * rng.standard_normal(N) * 1.5; drops = bp(drops, 1500, 6000)
rain = (rn + drops) * storm
rain_in = lpf(rain, 1200) * 0.6
# drops on window/roof inside
roof = bp((rng.random(N) > 0.9985) * rng.standard_normal(N), 400, 2500) * 0.5 * storm
rr = rain * (1 - interior) + (rain_in + roof) * interior
L += rr * 0.6; R += np.roll(rr, 2400) * 0.6

# ---------------- thunder
for ts, g, pan in [(39.4, 1.0, -0.4), (42.6, 0.8, 0.5), (46.1, 0.6, -0.2), (61.6, 1.0, -0.6), (65.0, 0.7, 0.4)]:
    n = int(SR * 6); tt = np.arange(n) / SR
    crack = hpf(rng.standard_normal(n), 1500) * np.exp(-tt * 12) * 0.6
    rumble = lpf(np.cumsum(rng.standard_normal(n)), 120); rumble /= np.abs(rumble).max()
    rumble *= (1 - np.exp(-tt * 6)) * np.exp(-tt * 0.7) * (1 + 0.5 * np.sin(tt * 9) * np.sin(tt * 3.7))
    th = crack + rumble * 1.2
    add(th, V(ts) + 0.25, g * 0.6, pan)

# ---------------- music pad (D minor), soft
def note(f, dur, a=2.0, r=3.0, harm=(1, 0.5, 0.25, 0.12), det=0.003):
    n = int(SR * dur); tt = np.arange(n) / SR
    s = np.zeros(n)
    for k, h in enumerate(harm, 1):
        for d in (-det, det):
            s += h * np.sin(2 * np.pi * f * k * (1 + d) * tt + rng.random() * 6)
    e = np.minimum(1, tt / a) * np.minimum(1, (dur - tt) / r).clip(0)
    return s * e
midi = lambda m: 440 * 2 ** ((m - 69) / 12)
chords = [(0, [38, 50, 53, 57]), (8, [34, 46, 50, 53]), (16, [31, 43, 46, 50]), (24, [33, 45, 49, 52]),
          (32, [38, 50, 53, 57]), (40, [34, 46, 50, 55]), (48, [33, 45, 48, 52]), (56, [38, 50, 53, 57]), (61, [33, 45, 49, 52])]
chords = [(round(st * 88 / 68, 2), ns) for st, ns in chords]
for i, (st, ns) in enumerate(chords):
    dur = (chords[i + 1][0] - st if i + 1 < len(chords) else DUR - st) + 3
    for m in ns:
        add(lpf(note(midi(m), dur), 1800), st, 0.035 if m > 40 else 0.05, rng.uniform(-0.5, 0.5))
# music box melody in flashback
mb = [(12.3, 74), (12.9, 77), (13.5, 81), (14.1, 79), (14.7, 77), (15.3, 76), (15.9, 74), (16.8, 73), (17.5, 74)]
for ts, m in mb:
    n = int(SR * 2.5); tt = np.arange(n) / SR; f = midi(m)
    s = (np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(2 * np.pi * f * 2.01 * tt) + 0.15 * np.sin(2 * np.pi * f * 4.2 * tt)) * np.exp(-tt * 2.2) * np.minimum(1, tt / 0.004)
    add(s, V(ts), 0.07, 0.3)
# deep hits
for ts, g in [(0.5, 0.5), (6.0, 0.3), (57.6, 0.3), (62.6, 0.45)]:
    n = int(SR * 5); tt = np.arange(n) / SR
    s = np.sin(2 * np.pi * (45 + 25 * np.exp(-tt * 3)) * tt) * np.exp(-tt * 0.9) + lpf(rng.standard_normal(n), 200) * np.exp(-tt * 1.5) * 0.4
    add(s, V(ts), g)
# tension drone in the storm part
dr = (np.sin(2 * np.pi * 73.4 * t) + 0.5 * np.sin(2 * np.pi * 77.8 * t)) * env_pts_s([(0, 0), (44, 0), (48, 0.05), (57, 0.08), (60, 0.03), (66, 0)])
L += dr; R += dr

# ---------------- metal knocks (Morse) at lighthouse
def knock(g=1.0):
    n = int(SR * 0.9); tt = np.arange(n) / SR; s = np.zeros(n)
    for f, d, a in [(142, 5, 1), (318, 7, 0.6), (731, 11, 0.35), (1290, 16, 0.2), (2210, 25, 0.12)]:
        s += a * np.sin(2 * np.pi * f * tt + rng.random()) * np.exp(-tt * d)
    s += lpf(rng.standard_normal(n), 3000) * np.exp(-tt * 120) * 0.8
    return s * g
k0 = 26.3; seq = []
for i in range(3): seq.append(k0 + i * 0.28)
for i in range(3): seq.append(k0 + 1.25 + i * 0.75)
for i in range(3): seq.append(k0 + 3.85 + i * 0.28)
for ts in seq:
    s = knock(); s = s + 0.35 * np.concatenate([np.zeros(int(SR * 0.09)), s[:-int(SR * 0.09)]])  # tower echo
    add(s, V(ts), 0.5, 0.15)

# ---------------- typewriter
def click(g=1.0):
    n = int(SR * 0.08); tt = np.arange(n) / SR
    return (bp(rng.standard_normal(n), 1500, 7000) * np.exp(-tt * 90) + np.sin(2 * np.pi * 180 * tt) * np.exp(-tt * 60) * 0.5) * g
for base_ph in (0, 2.1):
    k = 0
    while True:
        # peaks of sin(u*17 + ph): u = (pi/2 - ph + 2pi k)/17
        u = (np.pi / 2 - base_ph + 2 * np.pi * k) / 17; k += 1
        if u < V(31): continue
        if u > V(37.9): break
        if V(35.2) < u < V(37.0): continue
        add(click(rng.uniform(0.6, 1.0)), u - 0.02, 0.22, rng.uniform(-0.3, 0.1))
n = int(SR * 2); tt = np.arange(n) / SR
add((np.sin(2 * np.pi * 2093 * tt) + 0.4 * np.sin(2 * np.pi * 5230 * tt)) * np.exp(-tt * 3), V(35.15), 0.08, 0.2)  # carriage bell
# stove crackle
cr = bp((rng.random(N) > 0.9996) * rng.standard_normal(N) * 2, 800, 5000) * interior * (1 - storm * 0.3)
L += cr * 0.25; R += cr * 0.18

# ---------------- signal flash tones
SIG = [(48.6, .18), (48.95, .18), (49.3, .18), (52.3, .2), (52.65, .2), (53.0, .2), (54.2, .55), (54.95, .55), (55.7, .55), (56.75, .2), (57.1, .2), (57.45, .2), (58.6, .2), (58.95, .2), (59.3, .2), (62.6, 1.0)]
for ts, d in SIG:
    d = V(ts + d) - V(ts); ts = V(ts)
    n = int(SR * (d + 0.6)); tt = np.arange(n) / SR
    e = np.minimum(1, tt / 0.02) * np.clip((d + 0.05 - tt) / 0.05, 0, 1) + np.exp(-np.maximum(tt - d, 0) * 5) * (tt > d) * 0.3
    s = (np.sin(2 * np.pi * 220 * tt) * 0.6 + np.sin(2 * np.pi * 440.7 * tt) * 0.3 + np.sin(2 * np.pi * 660 * tt) * 0.12) * e
    add(s, ts, 0.06, 0)

# ---------------- footsteps (final scene, wet)
ph0 = 60.6
k = 0
while True:
    ts = ph0 + (np.pi / 2 + np.pi * k) / 7.5; k += 1
    if ts > 66: break
    tsv = V(ts)
    n = int(SR * 0.25); tt = np.arange(n) / SR
    s = lpf(rng.standard_normal(n), 900) * np.exp(-tt * 30) + bp(rng.standard_normal(n), 2000, 6000) * np.exp(-tt * 18) * 0.3
    add(s, tsv, 0.09, -0.2)
# door
n = int(SR * 1.2); tt = np.arange(n) / SR
add(lpf(rng.standard_normal(n), 400) * np.exp(-tt * 8) + np.sin(2 * np.pi * 90 * tt) * np.exp(-tt * 10), V(60.3), 0.25, -0.3)

# ---------------- village: distant dog + creaking sign
n = int(SR * 0.35); tt = np.arange(n) / SR
bark = bp(np.sign(np.sin(2 * np.pi * (420 - 180 * tt) * tt)) * np.exp(-tt * 9), 300, 2000)
for ts in (19.6, 20.0, 21.9): add(bark, V(ts), 0.05, -0.7)
n = int(SR * 1.5); tt = np.arange(n) / SR
creak = bp(np.sin(2 * np.pi * (300 + 120 * np.sin(tt * 3)) * tt) * (np.sin(2 * np.pi * 23 * tt) > 0.6), 300, 2500) * np.sin(np.pi * tt / 1.5)
add(creak, V(21.0), 0.05, 0.4)

# ---------------- narration
def readwav(p):
    with wave.open(p) as w:
        sr = w.getframerate(); x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float64) / 32768
    if sr != SR:
        from scipy.signal import resample_poly
        from math import gcd
        gg = gcd(SR, sr); x = resample_poly(x, SR // gg, sr // gg)
    return x
ir_n = int(SR * 0.6); irt = np.arange(ir_n) / SR
ir = rng.standard_normal(ir_n) * np.exp(-irt * 9); ir[0] = 0
def voice(x):
    return x  # голос без какой-либо обработки
vo = np.zeros(N)
X = '../xtts/'
placement = [(X+'line_1.wav', 6.4), (X+'line_2.wav', 15.1), (X+'line_3.wav', 21.8), (X+'line_4.wav', 26.6), (X+'line_5.wav', 38.2), (X+'line_6.wav', 47.1), (X+'line_7.wav', 54.4), (X+'line_8.wav', 66.55), (X+'line_9.wav', 69.7), (X+'line_10.wav', 72.8), (X+'line_11.wav', 76.6)]
for p, at in placement:
    x = voice(readwav(p)); x = x * (0.16 / np.sqrt(np.mean(x[np.abs(x) > 0.01] ** 2))); i = int(at * SR); vo[i:i + len(x)] += x[:N - i]
vo_env = lpf(np.abs(vo), 3) ; duck = 1 - 0.8 * np.clip(vo_env * 16, 0, 1)
L *= duck; R *= duck
m = np.abs(vo) > 1e-4
for a,b in [(6.4,14.2),(15.1,20.7),(26.6,36.7),(38.2,46.2),(47.1,53.5),(54.4,65.0),(76.6,79.8)]:
    i,j=int(a*SR),int(b*SR); rv=np.sqrt(np.mean((vo[i:j]*1.8)**2)); rb=np.sqrt(np.mean(L[i:j]**2))
    print(a, 'voice/bed dB', round(20*np.log10(rv/rb),1))
L += vo * 1.8; R += vo * 1.8

L *= master; R *= master
pk = max(np.abs(L).max(), np.abs(R).max()); g = 0.89 / pk
out = np.stack([L * g, R * g], 1)
with wave.open('soundtrack.wav', 'w') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((out * 32767).astype(np.int16).tobytes())
print('ok', pk)
