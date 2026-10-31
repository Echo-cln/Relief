/* Optional site access and dynamic injection, owned by the extension worker. */
(()=>{
  const id='relief-browser-companion',origins=['http://*/*','https://*/*'];
  let queue=Promise.resolve();
  const enqueue=job=>{const next=queue.then(job);queue=next.catch(()=>{});return next};
  async function injectOpenTabs(){
    const tabs=await chrome.tabs.query({url:origins});
    await Promise.allSettled(tabs.filter(tab=>tab.id!==undefined&&ReliefConfig.isWebPage(tab.url)).map(async tab=>{
      await chrome.scripting.executeScript({target:{tabId:tab.id},files:['config.js','content.js']});
    }));
  }
  async function removeOpenTabs(){const tabs=await chrome.tabs.query({url:origins});await Promise.allSettled(tabs.filter(tab=>tab.id!==undefined&&ReliefConfig.isWebPage(tab.url)&&!ReliefConfig.isChatGPT(tab.url)).map(tab=>chrome.scripting.executeScript({target:{tabId:tab.id},func:()=>document.getElementById('xiaoqi-companion-host')?.remove()})))}
  async function reconcile(inject=false){
    const pref=await chrome.storage.local.get('allSitesEnabled');
    const granted=await chrome.permissions.contains({origins});
    const enabled=!!pref.allSitesEnabled&&granted;
    const scripts=await chrome.scripting.getRegisteredContentScripts({ids:[id]});
    const hadBrowserScope=granted||pref.allSitesEnabled||scripts.length>0;
    if(enabled){
      const script={id,matches:origins,excludeMatches:['https://chatgpt.com/*','https://chat.openai.com/*'],js:['config.js','content.js'],runAt:'document_idle',allFrames:false,persistAcrossSessions:true};
      if(scripts.length)await chrome.scripting.updateContentScripts([script]);else await chrome.scripting.registerContentScripts([script]);
      if(inject)await injectOpenTabs();
    }else{
      if(scripts.length)await chrome.scripting.unregisterContentScripts({ids:[id]});
      if(granted)await removeOpenTabs();
      if(pref.allSitesEnabled)await chrome.storage.local.set({allSitesEnabled:false});
      if(hadBrowserScope){const tabs=await chrome.tabs.query({});await Promise.allSettled(tabs.filter(tab=>tab.id!==undefined).map(tab=>chrome.tabs.sendMessage(tab.id,{type:'relief-scope-disabled'})))}
    }
    return{ok:true,enabled};
  }
  async function setEnabled(enabled){return enqueue(async()=>{
    if(enabled&&!await chrome.permissions.contains({origins}))return{ok:false,enabled:false,message:'请先允许普通网页访问权限。'};
    await chrome.storage.local.set({allSitesEnabled:!!enabled});
    try{return await reconcile(!!enabled)}catch{await chrome.storage.local.set({allSitesEnabled:false});await reconcile(false).catch(()=>{});return{ok:false,enabled:false,message:'无法启用全页面陪伴，请检查扩展的站点权限。'}}
  })}
  async function showEverywhere(){
    await chrome.storage.local.set({enabled:true,hideMode:'',hideUntil:0});
    const {allSitesEnabled}=await chrome.storage.local.get('allSitesEnabled');
    const enabled=!!allSitesEnabled&&await chrome.permissions.contains({origins});
    if(enabled)await enqueue(()=>reconcile(true));
    const tabs=await chrome.tabs.query({url:enabled?origins:['https://chatgpt.com/*','https://chat.openai.com/*']});
    await Promise.allSettled(tabs.filter(tab=>tab.id!==undefined&&ReliefConfig.isWebPage(tab.url)).map(tab=>chrome.tabs.sendMessage(tab.id,{type:'xiaoqi-command',command:'show'})));
    return{ok:true,enabled};
  }
  function install(){
    chrome.runtime.onInstalled?.addListener(()=>enqueue(()=>reconcile(true)).catch(()=>{}));
    chrome.runtime.onStartup?.addListener(()=>enqueue(()=>reconcile(false)).catch(()=>{}));
    chrome.permissions.onRemoved?.addListener(()=>enqueue(()=>reconcile(false)).catch(()=>{}));
    chrome.storage.onChanged?.addListener((changes,area)=>{if(area==='local'&&changes.allSitesEnabled&&changes.allSitesEnabled.oldValue!==changes.allSitesEnabled.newValue)enqueue(()=>reconcile(false)).catch(()=>{})});
    enqueue(()=>reconcile(false)).catch(()=>{});
  }
  globalThis.ReliefScopeManager={origins,id,setEnabled,showEverywhere,reconcile,install};
})();
