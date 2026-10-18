import { loadFont as loadSans } from "@remotion/google-fonts/IBMPlexSans";
import { loadFont as loadMono } from "@remotion/google-fonts/IBMPlexMono";
import { loadFont as loadDeva } from "@remotion/google-fonts/IBMPlexSansDevanagari";
import { Easing, interpolate, spring } from "remotion";
import timeline from "./timeline.json";

export const FPS = 30;
export const sans = loadSans("normal", { weights: ["300", "400", "500", "600", "700"], subsets: ["latin"] }).fontFamily;
export const mono = loadMono("normal", { weights: ["400", "500"], subsets: ["latin"] }).fontFamily;
export const deva = loadDeva("normal", { weights: ["400", "500"], subsets: ["devanagari"] }).fontFamily;

export const C = {
  ink: "#161616", ink2: "#393939", muted: "#6f6f6f", line: "#e0e0e0", fill: "#f4f4f4", paper: "#ffffff",
  blue: "#0f62fe", blueSoft: "#edf5ff", dark: "#0b0b0b", dark2: "#1c1c1c", darkLine: "#333333",
  green: "#198038", greenSoft: "#defbe6", amber: "#f1c21b", amberInk: "#8a5a00", amberSoft: "#fcf4d6",
  red: "#da1e28", redSoft: "#fff1f1",
};

export type Word = { w: string; s: number; d: number };
export type Line = { file: string; voice: string; text: string; start: number; dur: number; words: Word[] };
export type Scene = { id: string; start: number; end: number; lines: Line[] };
export const TL = timeline as { total: number; scenes: Scene[] };
export const scene = (id: string) => TL.scenes.find(s => s.id === id)!;

/** seconds (absolute) -> frames relative to a scene start */
export const rel = (sc: Scene, absSec: number) => Math.round((absSec - sc.start) * FPS);
/** frame (relative to scene) at which line i starts */
export const lineAt = (sc: Scene, i: number) => rel(sc, sc.lines[i].start);
/** frame (relative to scene) when a word matching re is spoken in line i */
export const wordAt = (sc: Scene, i: number, re: RegExp, fallback = 0) => {
  const w = sc.lines[i].words.find(x => re.test(x.w));
  return w ? rel(sc, w.s) : lineAt(sc, i) + fallback;
};

export const ease = Easing.bezier(0.2, 0.7, 0.2, 1);
/** 0→1 entrance progress starting at frame `at` */
export const enter = (f: number, at: number, dur = 18) =>
  interpolate(f, [at, at + dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
export const pop = (f: number, at: number, fps = FPS) =>
  spring({ frame: f - at, fps, config: { damping: 14, stiffness: 140, mass: 0.7 } });
export const fadeOut = (f: number, at: number, dur = 12) =>
  interpolate(f, [at, at + dur], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
