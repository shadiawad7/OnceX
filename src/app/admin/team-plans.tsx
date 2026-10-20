import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { adminClient, adminError } from '../../lib/admin';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import AdminShell from '../../components/AdminShell';
import SportCardBackground from '../../components/SportCardBackground';
import Button from '../../components/Button';
import { teamPlans } from '../../data/teamPlans';
import { colors } from '../../theme/colors';
export default function AvailableTeamPlans(){
 const [catalog,setCatalog]=useState<{id:string;name:string;description:string;monthly_price_cents:number;active:boolean}[]>([]);
 const [error,setError]=useState('');
 useFocusEffect(useCallback(()=>{let active=true;void (async()=>{const result=await adminClient().from('plans').select('id,name,description,monthly_price_cents,active').order('name');if(!active)return;if(result.error)setError(adminError(result.error));else{setCatalog(result.data);setError('');}})().catch(reason=>{if(active)setError(adminError(reason));});return()=>{active=false;};},[]));
 return <AdminShell fallback="/admin"><ScrollView contentContainerStyle={styles.content}><Text style={styles.title}>Planes para equipos</Text><Text style={styles.text}>Cada equipo tiene su propio plan. Se aplica a todos sus jugadores.</Text>{(['basic','pro'] as const).map(code=><View key={code} style={styles.card}><SportCardBackground/><Text style={styles.plan}>{teamPlans[code].label}</Text>{teamPlans[code].features.map(feature=><Text key={feature} style={styles.feature}>✓ {feature}</Text>)}</View>)}<Text style={styles.text}>Para asignar un plan: Usuarios → Club → Equipo → Plan. Las funciones de partidos, voz y evaluación se incorporarán conforme se activen en la plataforma.</Text><Text style={styles.title}>Catálogo de planes</Text>{catalog.map(plan=><View key={plan.id} style={styles.card}><SportCardBackground/><Text style={styles.plan}>{plan.name}</Text>{plan.description.split('\n').map(rule=>rule.trim()).filter(Boolean).map((rule,index)=><Text key={index} style={styles.feature}>✓ {rule}</Text>)}<Text style={styles.feature}>{(plan.monthly_price_cents/100).toFixed(2)} €/mes · {plan.active?'Activo':'Inactivo'}</Text></View>)}{!!error&&<Text accessibilityRole="alert" style={styles.text}>{error}</Text>}<Button label="CREAR NUEVO PLAN" onPress={()=>router.push('/admin/create-plan')}/></ScrollView></AdminShell>}
const styles=StyleSheet.create({content:{padding:22,paddingBottom:40},title:{color:colors.white,fontSize:27,fontWeight:'900'},text:{color:'#DDD4D7',lineHeight:22,marginVertical:16},card:{padding:22,borderTopLeftRadius:28,borderBottomRightRadius:28,borderTopRightRadius:6,borderBottomLeftRadius:6,overflow:'hidden',marginBottom:16},plan:{color:colors.white,fontSize:27,fontWeight:'900',marginBottom:12},feature:{color:colors.white,fontSize:13,lineHeight:25}});
