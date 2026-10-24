import { useEffect, useState } from 'react';
import type { Animated } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { logoOutline } from '../data/logoOutline';

// Web SVG paths receive numeric attributes; AnimatedPath uses native-style
// imperative updates which are incompatible with the browser SVG implementation.
export default function DrawnLogo({progress,width,height}:{progress:Animated.Value;width:number;height:number}) {
 const [value,setValue]=useState(0);
 useEffect(()=>{
  const listener=progress.addListener(({value:next})=>setValue(next));
  return()=>progress.removeListener(listener);
 },[progress]);
 return <Svg width={width} height={height} viewBox="0 0 1786 887" aria-hidden={true} focusable={false}>
  {logoOutline.map((shape,index)=>{
   const fraction=Math.max(0,Math.min(1,(value-shape.start)/(shape.end-shape.start)));
   return <Path key={index} d={shape.d} fill="none" stroke={shape.color} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={[shape.length,shape.length]} strokeDashoffset={shape.length*(1-fraction)}/>;
  })}
 </Svg>;
}
