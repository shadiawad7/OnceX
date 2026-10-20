import SportCardBackground from './SportCardBackground';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { client } from '../lib/hierarchy';
import { adminError } from '../lib/admin';
import { teamPlans, type TeamPlan } from '../data/teamPlans';
import Button from './Button';
import { colors } from '../theme/colors';
const priceLabel=(code:TeamPlan)=>`${(teamPlans[code].monthlyPriceCentsPerPlayer/100).toFixed(2).replace('.',',')} € / jugador / mes`;
export default function TeamPlanPanel({id,editable}:{id:string;editable:boolean}) {
 const [selected,setSelected]=useState<TeamPlan>('basic'),[saved,setSaved]=useState<TeamPlan|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [pending,setPending]=useState<TeamPlan|null>(null);
 const [periodEnd,setPeriodEnd]=useState('');
 const [confirmation,setConfirmation]=useState<{from:TeamPlan;to:TeamPlan;periodEnd:string}|null>(null);
 const renewalLabel=periodEnd?new Date(periodEnd).toLocaleString('es-ES',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'}):'';
 useEffect(()=>{let active=true;void (async()=>{
  const result=await client().rpc('get_team_plan',{target_team:id});
  if(!active)return;
  if(result.error){setError(['PGRST202','42883'].includes(result.error.code)?'Activa primero la migración de cambios de plan programados en Supabase.':adminError(result.error));return;}
  const data=result.data as {current_plan:TeamPlan;pending_plan:TeamPlan|null;period_ends_at:string};
  setSaved(data.current_plan);setPending(data.pending_plan);setSelected(data.pending_plan??data.current_plan);setPeriodEnd(data.period_ends_at);
 })().catch(()=>{if(active)setError('No se ha podido cargar el plan del equipo.');});return()=>{active=false;};},[id]);
 async function save(){
  if(busy||!confirmation||saved===null||!editable)return;
  const change=confirmation;setBusy(true);setError('');setNotice('');
  try{
   const result=await client().rpc('schedule_team_plan',{target_team:id,new_plan:change.to,expected_plan:change.from,expected_period_end:change.periodEnd,confirmed:true});
   if(result.error)throw new Error(result.error.message);
   const data=result.data as {current_plan:TeamPlan;pending_plan:TeamPlan|null;period_ends_at:string};
   setSaved(data.current_plan);setPending(data.pending_plan);setSelected(data.pending_plan??data.current_plan);setPeriodEnd(data.period_ends_at);setConfirmation(null);
   setNotice(data.pending_plan?`Cambio a ${data.pending_plan.toUpperCase()} programado para la renovación. El plan actual se mantiene hasta entonces.`:'Cambio pendiente cancelado. Se mantiene el plan actual.');
  }catch(reason){setError(reason instanceof Error?reason.message:adminError(reason));}
  finally{setBusy(false);}
 }
 return <ScrollView contentContainerStyle={styles.content}>
  <Text style={styles.title}>Plan del equipo</Text><Text style={styles.text}>Todos los jugadores de este equipo comparten el plan asignado.</Text>{saved&&<Text style={styles.text}>Plan actual: {teamPlans[saved].label}. Próxima renovación: {renewalLabel}.</Text>}{pending&&<Text style={styles.price}>Cambio programado: {teamPlans[pending].label}, a partir del {renewalLabel}.</Text>}
  {saved===null&&!error&&<ActivityIndicator color={colors.red}/>}
  {(['basic','pro'] as const).map(code=><Pressable key={code} accessibilityRole="radio" accessibilityState={{checked:selected===code,disabled:!editable||busy||saved===null||!!confirmation}} disabled={!editable||busy||saved===null||!!confirmation} onPress={()=>{setSelected(code);setNotice('');setError('');}} style={[styles.card,selected===code&&{borderColor:code==='pro'?colors.redBright:'#42AFFF'}]}>
   <SportCardBackground/><View style={styles.row}><Text style={styles.plan}>{teamPlans[code].label}</Text><Text style={styles.status}>{saved===code?'ACTUAL':pending===code?'PROGRAMADO':selected===code?'SELECCIONADO':''}</Text></View>
   <Text style={styles.price}>{priceLabel(code)}</Text>
   {teamPlans[code].features.map(feature=><Text key={feature} style={styles.feature}>✓ {feature}</Text>)}
  </Pressable>)}
  {!!notice&&<Text accessibilityLiveRegion="polite" style={styles.text}>{notice}</Text>}
  {confirmation?<View style={styles.confirmation}>
   <Text style={styles.title}>¿Confirmas el cambio programado?</Text>
   <Text style={styles.text}>Plan actual: {teamPlans[confirmation.from].label} · {priceLabel(confirmation.from)}</Text>
   <Text style={styles.price}>Nuevo plan: {teamPlans[confirmation.to].label} · {priceLabel(confirmation.to)}</Text>
   <Text style={styles.text}>{confirmation.to===saved?'Se cancelará el cambio pendiente y se mantendrá el plan actual.':`El plan actual y su tarifa se mantienen hasta el ${renewalLabel}. En esa fecha empezarán las reglas y la tarifa del nuevo plan para todos los jugadores del equipo.`}</Text>
   {teamPlans[confirmation.to].features.map(feature=><Text key={feature} style={styles.feature}>✓ {feature}</Text>)}
   <Text style={styles.text}>No se realizará ningún cargo automático desde la app.</Text>
   <Button label={busy?'GUARDANDO…':'SÍ, CONFIRMAR PROGRAMACIÓN'} disabled={busy} onPress={()=>{void save();}}/>
   <Button secondary label="CANCELAR" disabled={busy} onPress={()=>setConfirmation(null)}/>
  </View>:editable&&<Button label={pending&&selected===saved?'CANCELAR CAMBIO PENDIENTE':'PROGRAMAR CAMBIO DE PLAN'} disabled={busy||saved===null||!periodEnd||selected===(pending??saved)} onPress={()=>{if(saved)setConfirmation({from:saved,to:selected,periodEnd});}}/>}
  {!!error&&<Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
 </ScrollView>;
}
const styles=StyleSheet.create({price:{color:'#FFFFFF',fontSize:14,fontWeight:'800',marginBottom:14,lineHeight:22},confirmation:{padding:18,borderWidth:1,borderColor:colors.redBright,borderRadius:18,backgroundColor:'rgba(12,5,9,0.9)',marginTop:20},content:{padding:22,paddingBottom:40},title:{color:colors.white,fontSize:24,fontWeight:'900'},text:{color:colors.muted,lineHeight:22,marginVertical:14},card:{borderTopLeftRadius:28,borderTopRightRadius:6,borderBottomRightRadius:28,borderBottomLeftRadius:6,overflow:'hidden',backgroundColor:'transparent',borderWidth:1,borderColor:'rgba(255,80,102,0.2)',padding:18,marginTop:16},row:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:12},plan:{color:colors.white,fontSize:24,fontWeight:'900'},status:{color:colors.muted,fontSize:10,fontWeight:'800'},feature:{color:colors.white,fontSize:12,lineHeight:23},error:{color:colors.redBright,marginTop:16}});
