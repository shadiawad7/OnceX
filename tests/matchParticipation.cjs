const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
const moduleObject={exports:{}};new Function('module','exports',ts.transpileModule(fs.readFileSync('src/lib/matchParticipation.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(moduleObject,moduleObject.exports);
const {reviewMatchParticipation,participationFingerprint}=moduleObject.exports;
const starters=()=>Array.from({length:11},(_,i)=>({slot_id:`s${i}`,player_id:`p${i}`,player_name:`Player ${i}`,player_position:i===0?'Portero':'Defensa',starter:true,minutes:90,goals:0,own_goals:0,assists:0,yellow_cards:0,red_cards:0,clean_sheet:null,conceded_while_playing:null}));
const lineup=()=>[...starters(),{...starters()[0],slot_id:'bench',starter:false,minutes:0}];
test('player leaving at 60 keeps zero conceded; replacement gets 30 minutes and the late goal',()=>{
 const players=lineup();players[0].minutes=60;players[11].minutes=30;
 const result=reviewMatchParticipation(players,90,1,[{outgoing:'s0',incoming:'bench',minute:60}],[{minute:70,order:null}]);
 assert.equal(result[0].minutes,60);assert.equal(result[0].conceded_while_playing,0);
 assert.equal(result[11].minutes,30);assert.equal(result[11].conceded_while_playing,1);
 assert.equal(result[1].conceded_while_playing,1);assert.equal(players[0].conceded_while_playing,null);
});
test('goal at substitution minute requires human ordering',()=>{
 const change=[{outgoing:'s0',incoming:'bench',minute:60}];
 assert.throws(()=>reviewMatchParticipation(lineup(),90,1,change,[{minute:60,order:null}]),/antes o después/);
 const before=reviewMatchParticipation(lineup(),90,1,change,[{minute:60,order:'before'}]);
 assert.equal(before[0].conceded_while_playing,1);assert.equal(before[11].conceded_while_playing,0);
 const after=reviewMatchParticipation(lineup(),90,1,change,[{minute:60,order:'after'}]);assert.equal(after[0].conceded_while_playing,0);assert.equal(after[11].conceded_while_playing,1);
});
test('substitute later replaced gets actual interval, not 90 minus their own minutes',()=>{
 const players=[...lineup(),{...lineup()[11],slot_id:'bench2'}];
 const result=reviewMatchParticipation(players,90,0,[{outgoing:'s0',incoming:'bench',minute:60},{outgoing:'bench',incoming:'bench2',minute:80}],[]);
 assert.deepEqual([result[0].minutes,result[11].minutes,result[12].minutes],[60,20,10]);
});
test('incomplete goals, invalid changes and unidentified partial appearances cannot be confirmed',()=>{
 assert.throws(()=>reviewMatchParticipation(lineup(),90,1,[],[]),/cada gol/);
 assert.throws(()=>reviewMatchParticipation(lineup(),90,1,[],[{minute:null,order:null}]),/minutos/);
 assert.throws(()=>reviewMatchParticipation(lineup(),90,0,[{outgoing:'bench',incoming:'s0',minute:30}],[]),/estar jugando/);
 assert.throws(()=>reviewMatchParticipation(lineup(),90,0,[{outgoing:'s0',incoming:'s1',minute:30}],[]),/todavía no/);
 const players=lineup();players[0].minutes=60;assert.throws(()=>reviewMatchParticipation(players,90,0,[],[]),/Vincula el cambio/);
});
test('a sending-off without replacement stops exposure at the selected minute',()=>{
 const result=reviewMatchParticipation(lineup(),90,1,[{outgoing:'s0',incoming:null,minute:60}],[{minute:70,order:null}]);assert.equal(result[0].minutes,60);assert.equal(result[0].conceded_while_playing,0);assert.equal(result[11].minutes,0);
});
test('review fingerprint invalidates when minutes, score or personal conceded count changes',()=>{
 const a=lineup(),key=participationFingerprint(a,90,'1');
 for(const change of [{minutes:60},{conceded_while_playing:1},{red_cards:1}])assert.notEqual(key,participationFingerprint(a.map((p,i)=>i===0?{...p,...change}:p),90,'1'));
 assert.notEqual(key,participationFingerprint(a,90,'2'));
});
