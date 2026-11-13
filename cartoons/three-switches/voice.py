"""Шаг 1: озвучка реплик (Piper TTS) и расчёт таймлайна.

Результат: build/lines/*.wav и build/timeline.json
"""
import json
import os
import subprocess
import wave

import numpy as np
from pathlib import Path

HERE = Path(__file__).parent
BUILD = HERE / "build"
VOICES = Path(os.environ.get("VOICES_DIR", "/tmp/claude-0/voices"))

# Голоса: рассказчик и Пушистик (женский голос, поднятый по тону — мультяшный)
VOICE = {
    "N": {"model": "ru_RU-dmitri-medium", "filter": "atempo=1.0"},
    "H": {"model": "ru_RU-irina-medium",
          "filter": "asetrate=22050*1.22,aresample=22050,atempo=0.9"},
}

# Сценарий. Каждая реплика: (ключ, голос, текст, пауза_перед)
# min — минимальная длина сцены, tail — пауза после последней реплики
SCRIPT = [
    {"id": "title", "min": 4.5, "tail": 1.2, "lines": [
        ("n_title", "N", "Загадка «Три выключателя».", 1.0)]},
    {"id": "intro", "min": 0, "tail": 0.6, "lines": [
        ("n_room", "N", "Перед Пушистиком — закрытая комната. Внутри — одна обычная лампочка.", 0.6),
        ("n_switches", "N", "А снаружи — три выключателя.", 0.4)]},
    {"id": "rules", "min": 0, "tail": 0.6, "lines": [
        ("n_rule1", "N", "Только один из них включает лампу.", 0.3),
        ("n_rule2", "N", "Щёлкать можно сколько угодно, но зайти в комнату — только один раз.", 0.3)]},
    {"id": "think", "min": 0, "tail": 1.3, "lines": [
        ("h_hmm", "H", "Хм-м... Как же узнать, какой из них нужный?", 0.5)]},
    {"id": "idea", "min": 0, "tail": 0.4, "lines": [
        ("h_idea", "H", "Придумал!", 0.9)]},
    {"id": "switch1", "min": 0, "tail": 0.5, "lines": [
        ("h_sw1", "H", "Включаю первый... и жду!", 1.6)]},
    {"id": "wait", "min": 6.0, "tail": 0.8, "lines": [
        ("n_wait", "N", "Пятнадцать минут спустя... Лампочка всё это время горит и нагревается.", 1.4)]},
    {"id": "switch2", "min": 0, "tail": 0.7, "lines": [
        ("h_sw2", "H", "Теперь первый выключаю, а второй — включаю!", 0.4)]},
    {"id": "enter", "min": 0, "tail": 0.3, "lines": [
        ("h_dark", "H", "Лампа не горит... Значит, второй — не тот.", 2.2),
        ("h_touch", "H", "А если потрогать?", 0.4)]},
    {"id": "hot", "min": 0, "tail": 0.5, "lines": [
        ("h_hot", "H", "Ай! Горячая!", 0.6),
        ("h_first", "H", "Значит, лампу включает первый выключатель!", 0.9)]},
    {"id": "explain", "min": 0, "tail": 1.2, "lines": [
        ("n_ex0", "N", "Запомни:", 0.6),
        ("n_ex1", "N", "если лампа горит — это второй выключатель.", 0.2),
        ("n_ex2", "N", "Не горит, но горячая — первый.", 0.6),
        ("n_ex3", "N", "А если холодная — третий.", 0.6)]},
    {"id": "end", "min": 5.0, "tail": 2.5, "lines": [
        ("h_end", "H", "Вот и вся загадка!", 0.6)]},
]


def tts(key, voice, text):
    raw = BUILD / "lines" / f"{key}.raw.wav"
    out = BUILD / "lines" / f"{key}.wav"
    v = VOICE[voice]
    subprocess.run(
        ["python3", "-m", "piper", "-m", str(VOICES / f"{v['model']}.onnx"),
         "-f", str(raw)],
        input=text.encode(), check=True, capture_output=True)
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", str(raw),
         "-af", v["filter"], "-ar", "44100", "-ac", "1", str(out)],
        check=True)
    raw.unlink()
    with wave.open(str(out)) as w:
        n, sr = w.getnframes(), w.getframerate()
        data = np.frombuffer(w.readframes(n), dtype=np.int16).astype(np.float32)
    # огибающая громкости 30 раз в секунду — для движения рта
    step = sr // 30
    env = [float(np.sqrt(np.mean(data[i:i + step] ** 2)) if len(data[i:i + step]) else 0)
           for i in range(0, n, step)]
    peak = max(env) or 1
    env = [round(min(1.0, e / peak * 1.3), 2) for e in env]
    return n / sr, env


def main():
    (BUILD / "lines").mkdir(parents=True, exist_ok=True)
    t = 0.0
    segments, lines = [], {}
    for seg in SCRIPT:
        start = t
        cur = start
        for key, voice, text, gap in seg["lines"]:
            dur, env = tts(key, voice, text)
            ls = cur + gap
            lines[key] = {"voice": voice, "text": text, "start": round(ls, 3),
                          "end": round(ls + dur, 3), "seg": seg["id"], "env": env}
            cur = ls + dur
        end = max(start + seg["min"], cur + seg["tail"])
        segments.append({"id": seg["id"], "start": round(start, 3),
                         "end": round(end, 3)})
        t = end
    timeline = {"duration": round(t, 3), "segments": segments, "lines": lines}
    (BUILD / "timeline.json").write_text(
        json.dumps(timeline, ensure_ascii=False))
    print(f"duration {t:.1f}s")
    for s in segments:
        print(f"  {s['id']:8} {s['start']:6.2f} - {s['end']:6.2f}")


if __name__ == "__main__":
    main()
