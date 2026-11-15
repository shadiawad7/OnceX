import { useId } from 'react';
import Svg, { ClipPath, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';

// Brillo del marco dorado: 100 = normal; 50 = más tenue.
const CARD_GOLD_BRIGHTNESS_PERCENT=100;
// Intensidad de la textura grabada: 0–100.
const CARD_TEXTURE_OPACITY_PERCENT=28;
// Trazos deterministas en un solo path: textura propia sin la imagen de temporada.
const etchedTexture=Array.from({length:1900},(_,i)=>{
 const x=((i*73.37)%320)+20;
 const y=((i*41.93)%550)+24;
 const length=1+(i%7)*0.45;
 return `M${x.toFixed(1)} ${y.toFixed(1)}l${length.toFixed(1)} -${(length*0.65).toFixed(1)}l-0.7 -1.1`;
}).join(' ');
// X grabadas en la superficie: rojo oscuro, sin extrusión ni destellos.
const brandX='M0 0 H27 L48 31 L73 0 H100 L64 49 L100 100 H72 L49 68 L26 100 H0 L34 49 Z';
const outline='M180 10 C164 37 145 42 130 24 C91 32 55 65 15 78 V504 C15 530 28 541 61 552 L139 578 Q163 587 180 597 Q197 587 221 578 L299 552 C332 541 345 530 345 504 V78 C305 65 269 32 230 24 C215 42 196 37 180 10 Z';
export default function OncexCardFrame(){
 const id=useId().replace(/:/g,'');
 const brightness=Math.min(100,Math.max(0,CARD_GOLD_BRIGHTNESS_PERCENT))/100;
 return <Svg width="100%" height="100%" viewBox="0 0 360 610" fill="none" aria-hidden>
  <Defs>
   <ClipPath id={id+'clip'}><Path d={outline}/></ClipPath>
   <LinearGradient id={id+'body'} x1="0" y1="0" x2="1" y2="1"><Stop stopColor="#0A0909"/><Stop offset="0.55" stopColor="#160507"/><Stop offset="1" stopColor="#050709"/></LinearGradient>
   <LinearGradient id={id+'gold'} x1="0" y1="0" x2="1" y2="1"><Stop stopColor="#FFF8D0"/><Stop offset="0.18" stopColor="#FFD364"/><Stop offset="0.32" stopColor="#8A4C09"/><Stop offset="0.48" stopColor="#FFF9D9"/><Stop offset="0.64" stopColor="#EAA634"/><Stop offset="0.81" stopColor="#8D520D"/><Stop offset="0.94" stopColor="#FFF8D6"/><Stop offset="1" stopColor="#F6B83F"/></LinearGradient>
   <LinearGradient id={id+'red'} x1="0" y1="1" x2="1" y2="0"><Stop stopColor="#340306"/><Stop offset="0.5" stopColor="#940912"/><Stop offset="0.82" stopColor="#EE1724"/><Stop offset="1" stopColor="#FF7762"/></LinearGradient>
   <LinearGradient id={id+'xFace'} x1="0" y1="1" x2="1" y2="0"><Stop stopColor="#250507"/><Stop offset="0.3" stopColor="#4F0509"/><Stop offset="0.55" stopColor="#BC1018"/><Stop offset="0.7" stopColor="#79090F"/><Stop offset="1" stopColor="#3A0407"/></LinearGradient>
   <RadialGradient id={id+'redLight'}><Stop stopColor="#FA181D" stopOpacity="0.48"/><Stop offset="0.45" stopColor="#A70710" stopOpacity="0.19"/><Stop offset="1" stopColor="#49030A" stopOpacity="0"/></RadialGradient>
   <RadialGradient id={id+'glow'} cx="50%" cy="50%" rx="50%" ry="50%"><Stop stopColor="#FFE5A0" stopOpacity="0.8"/><Stop offset="0.18" stopColor="#FFB72F" stopOpacity="0.3"/><Stop offset="1" stopColor="#FFAA24" stopOpacity="0"/></RadialGradient>
  </Defs>
  <Path d={outline} stroke="#FFC24B" strokeWidth="12" opacity={0.08*brightness}/><Path d={outline} stroke="#FFC24B" strokeWidth="7" opacity={0.2*brightness}/>
  <Path d={outline} fill={`url(#${id}body)`} stroke={`url(#${id}gold)`} strokeWidth="5.5"/>
  <G clipPath={`url(#${id}clip)`}>
   <Ellipse cx="258" cy="185" rx="117" ry="170" fill={`url(#${id}redLight)`}/>
   {['translate(119 30) skewX(-20) scale(0.88 0.82)','translate(223 94) skewX(-19) scale(1.03 1.3)'].map(transform=><G key={transform} transform={transform}>
    <Path d={brandX} fill={`url(#${id}xFace)`} stroke="#200204" strokeWidth="1"/>
    <Path d="M0 0 H27 L48 31 L73 0 H100 M64 49 L100 100 H72 L49 68 L26 100 H0" stroke="#E62A2C" strokeOpacity="0.65" strokeWidth="0.45"/>
    <Path d="M73 1 H97 L61 49 L96 98 H73 L48 64 L23 98 H3 L38 49 L3 1 H25" stroke="#6C0B10" strokeOpacity="0.55" strokeWidth="0.6"/>
   </G>)}
   <Path d={etchedTexture} stroke="#BB6E54" strokeWidth="0.35" opacity={CARD_TEXTURE_OPACITY_PERCENT/100}/>
   <Path d="M213 172 L269 103 H313 M267 225 L291 196 L323 251 M134 46 L187 24 M201 53 L251 28 M232 84 L283 46" stroke="#D64D36" strokeWidth="0.45" opacity="0.55"/>
   <Path d="M126 38 L233 72 M141 32 L283 68 M185 22 L307 87 M190 61 L243 26 M221 81 L276 43" stroke="#C29453" strokeWidth="0.45" opacity="0.3"/>
   <Path d="M27 161 L106 86 M29 205 L166 67 M31 271 L228 93 M31 380 L316 188 M31 422 L324 238 M41 506 L285 346 M116 561 L308 412" stroke="#AF5D37" strokeWidth="0.6" opacity="0.24"/>
   <Path d="M63 489 L149 425 L122 505 L234 431 L175 545 L319 445" stroke="#F22A29" strokeWidth="0.7" opacity="0.22"/>
   <Path d="M17 550 L180 587 L343 550 L180 607 Z" fill={`url(#${id}red)`}/>
  </G>
  <Path d={outline} transform="translate(2 3) scale(0.989 0.989)" stroke="#633507" strokeWidth="1.2"/>
  <Path d={outline} transform="translate(5 7) scale(0.972 0.975)" stroke="#FFF0B4" strokeWidth="1.1" opacity={brightness}/>
  <Path d={outline} transform="translate(9 13) scale(0.95 0.951)" stroke={`url(#${id}gold)`} strokeWidth="2.5"/>
  <Path d="M11 108 L6 123 V298 L11 284 M349 108 L354 123 V298 L349 284 M9 341 L3 350 V501 M351 341 L357 350 V501" stroke="#F22D27" strokeWidth="1.5"/>
  <Path d="M8 124 V196 M352 124 V196 M9 434 V509 Q9 535 57 552 M351 434 V509 Q351 535 303 552" stroke={`url(#${id}gold)`} strokeWidth="2"/>
  <Path d="M180 422 V453 M180 480 V537 M51 454 H155 M205 454 H309 M51 489 H155 M205 489 H309" stroke="#D32B20" strokeWidth="0.7"/>
  <Ellipse cx="180" cy="598" rx="42" ry="12" fill={`url(#${id}glow)`}/><Ellipse cx="17" cy="262" rx="9" ry="33" fill={`url(#${id}glow)`}/><Ellipse cx="344" cy="428" rx="9" ry="30" fill={`url(#${id}glow)`}/>
  <Path d="M11 262 H23 M17 252 V272" stroke="#FFF5CD" strokeWidth="1.1"/>
 </Svg>;
}
