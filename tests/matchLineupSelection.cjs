const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
const moduleUnderTest={exports:{}};
new Function('module','exports',ts.transpileModule(fs.readFileSync('src/lib/matchLineupSelection.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(moduleUnderTest,moduleUnderTest.exports);
const {toggleCallup,toggleLineupStarter,lineupSubstitutes}=moduleUnderTest.exports;
const squad=Array.from({length:15},(_,index)=>`player-${index}`);
test('calling up a player does not silently make them a starter',()=>{
 assert.deepEqual(toggleCallup([],[],squad[0]),{calledUp:[squad[0]],starters:[]});
});
test('only called-up players can be starters',()=>{
 assert.throws(()=>toggleLineupStarter(squad,[],'outside'),/convocados/);
});
test('the remaining called-up players automatically become substitutes',()=>{
 const starters=squad.slice(0,11);
 assert.deepEqual(lineupSubstitutes(squad,starters),squad.slice(11));
});
test('an eleventh starter is allowed and a twelfth is rejected',()=>{
 const starters=toggleLineupStarter(squad,squad.slice(0,10),squad[10]);
 assert.equal(starters.length,11);
 assert.throws(()=>toggleLineupStarter(squad,starters,squad[11]),/11 titulares/);
});
test('removing a starter keeps the player called up as a substitute',()=>{
 const starters=toggleLineupStarter(squad,squad.slice(0,11),squad[0]);
 assert.deepEqual(lineupSubstitutes(squad,starters),[squad[0],...squad.slice(11)]);
 assert.equal(squad.length,15);
});
test('removing a called-up starter removes both selections without mutating inputs',()=>{
 const starters=squad.slice(0,11),next=toggleCallup(squad,starters,squad[0]);
 assert.equal(next.calledUp.includes(squad[0]),false);
 assert.equal(next.starters.includes(squad[0]),false);
 assert.equal(squad.length,15);assert.equal(starters.length,11);
 assert.equal(lineupSubstitutes(next.calledUp,next.starters).includes(squad[0]),false);
});
test('an existing saved lineup retains its starters and substitutes on reopening',()=>{
 const existingStarters=squad.slice(0,11),existingSubs=squad.slice(11);
 assert.deepEqual(lineupSubstitutes([...existingStarters,...existingSubs],existingStarters),existingSubs);
});
