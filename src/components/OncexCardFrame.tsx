import { useId } from 'react';
import Svg, { ClipPath, Defs, FeColorMatrix, Filter, G, Image as SvgImage, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';

// Intensidad de la textura roja y dorada del fondo: 0–100.
const CARD_TEXTURE_OPACITY_PERCENT = 65;
// Brillo del dorado interior: 100 = actual; 50 = más tenue; 0 = muy oscuro.
const CARD_GOLD_BRIGHTNESS_PERCENT = 100;
// Dorado de las piezas que sobresalen por arriba: 0 = ocultas; 100 = máxima intensidad.
const CARD_GOLD_FINS_OPACITY_PERCENT = 82;
// Oscurece el fondo detrás del jugador para que la foto destaque: 0–100.
const PORTRAIT_BACKGROUND_SHADE_PERCENT = 55;
const CARD_BORDER_COLOR = '#FF2438';
const outline='M180 10 C164 27 148 35 131 22 H115 C83 30 54 68 14 83 V509 C14 531 43 537 75 548 L145 574 Q167 583 180 594 Q193 583 215 574 L285 548 C317 537 346 531 346 509 V83 C306 68 277 30 245 22 H229 C212 35 196 27 180 10 Z';

export default function OncexCardFrame(){
 const id=useId().replace(/:/g,'');
 const goldBrightness=Math.min(100,Math.max(0,CARD_GOLD_BRIGHTNESS_PERCENT))/55;
 return <Svg width="100%" height="100%" viewBox="0 0 360 600" fill="none" aria-hidden>
  <Defs>
   <ClipPath id={id+'clip'}><Path d={outline}/></ClipPath>
   {/* Reduce warm highlights while retaining the predominantly red texture. */}
   <Filter id={id+'goldBrightness'} x="0%" y="0%" width="100%" height="100%">
    <FeColorMatrix type="matrix" values={`1 ${goldBrightness-1} 0 0 0 0 ${goldBrightness} 0 0 0 0 0 ${goldBrightness} 0 0 0 0 0 1 0`}/>
   </Filter>
   <LinearGradient id={id+'body'} x1="0" y1="0" x2="0" y2="1">
    <Stop stopColor="#3B0B15"/><Stop offset="0.4" stopColor="#22060C"/><Stop offset="1" stopColor="#120204"/>
   </LinearGradient>
   <LinearGradient id={id+'shade'} x1="0" y1="0" x2="0" y2="1">
    <Stop offset="0.42" stopColor="#140205" stopOpacity="0"/><Stop offset="0.7" stopColor="#140205" stopOpacity="0.18"/><Stop offset="1" stopColor="#0C0103" stopOpacity="0.62"/>
   </LinearGradient>
   <LinearGradient id={id+'rail'} x1="0" y1="0" x2="0" y2="1">
    <Stop stopColor="#230309" stopOpacity="0.35"/><Stop offset="0.7" stopColor="#230309" stopOpacity="0.24"/><Stop offset="1" stopColor="#230309" stopOpacity="0"/>
   </LinearGradient>
   <LinearGradient id={id+'rim'} x1="0" y1="0" x2="0" y2="1">
    <Stop stopColor="#FFF1B8"/><Stop offset="0.25" stopColor="#BDA264"/><Stop offset="0.5" stopColor="#F2D98C"/><Stop offset="0.75" stopColor="#8F794B"/><Stop offset="1" stopColor="#E8D596"/>
   </LinearGradient>
   <LinearGradient id={id+'brandRim'} x1="0" y1="0" x2="1" y2="1">
    <Stop stopColor="#F4F5F7"/><Stop offset="0.22" stopColor="#737982"/><Stop offset="0.43" stopColor="#E8EAED"/><Stop offset="0.65" stopColor="#454A52"/><Stop offset="1" stopColor="#D7DBE0"/>
   </LinearGradient>
   <RadialGradient id={id+'portraitShade'} cx="225" cy="200" rx="160" ry="210" gradientUnits="userSpaceOnUse">
    <Stop offset="0" stopColor="#100407" stopOpacity={Math.min(100,Math.max(0,PORTRAIT_BACKGROUND_SHADE_PERCENT))/100}/>
    <Stop offset="0.6" stopColor="#100407" stopOpacity={Math.min(100,Math.max(0,PORTRAIT_BACKGROUND_SHADE_PERCENT))/160}/>
    <Stop offset="1" stopColor="#100407" stopOpacity="0"/>
   </RadialGradient>
  </Defs>
  <Path d={outline} stroke="#FF2438" strokeWidth="12" strokeOpacity="0.1"/>
  <Path d={outline} stroke="#FF2438" strokeWidth="7" strokeOpacity="0.35"/>
  <Path d={outline} fill={'url(#'+id+'body)'} stroke="#34040C" strokeWidth="8"/>
  <G clipPath={'url(#'+id+'clip)'}>
   <SvgImage href={require('../../assets/card-season-texture-red.png')} width="360" height="600" preserveAspectRatio="xMidYMid slice" opacity={Math.min(100,Math.max(0,CARD_TEXTURE_OPACITY_PERCENT))/100} filter={goldBrightness<1?`url(#${id}goldBrightness)`:undefined}/>
   <Path d="M0 0 H360 V600 H0 Z" fill={'url(#'+id+'portraitShade)'}/>
   <Path d="M0 0 H360 V600 H0 Z" fill={'url(#'+id+'shade)'}/>
   <Path d="M39 77 L115 48 V361 L39 384 Z" fill={'url(#'+id+'rail)'}/>

  </G>
  {/* Brushed silver and scarlet echo ONCEX's existing metallic logo. */}
  <Path d={outline} stroke={'url(#'+id+'brandRim)'} strokeWidth="3"/>
  <Path d={outline} transform="translate(7 8) scale(.961 .973)" stroke="#E5091B" strokeWidth="1.3"/>
  <Path d="M7 96 V502 Q7 531 70 553 M353 96 V502 Q353 531 290 553" stroke="#FF4055" strokeWidth="1" opacity="0.8"/>
  <Path d="M54 414 H306 M180 432 V476 M180 494 V530 M155 539 H205" stroke={CARD_BORDER_COLOR} strokeWidth="0.8" opacity="0.8"/>
  <Path d="M175 479 L185 491 M185 479 L175 491" stroke="#FF2438" strokeWidth="1.5"/>
  {/* Metallic fins extend past the shoulder of the shield, behind the player. */}
  <G stroke="#D6C38B" strokeWidth="0.8" opacity={Math.min(100,Math.max(0,CARD_GOLD_FINS_OPACITY_PERCENT))/90}>
   <Path d="M250 84 L255 12 L264 8 L266 67 L282 41 L278 85 L255 132 Z" fill={'url(#'+id+'rim)'}/>
   <Path d="M255 12 L264 8 L266 67 L255 86 Z" fill="#FFF0AD"/>
   <Path d="M266 67 L282 41 L278 85 L255 132 L259 91 Z" fill="#685B3F"/>
   <Path d="M307 137 L327 68 L350 75 L339 109 L322 117 L308 173 L290 193 Z" fill={'url(#'+id+'rim)'}/>
   <Path d="M327 68 L350 75 L338 81 L319 78 Z" fill="#EAD698"/>
   <Path d="M319 78 L338 81 L328 106 L307 137 Z" fill="#441321"/>
  </G>
 </Svg>;
}
