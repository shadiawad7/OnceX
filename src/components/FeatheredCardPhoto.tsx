import { useEffect, useId, useState } from 'react';
import { Image } from 'react-native';
import Svg, { Defs, G, Image as SvgImage, LinearGradient, Mask, Rect, Stop } from 'react-native-svg';

// Intensidad del desvanecido: 0 = sin efecto; 100 = bordes transparentes.
const PHOTO_FADE_INTENSITY_PERCENT = 100;
// Extensión desde la base: 32 = 32 % de la altura. Rango: 0–80.
// Los laterales y la parte superior se suavizan en proporción, con menos extensión.
const PHOTO_FADE_EXTENT_PERCENT = 25;

/** Fade the photo's own bounds, including letterboxed images, to transparency. */
export default function FeatheredCardPhoto({url,name,onError}:{url:string;name:string;onError:()=>void}) {
 const id=useId().replace(/:/g,'');
 const extent=Math.min(80,Math.max(0,PHOTO_FADE_EXTENT_PERCENT))/100;
 const intensity=extent===0?0:Math.min(100,Math.max(0,PHOTO_FADE_INTENSITY_PERCENT))/100;
 const edgeOpacity=1-intensity;
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
    <Stop offset="0" stopColor="white" stopOpacity={edgeOpacity}/><Stop offset={extent*0.4375} stopColor="white"/><Stop offset={1-extent*0.4375} stopColor="white"/><Stop offset="1" stopColor="white" stopOpacity={edgeOpacity}/>
   </LinearGradient>
   <LinearGradient id={id+'vertical'} x1="0%" y1="0%" x2="0%" y2="100%">
    <Stop offset="0" stopColor="white" stopOpacity={edgeOpacity}/><Stop offset={extent*0.25} stopColor="white"/><Stop offset={1-extent} stopColor="white"/><Stop offset={1-extent*0.375} stopColor="white" stopOpacity={1-intensity*0.5}/><Stop offset="1" stopColor="white" stopOpacity={edgeOpacity}/>
   </LinearGradient>
   <Mask id={id+'sides'} x="0" y="0" width="100%" height="100%"><Rect width={size.width} height={size.height} fill={`url(#${id}horizontal)`}/></Mask>
   <Mask id={id+'ends'} x="0" y="0" width="100%" height="100%"><Rect width={size.width} height={size.height} fill={`url(#${id}vertical)`}/></Mask>
  </Defs>
  <G mask={`url(#${id}sides)`}><SvgImage href={{uri:url}} width={size.width} height={size.height} mask={`url(#${id}ends)`}/></G>
 </Svg>;
}
