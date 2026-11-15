import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { normalizeFederationName } from '../lib/federationCatalog';
import type { FederationFilter } from '../lib/federationFilters';
export default function FederationFilterField({label,filter,disabled,onChange}:{label:string;filter:FederationFilter;disabled:boolean;onChange:(value:string)=>void}){
 const [open,setOpen]=useState(false),[search,setSearch]=useState('');
 return <View>
  <Text style={styles.label}>{label}</Text>
  <Pressable accessibilityRole="button" accessibilityLabel={`Elegir ${label}`} accessibilityState={{disabled}} disabled={disabled} onPress={()=>{setSearch('');setOpen(true);}} style={[styles.control,disabled&&styles.disabled]}><Text style={styles.value}>{filter.options.find(item=>item.value===filter.value)?.label||'Seleccionar'}</Text><MaterialCommunityIcons name="chevron-down" size={22} color="#E5CAD4"/></Pressable>
  <Modal visible={open} animationType="slide" onRequestClose={()=>setOpen(false)}><SafeAreaView style={styles.safe}>
   <View style={styles.header}><Text style={styles.title}>{label}</Text><Pressable accessibilityRole="button" onPress={()=>setOpen(false)} style={styles.close}><Text style={styles.closeText}>Cerrar</Text></Pressable></View>
   <TextInput accessibilityLabel={`Buscar ${label}`} value={search} onChangeText={setSearch} placeholder="Buscar" placeholderTextColor="#B5A6AF" style={styles.search}/>
   <FlatList keyboardShouldPersistTaps="handled" data={filter.options.filter(item=>normalizeFederationName(item.label).includes(normalizeFederationName(search)))} keyExtractor={item=>item.value} ListEmptyComponent={<Text style={styles.label}>Sin coincidencias.</Text>} renderItem={({item})=><Pressable accessibilityRole="button" accessibilityState={{selected:item.value===filter.value}} onPress={()=>{onChange(item.value);setOpen(false);}} style={[styles.control,item.value===filter.value&&styles.selected]}><Text style={styles.value}>{item.label}</Text>{item.value===filter.value&&<Text style={styles.closeText}>✓</Text>}</Pressable>}/>
  </SafeAreaView></Modal>
 </View>;
}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:'#0B0C12',padding:16},header:{flexDirection:'row',alignItems:'center',gap:8},title:{color:'#FFF',fontSize:20,fontWeight:'800',flex:1},close:{minHeight:44,padding:10,justifyContent:'center'},closeText:{color:'#FF97AD',fontWeight:'800'},label:{color:'#CBB8C3',fontSize:13,marginTop:14,marginBottom:7},control:{minHeight:52,padding:14,borderWidth:1,borderColor:'#5D3447',backgroundColor:'#1C111B',borderRadius:12,flexDirection:'row',alignItems:'center',gap:10,marginBottom:7},value:{flex:1,color:'#FFF',fontSize:14,fontWeight:'600'},disabled:{opacity:0.45},selected:{borderColor:'#F34266',backgroundColor:'#3C1222'},search:{color:'#FFF',padding:14,borderWidth:1,borderColor:'#52303F',borderRadius:10,marginVertical:14}});
