import { useRef, useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { decode } from 'base64-arraybuffer';
import type { ProfilePhoto } from '../lib/profilePhotos';

/** Crop the original locally into PNG so transparent pixels stay transparent. */
export default function PhotoCropModal({photo,aspect,onConfirm,onCancel,onError}:{photo:ProfilePhoto;aspect:[number,number];onConfirm:(photo:ProfilePhoto)=>void;onCancel:()=>void;onError:(message:string)=>void}) {
 const [size,setSize]=useState<{width:number;height:number}>();
 const [zoom,setZoom]=useState(1);
 const [offset,setOffset]=useState({x:0,y:0});
 const [saving,setSaving]=useState(false);
 const width=Math.min(260,350*aspect[0]/aspect[1]),height=width*aspect[1]/aspect[0];
 const ratio=size?Math.max(width/size.width,height/size.height)*zoom:1;
 const imageWidth=size?size.width*ratio:width,imageHeight=size?size.height*ratio:height;
 const bound=(x:number,y:number)=>({x:Math.max(-(imageWidth-width)/2,Math.min((imageWidth-width)/2,x)),y:Math.max(-(imageHeight-height)/2,Math.min((imageHeight-height)/2,y))});
 const drag=useRef({x:0,y:0,offsetX:0,offsetY:0});
 async function confirm(){
  if(!size||saving)return;
  setSaving(true);
  try{
   const cropWidth=Math.min(size.width,Math.round(width/ratio)),cropHeight=Math.min(size.height,Math.round(height/ratio));
   const context=ImageManipulator.manipulate(photo.uri);
   context.crop({originX:Math.max(0,Math.min(size.width-cropWidth,Math.round(((imageWidth-width)/2-offset.x)/ratio))),originY:Math.max(0,Math.min(size.height-cropHeight,Math.round(((imageHeight-height)/2-offset.y)/ratio))),width:cropWidth,height:cropHeight});
   const image=await context.renderAsync();
   const result=await image.saveAsync({format:SaveFormat.PNG,base64:true});
   if(!result.base64)throw new Error('No se ha podido recortar la foto.');
   if(decode(result.base64).byteLength>5*1024*1024)throw new Error('El recorte ocupa más de 5 MB. Acerca la imagen o elige una foto más pequeña.');
   onConfirm({uri:result.uri,base64:result.base64,contentType:'image/png'});
  }catch(error){onError(error instanceof Error?error.message:'No se ha podido recortar la foto.');}finally{setSaving(false);}
 }
 return <Modal transparent animationType="fade" onRequestClose={()=>{if(!saving)onCancel();}}><View style={styles.backdrop}><View style={styles.sheet} accessibilityViewIsModal>
  <Text style={styles.title}>Ajustar foto</Text><Text style={styles.hint}>Arrastra la imagen para encuadrarla.</Text>
  <View style={[styles.crop,{width,height}]} onStartShouldSetResponder={()=>!saving} onMoveShouldSetResponder={()=>!saving} onResponderGrant={event=>{drag.current={x:event.nativeEvent.pageX,y:event.nativeEvent.pageY,offsetX:offset.x,offsetY:offset.y};}} onResponderMove={event=>{setOffset(bound(drag.current.offsetX+event.nativeEvent.pageX-drag.current.x,drag.current.offsetY+event.nativeEvent.pageY-drag.current.y));}}><Image source={{uri:photo.uri}} resizeMode="stretch" onLoad={event=>{const source=event.nativeEvent.source;if(source.width&&source.height)setSize({width:source.width,height:source.height});}} style={{position:'absolute',width:imageWidth,height:imageHeight,left:(width-imageWidth)/2+offset.x,top:(height-imageHeight)/2+offset.y}}/></View>
  <View style={styles.zoom}><Pressable accessibilityRole="button" accessibilityLabel="Alejar foto" disabled={saving||zoom<=1} onPress={()=>{setZoom(value=>Math.max(1,value-0.25));setOffset({x:0,y:0});}} style={styles.control}><Text style={styles.controlText}>−</Text></Pressable><Text style={styles.hint}>{Math.round(zoom*100)} %</Text><Pressable accessibilityRole="button" accessibilityLabel="Acercar foto" disabled={saving||zoom>=4} onPress={()=>setZoom(value=>Math.min(4,value+0.25))} style={styles.control}><Text style={styles.controlText}>＋</Text></Pressable></View>
  <View style={styles.actions}><Pressable accessibilityRole="button" disabled={saving} onPress={onCancel} style={styles.button}><Text style={styles.buttonText}>CANCELAR</Text></Pressable><Pressable accessibilityRole="button" disabled={!size||saving} onPress={()=>{void confirm();}} style={[styles.button,styles.confirm]}><Text style={styles.buttonText}>{saving?'GUARDANDO…':'USAR FOTO'}</Text></Pressable></View>
 </View></View></Modal>;
}
const styles=StyleSheet.create({backdrop:{flex:1,justifyContent:'center',alignItems:'center',backgroundColor:'rgba(0,0,0,0.9)',padding:16},sheet:{width:'100%',maxWidth:380,backgroundColor:'#17131B',padding:20,borderRadius:20,alignItems:'center'},title:{fontSize:20,fontWeight:'800',color:'#FFFFFF'},hint:{color:'#C9BEC5',fontSize:12,marginVertical:12},crop:{overflow:'hidden',backgroundColor:'#29232C',borderWidth:1,borderColor:'#78606C'},zoom:{flexDirection:'row',alignItems:'center',gap:24,marginTop:12},control:{width:44,height:44,alignItems:'center',justifyContent:'center'},controlText:{color:'#FFFFFF',fontSize:26},actions:{flexDirection:'row',gap:10,marginTop:16,width:'100%'},button:{flex:1,minHeight:48,alignItems:'center',justifyContent:'center',borderRadius:10,borderWidth:1,borderColor:'#66515C'},confirm:{backgroundColor:'#BD2346',borderColor:'#BD2346'},buttonText:{color:'#FFFFFF',fontSize:11,fontWeight:'800'}});
