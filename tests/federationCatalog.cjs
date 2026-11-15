const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm');
function load(file,requireModule=()=>{throw new Error('Unexpected dependency');}){const m={exports:{}};new Function('module','exports','require',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(m,m.exports,requireModule);return m.exports;}
const lib=load('src/lib/federationCatalog.ts');
const snapshot=(overrides={})=>({source:'ffcv',seasonId:'22',seasonCode:'2026-2027',competitionId:'905431604',competitionName:'Tercera Federación',groupId:'905431605',groupName:'GRUP - VI',teams:[{id:'1',name:"Villarreal C.F. 'C'",badgeUrl:'https://appwebffcv.novanet.es/logos/1.png'},{id:'2',name:"Levante U.D. 'B'",badgeUrl:'https://ffcv.es/logos/2.png'},{id:'3',name:'Torrent C.F.',badgeUrl:'https://ffcv.es/logos/3.png'}],...overrides});
test('reads explicit competition and group, normalizes season and rebuilds the official URL',()=>{
 const result=lib.parseFederationSnapshot(snapshot({sourceUrl:'https://evil.example/'}));
 assert.equal(result.seasonCode,'2026/2027');assert.equal(result.groupId,'905431605');assert.match(result.sourceUrl,/cod_grupo=905431605/);assert.equal(new URL(result.sourceUrl).hostname,'ffcv.es');
});
test('requires coach identification of their own team and excludes it from rivals',()=>{
 assert.throws(()=>lib.confirmFederationGroup(snapshot(),''),/Selecciona tu equipo/);
 const group=lib.confirmFederationGroup(snapshot(),'2','2026/2027');
 assert.deepEqual(lib.federationOpponents(group).map(team=>team.id),['1','3']);
});
test('does not infer the group or season from a generic first-team name',()=>{
 assert.throws(()=>lib.confirmFederationGroup(snapshot(),'2','2025/2026'),/2025\/2026/);
 for(const data of [snapshot({groupId:''}),snapshot({competitionId:'https://evil.example'}),snapshot({seasonCode:'2026/2028'}),snapshot({teams:[]})])assert.throws(()=>lib.parseFederationSnapshot(data));
});
test('rejects duplicate and unidentifiable teams instead of selecting silently',()=>{
 const sample=snapshot();
 assert.throws(()=>lib.parseFederationSnapshot({...sample,teams:[sample.teams[0],sample.teams[0]]}),/duplicados/);
 assert.throws(()=>lib.parseFederationSnapshot({...sample,teams:[sample.teams[0],{id:'',name:'Unknown'}]}),/identificar/);
});
test('keeps reserve-team suffixes distinct and uses only known rival badges',()=>{
 const group=lib.confirmFederationGroup(snapshot(),'3');
 assert.equal(lib.opponentBadgeUrl(group,"villarreal C.F. 'c'"),snapshot().teams[0].badgeUrl);
 assert.equal(lib.opponentBadgeUrl(group,"Villarreal C.F. 'B'"),undefined);
 assert.equal(lib.opponentBadgeUrl(group,'Torrent C.F.'),undefined);
 assert.equal(lib.opponentBadgeUrl(group,'Amistoso externo'),undefined);
});
test('rejects unsafe image URLs and unrelated navigation origins',()=>{
 for(const url of ['http://ffcv.es/x','https://ffcv.es.evil.example/x','file:///x','javascript:alert(1)','https://127.0.0.1/x','https://ffcv.es:8443/x','https://user:pass@ffcv.es/x'])assert.equal(lib.federationBadgeUrl(url),undefined);
 for(const url of ['https://ffcv.es/competiciones/?view=clasificaciones','https://competiciones.ffcv.es/'])assert.equal(lib.isFfcvPage(url),true);
 for(const url of ['https://ffcv.es.evil.example/competiciones/','http://ffcv.es/competiciones/','https://ffcv.es/wp/login','https://user:pass@ffcv.es/competiciones/'])assert.equal(lib.isFfcvPage(url),false);
});
function readVisible({stale=false,rows=snapshot().teams,seasonName='2026-2027'}={}){
 let message;
 // Public DOM structure verified in the FFCV's buildClasifTable: .col-equipo,
 // .table-club-name, data-codequipo, data-team-name. No API or token simulation.
 const selects={'sel-temporada':['22',seasonName],'sel-cat-grupo':['MASCULÍ F11','MASCULÍ F11'],'sel-competicion':['905431604','Tercera Federación'],'sel-grupo':['905431605','GRUP - VI'],'sel-jornada':['10','J.10']};
 const rowNodes=rows.map(item=>({getAttribute:name=>name==='data-codequipo'?item.id:null,querySelector:selector=>selector==='.col-equipo'?{querySelector:query=>query==='.table-club-name'?{getAttribute:name=>name==='data-team-name'?item.name:item.id}:query==='img'?{currentSrc:item.badgeUrl,src:item.badgeUrl}:null}:null}));
 const document={getElementById:id=>{const [value,text]=selects[id];return {value,options:[{text}],selectedIndex:0};},querySelector:selector=>!stale&&selector==='[data-clasif-tabs="clasif_905431605_10"]'?{querySelector:()=>({querySelectorAll:()=>rowNodes})}:null};
 vm.runInNewContext(lib.FFCV_READ_VISIBLE_GROUP_SCRIPT,{document,window:{ReactNativeWebView:{postMessage:value=>{message=JSON.parse(value);}}}});
 return message;
}
test('imports only the currently rendered classification and its team-cell badges',()=>{
 const message=readVisible();assert.equal(message.type,'oncex.ffcv.group');
 const result=lib.parseFederationSnapshot(message.data);assert.deepEqual(result.teams,snapshot().teams);assert.equal(result.groupId,'905431605');
});
test('refuses stale tables while filters or matchday are changing',()=>{
 const message=readVisible({stale:true});assert.equal(message.type,'oncex.ffcv.error');assert.match(message.message,/termine de cargar/);
});
test('refuses partial or empty classifications and missing seasonal labels',()=>{
 for(const options of [{rows:[]},{rows:snapshot().teams.slice(0,1)},{seasonName:''}])assert.throws(()=>lib.parseFederationSnapshot(readVisible(options).data));
});
test('reads the shared team configuration from Supabase and saves through the authorized RPC',async()=>{
 const values=new Map(),calls=[];
 const backend={from:name=>{assert.equal(name,'teams');return {select:columns=>{assert.equal(columns,'federation_groups');return {eq:(_,id)=>({single:async()=>({data:{federation_groups:values.get(id)??[]},error:null})})};}};},rpc:async(name,args)=>{
  calls.push({name,args});assert.equal(name,'save_team_federation_group');
  const old=values.get(args.target_team)??[];values.set(args.target_team,[args.selected_group,...old.filter(item=>item.seasonCode!==args.selected_group.seasonCode)]);
  return {data:values.get(args.target_team),error:null};
 }};
 const storage=load('src/lib/federationCatalogStorage.ts',name=>name==='./client'?{client:()=>backend}:lib);
 const group=lib.confirmFederationGroup(snapshot(),'2');
 await storage.saveFederationGroup('team-a',group);
 assert.equal((await storage.readFederationGroups('team-a'))[0].ownTeamId,'2');
 assert.deepEqual(await storage.readFederationGroups('team-b'),[]);
 await storage.saveFederationGroup('team-a',lib.confirmFederationGroup(snapshot({seasonCode:'2025-2026'}),'2'));
 assert.equal((await storage.readFederationGroups('team-a')).length,2);
 assert.ok(calls.every(call=>call.name==='save_team_federation_group'));
});
test('does not silently use local data when the server configuration is missing or access is denied',async()=>{
 let code='42703';const storage=load('src/lib/federationCatalogStorage.ts',name=>name==='./client'?{client:()=>({from:()=>({select:()=>({eq:()=>({single:async()=>({error:{code,message:'Denied'}})})})}),rpc:async()=>({error:{code,message:'Denied'}})})}:lib);
 await assert.rejects(storage.readFederationGroups('team'),/202611140001/);
 code='42501';await assert.rejects(storage.saveFederationGroup('team',lib.confirmFederationGroup(snapshot(),'2')),/Denied/);
});
test('team creation includes its federation group in the same insert, never a follow-up request',async()=>{
 let payload;let inserts=0;
 const backend={from:name=>{assert.equal(name,'teams');return {insert:data=>{inserts++;payload=data;return {select:()=>({single:async()=>({data:{id:'new-team'},error:null})})};}};}};
 const storage=load('src/lib/federationCatalogStorage.ts',name=>name==='./client'?{client:()=>backend}:lib);
 const hierarchy=load('src/lib/hierarchy.ts',name=>name==='./client'?{client:()=>backend}:name==='./federationCatalog'?lib:name==='./federationCatalogStorage'?storage:{});
 const group=lib.confirmFederationGroup(snapshot(),'2');
 assert.equal(await hierarchy.createTeam({name:'First team',category:'Existing category',clubId:'club',federationGroup:group}),'new-team');
 assert.equal(inserts,1);assert.equal(payload.federation_groups[0].ownTeamId,'2');assert.equal(payload.category,'Existing category');
});

const categories=load('src/lib/teamFederationCategory.ts',()=>load('src/data/teamCategories.ts'));
test('derives the former canonical category from the selected FFCV competition without another input',()=>{
 assert.equal(categories.teamCategoryFromFederation({competitionName:'PRIMERA FFCV'}),'Lliga Primera FFCV · Comunidad Valenciana');
 assert.equal(categories.teamCategoryFromFederation({competitionName:'LLIGA SEGONA FFCV JUVENIL'}),'Lliga Segona FFCV Juvenil · Comunidad Valenciana');
 assert.equal(categories.teamCategoryFromFederation({competitionName:'Primera Cadete'}),'Primera Cadet · Comunidad Valenciana');
});
test('does not confuse Tercera Federación with Tercera FFCV or guess unknown competitions',()=>{
 assert.equal(categories.teamCategoryFromFederation({competitionName:'Tercera Federación'}),'Tercera Federación · Comunidad Valenciana');
 assert.equal(categories.teamCategoryFromFederation({competitionName:'Tercera FFCV'}),'Lliga Tercera FFCV · Comunidad Valenciana');
 assert.equal(categories.teamCategoryFromFederation({competitionName:'Nueva competición'}),'Nueva competición · Comunidad Valenciana');
 assert.equal(categories.teamCategoryFromFederation(null),'');
});
