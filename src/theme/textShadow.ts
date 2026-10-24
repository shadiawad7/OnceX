import { Platform, type TextStyle } from 'react-native';

// RN Web uses CSS textShadow; native platforms retain their native text style.
export function textShadow(color:string,radius:number,x=0,y=0):TextStyle {
 if(Platform.OS==='web')return {textShadow:`${x}px ${y}px ${radius}px ${color}`} as TextStyle;
 return {textShadowColor:color,textShadowRadius:radius,textShadowOffset:{width:x,height:y}};
}
