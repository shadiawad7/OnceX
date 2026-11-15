import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import Button from './Button';
import ClubBadge from './ClubBadge';
import FederationFilterField from './FederationFilterField';
import { changeFederationFilterScript, federationFilterFields, FFCV_NATIVE_FILTERS_SCRIPT, parseFederationFilters, type FederationFilterKey, type FederationFilters } from '../lib/federationFilters';
import { confirmFederationGroup, FFCV_CLASSIFICATIONS_URL, FFCV_READ_VISIBLE_GROUP_SCRIPT, isFfcvPage, parseFederationSnapshot, type FederationSnapshot } from '../lib/federationCatalog';
import type { FederationGroupBrowserProps } from './FederationGroupBrowser.types';
export default function FederationGroupBrowser({sourceUrl,season,teamName,onClose,onSave}:FederationGroupBrowserProps){
 const web=useRef<ComponentRef<typeof WebView>>(null),requested=useRef(false),timer=useRef<ReturnType<typeof setTimeout>|null>(null),loadTimer=useRef<ReturnType<typeof setTimeout>|null>(null),command=useRef(0);
 const [filters,setFilters]=useState<FederationFilters|null>(null);
 const [snapshot,setSnapshot]=useState<FederationSnapshot|null>(null),[ownTeam,setOwnTeam]=useState('');
 const [error,setError]=useState(''),[loading,setLoading]=useState(true),[reading,setReading]=useState(false),[saving,setSaving]=useState(false);
 const active=useRef(true),savingLock=useRef(false);
 useEffect(()=>{active.current=true;return()=>{active.current=false;if(timer.current)clearTimeout(timer.current);if(loadTimer.current)clearTimeout(loadTimer.current);};},[]);
 useEffect(()=>{
  if(!filters?.group.value||filters.ready)return;
  const timeout=setTimeout(()=>setError('La FFCV no ha terminado de cargar los equipos. Recarga las opciones.'),25000);
  return()=>clearTimeout(timeout);
 },[filters?.group.value,filters?.ready]);
 function changeFilter(key:FederationFilterKey,value:string){
  if(reading||saving)return;
  const next=++command.current;setError('');
  setFilters(previous=>{
   if(!previous)return previous;
   const changed={...previous,command:next,ready:false,[key]:{...previous[key],value}};
   const index=federationFilterFields.findIndex(field=>field.key===key);
   for(const field of federationFilterFields.slice(index+1))changed[field.key]={value:'',options:[]};
   return changed;
  });
  web.current?.injectJavaScript(changeFederationFilterScript(key,value,next));
 }
 function importVisible(){
  if(requested.current||loading||!filters?.ready||savingLock.current)return;
  requested.current=true;setReading(true);setError('');
  timer.current=setTimeout(()=>{requested.current=false;setReading(false);setError('No se han podido cargar los equipos. Recarga las opciones.');},10000);
  web.current?.injectJavaScript(FFCV_READ_VISIBLE_GROUP_SCRIPT);
 }
 async function save(){
  if(!snapshot||savingLock.current)return;savingLock.current=true;setSaving(true);setError('');
  try{await onSave(confirmFederationGroup(snapshot,ownTeam,season));if(active.current)onClose();}
  catch(reason){if(active.current)setError(reason instanceof Error?reason.message:'No se ha podido vincular la competición al equipo.');}
  finally{savingLock.current=false;if(active.current)setSaving(false);}
 }
 return <Modal visible animationType="slide" onRequestClose={()=>{if(!saving)onClose();}}><SafeAreaView style={styles.safe}>
  <View style={styles.header}><View style={{flex:1}}><Text style={styles.title}>{snapshot?'Tu equipo en el grupo':'Competición FFCV'}</Text>{snapshot&&<Text style={styles.hint}>{snapshot.competitionName} · {snapshot.groupName}</Text>}</View><Pressable accessibilityRole="button" accessibilityLabel="Cerrar FFCV" disabled={saving} onPress={onClose} style={styles.close}><Text style={styles.closeText}>Cerrar</Text></Pressable></View>
  {snapshot?<>
   <Text style={styles.teamPrompt}>Selecciona {teamName||'tu equipo'}</Text>
   <FlatList data={snapshot.teams} keyExtractor={team=>team.id} renderItem={({item})=><Pressable accessibilityRole="radio" accessibilityState={{checked:ownTeam===item.id,disabled:saving}} disabled={saving} onPress={()=>setOwnTeam(item.id)} style={[styles.teamRow,ownTeam===item.id&&styles.selected]}><ClubBadge key={item.badgeUrl??item.id} url={item.badgeUrl} name={item.name} size={42}/><Text style={styles.teamName}>{item.name}</Text>{ownTeam===item.id&&<Text style={styles.closeText}>✓</Text>}</Pressable>}/>
  </>:<ScrollView contentContainerStyle={styles.form}>
   {(loading||!filters?.season.options.length)&&!error&&<View style={styles.loading}><ActivityIndicator color="#FF3456"/><Text style={styles.hint}>Cargando competiciones…</Text></View>}
   {federationFilterFields.map(field=><FederationFilterField key={field.key} label={field.label} filter={filters?.[field.key]??{value:'',options:[]}} disabled={loading||reading||!filters?.[field.key].options.length} onChange={value=>changeFilter(field.key,value)}/>)}
   {!!filters?.group.value&&!filters.ready&&!error&&<Text style={styles.hint}>Cargando equipos del grupo…</Text>}
  </ScrollView>}
  {/* The public website supplies its own options; navigation stays inside this noninteractive view. */}
  <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.dataSource}>
   <WebView ref={web} style={{flex:1}} source={{uri:sourceUrl&&isFfcvPage(sourceUrl)?sourceUrl:FFCV_CLASSIFICATIONS_URL}} incognito javaScriptCanOpenWindowsAutomatically={false} setSupportMultipleWindows onOpenWindow={()=>undefined} mixedContentMode="never" originWhitelist={['*']} onShouldStartLoadWithRequest={request=>isFfcvPage(request.url)} onLoadStart={()=>{
    command.current=0;setFilters(null);setLoading(true);setError('');if(loadTimer.current)clearTimeout(loadTimer.current);
    loadTimer.current=setTimeout(()=>{setLoading(false);setError('No se han podido cargar las competiciones de la FFCV. Reintenta.');},30000);
   }} onLoadEnd={()=>{setLoading(false);web.current?.injectJavaScript(FFCV_NATIVE_FILTERS_SCRIPT);}} onError={()=>{setLoading(false);setError('No se han podido cargar las competiciones. Reintenta.');}} onHttpError={event=>{if(isFfcvPage(event.nativeEvent.url)&&['/','/competiciones/'].includes(new URL(event.nativeEvent.url).pathname)){setLoading(false);setError('La FFCV no está disponible en este momento. Reintenta más tarde.');}}} onMessage={event=>{
    if(!isFfcvPage(event.nativeEvent.url))return;
    try{
     if(event.nativeEvent.data.length>500000)throw new Error('La respuesta de la competición es demasiado grande.');
     const message=JSON.parse(event.nativeEvent.data);
     if(message.type==='oncex.ffcv.filters'){
      const next=parseFederationFilters(message.data);
      if(next.command<command.current)return;
      if(next.season.options.length&&loadTimer.current)clearTimeout(loadTimer.current);
      setFilters(next);return;
     }
     if(message.type==='oncex.ffcv.filter-error')throw new Error(typeof message.message==='string'?message.message.slice(0,240):'No se ha podido cambiar el filtro.');
     if(!requested.current)return;
     requested.current=false;if(timer.current)clearTimeout(timer.current);setReading(false);
     if(message.type==='oncex.ffcv.error')throw new Error(typeof message.message==='string'?message.message.slice(0,240):'No se ha podido leer el grupo.');
     if(message.type!=='oncex.ffcv.group')throw new Error('Respuesta de grupo no reconocida.');
     const group=parseFederationSnapshot(message.data);
     if(group.seasonId!==filters?.season.value||group.competitionId!==filters?.competition.value||group.groupId!==filters?.group.value)throw new Error('Los filtros han cambiado. Espera a que carguen los equipos y vuelve a intentarlo.');
     if(season&&group.seasonCode!==season)throw new Error(`El partido es de ${season}. Selecciona esa temporada.`);
     setSnapshot(group);setOwnTeam('');setError('');
    }catch(reason){setError(reason instanceof Error?reason.message:'No se han podido cargar las opciones de la competición.');}
   }}/>
  </View>
  <View style={styles.footer}>
   {!!error&&<Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
   {snapshot?<><Button label={saving?'GUARDANDO…':'CONFIRMAR EQUIPO Y GRUPO'} disabled={!ownTeam||saving} onPress={()=>{void save();}}/><Button secondary label="CAMBIAR GRUPO" disabled={saving} onPress={()=>{setSnapshot(null);setError('');}}/></>:<><Button label={reading?'CARGANDO EQUIPOS…':'CONTINUAR · ELEGIR MI EQUIPO'} disabled={loading||reading||!filters?.ready} onPress={importVisible}/>{!!error&&<Button secondary label="RECARGAR OPCIONES" disabled={reading} onPress={()=>web.current?.reload()}/>}</>}
  </View>
 </SafeAreaView></Modal>;
}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:'#090B10'},header:{padding:14,flexDirection:'row',alignItems:'center',gap:8},title:{color:'#FFF',fontWeight:'800',fontSize:18},hint:{color:'#B9AEB5',fontSize:12,lineHeight:17,marginTop:5},close:{minWidth:50,minHeight:44,justifyContent:'center',alignItems:'center'},closeText:{color:'#FF879F',fontWeight:'800'},form:{padding:18,paddingTop:0,paddingBottom:28},dataSource:{position:'absolute',left:0,bottom:0,width:320,height:1,opacity:0.01,overflow:'hidden'},loading:{paddingVertical:16,flexDirection:'row',alignItems:'center',gap:10},footer:{padding:14,borderTopWidth:1,borderTopColor:'#3C2630',gap:8},error:{color:'#FF94A7',fontSize:12,lineHeight:18},teamPrompt:{color:'#FFF',fontSize:15,fontWeight:'700',padding:16},teamRow:{padding:12,flexDirection:'row',alignItems:'center',gap:10,borderBottomWidth:1,borderBottomColor:'#30252D'},selected:{backgroundColor:'#35111D'},teamName:{color:'#FFF',fontSize:14,flex:1}});
