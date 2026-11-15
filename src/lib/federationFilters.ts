export const federationFilterFields=[{key:'season',label:'Temporada',domId:'sel-temporada'},{key:'modality',label:'Modalidad',domId:'sel-cat-grupo'},{key:'competition',label:'Competición / categoría',domId:'sel-competicion'},{key:'group',label:'Grupo',domId:'sel-grupo'}] as const;
export type FederationFilterKey=typeof federationFilterFields[number]['key'];
export type FederationFilter={value:string;options:{value:string;label:string}[]};
export type FederationFilters=Record<FederationFilterKey,FederationFilter>&{ready:boolean;command:number};
export function parseFederationFilters(value:unknown):FederationFilters{
 const data=value as FederationFilters|null;if(!data||typeof data.ready!=='boolean'||!Number.isSafeInteger(data.command)||data.command<0)throw new Error('No se han podido cargar los filtros de la FFCV.');
 const result={ready:data.ready,command:data.command} as FederationFilters;
 for(const {key} of federationFilterFields){
  const field=data[key];
  if(!field||typeof field.value!=='string'||field.value.length>160||!Array.isArray(field.options)||field.options.length>1000)throw new Error('Opciones de competición no reconocidas.');
  const seen=new Set<string>();
  const options=field.options.map(option=>{
   if(!option||typeof option.value!=='string'||!option.value||option.value.length>160||typeof option.label!=='string'||!option.label.trim()||option.label.length>200||seen.has(option.value))throw new Error('Opciones de competición no reconocidas.');
   seen.add(option.value);return {value:option.value,label:option.label.trim()};
  });
  if(field.value&&!seen.has(field.value))throw new Error('El filtro está cambiando. Vuelve a intentarlo.');
  result[key]={value:field.value,options};
 }
 if(result.ready&&federationFilterFields.some(({key})=>!result[key].value))throw new Error('Completa los filtros de la competición.');
 return result;
}
// A bridge to the public page's select elements. No direct HTTP, cookies, page tokens,
// private variables, or federation endpoints are read or reproduced.
export const FFCV_NATIVE_FILTERS_SCRIPT=`(function(){
 if(window.__oncexFfcvFilters){window.__oncexFfcvFilters.publish();return;}
 var command=0,last='',timer=null;
 var ids={season:'sel-temporada',modality:'sel-cat-grupo',competition:'sel-competicion',group:'sel-grupo'};
 function field(id){var el=document.getElementById(id);if(!el)return {value:'',options:[]};var options=Array.from(el.options).filter(function(o){return o.value&&!o.disabled;}).map(function(o){return {value:String(o.value),label:String(o.text||o.textContent||'').trim()};});return {value:options.some(function(o){return o.value===el.value;})?String(el.value):'',options:options};}
 function publish(){
  timer=null;var state={command:command};Object.keys(ids).forEach(function(key){state[key]=field(ids[key]);});
  var journey=document.getElementById('sel-jornada');var group=state.group.value;
  var table=group&&journey&&document.querySelector('[data-clasif-tabs="clasif_'+group+'_'+journey.value+'"] table');
  state.ready=!!(table&&table.querySelectorAll('tbody tr').length>=2&&Object.keys(ids).every(function(key){return !!state[key].value;}));
  var serialized=JSON.stringify(state);if(serialized===last)return;last=serialized;
  window.ReactNativeWebView.postMessage(JSON.stringify({type:'oncex.ffcv.filters',data:state}));
 }
 function schedule(){if(timer)clearTimeout(timer);timer=setTimeout(publish,100);}
 window.__oncexFfcvFilters={publish:publish,select:function(id,value,nextCommand){
  try{
   if(Object.keys(ids).every(function(key){return ids[key]!==id;}))throw new Error('Filtro no reconocido.');
   var el=document.getElementById(id);
   if(!el||!Array.from(el.options).some(function(o){return o.value===value&&!o.disabled;}))throw new Error('Esa opción ya no está disponible. Recarga los filtros.');
   command=nextCommand;el.value=value;el.dispatchEvent(new Event('change',{bubbles:true}));schedule();
  }catch(error){window.ReactNativeWebView.postMessage(JSON.stringify({type:'oncex.ffcv.filter-error',message:error.message}));}
 }};
 document.addEventListener('change',schedule,true);
 new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
 publish();
})();true;`;
export function changeFederationFilterScript(key:FederationFilterKey,value:string,command:number):string{
 const field=federationFilterFields.find(item=>item.key===key);
 if(!field||typeof value!=='string'||!value||value.length>160||!Number.isSafeInteger(command)||command<1)throw new Error('Filtro no válido.');
 return `if(window.__oncexFfcvFilters){window.__oncexFfcvFilters.select(${JSON.stringify(field.domId)},${JSON.stringify(value)},${command});}true;`;
}
