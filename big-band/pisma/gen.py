#!/usr/bin/env python3
"""Генератор партитуры «Письма, которые мы не отправили» для биг-бэнда.

Мелодия солиста, линии лидеров секций и сольные эпизоды написаны вручную
(в концертном строе, абсолютная нотация LilyPond). Скрипт гармонизует
линии лидеров по аккордовой сетке (4-way close / drop-2), строит партии
тромбонов, басовые линии (2-feel и walking), фортепианные голосоведения,
ритмические слэши для гитары и ударных и собирает:
  score.ly  – партитура (транспонированная, A3)
  parts.ly  – отдельные партии (A4)
  midi.ly   – MIDI-демо (без гитары и ударных)
"""
import copy
import re
from fractions import Fraction as Fr
from pathlib import Path

OUT = Path(__file__).resolve().parent
TOTAL_BARS = 83

# ---------------------------------------------------------------- pitches
STEPS = 'cdefgab'
NAT = [0, 2, 4, 5, 7, 9, 11]


class P:
    __slots__ = ('s', 'a', 'o')

    def __init__(self, s, a, o):
        self.s, self.a, self.o = s, a, o

    @property
    def midi(self):
        return 12 * (self.o + 1) + NAT[self.s] + self.a

    @property
    def pc(self):
        return (NAT[self.s] + self.a) % 12

    def lily(self):
        n = STEPS[self.s]
        if self.a < 0:
            acc = 'es' * (-self.a)
            if n in 'ae':
                acc = acc[1:]
        else:
            acc = 'is' * self.a
        o = self.o - 3
        return n + acc + ("'" * o if o > 0 else ',' * (-o))

    def up(self, k):
        return P(self.s, self.a, self.o + k)


def parse_pitch(name, marks=''):
    s = STEPS.index(name[0])
    rest = name[1:]
    a = 0
    if rest.startswith('s'):
        rest = 'e' + rest
    while rest:
        if rest.startswith('is'):
            a += 1
        elif rest.startswith('es'):
            a -= 1
        else:
            raise ValueError(name)
        rest = rest[2:]
    return P(s, a, 3 + marks.count("'") - marks.count(','))


def place_below(sa, limit):
    s, a = sa
    p = P(s, a, 4)
    while p.midi >= limit:
        p = P(s, a, p.o - 1)
    while P(s, a, p.o + 1).midi < limit:
        p = P(s, a, p.o + 1)
    return p


def place_near(sa, target, lo, hi):
    s, a = sa
    cands = [P(s, a, o) for o in range(0, 8)]
    ok = [c for c in cands if lo <= c.midi <= hi]
    return min(ok or cands, key=lambda c: abs(c.midi - target))


FLAT_MAP = [(0, 0), (1, -1), (1, 0), (2, -1), (2, 0), (3, 0), (4, -1), (4, 0), (5, -1), (5, 0), (6, -1), (6, 0)]
SHARP_MAP = [(0, 0), (0, 1), (1, 0), (1, 1), (2, 0), (3, 0), (3, 1), (4, 0), (4, 1), (5, 0), (5, 1), (6, 0)]


