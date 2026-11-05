import React from 'react';
import { Composition } from 'remotion';
import { PromoFilm, type FilmProps } from './Film';

const initial: FilmProps = {
  canvas: {width:1080,height:1920,fps:30},
  shots:[{src:'media/shot-001.mp4',durationFrames:150,shotId:'shot-001'}],
  overlays:[], audio:null,
};

export const PromoRoot: React.FC = () => (
  <Composition
    id="PromoFilm"
    component={PromoFilm}
    defaultProps={initial}
    durationInFrames={150}
    fps={30}
    width={1080}
    height={1920}
    calculateMetadata={({props})=>({
      durationInFrames: Math.max(1,props.shots.reduce((n,s)=>n+s.durationFrames,0)),
      fps:props.canvas.fps,
      width:props.canvas.width,
      height:props.canvas.height,
    })}
  />
);
