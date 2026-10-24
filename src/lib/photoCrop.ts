import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { decode } from 'base64-arraybuffer';
import type { ProfilePhoto } from './profilePhotos';
export type PhotoCropRect={originX:number;originY:number;width:number;height:number};
/** Bound the saved PNG, not the original selected image. Keep its alpha channel. */
export async function cropProfilePhoto(uri:string,rect:PhotoCropRect):Promise<ProfilePhoto>{
 const context=ImageManipulator.manipulate(uri);
 context.crop(rect);
 const longest=Math.max(rect.width,rect.height);
 if(longest>1024)context.resize({width:Math.max(1,Math.round(rect.width*1024/longest)),height:Math.max(1,Math.round(rect.height*1024/longest))});
 const image=await context.renderAsync();
 const result=await image.saveAsync({format:SaveFormat.PNG,base64:true});
 if(!result.base64)throw new Error('No se ha podido leer la foto recortada. Prueba con otra imagen.');
 if(decode(result.base64).byteLength>5*1024*1024)throw new Error('La foto recortada supera los 5 MB. Prueba con otra imagen.');
 return{uri:result.uri,base64:result.base64,contentType:'image/png'};
}

/** Bake orientation into pixels once; preview and crop then share this exact file. */
export async function prepareCropSource(uri:string){
 const context=ImageManipulator.manipulate(uri);
 let image=await context.renderAsync();
 const longest=Math.max(image.width,image.height);
 if(longest>2048){context.resize({width:Math.max(1,Math.round(image.width*2048/longest)),height:Math.max(1,Math.round(image.height*2048/longest))});image=await context.renderAsync();}
 const result=await image.saveAsync({format:SaveFormat.PNG});
 return{uri:result.uri,width:image.width,height:image.height};
}

/** One transform shared by the visible image and its saved pixel rectangle. */
export function photoCropLayout(source:{width:number;height:number},frame:{width:number;height:number},zoom:number,offset:{x:number;y:number}){
 const ratio=Math.max(frame.width/source.width,frame.height/source.height)*zoom;
 const width=source.width*ratio,height=source.height*ratio;
 const x=Math.max(-(width-frame.width)/2,Math.min((width-frame.width)/2,offset.x));
 const y=Math.max(-(height-frame.height)/2,Math.min((height-frame.height)/2,offset.y));
 const left=(frame.width-width)/2+x,top=(frame.height-height)/2+y;
 const cropWidth=Math.max(1,Math.min(source.width,Math.round(frame.width/ratio)));
 const cropHeight=Math.max(1,Math.min(source.height,Math.round(frame.height/ratio)));
 return{width,height,left,top,crop:{originX:Math.max(0,Math.min(source.width-cropWidth,Math.round(-left/ratio))),originY:Math.max(0,Math.min(source.height-cropHeight,Math.round(-top/ratio))),width:cropWidth,height:cropHeight}};
}
