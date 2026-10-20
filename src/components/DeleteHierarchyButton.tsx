import { useState } from 'react';
import { router, type Href } from 'expo-router';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import Button from './Button';
import { client } from '../lib/hierarchy';
import { colors } from '../theme/colors';

type Kind = 'club' | 'team' | 'coach' | 'player';
const labels = {club:'club',team:'equipo',coach:'entrenador',player:'jugador'};
export default function DeleteHierarchyButton({kind,id,fallback}:{kind:Kind;id:string;fallback:Href}) {
 const [confirm,setConfirm]=useState(false),[typed,setTyped]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function remove(){
  if(busy||typed!=='ELIMINAR')return;
  setBusy(true);setError('');
  try{
   const result=await client().rpc('admin_delete_hierarchy',{target_kind:kind,target_id:id});
   if(result.error){
    if(['PGRST202','42883'].includes(result.error.code))throw new Error('Primero ejecuta la migración 202610170001_admin_hierarchy_delete.sql en Supabase.');
    throw new Error(result.error.message);
   }
   router.replace(fallback);
  }catch(reason){setError(reason instanceof Error?reason.message:'No se ha podido eliminar.');}
  finally{setBusy(false);}
 }
 return <View style={styles.container}>{!confirm?<Button secondary label={`ELIMINAR ${labels[kind].toUpperCase()}`} onPress={()=>setConfirm(true)}/>:<>
  <Text style={styles.text}>{kind==='club'||kind==='team'?'Debe estar vacío. Se eliminarán sus asignaciones y no podrás deshacerlo.':'Se eliminará la cuenta y su ficha de todos los equipos. Esta acción no se puede deshacer.'} Escribe ELIMINAR para confirmar.</Text>
  <TextInput accessibilityLabel="Escribe ELIMINAR para confirmar" value={typed} onChangeText={setTyped} autoCapitalize="characters" autoCorrect={false} editable={!busy} style={styles.input}/>
  <Button label={busy?'ELIMINANDO…':'CONFIRMAR ELIMINACIÓN'} disabled={busy||typed!=='ELIMINAR'} onPress={()=>{void remove();}}/>
  <Button label="CANCELAR" secondary disabled={busy} onPress={()=>{setConfirm(false);setTyped('');setError('');}}/>
 </>}{!!error&&<Text accessibilityRole="alert" style={styles.error}>{error}</Text>}</View>;
}
const styles=StyleSheet.create({container:{marginVertical:18},text:{color:'#EADDE1',lineHeight:21,marginBottom:12},input:{borderWidth:1,borderColor:colors.redBright,borderRadius:10,padding:12,color:colors.white,backgroundColor:'rgba(0,0,0,0.4)',marginBottom:10},error:{color:'#FFB4B9',lineHeight:21,marginTop:12}});
