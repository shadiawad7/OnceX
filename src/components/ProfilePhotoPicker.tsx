import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { chooseProfilePhoto, type ProfilePhoto } from '../lib/profilePhotos';
import { colors } from '../theme/colors';
export default function ProfilePhotoPicker({value,onChange,disabled,onError}:{value:ProfilePhoto|null;onChange:(photo:ProfilePhoto|null)=>void;disabled:boolean;onError:(message:string)=>void}) {
 const [picking,setPicking]=useState(false);
 async function choose() {setPicking(true);try {const photo=await chooseProfilePhoto();if(photo)onChange(photo);}catch(reason){onError(reason instanceof Error?reason.message:'No se ha podido seleccionar la foto.');}finally{setPicking(false);}}
 return <View style={styles.content}><Text style={styles.label}>Foto de perfil</Text><Pressable accessibilityRole="button" accessibilityLabel="Seleccionar foto de perfil" disabled={disabled||picking} onPress={()=>{void choose();}} style={styles.control}>{value ? <Image source={{uri:value.uri}} style={styles.photo}/> : <View style={styles.placeholder}><Text style={styles.icon}>＋</Text></View>}<Text style={styles.text}>{picking?'ABRIENDO FOTOS…':value?'CAMBIAR FOTO':'AÑADIR FOTO'}</Text></Pressable>{value && <Pressable disabled={disabled||picking} accessibilityRole="button" onPress={()=>onChange(null)}><Text style={styles.remove}>Quitar selección</Text></Pressable>}</View>;
}
const styles=StyleSheet.create({content:{marginVertical:16},label:{color:colors.muted,marginBottom:10},control:{alignItems:'center',padding:16,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:12},photo:{width:108,height:144,borderRadius:10},placeholder:{width:108,height:144,backgroundColor:colors.surfaceElevated,alignItems:'center',justifyContent:'center',borderRadius:10},icon:{color:colors.redBright,fontSize:36},text:{color:colors.white,fontWeight:'800',fontSize:12,marginTop:12},remove:{color:colors.muted,textAlign:'center',padding:12}});
