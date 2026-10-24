import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import SelectionList from './SelectionList';
import { colors } from '../theme/colors';
const months=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
function selectedDate(value:string):Date|null{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
 const [year,month,day]=value.split('-').map(Number),date=new Date(year,month-1,day);
 return date.getFullYear()===year&&date.getMonth()===month-1&&date.getDate()===day?date:null;
}
export default function MatchDateCalendar({value,onChange,disabled=false}:{value:string;onChange:(value:string)=>void;disabled?:boolean}){
 const today=new Date();
 const [open,setOpen]=useState(false),[year,setYear]=useState(today.getFullYear()),[month,setMonth]=useState(today.getMonth());
 const selected=selectedDate(value);
 const firstDay=(new Date(year,month,1).getDay()+6)%7;
 const days=new Date(year,month+1,0).getDate();
 function show(){const start=selected??new Date();setYear(start.getFullYear());setMonth(start.getMonth());setOpen(true);}
 function move(offset:number){const next=new Date(year,month+offset,1);setYear(next.getFullYear());setMonth(next.getMonth());}
 const latestYear=Math.max(today.getFullYear()+2,year),earliestYear=Math.min(today.getFullYear()-100,year);
 return <>
  <Pressable accessibilityRole="button" accessibilityLabel="Elegir fecha del partido" accessibilityState={{disabled}} disabled={disabled} onPress={show} style={styles.control}><MaterialCommunityIcons name="calendar-month-outline" size={22} color={colors.redBright}/><Text style={styles.controlText}>{selected?selected.toLocaleDateString('es-ES',{day:'2-digit',month:'long',year:'numeric'}):'Elegir fecha del partido'}</Text></Pressable>
  <Modal visible={open} animationType="slide" onRequestClose={()=>setOpen(false)}>
   <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.content}>
    <Text style={styles.title}>Fecha del partido</Text>
    <SelectionList label="Año del partido" value={String(year)} options={Array.from({length:latestYear-earliestYear+1},(_,i)=>({value:String(latestYear-i),label:String(latestYear-i)}))} onChange={v=>setYear(Number(v))}/>
    <SelectionList label="Mes del partido" value={String(month)} options={months.map((label,i)=>({value:String(i),label}))} onChange={v=>setMonth(Number(v))}/>
    <View style={styles.monthHeader}><Pressable accessibilityRole="button" accessibilityLabel="Mes anterior" onPress={()=>move(-1)} style={styles.arrow}><MaterialCommunityIcons name="chevron-left" size={28} color={colors.white}/></Pressable><Text style={styles.monthTitle}>{months[month]} {year}</Text><Pressable accessibilityRole="button" accessibilityLabel="Mes siguiente" onPress={()=>move(1)} style={styles.arrow}><MaterialCommunityIcons name="chevron-right" size={28} color={colors.white}/></Pressable></View>
    <View style={styles.grid}>
     {['L','M','X','J','V','S','D'].map((label,i)=><View key={`week-${i}`} style={styles.cell}><Text style={styles.weekday}>{label}</Text></View>)}
     {Array.from({length:firstDay+days},(_,i)=>{
      const day=i-firstDay+1;if(day<1)return <View key={`blank-${i}`} style={styles.cell}/>;
      const iso=`${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      return <Pressable key={iso} accessibilityRole="button" accessibilityLabel={`${day} de ${months[month]} de ${year}`} accessibilityState={{selected:value===iso}} style={[styles.cell,value===iso&&styles.selected]} onPress={()=>{onChange(iso);setOpen(false);}}><Text style={styles.day}>{day}</Text></Pressable>;
     })}
    </View>
    <Pressable accessibilityRole="button" onPress={()=>setOpen(false)} style={styles.cancel}><Text style={styles.day}>Cancelar</Text></Pressable>
   </ScrollView></SafeAreaView>
  </Modal>
 </>;
}
const styles=StyleSheet.create({control:{flexDirection:'row',alignItems:'center',gap:12,borderWidth:1,borderColor:'#59404B',borderRadius:10,padding:14,minHeight:50,backgroundColor:'rgba(8,8,12,0.8)'},controlText:{color:colors.white,flex:1,fontSize:14},safe:{flex:1,backgroundColor:colors.background},content:{padding:22,paddingBottom:32},title:{color:colors.white,fontSize:24,fontWeight:'900',marginBottom:18},monthHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginTop:16},monthTitle:{color:colors.white,fontSize:17,fontWeight:'800'},arrow:{width:48,height:48,alignItems:'center',justifyContent:'center'},grid:{flexDirection:'row',flexWrap:'wrap',marginBottom:20},cell:{width:'14.2857%',minHeight:48,alignItems:'center',justifyContent:'center',borderRadius:10},selected:{backgroundColor:colors.red},weekday:{color:'#CFBCC4',fontSize:12,fontWeight:'800'},day:{color:colors.white,fontSize:15},cancel:{alignItems:'center',padding:16,borderWidth:1,borderColor:colors.border,borderRadius:12}});
