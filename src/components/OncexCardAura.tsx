import { useId } from 'react';
import Svg, { Defs, Ellipse, G, Path, RadialGradient, Stop } from 'react-native-svg';

// Intensidad de los haces exteriores: 0 = ocultos; 100 = máximo.
const CARD_AURA_INTENSITY_PERCENT = 40;
// Cantidad de haces repartidos alrededor de la carta.
const CARD_AURA_RAY_COUNT = 10;
const beamColors=['#FF2438','#E5091B','#FF4055','#DCC98A','#A50921'];
const beams=Array.from({length:CARD_AURA_RAY_COUNT},(_,index)=>({
 angle:index*(360/CARD_AURA_RAY_COUNT)+(index%3)*4,
 width:index%3===0?26:12,
}));

/** Static light rays outside the card, with soft edges and a luminous core. */
export default function OncexCardAura(){
 const id=useId().replace(/:/g,'');
 return <Svg width="100%" height="100%" viewBox="0 0 600 800" preserveAspectRatio="none" aria-hidden>
  <Defs>
   <RadialGradient id={id+'halo'} cx="50%" cy="50%" rx="50%" ry="50%">
    <Stop offset="0" stopColor="#FF2438" stopOpacity="0"/>
    <Stop offset=".5" stopColor="#E5091B" stopOpacity=".16"/>
    <Stop offset=".72" stopColor="#FF4055" stopOpacity=".12"/>
    <Stop offset="1" stopColor="#FF2438" stopOpacity="0"/>
   </RadialGradient>
   {beamColors.map((color,index)=><RadialGradient key={color} id={id+'beam'+index} cx="300" cy="400" rx="450" ry="450" gradientUnits="userSpaceOnUse">
    <Stop offset="0" stopColor={color} stopOpacity="0"/>
    <Stop offset=".27" stopColor={color} stopOpacity=".3"/>
    <Stop offset=".48" stopColor={color} stopOpacity="1"/>
    <Stop offset=".75" stopColor={color} stopOpacity=".75"/>
    <Stop offset="1" stopColor={color} stopOpacity=".15"/>
   </RadialGradient>)}
  </Defs>
  <G opacity={Math.min(100,Math.max(0,CARD_AURA_INTENSITY_PERCENT))/100}>
   <Ellipse cx="300" cy="400" rx="300" ry="400" fill={`url(#${id}halo)`}/>
   {beams.map(({angle,width},index)=><G key={angle} transform={`rotate(${angle} 300 400)`}>
    {[1.8,1,.35].map((spread,layer)=><Path key={layer} d={`M300 400 L${300-width*spread} -50 Q300 -80 ${300+width*spread} -50 Z`} fill={`url(#${id}beam${index%beamColors.length})`} opacity={[.3,.65,1][layer]}/>) }
   </G>)}
  </G>
 </Svg>;
}
