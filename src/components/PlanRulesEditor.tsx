import { useState } from 'react';
import { StyleSheet, Text, TextInput, View, Pressable } from 'react-native';
import Button from './Button';
import { colors } from '../theme/colors';

export default function PlanRulesEditor({value,onChange,disabled}:{value:string[];onChange:(rules:string[])=>void;disabled:boolean}) {
 const [error,setError]=useState('');
 function add(){
  if(disabled)return;
  if(!value[value.length-1]?.trim()){setError('Escribe la regla antes de añadir otra.');return;}
  setError('');onChange([...value,'']);
 }
 return <View style={styles.container}>
  <Text style={styles.title}>Reglas del plan</Text>
  {value.map((rule,index)=><View key={index} style={styles.rule}>
   <View style={styles.row}><Text style={styles.label}>Regla número {index+1}</Text>{value.length>1&&<Pressable accessibilityRole="button" accessibilityLabel={`Quitar regla ${index+1}`} disabled={disabled} onPress={()=>{onChange(value.filter((_,i)=>i!==index));setError('');}} style={styles.remove}><Text style={styles.removeText}>Quitar</Text></Pressable>}</View>
   <TextInput accessibilityLabel={`Regla número ${index+1}`} placeholder="Escribe lo que incluye el plan" placeholderTextColor={colors.muted} value={rule} editable={!disabled} multiline maxLength={500} onChangeText={text=>{onChange(value.map((item,i)=>i===index?text.replace(/[\r\n]+/g,' '):item));setError('');}} style={styles.input}/>
  </View>)}
  {!!error&&<Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
  <Button secondary label="AÑADIR REGLA" onPress={add} disabled={disabled}/>
 </View>;
}
const styles=StyleSheet.create({container:{marginVertical:16},title:{color:colors.white,fontSize:17,fontWeight:'800',marginBottom:12},rule:{marginBottom:12},row:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:10},label:{color:'#E2E2E6',fontSize:13,fontWeight:'700'},input:{backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:10,color:colors.white,padding:14,minHeight:58,textAlignVertical:'top'},remove:{padding:12,minHeight:44,justifyContent:'center'},removeText:{color:colors.redBright,fontSize:12,fontWeight:'700'},error:{color:'#FFB4B9',marginBottom:10}});
