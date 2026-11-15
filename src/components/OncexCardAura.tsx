import { useId } from 'react';
import Svg, { Defs, Ellipse, G, Path, RadialGradient, Stop } from 'react-native-svg';
// Luz ambiental exterior: 0 = oculta; 100 = máxima.
const CARD_AURA_INTENSITY_PERCENT=55;
export default function OncexCardAura(){
 const id=useId().replace(/:/g,'');
 return <Svg width="100%" height="100%" viewBox="0 0 600 1000" preserveAspectRatio="none" aria-hidden>
  <Defs>
   <RadialGradient id={id+'white'}><Stop stopColor="#FFFFFF" stopOpacity="0.9"/><Stop offset="0.14" stopColor="#BDDFFF" stopOpacity="0.5"/><Stop offset="1" stopColor="#86A4C4" stopOpacity="0"/></RadialGradient>
   <RadialGradient id={id+'gold'}><Stop stopColor="#EAAF45" stopOpacity="0.35"/><Stop offset="1" stopColor="#A36326" stopOpacity="0"/></RadialGradient>
  </Defs>
  <G opacity={CARD_AURA_INTENSITY_PERCENT/100}>
   <Ellipse cx="28" cy="160" rx="130" ry="100" fill={`url(#${id}white)`}/><Ellipse cx="572" cy="150" rx="130" ry="100" fill={`url(#${id}white)`}/>
   <Ellipse cx="300" cy="817" rx="210" ry="64" fill={`url(#${id}gold)`}/>
   <Path d="M0 100 L115 0 M0 130 L150 0 M465 1000 L600 846 M493 1000 L600 882" stroke="#D71B25" strokeWidth="2"/>
   <Path d="M0 125 L98 0 H116 L0 151 Z M475 1000 L600 867 V899 L508 1000 Z" fill="#8A0711" opacity="0.7"/>
  </G>
 </Svg>;
}
