import { Animated } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { logoOutline } from '../data/logoOutline';
const AnimatedPath = Animated.createAnimatedComponent(Path);
export default function DrawnLogo({progress,width,height}:{progress:Animated.Value;width:number;height:number}) {
 return <Svg width={width} height={height} viewBox="0 0 1786 887" accessible={false}>
  {logoOutline.map((shape,index)=><AnimatedPath key={index} d={shape.d} fill="none" stroke={shape.color} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={[shape.length,shape.length]} strokeDashoffset={progress.interpolate({inputRange:[shape.start,shape.end],outputRange:[shape.length,0],extrapolate:'clamp'})}/>) }
 </Svg>;
}
