import { useId } from 'react';
import Svg, { ClipPath, Defs, G, LinearGradient, Path, Stop } from 'react-native-svg';

// Original ONCEX silhouette: split shoulders, chamfered sides and a double-cut base.
const outline = 'M180 8 L214 24 L304 24 L348 66 L348 545 L324 596 L218 634 L180 658 L142 634 L36 596 L12 545 L12 66 L56 24 L146 24 Z';
export default function OncexCardFrame() {
 const prefix=useId().replace(/:/g,'');
 return <Svg pointerEvents="none" width="100%" height="100%" viewBox="0 0 360 670" fill="none">
  <Defs>
   <ClipPath id={`${prefix}clip`}><Path d={outline}/></ClipPath>
   <LinearGradient id={`${prefix}body`} x1="180" y1="0" x2="180" y2="670" gradientUnits="userSpaceOnUse"><Stop stopColor="#701424"/><Stop offset="0.38" stopColor="#17171E"/><Stop offset="0.7" stopColor="#101116"/><Stop offset="1" stopColor="#3D101C"/></LinearGradient>
   <LinearGradient id={`${prefix}edge`} x1="20" y1="20" x2="340" y2="650" gradientUnits="userSpaceOnUse"><Stop stopColor="#FFACB7"/><Stop offset="0.23" stopColor="#F82F51"/><Stop offset="0.52" stopColor="#6A1729"/><Stop offset="0.8" stopColor="#FF4866"/><Stop offset="1" stopColor="#F5B8C1"/></LinearGradient>
  </Defs>
  <Path d={outline} fill={`url(#${prefix}body)`} stroke={`url(#${prefix}edge)`} strokeWidth="3"/>
  <G clipPath={`url(#${prefix}clip)`}>
   <Path d="M-40 230 L232 -30 L294 -30 L-40 292 Z" fill="#FF3857" opacity="0.09"/>
   <Path d="M158 0 L370 176 L370 228 L116 0 Z" fill="#FF9CAC" opacity="0.06"/>
   <Path d="M-10 371 L110 445 M370 371 L250 445 M-10 383 L110 457 M370 383 L250 457" stroke="#EF3657" strokeOpacity="0.22"/>
   <Path d="M28 93 L28 539 L49 582 L146 618 M332 93 L332 539 L311 582 L214 618" stroke="#FF8298" strokeOpacity="0.38"/>
   <Path d="M112 613 L180 639 L248 613" stroke="#FF4866" strokeWidth="2"/>
  </G>
 </Svg>;
}
