import React from "react";
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Close, Console, How, Meet, Open, Problem, Proof, Results, Test, Why } from "./Scenes";
import { C, FPS, Scene, TL } from "./theme";
import { Captions } from "./ui";

const XF = 10; // crossfade frames between scenes

const SceneFor: React.FC<{ sc: Scene }> = ({ sc }) => {
  switch (sc.id) {
    case "open": return <Open sc={sc} />;
    case "problem": return <Problem sc={sc} />;
    case "meet": return <Meet sc={sc} />;
    case "how": return <How sc={sc} />;
    case "proof": return <Proof sc={sc} />;
    case "console": return <Console sc={sc} clipOffset={45} />;
    case "test": return <Test sc={sc} />;
    case "results": return <Results sc={sc} />;
    case "why": return <Why sc={sc} />;
    case "close": return <Close sc={sc} />;
    default: return null;
  }
};

const Fade: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{ opacity: interpolate(f, [0, XF], [0, 1], { extrapolateRight: "clamp" }) }}>{children}</AbsoluteFill>;
};

const Progress: React.FC = () => {
  const f = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return <div style={{ position: "absolute", left: 0, top: 0, height: 5, width: `${(f / durationInFrames) * 100}%`, background: C.blue, zIndex: 50 }} />;
};

export const Video: React.FC = () => {
  const { durationInFrames } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {TL.scenes.map((sc, i) => {
        const from = i === 0 ? 0 : Math.round(sc.start * FPS);
        const next = TL.scenes[i + 1];
        const to = next ? Math.round(next.start * FPS) + XF : durationInFrames;
        return (
          <Sequence key={sc.id} from={from} durationInFrames={to - from} name={sc.id}>
            <Fade><SceneFor sc={i === 0 ? { ...sc, start: 0 } as Scene : sc} /></Fade>
          </Sequence>
        );
      })}
      {TL.scenes.flatMap(sc => sc.lines).map(ln => (
        <Sequence key={ln.file} from={Math.round(ln.start * FPS)} durationInFrames={Math.ceil(ln.dur * FPS) + 2} name={ln.file}>
          <Audio src={staticFile(ln.file)} volume={1} />
        </Sequence>
      ))}
      <Audio src={staticFile("music.wav")} volume={f =>
        interpolate(f, [0, 30, durationInFrames - 75, durationInFrames], [0, 0.11, 0.11, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
      <Captions />
      <Progress />
    </AbsoluteFill>
  );
};
