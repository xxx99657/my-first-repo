\version "2.24.0"
\header {
  title = "Письма, которые мы не отправили"
  subtitle = "Баллада и свинг для солирующего тромбона и биг-бэнда"
  composer = "Оригинальная композиция"
  tagline = ##f
}

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
altoI = {
R1*2 |
des'1\pp\< |
des'2\mp c'2\fermata |
c'1\pp |
des'1 |
bes2 des'2 |
c'1 |
c'2 ces'2 |
bes2 c'2 |
c'2 bes2 |
des'2 c'2 |
c'1\p |
des'2 c'2 |
bes1 |
c'2 f'2 |
des'1 |
c'2 des'2 |
des'2 c'2 |
bes1 |
R1*8 |
c'1\mp |
des'1 |
bes2 des'2 |
c'1\< |
c'2\mf ces'2 |
bes2 c'2 |
c'2 d'2 |
des'2\> c'2\! |
ges'2.\fp\< r4\! |
R1*8 |
r4\p r8 bes'8~ bes'4 as'4 |
f'4. e'8~ e'2 |
r4 r8 as'8~ as'4 g'4 |
f'2 g'2 |
r4 r8 bes'8~ bes'4 ges'4 |
f'2. r4 |
r8 f'8-^\mf r4 r8 es'8-^ r4 |
r8 ges'8-^ r4 r8 ges'8-^ r8 c''8-^ |
r8\f as8-^~ as4 r8 f'8->~ f'8 des'8-. |
es'8 f'8 ges'4-^ r8 f'8 \tuplet 3/2 { es'8 c'8 as8 } |
c'4-^ r8 as8-. gis8-> b8 d'8 e'8-^ |
es'4.-> ges'8~ ges'4 \tuplet 3/2 { f'8 es'8 c'8 } |
bes8-.\< des'8-. f'8-. as'8-> g'4-^ \tuplet 3/2 { bes'8 g'8 e'8 } |
f'4-^\ff r8 es'8-. r8 d'8->~ d'4 |
r8 ges'8->~ ges'4 \tuplet 3/2 { f'8 ges'8 f'8 } es'8 c'8 |
des'4-^ r4 \tuplet 3/2 { r8 as8 c'8 } es'8-^ f'8-^\bendAfter #-4  |
R1*8 |
\tuplet 3/2 { des'8->\ff des'8-> des'8-> } f'8-^ r8 r8 es'16-> es'16-> c'8-^ r8 |
r16 d'16-> e'8-^ r8 g'8-^~ g'4 cis'4-^\fermata |
fis'1\mf |
fis'2 a'2 |
g'1\< |
fis'2 g'2 |
a'2\f a'2 |
g'2 g'2 |
b'2\ff a'2 |
a'2\> as'2\! |
d'1\pp\fermata |
a'1\p\< |
fis'1\f\> |
e'1\pp\fermata |

}

altoII = {
R1*2 |
ges1\pp\< |
ges2\mp ges2\fermata |
as1\pp |
c'1 |
ges2 bes2 |
bes1 |
as2 as2 |
ges2 bes2 |
as2 as2 |
bes2 a2 |
as1\p |
c'2 as2 |
ges1 |
bes2 c'2 |
bes1 |
as2 c'2 |
bes2 bes2 |
as1 |
R1*8 |
as1\mp |
c'1 |
ges2 bes2 |
bes1\< |
as2\mf as2 |
ges2 bes2 |
as2 ais2 |
bes2\> a2\! |
e'2.\fp\< r4\! |
R1*8 |
r4\p r8 f'8~ f'4 des'4 |
bes4. bes8~ bes2 |
r4 r8 es'8~ es'4 c'4 |
c'2 des'2 |
r4 r8 f'8~ f'4 des'4 |
bes2. r4 |
r8 c'8-^\mf r4 r8 as8-^ r4 |
r8 des'8-^ r4 r8 c'8-^ r8 ges'8-^ |
r8\f f8-^~ f4 r8 des'8->~ des'8 c'8-. |
bes8 des'8 f'4-^ r8 c'8 \tuplet 3/2 { c'8 bes8 f8 } |
as4-^ r8 g8-. fis8-> gis8 cis'8 cis'8-^ |
bes4.-> f'8~ f'4 \tuplet 3/2 { c'8 c'8 bes8 } |
as8-.\< bes8-. des'8-. f'8-> fes'4-^ \tuplet 3/2 { g'8 fes'8 des'8 } |
es'4-^\ff r8 c'8-. r8 ces'8->~ ces'4 |
r8 f'8->~ f'4 \tuplet 3/2 { d'8 es'8 d'8 } c'8 a8 |
bes4-^ r4 \tuplet 3/2 { r8 f8 a8 } bes8-^ es'8-^\bendAfter #-4  |
R1*8 |
\tuplet 3/2 { bes8->\ff bes8-> bes8-> } des'8-^ r8 r8 c'16-> c'16-> as8-^ r8 |
r16 b16-> b8-^ r8 e'8-^~ e'4 bes4-^\fermata |
e'1\mf |
d'2 fis'2 |
fis'1\< |
cis'2 fis'2 |
gis'2\f fis'2 |
fis'2 fis'2 |
a'2\ff e'2 |
fis'2\> e'2\! |
g1\pp\fermata |
e'1\p\< |
d'1\f\> |
cis'1\pp\fermata |

}

