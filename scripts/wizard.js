/* ================= هستهٔ عمومیِ ویزاردِ «ریلِ کد» =================
   این فایل همان تجربه‌ای را که پنلِ «ثبت سند / فایل جدید» ساخته، به‌صورتِ یک موتورِ
   پیکربندی‌پذیر در اختیارِ بخش‌های دیگر می‌گذارد: ریلِ افقیِ کد در بالا (هم مسیرِ
   پیشرفت، هم پیش‌نمایشِ زندهٔ کد)، آکاردئونِ ایستگاه‌ها در پایین، و یک «بخشِ نهایی»
   که پس از کاملِ‌شدنِ کد باز می‌شود.

   ⚠ پنلِ ثبتِ سند (scripts/documents.js) عمداً دست‌نخورده مانده و کدِ خودش را دارد؛
   این موتور برای بخش‌های تازه است تا ظاهر و انیمیشن‌ها یکی بماند. کلاس‌های CSS هم
   همان `nd-*` هستند (styles/features.css) — تک‌منبعِ ظاهر.

   همیشه حداکثر یک ویزارد باز است (هر دو مودال‌اند)، پس یک وضعیتِ سراسری کافی است. */

var WZ = { cfg:null, active:"", timers:[], scrollRAF:null };

var WZ_CHEV ='<svg class="nd-chev" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>';
var WZ_OK_IC='<svg class="nd-ok" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>';
var WZ_INFO_IC='<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
var WZ_PLUS_IC='<svg viewBox="0 0 24 24" class="ic"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';

function wzVal(f){ var el=document.getElementById(f); return el?el.value:""; }
function wzSet(f,v){ var el=document.getElementById(f); if(el) el.value=(v==null?"":v); }
function wzEl(k){ var c=WZ.cfg; return (c&&c.ids[k])?document.getElementById(c.ids[k]):null; }
function wzCall(name,a,b){ var c=WZ.cfg; return (c&&typeof c[name]==="function")?c[name](a,b):undefined; }

/* ---- منطقِ پیشرفت: اولین ایستگاهِ ناقص، ورودپذیری ---- */
function wzFirstIncomplete(){ var o=WZ.cfg.order; for(var i=0;i<o.length;i++){ if(!wzVal(o[i])) return o[i]; } return null; }
function wzComplete(){ return wzFirstIncomplete()===null; }
function wzCanEnter(field){
  if(WZ.cfg.readOnly) return false;                       // حالتِ ویرایش: هویتِ رکورد قفل است
  var idx=WZ.cfg.order.indexOf(field); if(idx<=0) return true;
  return !!wzVal(WZ.cfg.order[idx-1]);
}
/* ایستگاهی که هم‌اکنون در حالِ تکمیل است (بزرگ‌نمایی + نوارِ چرخانِ نارنجی) */
function wzCurrentField(){ return (WZ.active && WZ.cfg.meta[WZ.active] && wzCanEnter(WZ.active)) ? WZ.active : wzFirstIncomplete(); }

function wzClearTimers(){ for(var i=0;i<WZ.timers.length;i++) clearTimeout(WZ.timers[i]); WZ.timers=[];
  if(WZ.scrollRAF){ cancelAnimationFrame(WZ.scrollRAF); WZ.scrollRAF=null; } }

