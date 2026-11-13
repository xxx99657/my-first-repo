#!/usr/bin/env bash
# Сборка мультфильма «Три выключателя» целиком.
# Нужно: python3 + numpy + piper-tts, голоса Piper в $VOICES_DIR, node + playwright, ffmpeg.
set -euo pipefail
cd "$(dirname "$0")"
python3 voice.py                 # озвучка + таймлайн
node render.js                   # кадры -> build/video.mp4, звуковые события -> build/sfx.json
python3 mix.py                   # голоса + эффекты + музыка -> build/audio.wav
ffmpeg -y -loglevel error -i build/video.mp4 -i build/audio.wav \
  -c:v copy -c:a aac -b:a 160k -shortest -movflags +faststart three-switches.mp4
echo "Готово: $(pwd)/three-switches.mp4"
