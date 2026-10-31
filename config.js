/* Shared local preferences. No remote service or API key is required. */
(()=>{
  const defaults={water:45,rest:50,snooze:10,focus:true,waterFocusSeconds:5,restFocusSeconds:10,waitForReply:true,focusConfigured:true,mascot:'mobile',enabled:true,hideMode:'',hideDuration:'session',hideUntil:0,position:null,targetName:'每日傻瓜QA',targetUrl:'https://chatgpt.com/g/g-p-6a269f02b970819190bf64fb82822526/c/6ae34419-307c-83ea-8cea-669b03555e15'};
  const number=(v,min,max,fallback)=>v===''||v===null||!Number.isFinite(Number(v))?fallback:Math.max(min,Math.min(max,Math.round(Number(v))));
  function conversationUrl(value){try{const url=new URL(value);if(!['chatgpt.com','chat.openai.com'].includes(url.hostname)||url.protocol!=='https:'||!/^\/(?:g\/[^/]+\/)?c\/[a-z0-9-]+\/?$/i.test(url.pathname))return null;return 'https://chatgpt.com'+url.pathname.replace(/\/$/,'')}catch{return null}}
  function normalize(values={}){const p={...defaults,...values};for(const k of ['water','rest'])p[k]=number(p[k],1,240,defaults[k]);p.snooze=number(p.snooze,1,120,10);for(const k of ['waterFocusSeconds','restFocusSeconds'])p[k]=number(p[k],1,600,defaults[k]);p.targetUrl=conversationUrl(p.targetUrl)||defaults.targetUrl;p.targetName=String(p.targetName||defaults.targetName).trim().slice(0,40);return p}
  globalThis.ReliefConfig={version:'1.2.0',defaults,number,normalize,conversationUrl};
})();
