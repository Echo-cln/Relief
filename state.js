/* Pure transitions: one persisted counter and two independent reminder schedules. */
(()=>{
  const dayKey=(date=new Date())=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  function fresh(day){return{day,seconds:0,progress:{water:0,rest:0},counts:{water:0,rest:0},snoozeUntil:{water:0,rest:0},intervals:{},pending:null,lastSlot:null,nextAllowedAt:0,pauseUntil:0,dueSince:0}}
  function transition(previous,action,prefs,context){
    const {now,day,tabId}=context;
    const state=previous?.day===day?JSON.parse(JSON.stringify(previous)):fresh(day);
    for(const type of ['water','rest']){if(state.intervals[type]&&state.intervals[type]!==prefs[type])state.progress[type]=0;state.intervals[type]=prefs[type]}
    if(action.kind==='pause'){state.pauseUntil=now+action.minutes*60000;state.pending=null}
    if(action.kind==='resume')state.pauseUntil=0;
    const matches=state.pending&&state.pending.id===action.id;
    if(matches&&['complete','snooze'].includes(action.kind)){
      const type=state.pending.type;state.pending=null;state.progress[type]=0;state.dueSince=0;state.nextAllowedAt=now+20000;
      if(action.kind==='complete'){state.counts[type]++;state.snoozeUntil[type]=0}else state.snoozeUntil[type]=now+prefs.snooze*60000;
    }
    if(action.kind==='manual'&&!state.pending&&['water','rest'].includes(action.type))state.pending={id:`${now}-${action.type}`,type:action.type,startedAt:now,tabId,lastSeen:now};
    if(action.kind==='tick'){
      const slot=Math.floor(now/1000);
      if(action.active&&slot!==state.lastSlot){state.lastSlot=slot;state.seconds++;if(now>=state.pauseUntil&&!state.pending)for(const type of ['water','rest'])if(!state.snoozeUntil[type])state.progress[type]++}
      if(state.pending){
        if(state.pending.tabId===tabId){if(action.visible)state.pending.lastSeen=now;else state.pending.tabId=null}
        if(action.allowReminder&&action.visible&&(state.pending.tabId===null||now-state.pending.lastSeen>5000)){state.pending.tabId=tabId;state.pending.lastSeen=now}
      }else if(action.visible&&action.allowReminder&&now>=state.pauseUntil&&now>=state.nextAllowedAt){
        const due=['water','rest'].filter(type=>state.snoozeUntil[type]?now>=state.snoozeUntil[type]:state.progress[type]>=prefs[type]*60);
        if(due.length){if(!state.dueSince)state.dueSince=now;if(!prefs.waitForReply||!action.generating||now-state.dueSince>=60000){const type=due.sort((a,b)=>state.progress[b]-prefs[b]*60-(state.progress[a]-prefs[a]*60))[0];state.pending={id:`${now}-${type}`,type,startedAt:now,tabId,lastSeen:now}}}else state.dueSince=0;
      }
    }
    return state;
  }
  globalThis.ReliefState={dayKey,fresh,transition};
  if(typeof module!=='undefined')module.exports=globalThis.ReliefState;
})();
