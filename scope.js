/* Runs only in extension pages so optional access is requested from a direct click. */
(()=>{
  const origins=['http://*/*','https://*/*'];
  async function setEnabled(enabled){
    if(enabled){const granted=await chrome.permissions.request({origins});if(!granted)return{ok:false,enabled:false,message:'未授权，仍仅在 ChatGPT 显示。'}}
    const result=await chrome.runtime.sendMessage({type:'relief-set-scope',enabled});
    if(!result?.ok){if(enabled)await chrome.permissions.remove({origins}).catch(()=>{});return{ok:false,enabled:false,message:result?.message||'显示范围设置失败，请重试。'}}
    if(!enabled){try{const removed=await chrome.permissions.remove({origins});if(!removed)return{...result,message:'已关闭全页面陪伴；可在扩展管理页检查站点权限。'}}catch{return{...result,message:'已关闭全页面陪伴；可在扩展管理页检查站点权限。'}}}
    return result;
  }
  async function enabled(){const stored=await chrome.storage.local.get('allSitesEnabled');return !!stored.allSitesEnabled&&await chrome.permissions.contains({origins})}
  globalThis.ReliefScope={origins,setEnabled,enabled};
})();
