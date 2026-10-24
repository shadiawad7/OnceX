import { useId } from 'react';
import Svg, { ClipPath, Defs, G, LinearGradient, Path, Stop } from 'react-native-svg';

// ONCEX shield: raised centre, curved shoulders and a tapered lower edge.
const outline='M180 10 C164 27 148 35 131 22 H115 C83 30 54 68 14 83 V509 C14 531 43 537 75 548 L145 574 Q167 583 180 594 Q193 583 215 574 L285 548 C317 537 346 531 346 509 V83 C306 68 277 30 245 22 H229 C212 35 196 27 180 10 Z';
export default function OncexCardFrame(){
 const id=useId().replace(/:/g,'');
 return <Svg width="100%" height="100%" viewBox="0 0 360 600" fill="none" aria-hidden={true}>
  <Defs>
   <ClipPath id={id+'clip'}><Path d={outline}/></ClipPath>
   <LinearGradient id={id+'body'} x1="36" y1="80" x2="300" y2="580" gradientUnits="userSpaceOnUse"><Stop stopColor="#A62A49"/><Stop offset="0.28" stopColor="#5D1830"/><Stop offset="0.62" stopColor="#271522"/><Stop offset="1" stopColor="#110E18"/></LinearGradient>
   <LinearGradient id={id+'edge'} x1="10" y1="0" x2="350" y2="600" gradientUnits="userSpaceOnUse"><Stop stopColor="#FFB1C0"/><Stop offset="0.32" stopColor="#F23E68"/><Stop offset="0.7" stopColor="#9D1D3D"/><Stop offset="1" stopColor="#FF6F90"/></LinearGradient>
   <LinearGradient id={id+'rail'} x1="0" y1="0" x2="0" y2="1"><Stop stopColor="#080D17" stopOpacity=".32"/><Stop offset=".8" stopColor="#080D17" stopOpacity=".32"/><Stop offset="1" stopColor="#080D17" stopOpacity="0"/></LinearGradient>
  </Defs>
  <Path d={outline} fill={'url(#'+id+'body)'} stroke={'url(#'+id+'edge)'} strokeWidth="3"/>
  <Path d={outline} transform="translate(10 12) scale(.944 .955)" stroke="#FFD9E2" strokeOpacity="0.8" strokeWidth="1.4"/>
  <G clipPath={'url(#'+id+'clip)'}>
   <Path d="M40 0 H116 V402 H40 Z" fill={'url(#'+id+'rail)'}/>
   <Path d="M44 422 H316 M180 437 V536" stroke="#F7BFCD" strokeOpacity="0.65" strokeWidth="1"/>
   <Path d="M159 555 H201" stroke="#FF416B" strokeWidth="2"/>
  </G>
 </Svg>;
}
