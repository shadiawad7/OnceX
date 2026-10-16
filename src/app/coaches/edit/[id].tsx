import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import AccountShell from '../../../components/AccountShell';
import Button from '../../../components/Button';
import { client } from '../../../lib/hierarchy';
import { adminError } from '../../../lib/admin';
import { colors } from '../../../theme/colors';
export default function EditCoachPage(){const {id,teamId}=useLocalSearchParams<{id:string;teamId:string}>();return <AccountShell allowed={['super_admin','club_admin','team_admin','coach']} fallback={{pathname:'/coaches/[id]',params:{id,teamId}}}>{()=> <Editor key={`${id}-${teamId}`} id={id} teamId={teamId}/>}</AccountShell>;}
function Editor({id,teamId}:{id:string;teamId:string}){
 const [name,setName]=useState(''),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{let active=true;void(async()=>{const permission=await client().rpc('can_edit_coach_name',{target_coach:id,target_team:teamId});if(permission.error)throw permission.error;if(!permission.data)throw new Error('No tienes permiso para editar este entrenador.');const result=await client().from('profiles').select('full_name').eq('id',id).single();if(result.error)throw result.error;if(active){setName(result.data.full_name);setReady(true);}})().catch(reason=>{if(active)setError(reason instanceof Error?reason.message:adminError(reason));});return()=>{active=false;};},[id,teamId]);
 async function save(){if(busy||!ready)return;if(!name.trim()){setError('Introduce el nombre del entrenador.');return;}setBusy(true);setError('');try{const result=await client().rpc('rename_coach',{target_coach:id,target_team:teamId,coach_name:name.trim()});if(result.error)throw result.error;if(router.canGoBack())router.back();else router.replace({pathname:'/coaches/[id]',params:{id,teamId}});}catch(reason){setError(adminError(reason));}finally{setBusy(false);}}
 return <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"><Text style={styles.title}>Editar entrenador</Text>{!ready&&!error&&<ActivityIndicator color={colors.red}/>}
{!!error&&<Text accessibilityRole="alert" style={styles.error}>{error}</Text>}{ready&&<><Text style={styles.label}>Nombre</Text><TextInput accessibilityLabel="Nombre del entrenador" value={name} onChangeText={setName} maxLength={120} editable={!busy} style={styles.input}/><Button label={busy?'GUARDANDO…':'GUARDAR NOMBRE'} disabled={busy} onPress={()=>{void save();}}/></>}</ScrollView>;
}
const styles=StyleSheet.create({content:{padding:22},title:{color:colors.white,fontSize:24,fontWeight:'800'},label:{color:colors.white,marginTop:20,marginBottom:8},input:{color:colors.white,backgroundColor:colors.surface,borderRadius:10,borderWidth:1,borderColor:colors.border,padding:14},error:{color:colors.redBright,marginTop:16}});
