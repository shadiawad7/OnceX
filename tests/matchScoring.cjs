const {test}=require('node:test');const assert=require('node:assert/strict');const ts=require('typescript');const fs=require('fs');const Module=require('module');
function load(file){const m=new Module(file,module);m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,file);return m.exports;}
const {matchPointBreakdown,participationThreshold,cleanSheetThreshold,MATCH_POINTS}=load('src/lib/matchScoring.ts');
const {weightedOutfieldOverall}=load('src/lib/cardOverall.ts');
const base={position:'Delantero',duration:90,minutes:80,goals:2,ownGoals:0,assists:1,yellowCards:0,redCards:0,teamGoals:2,opponentGoals:1,concededWhilePlaying:1};
test('official forward example = 14',()=>assert.equal(matchPointBreakdown(base).total,14));
test('official defender example = 10',()=>assert.equal(matchPointBreakdown({...base,position:'Defensa',minutes:90,goals:1,assists:0,yellowCards:1,teamGoals:1,opponentGoals:0,concededWhilePlaying:0}).total,10));
test('short appearance still earns actions and result',()=>assert.equal(matchPointBreakdown({...base,minutes:35,goals:1,assists:0}).total,6));
test('independent minute thresholds',()=>{assert.deepEqual([90,80,70].map(participationThreshold),[60,53,47]);assert.deepEqual([90,80].map(cleanSheetThreshold),[54,48]);});
test('clean sheet survives a goal after substitution',()=>{assert.equal(matchPointBreakdown({...base,minutes:54,concededWhilePlaying:0}).cleanSheet,true);assert.equal(matchPointBreakdown({...base,minutes:53,concededWhilePlaying:0}).cleanSheet,false);});
test('bench player has no collective or minutes reward',()=>{const result=matchPointBreakdown({...base,minutes:0,goals:0,assists:0,concededWhilePlaying:0});assert.equal(result.total,0);});
test('all positional penalties and weights',()=>{for(const position of Object.keys(MATCH_POINTS)){const w=MATCH_POINTS[position];const result=matchPointBreakdown({...base,position,goals:1,ownGoals:1,assists:1,yellowCards:1,redCards:1});assert.equal(result.total,4+w.goal+w.ownGoal+w.assist+w.yellow+w.red);}});
test('negative points are retained',()=>assert.equal(matchPointBreakdown({...base,position:'Portero',minutes:1,goals:0,assists:0,ownGoals:1,yellowCards:1,redCards:1,teamGoals:0,opponentGoals:1}).total,-15));
test('invalid inputs rejected',()=>assert.throws(()=>matchPointBreakdown({...base,concededWhilePlaying:2})));
test('weighted DEL example rounds to 89 without using accumulated points',()=>assert.equal(weightedOutfieldOverall('DEL',{FIN:91,CRE:82,IMP:90,DIS:94,REG:86,EFI:89}),89));

test('official table matches the four positions exactly',()=>{
 assert.deepEqual(MATCH_POINTS,{
  Portero:{goal:8,ownGoal:-5,assist:5,yellow:-4,red:-6,cleanSheet:4},
  Defensa:{goal:6,ownGoal:-4,assist:4,yellow:-3,red:-5,cleanSheet:3},
  Centrocampista:{goal:5,ownGoal:-3,assist:3,yellow:-2,red:-4,cleanSheet:2},
  Delantero:{goal:4,ownGoal:-2,assist:2,yellow:-1,red:-3,cleanSheet:1},
 });
});
test('two defender goals and two yellows multiply independently',()=>{
 const result=matchPointBreakdown({...base,position:'Defensa',minutes:90,goals:2,assists:0,yellowCards:2});
 assert.equal(result.parts.goals,12);assert.equal(result.parts.yellowCards,-6);assert.equal(result.total,10);
});
test('59 minutes has no participation bonus, 60 has exactly two',()=>{
 assert.equal(matchPointBreakdown({...base,minutes:59}).parts.participation,0);
 assert.equal(matchPointBreakdown({...base,minutes:60}).parts.participation,2);
});
test('client and official SQL position table stay in sync',()=>{
 const sql=fs.readFileSync('supabase/migrations/202610210002_match_scoring_v2.sql','utf8');
 for(const [position,weights] of Object.entries(MATCH_POINTS))assert.ok(sql.includes(`('oncex-match-v2','${position}',${weights.goal},${weights.ownGoal},${weights.assist},${weights.yellow},${weights.red},${weights.cleanSheet})`));
});
test('full-match conceded goals follow result changes without another input',()=>{
 const {concededDuringAppearance}=load('src/lib/matchScoring.ts');
 assert.equal(concededDuringAppearance(90,90,1,null),1);
 assert.equal(concededDuringAppearance(90,90,2,1),2);
 assert.equal(concededDuringAppearance(0,90,2,null),0);
 assert.equal(concededDuringAppearance(60,90,0,null),0);
 assert.equal(concededDuringAppearance(60,90,2,null),null);
 assert.equal(concededDuringAppearance(60,90,2,0),0);
});

