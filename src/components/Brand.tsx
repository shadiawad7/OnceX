import type { ImageStyle, StyleProp } from 'react-native';
import { Image, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
export default function Brand({ style }: { style?: StyleProp<ImageStyle> }) {
 const layout=StyleSheet.flatten<ImageStyle>([styles.brand,style]);
 return <View style={{width:layout.width,height:layout.height,marginVertical:layout.marginVertical,marginTop:layout.marginTop,marginBottom:layout.marginBottom,alignSelf:layout.alignSelf}}>
  <View pointerEvents="none" accessible={false} style={styles.design}>
   <LinearGradient colors={['rgba(95,15,29,0)','rgba(38,10,17,0.7)','rgba(3,4,6,0.96)','rgba(38,10,17,0.7)','rgba(95,15,29,0)']} locations={[0,0.2,0.5,0.8,1]} start={{x:0,y:0.5}} end={{x:1,y:0.5}} style={styles.plate}/>
   <View style={styles.topEdge}/><View style={styles.bottomEdge}/>
   <View style={[styles.slash,styles.leftSlash]}/><View style={[styles.slash,styles.rightSlash]}/>
  </View>
  <Image source={require('../../assets/oncex-logo.png')} accessibilityLabel="ONCEX · Fútbol, evolución y rendimiento" resizeMode="contain" style={styles.image}/>
 </View>;
}
const styles=StyleSheet.create({
 brand:{width:200,height:80,paddingVertical:0,marginVertical:20,alignSelf:'center'},
 image:{width:'100%',height:'100%'},
 design:{position:'absolute',top:'-10%',bottom:'-10%',left:'-10%',right:'-10%',transform:[{skewX:'-12deg'}]},
 plate:{position:'absolute',top:0,right:0,bottom:0,left:0,borderTopLeftRadius:22,borderTopRightRadius:8,borderBottomLeftRadius:8,borderBottomRightRadius:22,borderWidth:0,boxShadow:'0px 2px 16px rgba(133,16,36,0.18)',overflow:'hidden'},
 topEdge:{position:'absolute',top:0,left:'15%',right:'18%',height:1,backgroundColor:'rgba(154,53,68,0.22)'},
 bottomEdge:{position:'absolute',bottom:0,left:'24%',right:'12%',height:1,backgroundColor:'rgba(197,28,49,0.28)'},
 slash:{position:'absolute',width:3,top:'30%',bottom:'30%',backgroundColor:'rgba(216,18,36,0.45)',borderRadius:2},
 leftSlash:{left:5},rightSlash:{right:5}
});
