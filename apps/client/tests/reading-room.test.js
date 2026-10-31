import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { LocalMockAdapter } from "../mock-v2/adapter.js";
import { validate, command } from "../src/network/protocol.js";
import { grade } from "../mock-v2/questions.js";
const memory=()=>{const map=new Map();return {getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)};};
async function setup(storage=memory()) {
  let clock=Date.now();const a=new LocalMockAdapter({storage,latency:0,now:()=>clock});
  await a.initialize();await a.connect();clearInterval(a.interval);a.connection.ready=true;a.ready=true;
  a.advance=n=>{clock+=n;a.tick();};return a;
}
const send=(a,type,payload,replies=['quiz.state'])=>a.execute(type,payload,replies);
const station=a=>a.publicConfig.values.gameplay.education.stations[0];
const move=(a,p)=>{a.user.player.position=structuredClone(p);};
const quiz=async a=>{move(a,station(a).examinerSeat.position);return send(a,'quiz.start',{npcId:station(a).examinerId});};
test('v2 fixtures and untouched released schemas, with strict tagged answers',async()=>{
  const entries=JSON.parse(await readFile(new URL('./fixtures/v2.0.0/index.json',import.meta.url)));
  for(const item of entries){const ref=item.schema.split('/2.0.0/')[1];if(!ref)continue;const [name,definition]=ref.replace('.schema.json','').split('#/$defs/');const data=JSON.parse(await readFile(new URL('./'+item.file.replace(/^fixtures\//,'fixtures/'),import.meta.url)));if(item.valid)validate(name,data,definition);else assert.throws(()=>validate(name,data,definition));}
  assert.throws(()=>command('quiz.answer',{attemptId:crypto.randomUUID(),questionId:'q',optionId:'option-1'}));
  assert.throws(()=>validate('answer',{kind:'numeric',value:12}));
  const hashes=JSON.parse(await readFile(new URL('./fixtures/v2.0.0/schema-checksums.json',import.meta.url)));
  for(const [name,hash]of Object.entries(hashes)){const data=await readFile(new URL('../src/protocol/v2.0.0/'+name,import.meta.url));assert.equal(createHash('sha256').update(data).digest('hex'),hash);}
});
test('mock cold start does not call login, WebSocket, API or external fetch',async()=>{
  const old=globalThis.fetch;globalThis.fetch=()=>{throw Error('Unexpected network');};
  let a;try{a=await setup();assert.equal(a.user.wallet.balanceAura,100);assert.equal(a.lastStatus,'connected');assert.equal(a.publicConfig.values.readingRoom.shelves.length,4);}finally{a?.close();globalThis.fetch=old;}
});
test('book lifecycle and country descriptions use released commands and plain data',async()=>{
  const a=await setup();try{
    const bytes=await readFile(new URL('../../../assets/world/resources/'+a.interest.chunks[0].sha256+'.json',import.meta.url));a.interestObjects=JSON.parse(bytes).objects;
    const book=a.books().books[0];move(a,a.interestObjects.find(o=>o.id===book.bookId).position);
    const lesson=await send(a,'library.open',{bookId:book.bookId},['library.opened']);assert.equal(a.user.own.activity.mode,'learning');assert.equal(lesson.material.module.moduleId,book.moduleId);
    await send(a,'lesson.close',{lessonId:lesson.lessonId},['activity.changed']);assert.equal(a.user.own.activity.mode,'exploring');
    const s=a.publicConfig.values.gameplay.education.stations[3];move(a,s.teacherPosition);
    const c=await send(a,'country.describe',{countryId:'demo-country-a',teacherId:s.teacherId},['country.description']);assert.equal(c.synthetic,true);assert.ok(c.descriptionSentences.length>=3&&c.descriptionSentences.length<=4);
  }finally{a.close();}
});
test('typed quiz: feedback, active/feedback suspend, reload and resume same ID/question; completed maximum excludes explanation',async()=>{
  const storage=memory();let a=await setup(storage);try{
    let q=await quiz(a);const id=q.attemptId,first=q.question.questionId;
    await send(a,'quiz.leave',{attemptId:id},['activity.changed']);assert.equal(a.attempts.get(id).status,'suspended');assert.equal(a.user.player.activity.mode,'exploring');
    a.close();a=await setup(storage);const saved=(await a.gameplayGet('/api/v2/education/attempts/me?status=suspended','education','attempts')).attempts[0];assert.equal(saved.attemptId,id);assert.equal(saved.question.questionId,first);
    move(a,station(a).examinerSeat.position);q=await send(a,'quiz.resume',{attemptId:id,npcId:station(a).examinerId});assert.equal(q.question.questionId,first);
    let feedback=await send(a,'quiz.answer',{attemptId:id,questionId:first,answer:{kind:'numeric',value:'12'}});assert.equal(feedback.score,1);
    await assert.rejects(send(a,'quiz.answer',{attemptId:id,questionId:first,answer:{kind:'numeric',value:'13'}}),{code:'ANSWER_ALREADY_ACCEPTED'});
    await send(a,'quiz.leave',{attemptId:id},['activity.changed']);a.close();a=await setup(storage);move(a,station(a).examinerSeat.position);
    q=await send(a,'quiz.resume',{attemptId:id,npcId:station(a).examinerId});assert.equal(q.status,'feedback');assert.equal(q.feedback.submittedAnswer.value,'12');
    q=await send(a,'quiz.next',{attemptId:id,expectedRevision:q.revision});assert.equal(q.ordinal,2);
    for(let i=2;i<=5;i++){
      const key=a.packs[q.moduleId].questions[i-1];const value=key.expectedAnswer??'Три группы по четыре.';
      feedback=await send(a,'quiz.answer',{attemptId:id,questionId:q.question.questionId,answer:{kind:q.question.kind,value}});
      if(i===4){assert.equal(feedback.feedback.correct,null);assert.equal(feedback.feedback.evaluationStatus,'feedback_only');assert.equal(feedback.score,3);}
      q=await send(a,'quiz.next',{attemptId:id,expectedRevision:feedback.revision});
    }
    assert.equal(q.status,'completed');assert.equal(q.result.maximumScore,4);assert.equal(q.result.score,4);assert.equal(q.result.passed,true);
    await send(a,'quiz.leave',{attemptId:id},['activity.changed']);assert.equal(a.user.own.activity.mode,'exploring');
  }finally{a.close();}
});
test('numeric parser never evaluates expressions; explicit abandonment permits a new attempt',async()=>{
  const a=await setup();try{const q=await quiz(a);const key=a.packs[q.moduleId].questions[0];assert.equal(grade(key,{kind:'numeric',value:'3*4'}).correct,false);assert.equal(grade({...key,expectedAnswer:'0.25'},{kind:'numeric',value:'0,25'}).correct,true);
    await send(a,'quiz.leave',{attemptId:q.attemptId},['activity.changed']);move(a,station(a).examinerSeat.position);await assert.rejects(send(a,'quiz.start',{npcId:station(a).examinerId}),{code:'ACTIVITY_CONFLICT'});
    await send(a,'quiz.abandon',{attemptId:q.attemptId});const next=await quiz(a);assert.notEqual(next.attemptId,q.attemptId);
  }finally{a.close();}
});
async function lobby(a,scenario='win',count=2){await a.demoScenario(scenario,count);const t=a.publicConfig.values.gameplay.competition.tables[0];move(a,{x:t.position.x,y:0,z:t.position.z+3});await send(a,'competition.join',{tableId:t.tableId},['competition.state']);return a.competition.lobbies.get(t.tableId);}
const conditions=l=>({tableId:l.state.tableId,lobbyId:l.state.lobbyId,expectedRevision:l.state.revision});
for(const outcome of ['win','loss','draw','cancelled'])test('v2 competition demo: '+outcome+', five tagged rounds, private answers and confirmed wallet',async()=>{
 const a=await setup();try{
   const l=await lobby(a,outcome==='cancelled'?'win':outcome,outcome==='draw'?5:2);
   await send(a,'competition.configure',{...conditions(l),subject:'mathematics',stakeAura:10},['competition.state']);
   await send(a,'competition.ready',{...conditions(l),ready:true},['competition.state']);assert.equal(a.user.wallet.reservedAura,10);
   await send(a,'competition.start',conditions(l),['competition.state']);assert.equal(a.user.wallet.balanceAura,90);
   if(outcome==='cancelled')await a.demoCancel();else for(let i=0;i<5;i++){
     const key=l.pack.questions[i];const value=outcome==='loss'?(key.question.kind==='single_choice'?'option-4':'wrong'):key.expectedAnswer;
     const accepted=await send(a,'competition.answer',{matchId:l.state.matchId,questionId:l.state.round.question.questionId,answer:{kind:key.question.kind,value}},['competition.answer.accepted']);assert.ok(accepted.answer);assert.ok(!JSON.stringify(l.state).includes('submittedAnswer'));
     a.advance(1300);a.advance(1);assert.equal(l.lastResult.expectedAnswer,key.expectedAnswer);a.advance(3001);
   }
   assert.equal(l.state.settlement.outcome,outcome==='win'||outcome==='loss'?'winner':outcome);
   assert.equal(a.user.wallet.balanceAura,outcome==='win'?110:outcome==='loss'?90:100);assert.equal(a.user.wallet.reservedAura,0);
   const balance=a.user.wallet.balanceAura;a.competition.settle(l);assert.equal(a.user.wallet.balanceAura,balance);
 }finally{a.close();}
});
test('insufficient aura, occupied table, readiness reset and full pre-start return',async()=>{
 const a=await setup();try{let l=await lobby(a);await send(a,'competition.configure',{...conditions(l),subject:'geography_flags',stakeAura:101},['competition.state']);await assert.rejects(send(a,'competition.ready',{...conditions(l),ready:true},['competition.state']),{code:'INSUFFICIENT_AURA'});
 await send(a,'competition.configure',{...conditions(l),subject:'history',stakeAura:10},['competition.state']);await send(a,'competition.ready',{...conditions(l),ready:true},['competition.state']);assert.equal(a.user.wallet.reservedAura,10);
 await send(a,'competition.configure',{...conditions(l),subject:'informatics',stakeAura:12},['competition.state']);assert.equal(a.user.wallet.reservedAura,0);assert.equal(l.state.participants.find(p=>p.playerId===a.playerId).ready,false);
 await send(a,'competition.leave',{tableId:l.state.tableId},['activity.changed']);assert.equal(a.user.wallet.balanceAura,100);
 await a.demoScenario('occupied');await assert.rejects(send(a,'competition.join',{tableId:l.state.tableId},['competition.state']),{code:'SEAT_OCCUPIED'});
 }finally{a.close();}
});
