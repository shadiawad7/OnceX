import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

/** Player details are optional to open; validation still checks the entire lineup. */
export default function MatchPlayerDisclosure({name,detail,attention=false,children}:{name:string;detail:string;attention?:boolean;children:ReactNode}){
 const [open,setOpen]=useState(false);
 return <View style={styles.card}>
  <Pressable accessibilityRole="button" accessibilityLabel={`Revisar ${name}`} accessibilityState={{expanded:open}} onPress={()=>setOpen(value=>!value)} style={styles.heading}>
   <View style={styles.copy}><Text style={styles.name}>{name}</Text><Text style={[styles.detail,attention&&styles.attention]}>{detail}</Text></View>
   <MaterialCommunityIcons name={open?'chevron-up':'chevron-down'} color={attention?'#FFD18A':'#CDBFC6'} size={23}/>
  </Pressable>
  {open&&<View style={styles.body}>{children}</View>}
 </View>;
}
const styles=StyleSheet.create({card:{borderWidth:1,borderColor:'#45303B',borderRadius:14,backgroundColor:'#0C0D12',marginBottom:8,overflow:'hidden'},heading:{minHeight:66,padding:13,flexDirection:'row',alignItems:'center',gap:10},copy:{flex:1},name:{color:'#FFFFFF',fontSize:14,fontWeight:'800'},detail:{color:'#BDAEB6',fontSize:12,lineHeight:18,marginTop:4},attention:{color:'#FFD18A'},body:{padding:13,paddingTop:0,gap:10}});
