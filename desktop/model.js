/* Shared by the native app, preview and local bridge. No DOM or Electron dependency. */
(function(root,factory){const model=factory();if(typeof module==='object'&&module.exports)module.exports=model;else root.ReliefTasks=model})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const clone=value=>JSON.parse(JSON.stringify(value));
  const id=()=>globalThis.crypto?.randomUUID?.()||`task-${Date.now()}-${Math.random().toString(36).slice(2,12)}`;
  const dayKey=(date=new Date())=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!isNaN(new Date(s+'T12:00:00').getTime())&&dayKey(new Date(s+'T12:00:00'))===s;
  const validTime=s=>typeof s==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(s);
  const iso=(value,fallback=null)=>{const d=new Date(value);return value&&!isNaN(d.getTime())?d.toISOString():fallback};
  const text=(value,max)=>String(value??'').trim().slice(0,max);
  const number=(v,min,max,fallback)=>Number.isFinite(Number(v))?Math.max(min,Math.min(max,Number(v))):fallback;
  const defaults={theme:'sage',accent:'#718b76',surface:'#fbfaf6',widgetOpacity:.78,widgetAlwaysOnTop:true,widgetLocked:false,widgetClickThrough:false,startAtLogin:false,closeToTray:true,widgetVisible:false,weekStart:1,bridgeEnabled:true};
  function settings(value={}){const s={...defaults,...value};s.theme=['sage','cream','rose','sky','dark','custom'].includes(s.theme)?s.theme:'sage';for(const key of ['accent','surface'])if(!/^#[a-f0-9]{6}$/i.test(s[key]||''))s[key]=defaults[key];s.widgetOpacity=number(s.widgetOpacity,.15,1,.78);for(const key of ['widgetAlwaysOnTop','widgetLocked','widgetClickThrough','startAtLogin','closeToTray','bridgeEnabled','widgetVisible'])s[key]=!!s[key];s.weekStart=s.weekStart===0?0:1;return s}
  function normalizeTask(raw={},now=new Date()){
    const title=text(raw.title,180);if(!title)throw new Error('请填写待办名称');
    if(raw.dueDate&&!validDate(raw.dueDate))throw new Error('截止日期无效');
    if(raw.dueTime&&!validTime(raw.dueTime))throw new Error('截止时间无效');
    const repeat={kind:['daily','weekly','monthly'].includes(raw.repeat?.kind)?raw.repeat.kind:'none',interval:Math.round(number(raw.repeat?.interval,1,365,1))};
    const reminders=(Array.isArray(raw.reminders)?raw.reminders:[]).slice(0,12).map(r=>{const at=iso(r.at);if(!at)throw new Error('提醒时间无效');return{id:text(r.id,100)||id(),at,dismissedAt:iso(r.dismissedAt),snoozeUntil:iso(r.snoozeUntil)}});
    return{id:text(raw.id,100)||id(),title,notes:text(raw.notes,12000),list:text(raw.list,40)||'未分类',tags:[...new Set((Array.isArray(raw.tags)?raw.tags:[]).map(x=>text(x,24)).filter(Boolean))].slice(0,12),priority:Math.round(number(raw.priority,0,3,0)),dueDate:raw.dueDate||null,dueTime:raw.dueDate&&raw.dueTime?raw.dueTime:null,repeat,reminders,subtasks:(Array.isArray(raw.subtasks)?raw.subtasks:[]).slice(0,100).filter(x=>text(x.title,180)).map(x=>({id:text(x.id,100)||id(),title:text(x.title,180),done:!!x.done})),completed:!!raw.completed,completedAt:iso(raw.completedAt),deletedAt:iso(raw.deletedAt),createdAt:iso(raw.createdAt,now.toISOString()),updatedAt:iso(raw.updatedAt,now.toISOString()),order:number(raw.order,0,1e9,now.getTime()%1e9)};
  }
  function normalizeState(raw={},now=new Date()){const tasks=(Array.isArray(raw.tasks)?raw.tasks:[]).slice(0,10000).map(t=>normalizeTask(t,now));const ids=new Set();for(const task of tasks){if(ids.has(task.id))throw new Error('导入数据含重复任务 ID');ids.add(task.id)}const events=(Array.isArray(raw.events)?raw.events:[]).slice(0,5000).map(e=>({id:text(e.id,100)||id(),title:text(e.title,120),date:validDate(e.date)?e.date:null,annual:!!e.annual,color:/^#[a-f0-9]{6}$/i.test(e.color||'')?e.color:'#b8868c',createdAt:iso(e.createdAt,now.toISOString())})).filter(e=>e.title&&e.date);return{schema:1,tasks,events,settings:settings(raw.settings),history:(Array.isArray(raw.history)?raw.history:[]).slice(-2000).map(h=>({taskId:text(h.taskId,100),title:text(h.title,180),date:validDate(h.date)?h.date:dayKey(now),at:iso(h.at,now.toISOString())})),updatedAt:iso(raw.updatedAt,now.toISOString())}}
  function dueTimestamp(task){return task.dueDate?new Date(task.dueDate+'T'+(task.dueTime||'23:59:59')).getTime():Infinity}
  function advanceDate(date,repeat){const d=new Date(date+'T12:00:00'),n=repeat.interval||1;if(repeat.kind==='monthly'){const day=d.getDate();d.setDate(1);d.setMonth(d.getMonth()+n);const end=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();d.setDate(Math.min(day,end))}else d.setDate(d.getDate()+n*(repeat.kind==='weekly'?7:1));return dayKey(d)}
  function rollRecurring(state,now=new Date()){
    const result=clone(state),today=dayKey(now);let changed=false;
    for(const task of result.tasks){if(task.deletedAt||task.repeat.kind==='none'||!task.dueDate||task.dueDate>=today||(!task.completed&&task.repeat.kind!=='daily'))continue;
      const previous=task.dueDate;let iterations=0;while(task.dueDate<today&&iterations++<3660)task.dueDate=advanceDate(task.dueDate,task.repeat);
      const delta=new Date(task.dueDate+'T12:00:00')-new Date(previous+'T12:00:00');task.reminders=task.reminders.map(r=>({...r,at:new Date(new Date(r.at).getTime()+delta).toISOString(),dismissedAt:null,snoozeUntil:null}));task.completed=false;task.completedAt=null;task.subtasks.forEach(t=>t.done=false);task.updatedAt=now.toISOString();changed=true;
    }
    if(changed)result.updatedAt=now.toISOString();return{state:result,changed};
  }
  function mutate(previous,action,now=new Date()){
    const state=normalizeState(previous,now),stamp=now.toISOString();
    if(action.type==='calendar-event-add'){const event={id:id(),title:text(action.event?.title,120),date:validDate(action.event?.date)?action.event.date:null,annual:!!action.event?.annual,color:/^#[a-f0-9]{6}$/i.test(action.event?.color||'')?action.event.color:'#b8868c',createdAt:stamp};if(!event.title||!event.date)throw new Error('请填写纪念日名称和日期');state.events.push(event);state.updatedAt=stamp;return state}
    if(action.type==='calendar-event-delete'){state.events=state.events.filter(event=>event.id!==action.id);state.updatedAt=stamp;return state}
    else if(action.type==='settings'){state.settings=settings({...state.settings,...action.patch});state.updatedAt=stamp;return state}
    if(action.type==='add'){const task=normalizeTask({...action.task,id:id(),order:state.tasks.length},now);state.tasks.push(task)}
    else if(action.type==='reorder'){const order=new Map((action.ids||[]).map((x,i)=>[x,i]));for(const task of state.tasks)if(order.has(task.id))task.order=order.get(task.id)}
    else{
      const index=state.tasks.findIndex(t=>t.id===action.id);if(index<0)throw new Error('找不到这条待办');const task=state.tasks[index];if(action.expectedUpdatedAt&&task.updatedAt!==action.expectedUpdatedAt)throw new Error('这条待办已在另一个窗口更新，请重新打开后编辑');
      if(action.type==='update')state.tasks[index]=normalizeTask({...task,...action.patch,id:task.id,createdAt:task.createdAt,updatedAt:stamp},now);
      else if(action.type==='delete')task.deletedAt=stamp;
      else if(action.type==='restore')task.deletedAt=null;
      else if(action.type==='purge')state.tasks.splice(index,1);
      else if(['toggle','complete','uncomplete'].includes(action.type)){
        const complete=action.type==='toggle'?!task.completed:action.type==='complete';
        if(complete&&!task.completed){state.history.push({taskId:task.id,title:task.title,date:task.dueDate||dayKey(now),at:stamp});task.subtasks.forEach(s=>s.done=true)}
        task.completed=complete;task.completedAt=complete?stamp:null;
        if(complete)task.reminders.forEach(r=>r.dismissedAt=stamp);else task.reminders.forEach(r=>{r.dismissedAt=null;r.snoozeUntil=null});
      }else throw new Error('不支持的操作');
      if(action.type!=='purge'&&state.tasks[index])state.tasks[index].updatedAt=stamp;
    }
    state.history=state.history.slice(-2000);state.updatedAt=stamp;return state;
  }
  function dueReminders(state,now=new Date()){
    const list=[];for(const task of state.tasks){if(task.deletedAt||task.completed)continue;for(const reminder of task.reminders){if(reminder.dismissedAt)continue;const at=reminder.snoozeUntil||reminder.at;if(new Date(at).getTime()<=now.getTime())list.push({id:task.id+':'+reminder.id,taskId:task.id,reminderId:reminder.id,title:task.title,list:task.list,dueDate:task.dueDate,dueTime:task.dueTime,remindAt:at,priority:task.priority})}}return list.sort((a,b)=>new Date(a.remindAt)-new Date(b.remindAt)).slice(0,50);
  }
  function acknowledge(state,reminderId,kind,minutes=10,now=new Date()){
    let notification=null;for(const task of state.tasks){for(const reminder of task.reminders){if(task.id+':'+reminder.id===reminderId&&!task.deletedAt){notification={taskId:task.id,reminderId:reminder.id};break}}if(notification)break}if(!notification){if(kind==='complete')return clone(state);throw new Error('提醒已处理或不存在')}
    if(kind==='complete')return mutate(state,{type:'complete',id:notification.taskId},now);
    const result=clone(state),task=result.tasks.find(t=>t.id===notification.taskId),reminder=task.reminders.find(r=>r.id===notification.reminderId);
    if(kind==='snooze')reminder.snoozeUntil=new Date(now.getTime()+number(minutes,1,120,10)*60000).toISOString();else if(kind==='dismiss')reminder.dismissedAt=now.toISOString();else throw new Error('提醒操作无效');task.updatedAt=now.toISOString();result.updatedAt=now.toISOString();return result;
  }
  return{clone,id,dayKey,validDate,validTime,defaults,settings,normalizeTask,normalizeState,dueTimestamp,advanceDate,rollRecurring,mutate,dueReminders,acknowledge};
});
