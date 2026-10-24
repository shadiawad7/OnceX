import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
export default function InputStepGuard({message,onAttempt,children}:{message:string;onAttempt:(message:string)=>void;children:ReactNode}){
 const locked=!!message;
 return <View style={styles.container}><View pointerEvents={locked?'none':'auto'} accessibilityElementsHidden={locked} importantForAccessibility={locked?'no-hide-descendants':'auto'} style={locked?styles.locked:undefined}>{children}</View>{locked&&<Pressable accessibilityRole="button" accessibilityLabel={message} onPress={()=>onAttempt(message)} style={StyleSheet.absoluteFill}/>}</View>;
}
const styles=StyleSheet.create({container:{position:'relative'},locked:{opacity:0.6}});
