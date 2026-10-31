const status=document.getElementById('status');
let browserScopeEnabled=false;
const scopeButton=document.getElementById('scope');
function renderScope(){scopeButton.setAttribute('aria-checked',String(browserScopeEnabled));document.getElementById('scopeSummary').textContent=browserScopeEnabled?'普通网页均可显示':'仅在 ChatGPT 显示'}
ReliefScope.enabled().then(value=>{browserScopeEnabled=value;renderScope();scopeButton.disabled=false}).catch(()=>{scopeButton.disabled=false});
scopeButton.addEventListener('click',async()=>{if(scopeButton.disabled)return;scopeButton.disabled=true;status.textContent='';try{const result=await ReliefScope.setEnabled(!browserScopeEnabled);if(result.ok)browserScopeEnabled=result.enabled;status.textContent=result.message||'';renderScope()}catch{status.textContent='显示范围修改失败，请重试。'}finally{scopeButton.disabled=false}});
const EXPECTED_CONTENT_VERSION=ReliefConfig.version;
function reportResult(response,command){
  if(response?.version!==EXPECTED_CONTENT_VERSION){status.textContent='当前页面还没有加载最新 Relief。请先刷新 ChatGPT 页面，再打开 Relief。';return}
  if(!response.ok||!response.visible){status.textContent='Relief 已尝试显示，但页面没有确认到可见界面。请重新加载扩展后刷新 ChatGPT。';return}
  status.textContent=command==='settings'?'提醒设置已显示。':'陪伴形象已显示。';
}
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function send(command){
  const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
  if(!tab?.id||!ReliefConfig.isWebPage(tab.url)||(!ReliefConfig.isChatGPT(tab.url)&&!browserScopeEnabled)){
    if(command==='settings'){await chrome.runtime.openOptionsPage();return}status.textContent=browserScopeEnabled?'已恢复普通网页的形象；当前页面不支持注入。':'请打开 ChatGPT，或开启全页面陪伴。';return;
  }
  status.textContent='正在连接…';
  let injected=false,response;
  try{
    for(let attempt=0;attempt<3;attempt++){
      try{
        response=await chrome.tabs.sendMessage(tab.id,{type:'xiaoqi-command',command});
        if(response?.version===EXPECTED_CONTENT_VERSION&&response.ok&&response.visible){reportResult(response,command);return}
        if(response?.version&&response.version!==EXPECTED_CONTENT_VERSION)break;
      }catch(error){
        if(injected)throw error;
        await chrome.scripting.executeScript({target:{tabId:tab.id},files:['config.js','content.js']});
        injected=true;
      }
      await wait(150);
    }
    if(command==='settings'){await chrome.runtime.openOptionsPage();status.textContent='已打开陪伴设置。';return}reportResult(response,command);
  }catch(error){
    if(command==='settings'){await chrome.runtime.openOptionsPage();return}status.textContent='请刷新 ChatGPT 页面后重试。';
  }
}
document.getElementById('toggle').addEventListener('click',async()=>{try{await chrome.runtime.sendMessage({type:'relief-show-everywhere'});await send('show')}catch{status.textContent='无法显示形象，请重新加载扩展。'}});
document.getElementById('settings').addEventListener('click',()=>send('settings'));
