import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { C, FPS, TL, Word, deva, ease, enter, mono, sans } from "./theme";

/* ---------------- captions (word-highlighted, chunked) ---------------- */
type Chunk = { words: Word[]; start: number; end: number; hindi: boolean; translation?: string };
const HINDI_EN = "Police or banks never ask for money on a call. Hang up and call 1930.";

const chunks: Chunk[] = (() => {
  const out: Chunk[] = [];
  for (const sc of TL.scenes) for (const ln of sc.lines) {
    const hindi = ln.voice === "H";
    let cur: Word[] = [];
    const flush = (endAt: number) => {
      if (!cur.length) return;
      out.push({ words: cur, start: cur[0].s, end: endAt, hindi, translation: hindi ? HINDI_EN : undefined });
      cur = [];
    };
    ln.words.forEach((w, i) => {
      cur.push(w);
      const next = ln.words[i + 1];
      const punct = /[.,?!:;।]$/.test(w.w);
      if (!next || cur.length >= (hindi ? 9 : 7) || (punct && cur.length >= 3)) flush(next ? next.s : ln.start + ln.dur + 0.25);
    });
  }
  return out;
})();

export const Captions: React.FC<{ dark?: boolean }> = () => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const ch = chunks.find(c => t >= c.start - 0.05 && t < c.end);
  if (!ch) return null;
  const inP = interpolate(t, [ch.start - 0.05, ch.start + 0.12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 54, pointerEvents: "none" }}>
      <div style={{ background: "rgba(10,10,10,.82)", padding: "12px 26px 14px", borderRadius: 6, maxWidth: 1500, opacity: inP,
        transform: `translateY(${(1 - inP) * 8}px)`, textAlign: "center" }}>
        <div style={{ fontFamily: ch.hindi ? deva : sans, fontSize: 38, fontWeight: 500, lineHeight: 1.35, color: "#fff" }}>
          {ch.words.map((w, i) => {
            const on = t >= w.s;
            return <span key={i} style={{ color: on ? "#fff" : "rgba(255,255,255,.55)" }}>{w.w}{" "}</span>;
          })}
        </div>
        {ch.translation && <div style={{ fontFamily: sans, fontSize: 26, color: "#c6c6c6", marginTop: 6 }}>{ch.translation}</div>}
      </div>
    </AbsoluteFill>
  );
};

/* ---------------- chapter label (top-left) ---------------- */
export const Chapter: React.FC<{ n: string; title: string; dark?: boolean }> = ({ n, title, dark }) => {
  const f = useCurrentFrame();
  const p = enter(f, 4, 16);
  return (
    <div style={{ position: "absolute", left: 72, top: 56, display: "flex", alignItems: "center", gap: 14, opacity: p,
      transform: `translateX(${(1 - p) * -20}px)`, fontFamily: mono, fontSize: 22, letterSpacing: 1.5, textTransform: "uppercase",
      color: dark ? "#a8a8a8" : C.muted }}>
      <span style={{ color: C.blue }}>{n}</span>
      <span style={{ width: 36, height: 2, background: dark ? "#555" : C.line, display: "inline-block" }} />
      <span>{title}</span>
    </div>
  );
};

/* ---------------- small corner tag ---------------- */
export const Tag: React.FC<{ children: React.ReactNode; dark?: boolean; at?: number; right?: number; top?: number }> =
  ({ children, dark, at = 10, right = 72, top = 56 }) => {
  const f = useCurrentFrame();
  const p = enter(f, at, 14);
  return (
    <div style={{ position: "absolute", right, top, opacity: p, fontFamily: sans, fontSize: 20, fontWeight: 500,
      padding: "6px 14px", borderRadius: 20, border: `1.5px solid ${dark ? "#444" : C.line}`,
      background: dark ? "rgba(255,255,255,.04)" : C.paper, color: dark ? "#c6c6c6" : C.ink2,
      display: "flex", alignItems: "center", gap: 10 }}>{children}</div>
  );
};
export const LiveDot: React.FC = () => {
  const f = useCurrentFrame();
  const a = 0.55 + 0.45 * Math.sin(f / 6);
  return <span style={{ width: 10, height: 10, borderRadius: 5, background: "#24a148", boxShadow: `0 0 0 ${4 * a}px rgba(36,161,72,.25)`, display: "inline-block" }} />;
};

/* ---------------- callout box for screen recordings ---------------- */
export const Callout: React.FC<{ at: number; until?: number; x: number; y: number; w?: number; title: string; body?: string; accent?: string }> =
  ({ at, until = 99999, x, y, w = 430, title, body, accent = C.blue }) => {
  const f = useCurrentFrame();
  const p = enter(f, at, 14) * interpolate(f, [until, until + 10], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  if (p <= 0) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, opacity: p, transform: `translateY(${(1 - p) * 14}px) scale(${0.97 + 0.03 * p})`,
      background: C.ink, color: "#fff", padding: "16px 20px 18px", borderLeft: `6px solid ${accent}`, boxShadow: "0 12px 40px rgba(0,0,0,.35)",
      fontFamily: sans }}>
      <div style={{ fontSize: 28, fontWeight: 600, lineHeight: 1.2 }}>{title}</div>
      {body && <div style={{ fontSize: 21, color: "#c6c6c6", marginTop: 6, lineHeight: 1.4 }}>{body}</div>}
    </div>
  );
};

/* ---------------- highlight ring over a recording ---------------- */
export const Ring: React.FC<{ at: number; until?: number; x: number; y: number; w: number; h: number; color?: string }> =
  ({ at, until = 99999, x, y, w, h, color = C.blue }) => {
  const f = useCurrentFrame();
  const p = enter(f, at, 12) * interpolate(f, [until, until + 10], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  if (p <= 0) return null;
  return <div style={{ position: "absolute", left: x - 8, top: y - 8, width: w + 16, height: h + 16, border: `4px solid ${color}`,
    borderRadius: 8, opacity: p, transform: `scale(${1.06 - 0.06 * p})`, boxShadow: "0 0 0 9999px rgba(0,0,0,.18)" }} />;
};

/* ---------------- decision pill ---------------- */
export const Pill: React.FC<{ kind: "ALLOW" | "WARN" | "HOLD"; size?: number }> = ({ kind, size = 30 }) => {
  const m = { ALLOW: [C.greenSoft, C.green, "Allowed"], WARN: [C.amberSoft, C.amberInk, "Warned"], HOLD: [C.redSoft, C.red, "Held"] }[kind];
  return <span style={{ display: "inline-flex", alignItems: "center", gap: size * 0.35, background: m[0], color: m[1], fontFamily: sans,
    fontWeight: 600, fontSize: size, padding: `${size * 0.2}px ${size * 0.6}px`, borderRadius: size }}>
    <span style={{ width: size * 0.42, height: size * 0.42, borderRadius: "50%", background: m[1] }} />{m[2]}</span>;
};

/** slide-up text helper */
export const Rise: React.FC<{ at: number; children: React.ReactNode; dist?: number; style?: React.CSSProperties; dur?: number }> =
  ({ at, children, dist = 30, style, dur = 18 }) => {
  const f = useCurrentFrame();
  const p = enter(f, at, dur);
  return <div style={{ opacity: p, transform: `translateY(${(1 - p) * dist}px)`, ...style }}>{children}</div>;
};

export { ease };