test('live preview adds actions immediately before minutes or result are entered',()=>{
 const {liveMatchPointBreakdown}=load('src/lib/matchScoring.ts');
 const draft={...base,minutes:null,teamGoals:null,opponentGoals:null,concededWhilePlaying:null,goals:0,assists:0};
 assert.equal(liveMatchPointBreakdown(draft).total,0);
 assert.equal(liveMatchPointBreakdown({...draft,goals:1}).total,4);
 assert.equal(liveMatchPointBreakdown({...draft,goals:2,assists:1}).total,10);
 assert.equal(liveMatchPointBreakdown({...draft,goals:2,assists:1,yellowCards:1}).total,9);
 assert.equal(liveMatchPointBreakdown({...draft,minutes:60}).total,2);
});
test('live preview never assumes a draw or clean sheet from empty result',()=>{
 const {liveMatchPointBreakdown}=load('src/lib/matchScoring.ts');
 const result=liveMatchPointBreakdown({...base,minutes:90,teamGoals:null,opponentGoals:null,concededWhilePlaying:null});
 assert.equal(result.parts.result,0);assert.equal(result.parts.cleanSheet,0);
});
test('complete live preview equals official calculation in every position',()=>{
 const {liveMatchPointBreakdown}=load('src/lib/matchScoring.ts');
 for(const position of Object.keys(MATCH_POINTS))for(const minutes of [35,54,60,90])for(const concededWhilePlaying of [0,1]){
  const input={...base,position,minutes,concededWhilePlaying};
  assert.deepEqual(liveMatchPointBreakdown(input),matchPointBreakdown(input));
 }
});

test('away win bonus requires at least 60 minutes in all positions',()=>{
 const {liveMatchPointBreakdown}=load('src/lib/matchScoring.ts');
 for(const position of Object.keys(MATCH_POINTS))for(const minutes of [0,35,59,60,90]){
  const input={...base,position,minutes,goals:0,assists:0,concededWhilePlaying:minutes?1:0};
  const home=matchPointBreakdown({...input,venue:'home'}),away=matchPointBreakdown({...input,venue:'away'});
  assert.equal(away.total-home.total,minutes>=60?1:0);
  assert.equal(away.parts.awayWin,minutes>=60?1:0);
  assert.deepEqual(liveMatchPointBreakdown({...input,venue:'away'}),away);
 }
});
test('draws, losses and unknown venue do not add away win points',()=>{
 for(const [teamGoals,opponentGoals] of [[1,1],[0,1]])assert.equal(matchPointBreakdown({...base,venue:'away',teamGoals,opponentGoals}).parts.awayWin,0);
 assert.equal(matchPointBreakdown(base).parts.awayWin,0);
});
test('away bonus is fixed at 60 even in a shorter legacy match',()=>{
 assert.equal(matchPointBreakdown({...base,duration:80,minutes:59,venue:'away'}).parts.awayWin,0);
 assert.equal(matchPointBreakdown({...base,duration:80,minutes:60,venue:'away'}).parts.awayWin,1);
});

test('updated DEL Card example rounds 86.45 to 86',()=>assert.equal(weightedOutfieldOverall('DEL',{FIN:88,CRE:76,IMP:91,DIS:85,REG:83,EFI:90}),86));
