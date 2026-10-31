importScripts('config.js','state.js');
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let stateQueue=Promise.resolve();
async function stateAction(action,sender){
  const values=await chrome.storage.local.get([...Object.keys(ReliefConfig.defaults),'reliefState','reliefDailyActiveTimer']);
  const prefs=ReliefConfig.normalize(values),day=ReliefState.dayKey();
  let previous=values.reliefState;
  if(!previous){previous=ReliefState.fresh(day);if(values.reliefDailyActiveTimer?.date===day)previous.seconds=Math.max(0,Math.min(86400,Number(values.reliefDailyActiveTimer.seconds)||0))}
  const state=ReliefState.transition(previous,action,prefs,{now:Date.now(),day,tabId:sender.tab?.id??null});
  await chrome.storage.local.set({reliefState:state});
  return{ok:true,state,tabId:sender.tab?.id??null};
}
async function targetTab(targetUrl){
  const conversation=targetUrl.match(/\/c\/([^/]+)/)?.[1];
  const tabs=await chrome.tabs.query({url:'https://chatgpt.com/*'});
  const existing=tabs.find(tab=>tab.url?.includes('/c/'+conversation));
  if(existing?.id!==undefined)return chrome.tabs.update(existing.id,{active:true});
  return chrome.tabs.create({url:targetUrl,active:true});
}
let sendQueue=Promise.resolve();
async function sendToTarget(text,requestId){
  const values=await chrome.storage.local.get([...Object.keys(ReliefConfig.defaults),'reliefOutbox']);
  const prefs=ReliefConfig.normalize(values),outbox=values.reliefOutbox||{};
  const previous=outbox[requestId];
  if(previous?.status==='sent')return{ok:true};
  if(['uncertain','dispatching'].includes(previous?.status))throw new Error('上次提交结果尚未确认，请先查看目标会话，避免重复发送。');
  outbox[requestId]={status:'pending',at:Date.now()};
  for(const [id,entry]of Object.entries(outbox))if(Date.now()-entry.at>86400000)delete outbox[id];
  await chrome.storage.local.set({reliefOutbox:outbox});
  const tab=await targetTab(prefs.targetUrl);
  let lastError='目标会话尚未准备好。';
  for(let attempt=0;attempt<24;attempt++){
    if(attempt)await wait(750);
    let handshake;
    try{handshake=await chrome.tabs.sendMessage(tab.id,{type:'relief-ready'})}catch{lastError='正在等待目标页面脚本…';continue}
    if(handshake?.version!==ReliefConfig.version){lastError='目标页面需要刷新以加载新版 Relief。';continue}
    outbox[requestId]={status:'dispatching',at:Date.now()};await chrome.storage.local.set({reliefOutbox:outbox});
    let result;
    try{result=await chrome.tabs.sendMessage(tab.id,{type:'relief-insert-daily-qa',text,requestId,targetUrl:prefs.targetUrl})}catch{outbox[requestId]={status:'uncertain',at:Date.now()};await chrome.storage.local.set({reliefOutbox:outbox});throw new Error('连接在提交过程中断开，请先检查目标会话，避免重复发送。')}
    if(!result){outbox[requestId]={status:'uncertain',at:Date.now()};await chrome.storage.local.set({reliefOutbox:outbox});throw new Error('目标页面未确认提交，请先检查会话。')}
    if(result?.ok){outbox[requestId]={status:'sent',at:Date.now()};await chrome.storage.local.set({reliefOutbox:outbox});return{ok:true}}
    lastError=result?.message||lastError;
    if(result?.retryable){outbox[requestId]={status:'pending',at:Date.now()};await chrome.storage.local.set({reliefOutbox:outbox})}
    if(result?.retryable===false){outbox[requestId]={status:result.uncertain?'uncertain':'failed',at:Date.now()};await chrome.storage.local.set({reliefOutbox:outbox});throw new Error(lastError)}
  }
  throw new Error(lastError+' 请检查目标会话。');
}
chrome.runtime.onMessage.addListener((message,sender,sendResponse)=>{
  if(message?.type==='relief-state'){
    const action=message.action||{};
    if(!['tick','manual','complete','snooze','pause','resume','read'].includes(action.kind)){sendResponse({ok:false});return}
    if(['pause'].includes(action.kind))action.minutes=ReliefConfig.number(action.minutes,1,120,30);
    const job=stateQueue.then(()=>stateAction(action,sender));stateQueue=job.catch(()=>{});job.then(sendResponse).catch(()=>sendResponse({ok:false}));return true;
  }
  if(message?.type!=='relief-send-daily-qa')return;
  if(!/^https:\/\/(chatgpt\.com|chat\.openai\.com)\//.test(sender.tab?.url||'')){sendResponse({ok:false,message:'请从 ChatGPT 页面使用快速聊天。'});return}
  const text=typeof message.text==='string'?message.text.trim():'';
  if(!text||text.length>4000){sendResponse({ok:false,message:'请输入 1–4000 个字符。'});return}
  const requestId=typeof message.requestId==='string'?message.requestId:crypto.randomUUID();
  const job=sendQueue.then(()=>sendToTarget(text,requestId));sendQueue=job.catch(()=>{});
  job.then(sendResponse).catch(error=>sendResponse({ok:false,message:error.message||'发送失败，请重试。'}));return true;
});