/* انتخابِ یک گزینه: پایین‌دستی‌ها بی‌اعتبار می‌شوند و کوریوگرافیِ تأیید اجرا می‌شود */
function wzPick(field,val){
  wzClearTimers();
  if(wzVal(field)===String(val)){ WZ.active=wzFirstIncomplete(); wzRender(); return; }   // انتخابِ دوبارهٔ همان مقدار: آبشار پاک نشود
  wzSet(field,val);
  var o=WZ.cfg.order, idx=o.indexOf(field);
  for(var i=idx+1;i<o.length;i++) wzSet(o[i],"");
  wzCall("recompute");
  WZ.active=wzFirstIncomplete();
  wzAnimateConfirm(field);
}
/* کلیک روی یک سلولِ ریل = ریستِ همان سلول و پایین‌دستی‌هایش، سپس فعال‌شدنِ خودش */
function wzGoto(field){
  var c=WZ.cfg; if(!c) return;
  if(field==="FSM"||field===c.tail) return;      // ایستگاه‌های خودکار، کاربر‌ویرایش‌پذیر نیستند
  if(!wzCanEnter(field)) return;
  wzClearTimers();
  var wasActive=(wzCurrentField()===field);
  var idx=c.order.indexOf(field);
  if(idx>=0) for(var i=idx;i<c.order.length;i++) wzSet(c.order[i],"");
  wzCall("recompute");
  WZ.active=field; wzRenderStage();
  if(wasActive){ wzSyncStates(); return; }       // فقط ریست؛ رینگِ چرخان پیوسته می‌ماند
  wzScrollToActive();
  var rail=wzEl("rail");
  var oldEl=rail?rail.querySelector(".nd-chip.active"):null, oldF=oldEl?oldEl.getAttribute("data-f"):null;
  var ring=wzEl("ring");
  if(ring) ring.classList.remove("show");                                                   // ۱: محوِ رینگ
  if(oldF && oldEl && oldF!==field) oldEl.className="nd-chip "+wzCellState(oldF, field);     // ۲: سلولِ قبلی به سایزِ اصلی
  WZ.timers.push(setTimeout(function(){
    wzSyncStates();                                                                          // ۳: سوئیچ
    WZ.timers.push(setTimeout(function(){ wzPlaceRing(false); }, 380));                      // ۴: رینگِ جدید
  }, 340));
}

/* ============ ریل ============ */
function wzSeqList(){ var c=WZ.cfg; return ["FSM"].concat(c.order).concat(c.tail?[c.tail]:[]); }
function wzFilled(f){ return f==="FSM" ? true : !!wzVal(f); }
function wzSegVal(f){
  if(f==="FSM") return (typeof FSM_CODE!=="undefined")?FSM_CODE:"FSM";
  var v=wzCall("segVal",f); return v==null?"":String(v);
}
function wzCellState(f,curF){
  var c=WZ.cfg;
  if(f==="FSM") return "fixed";
  if(f===c.tail) return wzSegVal(f)?"done":"locked";
  return (f===curF)?"active":(wzVal(f)?"done":(wzCanEnter(f)?"next":"locked"));
}
function wzBuildRail(){
  var rail=wzEl("rail"); if(!rail) return;
  var c=WZ.cfg, h='<div class="nd-rail-in">', curF=wzCurrentField(), seq=wzSeqList();
  seq.forEach(function(f,i){
    var st=wzCellState(f,curF), v=wzSegVal(f);
    h+='<button type="button" class="nd-chip '+st+'" data-f="'+f+'"><span class="nd-chip-val">'+(v?esc(v):"—")+'</span><span class="nd-chip-cap">'+(c.en[f]||"")+'</span></button>';
    if(i<seq.length-1) h+='<span class="nd-cx'+(wzFilled(f)?" on":"")+'" data-i="'+i+'"></span>';
  });
  h+='</div><div class="nd-ring" id="'+c.ids.ring+'"></div><div class="nd-pulse" id="'+c.ids.pulse+'"></div>';
  rail.innerHTML=h;
  var inrow=rail.querySelector(".nd-rail-in");
  if(inrow) inrow.addEventListener("click",function(e){
    var chip=e.target.closest && e.target.closest(".nd-chip"); if(!chip||chip.disabled) return;
    var f=chip.getAttribute("data-f"); if(f) wzGoto(f);
  });
}
function wzSyncStates(){
  var rail=wzEl("rail"); if(!rail) return;
  if(!rail.querySelector(".nd-rail-in")) wzBuildRail();
  var c=WZ.cfg, curF=wzCurrentField(), seq=wzSeqList();
  seq.forEach(function(f){
    var chip=rail.querySelector('.nd-chip[data-f="'+f+'"]'); if(!chip) return;
    chip.className="nd-chip "+wzCellState(f,curF);
    var val=chip.querySelector(".nd-chip-val"), v=wzSegVal(f); if(val) val.textContent=v||"—";
    /* حالتِ ویرایش: هویتِ رکورد قفل است، پس هیچ سلولی کلیک‌پذیر نیست */
    chip.disabled=c.readOnly||!((f!=="FSM"&&f!==c.tail)&&!!(wzVal(f)||wzCanEnter(f)));
  });
  rail.querySelectorAll(".nd-cx").forEach(function(cx){
    cx.classList.toggle("on", wzFilled(seq[parseInt(cx.getAttribute("data-i"),10)]));
  });
}
function wzSyncRail(){ wzSyncStates(); wzPlaceRing(false); }
function wzRectIn(container,el){ var cr=container.getBoundingClientRect(), er=el.getBoundingClientRect();
  return {left:er.left-cr.left, top:er.top-cr.top, width:er.width, height:er.height}; }
