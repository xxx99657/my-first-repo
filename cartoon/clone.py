import sys, os, torch, numpy as np, soundfile as sf
os.environ["COQUI_TOS_AGREED"] = "1"  # user accepted CPML (non-commercial) in chat
from TTS.tts.configs.xtts_config import XttsConfig
from TTS.tts.models.xtts import Xtts
torch.set_num_threads(4)
cfg = XttsConfig(); cfg.load_json("config.json")
m = Xtts.init_from_config(cfg); m.load_checkpoint(cfg, checkpoint_dir=".", eval=True)
g, e = m.get_conditioning_latents(audio_path=["ref.wav"], gpt_cond_len=30, max_ref_length=30)
speed = float(sys.argv[2]) if len(sys.argv) > 2 else 0.95
lines = [l.strip() for l in open(sys.argv[1]) if l.strip()]
only = [int(x) for x in sys.argv[3].split(",")] if len(sys.argv) > 3 else None
for i, text in enumerate(lines, 1):
    if only and i not in only: continue
    torch.manual_seed(7)
    out = m.inference(text, "ru", g, e, temperature=0.6, speed=speed, repetition_penalty=5.0, top_p=0.85)
    sf.write(f"line_{i}.wav", np.array(out["wav"]), 24000); print(i, round(len(out["wav"]) / 24000, 2), flush=True)
