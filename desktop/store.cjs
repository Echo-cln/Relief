const fs=require('node:fs/promises');const path=require('node:path');const Model=require('./model.js');
class TaskStore{
 constructor(directory,seed){this.directory=directory;this.file=path.join(directory,'tasks.json');this.seed=seed;this.state=null;this.queue=Promise.resolve();this.listeners=new Set();this.recovered=false}
 async load(){await fs.mkdir(this.directory,{recursive:true});try{this.state=Model.normalizeState(JSON.parse(await fs.readFile(this.file,'utf8')))}catch(error){if(error.code!=='ENOENT'){const backups=(await fs.readdir(this.directory)).filter(x=>/^backup-.*\.json$/.test(x)).sort().reverse();for(const backup of backups){try{this.state=Model.normalizeState(JSON.parse(await fs.readFile(path.join(this.directory,backup),'utf8')));this.recovered=true;break}catch{}}await fs.copyFile(this.file,this.file+'.corrupt-'+Date.now()).catch(()=>{})}if(!this.state)this.state=Model.normalizeState(this.seed)}const rolled=Model.rollRecurring(this.state);this.state=rolled.state;await this.write();return this.get()}
 get(){return Model.clone(this.state)}
 onChange(fn){this.listeners.add(fn);return()=>this.listeners.delete(fn)}
 async write(){const date=Model.dayKey();const backup=path.join(this.directory,`backup-${date}.json`);try{await fs.copyFile(this.file,backup,fs.constants?.COPYFILE_EXCL||1)}catch(error){if(!['ENOENT','EEXIST'].includes(error.code))throw error}const temporary=this.file+'.tmp';const handle=await fs.open(temporary,'w',0o600);try{await handle.writeFile(JSON.stringify(this.state,null,2));await handle.sync()}finally{await handle.close()}await fs.rename(temporary,this.file);const backups=(await fs.readdir(this.directory)).filter(x=>/^backup-.*\.json$/.test(x)).sort().reverse();await Promise.all(backups.slice(7).map(file=>fs.unlink(path.join(this.directory,file))))}
 transaction(change){const result=this.queue.then(async()=>{const before=this.state;const next=Model.normalizeState(await change(this.get()));this.state=next;try{await this.write()}catch(error){this.state=before;throw error}const snapshot=this.get();for(const listener of this.listeners)listener(snapshot);return snapshot});this.queue=result.catch(()=>{});return result}
 command(action){return this.transaction(state=>Model.mutate(state,action))}
 roll(){return this.transaction(state=>Model.rollRecurring(state).state)}
}
module.exports={TaskStore};