function wzPlaceRing(anim){
  var rail=wzEl("rail"), ring=wzEl("ring"); if(!rail||!ring) return;
  var act=rail.querySelector(".nd-chip.active");
  if(!act){ ring.classList.remove("show"); return; }
  var r=wzRectIn(rail,act);
  if(!anim) ring.style.transition="none";
  ring.style.left=r.left+"px"; ring.style.top=r.top+"px"; ring.style.width=r.width+"px"; ring.style.height=r.height+"px";
  if(!anim){ void ring.offsetWidth; ring.style.transition=""; }
  ring.classList.add("show");
}
/* کوریوگرافیِ تأییدِ یک سلول — عیناً هم‌زمان‌بندیِ پنلِ ثبتِ سند:
   ۰) آکاردئونِ پایین + اسکرولِ دنباله‌رو + پالس ۱) نگه‌داشتنِ سلولِ تأییدشده
   ۲) کوچک‌شدنِ آن و بزرگ‌شدنِ سلولِ بعدی ۳) نشستنِ رینگ روی سلولِ تازه. */
function wzAnimateConfirm(fromF){
  var rail=wzEl("rail"); if(!rail){ wzRender(); wzScrollToActive(); return; }
  if(!rail.querySelector(".nd-rail-in")) wzBuildRail();
  var A=rail.querySelector('.nd-chip[data-f="'+fromF+'"]');
  var ring=wzEl("ring"), pulse=wzEl("pulse");
  if(!A||!ring||!pulse){ wzRender(); wzScrollToActive(); return; }
  wzRenderStage();
  wzScrollToActive();
  A.className="nd-chip done held";
  var av=A.querySelector(".nd-chip-val"); if(av) av.textContent=wzSegVal(fromF)||"—";
  ring.classList.remove("show");
  var ra=wzRectIn(rail,A);
  pulse.style.left=ra.left+"px"; pulse.style.top=ra.top+"px"; pulse.style.width=ra.width+"px"; pulse.style.height=ra.height+"px";
  pulse.classList.remove("go"); void pulse.offsetWidth; pulse.classList.add("go");
  WZ.timers.push(setTimeout(function(){
    A.classList.remove("held");
    wzSyncStates();
    var curF=wzCurrentField(), B=curF?rail.querySelector('.nd-chip[data-f="'+curF+'"]'):null;
    if(!B){ ring.classList.remove("show");
      WZ.timers.push(setTimeout(function(){
        wzSizeSpacer(); var s=wzEl("scroll");
        if(s) s.scrollTop=Math.max(0, s.scrollHeight - s.clientHeight);
      }, 700));
      return; }
    WZ.timers.push(setTimeout(function(){ wzPlaceRing(false); }, 400));
  }, 560));
}

