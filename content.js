(()=>{
  if(document.getElementById('xiaoqi-companion-host'))return;
  const host=document.createElement('div');host.id='xiaoqi-companion-host';document.documentElement.append(host);
  const shadow=host.attachShadow({mode:'open'});
  const assets={pets:'assets/pet-pair-idle.png',sun:'assets/sun-mascot.png',star:'assets/mascot-star.png',cloud:'assets/mascot-cloud.png',moon:'assets/mascot-moon.png',mobile:'assets/mascot-mobile.png'};
  const defaults={water:45,rest:50,snooze:10,focus:false,mascot:'pets',enabled:true,hideMode:'',hideDuration:'session',hideUntil:0,position:null};
  let prefs={...defaults},activeSeconds=0,lastActivity=Date.now(),paused=false,reminderType='water',snooze=null,focusTimeout=null,initialization=Promise.resolve();
  const due={water:defaults.water*60,rest:defaults.rest*60};
  const asset=name=>chrome.runtime.getURL(assets[name]);
  shadow.innerHTML=`
    <style>
      :host{all:initial;position:fixed;inset:0;z-index:2147483647;pointer-events:none;color:#202020;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;font-size:14px;line-height:1.5}
      *{box-sizing:border-box}button,input,select{font:inherit;color:inherit}button{cursor:pointer}
      .shade{display:none;position:fixed;inset:0;z-index:1;background:#393a3838;backdrop-filter:grayscale(.22) brightness(.78);pointer-events:auto;animation:fade .18s ease-out}.shade.show{display:block}
      .dock{position:absolute;right:20px;bottom:18px;z-index:2;display:flex;align-items:flex-end;gap:7px;pointer-events:none;touch-action:none}.dock>*{pointer-events:auto}
      .pet-area{width:82px;height:91px;position:relative;display:grid;place-items:center;cursor:grab;touch-action:none;user-select:none}.pet-area.dragging{cursor:grabbing}.pet{position:absolute;inset:0;width:100%;height:100%;padding:0;border:0;background:transparent;filter:drop-shadow(0 3px 5px #0002);touch-action:none}
      .pair-art{position:absolute;left:0;top:0;width:82px;height:74px;background:url('${asset('pets')}') no-repeat 0 0/492px 74px;animation:bob 3.2s ease-in-out infinite}
      .single-art{display:none;position:absolute;inset:2px;width:78px;height:72px;object-fit:contain;padding:2px;animation:bob 3.2s ease-in-out infinite}
      .name{position:absolute;left:50%;bottom:0;transform:translateX(-50%);padding:2px 7px;border:1px solid #e8e8e8;border-radius:999px;background:#ffffffed;color:#686868;font-size:9px;white-space:nowrap;pointer-events:none}
      .pair-hit,.mobile-hit{display:none;position:absolute;z-index:3;border:1px solid transparent;border-radius:18px;padding:0;background:transparent;touch-action:manipulation}
      .pair-hit{top:1px;height:76px;width:48%}.pair-hit.water{left:0}.pair-hit.rest{right:0}
      .pair-hit:hover,.pair-hit:focus-visible,.mobile-hit:hover,.mobile-hit:focus-visible{background:#ffffff28;border-color:#ffffffb0;outline:none}
      .pair-hit:after{content:attr(data-hint);position:absolute;left:50%;bottom:0;transform:translate(-50%,4px);padding:3px 7px;border:1px solid #e8e5dd;border-radius:999px;background:#ffffffed;color:#666;font-size:9px;line-height:1.2;white-space:nowrap;opacity:0;transition:.15s;pointer-events:none}
      .pair-hit:hover:after,.pair-hit:focus-visible:after{opacity:1;transform:translate(-50%,0)}
      .mobile-art{display:none;position:absolute;inset:0;width:100%;height:100%;object-fit:contain;pointer-events:none}.mobile-hit{width:32%;height:28%;border-radius:50%}.mobile-hit.moon{left:13%;top:38%}.mobile-hit.cloud{right:10%;top:39%}.mobile-hit.star{left:34%;bottom:5%}
      .badge{position:absolute;right:-1px;top:2px;color:#e7bf70;font-size:13px;animation:twinkle 2s ease-in-out infinite;pointer-events:none}
      .timer{display:flex;align-items:center;gap:5px;margin-bottom:3px;padding:4px 8px;border:1px solid #e8e8e8;border-radius:999px;background:#ffffffed;color:#777;font-size:10px;white-space:nowrap}
      .dot{width:6px;height:6px;border-radius:50%;background:#79a58a}.timer strong{color:#4c6856;font-weight:600}
      .icon-button{width:29px;height:29px;margin-bottom:4px;border:1px solid #e8e8e8;border-radius:50%;background:#ffffffed;color:#777;font-size:13px;box-shadow:0 2px 8px #0000000a}.icon-button:hover{background:#f6f8f5}
      .card{display:none;position:absolute;right:15px;bottom:118px;z-index:3;width:310px;padding:14px 15px 13px;border:1px solid #e5e5e5;border-radius:18px;background:#fff;box-shadow:0 8px 26px #0002;pointer-events:auto;animation:arrive .2s ease-out;transform-origin:bottom right}
      .card.show{display:block}.card-head{display:flex;align-items:center;gap:10px}.card-avatar{width:44px;height:44px;flex:none;border-radius:14px;background:#fff4ef;object-fit:contain;padding:3px}.card-copy{min-width:0}.eyebrow{color:#888;font-size:10px}.card h2{margin:1px 0 0;font-size:15px;line-height:1.3;letter-spacing:-.2px;font-weight:650}.close{margin-left:auto;align-self:flex-start;width:25px;height:25px;border:0;border-radius:50%;background:transparent;color:#999;font-size:19px;line-height:1}.close:hover{background:#f4f4f4}
      .card p{margin:10px 0 0;color:#686868;font-size:12px;line-height:1.5}.actions{display:flex;gap:7px;margin-top:12px}.actions button{height:34px;padding:0 12px;border-radius:999px;font-size:11px;font-weight:550}.primary{border:0;background:#111;color:#fff}.primary:hover{background:#333}.secondary{border:1px solid #e3e3e3;background:#fff;color:#444}.secondary:hover{background:#f7f7f7}.actions button[hidden]{display:none}.primary.ready{animation:arrive .22s ease-out}
      .settings-cover{display:none;position:fixed;inset:0;z-index:10;align-items:center;justify-content:center;padding:16px;background:#0003;backdrop-filter:blur(2px);pointer-events:auto}.settings-cover.show{display:flex}
      .settings{width:min(390px,calc(100vw - 28px));max-height:88vh;overflow:auto;padding:17px;border:1px solid #e5e5e5;border-radius:19px;background:#fff;box-shadow:0 18px 60px #0003}.settings-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}.settings-head strong{font-size:17px;letter-spacing:-.3px}.settings-head button{width:28px;height:28px;border:0;border-radius:50%;background:#f5f5f5;color:#666;font-size:18px}
      .tabs{display:flex;gap:4px;padding:3px;border-radius:10px;background:#f3f3f3;margin-bottom:8px}.tabs button{flex:1;padding:7px;border:0;border-radius:8px;background:transparent;color:#777;font-size:12px}.tabs button[aria-selected=true]{background:#fff;color:#222;box-shadow:0 1px 3px #0002}
      .pane[hidden]{display:none}.row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 0;border-bottom:1px solid #f0f0f0;color:#555;font-size:12px}.row:last-child{border-bottom:0}.number{display:flex;align-items:center;gap:7px}.number input{width:68px;height:34px;border:1px solid #ddd;border-radius:10px;padding:0 8px;text-align:center;background:#fff;outline:none}.unit{color:#888;font-size:11px}
      .switch{position:relative;width:36px;height:21px;flex:none;border:0;border-radius:999px;background:#c9c9c9;transition:.18s}.switch:after{content:"";position:absolute;left:2px;top:2px;width:17px;height:17px;border-radius:50%;background:white;box-shadow:0 1px 2px #0002;transition:.18s}.switch[aria-checked=true]{background:#111}.switch[aria-checked=true]:after{left:17px}
      .choices{display:grid;grid-template-columns:1fr 1fr;gap:7px}.choice{display:flex;align-items:center;gap:8px;min-width:0;padding:7px;border:1px solid #e8e8e8;border-radius:12px;background:#fff;text-align:left}.choice[aria-pressed=true]{border-color:#8ba493;background:#f6faf6}.choice img{width:38px;height:38px;flex:none;object-fit:contain;border-radius:11px;background:#f6f7f5;padding:2px}.choice strong{overflow:hidden;font-size:11px;text-overflow:ellipsis;white-space:nowrap;font-weight:550}.visibility{margin-top:10px;border-top:1px solid #eee}.select{height:31px;padding:0 8px;border:1px solid #ddd;border-radius:9px;background:#fff;font-size:11px}.hide-button{padding:7px 0;border:0;background:transparent;color:#777;font-size:11px;text-decoration:underline}.settings-foot{display:flex;justify-content:flex-end;margin-top:12px}.done-settings{height:34px;padding:0 16px;border:0;border-radius:999px;background:#111;color:#fff;font-size:11px}
      .toast{position:absolute;left:50%;bottom:22px;z-index:20;transform:translate(-50%,8px);padding:8px 12px;border:1px solid #eee;border-radius:999px;background:#fff;box-shadow:0 4px 20px #0002;color:#666;font-size:11px;opacity:0;transition:.2s;pointer-events:none}.toast.show{opacity:1;transform:translate(-50%,0)}
      .hidden{display:none!important}
      @keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}@keyframes twinkle{0%,100%{opacity:.45}50%{opacity:1}}@keyframes arrive{from{opacity:0;transform:translateY(5px) scale(.98)}to{opacity:1;transform:none}}@keyframes fade{from{opacity:0}to{opacity:1}}
      @media(max-width:540px){.dock{right:10px;bottom:10px;gap:4px}.pet-area{width:72px;height:82px}.pair-art{width:72px;height:65px;background-size:432px 65px}.single-art{width:68px;height:65px}.pair-hit{height:66px}.card{right:8px;bottom:105px;width:min(300px,calc(100vw - 20px));padding:12px}.card-avatar{width:40px;height:40px}.card h2{font-size:14px}.card p{font-size:11px}.actions button{height:33px;padding:0 10px}.timer{font-size:9px;padding:4px 6px}.icon-button{width:27px;height:27px}}
      @media(prefers-reduced-motion:reduce){*,*:before,*:after{animation-duration:.01ms!important;transition-duration:.01ms!important}}
    </style>
    <div class="shade" id="shade" aria-hidden="true"></div>
    <section class="card" id="card" role="dialog" aria-live="polite" aria-label="Relief 提醒">
      <header class="card-head"><img class="card-avatar" id="cardAvatar" alt=""><div class="card-copy"><div class="eyebrow" id="byline">吴星星和苏圈圈 · 小小提醒</div><h2 id="cardTitle">该喝几口水啦</h2></div><button class="close" id="closeCard" aria-label="关闭提醒">×</button></header>
      <p id="cardText">喝口水，歇一会儿再继续。</p>
      <div class="actions"><button class="primary" id="complete">去喝水</button><button class="secondary" id="snooze">稍后 · 10 分钟</button></div>
    </section>
    <div class="dock" id="dock">
      <div class="timer" title="ChatGPT 页面活跃时间"><i class="dot" id="dot"></i><span id="status">陪伴中</span><strong id="clock">00:00</strong></div>
      <div class="pet-area" id="petArea">
        <button class="pet" id="pet" aria-label="Relief 陪伴形象"><div class="pair-art" id="pairArt"></div><img class="single-art" id="singleArt" alt=""><img class="mobile-art" id="mobileArt" src="${asset('mobile')}" alt=""><span class="name" id="petName">吴星星和苏圈圈</span><span class="badge">✦</span></button>
        <button class="pair-hit water" data-action="water" data-hint="💧 喝水" aria-label="吴星星：喝水" title="吴星星 · 喝水"></button>
        <button class="pair-hit rest" data-action="rest" data-hint="🌿 休息" aria-label="苏圈圈：休息" title="苏圈圈 · 休息"></button>
        <button class="mobile-hit moon" data-action="rest" aria-label="月亮：休息" title="月亮 · 休息"></button>
        <button class="mobile-hit cloud" data-action="settings" aria-label="云朵：设置" title="云朵 · 设置"></button>
        <button class="mobile-hit star" data-action="water" aria-label="星星：喝水" title="星星 · 喝水"></button>
      </div>
      <button class="icon-button" id="openSettings" aria-label="打开 Relief 设置" title="设置">⚙</button>
    </div>
    <section class="settings-cover" id="settingsCover" aria-hidden="true">
      <div class="settings" role="dialog" aria-modal="true" aria-labelledby="settingsTitle">
        <header class="settings-head"><strong id="settingsTitle">Relief 陪伴设置</strong><button id="closeSettings" aria-label="关闭设置">×</button></header>
        <div class="tabs"><button id="reminderTab" aria-selected="true">提醒</button><button id="lookTab" aria-selected="false">宠物与显示</button></div>
        <div class="pane" id="reminderPane">
          <label class="row"><span>喝水提醒间隔</span><span class="number"><input id="waterInput" type="number" min="1" max="240"><span class="unit">分钟</span></span></label>
          <label class="row"><span>休息提醒间隔</span><span class="number"><input id="restInput" type="number" min="1" max="240"><span class="unit">分钟</span></span></label>
          <label class="row"><span>稍后提醒时间</span><span class="number"><input id="snoozeInput" type="number" min="1" max="120"><span class="unit">分钟</span></span></label>
          <div class="row"><span>专注提醒 · 10 秒后完成</span><button class="switch" id="focusSwitch" role="switch" aria-checked="false" aria-label="专注提醒"></button></div>
        </div>
        <div class="pane" id="lookPane" hidden>
          <div class="choices" id="choices"></div>
          <div class="visibility">
            <div class="row"><span>显示陪伴形象</span><button class="switch" id="showSwitch" role="switch" aria-checked="true" aria-label="显示陪伴形象"></button></div>
            <label class="row"><span>隐藏时长</span><select class="select" id="hideSelect"><option value="session">本次会话</option><option value="hour">1 小时</option><option value="today">今天</option><option value="forever">直到手动恢复</option></select></label>
            <button class="hide-button" id="resetPosition">恢复默认位置</button>
          </div>
        </div>
        <div class="settings-foot"><button class="done-settings" id="doneSettings">完成</button></div>
      </div>
    </section>
    <div class="toast" id="toast" role="status"></div>`;

  const $=selector=>shadow.querySelector(selector);
  const ui={shade:$('#shade'),card:$('#card'),title:$('#cardTitle'),copy:$('#cardText'),complete:$('#complete'),snooze:$('#snooze'),dock:$('#dock'),petArea:$('#petArea'),pet:$('#pet'),pair:$('#pairArt'),single:$('#singleArt'),mobile:$('#mobileArt'),name:$('#petName'),avatar:$('#cardAvatar'),byline:$('#byline'),clock:$('#clock'),status:$('#status'),dot:$('#dot'),settings:$('#settingsCover'),toast:$('#toast')};
  const names={pets:'吴星星和苏圈圈',sun:'小太阳',star:'星星',cloud:'云朵',moon:'月亮',mobile:'星月云挂饰'};
  const choices=[['pets','吴星星和苏圈圈'],['sun','小太阳'],['star','星星'],['cloud','云朵'],['moon','月亮'],['mobile','星月云挂饰']];
  const safeNumber=(value,min,max,fallback)=>{const n=Number(value);return Number.isFinite(n)?Math.max(min,Math.min(max,Math.round(n))):fallback};
  const persist=()=>chrome.storage.local.set(prefs);
  function hiddenNow(){if(!prefs.enabled)return true;if(prefs.hideMode==='session')return sessionStorage.getItem('xiaoqiHidden')==='1';if(prefs.hideMode==='forever')return true;if(prefs.hideMode==='timed'&&Date.now()<prefs.hideUntil)return true;if(prefs.hideMode==='timed'){prefs.hideMode='';prefs.hideUntil=0;persist()}return false}
  function applyVisibility(){host.style.display=hiddenNow()?'none':'';$('#showSwitch').setAttribute('aria-checked',String(!hiddenNow()))}
  function applyPosition(){if(prefs.position&&Number.isFinite(prefs.position.x)&&Number.isFinite(prefs.position.y)){ui.dock.style.left=`${Math.max(4,Math.min(innerWidth-ui.dock.offsetWidth-4,prefs.position.x*innerWidth))}px`;ui.dock.style.top=`${Math.max(4,Math.min(innerHeight-ui.dock.offsetHeight-4,prefs.position.y*innerHeight))}px`;ui.dock.style.right='auto';ui.dock.style.bottom='auto'}else{ui.dock.style.left='';ui.dock.style.top='';ui.dock.style.right='';ui.dock.style.bottom=''}}
  function savePosition(){prefs.position={x:Math.max(0,ui.dock.offsetLeft)/Math.max(1,innerWidth-ui.dock.offsetWidth),y:Math.max(0,ui.dock.offsetTop)/Math.max(1,innerHeight-ui.dock.offsetHeight)};persist()}
  function applyMascot(){const style=prefs.mascot;ui.pair.style.display=style==='pets'?'block':'none';ui.single.style.display=['sun','star','cloud','moon'].includes(style)?'block':'none';ui.mobile.style.display=style==='mobile'?'block':'none';ui.single.src=asset(style==='pets'?'sun':style);ui.name.textContent=names[style];ui.avatar.src=asset(style==='pets'?'pets':style);shadow.querySelectorAll('.pair-hit').forEach(x=>x.style.display=style==='pets'?'block':'none');shadow.querySelectorAll('.mobile-hit').forEach(x=>x.style.display=style==='mobile'?'block':'none');}
  function setTab(which){const reminders=which==='reminders';$('#reminderPane').hidden=!reminders;$('#lookPane').hidden=reminders;$('#reminderTab').setAttribute('aria-selected',String(reminders));$('#lookTab').setAttribute('aria-selected',String(!reminders))}
  function updateSettings(){ $('#waterInput').value=prefs.water;$('#restInput').value=prefs.rest;$('#snoozeInput').value=prefs.snooze;$('#focusSwitch').setAttribute('aria-checked',String(prefs.focus));$('#hideSelect').value=prefs.hideDuration||'session';$('#showSwitch').setAttribute('aria-checked',String(!hiddenNow()));$('#choices').innerHTML=choices.map(([id,label])=>`<button class="choice" data-mascot="${id}" aria-pressed="${prefs.mascot===id}"><img src="${asset(id)}" alt=""><strong>${label}</strong></button>`).join('')}
  function openSettings(){closeReminder();updateSettings();setTab('reminders');ui.settings.classList.add('show');ui.settings.setAttribute('aria-hidden','false');$('#closeSettings').focus()}
  function closeSettings(){ui.settings.classList.remove('show');ui.settings.setAttribute('aria-hidden','true')}
  function showToast(message){ui.toast.textContent=message;ui.toast.classList.add('show');setTimeout(()=>ui.toast.classList.remove('show'),2100)}
  function closeReminder(){clearTimeout(focusTimeout);focusTimeout=null;ui.card.classList.remove('show');ui.shade.classList.remove('show');ui.shade.setAttribute('aria-hidden','true');ui.complete.hidden=false;ui.complete.classList.remove('ready')}
  function showReminder(type){clearTimeout(focusTimeout);focusTimeout=null;reminderType=type;snooze=null;due[type]=activeSeconds+Number(prefs[type])*60;ui.card.classList.add('show');ui.complete.hidden=false;ui.complete.classList.remove('ready');ui.complete.textContent=type==='water'?(prefs.focus?'喝水完毕':'去喝水'):(prefs.focus?'休息完毕':'去活动一下');ui.title.textContent=type==='water'?'该喝几口水啦':'起来伸个懒腰吧';ui.copy.textContent=type==='water'?'喝口水，歇一会儿再继续。':'站起来伸展一下，看看远处。';if(prefs.focus){ui.complete.hidden=true;ui.shade.classList.add('show');ui.shade.setAttribute('aria-hidden','false');focusTimeout=setTimeout(()=>{if(ui.card.classList.contains('show')){ui.complete.hidden=false;ui.complete.classList.add('ready')}},10000)}else{ui.shade.classList.remove('show');ui.shade.setAttribute('aria-hidden','true')}}
  function interval(type){return Number(prefs[type])*60}
  function hidePet(){const value=$('#hideSelect').value;prefs.hideDuration=value;prefs.enabled=false;if(value==='session'){prefs.hideMode='session';prefs.hideUntil=0;sessionStorage.setItem('xiaoqiHidden','1')}else if(value==='forever'){prefs.hideMode='forever';prefs.hideUntil=0}else{prefs.hideMode='timed';prefs.hideUntil=Date.now()+(value==='hour'?3600000:Math.max(1000,new Date().setHours(24,0,0,0)-Date.now()))}persist();applyVisibility();closeSettings()}
  function showPet(notify=true){prefs.enabled=true;prefs.hideMode='';prefs.hideUntil=0;sessionStorage.removeItem('xiaoqiHidden');persist();applyVisibility();if(notify)showToast('陪伴形象回来啦 ✿')}
  const activity=()=>{lastActivity=Date.now()};
  for(const type of ['pointerdown','pointermove','keydown','wheel','touchstart'])document.addEventListener(type,activity,{passive:true,capture:true});
  document.addEventListener('scroll',activity,{passive:true,capture:true});document.addEventListener('visibilitychange',()=>{if(!document.hidden){activity();if(snooze&&Date.now()>=snooze.at&&ui.card.classList.contains('show')===false)showReminder(snooze.type)}});
  shadow.addEventListener('click',event=>{const target=event.target.closest('button');if(!target)return;if(target.matches('[data-action]')){event.preventDefault();event.stopPropagation();if(target.dataset.action==='settings')openSettings();else showReminder(target.dataset.action);return}if(target.id==='pet'&&!dragMoved){if(prefs.mascot==='star')showReminder('water');else if(prefs.mascot==='moon')showReminder('rest');else if(prefs.mascot==='cloud')openSettings();else openSettings()}if(target.id==='openSettings')openSettings();if(target.id==='closeCard')closeReminder();if(target.id==='complete'){closeReminder();activity();showToast(reminderType==='water'?'补好水啦，继续加油 ✿':'慢慢活动一下，我等你回来 ✿')}if(target.id==='snooze'){snooze={type:reminderType,at:Date.now()+prefs.snooze*60000};closeReminder();showToast(`${prefs.snooze} 分钟后再提醒你`)}if(target.id==='closeSettings'||target.id==='doneSettings')closeSettings();if(target.id==='reminderTab')setTab('reminders');if(target.id==='lookTab')setTab('look');if(target.id==='focusSwitch'){prefs.focus=!prefs.focus;target.setAttribute('aria-checked',String(prefs.focus));persist()}if(target.id==='showSwitch'){if(hiddenNow())showPet();else hidePet()}if(target.id==='resetPosition'){prefs.position=null;persist();applyPosition()}if(target.dataset.mascot){prefs.mascot=target.dataset.mascot;applyMascot();updateSettings();persist()}});
  shadow.addEventListener('change',event=>{const el=event.target;if(el.id==='waterInput'||el.id==='restInput'||el.id==='snoozeInput'){const key={waterInput:'water',restInput:'rest',snoozeInput:'snooze'}[el.id],limits=key==='snooze'?[1,120]:[1,240];prefs[key]=safeNumber(el.value,...limits,prefs[key]);el.value=prefs[key];if(key!=='snooze')due[key]=activeSeconds+interval(key);persist()}if(el.id==='hideSelect'){prefs.hideDuration=el.value;persist()}});
  ui.settings.addEventListener('click',event=>{if(event.target===ui.settings)closeSettings()});
  let drag=null,dragMoved=false;
  ui.petArea.addEventListener('pointerdown',event=>{if(event.target.closest('[data-action]'))return;if(event.button!==undefined&&event.button!==0)return;dragMoved=false;const r=ui.dock.getBoundingClientRect();drag={id:event.pointerId,x:event.clientX,y:event.clientY,left:r.left,top:r.top};ui.petArea.setPointerCapture(event.pointerId)});
  ui.petArea.addEventListener('pointermove',event=>{if(!drag||drag.id!==event.pointerId)return;const dx=event.clientX-drag.x,dy=event.clientY-drag.y;if(!dragMoved&&Math.hypot(dx,dy)<4)return;dragMoved=true;event.preventDefault();ui.dock.style.left=`${Math.max(4,Math.min(innerWidth-ui.dock.offsetWidth-4,drag.left+dx))}px`;ui.dock.style.top=`${Math.max(4,Math.min(innerHeight-ui.dock.offsetHeight-4,drag.top+dy))}px`;ui.dock.style.right='auto';ui.dock.style.bottom='auto'});
  function endDrag(event){if(!drag||drag.id!==event.pointerId)return;if(dragMoved)savePosition();drag=null;setTimeout(()=>dragMoved=false,0)}ui.petArea.addEventListener('pointerup',endDrag);ui.petArea.addEventListener('pointercancel',endDrag);
  document.addEventListener('keydown',event=>{if(event.key==='Escape'){if(ui.card.classList.contains('show'))closeReminder();else if(ui.settings.classList.contains('show'))closeSettings()}});
  chrome.runtime.onMessage.addListener((message,sender,sendResponse)=>{if(message?.type!=='xiaoqi-command')return;initialization.then(()=>{if(message.command==='show')showPet();else if(message.command==='settings'){showPet(false);openSettings()}sendResponse({ok:true})});return true});
  initialization=chrome.storage.local.get(defaults).then(values=>{prefs={...defaults,...values};prefs.water=safeNumber(prefs.water,1,240,45);prefs.rest=safeNumber(prefs.rest,1,240,50);prefs.snooze=safeNumber(prefs.snooze,1,120,10);if(!names[prefs.mascot])prefs.mascot='pets';due.water=prefs.water*60;due.rest=prefs.rest*60;applyMascot();applyPosition();applyVisibility()});
  window.addEventListener('resize',applyPosition);
  setInterval(()=>{if(!prefs.enabled&&prefs.hideMode==='timed'&&Date.now()>=prefs.hideUntil){prefs.enabled=true;prefs.hideMode='';prefs.hideUntil=0;persist();applyVisibility()}if(document.hidden||Date.now()-lastActivity>60000){paused=true;ui.status.textContent='已暂停';ui.dot.style.background='#bbb';return}paused=false;ui.status.textContent='陪伴中';ui.dot.style.background='#79a58a';activeSeconds++;ui.clock.textContent=`${String(Math.floor(activeSeconds/60)).padStart(2,'0')}:${String(activeSeconds%60).padStart(2,'0')}`;if(snooze&&Date.now()>=snooze.at&&ui.card.classList.contains('show')===false){const type=snooze.type;snooze=null;showReminder(type);return}if(!ui.card.classList.contains('show')){const dueType=['water','rest'].filter(type=>activeSeconds>=due[type]).sort((a,b)=>due[a]-due[b])[0];if(dueType)showReminder(dueType)}},1000);
})();
