const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm');
const m={exports:{}};new Function('module','exports',ts.transpileModule(fs.readFileSync('src/lib/federationFilters.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(m,m.exports);const lib=m.exports;
function state(){return {command:0,ready:true,season:{value:'22',options:[{value:'22',label:'2026-2027'}]},modality:{value:'MASCULÍ F11',options:[{value:'MASCULÍ F11',label:'MASCULÍ F11'}]},competition:{value:'905431604',options:[{value:'905431604',label:'Primera FFCV'}]},group:{value:'905431605',options:[{value:'905431605',label:'Grupo 1'}]}};}
test('validates the four native filter option sets including named modalities',()=>{
 const parsed=lib.parseFederationFilters(state());assert.equal(parsed.modality.value,'MASCULÍ F11');assert.equal(parsed.ready,true);
});
test('rejects duplicate options, inconsistent selections and incomplete ready states',()=>{
 const duplicate=state();duplicate.group.options.push({...duplicate.group.options[0]});assert.throws(()=>lib.parseFederationFilters(duplicate));
 const missing=state();missing.competition.value='unlisted';assert.throws(()=>lib.parseFederationFilters(missing));
 const incomplete=state();incomplete.group.value='';assert.throws(()=>lib.parseFederationFilters(incomplete));
});
test('empty downstream filters are valid while a parent selection is loading',()=>{
 const data=state();data.ready=false;data.group={value:'',options:[]};assert.equal(lib.parseFederationFilters(data).ready,false);
});
function browser(){
 const messages=[],events=[],timers=new Map();let serial=0,observers=0,listeners=0,tableGroup='905431605',networkCalls=0;
 const values=state(),selects={};
 for(const field of lib.federationFilterFields){const data=values[field.key];selects[field.domId]={value:data.value,options:data.options.map(option=>({value:option.value,text:option.label,disabled:false})),dispatchEvent:event=>events.push({id:field.domId,event:event.type})};}
 selects['sel-jornada']={value:'10'};
 const document={documentElement:{},getElementById:id=>selects[id]??null,addEventListener:()=>listeners++,querySelector:selector=>selector===`[data-clasif-tabs="clasif_${tableGroup}_10"] table`?{querySelectorAll:()=>[{},{}]}:null};
 Object.defineProperty(document,'cookie',{get(){throw new Error('Must not read cookies');}});
 const window={ReactNativeWebView:{postMessage:value=>messages.push(JSON.parse(value))},fetch:()=>{networkCalls++;throw new Error('Must not call internal APIs');}};
 const context=vm.createContext({document,window,MutationObserver:class{constructor(callback){this.callback=callback;observers++;}observe(){}},Event:class{constructor(type){this.type=type;}},setTimeout:callback=>{timers.set(++serial,callback);return serial;},clearTimeout:id=>timers.delete(id)});
 const run=script=>vm.runInContext(script,context),flush=()=>{for(const [id,fn] of [...timers]){timers.delete(id);fn();}};
 return {run,flush,selects,messages,events,window,context,setTableGroup:value=>{tableGroup=value;},stats:()=>({observers,listeners,networkCalls})};
}
test('reads normal public selects into native options without any API, tokens or cookies',()=>{
 const b=browser();b.run(lib.FFCV_NATIVE_FILTERS_SCRIPT);
 assert.equal(b.messages[0].type,'oncex.ffcv.filters');assert.equal(lib.parseFederationFilters(b.messages[0].data).ready,true);
 assert.equal(b.stats().networkCalls,0);
});
test('native selection dispatches the official change event and acknowledges its sequence',()=>{
 const b=browser();b.run(lib.FFCV_NATIVE_FILTERS_SCRIPT);
 b.selects['sel-grupo'].options.push({value:'999',text:'Grupo 2'});
 b.run(lib.changeFederationFilterScript('group','999',1));b.flush();
 assert.deepEqual(b.events,[{id:'sel-grupo',event:'change'}]);
 const last=b.messages.at(-1).data;assert.equal(last.group.value,'999');assert.equal(last.command,1);assert.equal(last.ready,false);
 b.setTableGroup('999');b.window.__oncexFfcvFilters.publish();assert.equal(b.messages.at(-1).data.ready,true);
});
test('rejects unavailable options without changing the page selection',()=>{
 const b=browser();b.run(lib.FFCV_NATIVE_FILTERS_SCRIPT);b.run(lib.changeFederationFilterScript('group','unknown',1));
 assert.equal(b.selects['sel-grupo'].value,'905431605');assert.equal(b.messages.at(-1).type,'oncex.ffcv.filter-error');
});
test('encodes option values safely instead of concatenating executable source',()=>{
 const b=browser();b.run(lib.FFCV_NATIVE_FILTERS_SCRIPT);
 const value='MASCULÍ "); window.pwned=true; //';b.selects['sel-cat-grupo'].options.push({value,text:value});
 b.run(lib.changeFederationFilterScript('modality',value,1));b.flush();
 assert.equal(b.window.pwned,undefined);assert.equal(b.selects['sel-cat-grupo'].value,value);
 assert.throws(()=>lib.changeFederationFilterScript('invalid','x',1));
});
test('installing the bridge twice does not add observers or repeat unchanged state',()=>{
 const b=browser();b.run(lib.FFCV_NATIVE_FILTERS_SCRIPT);b.run(lib.FFCV_NATIVE_FILTERS_SCRIPT);
 assert.equal(b.stats().observers,1);assert.equal(b.stats().listeners,1);assert.equal(b.messages.length,1);
});
