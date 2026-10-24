import { useEffect, useId, useState } from 'react';
import { Image } from 'react-native';
import Svg, { Defs, G, Image as SvgImage, LinearGradient, Mask, Rect, Stop } from 'react-native-svg';

/** Fade the photo's own bounds, including letterboxed images, to transparency. */
export default function FeatheredCardPhoto({url,name,onError}:{url:string;name:string;onError:()=>void}) {
 const id=useId().replace(/:/g,'');
 const [size,setSize]=useState<{url:string;width:number;height:number}>();
 useEffect(()=>{
  let active=true;
  Image.getSize(url,(width,height)=>{if(active)setSize({url,width,height});},()=>{if(active)onError();});
  return()=>{active=false;};
 },[url,onError]);
 if(!size||size.url!==url)return null;
 return <Svg width="100%" height="100%" viewBox={`0 0 ${size.width} ${size.height}`} preserveAspectRatio="xMidYMid meet" accessibilityLabel={`Foto de ${name}`}>
  <Defs>
   <LinearGradient id={id+'horizontal'} x1="0%" y1="0%" x2="100%" y2="0%">
    <Stop offset="0" stopColor="white" stopOpacity="0"/><Stop offset="0.14" stopColor="white"/><Stop offset="0.86" stopColor="white"/><Stop offset="1" stopColor="white" stopOpacity="0"/>
   </LinearGradient>
   <LinearGradient id={id+'vertical'} x1="0%" y1="0%" x2="0%" y2="100%">
    <Stop offset="0" stopColor="white" stopOpacity="0"/><Stop offset="0.08" stopColor="white"/><Stop offset="0.68" stopColor="white"/><Stop offset="0.88" stopColor="white" stopOpacity="0.5"/><Stop offset="1" stopColor="white" stopOpacity="0"/>
   </LinearGradient>
   <Mask id={id+'sides'} x="0" y="0" width="100%" height="100%"><Rect width={size.width} height={size.height} fill={`url(#${id}horizontal)`}/></Mask>
   <Mask id={id+'ends'} x="0" y="0" width="100%" height="100%"><Rect width={size.width} height={size.height} fill={`url(#${id}vertical)`}/></Mask>
  </Defs>
  <G mask={`url(#${id}sides)`}><SvgImage href={{uri:url}} width={size.width} height={size.height} mask={`url(#${id}ends)`}/></G>
 </Svg>;
}
