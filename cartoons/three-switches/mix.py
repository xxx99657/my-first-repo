"""Шаг 3: сведение звука — голоса, синтезированные эффекты и фоновая музыка.

Результат: build/audio.wav
"""
import json
import wave
from pathlib import Path

import numpy as np

HERE = Path(__file__).parent
B = HERE / "build"
SR = 44100
rng = np.random.default_rng(7)


def t_(d):
    return np.arange(int(SR * d)) / SR


def env(d, a=0.005, decay=None):
    t = t_(d)
    e = np.minimum(1, t / a)
    if decay:
        e *= np.exp(-t / decay)
    return e


def sine(f, d):
    return np.sin(2 * np.pi * f * t_(d))


def bell(f, d=1.2, dec=0.4):
    t = t_(d)
    return (np.sin(2 * np.pi * f * t) + .4 * np.sin(2 * np.pi * f * 2.01 * t)
            + .2 * np.sin(2 * np.pi * f * 3.0 * t)) * env(d, .003, dec) / 1.6


def sweep(f0, f1, d):
    t = t_(d)
    f = f0 + (f1 - f0) * t / d
    return np.sin(2 * np.pi * np.cumsum(f) / SR)


def sfx(name):
    if name == "click":
        n = rng.standard_normal(int(SR * .02)) * env(.02, .0005, .004)
        return np.concatenate([n * .8 + sine(2200, .02) * env(.02, .0005, .006), np.zeros(800)])
    if name == "tick":
        return sine(1600, .04) * env(.04, .001, .008) * .8
    if name == "tock":
        return sine(1050, .05) * env(.05, .001, .01) * .8
    if name == "pop":
        return sweep(350, 1100, .08) * env(.08, .002, .03)
    if name == "ding":
        return bell(1318, 1.5, .5) + .5 * np.pad(bell(1975, 1.2, .4), (int(SR * .08), int(SR * .22)))[:int(SR * 1.5)]
    if name == "chime":
        out = np.zeros(int(SR * 2))
        for i, f in enumerate([1046, 1318, 1568, 2093]):
            b = bell(f, 1.4, .45) * .6
            s = int(SR * i * .12)
            out[s:s + len(b)] += b
        return out
    if name == "boing":
        t = t_(.45)
        f = 180 + 260 * t / .45 + 40 * np.sin(2 * np.pi * 18 * t)
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(.45, .005, .18)
    if name == "step":
        return sweep(140, 60, .07) * env(.07, .002, .02) * .9
    if name == "creak":
        t = t_(.9)
        f = 260 + 120 * np.sin(2 * np.pi * 1.3 * t) + 30 * rng.standard_normal(len(t)).cumsum() / 300
        ph = np.cumsum(f) / SR
        saw = 2 * (ph % 1) - 1
        e = np.sin(np.pi * t / .9) * (0.6 + .4 * (np.sin(2 * np.pi * 23 * t) > 0))
        y = np.convolve(saw * e, np.ones(12) / 12, "same")
        return y * .35
    if name == "sizzle":
        n = rng.standard_normal(int(SR * .7))
        n = np.diff(n, prepend=0)
        return n * env(.7, .01, .25) * .35
    if name == "tada":
        out = np.zeros(int(SR * 1.6))
        for start, dur in [(0, .14), (.18, 1.3)]:
            t = t_(dur)
            ch = sum(np.sign(np.sin(2 * np.pi * f * t)) * .25 + np.sin(2 * np.pi * f * t)
                     for f in [523, 659, 784, 1046])
            ch = np.convolve(ch, np.ones(6) / 6, "same") * env(dur, .01, dur * .6) / 5
            s = int(SR * start)
            out[s:s + len(ch)] += ch
        return out
    raise ValueError(name)


def music(dur):
    """Спокойная мелодия-луп: C – Am – F – G, 104 bpm."""
    bpm = 104
    beat = 60 / bpm
    out = np.zeros(int(SR * (dur + 2)))
    chords = [[261.6, 329.6, 392.0], [220.0, 261.6, 329.6], [174.6, 220.0, 261.6], [196.0, 246.9, 293.7]]
    melody = [0, 2, 1, 2, 0, 1, 2, 1]
    n_beats = int(dur / beat) + 1
    for b in range(n_beats):
        ch = chords[(b // 4) % 4]
        s = int(SR * b * beat)
        # пиццикато-арпеджио
        f = ch[melody[b % 8]] * 2
        note = (np.sin(2 * np.pi * f * t_(.5)) + .3 * np.sin(2 * np.pi * f * 2 * t_(.5))) * env(.5, .003, .12) * .35
        out[s:s + len(note)] += note
        if b % 2 == 1:  # «шаги» восьмыми
            f2 = ch[(melody[b % 8] + 1) % 3] * 2
            s2 = s + int(SR * beat / 2)
            n2 = np.sin(2 * np.pi * f2 * t_(.3)) * env(.3, .003, .08) * .2
            out[s2:s2 + len(n2)] += n2
        if b % 4 == 0:  # бас
            bs = np.sin(2 * np.pi * ch[0] / 2 * t_(beat * 4)) * env(beat * 4, .01, .9) * .5
            out[s:s + len(bs)] += bs
        if b % 2 == 0:
            bs = np.sin(2 * np.pi * ch[0] / 2 * t_(beat)) * env(beat, .01, .25) * .25
            out[s:s + len(bs)] += bs
    return out[:int(SR * dur)]


def read_wav(p):
    with wave.open(str(p)) as w:
        assert w.getframerate() == SR
        return np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768


def place(buf, clip, t, vol=1.0):
    s = int(SR * t)
    e = min(len(buf), s + len(clip))
    if s < len(buf):
        buf[s:e] += clip[:e - s] * vol


def main():
    tl = json.loads((B / "timeline.json").read_text())
    dur = tl["duration"]
    n = int(SR * dur)
    voice = np.zeros(n)
    speaking = np.zeros(n)
    for key, l in tl["lines"].items():
        v = read_wav(B / "lines" / f"{key}.wav")
        place(voice, v, l["start"], 1.0)
        s, e = int(SR * (l["start"] - .15)), int(SR * (l["end"] + .25))
        speaking[max(0, s):e] = 1
    fx = np.zeros(n)
    for ev in json.loads((B / "sfx.json").read_text()):
        place(fx, sfx(ev["name"]), ev["t"], ev["vol"] * .55)
    # музыка с «приглушением» под речь
    duck = np.convolve(speaking, np.ones(SR // 5) / (SR // 5), "same")
    m = music(dur) * (0.16 - 0.10 * duck)
    fade = np.minimum(1, np.arange(n) / (SR * .8)) * np.minimum(1, (n - np.arange(n)) / (SR * 2.0))
    mix = voice * 0.95 + fx + m * fade
    mix /= max(1.0, np.abs(mix).max() / .95)
    with wave.open(str(B / "audio.wav"), "w") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((mix * 32767).astype(np.int16).tobytes())
    print("audio done", round(dur, 1), "s")


if __name__ == "__main__":
    main()
