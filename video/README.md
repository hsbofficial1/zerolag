# ZeroLag demo video (source)

The 3-minute demo video is built from code, so every scene is reproducible.

| Step | Command (from repo root unless noted) | Output |
|---|---|---|
| Voiceover (Indian-English neural voices via `edge-tts`: Neerja, Prabhat; Hindi: Swara) | `python video/make_voice.py` | `remotion/public/vo/*.mp3`, `remotion/src/timeline.json` |
| Background music (original, generated with NumPy, no samples) | `python video/make_music.py 182` | `remotion/public/music.wav` |
| Screen recordings of the live console on IBM LinuxONE (via SSH tunnel on :8001) | `cd video/remotion && node record.mjs` | `remotion/public/clips/*.webm` |
| Render | `cd video/remotion && npm install && node node_modules/@remotion/cli/remotion-cli.js render src/index.ts ZeroLag out/ZeroLag_Demo.mp4` | 1920×1080, 30 fps |

Script and timings: [`script.json`](script.json). Scenes: [`remotion/src/Scenes.tsx`](remotion/src/Scenes.tsx).
The narration uses synthetic text-to-speech voices. The terminal scene reproduces the real output captured from the LinuxONE instance ([`docs/linuxone_proof.txt`](../docs/linuxone_proof.txt)).
