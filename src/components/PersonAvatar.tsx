import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

export default function PersonAvatar({ url, name }: { url?: string; name: string }) {
  const [failed, setFailed] = useState(false);
  return <View style={styles.circle}>{url && !failed
    ? <Image source={{uri:url}} accessibilityLabel={`Foto de ${name}`} style={styles.image} resizeMode="cover" onError={()=>setFailed(true)} />
    : <MaterialCommunityIcons name="account" size={30} color="#F2E5E8" />}</View>;
}
const styles=StyleSheet.create({circle:{width:52,height:52,borderRadius:26,overflow:'hidden',borderWidth:1,borderColor:'rgba(255,80,102,0.45)',backgroundColor:'rgba(30,10,17,0.6)',alignItems:'center',justifyContent:'center'},image:{width:'100%',height:'100%'}});
