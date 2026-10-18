import React from "react";
import { Composition } from "remotion";
import { FPS, TL } from "./theme";
import { Video } from "./Video";

export const Root: React.FC = () => (
  <Composition id="ZeroLag" component={Video} width={1920} height={1080} fps={FPS}
    durationInFrames={Math.ceil(TL.total * FPS)} />
);
