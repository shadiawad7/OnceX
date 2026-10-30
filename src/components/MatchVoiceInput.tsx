import { useEffect, useRef, useState } from 'react';
import { AppState, Platform, Text, View } from 'react-native';
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { File } from 'expo-file-system';
import Button from './Button';
import { interpretMatchRecording, type MatchDraft, MatchDraftRequestError } from '../lib/aiMatchDraft';
import type { HierarchyItem } from '../lib/hierarchy';
import { colors } from '../theme/colors';

export default function MatchVoiceInput({teamId,roster,disabled,onResult,onError,onBusy}:{teamId:string;roster:HierarchyItem[];disabled:boolean;onResult:(draft:MatchDraft,transcript:string)=>void;onError:(message:string,transcript?:string)=>void;onBusy:(busy:boolean)=>void}){
 const recorder=useAudioRecorder(RecordingPresets.HIGH_QUALITY),state=useAudioRecorderState(recorder);
 const [working,setWorking]=useState(false),[hasRecording,setHasRecording]=useState(false);
 const active=useRef(true),locked=useRef(false);
 useEffect(()=>{
  active.current=true;
  const subscription=AppState.addEventListener('change',next=>{if(next!=='active'&&recorder.isRecording)void recorder.stop().catch(()=>{});});
  return()=>{active.current=false;subscription.remove();void setAudioModeAsync({allowsRecording:false}).catch(()=>{});};
 },[recorder]);
 async function record(){
  if(locked.current)return;locked.current=true;setWorking(true);onBusy(true);let started=false;
  try{
   const permission=await AudioModule.requestRecordingPermissionsAsync();
   if(!permission.granted)throw new Error('Permite el acceso al micrófono o utiliza «Escribir partido».');
   await setAudioModeAsync({allowsRecording:true,playsInSilentMode:true});
   await recorder.prepareToRecordAsync();recorder.record({forDuration:120});setHasRecording(true);started=true;
  }catch(error){onError(error instanceof Error?error.message:'No se ha podido iniciar la grabación.');}
  finally{locked.current=false;if(active.current){setWorking(false);if(!started)onBusy(false);}}
 }
 async function generate(){
  if(locked.current)return;locked.current=true;setWorking(true);onBusy(true);let uri:string|null=null;
  try{
   if(recorder.isRecording)await recorder.stop();await setAudioModeAsync({allowsRecording:false});uri=recorder.uri;
   if(!uri)throw new Error('No hay grabación. Vuelve a dictar o escribe el partido.');
   const result=await interpretMatchRecording(teamId,uri,roster);
   if(active.current)onResult(result.draft,result.transcript);
  }catch(error){if(active.current)onError(error instanceof Error?error.message:'No se ha podido procesar el audio. Puedes escribir el partido.',error instanceof MatchDraftRequestError?error.transcript:undefined);}
  finally{
   if(uri){try{if(Platform.OS==='web')URL.revokeObjectURL(uri);else new File(uri).delete();}catch{ /* Local cache cleanup is best effort. */ }}
   locked.current=false;if(active.current){setWorking(false);setHasRecording(false);onBusy(false);}
  }
 }
 async function discard(){
  if(locked.current)return;locked.current=true;
  try{
   if(recorder.isRecording)await recorder.stop();await setAudioModeAsync({allowsRecording:false});
   const uri=recorder.uri;if(uri){if(Platform.OS==='web')URL.revokeObjectURL(uri);else new File(uri).delete();}
  }catch{ /* Discarding must still unlock manual entry. */ }
  finally{locked.current=false;if(active.current){setHasRecording(false);onBusy(false);}}
 }
 return <View>
  <Button secondary label={working?'PROCESANDO…':state.isRecording?'TERMINAR Y GENERAR BORRADOR':hasRecording?'GENERAR DESDE GRABACIÓN':'🎙 DICTAR PARTIDO'} disabled={working||disabled} onPress={()=>{void (state.isRecording||hasRecording?generate():record());}}/>
  <Text style={{color:colors.muted,fontSize:12,marginTop:8}}>{state.isRecording?`Grabando · ${Math.floor(state.durationMillis/1000)} s / 120 s`:'Una grabación → transcripción → borrador. Revisa después todos los datos.'}</Text>
  {hasRecording&&!working&&<Button secondary label="DESCARTAR GRABACIÓN" onPress={()=>{void discard();}} disabled={disabled}/>}
 </View>;
}
