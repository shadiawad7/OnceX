import { useEffect, useRef, useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { cropProfilePhoto, prepareCropSource, photoCropLayout } from '../lib/photoCrop';
import type { CropPhotoSource, ProfilePhoto } from '../lib/profilePhotos';

/** Crop the original locally into PNG so transparent pixels stay transparent. */
export default function PhotoCropModal({photo,aspect,onConfirm,onCancel,onError}:{photo:CropPhotoSource;aspect:[number,number];onConfirm:(photo:ProfilePhoto)=>void;onCancel:()=>void;onError:(message:string)=>void}) {
 const [prepared,setPrepared]=useState<CropPhotoSource>();
 const [zoom,setZoom]=useState(1);
 const [offset,setOffset]=useState({x:0,y:0});
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState('');
 const [loaded,setLoaded]=useState(false);
 const viewport=useWindowDimensions();
 const maxCropHeight=Math.max(100,Math.min(350,viewport.height-320));
 const width=Math.min(260,viewport.width-80,maxCropHeight*aspect[0]/aspect[1]),height=width*aspect[1]/aspect[0];
 const layout=photoCropLayout(prepared??{width,height},{width,height},zoom,offset);
 const imageWidth=layout.width,imageHeight=layout.height;
 useEffect(()=>{let active=true;void prepareCropSource(photo.uri).then(value=>{if(active)setPrepared(value);}).catch(()=>{if(active)setError('No se ha podido preparar la imagen. Selecciona otra foto.');});return()=>{active=false;};},[photo.uri]);
 const bound=(x:number,y:number)=>({x:Math.max(-(imageWidth-width)/2,Math.min((imageWidth-width)/2,x)),y:Math.max(-(imageHeight-height)/2,Math.min((imageHeight-height)/2,y))});
 const drag=useRef({x:0,y:0,offsetX:0,offsetY:0});
 async function confirm(){
  if(!prepared||!loaded||saving)return;
  setSaving(true);setError('');
  try{
   const result=await cropProfilePhoto(prepared.uri,layout.crop);
   onConfirm(result);
  }catch(reason){const message=reason instanceof Error?reason.message:'No se ha podido recortar la foto. Prueba con otra imagen.';setError(message);onError(message);}finally{setSaving(false);}
 }
 return <Modal visible transparent animationType="fade" onRequestClose={()=>{if(!saving)onCancel();}}><View style={styles.backdrop}><View style={styles.sheet} accessibilityViewIsModal>
  <Text style={styles.title}>Ajustar foto</Text><Text style={styles.hint}>Arrastra la imagen para encuadrarla.</Text>
  <View style={[styles.crop,{width,height}]} onStartShouldSetResponder={()=>!saving} onMoveShouldSetResponder={()=>!saving} onResponderGrant={event=>{drag.current={x:event.nativeEvent.pageX,y:event.nativeEvent.pageY,offsetX:offset.x,offsetY:offset.y};}} onResponderMove={event=>{setOffset(bound(drag.current.offsetX+event.nativeEvent.pageX-drag.current.x,drag.current.offsetY+event.nativeEvent.pageY-drag.current.y));}}>{prepared&&<Image source={{uri:prepared.uri}} resizeMode="stretch" onError={()=>{setLoaded(false);setError('No se ha podido cargar la foto. Pulsa Cancelar y selecciona otra.');}} onLoad={()=>setLoaded(true)} style={{position:'absolute',width:imageWidth,height:imageHeight,left:layout.left,top:layout.top}}/>}<View pointerEvents="none" style={styles.cropBorder}/></View>
  {!!error&&<Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
  {!loaded&&!error&&<Text style={styles.hint}>Cargando foto…</Text>}
  <View style={styles.zoom}><Pressable accessibilityRole="button" accessibilityLabel="Alejar foto" disabled={saving||zoom<=1} onPress={()=>{setZoom(value=>Math.max(1,value-0.25));setOffset({x:0,y:0});}} style={styles.control}><Text style={styles.controlText}>−</Text></Pressable><Text style={styles.hint}>{Math.round(zoom*100)} %</Text><Pressable accessibilityRole="button" accessibilityLabel="Acercar foto" disabled={saving||zoom>=4} onPress={()=>setZoom(value=>Math.min(4,value+0.25))} style={styles.control}><Text style={styles.controlText}>＋</Text></Pressable></View>
  <View style={styles.actions}><Pressable accessibilityRole="button" disabled={saving} onPress={onCancel} style={styles.button}><Text style={styles.buttonText}>CANCELAR</Text></Pressable><Pressable accessibilityRole="button" disabled={!prepared||!loaded||saving} onPress={()=>{void confirm();}} style={[styles.button,styles.confirm]}><Text style={styles.buttonText}>{saving?'GUARDANDO…':'USAR FOTO'}</Text></Pressable></View>
 </View></View></Modal>;
}
const styles=StyleSheet.create({backdrop:{flex:1,justifyContent:'center',alignItems:'center',backgroundColor:'rgba(0,0,0,0.9)',padding:16},sheet:{width:'100%',maxWidth:380,backgroundColor:'#17131B',padding:20,borderRadius:20,alignItems:'center'},error:{color:'#FFB4B9',fontSize:12,lineHeight:18,marginTop:12,textAlign:'center'},title:{fontSize:20,fontWeight:'800',color:'#FFFFFF'},hint:{color:'#C9BEC5',fontSize:12,marginVertical:12},crop:{overflow:'hidden',backgroundColor:'#29232C'},cropBorder:{position:'absolute',top:0,right:0,bottom:0,left:0,borderWidth:1,borderColor:'#78606C'},zoom:{flexDirection:'row',alignItems:'center',gap:24,marginTop:12},control:{width:44,height:44,alignItems:'center',justifyContent:'center'},controlText:{color:'#FFFFFF',fontSize:26},actions:{flexDirection:'row',gap:10,marginTop:16,width:'100%'},button:{flex:1,minHeight:48,alignItems:'center',justifyContent:'center',borderRadius:10,borderWidth:1,borderColor:'#66515C'},confirm:{backgroundColor:'#BD2346',borderColor:'#BD2346'},buttonText:{color:'#FFFFFF',fontSize:11,fontWeight:'800'}});
