"""Generate the voiceover (one file per line) plus word timings for captions.

Output: remotion/public/vo/<scene>_<n>.mp3 and remotion/src/timeline.json
Usage:  python video/make_voice.py
"""
import asyncio
import json
import shutil
import subprocess
import sys
from pathlib import Path

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
import edge_tts  # noqa: E402

HERE = Path(__file__).resolve().parent
OUT = HERE / "remotion" / "public" / "vo"
TIMELINE = HERE / "remotion" / "src" / "timeline.json"
RATE = {"F": "+8%", "M": "+6%", "H": "+0%"}
GAP_LINE = 0.35      # seconds of silence between lines in a scene
GAP_SCENE = 0.8      # extra breathing room between scenes


FFPROBE = str(Path(shutil.which("ffmpeg")).with_name("ffprobe.exe" if sys.platform == "win32" else "ffprobe"))


def duration(path: Path) -> float:
    out = subprocess.run([FFPROBE, "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
                         capture_output=True, text=True, check=True).stdout
    return float(out.strip())


async def synth(text: str, voice: str, rate: str, path: Path) -> list:
    words = []
    com = edge_tts.Communicate(text, voice, rate=rate, boundary="WordBoundary")
    with path.open("wb") as f:
        async for chunk in com.stream():
            if chunk["type"] == "audio":
                f.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                words.append({"w": chunk["text"], "s": chunk["offset"] / 1e7, "d": chunk["duration"] / 1e7})
    return words


async def main():
    spec = json.loads((HERE / "script.json").read_text(encoding="utf-8"))
    OUT.mkdir(parents=True, exist_ok=True)
    t = 0.6
    scenes = []
    for sc in spec["scenes"]:
        start = t
        lines = []
        for i, ln in enumerate(sc["lines"]):
            p = OUT / f"{sc['id']}_{i}.mp3"
            for attempt in range(4):
                try:
                    words = await synth(ln["t"], spec["voices"][ln["v"]], RATE[ln["v"]], p)
                    break
                except Exception as e:  # network hiccups
                    print("retry", p.name, e)
                    await asyncio.sleep(2)
            d = duration(p)
            lines.append({"file": f"vo/{p.name}", "voice": ln["v"], "text": ln["t"], "start": round(t, 3),
                          "dur": round(d, 3), "words": [{**w, "s": round(t + w["s"], 3)} for w in words]})
            print(f"{p.name:14s} {ln['v']} {d:5.2f}s")
            t += d + GAP_LINE
        t += GAP_SCENE - GAP_LINE
        scenes.append({"id": sc["id"], "start": round(start, 3), "end": round(t, 3), "lines": lines})
    total = t + 0.8
    TIMELINE.parent.mkdir(parents=True, exist_ok=True)
    TIMELINE.write_text(json.dumps({"total": round(total, 3), "scenes": scenes}, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"total {total:.1f}s")


asyncio.run(main())