/* ============ آکاردئونِ ایستگاه‌ها ============ */
function wzBuildAcc(){
  var stage=wzEl("stage"); if(!stage) return;
  if(stage.querySelector(".nd-acc")) return;
  var c=WZ.cfg, h='<div class="nd-acc">';
  c.order.forEach(function(f){
    h+='<div class="nd-sec" data-f="'+f+'">'+
        '<div class="nd-sec-hd" onclick="wzGoto(\''+f+'\')">'+
          '<span class="nd-sec-ic">'+(wzCall("titleIc",f)||"")+'</span>'+
          '<span class="nd-sec-t">'+esc(c.meta[f].cap)+'</span>'+
          '<span class="nd-sec-add-slot"></span>'+
          '<span class="nd-sec-chev">'+WZ_CHEV+'</span>'+
        '</div>'+
        '<div class="nd-sec-body"><div class="nd-sec-inner">'+
          '<div class="nd-sec-div"></div>'+
          '<div class="nd-sec-rows"></div>'+
        '</div></div>'+
       '</div>';
  });
  stage.innerHTML=h+'</div>';
}
function wzSyncAcc(){
  var stage=wzEl("stage"); if(!stage) return;
  if(!stage.querySelector(".nd-acc")) wzBuildAcc();
  var c=WZ.cfg, active=wzCurrentField();
  c.order.forEach(function(f){
    var sec=stage.querySelector('.nd-sec[data-f="'+f+'"]'); if(!sec) return;
    var st=(f===active)?"active":(wzVal(f)?"done":(wzCanEnter(f)?"next":"locked"));
    sec.className="nd-sec "+st;
    var slot=sec.querySelector(".nd-sec-add-slot"); if(slot) slot.innerHTML=(f===active)?wzAddSlotHTML(f):"";
    var rows=sec.querySelector(".nd-sec-rows");
    if(rows) rows.innerHTML=(f===active)?wzSecRowsHTML(f):(wzVal(f)?wzDoneCellHTML(f):"");
  });
}
function wzOpt(f,val){ var l=wzCall("options",f)||[]; for(var i=0;i<l.length;i++) if(String(l[i].val)===String(val)) return l[i]; return null; }
function wzDoneCellHTML(f){
  var o=wzOpt(f,wzVal(f)); if(!o) return "";
  var ro=WZ.cfg.readOnly;
  return '<div class="nd-list"><button type="button" class="nd-opt on"'+(ro?' disabled':' onclick="wzGoto(\''+f+'\')"')+'>'+
    '<span class="nd-opt-ic">'+o.icon+'</span>'+
    '<span class="nd-opt-body"><span class="nd-opt-lab">'+esc(o.label)+'</span>'+
      (o.sub?'<span class="nd-opt-sub">'+esc(o.sub)+'</span>':'')+'</span>'+
    '<span class="nd-opt-ck">'+WZ_OK_IC+'</span></button></div>';
}
/* دکمهٔ «+» درونِ هدرِ ایستگاهِ فعال — فقط آیکون، هم‌سبکِ بقیهٔ سایت */
function wzAddSlotHTML(field){
  var t=(WZ.cfg.addTitles||{})[field]; if(!t) return "";
  return '<button type="button" class="icon-btn" title="'+esc(t)+'" onclick="event.stopPropagation();wzAddNew(\''+field+'\')">'+WZ_PLUS_IC+'</button>';
}
function wzAddNew(field){ wzCall("addNew",field); }
function wzSecRowsHTML(f){
  var opts=wzCall("options",f)||[], cur=wzVal(f);
  var list=opts.length
    ? '<div class="nd-list">'+opts.map(function(o){ return wzOptHTML(f,o,String(o.val)===String(cur)); }).join("")+'</div>'
    : '<div class="nd-menu-empty">'+esc(wzCall("emptyMsg",f)||"موردی برای انتخاب نیست.")+'</div>';
  var hint=wzCall("stepHint",f);
  return list+(hint?'<div class="nd-step-hint">'+WZ_INFO_IC+esc(hint)+'</div>':'');
}
function wzOptHTML(field,o,on){
  return '<button type="button" class="nd-opt'+(on?' on':'')+(o.special?' special':'')+'" onclick="wzPick(\''+field+'\',\''+esc(o.val)+'\')">'+
    '<span class="nd-opt-ic">'+o.icon+'</span>'+
    '<span class="nd-opt-body"><span class="nd-opt-lab">'+esc(o.label)+'</span>'+
      (o.sub?'<span class="nd-opt-sub">'+esc(o.sub)+'</span>':'')+'</span>'+
    (on?('<span class="nd-opt-ck">'+WZ_OK_IC+'</span>'):'')+'</button>';
}

