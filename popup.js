const status=document.getElementById('status');
const EXPECTED_CONTENT_VERSION='1.0.6';
function reportResult(response,command){
  if(response?.version!==EXPECTED_CONTENT_VERSION){status.textContent='当前页面还没有加载最新 Relief。请先刷新 ChatGPT 页面，再打开 Relief。';return}
  if(!response.ok||!response.visible){status.textContent='页面收到操作，但界面没有显示出来。请刷新 ChatGPT 页面后重试。';return}
  status.textContent=command==='settings'?'提醒设置已显示。':'陪伴形象已显示。';
}
async function send(command){
  const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
  if(!tab?.id||!/^https:\/\/(chatgpt\.com|chat\.openai\.com)\//.test(tab.url||'')){
    status.textContent='请先打开 ChatGPT 页面。';return;
  }
  status.textContent='正在连接…';
  try{
    const response=await chrome.tabs.sendMessage(tab.id,{type:'xiaoqi-command',command});
    reportResult(response,command);
    return;
  }catch{}
  try{
    await chrome.scripting.executeScript({target:{tabId:tab.id},files:['content.js']});
    const response=await chrome.tabs.sendMessage(tab.id,{type:'xiaoqi-command',command});
    reportResult(response,command);
  }catch(error){
    status.textContent='无法确认页面组件已更新。请刷新 ChatGPT 页面后重试。';
  }
}
document.getElementById('toggle').addEventListener('click',()=>send('show'));
document.getElementById('settings').addEventListener('click',()=>send('settings'));
