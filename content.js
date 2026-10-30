(()=>{
  if(document.getElementById('xiaoqi-companion-host'))return;
  const CONTENT_VERSION='1.0.8';
  const host=document.createElement('div');host.id='xiaoqi-companion-host';document.documentElement.append(host);
  const shadow=host.attachShadow({mode:'open'});
  const assets={pets:'assets/pet-pair-idle.png',pairAvatar:'assets/pet-pair-avatar.png',sun:'assets/sun-mascot.png',star:'assets/mascot-star.png',cloud:'assets/mascot-cloud.png',moon:'assets/mascot-moon.png',mobile:'assets/mascot-mobile.png'};
  const defaults={water:45,rest:50,snooze:10,focus:true,focusConfigured:false,mascot:'pets',enabled:true,hideMode:'',hideDuration:'session',hideUntil:0,position:null};
  let prefs={...defaults},activeSeconds=0,lastActivity=Date.now(),reminderType='water',snooze=null,focusTimeout=null,initialization=Promise.resolve();
  const due={water:defaults.water*60,rest:defaults.rest*60};
  const asset=name=>chrome.runtime.getURL(assets[name]);
  shadow.innerHTML=`
    <style>
      :host{all:initial;position:fixed;inset:0;z-index:2147483647;pointer-events:none;color:#202020;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;font-size:14px;line-height:1.5}
      *{box-sizing:border-box}button,input,select{font:inherit;color:inherit}button{cursor:pointer}
      .shade{display:none;position:fixed;inset:0;z-index:5;background:#35363870;backdrop-filter:grayscale(.3) brightness(.68);pointer-events:auto;animation:fade .18s ease-out}.shade.show{display:block}
      .dock{position:absolute;right:20px;bottom:18px;z-index:7;display:flex;flex-direction:column;align-items:center;gap:5px;pointer-events:none;touch-action:none}.dock>*{pointer-events:auto}.dock.locked,.dock.locked>*{pointer-events:none!important}
      .pet-area{width:82px;height:91px;position:relative;display:grid;place-items:center;cursor:grab;touch-action:none;user-select:none}.pet-area.dragging{cursor:grabbing}.pet{position:absolute;inset:0;width:100%;height:100%;padding:0;border:0;background:transparent;filter:drop-shadow(0 3px 5px #0002);touch-action:none}
      .pair-art{position:absolute;left:0;top:0;width:82px;height:74px;background:url('${asset('pets')}') no-repeat 0 0/492px 74px;animation:bob 3.2s ease-in-out infinite}
      .single-art{display:none;position:absolute;inset:2px;width:78px;height:72px;object-fit:contain;padding:2px;animation:bob 3.2s ease-in-out infinite}
      .pair-hit,.mobile-hit{display:none;position:absolute;z-index:3;border:1px solid transparent;padding:0;background:transparent;touch-action:manipulation;transition:background .14s,border-color .14s,transform .14s,box-shadow .14s}
      .pair-hit{top:0;height:82%;width:50%;border-radius:22px}.pair-hit.water{left:0}.pair-hit.rest{right:0}.pair-hit:active{background:#ffffff24}.pair-hit:focus-visible,.mobile-hit:focus-visible{outline:2px solid #b69c70;outline-offset:1px}
      .mobile-art{display:none;position:absolute;inset:0;width:100%;height:100%;object-fit:contain;transform:scale(1.45);pointer-events:none}.mobile-art.tap-feedback{animation:charmTap .46s cubic-bezier(.2,.8,.2,1)}.mobile-hit{width:38%;height:32%;border-radius:50%}.mobile-hit.moon{left:5%;top:34%}.mobile-hit.cloud{right:3%;top:35%}.mobile-hit.star{left:30%;bottom:0}.mobile-hit:hover,.mobile-hit:active,.mobile-hit.is-pressed{background:#fff8e6b8;border-color:#edcf8f;box-shadow:0 2px 10px #d6b36d55}.mobile-hit:active,.mobile-hit.is-pressed{transform:scale(.86)}
      .badge{position:absolute;right:-1px;top:2px;color:#e7bf70;font-size:13px;animation:twinkle 2s ease-in-out infinite;pointer-events:none}
      .dock-tools{display:flex;align-items:center;gap:0;padding:3px;border:1px solid #e7e7e7;border-radius:999px;background:#ffffffed;box-shadow:0 3px 12px #0000000a}.timer{display:flex;align-items:center;gap:6px;margin:0;padding:4px 9px;border:0;border-radius:999px;background:transparent;color:#777;font-size:11px;white-space:nowrap;transition:background .16s,transform .16s}.timer:hover{background:#f3f7f3}.timer:active{transform:scale(.97)}.timer:focus-visible,.icon-button:focus-visible{outline:2px solid #91aa98;outline-offset:2px}.dot{width:7px;height:7px;border-radius:50%;background:#79a58a}.timer strong{color:#4c6856;font-size:12px;font-weight:650}.icon-button{width:31px;height:29px;border:0;border-left:1px solid #ededed;border-radius:0 999px 999px 0;background:transparent;color:#777;font-size:14px}.icon-button:hover{background:#f6f8f5}
      .quick-chat{display:none;width:min(300px,calc(100vw - 24px));padding:9px 10px;border:1px solid #e6e6e6;border-radius:15px;background:#fff;box-shadow:0 8px 24px #0000001a;pointer-events:auto;animation:arrive .18s ease-out}.quick-chat.show{display:block}.quick-head{display:flex;align-items:center;gap:6px;margin-bottom:6px}.quick-title{min-width:0;flex:1;font-size:12px;font-weight:650;letter-spacing:-.15px;color:#292927}.quick-target{margin-top:1px;color:#92918d;font-size:9px;font-weight:450}.quick-close{width:23px;height:23px;border:0;border-radius:50%;background:transparent;color:#999;font-size:17px}.quick-close:hover{background:#f4f4f4}.quick-compose{display:flex;align-items:stretch;gap:6px}.quick-input{display:block;flex:1;min-width:0;width:auto;height:38px;min-height:38px;max-height:92px;resize:none;padding:8px 9px;border:1px solid #e7e7e7;border-radius:11px;background:#fdfdfc;color:#282826;font:inherit;font-size:12px;line-height:1.45;outline:none}.quick-input:focus{border-color:#b8c9bd;box-shadow:0 0 0 2px #9eb6a51c}.quick-input::placeholder{color:#aaa}.quick-status{min-height:0;margin-top:4px;color:#999;font-size:9px;line-height:1.35}.quick-status:empty{display:none}.quick-status.error{color:#a65c54}.quick-send{align-self:center;height:38px;flex:none;padding:0 11px;border:0;border-radius:999px;background:#151515;color:#fff;font-size:11px;font-weight:600}.quick-send:hover{background:#333}.quick-send:disabled{opacity:.55;cursor:wait}
      .card{display:none;position:fixed;left:12px;top:12px;z-index:6;width:min(460px,calc(100vw - 24px));min-height:190px;padding:19px 20px 18px;border:1px solid #e5e5e5;border-radius:23px;background:#fff;box-shadow:0 16px 38px #0002;pointer-events:auto;animation:arrive .2s ease-out;transform-origin:top left;overflow:visible}
      .card.show{display:block}.card-head{position:relative;z-index:3;display:flex;align-items:center;gap:14px}.card-avatar{width:62px;height:62px;flex:none;border-radius:21px;background:#fff7f1;object-fit:contain;padding:5px}.card-copy{min-width:0}.eyebrow{color:#898782;font-size:13px;letter-spacing:.1px}.card h2{margin:3px 0 0;font-size:23px;line-height:1.28;letter-spacing:-.45px;font-weight:680;color:#252422}      .card p{position:relative;z-index:3;margin:17px 0 0;color:#686762;font-size:17px;line-height:1.55;letter-spacing:.1px}.actions{position:relative;z-index:3;display:flex;gap:10px;margin-top:17px}.actions button{height:45px;padding:0 19px;border-radius:999px;font-size:14px;font-weight:580}.primary{border:0;background:#111;color:#fff}.primary:hover{background:#333}.secondary{border:1px solid #e3e3e3;background:#fff;color:#444}.secondary:hover{background:#f7f7f7}.actions button[hidden]{display:none}.primary.ready{animation:arrive .22s ease-out}      .settings-cover{display:none;position:fixed;inset:0;z-index:10;align-items:center;justify-content:center;padding:16px;background:#0003;backdrop-filter:blur(2px);pointer-events:auto}.settings-cover.show{display:flex}
      .settings{width:min(390px,calc(100vw - 28px));max-height:88vh;overflow:auto;padding:17px;border:1px solid #e5e5e5;border-radius:19px;background:#fff;box-shadow:0 18px 60px #0003}.settings-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}.settings-head strong{font-size:17px;letter-spacing:-.3px}.settings-head button{width:28px;height:28px;border:0;border-radius:50%;background:#f5f5f5;color:#666;font-size:18px}
      .tabs{display:flex;gap:4px;padding:3px;border-radius:10px;background:#f3f3f3;margin-bottom:8px}.tabs button{flex:1;padding:7px;border:0;border-radius:8px;background:transparent;color:#777;font-size:12px}.tabs button[aria-selected=true]{background:#fff;color:#222;box-shadow:0 1px 3px #0002}
      .pane[hidden]{display:none}.row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 0;border-bottom:1px solid #f0f0f0;color:#555;font-size:12px}.row:last-child{border-bottom:0}.number{display:flex;align-items:center;gap:7px}.number input{width:68px;height:34px;border:1px solid #ddd;border-radius:10px;padding:0 8px;text-align:center;background:#fff;outline:none}.unit{color:#888;font-size:11px}
      .switch{position:relative;width:36px;height:21px;flex:none;border:0;border-radius:999px;background:#c9c9c9;transition:.18s}.switch:after{content:"";position:absolute;left:2px;top:2px;width:17px;height:17px;border-radius:50%;background:white;box-shadow:0 1px 2px #0002;transition:.18s}.switch[aria-checked=true]{background:#111}.switch[aria-checked=true]:after{left:17px}
      .choices{display:grid;grid-template-columns:1fr 1fr;gap:8px}.choice{display:flex;align-items:center;gap:10px;min-width:0;min-height:66px;padding:7px 9px;border:1px solid #e8e8e8;border-radius:15px;background:#fff;text-align:left;transition:background .16s,border-color .16s,box-shadow .16s,transform .14s}.choice:active{transform:scale(.99)}.choice[aria-pressed=true]{border-color:#8ba493;background:#f6faf6;box-shadow:0 0 0 2px #8ba4931f}.choice img{width:44px;height:44px;flex:none;object-fit:contain;border-radius:13px;background:#f6f7f5;padding:2px}.choice[data-mascot="mobile"] img{width:48px;height:48px;padding:0;background:transparent}.choice strong{overflow:hidden;font-size:12px;text-overflow:ellipsis;white-space:nowrap;font-weight:600}.visibility{margin-top:10px;border-top:1px solid #eee}.select{height:31px;padding:0 8px;border:1px solid #ddd;border-radius:9px;background:#fff;font-size:11px}.hide-button{padding:7px 0;border:0;background:transparent;color:#777;font-size:11px;text-decoration:underline}.settings-foot{display:flex;justify-content:flex-end;margin-top:12px}.done-settings{height:34px;padding:0 16px;border:0;border-radius:999px;background:#111;color:#fff;font-size:11px}
      .toast{position:absolute;left:50%;bottom:22px;z-index:20;transform:translate(-50%,8px);padding:8px 12px;border:1px solid #eee;border-radius:999px;background:#fff;box-shadow:0 4px 20px #0002;color:#666;font-size:11px;opacity:0;transition:.2s;pointer-events:none}.toast.show{opacity:1;transform:translate(-50%,0)}
      .hidden{display:none!important}
      @keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}@keyframes twinkle{0%,100%{opacity:.45}50%{opacity:1}}@keyframes arrive{from{opacity:0;transform:translateY(5px) scale(.98)}to{opacity:1;transform:none}}@keyframes fade{from{opacity:0}to{opacity:1}}@keyframes charmTap{0%{transform:scale(1.45) rotate(0)}42%{transform:scale(1.62) rotate(-4deg)}75%{transform:scale(1.52) rotate(3deg)}100%{transform:scale(1.45) rotate(0)}}
      @media(max-width:540px){.dock{right:10px;bottom:10px;gap:4px}.pet-area{width:72px;height:82px}.pair-art{width:72px;height:65px;background-size:432px 65px}.single-art{width:68px;height:65px}.pair-hit{height:66px}.dock-tools{padding:2px}.timer{font-size:10px;padding:4px 7px}.timer strong{font-size:11px}.icon-button{width:28px;height:27px}.quick-chat{padding:8px 9px;border-radius:13px}.quick-input{height:36px;min-height:36px}.card{width:calc(100vw - 24px);min-height:180px;padding:16px 16px 17px;border-radius:20px}.card-head{gap:11px}.card-avatar{width:52px;height:52px;border-radius:18px;padding:4px}.eyebrow{font-size:12px}.card h2{font-size:20px}.card p{margin-top:13px;font-size:15px}.actions{gap:8px;margin-top:13px}.actions button{height:40px;padding:0 13px;font-size:13px}}
      @media(prefers-reduced-motion:reduce){*,*:before,*:after{animation-duration:.01ms!important;transition-duration:.01ms!important}}
    </style>
    <div class="shade" id="shade" aria-hidden="true"></div>
    <section class="card" id="card" role="dialog" aria-live="polite" aria-label="Relief 提醒">
      <header class="card-head"><img class="card-avatar" id="cardAvatar" alt=""><div class="card-copy"><div class="eyebrow" id="byline">小小提醒</div><h2 id="cardTitle">该喝几口水啦</h2></div></header>
      <p id="cardText">喝口水，歇一会儿再继续。</p>
      <div class="actions"><button class="primary" id="complete">去喝水</button><button class="secondary" id="snooze">稍后 · 10 分钟</button></div>
    </section>
    <div class="dock" id="dock">
      <div class="pet-area" id="petArea">
        <button class="pet" id="pet" aria-label="Relief 陪伴形象"><div class="pair-art" id="pairArt"></div><img class="single-art" id="singleArt" alt=""><img class="mobile-art" id="mobileArt" src="${asset('mobile')}" alt=""><span class="badge">✦</span></button>
        <button class="pair-hit water" data-action="water" aria-label="吴星星：喝水" title="吴星星 · 喝水"></button>
        <button class="pair-hit rest" data-action="rest" aria-label="苏圈圈：休息" title="苏圈圈 · 休息"></button>
        <button class="mobile-hit moon" data-action="rest" aria-label="月亮：休息" title="月亮 · 休息"></button>
        <button class="mobile-hit cloud" data-action="settings" aria-label="云朵：设置" title="云朵 · 设置"></button>
        <button class="mobile-hit star" data-action="water" aria-label="星星：喝水" title="星星 · 喝水"></button>
      </div>
      <section class="quick-chat" id="quickChat" role="dialog" aria-modal="false" aria-labelledby="quickChatTitle" aria-hidden="true">
        <header class="quick-head"><div class="quick-title" id="quickChatTitle">随手问一句<div class="quick-target">发送到 Daily · 每日傻瓜QA</div></div><button class="quick-close" id="closeQuickChat" aria-label="关闭聊天框">×</button></header>
        <div class="quick-compose"><textarea class="quick-input" id="quickChatInput" maxlength="4000" rows="1" placeholder="输入一句话…" aria-label="输入要发送的问题"></textarea><button class="quick-send" id="quickChatSend">发送</button></div>
        <div class="quick-status" id="quickChatStatus" role="status" aria-live="polite"></div>
      </section>
      <div class="dock-tools">
        <button class="timer" id="openQuickChat" title="打开每日傻瓜QA" aria-label="打开每日傻瓜QA快速聊天框"><i class="dot" id="dot"></i><strong id="clock">00:00</strong></button>
        <button class="icon-button" id="openSettings" aria-label="打开 Relief 设置" title="设置">⚙</button>
      </div>
    </div>
    <section class="settings-cover" id="settingsCover" aria-hidden="true">
      <div class="settings" role="dialog" aria-modal="true" aria-labelledby="settingsTitle">
        <header class="settings-head"><strong id="settingsTitle">Relief 陪伴设置</strong><button id="closeSettings" aria-label="关闭设置">×</button></header>
        <div class="tabs"><button id="reminderTab" aria-selected="true">提醒</button><button id="lookTab" aria-selected="false">宠物与显示</button></div>
        <div class="pane" id="reminderPane">
          <label class="row"><span>喝水提醒间隔</span><span class="number"><input id="waterInput" type="number" min="1" max="240"><span class="unit">分钟</span></span></label>
          <label class="row"><span>休息提醒间隔</span><span class="number"><input id="restInput" type="number" min="1" max="240"><span class="unit">分钟</span></span></label>
          <label class="row"><span>稍后提醒时间</span><span class="number"><input id="snoozeInput" type="number" min="1" max="120"><span class="unit">分钟</span></span></label>
          <div class="row"><span>专注提醒 · 喝水 5 秒 / 休息 10 秒</span><button class="switch" id="focusSwitch" role="switch" aria-checked="true" aria-label="专注提醒"></button></div>
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
  const ui={shade:$('#shade'),card:$('#card'),title:$('#cardTitle'),copy:$('#cardText'),complete:$('#complete'),snooze:$('#snooze'),dock:$('#dock'),petArea:$('#petArea'),pet:$('#pet'),pair:$('#pairArt'),single:$('#singleArt'),mobile:$('#mobileArt'),avatar:$('#cardAvatar'),clock:$('#clock'),dot:$('#dot'),settings:$('#settingsCover'),toast:$('#toast'),quickChat:$('#quickChat'),quickInput:$('#quickChatInput'),quickSend:$('#quickChatSend'),quickStatus:$('#quickChatStatus')};
  const choices=[['pets','吴星星和苏圈圈'],['sun','小太阳'],['star','星星'],['cloud','云朵'],['moon','月亮'],['mobile','blingbling']];
  const safeNumber=(value,min,max,fallback)=>{const n=Number(value);return Number.isFinite(n)?Math.max(min,Math.min(max,Math.round(n))):fallback};
  const persist=()=>chrome.storage.local.set(prefs);
  function hiddenNow(){if(!prefs.enabled)return true;if(prefs.hideMode==='session')return sessionStorage.getItem('xiaoqiHidden')==='1';if(prefs.hideMode==='forever')return true;if(prefs.hideMode==='timed'&&Date.now()<prefs.hideUntil)return true;if(prefs.hideMode==='timed'){prefs.hideMode='';prefs.hideUntil=0;persist()}return false}
  function applyVisibility(){host.style.display=hiddenNow()?'none':'';$('#showSwitch').setAttribute('aria-checked',String(!hiddenNow()))}
  function applyPosition(){if(prefs.position&&Number.isFinite(prefs.position.x)&&Number.isFinite(prefs.position.y)){ui.dock.style.left=`${Math.max(4,Math.min(innerWidth-ui.dock.offsetWidth-4,prefs.position.x*innerWidth))}px`;ui.dock.style.top=`${Math.max(4,Math.min(innerHeight-ui.dock.offsetHeight-4,prefs.position.y*innerHeight))}px`;ui.dock.style.right='auto';ui.dock.style.bottom='auto'}else{ui.dock.style.left='';ui.dock.style.top='';ui.dock.style.right='';ui.dock.style.bottom=''}}
  function savePosition(){prefs.position={x:Math.max(0,ui.dock.offsetLeft)/Math.max(1,innerWidth-ui.dock.offsetWidth),y:Math.max(0,ui.dock.offsetTop)/Math.max(1,innerHeight-ui.dock.offsetHeight)};persist()}
  function applyMascot(){const style=prefs.mascot;ui.pair.style.display=style==='pets'?'block':'none';ui.single.style.display=['sun','star','cloud','moon'].includes(style)?'block':'none';ui.mobile.style.display=style==='mobile'?'block':'none';ui.single.src=asset(style);ui.avatar.src=asset(style==='pets'?'pairAvatar':style);ui.mobile.style.transform=style==='mobile'?'scale(1.45)':'none';ui.card.classList.toggle('bling',style==='mobile');shadow.querySelectorAll('.pair-hit').forEach(x=>x.style.display=style==='pets'?'block':'none');shadow.querySelectorAll('.mobile-hit').forEach(x=>x.style.display=style==='mobile'?'block':'none');}
  function setTab(which){const reminders=which==='reminders';$('#reminderPane').hidden=!reminders;$('#lookPane').hidden=reminders;$('#reminderTab').setAttribute('aria-selected',String(reminders));$('#lookTab').setAttribute('aria-selected',String(!reminders))}
  function updateSettings(){ $('#waterInput').value=prefs.water;$('#restInput').value=prefs.rest;$('#snoozeInput').value=prefs.snooze;$('#focusSwitch').setAttribute('aria-checked',String(prefs.focus));$('#hideSelect').value=prefs.hideDuration||'session';$('#showSwitch').setAttribute('aria-checked',String(!hiddenNow()));$('#choices').innerHTML=choices.map(([id,label])=>`<button class="choice" data-mascot="${id}" aria-pressed="${prefs.mascot===id}"><img src="${asset(id==='pets'?'pairAvatar':id)}" alt=""><strong>${label}</strong></button>`).join('')}
  function openSettings(){closeReminder();closeQuickChat();updateSettings();setTab('reminders');ui.settings.classList.add('show');ui.settings.setAttribute('aria-hidden','false');$('#closeSettings').focus()}
  function closeSettings(){ui.settings.classList.remove('show');ui.settings.setAttribute('aria-hidden','true')}
  function openQuickChat(){closeReminder();closeSettings();ui.quickChat.classList.add('show');ui.quickChat.setAttribute('aria-hidden','false');ui.quickStatus.textContent='';ui.quickStatus.classList.remove('error');applyPosition();ui.quickInput.focus()}
  function closeQuickChat(){ui.quickChat.classList.remove('show');ui.quickChat.setAttribute('aria-hidden','true');applyPosition()}
  async function sendQuickChat(){const text=ui.quickInput.value.trim();if(!text){ui.quickInput.focus();return}ui.quickSend.disabled=true;ui.quickStatus.classList.remove('error');ui.quickStatus.textContent='正在发送…';try{const result=await chrome.runtime.sendMessage({type:'relief-send-daily-qa',text});if(!result?.ok)throw new Error(result?.message||'发送失败，请重试。');ui.quickInput.value='';ui.quickStatus.textContent='已发送，在“每日傻瓜QA”中查看回复。';setTimeout(closeQuickChat,1100)}catch(error){ui.quickStatus.textContent=error.message||'发送失败，请检查 ChatGPT 是否已登录。';ui.quickStatus.classList.add('error')}finally{ui.quickSend.disabled=false}}
  function showToast(message){ui.toast.textContent=message;ui.toast.classList.add('show');setTimeout(()=>ui.toast.classList.remove('show'),2100)}
  function pulseCharm(target){if(prefs.mascot!=='mobile')return;ui.mobile.classList.remove('tap-feedback');target.classList.add('is-pressed');void ui.mobile.offsetWidth;ui.mobile.classList.add('tap-feedback');setTimeout(()=>{ui.mobile.classList.remove('tap-feedback');target.classList.remove('is-pressed')},520)}
  function positionReminderCard(){if(!ui.card.classList.contains('show'))return;const pet=ui.petArea.getBoundingClientRect(),card=ui.card.getBoundingClientRect();let left=pet.right-card.width+2,top=pet.top-card.height+22;if(top<12){left=(innerWidth-card.width)/2;top=(innerHeight-card.height)/2}left=Math.max(12,Math.min(innerWidth-card.width-12,left));top=Math.max(12,Math.min(innerHeight-card.height-12,top));ui.card.style.left=`${left}px`;ui.card.style.top=`${top}px`;ui.card.style.right='auto';ui.card.style.bottom='auto'}
  function closeReminder(){clearTimeout(focusTimeout);focusTimeout=null;ui.card.classList.remove('show');ui.shade.classList.remove('show');ui.shade.setAttribute('aria-hidden','true');ui.dock.classList.remove('locked');ui.complete.hidden=false;ui.complete.classList.remove('ready')}
  function showReminder(type){clearTimeout(focusTimeout);focusTimeout=null;closeQuickChat();reminderType=type;snooze=null;due[type]=activeSeconds+Number(prefs[type])*60;ui.card.classList.add('show');ui.complete.hidden=false;ui.complete.classList.remove('ready');ui.complete.textContent=type==='water'?(prefs.focus?'喝水完毕':'去喝水'):(prefs.focus?'休息完毕':'去活动一下');ui.title.textContent=type==='water'?'该喝几口水啦':'起来伸个懒腰吧';ui.copy.textContent=type==='water'?'喝口水，歇一会儿再继续。':'站起来伸展一下，看看远处。';positionReminderCard();if(prefs.focus){ui.dock.classList.add('locked');ui.complete.hidden=true;ui.shade.classList.add('show');ui.shade.setAttribute('aria-hidden','false');focusTimeout=setTimeout(()=>{if(ui.card.classList.contains('show')){ui.complete.hidden=false;ui.complete.classList.add('ready')}},type==='water'?5000:10000)}else{ui.dock.classList.remove('locked');ui.shade.classList.remove('show');ui.shade.setAttribute('aria-hidden','true')}}
  function interval(type){return Number(prefs[type])*60}
  function hidePet(){const value=$('#hideSelect').value;prefs.hideDuration=value;prefs.enabled=false;if(value==='session'){prefs.hideMode='session';prefs.hideUntil=0;sessionStorage.setItem('xiaoqiHidden','1')}else if(value==='forever'){prefs.hideMode='forever';prefs.hideUntil=0}else{prefs.hideMode='timed';prefs.hideUntil=Date.now()+(value==='hour'?3600000:Math.max(1000,new Date().setHours(24,0,0,0)-Date.now()))}persist();applyVisibility();closeSettings()}
  function showPet(notify=true){prefs.enabled=true;prefs.hideMode='';prefs.hideUntil=0;sessionStorage.removeItem('xiaoqiHidden');persist();applyVisibility();if(notify)showToast('陪伴形象回来啦 ✿')}
  const activity=()=>{lastActivity=Date.now()};
  for(const type of ['pointerdown','pointermove','keydown','wheel','touchstart'])document.addEventListener(type,activity,{passive:true,capture:true});
  document.addEventListener('scroll',activity,{passive:true,capture:true});document.addEventListener('visibilitychange',()=>{if(!document.hidden){activity();if(snooze&&Date.now()>=snooze.at&&ui.card.classList.contains('show')===false)showReminder(snooze.type)}});
  shadow.addEventListener('click',event=>{const target=event.target.closest('button');if(!target)return;if(target.matches('[data-action]')){event.preventDefault();event.stopPropagation();if(target.classList.contains('mobile-hit'))pulseCharm(target);if(target.dataset.action==='settings')openSettings();else showReminder(target.dataset.action);return}if(target.id==='pet'&&!dragMoved){if(prefs.mascot==='star')showReminder('water');else if(prefs.mascot==='moon')showReminder('rest');else if(prefs.mascot==='cloud')openSettings();else openSettings()}if(target.id==='openQuickChat')openQuickChat();if(target.id==='closeQuickChat')closeQuickChat();if(target.id==='quickChatSend')sendQuickChat();if(target.id==='openSettings')openSettings();if(target.id==='complete'){closeReminder();activity();showToast(reminderType==='water'?'补好水啦，继续加油 ✿':'慢慢活动一下，我等你回来 ✿')}if(target.id==='snooze'){snooze={type:reminderType,at:Date.now()+prefs.snooze*60000};closeReminder();showToast(`${prefs.snooze} 分钟后再提醒你`)}if(target.id==='closeSettings'||target.id==='doneSettings')closeSettings();if(target.id==='reminderTab')setTab('reminders');if(target.id==='lookTab')setTab('look');if(target.id==='focusSwitch'){prefs.focus=!prefs.focus;prefs.focusConfigured=true;target.setAttribute('aria-checked',String(prefs.focus));persist()}if(target.id==='showSwitch'){if(hiddenNow())showPet();else hidePet()}if(target.id==='resetPosition'){prefs.position=null;persist();applyPosition()}if(target.dataset.mascot){prefs.mascot=target.dataset.mascot;applyMascot();applyPosition();updateSettings();persist()}});
  ui.quickInput.addEventListener('input',()=>{ui.quickInput.style.height='38px';ui.quickInput.style.height=`${Math.min(92,ui.quickInput.scrollHeight)}px`});
  ui.quickInput.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendQuickChat()}});
  shadow.addEventListener('change',event=>{const el=event.target;if(el.id==='waterInput'||el.id==='restInput'||el.id==='snoozeInput'){const key={waterInput:'water',restInput:'rest',snoozeInput:'snooze'}[el.id],limits=key==='snooze'?[1,120]:[1,240];prefs[key]=safeNumber(el.value,...limits,prefs[key]);el.value=prefs[key];if(key!=='snooze')due[key]=activeSeconds+interval(key);persist()}if(el.id==='hideSelect'){prefs.hideDuration=el.value;persist()}});
  ui.settings.addEventListener('click',event=>{if(event.target===ui.settings)closeSettings()});
  let drag=null,dragMoved=false;
  ui.petArea.addEventListener('pointerdown',event=>{if(event.target.closest('[data-action]'))return;if(event.button!==undefined&&event.button!==0)return;dragMoved=false;const r=ui.dock.getBoundingClientRect();drag={id:event.pointerId,x:event.clientX,y:event.clientY,left:r.left,top:r.top};ui.petArea.setPointerCapture(event.pointerId)});
  ui.petArea.addEventListener('pointermove',event=>{if(!drag||drag.id!==event.pointerId)return;const dx=event.clientX-drag.x,dy=event.clientY-drag.y;if(!dragMoved&&Math.hypot(dx,dy)<4)return;dragMoved=true;event.preventDefault();ui.dock.style.left=`${Math.max(4,Math.min(innerWidth-ui.dock.offsetWidth-4,drag.left+dx))}px`;ui.dock.style.top=`${Math.max(4,Math.min(innerHeight-ui.dock.offsetHeight-4,drag.top+dy))}px`;ui.dock.style.right='auto';ui.dock.style.bottom='auto'});
  function endDrag(event){if(!drag||drag.id!==event.pointerId)return;if(dragMoved){savePosition();positionReminderCard()}drag=null;setTimeout(()=>dragMoved=false,0)}ui.petArea.addEventListener('pointerup',endDrag);ui.petArea.addEventListener('pointercancel',endDrag);
  document.addEventListener('keydown',event=>{if(event.key==='Escape'){if(ui.quickChat.classList.contains('show'))closeQuickChat();else if(ui.card.classList.contains('show')&&!prefs.focus)closeReminder();else if(ui.settings.classList.contains('show'))closeSettings()}});
  const sentQuickMessages=new Set(),quickDrafts=new Map();
  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  function getComposerText(composer){return(composer.isContentEditable?composer.innerText:composer.value||'').trim()}
  function findComposer(){return document.querySelector('#prompt-textarea')||document.querySelector('[contenteditable="true"][data-testid="prompt-textarea"]')||document.querySelector('textarea[data-testid="prompt-textarea"]')}
  function findSendButton(){return document.querySelector('button[data-testid="send-button"]')||[...document.querySelectorAll('button')].find(button=>/^(send|发送)( prompt)?$/i.test((button.getAttribute('aria-label')||button.innerText||'').trim()))}
  function insertComposerText(composer,text){
    composer.focus();
    if(composer.isContentEditable){
      const selection=getSelection(),range=document.createRange();range.selectNodeContents(composer);range.collapse(false);selection.removeAllRanges();selection.addRange(range);
      document.execCommand('insertText',false,text);
      if(getComposerText(composer)!==text){composer.replaceChildren(document.createTextNode(text));composer.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:text}));}
    }else{
      const prototype=composer instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
      const setter=Object.getOwnPropertyDescriptor(prototype,'value')?.set;if(setter)setter.call(composer,text);else composer.value=text;
      composer.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:text}));composer.dispatchEvent(new Event('change',{bubbles:true}));
    }
  }
  async function forwardQuickMessage(message){
    if(location.origin!=='https://chatgpt.com')return{ok:false,retryable:true,message:'正在连接目标会话…'};
    if(!location.pathname.includes('6ae34419-307c-83ea-8cea-669b03555e15'))return{ok:false,retryable:true,message:'正在等待“每日傻瓜QA”载入…'};
    const text=typeof message.text==='string'?message.text.trim():'';
    if(!text||text.length>4000)return{ok:false,retryable:false,message:'消息内容无效。'};
    if(sentQuickMessages.has(message.requestId))return{ok:true};
    const composer=findComposer();
    if(!composer)return{ok:false,retryable:true,message:'正在等待对话输入框…'};
    let current=getComposerText(composer);
    const isOurDraft=quickDrafts.get(message.requestId)===text;
    if(current&&!isOurDraft)return{ok:false,retryable:false,message:'目标对话里已有未发送草稿。请先处理草稿，再发送这条消息。'};
    if(!current){insertComposerText(composer,text);quickDrafts.set(message.requestId,text);}
    for(let i=0;i<60;i++){
      const sendButton=findSendButton();
      if(sendButton&&!sendButton.disabled&&sendButton.getAttribute('aria-disabled')!=='true')break;
      await sleep(100);
    }
    const sendButton=findSendButton();
    if(!sendButton||sendButton.disabled||sendButton.getAttribute('aria-disabled')==='true')return{ok:false,retryable:false,message:'消息已填入，但 ChatGPT 没有启用发送按钮。请检查输入框后再试。'};
    sendButton.click();
    sentQuickMessages.add(message.requestId);
    quickDrafts.delete(message.requestId);
    const expected=text.replace(/\s+/g,' ').trim();
    for(let i=0;i<80;i++){
      await sleep(150);
      const liveComposer=findComposer()||composer;
      const remaining=getComposerText(liveComposer).replace(/\s+/g,' ').trim();
      const stopButton=document.querySelector('button[data-testid="stop-button"]');
      const userMessages=[...document.querySelectorAll('[data-message-author-role="user"]')];
      const messageVisible=userMessages.some(node=>node.innerText.replace(/\s+/g,' ').trim().includes(expected));
      if(stopButton||(!remaining&&messageVisible))return{ok:true};
      if(!remaining&&document.querySelector('main')?.innerText.includes(text))return{ok:true};
    }
    return{ok:false,retryable:false,message:'已点击发送，但未能确认消息进入对话。请检查目标会话，避免重复发送。'};
  }
  chrome.runtime.onMessage.addListener((message,sender,sendResponse)=>{
    if(message?.type==='relief-insert-daily-qa'){forwardQuickMessage(message).then(sendResponse).catch(()=>sendResponse({ok:false,retryable:true,message:'发送时遇到页面错误。'}));return true}
    if(message?.type!=='xiaoqi-command')return;initialization.then(()=>{let visible=false;if(message.command==='show'){showPet();const rect=ui.petArea.getBoundingClientRect();visible=host.isConnected&&getComputedStyle(host).display!=='none'&&rect.width>0&&rect.height>0}else if(message.command==='settings'){showPet(false);openSettings();const rect=ui.settings.getBoundingClientRect();visible=ui.settings.classList.contains('show')&&getComputedStyle(ui.settings).display!=='none'&&rect.width>0&&rect.height>0}sendResponse({ok:visible,visible,version:CONTENT_VERSION})}).catch(()=>sendResponse({ok:false,visible:false,version:CONTENT_VERSION}));return true
  });
  initialization=chrome.storage.local.get(defaults).then(values=>{prefs={...defaults,...values};prefs.water=safeNumber(prefs.water,1,240,45);prefs.rest=safeNumber(prefs.rest,1,240,50);prefs.snooze=safeNumber(prefs.snooze,1,120,10);if(!choices.some(([id])=>id===prefs.mascot))prefs.mascot='pets';if(!prefs.focusConfigured){prefs.focus=true;prefs.focusConfigured=true;persist()}due.water=prefs.water*60;due.rest=prefs.rest*60;applyMascot();applyPosition();applyVisibility()});
  window.addEventListener('resize',()=>{applyPosition();positionReminderCard()});
  setInterval(()=>{if(!prefs.enabled&&prefs.hideMode==='timed'&&Date.now()>=prefs.hideUntil){prefs.enabled=true;prefs.hideMode='';prefs.hideUntil=0;persist();applyVisibility()}if(document.hidden||Date.now()-lastActivity>60000){ui.dot.style.background='#bbb';return}ui.dot.style.background='#79a58a';activeSeconds++;ui.clock.textContent=`${String(Math.floor(activeSeconds/60)).padStart(2,'0')}:${String(activeSeconds%60).padStart(2,'0')}`;if(snooze&&Date.now()>=snooze.at&&ui.card.classList.contains('show')===false){const type=snooze.type;snooze=null;showReminder(type);return}if(!ui.card.classList.contains('show')){const dueType=['water','rest'].filter(type=>activeSeconds>=due[type]).sort((a,b)=>due[a]-due[b])[0];if(dueType)showReminder(dueType)}},1000);
})();
