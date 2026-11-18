#!/usr/bin/env python3
"""Делает «живее» MIDI-демо и рендерит аудио.

1. Свинг: в тактах 38–71 восьмые на «и» сдвигаются на третью триоль.
2. Добавляет дорожку ударных (GM, канал 10) по форме пьесы.
3. Рендер через FluidSynth (FluidR3_GM) -> WAV -> MP3.
"""
import random
import subprocess
from pathlib import Path

import mido

HERE = Path(__file__).resolve().parent
SRC = HERE / 'out' / 'pisma-demo.mid'
OUT_MID = HERE / 'out' / 'pisma-audio.mid'
SF2 = '/usr/share/sounds/sf2/FluidR3_GM.sf2'

mid = mido.MidiFile(SRC)
Q = mid.ticks_per_beat
BAR = 4 * Q


def bar_tick(bar, beat=0.0):
    return int((bar - 1) * BAR + beat * Q)


SWING = (bar_tick(38), bar_tick(72))


def swing(t):
    if SWING[0] <= t < SWING[1] and t % Q == Q // 2:
        return t - t % Q + (2 * Q) // 3
    return t


# ---- swing existing tracks
for tr in mid.tracks:
    abs_t, evs = 0, []
    for msg in tr:
        abs_t += msg.time
        evs.append((swing(abs_t), msg))
    evs.sort(key=lambda x: x[0])  # stable
    last = 0
    tr.clear()
    for t, msg in evs:
        tr.append(msg.copy(time=t - last))
        last = t

# ---- drums
random.seed(7)
KICK, SNARE, SIDE, HHF, RIDE, CRASH, TOMH, TOMM, TOMF, BELL = 36, 38, 37, 44, 51, 49, 50, 47, 43, 53
notes = []  # (tick, note, vel)


def hit(bar, beat, note, vel):
    v = max(1, min(127, int(vel + random.randint(-6, 6))))
    notes.append((bar_tick(bar, beat), note, v))


def roll(bar, beat_from, beats, note, v0, v1, step=0.125):
    n = int(beats / step)
    for i in range(n):
        hit(bar, beat_from + i * step, note, v0 + (v1 - v0) * i / max(1, n - 1))


def ballad(bar, vol=40):
    for b in range(4):
        hit(bar, b, RIDE, vol)
        hit(bar, b + 2 / 3, RIDE, vol - 15) if b in (1, 3) else None
    hit(bar, 1, HHF, vol)
    hit(bar, 3, HHF, vol)
    hit(bar, 1, SIDE, vol + 5)
    hit(bar, 3, SIDE, vol + 5)
    hit(bar, 0, KICK, vol - 10)


def swing_time(bar, vol=62):
    for b in range(4):
        hit(bar, b, RIDE, vol + (8 if b in (1, 3) else 0))
    hit(bar, 1 + 2 / 3, RIDE, vol - 12)
    hit(bar, 3 + 2 / 3, RIDE, vol - 12)
    hit(bar, 1, HHF, vol)
    hit(bar, 3, HHF, vol)
    for b in range(4):
        hit(bar, b, KICK, 28)
    if random.random() < 0.35:  # comping on snare
        hit(bar, random.choice([1 + 2 / 3, 2 + 2 / 3, 3 + 2 / 3]), SNARE, 45)


def fill(bar, start=2.0, vol=80):
    seq = [SNARE, SNARE, TOMH, TOMH, TOMM, TOMM, TOMF, TOMF]
    for i in range(int((4 - start) * 4)):
        hit(bar, start + i * 0.25, seq[i % len(seq)], vol + i * 2)


def solo(bar):
    for b in range(4):
        trip = [0, 1 / 3, 2 / 3]
        pick = random.choice([[SNARE, SNARE, TOMH], [TOMH, TOMM, TOMF], [SNARE, KICK, SNARE], [TOMM, TOMF, KICK]])
        for t, n in zip(trip, pick):
            hit(bar, b + t, n, 70 + random.randint(0, 25))
    hit(bar, 0, CRASH, 85) if bar % 2 == 0 else None


def accents(bar, beats, vol=95):
    for b in beats:
        hit(bar, b, SNARE, vol)
        hit(bar, b, KICK, vol - 10)


# intro: cymbal swell in bar 4
roll(4, 2, 2, RIDE, 15, 70)
hit(5, 0, CRASH, 50)
for bar in range(5, 37):
    ballad(bar, 34 if bar < 21 else 42 if bar < 29 else 50)
    if bar in (12, 20, 28):
        fill(bar, 3.0, 50)
hit(37, 0, CRASH, 95)
fill(37, 2.0, 70)
hit(38, 0, CRASH, 90)
for bar in range(38, 54):
    swing_time(bar, 60)
accents(52, [0.5 + 1 / 6, 2.5 + 1 / 6], 80)
accents(53, [0.5 + 1 / 6, 2.5 + 1 / 6, 3.5 + 1 / 6], 85)
for bar in range(54, 62):
    swing_time(bar, 72)
hit(54, 0.5 + 1 / 6, CRASH, 100)
hit(58, 0, CRASH, 95)
hit(59, 0, CRASH, 110)
hit(61, 3.5 + 1 / 6, CRASH, 110)
for bar in (62, 63, 66, 67):
    swing_time(bar, 62)
for bar in (64, 65, 68, 69):
    solo(bar)
accents(70, [0, 1 / 3, 2 / 3, 1, 2.75, 3], 105)
hit(70, 0, CRASH, 110)
accents(71, [0.25, 0.5, 1.5, 3], 105)
hit(71, 3, CRASH, 115)
hit(72, 0, CRASH, 90)
for bar in range(72, 80):
    ballad(bar, 62)
    hit(bar, 0, KICK, 60)
fill(79, 3.0, 75)
roll(80, 0, 4, RIDE, 25, 35)
roll(81, 0, 4, RIDE, 30, 85)
hit(82, 0, CRASH, 100)
hit(82, 3, TOMH, 70)
hit(82, 3 + 1 / 3, TOMM, 70)
hit(82, 3 + 2 / 3, TOMF, 75)
roll(83, 0, 4, RIDE, 40, 15)

drum = mido.MidiTrack()
drum.append(mido.MetaMessage('track_name', name='Drums', time=0))
evs = []
for t, n, v in notes:
    evs.append((t, 1, mido.Message('note_on', channel=9, note=n, velocity=v)))
    evs.append((t + Q // 8, 0, mido.Message('note_off', channel=9, note=n, velocity=0)))
evs.sort(key=lambda x: (x[0], x[1]))
last = 0
for t, _, m in evs:
    drum.append(m.copy(time=t - last))
    last = t
mid.tracks.append(drum)
mid.save(OUT_MID)

wav = HERE / 'out' / 'pisma-demo.wav'
mp3 = HERE / 'out' / 'pisma-demo.mp3'
subprocess.run(['fluidsynth', '-ni', '-g', '0.6', '-R', '1', '-r', '44100',
                '-F', str(wav), SF2, str(OUT_MID)], check=True, stdout=subprocess.DEVNULL)
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(wav),
                '-af', 'aecho=0.8:0.5:40|70:0.18|0.1,loudnorm=I=-16:TP=-1.5',
                '-b:a', '192k', str(mp3)], check=True)
wav.unlink()
print('wrote', mp3)
