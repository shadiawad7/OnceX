import { useId } from 'react';
import { colors } from '../theme/colors';
import Svg, { ClipPath, Defs, G, LinearGradient, Path, Stop } from 'react-native-svg';

// ONCEX's own shield silhouette; all decoration stays clipped inside its borders.
const outline='M180 10 C164 27 148 35 131 22 H115 C83 30 54 68 14 83 V509 C14 531 43 537 75 548 L145 574 Q167 583 180 594 Q193 583 215 574 L285 548 C317 537 346 531 346 509 V83 C306 68 277 30 245 22 H229 C212 35 196 27 180 10 Z';
export default function OncexCardFrame(){
 const id=useId().replace(/:/g,'');
 return <Svg width="100%" height="100%" viewBox="0 0 360 600" fill="none" aria-hidden={true}>
  <Defs>
   <ClipPath id={id+'clip'}><Path d={outline}/></ClipPath>
   <LinearGradient id={id+'body'} x1="40" y1="60" x2="300" y2="570" gradientUnits="userSpaceOnUse"><Stop stopColor="#9B1426"/><Stop offset="0.35" stopColor="#590D19"/><Stop offset="0.72" stopColor="#350910"/><Stop offset="1" stopColor="#160407"/></LinearGradient>
   <LinearGradient id={id+'neon'} x1="20" y1="30" x2="340" y2="570" gradientUnits="userSpaceOnUse"><Stop stopColor={colors.redBright}/><Stop offset="0.22" stopColor={colors.red}/><Stop offset="0.43" stopColor="#FF7884"/><Stop offset="0.64" stopColor={colors.redBright}/><Stop offset="0.83" stopColor={colors.red}/><Stop offset="1" stopColor="#FF7884"/></LinearGradient>
   <LinearGradient id={id+'rail'} x1="0" y1="0" x2="0" y2="1"><Stop stopColor="#160307" stopOpacity=".62"/><Stop offset=".8" stopColor="#160307" stopOpacity=".38"/><Stop offset="1" stopColor="#160307" stopOpacity="0"/></LinearGradient>
  </Defs>
  <Path d={outline} stroke={colors.red} strokeWidth="14" strokeOpacity=".1"/>
  <Path d={outline} stroke={colors.redBright} strokeWidth="9" strokeOpacity=".2"/>
  <Path d={outline} fill={'url(#'+id+'body)'} stroke={'url(#'+id+'neon)'} strokeWidth="4"/>
  <Path d={outline} transform="translate(10 12) scale(.944 .955)" stroke={'url(#'+id+'neon)'} strokeWidth="1.3"/>
  <G clipPath={'url(#'+id+'clip)'}>
   {/* Faceted red panels catch the light without masking the real club crest. */}
   <Path d="M14 83 L115 22 L68 171 L14 247 Z M346 83 L245 22 L292 171 L346 247 Z" fill="#E5091B" opacity=".28"/>
   <Path d="M14 247 L68 171 L38 400 L14 448 Z M346 247 L292 171 L322 400 L346 448 Z" fill="#870F20" opacity=".4"/>
   <Path d="M40 0 H116 V402 H40 Z" fill={'url(#'+id+'rail)'}/>
   {/* Angular neon red inlays frame the portrait rather than crossing the face. */}
   <Path d="M29 199 V110 L98 60 M331 199 V110 L262 60 M30 248 L48 222 V143 L79 114 M330 248 L312 222 V143 L281 114" stroke={'url(#'+id+'neon)'} strokeWidth="1" opacity=".65"/>
   <Path d="M27 285 L38 270 V374 L27 389 Z M333 285 L322 270 V374 L333 389 Z" fill={'url(#'+id+'neon)'} opacity=".55"/>
   <Path d="M42 406 H113 L124 414 H236 L247 406 H318 M44 422 H316 M180 437 V520" stroke={'url(#'+id+'neon)'} strokeWidth="1" opacity=".75"/>
   <Path d="M40 474 V509 L81 528 M320 474 V509 L279 528 M52 487 V503 L88 520 M308 487 V503 L272 520" stroke={'url(#'+id+'neon)'} strokeWidth="1" opacity=".65"/>
   <Path d="M132 557 H166 L180 568 L194 557 H228 M165 578 L180 587 L195 578" stroke={'url(#'+id+'neon)'} strokeWidth="1.2"/>
   <Path d="M180 528 L184 533 L180 538 L176 533 Z" fill={'url(#'+id+'neon)'}/>
  </G>
 </Svg>;
}
