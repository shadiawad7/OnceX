const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const ts=require('typescript');
const code=ts.transpileModule(fs.readFileSync('src/lib/photoCrop.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function setup(base64='iVBORw0KGgo='){
 const calls=[];const context={crop:rect=>calls.push(['crop',rect]),resize:size=>calls.push(['resize',size]),renderAsync:async()=>({saveAsync:async options=>{calls.push(['save',options]);return{uri:'file:///cropped.png',base64};}})};
 const module={exports:{}};new Function('require','module','exports',code)(name=>name==='expo-image-manipulator'?{ImageManipulator:{manipulate:uri=>{calls.push(['source',uri]);return context;}},SaveFormat:{PNG:'png'}}:require(name),module,module.exports);
 return{calls,crop:module.exports.cropProfilePhoto,layout:module.exports.photoCropLayout};
}
test('large camera photo is cropped then bounded before PNG encoding',async()=>{const h=setup();const rect={originX:200,originY:100,width:3000,height:4000};const photo=await h.crop('file:///camera.heic',rect);assert.deepEqual(h.calls,[['source','file:///camera.heic'],['crop',rect],['resize',{width:768,height:1024}],['save',{format:'png',base64:true}]]);assert.equal(photo.contentType,'image/png');});
test('small transparent images retain PNG format without upscaling',async()=>{const h=setup();await h.crop('file:///transparent.png',{originX:0,originY:0,width:300,height:400});assert.ok(!h.calls.some(([name])=>name==='resize'));assert.deepEqual(h.calls.at(-1),['save',{format:'png',base64:true}]);});
test('unreadable crop is reported instead of returning an unusable photo',async()=>{const empty=setup('');await assert.rejects(()=>empty.crop('file:///bad.png',{originX:0,originY:0,width:100,height:100}),/No se ha podido leer/);});

test('landscape source previews exactly the centered portrait crop',()=>{
 const {layout}=setup();const value=layout({width:4000,height:3000},{width:240,height:320},1,{x:0,y:0});
 assert.deepEqual(value.crop,{originX:875,originY:0,width:2250,height:3000});
});
test('zoom and drag export the same source pixels visible in the frame',()=>{
 const {layout}=setup();const value=layout({width:4000,height:3000},{width:240,height:320},2,{x:60,y:-20});
 assert.deepEqual(value.crop,{originX:1156,originY:844,width:1125,height:1500});
});
test('all frame edges stay aligned after extreme drags and viewport changes',()=>{
 const {layout}=setup();
 for(const source of [{width:4032,height:3024},{width:3024,height:4032}])for(const frame of [{width:237,height:316},{width:180,height:240}])for(const zoom of [1,1.25,4])for(const offset of [{x:10000,y:-10000},{x:-10000,y:10000},{x:17,y:-23}]){
  const value=layout(source,frame,zoom,offset),ratio=value.width/source.width;
  assert.ok(value.crop.originX>=0&&value.crop.originY>=0);
  assert.ok(value.crop.originX+value.crop.width<=source.width&&value.crop.originY+value.crop.height<=source.height);
  assert.ok(Math.abs(value.crop.originX+value.left/ratio)<=1);
  assert.ok(Math.abs(value.crop.originY+value.top/ratio)<=1);
  assert.ok(Math.abs(value.crop.width-frame.width/ratio)<=1);
  assert.ok(Math.abs(value.crop.height-frame.height/ratio)<=1);
 }
});
test('preview normalization uses the decoded oriented dimensions and writes PNG',async()=>{
 let savedOptions;const calls=[];let dimensions={width:3000,height:4000};
 const context={renderAsync:async()=>({...dimensions,saveAsync:async options=>{savedOptions=options;return{uri:'file:///oriented-preview.png'};}}),resize:next=>{dimensions=next;calls.push(next);}};
 const module={exports:{}};new Function('require','module','exports',code)(name=>name==='expo-image-manipulator'?{ImageManipulator:{manipulate:()=>context},SaveFormat:{PNG:'png'}}:require(name),module,module.exports);
 const prepared=await module.exports.prepareCropSource('file:///camera.heic');
 assert.deepEqual(prepared,{uri:'file:///oriented-preview.png',width:1536,height:2048});
 assert.deepEqual(savedOptions,{format:'png'});
});
