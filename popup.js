const status=document.getElementById('status');
async function send(command){
  const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
  if(!tab?.id||!/^https:\/\/(chatgpt\.com|chat\.openai\.com)\//.test(tab.url||'')){
    status.textContent='请先打开 ChatGPT 页面。';return;
  }
  status.textContent='正在连接…';
  try{
    const response=await chrome.tabs.sendMessage(tab.id,{type:'xiaoqi-command',command});
    status.textContent=response?.ok?(command==='settings'?'提醒设置已打开。':'陪伴形象已显示。'):'操作已发送；页面没有变化时，请刷新 ChatGPT 后重试。';
    return;
  }catch{}
  try{
    await chrome.scripting.executeScript({target:{tabId:tab.id},files:['content.js']});
    const response=await chrome.tabs.sendMessage(tab.id,{type:'xiaoqi-command',command});
    status.textContent=response?.ok?(command==='settings'?'提醒设置已打开。':'陪伴形象已显示。'):'已启动；页面没有变化时，请刷新 ChatGPT。';
  }catch(error){
    status.textContent='无法连接 ChatGPT 页面。请确认已允许此扩展访问 chatgpt.com，再刷新页面重试。';
  }
}
document.getElementById('toggle').addEventListener('click',()=>send('show'));
document.getElementById('settings').addEventListener('click',()=>send('settings'));
