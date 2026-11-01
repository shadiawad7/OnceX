import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import Button from './Button';
import SelectionList from './SelectionList';
import { reviewMatchParticipation, type ConcededGoalTime, type MatchChange } from '../lib/matchParticipation';
import type { MatchPlayer } from '../lib/matches';
import { colors } from '../theme/colors';
export default function MatchParticipationReview({players,duration,opponentGoals,disabled,verified,onInvalidate,onVerified}:{players:MatchPlayer[];duration:number;opponentGoals:number;disabled:boolean;verified:boolean;onInvalidate:()=>void;onVerified:(players:MatchPlayer[])=>void}){
 const [changes,setChanges]=useState<MatchChange[]>([]),[times,setTimes]=useState<Record<number,ConcededGoalTime>>({}),[error,setError]=useState('');
 function changeAt(index:number,patch:Partial<MatchChange>){onInvalidate();setError('');setChanges(changes.map((change,i)=>i===index?{...change,...patch}:change));}
 function goalAt(index:number,patch:Partial<ConcededGoalTime>){onInvalidate();setError('');const previous=times[index]??{minute:null,order:null};setTimes({...times,[index]:{...previous,...patch}});}
 const options=players.map(player=>({value:player.slot_id,label:`${player.player_name} · ${player.starter?'Titular':'Suplente'}`}));
 return <View style={styles.panel}>
  <Text style={styles.title}>Cambios y goles encajados</Text>
  <Text style={styles.hint}>Relaciona cada jugador que sale con quien entra. Si sale en el minuto 60, el sustituto juega 30. También puedes indicar una salida sin entrada por expulsión o lesión.</Text>
  {changes.map((change,index)=><View key={index} style={styles.change}>
   <Text style={styles.label}>Cambio {index+1} · Sale</Text><SelectionList label="Jugador que sale" value={change.outgoing} options={options} disabled={disabled} onChange={value=>changeAt(index,{outgoing:value})}/>
   <Text style={styles.label}>Entra</Text><SelectionList label="Jugador que entra" value={change.incoming===null?'__none__':change.incoming} options={[{value:'__none__',label:'Sin entrada · expulsión o lesión'},...options.filter(option=>option.value!==change.outgoing)]} disabled={disabled} onChange={value=>changeAt(index,{incoming:value==='__none__'?null:value})}/>
   <Text style={styles.label}>Minuto del cambio</Text><TextInput accessibilityLabel={`Minuto del cambio ${index+1}`} style={styles.input} keyboardType="number-pad" maxLength={3} editable={!disabled} value={change.minute===null?'':String(change.minute)} onChangeText={text=>{if(/^\d*$/.test(text))changeAt(index,{minute:text===''?null:Number(text)});}}/>
   <Button secondary label="QUITAR CAMBIO" disabled={disabled} onPress={()=>{onInvalidate();setError('');setChanges(changes.filter((_,i)=>i!==index));}}/>
  </View>)}
  <Button secondary label="AÑADIR CAMBIO" disabled={disabled} onPress={()=>{onInvalidate();setError('');setChanges([...changes,{outgoing:'',incoming:'',minute:null}]);}}/>
  {opponentGoals>0&&<Text style={styles.hint}>Verifica el minuto de cada gol recibido. Solo contará para quienes estaban en el campo en ese momento. Si coincide con un cambio, indica qué ocurrió primero.</Text>}
  {Array.from({length:opponentGoals},(_,index)=><View key={index} style={styles.change}>
   <Text style={styles.label}>Gol encajado {index+1} · Minuto</Text><TextInput accessibilityLabel={`Minuto del gol encajado ${index+1}`} style={styles.input} keyboardType="number-pad" maxLength={3} editable={!disabled} value={times[index]?.minute==null?'':String(times[index].minute)} onChangeText={text=>{if(/^\d*$/.test(text))goalAt(index,{minute:text===''?null:Number(text),order:null});}}/>
   {times[index]?.minute!=null&&changes.some(change=>change.minute===times[index].minute)&&<SelectionList label="Orden del gol y el cambio" value={times[index]?.order??''} options={[{value:'before',label:'Gol antes del cambio'},{value:'after',label:'Gol después del cambio'}]} disabled={disabled} onChange={value=>goalAt(index,{order:value as 'before'|'after'})}/>}
  </View>)}
  {!!error&&<Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
  <Button label={verified?'GOLES Y CAMBIOS VERIFICADOS':'VERIFICAR GOLES Y CAMBIOS'} disabled={disabled} onPress={()=>{try{const result=reviewMatchParticipation(players,duration,opponentGoals,changes,Array.from({length:opponentGoals},(_,i)=>times[i]??{minute:null,order:null}));onVerified(result);setError('');}catch(reason){setError(reason instanceof Error?reason.message:'Revisa los goles y cambios.');}}}/>
  <Text style={styles.hint}>{verified?'Minutos y goles encajados actualizados. Revisa el resumen antes de confirmar el acta.':'Esta revisión todavía no guarda estadísticas oficiales.'}</Text>
 </View>;
}
const styles=StyleSheet.create({panel:{padding:16,borderRadius:18,borderWidth:1,borderColor:'#6D2940',backgroundColor:'#170F16',gap:12,marginVertical:16},title:{color:colors.white,fontSize:17,fontWeight:'800'},hint:{color:colors.muted,fontSize:12,lineHeight:19},label:{color:colors.white,fontSize:13,fontWeight:'700'},change:{padding:12,borderWidth:1,borderColor:colors.border,borderRadius:12,gap:8},input:{backgroundColor:'#090C10',borderWidth:1,borderColor:colors.border,borderRadius:9,padding:12,color:colors.white},error:{color:'#FF8FA5',fontSize:13,lineHeight:19}});