def from_midi(m, sharps=False):
    s, a = (SHARP_MAP if sharps else FLAT_MAP)[m % 12]
    return P(s, a, (m - NAT[s] - a) // 12 - 1)


# ---------------------------------------------------------------- chords
DEG = {'1': (0, 0), 'b9': (1, 1), '9': (1, 2), '#9': (1, 3), 'b3': (2, 3), '3': (2, 4),
       '4': (3, 5), '11': (3, 5), '#11': (3, 6), 'b5': (4, 6), '5': (4, 7), '#5': (4, 8),
       'b13': (5, 8), '6': (5, 9), '13': (5, 9), 'bb7': (6, 9), 'b7': (6, 10), '7': (6, 11)}


def spell(rs, ra, deg):
    off, sem = DEG[deg]
    s = (rs + off) % 7
    t = (NAT[rs] + ra + sem) % 12
    a = (t - NAT[s] + 6) % 12 - 6
    if abs(a) == 2:  # avoid double accidentals
        s = (s + (1 if a > 0 else -1)) % 7
        a = (t - NAT[s] + 6) % 12 - 6
    return (s, a)


#          chord tones                      horn voicing set (4)        guide tones
DOM = (['1', '3', '5', 'b7'], ['3', 'b7', '9', '13'], ('3', 'b7'))
MIN = (['1', 'b3', '5', 'b7'], ['b3', '5', 'b7', '9'], ('b3', 'b7'))
MAJ = (['1', '3', '5', '7'], ['3', '5', '7', '9'], ('3', '7'))
QUAL = {
    'maj7': MAJ, 'maj9': MAJ,
    '6.9': (['1', '3', '5', '6', '9'], ['3', '5', '6', '9'], ('3', '6')),
    'm7': MIN, 'm9': MIN,
    'm6': (['1', 'b3', '5', '6'], ['b3', '5', '6', '9'], ('b3', '6')),
    'm7.5-': (['1', 'b3', 'b5', 'b7'], ['1', 'b3', 'b5', 'b7'], ('b3', 'b7')),
    '7': DOM, '9': DOM, '13': DOM,
    '7.9-': (['1', '3', '5', 'b7', 'b9'], ['3', '5', 'b7', 'b9'], ('3', 'b7')),
    '7.5+.9-': (['1', '3', '#5', 'b7', 'b9'], ['3', '#5', 'b7', 'b9'], ('3', 'b7')),
    '7.5+': (['1', '3', '#5', 'b7', '9'], ['3', '#5', 'b7', '9'], ('3', 'b7')),
    '7.11+': (['1', '3', '5', 'b7', '9', '#11'], ['3', 'b7', '9', '#11'], ('3', 'b7')),
    '7sus4': (['1', '4', '5', 'b7', '9'], ['4', '5', 'b7', '9'], ('4', 'b7')),
    'dim7': (['1', 'b3', 'b5', 'bb7'], ['1', 'b3', 'b5', 'bb7'], ('b3', 'bb7')),
    'maj7.11+': (['1', '3', '5', '7', '9', '#11'], ['3', '7', '9', '#11'], ('3', '7')),
    'maj9.11+': (['1', '3', '5', '7', '9', '#11'], ['3', '7', '9', '#11'], ('3', '7')),
}


class Chord:
    def __init__(self, cs):
        m = re.match(r'([a-g](?:is|es|s)?)(?::([^/]+))?(?:/(.+))?$', cs)
        self.name = cs
        r = parse_pitch(m[1])
        self.root = (r.s, r.a)
        q = m[2] or 'maj7'
        tones, vset, guide = QUAL[q]
        self.tones = [spell(r.s, r.a, d) for d in tones]
        self.vset = [spell(r.s, r.a, d) for d in vset]
        self.guide = [spell(r.s, r.a, d) for d in guide]
        self.degs = dict(zip(tones, self.tones))
        b = parse_pitch(m[3]) if m[3] else None
        self.bass = (b.s, b.a) if b else self.root
        self.ext = {pc(x) for x in self.tones + self.vset}

    def deg(self, *names):
        for n in names:
            if n in self.degs:
                return self.degs[n]
        return self.tones[2]


def pc(sa):
    return (NAT[sa[0]] + sa[1]) % 12


CH = {}
_cache = {}


def chords(start, text):
    for i, barstr in enumerate(text.split('|')):
        cs = barstr.split()
        CH[start + i] = [(0, cs[0])] if len(cs) == 1 else [(0, cs[0]), (2, cs[1])]


def chord_at(bar, beat=0):
    c = None
    for b, cs in CH[bar]:
        if b <= beat:
            c = cs
    if c not in _cache:
        _cache[c] = Chord(c)
    return _cache[c]


def chordmode_text():
    out = []
    for bar in range(1, TOTAL_BARS + 1):
        segs = CH[bar]
        if len(segs) == 1:
            out.append(segs[0][1].replace(':', '1:', 1) if ':' in segs[0][1] else segs[0][1] + '1')
        else:
            out.append(' '.join(cs.replace(':', '2:', 1) if ':' in cs else cs + '2' for _, cs in segs))
    lines = []
    for i in range(0, len(out), 4):
        lines.append(' '.join(out[i:i + 4]) + f'  % {i + 1}')
    return '\n'.join(lines)


# ---------------------------------------------------------------- events
class Ev:
    def __init__(self, kind, **kw):
        self.kind = kind          # n, r, R, s, chord, raw
        self.pitch = kw.get('pitch')
        self.pitches = kw.get('pitches')
        self.dur = kw.get('dur', '4')
        self.length = kw.get('length', Fr(0))
        self.post = kw.get('post', '')
        self.tie = kw.get('tie', False)
        self.raw = kw.get('raw', '')
        self.prefix = kw.get('prefix', '')
        self.onset = kw.get('onset', Fr(0))

    def text(self):
        post = self.post.replace('FALL', '\\bendAfter #-4 ')
        tie = '~' if self.tie else ''
        if self.kind == 'n':
            return f'{self.prefix}{self.pitch.lily()}{self.dur}{post}{tie}'
        if self.kind == 'chord':
            inner = self.raw if self.pitches is None else ' '.join(p.lily() for p in self.pitches)
            return f'{self.prefix}<{inner}>{self.dur}{post}{tie}'
        if self.kind in 'rRs':
            return f'{self.kind}{self.dur}{post}'
        return self.raw


TOK = re.compile(r'(?:[^\s"]|"[^"]*")+')
NOTE = re.compile(r"^(R|r|s|[a-g](?:isis|eses|ases|is|es|as|s)?)([',]*)(\d+)?(\.*)(\*\d+)?(:\d+)?(.*)$")
PREFIX = {'\\x'}
RAW = {'\\timeOn', '\\timeOff', '\\improvisationOn', '\\improvisationOff'}


def dur_len(d, dots, mult):
    base = Fr(1, int(d))
    ln = base * (2 - Fr(1, 2 ** len(dots)))
    if mult:
        ln *= int(mult[1:])
    return ln


def parse(text):
    toks = TOK.findall(text)
    evs, pos, fac, last, pend = [], Fr(0), Fr(1), ('4', ''), ''
    i = 0

    def last_ev():
        for e in reversed(evs):
            if e.kind != 'raw':
                return e
        raise ValueError('post without note: ' + text[:60])

    while i < len(toks):
        t = toks[i]
        if t == '\\tuplet':
            num, den = map(int, toks[i + 1].split('/'))
            assert toks[i + 2] == '{'
            fac = Fr(den, num)
            evs.append(Ev('raw', raw=f'\\tuplet {num}/{den} {{'))
            i += 3
            continue
        if t == '}':
            fac = Fr(1)
            evs.append(Ev('raw', raw='}'))
        elif t == '|':
            pass
        elif t == '~':
            last_ev().tie = True
        elif t in RAW:
            evs.append(Ev('raw', raw=t))
        elif t in PREFIX:
            pend += t + ' '
        elif t.startswith('<') and not t.startswith('<>'):
            parts = [t]
            while '>' not in parts[-1]:
                i += 1
                parts.append(toks[i])
            m = re.match(r'^<(.*)>(\d+)?(\.*)(:\d+)?(.*)$', ' '.join(parts))
            if m[2]:
                last = (m[2], m[3])
            d, dots = last
            post = m[5]
            tie = '~' in post
            ln = dur_len(d, dots, None) * fac
            evs.append(Ev('chord', raw=m[1], dur=d + dots + (m[4] or ''), length=ln,
                          post=post.replace('~', ''), tie=tie, onset=pos, prefix=pend))
            pend = ''
            pos += ln
        elif t[0] in '\\-^_()"' or t.startswith('FALL'):
            e = last_ev()
            if '~' in t and t.strip('~)(') == '':
                e.tie = True
                t = t.replace('~', '')
            e.post += t if not t.startswith('\\') else t + ' '
        else:
            m = NOTE.match(t)
            if not m:
                raise ValueError('bad token ' + t)
            name, marks, d, dots, mult, trem, post = m.groups()
            if d:
                last = (d, dots)
            else:
                d, dots = last
            ln = dur_len(d, dots, mult) * fac
            tie = '~' in post
            post = post.replace('~', '')
            dstr = d + dots + (mult or '') + (trem or '')
            if name in ('r', 'R', 's'):
                evs.append(Ev(name, dur=dstr, length=ln, post=post, onset=pos))
            else:
                evs.append(Ev('n', pitch=parse_pitch(name, marks), dur=dstr, length=ln,
                              post=post, tie=tie, onset=pos, prefix=pend))
                pend = ''
            pos += ln
        i += 1
    return evs


def total(evs):
    return sum((e.length for e in evs), Fr(0))


def ser(evs):
    out, pos, intup = [], Fr(0), False
    for e in evs:
        if e.kind == 'raw':
            out.append(e.raw)
            if e.raw.startswith('\\tuplet'):
                intup = True
            if e.raw == '}':
                intup = False
                if pos.denominator == 1:
                    out.append('|\n')
            continue
        out.append(e.text())
        pos += e.length
        if not intup and pos.denominator == 1:
            out.append('|\n')
    return ' '.join(out).replace('\n ', '\n')


def notes_of(e):
    if e.kind == 'n':
        return (e.pitch.midi,)
    if e.kind == 'chord' and e.pitches:
        return tuple(p.midi for p in e.pitches)
    return None


def fix_ties(evs):
    sounding = [e for e in evs if e.kind in ('n', 'chord', 'r', 'R')]
    for a, b in zip(sounding, sounding[1:]):
        if a.tie and (notes_of(a) is None or notes_of(a) != notes_of(b)):
            a.tie = False
    if sounding and sounding[-1].tie and len(sounding) == 1:
        sounding[-1].tie = False


def chord_for(e, evs, start):
    bar = start + int(e.onset)
    c = chord_at(bar, (e.onset - int(e.onset)) * 4)
    if e.tie:
        idx = evs.index(e)
        nxt = next((x for x in evs[idx + 1:] if x.kind in ('n', 'r', 'R')), None)
        if nxt is not None and nxt.kind == 'n' and nxt.pitch.midi == e.pitch.midi:
            c2 = chord_at(start + int(nxt.onset), (nxt.onset - int(nxt.onset)) * 4)
            if c2.name != c.name:
                c = c2
    return c


def realize(evs, start, fn, n):
    """Replace every note event by n voices computed with fn(chord, event, state)."""
    voices = [[] for _ in range(n)]
    st = {}
    for e in evs:
        if e.kind != 'n':
            for v in voices:
                v.append(copy.copy(e))
            continue
        ch = chord_for(e, evs, start)
        res = fn(ch, e, st)
        for k in range(n):
            c = copy.copy(e)
            r = res[k]
            if isinstance(r, list):
                c.kind, c.pitches, c.pitch = 'chord', r, None
            else:
                c.pitch = r
            voices[k].append(c)
    for v in voices:
        fix_ties(v)
    return voices


# ---------------------------------------------------------------- voicing helpers
def circ(a, b):
    d = abs(a - b) % 12
    return min(d, 12 - d)


def close_below(lead, ch, n=4):
    vs = ch.vset
    pcs = [pc(x) for x in vs]
    if lead.pc in pcs:
        others = [x for x in vs if pc(x) != lead.pc]
    elif lead.pc in ch.ext:
        k = min(range(len(vs)), key=lambda i: circ(pcs[i], lead.pc))
        others = [x for i, x in enumerate(vs) if i != k]
    else:  # passing tone -> diminished chord on the lead
        others = [spell(lead.s, lead.a, d) for d in ('b3', 'b5', 'bb7')]
    res, cur, rem = [lead], lead.midi, list(others)
    while len(res) < n:
        if not rem:
            rem = list(others)
        best = max((place_below(x, cur) for x in rem), key=lambda p: p.midi)
        res.append(best)
        cur = best.midi
        rem = [x for x in rem if (x[0], x[1]) != (best.s, best.a)]
    return res


def section_close(evs, start, n=4):
    return realize(evs, start, lambda ch, e, st: close_below(e.pitch, ch, n), n)


def section_drop2(evs, start, floor):
    lines = section_close(evs, start, 4)
    lowest = min((e.pitch.midi for e in lines[1] if e.kind == 'n'), default=99) - 12
    if lowest < floor:
        return lines
    for e in lines[1]:
        if e.kind == 'n':
            e.pitch = e.pitch.up(-1)
    return [lines[0], lines[2], lines[3], lines[1]]


def shift(evs, k):
    out = []
    for e in evs:
        c = copy.copy(e)
        if c.kind == 'n':
            c.pitch = c.pitch.up(k)
        out.append(c)
    return out


def root_line(evs, start, lo, hi):
    def fn(ch, e, st):
        p = place_near(ch.bass, st.get('prev', (lo + hi) // 2), lo, hi)
        st['prev'] = p.midi
        return [p]
    return realize(evs, start, fn, 1)[0]


def shells_fn(lo3=45, hi3=58, blo=33, bhi=48):
    """tbn2 = upper guide tone, tbn3 = lower guide tone, btbn = root/bass."""
    def fn(ch, e, st):
        g1, g2 = ch.guide
        best = None
        for lo_sa, hi_sa in ((g1, g2), (g2, g1)):
            low = place_near(lo_sa, st.get('low', 52), lo3, hi3)
            high = place_below(hi_sa, low.midi + 12)
            if high.midi <= low.midi:
                high = high.up(1)
            cost = abs(low.midi - st.get('low', 52)) + abs(high.midi - st.get('high', 58))
            if best is None or cost < best[0]:
                best = (cost, high, low)
        _, high, low = best
        st['low'], st['high'] = low.midi, high.midi
        b = place_near(ch.bass, st.get('b', 40), blo, bhi)
        st['b'] = b.midi
        return [high, low, b]
    return fn


def piano_fn(top_lo=65, top_hi=77):
    def fn(ch, e, st):
        prev = st.get('top', 72)
        best = None
        for t in ch.vset:
            top = place_near(t, prev, top_lo, top_hi)
            v = close_below(top, ch, 4)
            if best is None or abs(top.midi - prev) < abs(best[0].midi - prev):
                best = v
        st['top'] = best[0].midi
        rh = sorted(best, key=lambda p: p.midi)
        g1, g2 = ch.guide
        low = place_near(g1, st.get('lh', 52), 47, 57)
        high = place_below(g2, low.midi + 12)
        if high.midi <= low.midi:
            high = high.up(1)
        st['lh'] = low.midi
        bassn = place_near(ch.bass, 40, 36, 47)
        lh = [bassn, low, high] if st.get('withroot') else [low, high]
        return [rh, lh]
    return fn


def piano(evs, start, withroot=False):
    f = piano_fn()

    def fn(ch, e, st):
        st['withroot'] = withroot
        return f(ch, e, st)
    return realize(evs, start, fn, 2)


def chord_rhythm(start, end, tmpl=None, posts=None, tie_repeats=False):
    """Text with one note 'c' per chord segment (whole or half bar)."""
    tmpl, posts = tmpl or {}, posts or {}
    out = []
    for bar in range(start, end + 1):
        if bar in tmpl:
            t = tmpl[bar]
        else:
            t = ' '.join('c' + ('1' if len(CH[bar]) == 1 else '2') for _ in CH[bar])
        if bar in posts:
            first, *rest = t.split(' ', 1)
            t = first + posts[bar] + (' ' + rest[0] if rest else '')
        out.append(t)
    return ' '.join(out)


def tie_repeats(evs):
    ns = [e for e in evs if e.kind in ('n', 'r', 'R')]
    for a, b in zip(ns, ns[1:]):
        if a.kind == b.kind == 'n' and a.pitch.midi == b.pitch.midi and not b.post.strip():
            a.tie = True


# ---------------------------------------------------------------- bass lines
def walking(start, end, sharps=False, lo=31, hi=50):
    out = []
    prev = 40
    for bar in range(start, end + 1):
        segs = CH[bar]
        for si, (beat, cs) in enumerate(segs):
            ch = chord_at(bar, beat)
            nbeats = 4 if len(segs) == 1 else 2
            if si + 1 < len(segs):
                nxt = chord_at(bar, segs[si + 1][0])
            else:
                nxt = chord_at(bar + 1) if bar + 1 in CH else ch
            r = place_near(ch.bass, prev, lo, hi)
            seq = [r]
            if nbeats == 4:
                if bar % 2 == 0:
                    plan = [ch.deg('3', 'b3', '4'), ch.deg('5', 'b5', '#5')]
                else:
                    plan = [ch.deg('5', 'b5', '#5'), ch.deg('3', 'b3', '4')]
                for sa in plan:
                    seq.append(place_near(sa, seq[-1].midi, lo, hi))
            cur = seq[-1].midi
            tgt = place_near(nxt.bass, cur, lo, hi).midi
            cand = [tgt - 1, tgt + 1]
            cand = [c for c in cand if lo <= c <= hi] or cand
            ap = min(cand, key=lambda c: abs(c - cur))
            seq.append(from_midi(ap, sharps))
            prev = seq[-1].midi
            out += [p.lily() + '4' for p in seq]
    return ' '.join(out)


def two_feel(start, end, sharps=False, lo=28, hi=50):
    out = []
    prev = 38
    for bar in range(start, end + 1):
        segs = CH[bar]
        for si, (beat, cs) in enumerate(segs):
            ch = chord_at(bar, beat)
            r = place_near(ch.bass, prev, lo, hi)
            prev = r.midi
            if len(segs) == 2:
                out.append(r.lily() + '2')
                continue
            nxt = chord_at(bar + 1) if bar + 1 in CH else ch
            five = place_near(ch.deg('5', 'b5', '#5'), r.midi + 5, lo, hi)
            if pc(nxt.bass) == pc(ch.bass):
                out += [r.lily() + '2', five.lily() + '2']
            else:
                tgt = place_near(nxt.bass, five.midi, lo, hi).midi
                ap = min([tgt - 1, tgt + 1], key=lambda c: abs(c - five.midi))
                out += [r.lily() + '2', five.lily() + '4', from_midi(ap, sharps).lily() + '4']
                prev = ap
    return ' '.join(out)


# ---------------------------------------------------------------- slashes
def slash_rhythm(evs, pitch):
    out = [Ev('raw', raw='\\improvisationOn')]
    for e in evs:
        c = copy.copy(e)
        if c.kind in ('n', 'chord'):
            c.kind, c.pitch, c.pitches = 'n', pitch, None
            c.post = c.post.replace('(', '').replace(')', '').replace('FALL', '')
        out.append(c)
    out.append(Ev('raw', raw='\\improvisationOff'))
    fix_ties(out)
    return out


def time_slashes(nbars, pitch, text='', dyn=''):
    p = pitch
    body = ' '.join(f'{p}4 {p}4 {p}4 {p}4' for _ in range(nbars))
    first, rest = body.split(' ', 1)
    first += dyn
    if text:
        first += f'^\\markup\\italic "{text}"'
    return f'\\timeOn {first} {rest} \\timeOff'


# ================================================================= THE MUSIC
# ---- harmony (concert pitch) ----
chords(1, 'ges:maj9 | f:m7 bes:m7 | es:m9 | as:7sus4 as:7.9-')
chords(5, 'des:maj7 | bes:m9 | es:m9 | as:13 | f:m7 bes:7.9- | es:m9 as:7 | des:maj7/f ges:maj7 | es:m7/as as:7.9-')
chords(13, 'des:maj7 | bes:m9 | es:m9 | as:13 | ges:maj7 | f:m7 bes:m7 | es:m7 as:7 | des:6.9')
chords(21, 'ges:maj7 | g:m7.5- c:7.9- | f:m7 | bes:m7 es:9 | es:m9 | e:dim7 | des:maj7/f bes:7.5+ | es:m9/as as:7.9-')
chords(29, 'des:maj7 | bes:m9 | es:m9 | as:13 | f:m7 bes:7.9- | es:m9 as:7 | f:m7 e:7.11+ | es:m9 as:7.9- | as:7.5+.9-')
chords(38, 'des:maj7 | bes:m7 | es:m7 | as:7 | f:m7 | bes:7.5+.9- | es:m7 | as:7 | '
           'ges:maj7 | g:m7.5- c:7.9- | f:m7 | bes:m7 es:7 | es:m7 | as:7 | des:maj7 | es:m7 as:7')
chords(54, 'des:maj7 bes:m7 | es:m7 as:7 | f:m7 e:7 | es:m7 as:7 | ges:maj7 g:dim7 | '
           'des:maj7/as bes:7.5+.9- | es:m7 as:7.9- | des:6.9')
chords(62, 'des:maj7 | bes:m7 | es:m7 | as:7 | f:m7 | bes:7.5+.9- | es:m7 | as:7')
chords(70, 'ges:maj7 f:m7 | e:m7 a:7.9-')
chords(72, 'd:maj7 | b:m9 | e:m9 | a:13 | fis:m7 b:7.9- | e:m9 a:7 | g:maj7 g:m6 | d:maj7/a bes:7.11+')
chords(80, 'e:m9/a | bes:maj7.11+ | g:maj7/a | d:maj9')

# ---- solo trombone (concert) ----
TBN_SOLO_1_53 = r'''
R1*3 | r2. as8\mf^"Solo" c'8 |
f'4.( es'8 c'2) | r8 des'8( es'8 f'8 \tuplet 3/2 { as'4 ges'4 f'4) } | f'2~ f'8 ges'16( f'16 es'8 des'8) |
c'2 r8 c'16( des'16 es'8 f'8) | as'4.( g'8 f'4 ces'4) | bes4.( ges8) \tuplet 3/2 { f4( ges4 c'4) } |
des'2 \tuplet 3/2 { c'8( des'8 es'8 } f'4) | es'2. r8 as8 |
f'4.( es'8 c'4) \tuplet 3/2 { des'8( es'8 f'8 } | as'2)~ as'8 ges'8( f'8 des'8) |
es'4~ es'16 des'16( bes8 ges'4. f'8) | f'2 es'4 \tuplet 3/2 { des'8( c'8 bes8) } |
as'4.( ges'8 f'4 des'4) | es'4.( c'8) des'4 \tuplet 3/2 { f'8( es'8 des'8) } |
bes2 \tuplet 3/2 { c'4( des'4 es'4) } | des'2. r4 |
r8 bes8(\mp des'8 f'8 as'4.) ges'8 | f'4( des'4) \tuplet 3/2 { e'4( des'4 bes4) } |
c'2. r8 c'16( des'16 | es'4 f'4) g'4.( f'8) | ges'2~ ges'8 f'16( es'16 des'8 bes8) |
e'4.( g'8 bes2) | as'4.( f'8 ges'4 d'4) | es'2 r8 as8\<( c'8 es'8) |
f'4.\mf( es'16 f'16 c'2) | r8 des'16( es'16 f'8 as'8 \tuplet 3/2 { bes'4 as'4 f'4) } |
ges'2 f'8( es'16 des'16 bes8 c'8) | des'2~ \tuplet 3/2 { des'8 es'8( f'8 } ges'8. f'16) |
as'4.( g'8) \tuplet 3/2 { f'8( ges'8 f'8 } d'4) | bes4.( ges'8) \tuplet 3/2 { f'4( es'4 c'4) } |
as'2 \tuplet 3/2 { gis'8( fis'8 e'8 } d'4) | des'2.\> r4\! | R1 |
r4^"Solo (ad lib.) – образец" r8 as8\mf \tuplet 3/2 { f'8 es'8 des'8 } c'8 as8 |
bes8 des'8 f'8 as'8~ as'4 r8 ges'8 | f'8 es'8 r8 des'8-^ r8 bes8 \tuplet 3/2 { des'8 c'8 ces'8 } |
bes8 c'8 es'8 ges'8~ ges'4 f'8 fes'8 | es'4-^ r8 c'8~ c'4 as8 g8 |
as8 ces'8 d'8 ges'8~ ges'4 \tuplet 3/2 { e'8 d'8 ces'8 } | bes4 r4 r8 ges'8 \tuplet 3/2 { f'8 es'8 des'8 } |
c'8 es'8 ges'8 bes'8~ bes'4. as'8 | f'4~ f'8 des'8 \tuplet 3/2 { bes8 c'8 des'8 } es'8 f'8 |
f'8 des'8 bes8 g8 e'8 des'8 bes8 g8 | as4-^ r8 c'8 es'8 g'8 \tuplet 3/2 { f'8 es'8 c'8 } |
des'4 f'8 des'8 g'8 es'8 des'8 bes8 | ges4. f8 ges8 bes8 des'8 f'8 |
\tuplet 3/2 { as'8 ges'8 f'8 } es'8 c'8~ c'4 r4 | r8 f'8-> r8 es'8-> r8 c'8-> \tuplet 3/2 { des'8 es'8 f'8 } |
ges'4 f'8 es'8 c'8 as8 r4 |
'''
TBN_TRADE_62_69 = r'''
r8^"Solo – 2 такта" f'8-^ r8 as'8-^~ as'8 f'8 \tuplet 3/2 { es'8 des'8 c'8 } |
des'4-^ r8 bes8-. \tuplet 3/2 { des'8 f'8 as'8 } bes'4-^ | R1*6 |
'''
TBN_SOLO_72_83 = r'''
fis'4.\f^"Solo" ( e'16 fis'16 cis'2) | r8 d'16( e'16 fis'8 a'8 \tuplet 3/2 { b'4 a'4 fis'4) } |
g'2 fis'8( e'16 d'16 b8 cis'8) | d'2~ \tuplet 3/2 { d'8 e'8( fis'8 } g'8. fis'16) |
a'4.( gis'8) \tuplet 3/2 { fis'8( g'8 fis'8 } dis'4) | b4.( g'8) \tuplet 3/2 { fis'4( e'4 cis'4) } |
b'2\ff \tuplet 3/2 { a'4( g'4 e'4) } | fis'2~\> fis'4 e'4\! |
e'8.\mf^"Cadenza ad lib." ( fis'16 \tuplet 3/2 { g'8 a'8 b'8 } \tuplet 5/4 { a'16 g'16 fis'16 e'16 d'16) } d'4\fermata |
d'2\p\< \tuplet 3/2 { d'4( e'4 f'4) } | e'2.\f fis'8( g'8) | a'1\pp\fermata |
'''

# ---- lead lines for ensemble writing (concert) ----
SAX_3_4 = r"des'1\pp\< | des'2\mp c'2\fermata"
SAX_5_12 = r"c'1\pp | des'1 | bes2 des'2 | c'1 | c'2 ces'2 | bes2 c'2 | c'2 bes2 | des'2 c'2"
SAX_13_20 = r"c'1\p | des'2 c'2 | bes1 | c'2 f'2 | des'1 | c'2 des'2 | des'2 c'2 | bes1"
SAX_29_37 = r"c'1\mp | des'1 | bes2 des'2 | c'1\< | c'2\mf ces'2 | bes2 c'2 | c'2 d'2 | des'2\> c'2\! | ges'2.\fp\< r4\!"
TP_21_28 = r"""f''1\pp^"Cup mute" | f''2 e''2 | es''1 | des''2 des''2 | des''1 | des''1 | c''2 d''2 | des''2 c''2"""
TP_29_37 = r"""f''1\mp^"Open" | f''2 des''2 | ges''1\< | f''1\mf | es''2 d''2 | des''2 c''2 | c''2 d''2 | des''2\> c''2\! | ges''2.\fp\< r4\!"""
SAX_46_53 = r"""
r4\p r8 bes'8~ bes'4 as'4 | f'4. e'8~ e'2 | r4 r8 as'8~ as'4 g'4 | f'2 g'2 |
r4 r8 bes'8~ bes'4 ges'4 | f'2. r4 | r8 f'8-^\mf r4 r8 es'8-^ r4 | r8 ges'8-^ r4 r8 ges'8-^ r8 c''8-^
"""
SHOUT_54_61 = r"""
r8\f as'8-^~ as'4 r8 f''8->~ f''8 des''8-. | es''8 f''8 ges''4-^ r8 f''8 \tuplet 3/2 { es''8 c''8 as'8 } |
c''4-^ r8 as'8-. gis'8-> b'8 d''8 e''8-^ | es''4.-> ges''8~ ges''4 \tuplet 3/2 { f''8 es''8 c''8 } |
bes'8-.\< des''8-. f''8-. as''8-> g''4-^ \tuplet 3/2 { bes''8 g''8 e''8 } | f''4-^\ff r8 es''8-. r8 d''8->~ d''4 |
r8 ges''8->~ ges''4 \tuplet 3/2 { f''8 ges''8 f''8 } es''8 c''8 | des''4-^ r4 \tuplet 3/2 { r8 as'8 c''8 } es''8-^ f''8-^FALL
"""
STOP_70_71 = r"""
\tuplet 3/2 { des''8->\ff des''8-> des''8-> } f''8-^ r8 r8 es''16-> es''16-> c''8-^ r8 |
r16 d''16-> e''8-^ r8 g''8-^~ g''4 cis''4-^\fermata
"""
TP_72_79 = r"fis''1\mf | fis''2 a''2 | g''1\< | fis''2 g''2 | a''2\f a''2 | g''2 g''2 | b''2\ff a''2 | a''2\> as''2\!"
TP_81_83 = r"a''1\p\< | fis''1\f\> | e''1\pp\fermata"
SAX_80 = r"d'1\pp\fermata"

# ---------------------------------------------------------------- build parts
PARTS = ['a1', 'a2', 't1', 't2', 'bari', 'tp1', 'tp2', 'tp3', 'tp4', 'tp5',
         'tb1', 'tb2', 'tb3', 'btb', 'gtr', 'pno_rh', 'pno_lh', 'bass', 'dr']
P_EV = {k: [] for k in PARTS}


def put(name, evs):
    P_EV[name].extend(evs)


def rest(names, n, post=''):
    for nm in names:
        put(nm, parse(f'R1*{n}{post}' if n > 1 else f'R1{post}'))


SAXES = ['a1', 'a2', 't1', 't2']
TPS = ['tp1', 'tp2', 'tp3', 'tp4', 'tp5']
TBS = ['tb2', 'tb3', 'btb']


def sax_pads(text, start):
    lead = parse(text)
    four = section_drop2(lead, start, 44)
    for nm, v in zip(SAXES, four):
        put(nm, v)
    put('bari', root_line(lead, start, 37, 52))


def brass_close(text, start):
    """tp1-4 close voicing, tp5 = lead 8vb. Returns the 4 trumpet lines."""
    lead = parse(text)
    four = section_close(lead, start, 4)
    for nm, v in zip(TPS, four):
        put(nm, v)
    put('tp5', shift(lead, -1))
    return lead, four


def tutti(text, start):
    """Shout / tutti texture: trumpets close, saxes & trombones 8vb, bass tbn + bari on roots."""
    lead, four = brass_close(text, start)
    for nm, v in zip(SAXES, four):
        put(nm, shift(v, -1))
    put('bari', root_line(lead, start, 37, 52))
    for nm, v in zip(['tb1', 'tb2', 'tb3'], four[1:]):
        put(nm, shift(v, -1))
    put('btb', root_line(lead, start, 34, 50))
    return lead


def shells(start, end, tmpl=None, posts=None, names=TBS):
    ev = parse(chord_rhythm(start, end, tmpl, posts))
    lines = realize(ev, start, shells_fn(), 3)
    for ln in lines:
        tie_repeats(ln)
    for nm, v in zip(names, lines):
        put(nm, v)


def piano_put(evs, start, withroot=False):
    rh, lh = piano(evs, start, withroot)
    for e in lh:
        e.post = re.sub(r'\^(\\markup\\italic\s*)?"[^"]*"', '', e.post)
    put('pno_rh', rh)
    put('pno_lh', lh)


def piano_comp(start, end):
    pats4 = ["c4-. r8 c8->~ c2", "r4 c4-. r8 c8-> r4", "r8 c8-> r4 r4 c4-.", "c4. c8~ c2"]
    pats2 = ["c4-. r4", "r8 c8-> r4", "r4 c4-.", "c4. c8"]
    out = []
    for i, bar in enumerate(range(start, end + 1)):
        if len(CH[bar]) == 1:
            out.append(pats4[i % 4])
        else:
            out.append(pats2[i % 4] + ' ' + pats2[(i + 1) % 4])
    piano_put(parse(' '.join(out)), start)


GTR_SL = 'b'      # concert; written an octave higher -> middle line
DR_SL = "b'"
BASS_SL = 'd,'

# ---- Intro 1-4
rest(['tp1', 'tp2', 'tp3', 'tp4', 'tp5', 'tb2', 'tb3', 'btb'], 3)
for nm in ['tp1', 'tp2', 'tp3', 'tp4', 'tp5', 'tb2', 'tb3', 'btb']:
    put(nm, parse(r'r2 r2\fermata'))
rest(SAXES + ['bari'], 2)
sax_pads(SAX_3_4, 3)
put('pno_rh', parse(r"""r8\p^"Rubato" bes'8( des''8 f''8 as''2) | g''4.( f''8) \tuplet 3/2 { es''8( des''8 c''8 } des''4) |
ges''2~ ges''8 f''16( es''16 des''8 bes'8) | <ges' bes' des''>2 <ges' a' c''>2\fermata"""))
put('pno_lh', parse(r"<ges, des f>1\sustainOn | <f, es as>2 <bes, as des'>2 | <es, des ges>1 | <as, ges>2 <as, ges>2\fermata\sustainOff"))
put('gtr', parse(r'R1*2 ' + time_slashes(1, GTR_SL, 'volume swells, pp') + r' \improvisationOn b4 b4 b2\fermata \improvisationOff'))
put('bass', parse(r"R1*2 es,1\pp as,,2 as,,2\fermata"))
put('dr', parse(r"R1*3 r2 \x a''2:32\pp\<\fermata"))

# ---- A, B, C, D (ballad) 5-37
rest(['tb2', 'tb3', 'btb'], 8)
rest(TPS, 16)
sax_pads(SAX_5_12, 5)
sax_pads(SAX_13_20, 13)
rest(SAXES + ['bari'], 8)
brass_close(TP_21_28, 21)
brass_close(TP_29_37, 29)
sax_pads(SAX_29_37, 29)
shells(13, 37, tmpl={37: r'c2.\fp\< r4\!'},
       posts={13: r'\p^"Open"', 21: r'\pp', 29: r'\mp', 32: r'\mf', 36: r'\>'})
piano_put(parse(chord_rhythm(5, 37, tmpl={37: r'c2.\fp\< r4\!'},
                             posts={5: r'\mp^"Comp ad lib., заполнять паузы солиста"', 29: r'\mf'})), 5)
put('gtr', parse(time_slashes(32, GTR_SL, 'Clean – арпеджио ad lib.') + r' \improvisationOn b2.->\fp r4 \improvisationOff'))
put('bass', parse(two_feel(5, 36) + r' as,,2.->\fp r4'))
put('dr', parse(time_slashes(8, DR_SL, 'Brushes – ballad', r'\p') + ' ' + time_slashes(8, DR_SL) + ' '
                + time_slashes(8, DR_SL, 'Brushes, чуть активнее') + ' '
                + time_slashes(8, DR_SL, 'Sticks: rim click на 2 и 4')
                + r" \x a''4->\fp r4 c''16\< c''16 c''16 c''16 e''16 e''16 d''16 d''16\!"))

# ---- E: double-time swing solo 38-53
put('tb1', parse(TBN_SOLO_1_53))
rest(SAXES + ['bari'], 8)
sax_pads(SAX_46_53, 46)
rest(TPS + TBS, 16)
piano_comp(38, 53)
put('gtr', parse(time_slashes(16, GTR_SL, 'Comp – 4 на такт')))
put('bass', parse(walking(38, 53)))
put('dr', parse(r"""\x f''4^"Swing – ride, HH на 2 и 4" <\x f'' \x d'>8. \x f''16 \x f''4 <\x f'' \x d'>8. \x f''16 """
                + time_slashes(13, DR_SL, 'Time') + ' ' + time_slashes(2, DR_SL, 'ловить акценты саксофонов')))

# ---- F: shout 54-61
lead = tutti(SHOUT_54_61, 54)
piano_put(lead, 54)
put('gtr', slash_rhythm(lead, parse_pitch('b')))
put('bass', parse(walking(54, 61)))
put('dr', slash_rhythm(lead, parse_pitch('b', "'")))

# ---- G: trades 62-69
put('tb1', parse(TBN_TRADE_62_69))
rest(SAXES + ['bari'] + TPS + TBS, 8)
piano_comp(62, 63)
rest(['pno_rh', 'pno_lh'], 2)
piano_comp(66, 67)
rest(['pno_rh', 'pno_lh'], 2)
put('gtr', parse(time_slashes(2, GTR_SL, 'Comp') + r''' R1*2
r8^"Solo гитары – 2 такта" c'8 es'8 g'8 \tuplet 3/2 { bes'8 as'8 f'8 } es'8 c'8 |
as8 ces'8 d'8 e'8 ges'4-^ r4 | R1*2'''))
put('bass', parse(walking(62, 63) + ' R1*2 ' + walking(66, 67) + ' R1*2'))
put('dr', parse(time_slashes(2, DR_SL, 'Time') + ' ' + time_slashes(2, DR_SL, 'SOLO')
                + ' ' + time_slashes(2, DR_SL, 'Time') + ' ' + time_slashes(2, DR_SL, 'SOLO')))

# ---- H: stop-time 70-71
lead = tutti(STOP_70_71, 70)
piano_put(lead, 70, withroot=True)
put('gtr', slash_rhythm(lead, parse_pitch('b')))
put('bass', root_line(lead, 70, 28, 45))
put('dr', slash_rhythm(lead, parse_pitch('b', "'")))

# ---- J: final ballad in D 72-79, Coda 80-83
put('tb1', parse(TBN_SOLO_72_83))
lead, four = brass_close(TP_72_79, 72)
for nm, v in zip(SAXES, four):
    put(nm, shift(v, -1))
put('bari', root_line(lead, 72, 37, 52))
shells(72, 79, posts={72: r'\mf', 76: r'\f', 79: r'\>'})
for nm in TPS + TBS:
    put(nm, parse(r'R1\fermata'))
sax_pads(SAX_80, 80)
lead, four = brass_close(TP_81_83, 81)
for nm, v in zip(SAXES, four):
    put(nm, shift(v, -1))
put('bari', root_line(lead, 81, 37, 52))
shells(81, 83, posts={81: r'\p\<', 82: r'\f\>', 83: r'\pp\fermata'})
piano_put(parse(chord_rhythm(72, 83, posts={72: r'\f', 80: r'\pp\fermata', 81: r'\p\<', 82: r'\f\>', 83: r'\pp\fermata'})), 72)
put('gtr', parse(time_slashes(8, GTR_SL, 'Big ballad') + r''' R1\fermata
\improvisationOn b1\p^"let ring" b1 b1\fermata \improvisationOff'''))
put('bass', parse(two_feel(72, 79, sharps=True) + r" a,,1\pp\fermata bes,,1\p\< a,,1\f\> d,1\pp\fermata"))
put('dr', parse(time_slashes(8, DR_SL, 'Big ballad – sticks, ride') + r"""
\x a''1:32\pp\fermata | \x a''1:32\p\< | \x a''2\f r4 \tuplet 3/2 { e''8 d''8 a'8 } | \x a''1:32\pp\fermata"""))


# ---------------------------------------------------------------- checks
RANGES = {  # concert MIDI ranges
    'a1': (49, 80), 'a2': (49, 80), 't1': (44, 75), 't2': (44, 75), 'bari': (36, 68),
    'tp1': (54, 83), 'tp2': (54, 81), 'tp3': (54, 79), 'tp4': (54, 77), 'tp5': (54, 77),
    'tb1': (40, 71), 'tb2': (40, 67), 'tb3': (40, 65), 'btb': (33, 62),
    'gtr': (40, 84), 'bass': (28, 55), 'pno_rh': (40, 96), 'pno_lh': (21, 72), 'dr': (0, 127),
}


def check():
    ok = True
    for nm, evs in P_EV.items():
        t = total(evs)
        if t != TOTAL_BARS:
            print(f'!! {nm}: length {t} bars (expected {TOTAL_BARS})')
            ok = False
        lo, hi = RANGES[nm]
        ms = [m for e in evs if e.kind in ('n', 'chord') and notes_of(e) for m in notes_of(e)]
        if nm not in ('dr', 'gtr') and ms and (min(ms) < lo or max(ms) > hi):
            print(f'!! {nm}: range {min(ms)}-{max(ms)} outside {lo}-{hi}')
            ok = False
    return ok


# ---------------------------------------------------------------- LilyPond output
INSTR = [
    # var, name, short, transposition, clef, midi
    ('a1', 'Альт-саксофон 1', 'А-сакс. 1', 'es', 'treble', 'alto sax'),
    ('a2', 'Альт-саксофон 2', 'А-сакс. 2', 'es', 'treble', 'alto sax'),
    ('t1', 'Тенор-саксофон 1', 'Т-сакс. 1', 'bes,', 'treble', 'tenor sax'),
    ('t2', 'Тенор-саксофон 2', 'Т-сакс. 2', 'bes,', 'treble', 'tenor sax'),
    ('bari', 'Баритон-саксофон', 'Бар.-сакс.', 'es,', 'treble', 'baritone sax'),
    ('tp1', 'Труба 1', 'Тр. 1', 'bes', 'treble', 'trumpet'),
    ('tp2', 'Труба 2', 'Тр. 2', 'bes', 'treble', 'trumpet'),
    ('tp3', 'Труба 3', 'Тр. 3', 'bes', 'treble', 'trumpet'),
    ('tp4', 'Труба 4', 'Тр. 4', 'bes', 'treble', 'trumpet'),
    ('tp5', 'Труба 5', 'Тр. 5', 'bes', 'treble', 'trumpet'),
    ('tb1', 'Тромбон 1 (соло)', 'Трб. 1', None, 'bass', 'trombone'),
    ('tb2', 'Тромбон 2', 'Трб. 2', None, 'bass', 'trombone'),
    ('tb3', 'Тромбон 3', 'Трб. 3', None, 'bass', 'trombone'),
    ('btb', 'Бас-тромбон', 'Б.-трб.', None, 'bass', 'trombone'),
    ('gtr', 'Гитара (соло)', 'Гит.', 'c', 'treble', 'electric guitar (jazz)'),
    ('bass', 'Бас-гитара', 'Бас', 'c', 'bass', 'electric bass (finger)'),
]
VARNAME = {'a1': 'altoI', 'a2': 'altoII', 't1': 'tenorI', 't2': 'tenorII', 'bari': 'bari',
           'tp1': 'tpI', 'tp2': 'tpII', 'tp3': 'tpIII', 'tp4': 'tpIV', 'tp5': 'tpV',
           'tb1': 'tbI', 'tb2': 'tbII', 'tb3': 'tbIII', 'btb': 'bassTb', 'gtr': 'guitar',
           'pno_rh': 'pianoRH', 'pno_lh': 'pianoLH', 'bass': 'bassGtr', 'dr': 'drumPart'}

HEADER = r'''\version "2.24.0"
\header {
  title = "Письма, которые мы не отправили"
  subtitle = "Баллада и свинг для солирующего тромбона и биг-бэнда"
  composer = "Оригинальная композиция"
  tagline = ##f
}
'''

DEFS = r'''
timeOn = {
  \improvisationOn
  \override Stem.transparent = ##t
  \override Beam.transparent = ##t
  \override Flag.transparent = ##t
}
timeOff = {
  \improvisationOff
  \revert Stem.transparent
  \revert Beam.transparent
  \revert Flag.transparent
}
x = \tweak NoteHead.style #'cross \etc

chExceptions = {
  <c e g b d' fis'>1-\markup { "maj7" \super "♯11" }
  <c e g b fis'>1-\markup { "maj7" \super "♯11" }
}
chordExc = #(append (sequential-music-to-chord-exceptions chExceptions #t) ignatzekExceptions)

global = {
  \time 4/4 \key des \major
  \tempo "Ballad, rubato" 4 = 66
  s1*4 \bar "||"
  \mark \default \tempo "Slow Ballad" 4 = 72
  s1*8 \mark \default
  s1*8 \mark \default
  s1*8 \mark \default
  s1*8
  s1 \bar "||"
  \mark \default \tempo "Double-time Swing (♩ = ♩)" 4 = 144
  s1*16 \bar "||"
  \mark \default \sectionLabel "Shout chorus"
  s1*8 \bar "||"
  \mark \default \sectionLabel "Trades (2 такта)"
  s1*8 \bar "||"
  \mark \default \sectionLabel "Stop-time"
  s1 s2 s2^\markup\italic "rit." \bar "||"
  \key d \major
  \mark \default \tempo "Tempo I – Ballad" 4 = 72
  s1*8 \bar "||"
  \mark \markup \box "Coda" \tempo "Cadenza" 4 = 60
  s1 \tempo "a tempo" 4 = 66
  s1 s1^\markup\italic "molto rit." s1 \bar "|."
}
'''


def music_vars():
    out = []
    for nm in PARTS:
        out.append(f'{VARNAME[nm]} = {{\n{ser(P_EV[nm])}\n}}\n')
    out.append('chordsAll = \\chordmode {\n' + chordmode_text() + '\n}\n')
    return '\n'.join(out)


def staff(nm, name, short, tr, clef, midi, part=False, midi_only=False):
    v = VARNAME[nm]
    with_ = (f'instrumentName = "{name}" shortInstrumentName = "{short}" midiInstrument = "{midi}"')
    if tr is None:
        body = f'\\clef {clef} << \\global \\{v} >>'
    else:
        body = f'\\transposition {tr} \\clef {clef} \\transpose {tr} c\' << \\global \\{v} >>'
    return f'\\new Staff \\with {{ {with_} }} {{ {body} }}'


def chordnames(tr=None):
    m = '\\chordsAll' if tr is None else f"\\transpose {tr} c' \\chordsAll"
    return ('\\new ChordNames \\with { chordNameExceptions = #chordExc majorSevenSymbol = \\markup "maj7" } '
            + m)


def piano_staff(part=False):
    return (r'\new PianoStaff \with { instrumentName = "Фортепиано" shortInstrumentName = "Ф-но" } << '
            r'\new Staff \with { midiInstrument = "acoustic grand" } { \clef treble << \global \pianoRH >> } '
            r'\new Staff \with { midiInstrument = "acoustic grand" } { \clef bass << \global \pianoLH >> } >>')


def drum_staff():
    return (r'\new Staff \with { instrumentName = "Ударные" shortInstrumentName = "Удар." '
            r'\remove Key_engraver } { \clef percussion << \global \drumPart >> }')


def write_files():
    I = {i[0]: i for i in INSTR}
    groups = [
        ('StaffGroup', ['a1', 'a2', 't1', 't2', 'bari']),
        ('StaffGroup', ['tp1', 'tp2', 'tp3', 'tp4', 'tp5']),
        ('StaffGroup', ['tb1', 'tb2', 'tb3', 'btb']),
    ]
    staves = []
    for g, names in groups:
        staves.append(f'\\new {g} << ' + '\n'.join(staff(*I[n]) for n in names) + ' >>')
    staves.append(r'\new StaffGroup << ' + chordnames() + '\n' + staff(*I['gtr']) + '\n' + piano_staff()
                  + '\n' + staff(*I['bass']) + '\n' + drum_staff() + ' >>')
    score = (HEADER + r'''
#(set-global-staff-size 13)
\paper { #(set-paper-size "a3") indent = 30\mm short-indent = 15\mm
  system-system-spacing.basic-distance = #14 }
''' + DEFS + music_vars() + r'''
\score {
  <<
''' + '\n'.join(staves) + r'''
  \new Devnull { \repeat unfold 20 { s1*4 \break } s1*3 }
  >>
  \layout {
    \context { \Score \override BarNumber.break-visibility = ##(#t #t #t) barNumberVisibility = #all-bar-numbers-visible
               \override RehearsalMark.self-alignment-X = #LEFT }
  }
}
''')
    (OUT / 'score.ly').write_text(score)

    midi = (HEADER + DEFS + music_vars() + r'''
\score {
  \unfoldRepeats <<
''' + '\n'.join(staff(*I[n]) for n in PARTS if n in I and n != 'gtr') + '\n' + piano_staff() + r'''
  >>
  \midi { \context { \Score midiChannelMapping = #'instrument } }
}
''')
    (OUT / 'midi.ly').write_text(midi)

    books = []
    chord_parts = {'tb1', 'gtr', 'bass'}
    for nm, name, short, tr, clef, mi in INSTR:
        cn = chordnames(tr if tr not in ('c', None) else None) if nm in chord_parts else ''
        books.append(rf'''\book {{
  \bookOutputSuffix "{nm}"
  \header {{ instrument = "{name}" }}
  \score {{ \compressMMRests << {cn}
    {staff(nm, name, short, tr, clef, mi)} >>
    \layout {{ \context {{ \Staff \remove Instrument_name_engraver }} }} }}
}}''')
    books.append(r'''\book {
  \bookOutputSuffix "piano"
  \header { instrument = "Фортепиано" }
  \score { \compressMMRests << ''' + chordnames() + piano_staff() + r''' >>
    \layout { \context { \PianoStaff \remove Instrument_name_engraver } } }
}''')
    books.append(r'''\book {
  \bookOutputSuffix "drums"
  \header { instrument = "Ударные" }
  \score { \compressMMRests << ''' + drum_staff() + r''' >>
    \layout { \context { \Staff \remove Instrument_name_engraver } } }
}''')
    parts = (HEADER + r'''
#(set-global-staff-size 19)
\paper { #(set-paper-size "a4") indent = 0 }
''' + DEFS + music_vars() + '\n'.join(books))
    (OUT / 'parts.ly').write_text(parts)


if __name__ == '__main__':
    ok = check()
    write_files()
    print('OK' if ok else 'CHECK FAILED')
