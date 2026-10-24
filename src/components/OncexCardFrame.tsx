import { useId } from 'react';
import Svg, { ClipPath, Defs, G, LinearGradient, Path, Stop } from 'react-native-svg';

// ONCEX shield: raised centre, curved shoulders and a tapered lower edge.
const outline='M180 10 C164 27 148 35 131 22 H115 C83 30 54 68 14 83 V509 C14 531 43 537 75 548 L145 574 Q167 583 180 594 Q193 583 215 574 L285 548 C317 537 346 531 346 509 V83 C306 68 277 30 245 22 H229 C212 35 196 27 180 10 Z';
export default function OncexCardFrame(){
 const id=useId().replace(/:/g,'');
 return <Svg width="100%" height="100%" viewBox="0 0 360 600" fill="none" aria-hidden={true}>
  <Defs>
   <ClipPath id={id+'clip'}><Path d={outline}/></ClipPath>
   <LinearGradient id={id+'body'} x1="36" y1="80" x2="300" y2="580" gradientUnits="userSpaceOnUse"><Stop stopColor="#742037"/><Stop offset="0.45" stopColor="#361522"/><Stop offset="1" stopColor="#100F18"/></LinearGradient>
   <LinearGradient id={id+'edge'} x1="10" y1="0" x2="350" y2="600" gradientUnits="userSpaceOnUse"><Stop stopColor="#FF95AC"/><Stop offset="0.45" stopColor="#D82B50"/><Stop offset="1" stopColor="#FF6F90"/></LinearGradient>
  </Defs>
  <Path d={outline} fill={'url(#'+id+'body)'} stroke={'url(#'+id+'edge)'} strokeWidth="3"/>
  <Path d={outline} transform="translate(10 12) scale(.944 .955)" stroke="#FFD9E2" strokeOpacity="0.8" strokeWidth="1.4"/>
  <G clipPath={'url(#'+id+'clip)'}>
   <Path d="M80 135 L142 135 L283 396 H221 Z M235 135 H297 L157 396 H95 Z" fill="#F98BA5" opacity="0.07"/>
   <Path d="M-15 223 C67 83 270 69 376 223 M-15 241 C67 101 270 87 376 241 M-10 380 C82 479 277 488 370 378" stroke="#E77892" strokeOpacity="0.13" strokeWidth="3"/>
   <Path d="M44 422 H316 M180 437 V536" stroke="#F7BFCD" strokeOpacity="0.65" strokeWidth="1"/>
   <Path d="M159 555 H201" stroke="#FF416B" strokeWidth="2"/>
  </G>
 </Svg>;
}
