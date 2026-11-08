import React from 'react';
import { Composition } from 'remotion';
import { CriterioTechVideo } from './CriterioTechVideo';
import { SAMPLE_DUEL_042 } from '../data/sample-duel';

export const RemotionRoot: React.FC = () => {
  const lastScene = SAMPLE_DUEL_042.scenes[SAMPLE_DUEL_042.scenes.length - 1];
  const durationInSeconds = lastScene ? lastScene.endSec : 38;
  const fps = SAMPLE_DUEL_042.fps || 60;

  return (
    <>
      <Composition
        id="CriterioTechDuel"
        component={CriterioTechVideo}
        durationInFrames={Math.round(durationInSeconds * fps)}
        fps={fps}
        width={1080}
        height={1920}
        defaultProps={{
          payload: SAMPLE_DUEL_042
        }}
      />
    </>
  );
};
