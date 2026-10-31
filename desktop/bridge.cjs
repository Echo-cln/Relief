const http=require('node:http');const crypto=require('node:crypto');const Model=require('./model.js');
const PORT=43821;
function createBridge({store,token,port=PORT,openTask=()=>{},onPoll=()=>{},getStatus=()=>({})}){
 const equal=value=>{const a=Buffer.from(String(value||'')),b=Buffer.from('Bearer '+token);return a.length===b.length&&crypto.timingSafeEqual(a,b)};
 const server=http.createServer(async(req,res)=>{
  const origin=req.headers.origin;
  const json=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data))};
  if(req.headers.host!==`127.0.0.1:${server.address()?.port}`&&req.headers.host!==`localhost:${server.address()?.port}`)return json(403,{error:'Host not allowed'});
  if(origin&&!/^chrome-extension:\/\/[a-p]{32}$/.test(origin))return json(403,{error:'Origin not allowed'});
  if(origin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin')}
  if(req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Max-Age':'600'});return res.end()}
  if(req.url==='/health'&&req.method==='GET')return json(200,{app:'Relief Desktop',version:'0.2.0'});
  if(!equal(req.headers.authorization))return json(401,{error:'Connection code required'});
  if(!store.state.settings.bridgeEnabled)return json(403,{error:'Browser bridge is disabled'});
  try{
   if(req.method==='GET'&&req.url==='/v1/status')return json(200,{app:'Relief Desktop',version:'0.2.0',taskCount:store.state.tasks.filter(t=>!t.deletedAt&&!t.completed).length,...getStatus()});
   if(req.method==='GET'&&req.url==='/v1/reminders/due'){onPoll();return json(200,{reminders:Model.dueReminders(store.get())})}
   if(req.method!=='POST')return json(404,{error:'Not found'});
   let body='',large=false;for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>16384){large=true;break}}if(large)return json(413,{error:'Request too large'});
   const data=body?JSON.parse(body):{};
   if(req.url==='/v1/reminders/action'){
    if(!['complete','snooze','dismiss'].includes(data.action)||typeof data.id!=='string')return json(400,{error:'Invalid reminder action'});
    await store.transaction(state=>Model.acknowledge(state,data.id,data.action,data.minutes));return json(200,{ok:true});
   }
   if(req.url==='/v1/tasks/open'&&typeof data.id==='string'){if(!store.state.tasks.some(t=>t.id===data.id&&!t.deletedAt))return json(404,{error:'Task not found'});openTask(data.id);return json(200,{ok:true})}
   return json(404,{error:'Not found'});
  }catch(error){return json(400,{error:error.message||'Invalid request'})}
 });
 return{server,start:()=>new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',()=>{server.removeListener('error',reject);resolve(server.address())})}),stop:()=>new Promise(resolve=>server.close(resolve))};
}
module.exports={createBridge,PORT};