tenorI = {
R1*2 |
f1\pp\< |
es2\mp es2\fermata |
f1\pp |
as1 |
f2 ges2 |
ges1 |
g2 f2 |
f2 ges2 |
f2 f2 |
ges2 ges2 |
f1\p |
as2 f2 |
f1 |
ges2 bes2 |
as1 |
g2 as2 |
ges2 ges2 |
f1 |
R1*8 |
f1\mp |
as1 |
f2 ges2 |
ges1\< |
g2\mf f2 |
f2 ges2 |
g2 gis2 |
ges2\> ges2\! |
c'2.\fp\< r4\! |
R1*8 |
r4\p r8 des'8~ des'4 bes4 |
g4. g8~ g2 |
r4 r8 c'8~ c'4 as4 |
as2 c'2 |
r4 r8 des'8~ des'4 bes4 |
ges2. r4 |
r8 as8-^\mf r4 r8 f8-^ r4 |
r8 bes8-^ r4 r8 bes8-^ r8 f'8-^ |
r8\f es8-^~ es4 r8 c'8->~ c'8 as8-. |
ges8 bes8 des'4-^ r8 bes8 \tuplet 3/2 { bes8 ges8 c8 } |
g4-^ r8 es8-. d8-> fis8 gis8 gis8-^ |
ges4.-> c'8~ c'4 \tuplet 3/2 { bes8 bes8 ges8 } |
f8-.\< as8-. bes8-. des'8-> des'4-^ \tuplet 3/2 { fes'8 des'8 bes8 } |
c'4-^\ff r8 as8-. r8 as8->~ as4 |
r8 des'8->~ des'4 \tuplet 3/2 { ces'8 c'8 ces'8 } a8 ges8 |
as4-^ r4 \tuplet 3/2 { r8 es8 ges8 } as8-^ bes8-^\bendAfter #-4  |
R1*8 |
\tuplet 3/2 { as8->\ff as8-> as8-> } bes8-^ r8 r8 as16-> as16-> g8-^ r8 |
r16 g16-> g8-^ r8 cis'8-^~ cis'4 g4-^\fermata |
cis'1\mf |
cis'2 d'2 |
d'1\< |
b2 cis'2 |
e'2\f dis'2 |
d'2 cis'2 |
fis'2\ff d'2 |
e'2\> d'2\! |
fis1\pp\fermata |
d'1\p\< |
b1\f\> |
a1\pp\fermata |

}

tenorII = {
R1*2 |
bes,1\pp\< |
bes,2\mp a,2\fermata |
es1\pp |
f1 |
des2 f2 |
f1 |
es2 d2 |
des2 f2 |
es2 des2 |
f2 es2 |
es1\p |
f2 des2 |
des1 |
f2 ges2 |
f1 |
es2 f2 |
f2 f2 |
es1 |
R1*8 |
es1\mp |
f1 |
des2 f2 |
f1\< |
es2\mf d2 |
des2 f2 |
es2 fis2 |
f2\> es2\! |
a2.\fp\< r4\! |
R1*8 |
r4\p r8 as8~ as4 f4 |
des4. des8~ des2 |
r4 r8 g8~ g4 es4 |
des2 f2 |
r4 r8 ges8~ ges4 f4 |
c2. r4 |
r8 es8-^\mf r4 r8 c8-^ r4 |
r8 f8-^ r4 r8 f8-^ r8 bes8-^ |
r8\f c8-^~ c4 r8 as8->~ as8 f8-. |
f8 ges8 bes4-^ r8 ges8 \tuplet 3/2 { ges8 f8 bes,8 } |
es4-^ r8 c8-. cis8-> d8 fis8 fis8-^ |
f4.-> bes8~ bes4 \tuplet 3/2 { ges8 ges8 f8 } |
des8-.\< f8-. as8-. bes8-> bes4-^ \tuplet 3/2 { des'8 bes8 g8 } |
as4-^\ff r8 f8-. r8 fis8->~ fis4 |
r8 bes8->~ bes4 \tuplet 3/2 { as8 a8 as8 } ges8 es8 |
f4-^ r4 \tuplet 3/2 { r8 bes,8 es8 } f8-^ as8-^\bendAfter #-4  |
R1*8 |
\tuplet 3/2 { f8->\ff f8-> f8-> } as8-^ r8 r8 g16-> g16-> es8-^ r8 |
r16 fis16-> fis8-^ r8 bes8-^~ bes4 e4-^\fermata |
a1\mf |
a2 cis'2 |
b1\< |
g2 b2 |
cis'2\f c'2 |
b2 b2 |
d'2\ff bes2 |
cis'2\> c'2\! |
b,1\pp\fermata |
c'1\p\< |
a1\f\> |
fis1\pp\fermata |

}

bari = {
R1*2 |
es,1\pp\< |
as,2\mp as,2\fermata |
des1\pp |
bes,1 |
es2 es2 |
as,1 |
f,2 bes,2 |
es2 as,2 |
f,2 ges,2 |
as,2 as,2 |
des1\p |
bes,2 bes,2 |
es1 |
as,2 as,2 |
ges,1 |
f,2 bes,2 |
es2 as,2 |
des1 |
R1*8 |
des1\mp |
bes,1 |
es2 es2 |
as,1\< |
f,2\mf bes,2 |
es2 as,2 |
f,2 e,2 |
es,2\> as,2\! |
as,2.\fp\< r4\! |
R1*8 |
r4\p r8 ges,8~ ges,4 ges,4 |
g,4. c8~ c2 |
r4 r8 f,8~ f,4 f,4 |
bes,2 es2 |
r4 r8 es8~ es4 es4 |
as,2. r4 |
r8 des8-^\mf r4 r8 des8-^ r4 |
r8 es8-^ r4 r8 as,8-^ r8 as,8-^ |
r8\f des8-^~ des4 r8 bes,8->~ bes,8 bes,8-. |
es8 es8 es4-^ r8 as,8 \tuplet 3/2 { as,8 as,8 as,8 } |
f,4-^ r8 f,8-. e,8-> e,8 e,8 e,8-^ |
es,4.-> as,8~ as,4 \tuplet 3/2 { as,8 as,8 as,8 } |
ges,8-.\< ges,8-. ges,8-. ges,8-> g,4-^ \tuplet 3/2 { g,8 g,8 g,8 } |
as,4-^\ff r8 as,8-. r8 bes,8->~ bes,4 |
r8 es8->~ es4 \tuplet 3/2 { as,8 as,8 as,8 } as,8 as,8 |
des4-^ r4 \tuplet 3/2 { r8 des8 des8 } des8-^ des8-^\bendAfter #-4  |
R1*8 |
\tuplet 3/2 { ges,8->\ff ges,8-> ges,8-> } ges,8-^ r8 r8 f,16-> f,16-> f,8-^ r8 |
r16 e,16-> e,8-^ r8 a,8-^~ a,4 a,4-^\fermata |
d,1\mf |
b,2 b,2 |
e1\< |
a,2 a,2 |
fis,2\f b,2 |
e2 a,2 |
g,2\ff g,2 |
a,2\> bes,2\! |
a,1\pp\fermata |
bes,1\p\< |
a,1\f\> |
d1\pp\fermata |

}

tpI = {
R1*3 |
r2 r2\fermata |
R1*16 |
f''1\pp^"Cup mute" |
f''2 e''2 |
es''1 |
des''2 des''2 |
des''1 |
des''1 |
c''2 d''2 |
des''2 c''2 |
f''1\mp^"Open" |
f''2 des''2 |
ges''1\< |
f''1\mf |
es''2 d''2 |
des''2 c''2 |
c''2 d''2 |
des''2\> c''2\! |
ges''2.\fp\< r4\! |
R1*16 |
r8\f as'8-^~ as'4 r8 f''8->~ f''8 des''8-. |
es''8 f''8 ges''4-^ r8 f''8 \tuplet 3/2 { es''8 c''8 as'8 } |
c''4-^ r8 as'8-. gis'8-> b'8 d''8 e''8-^ |
es''4.-> ges''8~ ges''4 \tuplet 3/2 { f''8 es''8 c''8 } |
bes'8-.\< des''8-. f''8-. as''8-> g''4-^ \tuplet 3/2 { bes''8 g''8 e''8 } |
f''4-^\ff r8 es''8-. r8 d''8->~ d''4 |
r8 ges''8->~ ges''4 \tuplet 3/2 { f''8 ges''8 f''8 } es''8 c''8 |
des''4-^ r4 \tuplet 3/2 { r8 as'8 c''8 } es''8-^ f''8-^\bendAfter #-4  |
R1*8 |
\tuplet 3/2 { des''8->\ff des''8-> des''8-> } f''8-^ r8 r8 es''16-> es''16-> c''8-^ r8 |
r16 d''16-> e''8-^ r8 g''8-^~ g''4 cis''4-^\fermata |
fis''1\mf |
fis''2 a''2 |
g''1\< |
fis''2 g''2 |
a''2\f a''2 |
g''2 g''2 |
b''2\ff a''2 |
a''2\> as''2\! |
R1\fermata |
a''1\p\< |
fis''1\f\> |
e''1\pp\fermata |

}

tpII = {
R1*3 |
r2 r2\fermata |
R1*16 |
des''1\pp^"Cup mute" |
des''2 des''2 |
c''1 |
c''2 c''2 |
bes'1 |
bes'1 |
as'2 c''2 |
bes'2 a'2 |
es''1\mp^"Open" |
des''2 c''2 |
f''1\< |
c''1\mf |
c''2 ces''2 |
bes'2 bes'2 |
as'2 ais'2 |
bes'2\> a'2\! |
e''2.\fp\< r4\! |
R1*16 |
r8\f f'8-^~ f'4 r8 des''8->~ des''8 c''8-. |
bes'8 des''8 f''4-^ r8 c''8 \tuplet 3/2 { c''8 bes'8 f'8 } |
as'4-^ r8 g'8-. fis'8-> gis'8 cis''8 cis''8-^ |
bes'4.-> f''8~ f''4 \tuplet 3/2 { c''8 c''8 bes'8 } |
as'8-.\< bes'8-. des''8-. f''8-> fes''4-^ \tuplet 3/2 { g''8 fes''8 des''8 } |
es''4-^\ff r8 c''8-. r8 ces''8->~ ces''4 |
r8 f''8->~ f''4 \tuplet 3/2 { d''8 es''8 d''8 } c''8 a'8 |
bes'4-^ r4 \tuplet 3/2 { r8 f'8 a'8 } bes'8-^ es''8-^\bendAfter #-4  |
R1*8 |
\tuplet 3/2 { bes'8->\ff bes'8-> bes'8-> } des''8-^ r8 r8 c''16-> c''16-> as'8-^ r8 |
r16 b'16-> b'8-^ r8 e''8-^~ e''4 bes'4-^\fermata |
e''1\mf |
d''2 fis''2 |
fis''1\< |
cis''2 fis''2 |
gis''2\f fis''2 |
fis''2 fis''2 |
a''2\ff e''2 |
fis''2\> e''2\! |
R1\fermata |
e''1\p\< |
d''1\f\> |
cis''1\pp\fermata |

}

tpIII = {
R1*3 |
r2 r2\fermata |
R1*16 |
bes'1\pp^"Cup mute" |
bes'2 bes'2 |
as'1 |
as'2 g'2 |
ges'1 |
g'1 |
f'2 as'2 |
ges'2 ges'2 |
c''1\mp^"Open" |
c''2 as'2 |
des''1\< |
bes'1\mf |
as'2 as'2 |
ges'2 ges'2 |
g'2 gis'2 |
ges'2\> ges'2\! |
c''2.\fp\< r4\! |
R1*16 |
r8\f es'8-^~ es'4 r8 c''8->~ c''8 as'8-. |
ges'8 bes'8 des''4-^ r8 bes'8 \tuplet 3/2 { bes'8 ges'8 c'8 } |
g'4-^ r8 es'8-. d'8-> fis'8 gis'8 gis'8-^ |
ges'4.-> c''8~ c''4 \tuplet 3/2 { bes'8 bes'8 ges'8 } |
f'8-.\< as'8-. bes'8-. des''8-> des''4-^ \tuplet 3/2 { fes''8 des''8 bes'8 } |
c''4-^\ff r8 as'8-. r8 as'8->~ as'4 |
r8 des''8->~ des''4 \tuplet 3/2 { ces''8 c''8 ces''8 } a'8 ges'8 |
as'4-^ r4 \tuplet 3/2 { r8 es'8 ges'8 } as'8-^ bes'8-^\bendAfter #-4  |
R1*8 |
\tuplet 3/2 { as'8->\ff as'8-> as'8-> } bes'8-^ r8 r8 as'16-> as'16-> g'8-^ r8 |
r16 g'16-> g'8-^ r8 cis''8-^~ cis''4 g'4-^\fermata |
cis''1\mf |
cis''2 d''2 |
d''1\< |
b'2 cis''2 |
e''2\f dis''2 |
d''2 cis''2 |
fis''2\ff d''2 |
e''2\> d''2\! |
R1\fermata |
d''1\p\< |
b'1\f\> |
a'1\pp\fermata |

}

tpIV = {
R1*3 |
r2 r2\fermata |
R1*16 |
as'1\pp^"Cup mute" |
g'2 g'2 |
g'1 |
f'2 f'2 |
f'1 |
e'1 |
es'2 fis'2 |
f'2 es'2 |
as'1\mp^"Open" |
as'2 f'2 |
bes'1\< |
ges'1\mf |
g'2 f'2 |
f'2 f'2 |
es'2 fis'2 |
f'2\> es'2\! |
a'2.\fp\< r4\! |
R1*16 |
r8\f c'8-^~ c'4 r8 as'8->~ as'8 f'8-. |
f'8 ges'8 bes'4-^ r8 ges'8 \tuplet 3/2 { ges'8 f'8 bes8 } |
es'4-^ r8 c'8-. cis'8-> d'8 fis'8 fis'8-^ |
f'4.-> bes'8~ bes'4 \tuplet 3/2 { ges'8 ges'8 f'8 } |
des'8-.\< f'8-. as'8-. bes'8-> bes'4-^ \tuplet 3/2 { des''8 bes'8 g'8 } |
as'4-^\ff r8 f'8-. r8 fis'8->~ fis'4 |
r8 bes'8->~ bes'4 \tuplet 3/2 { as'8 a'8 as'8 } ges'8 es'8 |
f'4-^ r4 \tuplet 3/2 { r8 bes8 es'8 } f'8-^ as'8-^\bendAfter #-4  |
R1*8 |
\tuplet 3/2 { f'8->\ff f'8-> f'8-> } as'8-^ r8 r8 g'16-> g'16-> es'8-^ r8 |
r16 fis'16-> fis'8-^ r8 bes'8-^~ bes'4 e'4-^\fermata |
a'1\mf |
a'2 cis''2 |
b'1\< |
g'2 b'2 |
cis''2\f c''2 |
b'2 b'2 |
d''2\ff bes'2 |
cis''2\> c''2\! |
R1\fermata |
c''1\p\< |
a'1\f\> |
fis'1\pp\fermata |

}

tpV = {
R1*3 |
r2 r2\fermata |
R1*16 |
f'1\pp^"Cup mute" |
f'2 e'2 |
es'1 |
des'2 des'2 |
des'1 |
des'1 |
c'2 d'2 |
des'2 c'2 |
f'1\mp^"Open" |
f'2 des'2 |
ges'1\< |
f'1\mf |
es'2 d'2 |
des'2 c'2 |
c'2 d'2 |
des'2\> c'2\! |
ges'2.\fp\< r4\! |
R1*16 |
r8\f as8-^~ as4 r8 f'8->~ f'8 des'8-. |
es'8 f'8 ges'4-^ r8 f'8 \tuplet 3/2 { es'8 c'8 as8 } |
c'4-^ r8 as8-. gis8-> b8 d'8 e'8-^ |
es'4.-> ges'8~ ges'4 \tuplet 3/2 { f'8 es'8 c'8 } |
bes8-.\< des'8-. f'8-. as'8-> g'4-^ \tuplet 3/2 { bes'8 g'8 e'8 } |
f'4-^\ff r8 es'8-. r8 d'8->~ d'4 |
r8 ges'8->~ ges'4 \tuplet 3/2 { f'8 ges'8 f'8 } es'8 c'8 |
des'4-^ r4 \tuplet 3/2 { r8 as8 c'8 } es'8-^ f'8-^\bendAfter #-4  |
R1*8 |
\tuplet 3/2 { des'8->\ff des'8-> des'8-> } f'8-^ r8 r8 es'16-> es'16-> c'8-^ r8 |
r16 d'16-> e'8-^ r8 g'8-^~ g'4 cis'4-^\fermata |
fis'1\mf |
fis'2 a'2 |
g'1\< |
fis'2 g'2 |
a'2\f a'2 |
g'2 g'2 |
b'2\ff a'2 |
a'2\> as'2\! |
R1\fermata |
a'1\p\< |
fis'1\f\> |
e'1\pp\fermata |

}

tbI = {
R1*3 |
r2. as8\mf^"Solo" c'8 |
f'4.( es'8 c'2) |
r8 des'8( es'8 f'8 \tuplet 3/2 { as'4 ges'4 f'4) } |
f'2~ f'8 ges'16( f'16 es'8 des'8) |
c'2 r8 c'16( des'16 es'8 f'8) |
as'4.( g'8 f'4 ces'4) |
bes4.( ges8) \tuplet 3/2 { f4( ges4 c'4) } |
des'2 \tuplet 3/2 { c'8( des'8 es'8 } f'4) |
es'2. r8 as8 |
f'4.( es'8 c'4) \tuplet 3/2 { des'8( es'8 f'8 } |
as'2)~ as'8 ges'8( f'8 des'8) |
es'4~ es'16 des'16( bes8 ges'4. f'8) |
f'2 es'4 \tuplet 3/2 { des'8( c'8 bes8) } |
as'4.( ges'8 f'4 des'4) |
es'4.( c'8) des'4 \tuplet 3/2 { f'8( es'8 des'8) } |
bes2 \tuplet 3/2 { c'4( des'4 es'4) } |
des'2. r4 |
r8 bes8(\mp des'8 f'8 as'4.) ges'8 |
f'4( des'4) \tuplet 3/2 { e'4( des'4 bes4) } |
c'2. r8 c'16( des'16 |
es'4 f'4) g'4.( f'8) |
ges'2~ ges'8 f'16( es'16 des'8 bes8) |
e'4.( g'8 bes2) |
as'4.( f'8 ges'4 d'4) |
es'2 r8 as8\<( c'8 es'8) |
f'4.\mf( es'16 f'16 c'2) |
r8 des'16( es'16 f'8 as'8 \tuplet 3/2 { bes'4 as'4 f'4) } |
ges'2 f'8( es'16 des'16 bes8 c'8) |
des'2~ \tuplet 3/2 { des'8 es'8( f'8 } ges'8. f'16) |
as'4.( g'8) \tuplet 3/2 { f'8( ges'8 f'8 } d'4) |
bes4.( ges'8) \tuplet 3/2 { f'4( es'4 c'4) } |
as'2 \tuplet 3/2 { gis'8( fis'8 e'8 } d'4) |
des'2.\> r4\! |
R1 |
r4^"Solo (ad lib.) – образец" r8 as8\mf \tuplet 3/2 { f'8 es'8 des'8 } c'8 as8 |
bes8 des'8 f'8 as'8~ as'4 r8 ges'8 |
f'8 es'8 r8 des'8-^ r8 bes8 \tuplet 3/2 { des'8 c'8 ces'8 } |
bes8 c'8 es'8 ges'8~ ges'4 f'8 fes'8 |
es'4-^ r8 c'8~ c'4 as8 g8 |
as8 ces'8 d'8 ges'8~ ges'4 \tuplet 3/2 { e'8 d'8 ces'8 } |
bes4 r4 r8 ges'8 \tuplet 3/2 { f'8 es'8 des'8 } |
c'8 es'8 ges'8 bes'8~ bes'4. as'8 |
f'4~ f'8 des'8 \tuplet 3/2 { bes8 c'8 des'8 } es'8 f'8 |
f'8 des'8 bes8 g8 e'8 des'8 bes8 g8 |
as4-^ r8 c'8 es'8 g'8 \tuplet 3/2 { f'8 es'8 c'8 } |
des'4 f'8 des'8 g'8 es'8 des'8 bes8 |
ges4. f8 ges8 bes8 des'8 f'8 |
\tuplet 3/2 { as'8 ges'8 f'8 } es'8 c'8~ c'4 r4 |
r8 f'8-> r8 es'8-> r8 c'8-> \tuplet 3/2 { des'8 es'8 f'8 } |
ges'4 f'8 es'8 c'8 as8 r4 |
r8\f f8-^~ f4 r8 des'8->~ des'8 c'8-. |
bes8 des'8 f'4-^ r8 c'8 \tuplet 3/2 { c'8 bes8 f8 } |
as4-^ r8 g8-. fis8-> gis8 cis'8 cis'8-^ |
bes4.-> f'8~ f'4 \tuplet 3/2 { c'8 c'8 bes8 } |
as8-.\< bes8-. des'8-. f'8-> fes'4-^ \tuplet 3/2 { g'8 fes'8 des'8 } |
es'4-^\ff r8 c'8-. r8 ces'8->~ ces'4 |
r8 f'8->~ f'4 \tuplet 3/2 { d'8 es'8 d'8 } c'8 a8 |
bes4-^ r4 \tuplet 3/2 { r8 f8 a8 } bes8-^ es'8-^\bendAfter #-4  |
r8^"Solo – 2 такта" f'8-^ r8 as'8-^~ as'8 f'8 \tuplet 3/2 { es'8 des'8 c'8 } |
des'4-^ r8 bes8-. \tuplet 3/2 { des'8 f'8 as'8 } bes'4-^ |
R1*6 |
\tuplet 3/2 { bes8->\ff bes8-> bes8-> } des'8-^ r8 r8 c'16-> c'16-> as8-^ r8 |
r16 b16-> b8-^ r8 e'8-^~ e'4 bes4-^\fermata |
fis'4.\f^"Solo"( e'16 fis'16 cis'2) |
r8 d'16( e'16 fis'8 a'8 \tuplet 3/2 { b'4 a'4 fis'4) } |
g'2 fis'8( e'16 d'16 b8 cis'8) |
d'2~ \tuplet 3/2 { d'8 e'8( fis'8 } g'8. fis'16) |
a'4.( gis'8) \tuplet 3/2 { fis'8( g'8 fis'8 } dis'4) |
b4.( g'8) \tuplet 3/2 { fis'4( e'4 cis'4) } |
b'2\ff \tuplet 3/2 { a'4( g'4 e'4) } |
fis'2\>~ fis'4 e'4\! |
e'8.\mf^"Cadenza ad lib."( fis'16 \tuplet 3/2 { g'8 a'8 b'8 } \tuplet 5/4 { a'16 g'16 fis'16 e'16 d'16) } d'4\fermata |
d'2\p\< \tuplet 3/2 { d'4( e'4 f'4) } |
e'2.\f fis'8( g'8) |
a'1\pp\fermata |

}