/* ============ رندر + اسکرولِ خودکار ============ */
function wzRenderStage(){
  wzBuildAcc(); wzSyncAcc();
  var fin=wzEl("final");
  if(fin){
    if(wzComplete()){
      if(fin.hidden || !fin.firstChild){
        fin.hidden=false;
        fin.innerHTML='<div class="nd-fin-wrap">'+(wzCall("finalHTML")||"")+'</div>';
        wzCall("onFinalShown");
        fin.classList.remove("show"); void fin.offsetWidth;
        requestAnimationFrame(function(){ var f2=wzEl("final"); if(f2) f2.classList.add("show"); });
      } else { wzCall("onFinalSync"); }
    } else { fin.hidden=true; fin.innerHTML=""; fin.classList.remove("show"); }
  }
  wzSizeSpacer();
}
function wzRender(){ wzClearTimers(); wzSyncRail(); wzRenderStage(); }
function wzSizeSpacer(){
  var sc=wzEl("scroll"), sp=wzEl("spacer");
  if(!sc || !sp) return;
  if(!sc.clientHeight){ sp.style.height="0px"; return; }
  if(!wzComplete()){ sp.style.height=sc.clientHeight+"px"; return; }
  sp.style.height="14px";
}
function wzScrollToActive(){
  var sc=wzEl("scroll"); if(!sc) return;
  var stage=wzEl("stage"); if(!stage) return;
  var acc=stage.querySelector(".nd-acc"); if(!acc) return;
  var secs=acc.querySelectorAll(".nd-sec"); if(!secs.length) return;
  var active=acc.querySelector(".nd-sec.active");
  if(!active){ wzFollowScrollBottom(sc); return; }
  var gap=12, above=0;
  for(var i=0;i<secs.length;i++){
    if(secs[i]===active) break;
    var hd=secs[i].querySelector(".nd-sec-hd"), inner=secs[i].querySelector(".nd-sec-inner");
    var open=secs[i].classList.contains("active")||secs[i].classList.contains("done");
    above += (hd?hd.offsetHeight:0) + (open&&inner?inner.scrollHeight:0) + gap;
  }
  wzFollowScroll(sc, above);
}
function wzFollowScroll(sc, target){
  if(WZ.scrollRAF){ cancelAnimationFrame(WZ.scrollRAF); WZ.scrollRAF=null; }
  var startTop=sc.scrollTop, startT=Date.now(), dur=620;
  function step(){
    var t=Math.min(1,(Date.now()-startT)/dur), e=1-Math.pow(1-t,3);
    var max=Math.max(0, sc.scrollHeight - sc.clientHeight);
    sc.scrollTop=Math.min(startTop+(target-startTop)*e, max);
    if(t<1) WZ.scrollRAF=requestAnimationFrame(step); else WZ.scrollRAF=null;
  }
  step();
}
function wzFollowScrollBottom(sc){
  if(WZ.scrollRAF){ cancelAnimationFrame(WZ.scrollRAF); WZ.scrollRAF=null; }
  var startTop=sc.scrollTop, startT=Date.now(), dur=620;
  function step(){
    var t=Math.min(1,(Date.now()-startT)/dur), e=1-Math.pow(1-t,3);
    var max=Math.max(0, sc.scrollHeight - sc.clientHeight);
    sc.scrollTop=startTop+(max-startTop)*e;
    if(t<1){ WZ.scrollRAF=requestAnimationFrame(step); } else { sc.scrollTop=max; WZ.scrollRAF=null; }
  }
  step();
}

/* ---- باز/بسته‌کردنِ یک ویزارد ---- */
function wzOpen(cfg){
  wzClearTimers();
  WZ.cfg=cfg; WZ.active=cfg.order[0];
  cfg.order.forEach(function(f){ wzSet(f,""); });
  wzCall("reset");
  var rail=wzEl("rail"); if(rail) rail.innerHTML="";
  var stage=wzEl("stage"); if(stage) stage.innerHTML="";
  var fin=wzEl("final"); if(fin){ fin.hidden=true; fin.innerHTML=""; fin.classList.remove("show"); }
  var m=document.getElementById(cfg.ids.modal); if(m) m.classList.remove("hidden");
  modalLock();
  var sc=wzEl("scroll"); if(sc) sc.scrollTop=0;
}
function wzClose(){
  wzClearTimers();
  var c=WZ.cfg; if(!c) return;
  var m=document.getElementById(c.ids.modal); if(m) m.classList.add("hidden");
  if(typeof anyModalOpen!=="function" || !anyModalOpen()) modalUnlock();
}
function wzIsOpen(id){ var m=document.getElementById(id); return !!(m && !m.classList.contains("hidden")); }
