import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SelectionList from './SelectionList';
import { birthDateInput, parseBirthDate } from '../lib/playerDetails';
import { colors } from '../theme/colors';
const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
export default function BirthDateCalendar({ value, onChange, disabled }: { value: string; onChange: (value: string) => void; disabled: boolean }) {
 const today = new Date();
 const [open,setOpen] = useState(false);
 const [year,setYear] = useState(today.getFullYear()-16);
 const [month,setMonth] = useState(today.getMonth());
 const offset = (new Date(year,month,1).getDay()+6)%7;
 const days = new Date(year,month+1,0).getDate();
 function show() { const parsed = parseBirthDate(value); if(parsed) { const [y,m] = parsed.split('-').map(Number); setYear(y);setMonth(m-1); } setOpen(true); }
 return <><Pressable accessibilityRole="button" accessibilityLabel="Elegir fecha de nacimiento" disabled={disabled} onPress={show} style={styles.control}><Text style={styles.text}>{value || 'Seleccionar fecha'} ▦</Text></Pressable><Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}><SafeAreaView style={styles.safe}><Text style={styles.title}>Fecha de nacimiento</Text><SelectionList label="Año" value={String(year)} options={Array.from({length:today.getFullYear()-1899},(_,i)=>({value:String(today.getFullYear()-i),label:String(today.getFullYear()-i)}))} onChange={v => setYear(Number(v))}/><SelectionList label="Mes" value={String(month)} options={months.map((label,i)=>({value:String(i),label}))} onChange={v => setMonth(Number(v))}/><View style={styles.grid}>{['L','M','X','J','V','S','D'].map((day,i)=><View key={i} style={styles.cell}><Text style={styles.text}>{day}</Text></View>)}{Array.from({length:offset+days},(_,i)=> { const day=i-offset+1; const future=new Date(year,month,day)>today; const date=`${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`; return day<1 ? <View key={i} style={styles.cell}/> : <Pressable key={i} accessibilityRole="button" accessibilityLabel={birthDateInput(date)} accessibilityState={{disabled:future,selected:value===birthDateInput(date)}} disabled={future} style={[styles.cell,value===birthDateInput(date)&&styles.selected,future&&styles.disabled]} onPress={()=> {onChange(birthDateInput(date));setOpen(false);}}><Text style={styles.text}>{day}</Text></Pressable>; })}</View><Pressable accessibilityRole="button" style={styles.control} onPress={()=> {onChange('');setOpen(false);}}><Text style={styles.text}>Borrar fecha</Text></Pressable><Pressable accessibilityRole="button" style={styles.control} onPress={()=>setOpen(false)}><Text style={styles.text}>Cancelar</Text></Pressable></SafeAreaView></Modal></>;
}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:colors.background,padding:22},title:{color:colors.white,fontSize:24,fontWeight:'800',marginBottom:20},control:{backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:10,padding:14,marginVertical:8},text:{color:colors.white},grid:{flexDirection:'row',flexWrap:'wrap',marginVertical:20},cell:{width:'14.2857%',minHeight:48,alignItems:'center',justifyContent:'center',borderRadius:8},selected:{backgroundColor:colors.red},disabled:{opacity:0.3}});