tbII = {
R1*3 |
r2 r2\fermata |
R1*8 |
c'1\p^"Open" |
des'1~ |
des'1 |
c'1 |
bes1 |
as2~ as2 |
ges2~ ges2 |
f1 |
f1\pp~ |
f2 e2 |
as1~ |
as2 g2 |
ges1 |
g1 |
f2 as2 |
ges2~ ges2 |
f1\mp |
as1 |
ges1 |
ges1\mf |
as2~ as2 |
ges2~ ges2 |
as2~ gis2 |
ges2\>~ ges2 |
ges2.\fp\< r4\! |
R1*16 |
r8\f es8-^~ es4 r8 c'8->~ c'8 as8-. |
ges8 bes8 des'4-^ r8 bes8 \tuplet 3/2 { bes8 ges8 c8 } |
g4-^ r8 es8-. d8-> fis8 gis8 gis8-^ |
ges4.-> c'8~ c'4 \tuplet 3/2 { bes8 bes8 ges8 } |
f8-.\< as8-. bes8-. des'8-> des'4-^ \tuplet 3/2 { fes'8 des'8 bes8 } |
c'4-^\ff r8 as8-. r8 as8->~ as4 |
r8 des'8->~ des'4 \tuplet 3/2 { ces'8 c'8 ces'8 } a8 ges8 |
as4-^ r4 \tuplet 3/2 { r8 es8 ges8 } as8-^ bes8-^\bendAfter #-4  |
R1*8 |
\tuplet 3/2 { as8->\ff as8-> as8-> } bes8-^ r8 r8 as16-> as16-> g8-^ r8 |
r16 g16-> g8-^ r8 cis'8-^~ cis'4 g4-^\fermata |
cis'1\mf |
d'1~ |
d'1 |
cis'1 |
e'2\f dis'2 |
d'2 cis'2 |
b2 bes2 |
cis'2\> d'2 |
R1\fermata |
a1\p\< |
fis1\f\> |
fis1\pp\fermata |

}

tbIII = {
R1*3 |
r2 r2\fermata |
R1*8 |
f1\p^"Open" |
as1 |
ges1~ |
ges1 |
f1 |
es2 des2~ |
des2 c2 |
bes,1 |
bes,1\pp~ |
bes,2~ bes,2 |
es1 |
des2~ des2~ |
des1~ |
des1 |
c2 d2 |
des2 c2 |
c1\mp |
des1~ |
des1 |
c1\mf |
es2 d2 |
des2 c2 |
es2 d2 |
des2\> c2 |
c2.\fp\< r4\! |
R1*16 |
r8\f c8-^~ c4 r8 as8->~ as8 f8-. |
f8 ges8 bes4-^ r8 ges8 \tuplet 3/2 { ges8 f8 bes,8 } |
es4-^ r8 c8-. cis8-> d8 fis8 fis8-^ |
f4.-> bes8~ bes4 \tuplet 3/2 { ges8 ges8 f8 } |
des8-.\< f8-. as8-. bes8-> bes4-^ \tuplet 3/2 { des'8 bes8 g8 } |
as4-^\ff r8 f8-. r8 fis8->~ fis4 |
r8 bes8->~ bes4 \tuplet 3/2 { as8 a8 as8 } ges8 es8 |
f4-^ r4 \tuplet 3/2 { r8 bes,8 es8 } f8-^ as8-^\bendAfter #-4  |
R1*8 |
\tuplet 3/2 { f8->\ff f8-> f8-> } as8-^ r8 r8 g16-> g16-> es8-^ r8 |
r16 fis16-> fis8-^ r8 bes8-^~ bes4 e4-^\fermata |
fis1\mf |
a1 |
g1~ |
g1 |
a2\f~ a2 |
g2~ g2 |
fis2 e2 |
fis2\> as2 |
R1\fermata |
d1\p\< |
b,1\f\> |
cis1\pp\fermata |

}

bassTb = {
R1*3 |
r2 r2\fermata |
R1*8 |
des,1\p^"Open" |
bes,,1 |
es,1 |
as,1 |
ges,1 |
f,2 bes,2 |
es,2 as,2 |
des,1 |
ges,1\pp |
g,2 c2 |
f,1 |
bes,2 es,2~ |
es,1 |
e,1 |
f,2 bes,2 |
as,2~ as,2 |
des,1\mp |
bes,,1 |
es,1 |
as,1\mf |
f,2 bes,2 |
es,2 as,2 |
f,2 e,2 |
es,2\> as,2 |
as,2.\fp\< r4\! |
R1*16 |
r8\f des,8-^~ des,4 r8 bes,,8->~ bes,,8 bes,,8-. |
es,8 es,8 es,4-^ r8 as,8 \tuplet 3/2 { as,8 as,8 as,8 } |
f,4-^ r8 f,8-. e,8-> e,8 e,8 e,8-^ |
es,4.-> as,8~ as,4 \tuplet 3/2 { as,8 as,8 as,8 } |
ges,8-.\< ges,8-. ges,8-. ges,8-> g,4-^ \tuplet 3/2 { g,8 g,8 g,8 } |
as,4-^\ff r8 as,8-. r8 bes,8->~ bes,4 |
r8 es,8->~ es,4 \tuplet 3/2 { as,8 as,8 as,8 } as,8 as,8 |
des4-^ r4 \tuplet 3/2 { r8 des8 des8 } des8-^ des8-^\bendAfter #-4  |
R1*8 |
\tuplet 3/2 { ges,8->\ff ges,8-> ges,8-> } ges,8-^ r8 r8 f,16-> f,16-> f,8-^ r8 |
r16 e,16-> e,8-^ r8 a,8-^~ a,4 a,4-^\fermata |
d,1\mf |
b,,1 |
e,1 |
a,1 |
fis,2\f b,2 |
e,2 a,2 |
g,2~ g,2 |
a,2\> bes,2 |
R1\fermata |
bes,,1\p\< |
a,,1\f\> |
d,1\pp\fermata |

}

guitar = {
R1*2 |
\timeOn b4^\markup\italic"volume swells, pp" b4 b4 b4 |
\timeOff \improvisationOn b4 b4 b2\fermata |
\improvisationOff \timeOn b4^\markup\italic"Clean – арпеджио ad lib." b4 b4 b4 |
b4 b4 b4 b4 |
b4 b4 b4 b4 |
b4 b4 b4 b4 |
b4 b4 b4 b4 |
b4 b4 b4 b4 |
b4 b4 b4 b4 |
b4 b4 b4 b4 |
b4 b4 b4 b4 |
b4 b4 b4 b4 |
b4 b4 b4 b4 |
b4 b4 b4 b4 |
b4 b4 b4 b4 |
b4 b4 b4 b4 |
b4 b4 b4 b4 |
b4 b4 b4 b4 |
b4 b4 b4 b4 |
b4 b4 b4 b4 |
b4 b4 b4 b4 |
b4 b4 b4 b4 |
b4 b4 b4 b4 |
b4 b4 b4 b4 |
b4 b4 b4 b4 |
b4 b4 b4 b4 |
b4 b4 b4 b4 |
b4 b4 b4 b4 |
b4 b4 b4 b4 |
b4 b4 b4 b4 |
b4 b4 b4 b4 |
b4 b4 b4 b4 |
b4 b4 b4 b4 |
b4 b4 b4 b4 |
\timeOff \improvisationOn b2.->\fp r4 |
\improvisationOff \timeOn b4^\markup\italic"Comp – 4 на такт" b4 b4 b4 |
b4 b4 b4 b4 |
b4 b4 b4 b4 |
b4 b4 b4 b4 |
b4 b4 b4 b4 |
b4 b4 b4 b4 |
b4 b4 b4 b4 |
b4 b4 b4 b4 |
b4 b4 b4 b4 |
b4 b4 b4 b4 |
b4 b4 b4 b4 |
b4 b4 b4 b4 |
b4 b4 b4 b4 |
b4 b4 b4 b4 |
b4 b4 b4 b4 |
b4 b4 b4 b4 |
\timeOff \improvisationOn r8\f b8-^~ b4 r8 b8->~ b8 b8-. |
b8 b8 b4-^ r8 b8 \tuplet 3/2 { b8 b8 b8 } |
b4-^ r8 b8-. b8-> b8 b8 b8-^ |
b4.-> b8~ b4 \tuplet 3/2 { b8 b8 b8 } |
b8-.\< b8-. b8-. b8-> b4-^ \tuplet 3/2 { b8 b8 b8 } |
b4-^\ff r8 b8-. r8 b8->~ b4 |
r8 b8->~ b4 \tuplet 3/2 { b8 b8 b8 } b8 b8 |
b4-^ r4 \tuplet 3/2 { r8 b8 b8 } b8-^ b8-^ |
\improvisationOff \timeOn b4^\markup\italic"Comp" b4 b4 b4 |
b4 b4 b4 b4 |
\timeOff R1*2 |
r8^"Solo гитары – 2 такта" c'8 es'8 g'8 \tuplet 3/2 { bes'8 as'8 f'8 } es'8 c'8 |
as8 ces'8 d'8 e'8 ges'4-^ r4 |
R1*2 |
\improvisationOn \tuplet 3/2 { b8->\ff b8-> b8-> } b8-^ r8 r8 b16-> b16-> b8-^ r8 |
r16 b16-> b8-^ r8 b8-^~ b4 b4-^\fermata |
\improvisationOff \timeOn b4^\markup\italic"Big ballad" b4 b4 b4 |
b4 b4 b4 b4 |
b4 b4 b4 b4 |
b4 b4 b4 b4 |
b4 b4 b4 b4 |
b4 b4 b4 b4 |
b4 b4 b4 b4 |
b4 b4 b4 b4 |
\timeOff R1\fermata |
\improvisationOn b1\p^"let ring" |
b1 |
b1\fermata |
\improvisationOff
}

pianoRH = {
r8\p^"Rubato" bes'8( des''8 f''8 as''2) |
g''4.( f''8) \tuplet 3/2 { es''8( des''8 c''8 } des''4) |
ges''2~ ges''8 f''16( es''16 des''8 bes'8) |
<ges' bes' des''>2 <ges' a' c''>2\fermata |
<es' f' as' c''>1\mp^"Comp ad lib., заполнять паузы солиста" |
<des' f' as' c''>1 |
<f' ges' bes' des''>1 |
<f' ges' bes' c''>1 |
<es' g' as' c''>2 <d' f' as' ces''>2 |
<des' f' ges' bes'>2 <c' f' ges' bes'>2 |
<c' es' f' as'>2 <bes des' f' as'>2 |
<bes des' f' ges'>2 <a c' es' ges'>2 |
<as c' es' f'>1 |
<as c' des' f'>1 |
<ges bes des' f'>1 |
<ges bes c' f'>1 |
<as bes des' f'>1 |
<as c' es' g'>2 <c' des' f' as'>2 |
<bes des' f' ges'>2 <bes c' f' ges'>2 |
<as bes es' f'>1 |
<as bes des' f'>1 |
<g bes des' f'>2 <bes des' e' g'>2 |
<as c' es' g'>1 |
<c' des' f' as'>2 <c' des' f' g'>2 |
<bes des' f' ges'>1 |
<bes des' e' g'>1 |
<c' es' f' as'>2 <c' d' fis' as'>2 |
<bes des' f' ges'>2 <a c' es' ges'>2 |
<as c' es' f'>1\mf |
<as c' des' f'>1 |
<ges bes des' f'>1 |
<ges bes c' f'>1 |
<as c' es' g'>2 <ces' d' f' as'>2 |
<bes des' f' ges'>2 <bes c' f' ges'>2 |
<as c' es' g'>2 <ais d' fis' gis'>2 |
<bes des' f' ges'>2 <a c' es' ges'>2 |
<a c' e' ges'>2.\fp\< r4\! |
<es' f' as' c''>4-. r8 <es' f' as' c''>8->~ <es' f' as' c''>2 |
r4 <des' f' as' c''>4-. r8 <des' f' as' c''>8-> r4 |
r8 <f' ges' bes' des''>8-> r4 r4 <f' ges' bes' des''>4-. |
<f' ges' bes' c''>4. <f' ges' bes' c''>8~ <f' ges' bes' c''>2 |
<es' g' as' c''>4-. r8 <es' g' as' c''>8->~ <es' g' as' c''>2 |
r4 <d' fis' as' ces''>4-. r8 <d' fis' as' ces''>8-> r4 |
r8 <des' f' ges' bes'>8-> r4 r4 <des' f' ges' bes'>4-. |
<c' f' ges' bes'>4. <c' f' ges' bes'>8~ <c' f' ges' bes'>2 |
<des' f' as' bes'>4-. r8 <des' f' as' bes'>8->~ <des' f' as' bes'>2 |
r8 <des' f' g' bes'>8-> r4 r4 <des' e' g' bes'>4-. |
r8 <c' es' g' as'>8-> r4 r4 <c' es' g' as'>4-. |
<c' des' f' as'>4. <c' des' f' as'>8 <c' des' f' g'>4-. r4 |
<bes des' f' ges'>4-. r8 <bes des' f' ges'>8->~ <bes des' f' ges'>2 |
r4 <bes c' f' ges'>4-. r8 <bes c' f' ges'>8-> r4 |
r8 <as c' es' f'>8-> r4 r4 <as c' es' f'>4-. |
<ges bes des' f'>4. <ges bes des' f'>8 <ges bes c' f'>4-. r4 |
r8\f <es' f' as' c''>8-^~ <es' f' as' c''>4 r8 <des' f' as' c''>8->~ <des' f' as' c''>8 <des' f' as' c''>8-. |
<f' ges' bes' des''>8 <f' ges' bes' des''>8 <f' ges' bes' des''>4-^ r8 <f' ges' bes' c''>8 \tuplet 3/2 { <f' ges' bes' c''>8 <f' ges' bes' c''>8 <f' ges' bes' c''>8 } |
<es' g' as' c''>4-^ r8 <es' g' as' c''>8-. <d' fis' gis' cis''>8-> <d' fis' gis' cis''>8 <d' fis' gis' cis''>8 <d' fis' gis' cis''>8-^ |
<f' ges' bes' des''>4.-> <f' ges' bes' c''>8~ <f' ges' bes' c''>4 \tuplet 3/2 { <f' ges' bes' c''>8 <f' ges' bes' c''>8 <f' ges' bes' c''>8 } |
<f' as' bes' des''>8-.\< <f' as' bes' des''>8-. <f' as' bes' des''>8-. <f' as' bes' des''>8-> <fes' g' bes' des''>4-^ \tuplet 3/2 { <fes' g' bes' des''>8 <fes' g' bes' des''>8 <fes' g' bes' des''>8 } |
<es' f' as' c''>4-^\ff r8 <es' f' as' c''>8-. r8 <d' fis' as' ces''>8->~ <d' fis' as' ces''>4 |
r8 <des' f' ges' bes'>8->~ <des' f' ges' bes'>4 \tuplet 3/2 { <c' es' ges' a'>8 <c' es' ges' a'>8 <c' es' ges' a'>8 } <c' es' ges' a'>8 <c' es' ges' a'>8 |
<bes es' f' as'>4-^ r4 \tuplet 3/2 { r8 <bes es' f' as'>8 <bes es' f' as'>8 } <bes es' f' as'>8-^ <bes es' f' as'>8-^\bendAfter #-4  |
<es' f' as' c''>4-. r8 <es' f' as' c''>8->~ <es' f' as' c''>2 |
r4 <des' f' as' c''>4-. r8 <des' f' as' c''>8-> r4 |
R1*2 |
<es' g' as' c''>4-. r8 <es' g' as' c''>8->~ <es' g' as' c''>2 |
r4 <d' fis' as' ces''>4-. r8 <d' fis' as' ces''>8-> r4 |
R1*2 |
\tuplet 3/2 { <f' as' bes' des''>8->\ff <f' as' bes' des''>8-> <f' as' bes' des''>8-> } <f' as' bes' des''>8-^ r8 r8 <es' g' as' c''>16-> <es' g' as' c''>16-> <es' g' as' c''>8-^ r8 |
r16 <d' fis' g' b'>16-> <d' fis' g' b'>8-^ r8 <cis' e' g' bes'>8-^~ <cis' e' g' bes'>4 <cis' e' g' bes'>4-^\fermata |
<e' fis' a' cis''>1\f |
<d' fis' a' cis''>1 |
<fis' g' b' d''>1 |
<fis' g' b' cis''>1 |
<e' gis' a' cis''>2 <dis' fis' a' c''>2 |
<d' fis' g' b'>2 <cis' fis' g' b'>2 |
<d' fis' a' b'>2 <d' e' a' bes'>2 |
<cis' e' fis' a'>2 <c' d' e' as'>2 |
<b d' fis' g'>1\pp\fermata |
<c' d' e' a'>1\p\< |
<b d' fis' a'>1\f\> |
<cis' e' fis' a'>1\pp\fermata |

}

pianoLH = {
<ges, des f>1\sustainOn |
<f, es as>2 <bes, as des'>2 |
<es, des ges>1 |
<as, ges>2 <as, ges>2\fermata\sustainOff |
<f c'>1\mp |
<des as>1 |
<ges des'>1 |
<c ges>1 |
<as es'>2 <d as>2 |
<ges des'>2 <c ges>2 |
<f c'>2 <bes f'>2 |
<ges des'>2 <c ges>2 |
<f c'>1 |
<des as>1 |
<ges des'>1 |
<c ges>1 |
<bes, f>1 |
<as es'>2 <des as>2 |
<ges des'>2 <c ges>2 |
<f bes>1 |
<bes f'>1 |
<bes f'>2 <e bes>2 |
<as es'>1 |
<des as>2 <g des'>2 |
<ges des'>1 |
<g des'>1 |
<f c'>2 <d as>2 |
<ges des'>2 <c ges>2 |
<f c'>1\mf |
<des as>1 |
<ges des'>1 |
<c ges>1 |
<as es'>2 <d as>2 |
<ges des'>2 <c ges>2 |
<as es'>2 <gis d'>2 |
<ges des'>2 <c ges>2 |
<c ges>2.\fp\< r4\! |
<f c'>4-. r8 <f c'>8->~ <f c'>2 |
r4 <des as>4-. r8 <des as>8-> r4 |
r8 <ges des'>8-> r4 r4 <ges des'>4-. |
<c ges>4. <c ges>8~ <c ges>2 |
<as es'>4-. r8 <as es'>8->~ <as es'>2 |
r4 <d as>4-. r8 <d as>8-> r4 |
r8 <ges des'>8-> r4 r4 <ges des'>4-. |
<c ges>4. <c ges>8~ <c ges>2 |
<bes, f>4-. r8 <bes, f>8->~ <bes, f>2 |
r8 <bes, f>8-> r4 r4 <e bes>4-. |
r8 <as es'>8-> r4 r4 <as es'>4-. |
<des as>4. <des as>8 <g des'>4-. r4 |
<ges des'>4-. r8 <ges des'>8->~ <ges des'>2 |
r4 <c ges>4-. r8 <c ges>8-> r4 |
r8 <f c'>8-> r4 r4 <f c'>4-. |
<ges des'>4. <ges des'>8 <c ges>4-. r4 |
r8\f <f c'>8-^~ <f c'>4 r8 <des as>8->~ <des as>8 <des as>8-. |
<ges des'>8 <ges des'>8 <ges des'>4-^ r8 <c ges>8 \tuplet 3/2 { <c ges>8 <c ges>8 <c ges>8 } |
<as es'>4-^ r8 <as es'>8-. <gis d'>8-> <gis d'>8 <gis d'>8 <gis d'>8-^ |
<ges des'>4.-> <c ges>8~ <c ges>4 \tuplet 3/2 { <c ges>8 <c ges>8 <c ges>8 } |
<bes, f>8-.\< <bes, f>8-. <bes, f>8-. <bes, f>8-> <bes, fes>4-^ \tuplet 3/2 { <bes, fes>8 <bes, fes>8 <bes, fes>8 } |
<f c'>4-^\ff r8 <f c'>8-. r8 <d as>8->~ <d as>4 |
r8 <ges des'>8->~ <ges des'>4 \tuplet 3/2 { <c ges>8 <c ges>8 <c ges>8 } <c ges>8 <c ges>8 |
<f bes>4-^ r4 \tuplet 3/2 { r8 <f bes>8 <f bes>8 } <f bes>8-^ <f bes>8-^\bendAfter #-4  |
<f c'>4-. r8 <f c'>8->~ <f c'>2 |
r4 <des as>4-. r8 <des as>8-> r4 |
R1*2 |
<as es'>4-. r8 <as es'>8->~ <as es'>2 |
r4 <d as>4-. r8 <d as>8-> r4 |
R1*2 |
\tuplet 3/2 { <ges, bes, f>8->\ff <ges, bes, f>8-> <ges, bes, f>8-> } <ges, bes, f>8-^ r8 r8 <f, as es'>16-> <f, as es'>16-> <f, as es'>8-^ r8 |
r16 <e, g d'>16-> <e, g d'>8-^ r8 <a, cis g>8-^~ <a, cis g>4 <a, cis g>4-^\fermata |
<fis cis'>1\f |
<d a>1 |
<g d'>1 |
<cis g>1 |
<a e'>2 <dis a>2 |
<g d'>2 <cis g>2 |
<b, fis>2 <bes, e>2 |
<fis cis'>2 <d as>2 |
<g d'>1\pp\fermata |
<d a>1\p\< |
<b, fis>1\f\> |
<fis cis'>1\pp\fermata |

}

bassGtr = {
R1*2 |
es,1\pp |
as,,2 as,,2\fermata |
des,2 as,4 a,4 |
bes,2 f,4 e,4 |
es,2 bes,4 a,4 |
as,2 es,4 e,4 |
f,2 bes,2 |
es,2 as,2 |
f,2 ges,2 |
as,2 as,2 |
des2 as,4 a,4 |
bes,2 f,4 e,4 |
es,2 bes,4 a,4 |
as,2 es,4 f,4 |
ges,2 des4 ges,4 |
f,2 bes,2 |
es,2 as,2 |
des2 as,4 g,4 |
ges,2 des4 as,4 |
g,2 c2 |
f,2 c4 b,4 |
bes,2 es,2 |
es,2 bes,4 f,4 |
e,2 bes,4 ges,4 |
f,2 bes,2 |
as,2 as,2 |
des2 as,4 a,4 |
bes,2 f,4 e,4 |
es,2 bes,4 a,4 |
as,2 es,4 e,4 |
f,2 bes,2 |
es,2 as,2 |
f,2 e,2 |
es,2 as,2 |
as,,2.->\fp r4 |
des,4 f,4 as,4 a,4 |
bes,4 f,4 des,4 d,4 |
es,4 ges,4 bes,4 a,4 |
as,4 es,4 c,4 e,4 |
f,4 as,4 c4 b,4 |
bes,4 fis,4 d,4 d,4 |
es,4 ges,4 bes,4 a,4 |
as,4 es,4 c,4 f,4 |
ges,4 bes,4 des4 as,4 |
g,4 b,4 c4 ges,4 |
f,4 as,4 c4 b,4 |
bes,4 e,4 es,4 d,4 |
es,4 ges,4 bes,4 a,4 |
as,4 es,4 c,4 c,4 |
des,4 f,4 as,4 e,4 |
es,4 g,4 as,4 c4 |
des,4 b,,4 bes,,4 d,4 |
es,4 g,4 as,4 ges,4 |
f,4 f,4 e,4 e,4 |
es,4 g,4 as,4 g,4 |
ges,4 ges,4 g,4 g,4 |
as,4 a,4 bes,4 e,4 |
es,4 g,4 as,4 c4 |
des4 as,4 f,4 d,4 |
des,4 f,4 as,4 a,4 |
bes,4 f,4 des,4 d,4 |
R1*2 |
f,4 as,4 c4 b,4 |
bes,4 fis,4 d,4 d,4 |
R1*2 |
\tuplet 3/2 { ges,,8->\ff ges,,8-> ges,,8-> } ges,,8-^ r8 r8 f,,16-> f,,16-> f,,8-^ r8 |
r16 e,,16-> e,,8-^ r8 a,,8-^~ a,,4 a,,4-^\fermata |
d,2 a,4 ais,4 |
b,2 fis,4 f,4 |
e,2 b,4 ais,4 |
a,2 e,4 f,4 |
fis,2 b,2 |
e,2 a,2 |
g,2 g,2 |
a,2 bes,2 |
a,,1\pp\fermata |
bes,,1\p\< |
a,,1\f\> |
d,1\pp\fermata |

}

drumPart = {
R1*3 |
r2 \x a''2:32\pp\<\fermata |
\timeOn b'4\p^\markup\italic"Brushes – ballad" b'4 b'4 b'4 |
b'4 b'4 b'4 b'4 |
b'4 b'4 b'4 b'4 |
b'4 b'4 b'4 b'4 |
b'4 b'4 b'4 b'4 |
b'4 b'4 b'4 b'4 |
b'4 b'4 b'4 b'4 |
b'4 b'4 b'4 b'4 |
\timeOff \timeOn b'4 b'4 b'4 b'4 |
b'4 b'4 b'4 b'4 |
b'4 b'4 b'4 b'4 |
b'4 b'4 b'4 b'4 |
b'4 b'4 b'4 b'4 |
b'4 b'4 b'4 b'4 |
b'4 b'4 b'4 b'4 |
b'4 b'4 b'4 b'4 |
\timeOff \timeOn b'4^\markup\italic"Brushes, чуть активнее" b'4 b'4 b'4 |
b'4 b'4 b'4 b'4 |
b'4 b'4 b'4 b'4 |
b'4 b'4 b'4 b'4 |
b'4 b'4 b'4 b'4 |
b'4 b'4 b'4 b'4 |
b'4 b'4 b'4 b'4 |
b'4 b'4 b'4 b'4 |
\timeOff \timeOn b'4^\markup\italic"Sticks: rim click на 2 и 4" b'4 b'4 b'4 |
b'4 b'4 b'4 b'4 |
b'4 b'4 b'4 b'4 |
b'4 b'4 b'4 b'4 |
b'4 b'4 b'4 b'4 |
b'4 b'4 b'4 b'4 |
b'4 b'4 b'4 b'4 |
b'4 b'4 b'4 b'4 |
\timeOff \x a''4->\fp r4 c''16\< c''16 c''16 c''16 e''16 e''16 d''16 d''16\! |
\x f''4^"Swing – ride, HH на 2 и 4" <\x f'' \x d'>8. \x f''16 \x f''4 <\x f'' \x d'>8. \x f''16 |
\timeOn b'4^\markup\italic"Time" b'4 b'4 b'4 |
b'4 b'4 b'4 b'4 |
b'4 b'4 b'4 b'4 |
b'4 b'4 b'4 b'4 |
b'4 b'4 b'4 b'4 |
b'4 b'4 b'4 b'4 |
b'4 b'4 b'4 b'4 |
b'4 b'4 b'4 b'4 |
b'4 b'4 b'4 b'4 |
b'4 b'4 b'4 b'4 |
b'4 b'4 b'4 b'4 |
b'4 b'4 b'4 b'4 |
b'4 b'4 b'4 b'4 |
\timeOff \timeOn b'4^\markup\italic"ловить акценты саксофонов" b'4 b'4 b'4 |
b'4 b'4 b'4 b'4 |
\timeOff \improvisationOn r8\f b'8-^~ b'4 r8 b'8->~ b'8 b'8-. |
b'8 b'8 b'4-^ r8 b'8 \tuplet 3/2 { b'8 b'8 b'8 } |
b'4-^ r8 b'8-. b'8-> b'8 b'8 b'8-^ |
b'4.-> b'8~ b'4 \tuplet 3/2 { b'8 b'8 b'8 } |
b'8-.\< b'8-. b'8-. b'8-> b'4-^ \tuplet 3/2 { b'8 b'8 b'8 } |
b'4-^\ff r8 b'8-. r8 b'8->~ b'4 |
r8 b'8->~ b'4 \tuplet 3/2 { b'8 b'8 b'8 } b'8 b'8 |
b'4-^ r4 \tuplet 3/2 { r8 b'8 b'8 } b'8-^ b'8-^ |
\improvisationOff \timeOn b'4^\markup\italic"Time" b'4 b'4 b'4 |
b'4 b'4 b'4 b'4 |
\timeOff \timeOn b'4^\markup\italic"SOLO" b'4 b'4 b'4 |
b'4 b'4 b'4 b'4 |
\timeOff \timeOn b'4^\markup\italic"Time" b'4 b'4 b'4 |
b'4 b'4 b'4 b'4 |
\timeOff \timeOn b'4^\markup\italic"SOLO" b'4 b'4 b'4 |
b'4 b'4 b'4 b'4 |
\timeOff \improvisationOn \tuplet 3/2 { b'8->\ff b'8-> b'8-> } b'8-^ r8 r8 b'16-> b'16-> b'8-^ r8 |
r16 b'16-> b'8-^ r8 b'8-^~ b'4 b'4-^\fermata |
\improvisationOff \timeOn b'4^\markup\italic"Big ballad – sticks, ride" b'4 b'4 b'4 |
b'4 b'4 b'4 b'4 |
b'4 b'4 b'4 b'4 |
b'4 b'4 b'4 b'4 |
b'4 b'4 b'4 b'4 |
b'4 b'4 b'4 b'4 |
b'4 b'4 b'4 b'4 |
b'4 b'4 b'4 b'4 |
\timeOff \x a''1:32\pp\fermata |
\x a''1:32\p\< |
\x a''2\f r4 \tuplet 3/2 { e''8 d''8 a'8 } |
\x a''1:32\pp\fermata |

}

chordsAll = \chordmode {
ges1:maj9 f2:m7 bes2:m7 es1:m9 as2:7sus4 as2:7.9-  % 1
des1:maj7 bes1:m9 es1:m9 as1:13  % 5
f2:m7 bes2:7.9- es2:m9 as2:7 des2:maj7/f ges2:maj7 es2:m7/as as2:7.9-  % 9
des1:maj7 bes1:m9 es1:m9 as1:13  % 13
ges1:maj7 f2:m7 bes2:m7 es2:m7 as2:7 des1:6.9  % 17
ges1:maj7 g2:m7.5- c2:7.9- f1:m7 bes2:m7 es2:9  % 21
es1:m9 e1:dim7 des2:maj7/f bes2:7.5+ es2:m9/as as2:7.9-  % 25
des1:maj7 bes1:m9 es1:m9 as1:13  % 29
f2:m7 bes2:7.9- es2:m9 as2:7 f2:m7 e2:7.11+ es2:m9 as2:7.9-  % 33
as1:7.5+.9- des1:maj7 bes1:m7 es1:m7  % 37
as1:7 f1:m7 bes1:7.5+.9- es1:m7  % 41
as1:7 ges1:maj7 g2:m7.5- c2:7.9- f1:m7  % 45
bes2:m7 es2:7 es1:m7 as1:7 des1:maj7  % 49
es2:m7 as2:7 des2:maj7 bes2:m7 es2:m7 as2:7 f2:m7 e2:7  % 53
es2:m7 as2:7 ges2:maj7 g2:dim7 des2:maj7/as bes2:7.5+.9- es2:m7 as2:7.9-  % 57
des1:6.9 des1:maj7 bes1:m7 es1:m7  % 61
as1:7 f1:m7 bes1:7.5+.9- es1:m7  % 65
as1:7 ges2:maj7 f2:m7 e2:m7 a2:7.9- d1:maj7  % 69
b1:m9 e1:m9 a1:13 fis2:m7 b2:7.9-  % 73
e2:m9 a2:7 g2:maj7 g2:m6 d2:maj7/a bes2:7.11+ e1:m9/a  % 77
bes1:maj7.11+ g1:maj7/a d1:maj9  % 81
}

\score {
  \unfoldRepeats <<
\new Staff \with { instrumentName = "Альт-саксофон 1" shortInstrumentName = "А-сакс. 1" midiInstrument = "alto sax" } { \transposition es \clef treble \transpose es c' << \global \altoI >> }
\new Staff \with { instrumentName = "Альт-саксофон 2" shortInstrumentName = "А-сакс. 2" midiInstrument = "alto sax" } { \transposition es \clef treble \transpose es c' << \global \altoII >> }
\new Staff \with { instrumentName = "Тенор-саксофон 1" shortInstrumentName = "Т-сакс. 1" midiInstrument = "tenor sax" } { \transposition bes, \clef treble \transpose bes, c' << \global \tenorI >> }
\new Staff \with { instrumentName = "Тенор-саксофон 2" shortInstrumentName = "Т-сакс. 2" midiInstrument = "tenor sax" } { \transposition bes, \clef treble \transpose bes, c' << \global \tenorII >> }
\new Staff \with { instrumentName = "Баритон-саксофон" shortInstrumentName = "Бар.-сакс." midiInstrument = "baritone sax" } { \transposition es, \clef treble \transpose es, c' << \global \bari >> }
\new Staff \with { instrumentName = "Труба 1" shortInstrumentName = "Тр. 1" midiInstrument = "trumpet" } { \transposition bes \clef treble \transpose bes c' << \global \tpI >> }
\new Staff \with { instrumentName = "Труба 2" shortInstrumentName = "Тр. 2" midiInstrument = "trumpet" } { \transposition bes \clef treble \transpose bes c' << \global \tpII >> }
\new Staff \with { instrumentName = "Труба 3" shortInstrumentName = "Тр. 3" midiInstrument = "trumpet" } { \transposition bes \clef treble \transpose bes c' << \global \tpIII >> }
\new Staff \with { instrumentName = "Труба 4" shortInstrumentName = "Тр. 4" midiInstrument = "trumpet" } { \transposition bes \clef treble \transpose bes c' << \global \tpIV >> }
\new Staff \with { instrumentName = "Труба 5" shortInstrumentName = "Тр. 5" midiInstrument = "trumpet" } { \transposition bes \clef treble \transpose bes c' << \global \tpV >> }
\new Staff \with { instrumentName = "Тромбон 1 (соло)" shortInstrumentName = "Трб. 1" midiInstrument = "trombone" } { \clef bass << \global \tbI >> }
\new Staff \with { instrumentName = "Тромбон 2" shortInstrumentName = "Трб. 2" midiInstrument = "trombone" } { \clef bass << \global \tbII >> }
\new Staff \with { instrumentName = "Тромбон 3" shortInstrumentName = "Трб. 3" midiInstrument = "trombone" } { \clef bass << \global \tbIII >> }
\new Staff \with { instrumentName = "Бас-тромбон" shortInstrumentName = "Б.-трб." midiInstrument = "trombone" } { \clef bass << \global \bassTb >> }
\new Staff \with { instrumentName = "Бас-гитара" shortInstrumentName = "Бас" midiInstrument = "electric bass (finger)" } { \transposition c \clef bass \transpose c c' << \global \bassGtr >> }
\new PianoStaff \with { instrumentName = "Фортепиано" shortInstrumentName = "Ф-но" } << \new Staff \with { midiInstrument = "acoustic grand" } { \clef treble << \global \pianoRH >> } \new Staff \with { midiInstrument = "acoustic grand" } { \clef bass << \global \pianoLH >> } >>
  >>
  \midi { \context { \Score midiChannelMapping = #'instrument } }
}
