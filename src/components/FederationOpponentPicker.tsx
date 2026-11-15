import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import ClubBadge from './ClubBadge';
import { federationOpponents, normalizeFederationName, type FederationGroup } from '../lib/federationCatalog';
export default function FederationOpponentPicker({catalog,value,disabled,onChange}:{catalog:FederationGroup|null;value:string;disabled:boolean;onChange:(name:string)=>void}){
 const [list,setList]=useState(false),[search,setSearch]=useState(''),[manual,setManual]=useState(false);
 const rivals=federationOpponents(catalog),selected=rivals.find(team=>normalizeFederationName(team.name)===normalizeFederationName(value));
 const showManual=manual||!catalog||!!value&&!selected;
 return <View style={styles.root}>
  {showManual?<TextInput accessibilityLabel="Rival" value={value} onChangeText={onChange} maxLength={120} editable={!disabled} placeholder="Nombre del rival" placeholderTextColor="#A69AA2" style={styles.input}/>:<Pressable accessibilityRole="button" accessibilityLabel="Elegir rival del grupo" disabled={disabled} onPress={()=>{setList(true);setSearch('');}} style={styles.control}>
   {selected&&<ClubBadge key={selected.id} url={selected.badgeUrl} name={selected.name} size={40}/>}
   <Text style={styles.name}>{value||'Seleccionar rival'}</Text><MaterialCommunityIcons name="chevron-down" size={24} color="#DBCCD4"/>
  </Pressable>}
  <View style={styles.actions}>
   {catalog&&showManual&&<Pressable accessibilityRole="button" disabled={disabled} onPress={()=>{setList(true);setSearch('');}} style={styles.link}><Text style={styles.linkText}>Elegir del grupo</Text></Pressable>}
  </View>
  {catalog&&<Text style={styles.group}>{catalog.competitionName} · {catalog.groupName} · {catalog.seasonCode}</Text>}
  <Modal visible={list} animationType="slide" onRequestClose={()=>setList(false)}><SafeAreaView style={styles.safe}>
   <View style={styles.heading}><Text style={styles.title}>Elegir rival</Text><Pressable accessibilityRole="button" onPress={()=>setList(false)} style={styles.link}><Text style={styles.linkText}>Cerrar</Text></Pressable></View>
   <TextInput accessibilityLabel="Buscar rival" value={search} onChangeText={setSearch} placeholder="Buscar equipo" placeholderTextColor="#A69AA2" style={[styles.input,{margin:14}]}/>
   <FlatList data={rivals.filter(team=>normalizeFederationName(team.name).includes(normalizeFederationName(search)))} keyExtractor={team=>team.id} ListEmptyComponent={<Text style={styles.group}>No hay equipos que coincidan.</Text>} renderItem={({item})=><Pressable accessibilityRole="button" accessibilityState={{selected:item.id===selected?.id,disabled}} disabled={disabled} onPress={()=>{onChange(item.name);setManual(false);setList(false);}} style={styles.control}><ClubBadge key={item.badgeUrl??item.id} url={item.badgeUrl} name={item.name} size={44}/><Text style={styles.name}>{item.name}</Text>{item.id===selected?.id&&<Text style={styles.linkText}>✓</Text>}</Pressable>}/>
   <Pressable accessibilityRole="button" disabled={disabled} onPress={()=>{setManual(true);setList(false);}} style={[styles.link,{padding:20}]}><Text style={styles.linkText}>Escribir otro rival / amistoso</Text></Pressable>
  </SafeAreaView></Modal>
 </View>;
}
const styles=StyleSheet.create({root:{gap:4},input:{backgroundColor:'#0D0C12',borderColor:'#59404B',borderWidth:1,borderRadius:10,padding:12,color:'#FFF',minHeight:44},control:{minHeight:58,padding:12,flexDirection:'row',alignItems:'center',gap:10,borderBottomWidth:1,borderColor:'#3F2B36',backgroundColor:'#151019',borderRadius:10},name:{flex:1,color:'#FFF',fontSize:14,fontWeight:'700'},actions:{flexDirection:'row',flexWrap:'wrap',gap:10},link:{minHeight:44,justifyContent:'center',paddingHorizontal:4},linkText:{color:'#FF91A7',fontSize:12,fontWeight:'800'},group:{color:'#B5A7AF',fontSize:11,lineHeight:17,paddingHorizontal:4},safe:{flex:1,backgroundColor:'#090B10'},heading:{padding:14,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},title:{color:'#FFF',fontSize:20,fontWeight:'800'}});
