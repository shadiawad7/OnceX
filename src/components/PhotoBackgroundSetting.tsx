import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { client } from '../lib/client';
import { colors } from '../theme/colors';

async function readSetting():Promise<boolean>{
 const result=await client().from('photo_processing_settings').select('background_removal_enabled').eq('id',true).single();
 if(result.error||typeof result.data?.background_removal_enabled!=='boolean')throw new Error();
 return result.data.background_removal_enabled;
}

export default function PhotoBackgroundSetting(){
 const [enabled,setEnabled]=useState<boolean|null>(null);
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState<string|null>(null);
 const busy=useRef(false);
 async function load(){
  try{
   setEnabled(await readSetting());
  }catch{setError('No se ha podido cargar la configuración de fotos.');}
  finally{setLoading(false);}
 }
 useEffect(()=>{
  let active=true;
  void readSetting().then(value=>{if(active)setEnabled(value);}).catch(()=>{if(active)setError('No se ha podido cargar la configuración de fotos.');}).finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[]);
 async function change(value:boolean){
  if(busy.current||enabled===null)return;
  busy.current=true;setSaving(true);setError(null);
  try{
   const result=await client().from('photo_processing_settings').update({background_removal_enabled:value}).eq('id',true).select('background_removal_enabled').single();
   if(result.error||typeof result.data?.background_removal_enabled!=='boolean')throw new Error();
   setEnabled(result.data.background_removal_enabled);
  }catch{setError('No se ha podido guardar el cambio. Inténtalo de nuevo.');}
  finally{busy.current=false;setSaving(false);}
 }
 return <View style={styles.panel}>
  <Text style={styles.title}>Fondo de las fotos</Text>
  <View style={styles.row}><Text style={styles.label}>Eliminar fondo automáticamente</Text>
   {loading?<ActivityIndicator color={colors.redBright}/>:<Switch accessibilityLabel="Eliminar fondo automáticamente con remove.bg" value={enabled??false} disabled={saving||enabled===null} onValueChange={value=>void change(value)} trackColor={{false:colors.border,true:colors.red}} thumbColor={colors.white}/>}
  </View>
  <Text accessibilityLiveRegion="polite" style={styles.status}>{saving?'Guardando…':loading?'Cargando…':enabled===null?'Configuración no disponible':enabled?'Activado · remove.bg':'Desactivado · se conserva el fondo original'}</Text>
  <Text style={styles.description}>Afecta a las nuevas fotos de jugadores. Al activarlo se utiliza remove.bg y sus créditos. Los recortes ya guardados se mantienen y la foto original siempre se conserva.</Text>
  {error&&<Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
  {error&&enabled===null&&<Pressable accessibilityRole="button" onPress={()=>{setLoading(true);setError(null);void load();}} style={styles.retry}><Text style={styles.retryText}>REINTENTAR</Text></Pressable>}
 </View>;
}
const styles=StyleSheet.create({panel:{padding:20,borderRadius:18,borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface,marginTop:4},title:{color:colors.white,fontSize:20,fontWeight:'800'},row:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12,marginTop:16},label:{flex:1,color:colors.white,fontSize:14,fontWeight:'700'},status:{color:colors.redBright,fontSize:12,fontWeight:'700',marginTop:10},description:{color:'#C7CAD0',fontSize:13,lineHeight:20,marginTop:10},error:{color:'#FFB4B9',fontSize:13,lineHeight:20,marginTop:12},retry:{minHeight:48,justifyContent:'center',alignSelf:'flex-start'},retryText:{color:colors.white,fontWeight:'800',fontSize:12}});
