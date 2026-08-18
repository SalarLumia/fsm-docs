/* ================= ثبت سند / فایل جدید — ویزاردِ «ریلِ افقیِ شماره» =================
   شماره: FSM-CLIENT-ORDER-PROJECT-PART-TYPE-REV. کاربر ایستگاه‌به‌ایستگاه پیش می‌رود؛ هر
   ایستگاه تا ایستگاهِ قبلی کامل نشود قفل است (قبل از مشتری نمی‌توان سراغِ پروژه رفت). ریلِ بالای
   پنل هم «مسیرِ پیشرفت» است و هم «پیش‌نمایشِ زندهٔ شماره»؛ با هر انتخاب، آن قطعه از شماره ساخته می‌شود.
   ترتیبِ عمدیِ PART پیش از TYPE: با انتخابِ قطعهٔ ۰۰ فقط انواعِ سطحِ پروژه و با قطعهٔ واقعی فقط
   انواعِ سطحِ قطعه پیشنهاد می‌شود؛ همان قانونِ بک‌اند، این‌بار در UI. */

var ND = { active:"nClient" };
var ND_ORDER = ["nClient","nOrder","nProject","nPart","nType"];   // ایستگاه‌های عددیِ شماره (REV خودکار است)
var ND_META = {
  nClient:{cap:"مشتری",  step:1, ph:"مشتری را انتخاب کنید"},
  nOrder :{cap:"سفارش",  step:2, ph:"سفارش را انتخاب کنید"},
  nProject:{cap:"پروژه", step:3, ph:"پروژه را انتخاب کنید"},
  nPart  :{cap:"قطعه",   step:4, ph:"قطعه را انتخاب کنید"},
  nType  :{cap:"نوع سند",step:5, ph:"نوع سند را انتخاب کنید"}
};
/* آیکون‌های ویزارد */
var ND_CHEV ='<svg class="nd-chev" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>';
var ND_OK_IC='<svg class="nd-ok" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>';
var ND_UPLOAD='<svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>';
var ND_COPY ='<svg class="ic" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
var ND_INFO_IC='<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';

function ndFa(s){ return String(s).replace(/[0-9]/g,function(d){ return "۰۱۲۳۴۵۶۷۸۹".charAt(+d); }); }
function ndVal(f){ var el=document.getElementById(f); return el?el.value:""; }
function ndSet(f,v){ var el=document.getElementById(f); if(el) el.value=(v==null?"":v); }
/* آیا پنل ثبت سند اکنون باز است؟ (برای همگام‌سازی خودکار پس از افزودن سفارش/پروژه) */
function newDocOpen(){ var m=document.getElementById("newDocModal"); return !!(m && !m.classList.contains("hidden")); }

/* ---- گزینه‌های هر ایستگاه (با آیکونِ ماژول: لوگوی مشتری، بَجِ عددی، المانِ نوعِ سند) ---- */
function ndElBadge(inner){ return '<span class="el-badge nd-el">'+inner+'</span>'; }
function ndNumBadge(n){ return ndElBadge('<span class="el-code">'+esc(pad2(n))+'</span>'); }
/* label = نامِ خواناش؛ کد/شمارهٔ هر مورد داخلِ آیکون است، پس دیگر sub (پانوشتِ کد) نمایش داده نمی‌شود */
function ndOptions(field){
  if(field==="nClient") return clientsSorted().map(function(c){
    return {val:c.code, label:c.name, icon:'<span class="nd-logo">'+cpLogo(c,30)+'</span>'}; });
  if(field==="nOrder"){ var c=ndVal("nClient"); if(!c) return [];
    return ordersOf(c).map(function(o){ var n=pad2(o.orderNo);
      return {val:n, label:(o.title||("سفارش "+n)), icon:ndNumBadge(n)}; }); }   // تیتر = نامِ سفارش، نه «سفارش ۰۱»
  if(field==="nProject"){ var c2=ndVal("nClient"), o2=ndVal("nOrder"); if(!c2||!o2) return [];
    return projectsOf(c2,o2).map(function(p){ var n=pad2(p.projectNo);
      return {val:n, label:(p.description||("پروژه "+n)), icon:ndNumBadge(n)}; }); }
  if(field==="nPart"){
    var arr=partsSorted().map(function(p){ var n=pad2(p.partNo);
      return {val:n, label:partNameFa(n), icon:ndElBadge(partIconInner(p))}; });   // بدونِ نامِ انگلیسی
    arr.push({val:"00", label:"سند پروژه", icon:ndElBadge('<span class="el-code">00</span>')});   // مثلِ بقیه: بدونِ رنگِ ویژه و بدونِ زیرنویس
    return arr; }
  if(field==="nType"){
    var scope=(ndVal("nPart")==="00")?"project":"part";
    return docTypesSorted().filter(function(t){ return (t.scope||"part")===scope; }).map(function(t){
      return {val:String(t.code).toUpperCase(), label:(t.nameFa||t.code), icon:ndElBadge(docTypeIconInner(t))}; }); }   // بدونِ کد
  return [];
}
/* اکشنِ «افزودنِ جدید» (دکمه‌اش در هدرِ ایستگاه است — ndAddSlotHTML) */
function ndAddNew(field){
  ndCloseMenu();
  if(field==="nClient") cpOpenClientModal("");
  else if(field==="nOrder"){ if(ndVal("nClient")){ _cp.client=ndVal("nClient"); cpOpenOrderModal(""); } else toast("ابتدا مشتری را انتخاب کنید.",true); }
  else if(field==="nProject"){ if(ndVal("nClient")&&ndVal("nOrder")){ _cp.client=ndVal("nClient"); _cp.order=pad2(ndVal("nOrder")); cpOpenProjectModal(""); } else toast("ابتدا مشتری و سفارش را انتخاب کنید.",true); }
}

/* ---- منطقِ پیشرفت: اولین ایستگاهِ ناقص، ورودپذیری، آبشارِ ریست ---- */
function ndFirstIncomplete(){ for(var i=0;i<ND_ORDER.length;i++){ if(!ndVal(ND_ORDER[i])) return ND_ORDER[i]; } return null; }
function ndComplete(){ return ndFirstIncomplete()===null; }
function ndCanEnter(field){ var idx=ND_ORDER.indexOf(field); if(idx<=0) return true; return !!ndVal(ND_ORDER[idx-1]); }
function ndRecomputeRev(){
  var c=ndVal("nClient"),o=ndVal("nOrder"),pr=ndVal("nProject"),pt=ndVal("nPart"),ty=ndVal("nType");
  ndSet("nRev", (c&&o&&pr&&pt&&ty) ? computeNextRev(c,o,pr,pt,ty) : "");
}
function ndPick(field,val){
  ndClearTimers();
  if(ndVal(field)===String(val)){ ND.active=ndFirstIncomplete(); ndCloseMenu(); ndRender(); return; }   // انتخابِ دوبارهٔ همان مقدار: آبشار پاک نشود
  ndSet(field,val);
  var idx=ND_ORDER.indexOf(field);
  for(var i=idx+1;i<ND_ORDER.length;i++) ndSet(ND_ORDER[i],"");   // پایین‌دستی‌ها بی‌اعتبار می‌شوند
  ndRecomputeRev();
  ND.active=ndFirstIncomplete();       // پیش‌رفت به اولین ایستگاهِ ناقص
  ndCloseMenu();
  // بخشِ پایین بی‌درنگ عوض نمی‌شود؛ کولپسِ سکشنِ فعلی و اکسپندِ بعدی همراهِ انیمیشنِ ریل (۵۶۰ms) رخ می‌دهد
  ndAnimateConfirm(field);             // کوریوگرافیِ ریل: تأیید ← پالس ← بزرگ‌شدنِ سلولِ بعدی + جابه‌جاییِ آکاردئون
}
/* کلیک روی یک سلول = ریستِ همان سلول و همهٔ سلول‌های جلویی‌اش (پایین‌دستی)، سپس فعال‌شدنِ همان سلول.
   - کلیک روی سلولِ فعال: فقط ریست؛ نوارِ نارنجیِ چرخان متوقف/دوباره‌شروع نمی‌شود و پیوسته دور می‌زند.
   - کلیک روی سلولِ قبلی (تکمیل‌شده): همهٔ سلول‌های بینِ آن و سلولِ فعلی ریست، و توالیِ نرمِ سوئیچ اجرا می‌شود:
     ۱) محوِ رینگ ۲) سلولِ قبلی به سایزِ اصلی ۳) سوئیچ و بزرگ‌شدنِ سلولِ جدید ۴) شروعِ دوبارهٔ چرخشِ رینگ. */
function ndGoto(field){
  if(field==="FSM"||field==="nRev") return;        // این دو ایستگاه کاربر‌ویرایش‌پذیر نیستند (REV خودکار)
  if(!ndCanEnter(field)) return;                    // سلولِ قفل: نادیده
  ndClearTimers();
  var wasActive=(ndCurrentField()===field);         // آیا روی همان سلولِ فعال کلیک شد؟
  var idx=ND_ORDER.indexOf(field);                  // ریست: خودِ این سلول و همهٔ جلویی‌ها پاک شوند
  if(idx>=0) for(var i=idx;i<ND_ORDER.length;i++) ndSet(ND_ORDER[i],"");
  ndRecomputeRev();
  ND.active=field; ndCloseMenu(); ndRenderStage();
  if(wasActive){ ndSyncStates(); return; }          // فقط ریست؛ رینگِ چرخان دست‌نخورده و پیوسته می‌ماند
  ndScrollToActive();                                // اسکرولِ نرم، هم‌زمان با انیمیشنِ سوئیچ
  var rail=document.getElementById("ndRail");
  var oldEl=rail?rail.querySelector(".nd-chip.active"):null, oldF=oldEl?oldEl.getAttribute("data-f"):null;
  var ring=document.getElementById("ndRing");
  if(ring) ring.classList.remove("show");                                  // ۱: چرخشِ رینگ متوقف/محو
  if(oldF && oldEl && oldF!==field) oldEl.className="nd-chip "+ndCellState(oldF, field);   // ۲: سلولِ قبلی به سایزِ اصلی
  _ndTimers.push(setTimeout(function(){
    ndSyncStates();                                                        // ۳: سوئیچ — سلولِ جدید بزرگ می‌شود
    _ndTimers.push(setTimeout(function(){ ndPlaceRing(false); }, 380));    // ۴: رینگ روی سلولِ جدید، بدونِ سُر‌خوردن، و شروعِ دوبارهٔ چرخش
  }, 340));
}

/* ---- منوی سفارشی (تریگر + منوی متحرک + بستن با کلیکِ بیرون)، هم‌شکلِ بقیهٔ دراپ‌داون‌های سایت ---- */
/* نسخهٔ آکاردئونی منوی شناور ندارد؛ فهرست همیشه داخلِ ردیفِ فعال است. این تابع برای سازگاریِ فراخوانی‌های قبلی بی‌اثر مانده. */
function ndCloseMenu(){}

/* ---- رندرِ کامل: ریل + ایستگاهِ فعال + بخشِ نهایی ---- */
function ndReset(){
  ND={ active:"nClient" };
  ["nClient","nOrder","nProject","nPart","nType","nRev"].forEach(function(f){ ndSet(f,""); });
  var t=document.getElementById("nTitle"); if(t) t.value="";
  _newDocBlocked=false;
}
/* بخشِ پایینِ پنل: آکاردئونِ ایستگاه‌ها (همه حاضر، فقط ایستگاهِ فعال باز) + بخشِ نهایی */
function ndRenderStage(){
  ndBuildAcc();     // یک‌بار ساخته می‌شود
  ndSyncAcc();      // کولپس/اکسپند + به‌روزرسانیِ رکوردهای ایستگاهِ فعال
  var fin=document.getElementById("ndFinal");
  if(fin){
    if(ndComplete()){
      if(fin.hidden || !fin.firstChild){                    // اولین‌بار: بساز + انیمیشنِ باز‌شدن (grid 0fr→1fr، هم‌سبک و هم‌زمانِ سکشن‌ها)
        fin.hidden=false;
        fin.innerHTML='<div class="nd-fin-wrap">'+ndFinalHTML()+'</div>';
        ndBindDropzones(); updateRevMode();
        fin.classList.remove("show"); void fin.offsetWidth;
        requestAnimationFrame(function(){ var f2=document.getElementById("ndFinal"); if(f2) f2.classList.add("show"); });
      } else { updateRevMode(); }                            // قبلاً باز است: فقط پیامِ ریویژن به‌روز شود (انیمیشن ریست نشود)
    } else { fin.hidden=true; fin.innerHTML=""; fin.classList.remove("show"); }
  }
  ndSizeSpacer();   // spacer بر اساسِ کامل‌بودن/نبودنِ شماره به‌روز شود
}
/* رندرِ کاملِ بی‌انیمیشن: ریل (وضعیت + رینگ) + بخشِ پایین */
function ndRender(){ ndClearTimers(); ndSyncRail(); ndRenderStage(); }
/* اسکرولِ خودکار: بالای سکشنِ فعال را همیشه به یک نقطهٔ ثابت (کمی زیرِ ریل) می‌آورد؛ چون همهٔ سکشن‌ها
   هدرِ هم‌اندازه دارند، سکشنِ بعدی دقیقاً جای سکشنِ قبلی می‌نشیند و موس روی «اولین گزینه» می‌ماند.
   موقعیتِ نهایی با «ارتفاعِ نهایی» سکشن‌های بالادست حساب می‌شود (نه حالتِ میانِ انیمیشن)، پس می‌توان
   هم‌زمان با انیمیشنِ آکاردئون به‌نرمی اسکرول کرد بدونِ پرش. */
/* فضای خالیِ پایین: حین انتخابِ سکشن‌ها = بلندیِ ناحیهٔ اسکرول (جای کافی برای بالا‌آوردنِ سکشنِ فعال)؛
   وقتی شماره کامل شد = صفر، تا باکسِ «فایل و ثبت» آخرِ پنجره باشد و اسکرولِ خالیِ اضافه نماند */
function ndSizeSpacer(){
  var sc=document.getElementById("ndScroll"), sp=document.getElementById("ndSpacer");
  if(!sc || !sp) return;
  if(!sc.clientHeight){ sp.style.height="0px"; return; }
  if(!ndComplete()){ sp.style.height=sc.clientHeight+"px"; return; }   // حین انتخاب: جای کافی برای اتو‌اسکرول
  // تکمیل‌شده: فاصلهٔ ثابتِ ته‌نشین تا زیرِ باکسِ بارگذاری حدودِ ۳۶px فضای خالی بماند
  // (مقدار ثابت است تا نه به ارتفاعِ باکس وابسته باشد و نه اسکرولِ خالیِ اضافه بسازد).
  sp.style.height="14px";
}
var _ndScrollRAF=null;
function ndScrollToActive(){
  var sc=document.getElementById("ndScroll"); if(!sc) return;
  var acc=sc.querySelector("#ndStage .nd-acc"); if(!acc) return;
  var secs=acc.querySelectorAll(".nd-sec"); if(!secs.length) return;
  var active=acc.querySelector(".nd-sec.active");
  if(!active){ ndFollowScrollBottom(sc); return; }   // تکمیل‌شده: هم‌گام با باز‌شدنِ باکس، تا انتها دنبال می‌کند (بدونِ پرش)
  // هدف = مجموعِ «ارتفاعِ نهایی»ِ سکشن‌های بالای سکشنِ فعال. با اسکرول به این مقدار، بالای سکشنِ فعال همیشه
  // به همان نقطهٔ ثابتِ زیرِ ریل می‌آید؛ چون هدرها هم‌اندازه‌اند، «اولین گزینهٔ» هر سکشن دقیقاً هم‌ارتفاع می‌شود.
  var gap=12, above=0;
  for(var i=0;i<secs.length;i++){
    if(secs[i]===active) break;
    var hd=secs[i].querySelector(".nd-sec-hd"), inner=secs[i].querySelector(".nd-sec-inner");
    var open=secs[i].classList.contains("active")||secs[i].classList.contains("done");
    above += (hd?hd.offsetHeight:0) + (open&&inner?inner.scrollHeight:0) + gap;
  }
  ndFollowScroll(sc, above);
}
/* اسکرول را در طولِ انیمیشنِ آکاردئون به‌سمتِ هدف می‌کشد؛ چون ارتفاعِ محتوا تدریجی زیاد می‌شود،
   هر فریم به کلمپِ فعلی محدود می‌شود تا هم‌گام با اکسپندِ سکشن، اسکرول هم پیش برود (بدونِ پرش، بدونِ گیر‌کردن) */
function ndFollowScroll(sc, target){
  if(_ndScrollRAF){ cancelAnimationFrame(_ndScrollRAF); _ndScrollRAF=null; }
  var startTop=sc.scrollTop, startT=Date.now(), dur=620;
  function step(){
    var t=Math.min(1,(Date.now()-startT)/dur), e=1-Math.pow(1-t,3);   // easeOutCubic، هم‌مدتِ انیمیشنِ آکاردئون
    var max=Math.max(0, sc.scrollHeight - sc.clientHeight);
    sc.scrollTop=Math.min(startTop+(target-startTop)*e, max);
    if(t<1) _ndScrollRAF=requestAnimationFrame(step); else _ndScrollRAF=null;
  }
  step();
}
/* اسکرولِ «تا انتها» که هدفِ خود را هر فریم از روی ارتفاعِ لحظه‌ایِ محتوا می‌گیرد؛ چون باکسِ بارگذاری
   طیِ همان بازه باز می‌شود، این تابع پا‌به‌پای آن پایین می‌رود و باکس دقیقاً همان‌جا که هست باز می‌شود
   (نه اینکه اول بالای صفحه ساخته شود و بعد یک‌باره پایین بپرد). */
function ndFollowScrollBottom(sc){
  if(_ndScrollRAF){ cancelAnimationFrame(_ndScrollRAF); _ndScrollRAF=null; }
  var startTop=sc.scrollTop, startT=Date.now(), dur=620;
  function step(){
    var t=Math.min(1,(Date.now()-startT)/dur), e=1-Math.pow(1-t,3);   // easeOutCubic، هم‌مدتِ انیمیشنِ باز‌شدن
    var max=Math.max(0, sc.scrollHeight - sc.clientHeight);           // هر فریم با ارتفاعِ درحال‌رشدِ محتوا تازه می‌شود
    sc.scrollTop=startTop+(max-startTop)*e;
    if(t<1){ _ndScrollRAF=requestAnimationFrame(step); } else { sc.scrollTop=max; _ndScrollRAF=null; }
  }
  step();
}
/* ریل = مسیرِ ایستگاه‌ها و در عینِ حال پیش‌نمایشِ زندهٔ شماره */
function ndSegVal(f){ if(f==="FSM") return "FSM"; if(f==="nRev"){ var r=revFmt(ndVal("nRev")); return r===""?"":pad2(r); }
  var v=ndVal(f); if(!v) return ""; return (f==="nClient"||f==="nType")?String(v).toUpperCase():pad2(v); }
/* برچسبِ انگلیسیِ هر قطعهٔ شماره (زیرِ هر سلولِ ریل، هم‌راستا با ساختارِ لاتینِ شماره) */
var ND_EN={ FSM:"COMPANY", nClient:"CLIENT", nOrder:"ORDER", nProject:"PROJECT", nPart:"PART", nType:"TYPE", nRev:"REV" };
/* ایستگاهی که هم‌اکنون در حالِ تکمیل/ویرایش است (برای بزرگ‌نمایی و نوارِ چرخانِ نارنجی) */
function ndCurrentField(){ return (ND.active && ND_META[ND.active] && ndCanEnter(ND.active)) ? ND.active : ndFirstIncomplete(); }
/* ============ ریلِ پایا (persistent) + کوریوگرافیِ پیشرفت ============
   ریل یک‌بار ساخته می‌شود؛ بعد فقط کلاس/مقدار/سایزِ سلول‌ها و موقعیتِ رینگ به‌روز می‌شوند تا
   ترنزیشن‌های نرم (تغییرِ سایز، رنگِ خط) کار کنند. سه اورلی: رینگِ چرخان، پالسِ تأیید، نشانگرِ روانِ خط. */
var ND_SEQ=["FSM"].concat(ND_ORDER).concat(["nRev"]);
var _ndTimers=[];
function ndClearTimers(){ for(var i=0;i<_ndTimers.length;i++) clearTimeout(_ndTimers[i]); _ndTimers=[];
  if(_ndScrollRAF){ cancelAnimationFrame(_ndScrollRAF); _ndScrollRAF=null; } }
function ndFilled(f){ return f==="FSM" ? true : !!ndVal(f); }   // FSM همیشه پر؛ REV با مقدارِ خودکارِ محاسبه‌شده
function ndCellState(f,curF){
  if(f==="FSM") return "fixed";
  if(f==="nRev") return ndVal("nRev")?"done":"locked";           // ریویژن مثلِ بقیه: پر=نارنجی، خالی=خاکستری
  return (f===curF)?"active":(ndVal(f)?"done":(ndCanEnter(f)?"next":"locked"));
}
/* ساختِ یک‌بارهٔ DOMِ ریل + اورلی‌ها + شنودِ کلیک */
function ndBuildRail(){
  var rail=document.getElementById("ndRail"); if(!rail) return;
  var h='<div class="nd-rail-in">', curF=ndCurrentField();
  ND_SEQ.forEach(function(f,i){   // سلول‌ها با کلاسِ وضعیتِ نهایی ساخته می‌شوند تا سلولِ فعال از همان اول ۹۴px باشد (رینگ درست بنشیند)
    var st=ndCellState(f,curF), v=ndSegVal(f);
    h+='<button type="button" class="nd-chip '+st+'" data-f="'+f+'"><span class="nd-chip-val">'+(v?esc(v):"—")+'</span><span class="nd-chip-cap">'+(ND_EN[f]||"")+'</span></button>';
    if(i<ND_SEQ.length-1) h+='<span class="nd-cx'+(ndFilled(f)?" on":"")+'" data-i="'+i+'"></span>';
  });
  h+='</div><div class="nd-ring" id="ndRing"></div><div class="nd-pulse" id="ndPulse"></div>';
  rail.innerHTML=h;
  var inrow=rail.querySelector(".nd-rail-in");
  if(inrow) inrow.addEventListener("click",function(e){
    var chip=e.target.closest && e.target.closest(".nd-chip"); if(!chip||chip.disabled) return;
    var f=chip.getAttribute("data-f"); if(f) ndGoto(f);
  });
}
/* کلاس/مقدار/فعال‌بودنِ سلول‌ها + روشن‌بودنِ خطوط (بدونِ جابه‌جاییِ رینگ). خطِ بعد از سلولِ پرشده نارنجی می‌شود. */
function ndSyncStates(){
  var rail=document.getElementById("ndRail"); if(!rail) return;
  if(!rail.querySelector(".nd-rail-in")) ndBuildRail();
  var curF=ndCurrentField();
  ND_SEQ.forEach(function(f){
    var chip=rail.querySelector('.nd-chip[data-f="'+f+'"]'); if(!chip) return;
    chip.className="nd-chip "+ndCellState(f,curF);
    var val=chip.querySelector(".nd-chip-val"), v=ndSegVal(f); if(val) val.textContent=v||"—";
    chip.disabled=!((f!=="FSM"&&f!=="nRev")&&!!(ndVal(f)||ndCanEnter(f)));
  });
  rail.querySelectorAll(".nd-cx").forEach(function(cx){
    cx.classList.toggle("on", ndFilled(ND_SEQ[parseInt(cx.getAttribute("data-i"),10)]));
  });
}
function ndSyncRail(){ ndSyncStates(); ndPlaceRing(false); }
function ndRectIn(container,el){ var cr=container.getBoundingClientRect(), er=el.getBoundingClientRect();
  return {left:er.left-cr.left, top:er.top-cr.top, width:er.width, height:er.height}; }
/* رینگ را روی سلولِ فعال بگذار؛ anim=true یعنی با سُر‌خوردن (ترنزیشن)، false یعنی فوری */
function ndPlaceRing(anim){
  var rail=document.getElementById("ndRail"); if(!rail) return;
  var ring=document.getElementById("ndRing"); if(!ring) return;
  var act=rail.querySelector(".nd-chip.active");
  if(!act){ ring.classList.remove("show"); return; }
  var r=ndRectIn(rail,act);
  if(!anim) ring.style.transition="none";
  // نوار دقیقاً روی کادرِ سلول؛ ضخامت به سمتِ داخل رشد می‌کند تا لبهٔ بیرونی هیچ‌جا از حاشیه بیرون نزند
  ring.style.left=r.left+"px"; ring.style.top=r.top+"px"; ring.style.width=r.width+"px"; ring.style.height=r.height+"px";
  if(!anim){ void ring.offsetWidth; ring.style.transition=""; }
  ring.classList.add("show");
}
/* کوریوگرافیِ تأییدِ یک سلول — بالا و پایین هم‌زمان از لحظهٔ انتخاب شروع می‌شوند و در یک بازهٔ زمانی اجرا می‌شوند:
   ۰) هم‌زمان (لحظهٔ صفر): آکاردئونِ پایین کولپس/اکسپند می‌کند + اسکرولِ دنباله‌رو + پالسِ «ست‌شدن»
   ۱) سلولِ قبلی «بزرگ نگه داشته می‌شود» (held) تا مستطیل‌های شعاعیِ پالس درست دورش بزرگ شوند
   ۲) پس از پالس: سلولِ قبلی کوچک + سلولِ بعدی بزرگ (ریسایزِ ریل) + خطوطِ نارنجی
   ۳) پس از نشستِ ریسایز: رینگِ نارنجی روی سلولِ جدید ظاهر و می‌چرخد
   بازهٔ کلِ بالا (پالس→ریسایز→رینگ) داخلِ بازهٔ کندشدهٔ آکاردئون جا می‌شود تا دو بخش سینک بمانند. */
function ndAnimateConfirm(fromF){
  var rail=document.getElementById("ndRail"); if(!rail){ ndRender(); ndScrollToActive(); return; }
  if(!rail.querySelector(".nd-rail-in")) ndBuildRail();
  var A=rail.querySelector('.nd-chip[data-f="'+fromF+'"]');
  var ring=document.getElementById("ndRing"), pulse=document.getElementById("ndPulse");
  if(!A||!ring||!pulse){ ndRender(); ndScrollToActive(); return; }
  // بخشِ پایین + پالس، هم‌زمان از لحظهٔ صفر
  ndRenderStage();                                        // آکاردئون: کولپس/اکسپند (کند)
  ndScrollToActive();                                     // اسکرولِ دنباله‌رو، هم‌گام با اکسپند
  // فاز ۱–۲: A تأییدشده ولی بزرگ نگه داشته می‌شود تا پالس درست دورش بزرگ شود
  A.className="nd-chip done held";
  var av=A.querySelector(".nd-chip-val"); if(av) av.textContent=ndSegVal(fromF)||"—";
  ring.classList.remove("show");
  var ra=ndRectIn(rail,A);
  pulse.style.left=ra.left+"px"; pulse.style.top=ra.top+"px"; pulse.style.width=ra.width+"px"; pulse.style.height=ra.height+"px";
  pulse.classList.remove("go"); void pulse.offsetWidth; pulse.classList.add("go");
  // فاز ۲ (پس از پالس): A کوچک + B بزرگ + خطوط
  _ndTimers.push(setTimeout(function(){
    A.classList.remove("held");
    ndSyncStates();
    var curF=ndCurrentField(), B=curF?rail.querySelector('.nd-chip[data-f="'+curF+'"]'):null;
    if(!B){ ring.classList.remove("show");                 // شماره کامل شد
      _ndTimers.push(setTimeout(function(){                 // پس از پایانِ انیمیشنِ باز‌شدن: نشستِ نهایی روی انتها (بدونِ پرش)
        ndSizeSpacer(); var s=document.getElementById("ndScroll");
        if(s) s.scrollTop=Math.max(0, s.scrollHeight - s.clientHeight);
      }, 700));
      return; }
    _ndTimers.push(setTimeout(function(){ ndPlaceRing(false); }, 400));   // فاز ۳: رینگ روی سلولِ جدید
  }, 560));
}
/* ============ آکاردئونِ ایستگاه‌ها (سبکِ کارتابلِ بازبینی) ============
   هر ایستگاه یک باکس است: تیتر (برچسبِ سلول) + خطِ جداکننده + رکوردها (هر گزینه یک سلولِ جدا) + دکمهٔ «+».
   همهٔ باکس‌ها همیشه در صفحه‌اند اما کولپس؛ فقط ایستگاهِ فعال باز است. ساختار یک‌بار ساخته و بعد فقط sync می‌شود. */
function ndBuildAcc(){
  var stage=document.getElementById("ndStage"); if(!stage) return;
  if(stage.querySelector(".nd-acc")) return;                    // یک‌بار
  var h='<div class="nd-acc">';
  ND_ORDER.forEach(function(f){
    var meta=ND_META[f];
    h+='<div class="nd-sec" data-f="'+f+'">'+
        '<div class="nd-sec-hd" onclick="ndGoto(\''+f+'\')">'+
          '<span class="nd-sec-ic">'+ndTitleIc(f)+'</span>'+  // المانِ همان پارامتر — قبل از تیتر، مثلِ بقیهٔ سایت
          '<span class="nd-sec-t">'+esc(meta.cap)+'</span>'+
          '<span class="nd-sec-add-slot"></span>'+          // دکمهٔ «+ افزودن» برای ایستگاهِ فعال اینجا می‌نشیند
          '<span class="nd-sec-chev">'+ND_CHEV+'</span>'+
        '</div>'+
        '<div class="nd-sec-body"><div class="nd-sec-inner">'+
          '<div class="nd-sec-div"></div>'+
          '<div class="nd-sec-rows"></div>'+
        '</div></div>'+
       '</div>';
  });
  stage.innerHTML=h+'</div>';
}
/* وضعیت/بازبودنِ سکشن‌ها + رکوردهای ایستگاهِ فعال (گزینه‌ها وابسته به بالادستی‌اند، پس فقط فعال ساخته می‌شود) */
function ndSyncAcc(){
  var stage=document.getElementById("ndStage"); if(!stage) return;
  if(!stage.querySelector(".nd-acc")) ndBuildAcc();
  var active=ndCurrentField();
  ND_ORDER.forEach(function(f){
    var sec=stage.querySelector('.nd-sec[data-f="'+f+'"]'); if(!sec) return;
    var st=(f===active)?"active":(ndVal(f)?"done":(ndCanEnter(f)?"next":"locked"));
    sec.className="nd-sec "+st;
    var slot=sec.querySelector(".nd-sec-add-slot"); if(slot) slot.innerHTML=(f===active)?ndAddSlotHTML(f):"";
    var rows=sec.querySelector(".nd-sec-rows");
    // فعال: همهٔ سلول‌ها؛ تنظیم‌شده: فقط سلولِ انتخاب‌شده باقی می‌ماند؛ قفل/بعدی: خالی
    if(rows) rows.innerHTML=(f===active)?ndSecRowsHTML(f):(ndVal(f)?ndDoneCellHTML(f):"");
  });
}
/* سلولِ انتخاب‌شدهٔ یک ایستگاهِ تنظیم‌شده (کولپس‌شده) — تنها همین سلول باقی می‌ماند؛ کلیک روی آن = ویرایشِ همان ایستگاه */
function ndDoneCellHTML(f){
  var o=ndOptions(f).filter(function(x){ return String(x.val)===String(ndVal(f)); })[0]; if(!o) return "";
  return '<div class="nd-list"><button type="button" class="nd-opt on" onclick="ndGoto(\''+f+'\')">'+
    '<span class="nd-opt-ic">'+o.icon+'</span>'+
    '<span class="nd-opt-body"><span class="nd-opt-lab">'+esc(o.label)+'</span>'+
      (o.sub?'<span class="nd-opt-sub">'+esc(o.sub)+'</span>':'')+'</span>'+
    '<span class="nd-opt-ck">'+ND_OK_IC+'</span></button></div>';
}
/* المانِ (آیکونِ) هر پارامتر — همان آیکونِ سکشنِ آن بخش در بقیهٔ سایت (تک‌منبع در projects.js/index) */
function ndTitleIc(f){
  var m={ nClient:(typeof SEC_IC_CLIENT!=="undefined"?SEC_IC_CLIENT:""),
          nOrder :(typeof SEC_IC_ORDERS!=="undefined"?SEC_IC_ORDERS:""),
          nProject:(typeof SEC_IC_PROJ!=="undefined"?SEC_IC_PROJ:""),
          nPart  :(typeof SEC_IC_PART!=="undefined"?SEC_IC_PART:""),
          nType  :(typeof SEC_IC_DOC!=="undefined"?SEC_IC_DOC:"") };
  return m[f]||"";
}
/* دکمهٔ «+ افزودن» درونِ هدرِ ایستگاهِ فعال — مینیمال و بدونِ متن (فقط آیکونِ +)، هم‌سبکِ دکمه‌های آیکونیِ سایت */
function ndAddSlotHTML(field){
  var titles={nClient:"افزودن مشتری", nOrder:"افزودن سفارش", nProject:"افزودن پروژه"};
  if(!titles[field]) return "";
  return '<button type="button" class="icon-btn" title="'+esc(titles[field])+'" onclick="event.stopPropagation();ndAddNew(\''+field+'\')">'+
    '<svg viewBox="0 0 24 24" class="ic"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></button>';
}
/* رکوردهای داخلِ یک باکس: فهرستِ اسکرول‌دارِ سلول‌ها + راهنمای کوتاه (دکمهٔ افزودن حالا در هدر است) */
function ndSecRowsHTML(f){
  var opts=ndOptions(f), cur=ndVal(f);
  var list=opts.length
    ? '<div class="nd-list">'+opts.map(function(o){ return ndOptHTML(f,o,String(o.val)===String(cur)); }).join("")+'</div>'
    : '<div class="nd-menu-empty">'+esc(ndEmptyMsg(f))+'</div>';
  var hint=ndStepHint(f);
  return list+
    (hint?'<div class="nd-step-hint">'+ND_INFO_IC+esc(hint)+'</div>':'');
}
function ndOptHTML(field,o,on){
  return '<button type="button" class="nd-opt'+(on?' on':'')+(o.special?' special':'')+'" onclick="ndPick(\''+field+'\',\''+esc(o.val)+'\')">'+
    '<span class="nd-opt-ic">'+o.icon+'</span>'+
    '<span class="nd-opt-body"><span class="nd-opt-lab">'+esc(o.label)+'</span>'+
      (o.sub?'<span class="nd-opt-sub">'+esc(o.sub)+'</span>':'')+'</span>'+
    (on?('<span class="nd-opt-ck">'+ND_OK_IC+'</span>'):'')+'</button>';
}
function ndEmptyMsg(field){
  if(field==="nOrder") return "برای این مشتری سفارشی ثبت نشده.";
  if(field==="nProject") return "برای این سفارش پروژه‌ای ثبت نشده.";
  return "موردی برای انتخاب نیست.";
}
function ndStepHint(field){
  if(field==="nPart") return "برای اسنادِ سطحِ پروژه (مثلِ پلنِ کیفی) گزینهٔ «سند پروژه (۰۰)» را انتخاب کنید.";
  if(field==="nType") return (ndVal("nPart")==="00") ? "چون قطعه ۰۰ است، فقط انواعِ سطحِ پروژه نمایش داده می‌شود." : "فقط انواعِ سطحِ قطعه نمایش داده می‌شود.";
  return "";
}

/* ---- بخشِ نهایی: فایل + یادداشت + ثبت (پس از کاملِ‌شدنِ شماره) ---- */
function ndFinalHTML(){
  var is3D=String(ndVal("nType")).toUpperCase().indexOf("3D")===0;
  var num=currentNumber();
  return ''+
    '<div class="nd-finalbox">'+                                  // قاب، هم‌سبکِ سکشن‌های بالا: تیتر + آیکون + خطِ جداکننده + محتوا
      '<div class="nd-final-hd"><span class="nd-sec-ic">'+ND_UPLOAD+'</span><span class="nd-sec-t">بارگذاری سند/فایل</span></div>'+
      '<div class="nd-sec-div"></div>'+
      '<div class="nd-final-inner">'+
        '<div id="nRevBanner" class="nd-revnote" hidden></div>'+
        '<div class="nd-fstack">'+
          '<div class="ndoc-note"><textarea id="nTitle" class="ndoc-note-ta" placeholder="تغییرات و یادداشت‌های مربوط به این نسخه ریویژن را بنویسید."></textarea></div>'+
          (is3D?nd3DUploadHTML():ndFileHTML())+
        '</div>'+
        '<div class="nd-actions">'+
          '<div class="nd-namewrap">'+
            '<button type="button" class="nd-nameline" onclick="copyDocNumber()" title="برای کپی، روی نام کلیک کنید">'+
              '<span class="nd-name-t">نام سند</span>'+
              '<span class="nd-final-num" id="nPreview">'+(num?esc(num):"")+'</span>'+
            '</button>'+
            '<div class="nd-step-hint nd-copy-hint" id="nCopyHint">'+ND_INFO_IC+'برای کپی کردن نام سند، روی آن کلیک نمایید.</div>'+
          '</div>'+
          '<button type="button" class="btn primary" id="nSubmitBtn" onclick="submitDocument()">ثبت سند</button>'+
        '</div>'+
      '</div>'+
    '</div>';
}
function ndFileHTML(){
  return '<div class="nd-up-grid nd-up-1">'+
    ndDropzoneHTML("nDrop","nFile",".pdf,image/*","فایل","PDF یا تصویر — الزامی","")+
  '</div>';
}
/* مدلِ سه‌بعدی: سه فایل (ترتیبِ راست‌به‌چپ: STP، GLB، USDZ). عنوانِ بولد = «فایل + فرمت»، خطِ دوم = کارکرد. */
function nd3DUploadHTML(){
  return '<div class="nd-up-grid nd-up-3">'+
    ndDropzoneHTML("nDrop3","nFile3",".stp,.step","فایل STP","فرمتِ اصلی برای آرشیوِ اسناد","")+
    ndDropzoneHTML("nDrop","nFile",".glb,.gltf","فایل GLB/GLTF","برای نمایش در سایت","")+
    ndDropzoneHTML("nDrop2","nFile2",".usdz","فایل USDZ","برای نمایش در واقعیتِ افزوده","")+
  '</div>';
}
function ndDropzoneHTML(zoneId,inputId,accept,main,sub,tag){
  return '<label class="dropzone" id="'+zoneId+'" for="'+inputId+'">'+
    '<input id="'+inputId+'" class="dz-input" type="file" accept="'+accept+'" onchange="ndFilePicked(\''+zoneId+'\',\''+inputId+'\')">'+
    '<div class="dz-body">'+(tag?'<span class="dz-tag">'+esc(tag)+'</span>':'')+
      '<span class="dz-ico">'+ND_UPLOAD+'</span>'+
      '<div class="dz-main">'+esc(main)+'</div><div class="dz-sub">'+esc(sub)+'</div>'+
      '<div class="dz-file" id="'+inputId+'Name" hidden></div></div>'+
    '<div class="dz-overlay"><span>اینجا رها کنید</span></div></label>';
}

/* ================= ریویژنِ خودکار — بنر/یادداشتِ حالت‌محور (بدونِ ورودیِ ریویژن) ================= */
var _newDocBlocked=false;
function updateRevMode(){
  var note=document.getElementById("nRevBanner");
  var titleInp=document.getElementById("nTitle");
  var submitBtn=document.getElementById("nSubmitBtn");
  var c=ndVal("nClient"),o=ndVal("nOrder"),pr=ndVal("nProject"),pt=ndVal("nPart"),ty=ndVal("nType");
  if(titleInp) titleInp.placeholder="تغییرات و یادداشت‌های مربوط به این نسخه ریویژن را بنویسید.";
  if(!(c&&o&&pr&&pt&&ty)){ if(note){ note.hidden=true; note.innerHTML=""; } if(submitBtn) submitBtn.disabled=false; _newDocBlocked=false; return; }
  var rs=revState(c,o,pr,pt,ty), msg="", cls="nd-revnote";
  if(rs.mode==="new"){          // هیچ نسخهٔ قبلی نیست → این نسخه Rev 00
    msg='هیچ نسخهٔ قبلی‌ از این سند در آرشیوِ اسناد موجود نیست؛ این نسخه <b>Rev 00</b> از این سند محسوب می‌شود.';
    if(submitBtn) submitBtn.disabled=false; _newDocBlocked=false;
  } else if(rs.mode==="revision"){   // یک نسخهٔ قبلی (تأییدشده) هست → ارجاع به همان یک نسخهٔ قبلی
    msg='در آرشیوِ اسناد، نسخهٔ <b>Rev '+esc(pad2(revFmt(rs.maxRev)))+'</b> این سند قبلاً بارگذاری شده است؛ پس این نسخهٔ جدید <b>Rev '+esc(pad2(rs.nextRev))+'</b> نام‌گذاری خواهد شد.';
    if(submitBtn) submitBtn.disabled=false; _newDocBlocked=false;
  } else {                       // نسخهٔ قبلی هنوز تأیید نشده → ثبتِ ریویژنِ جدید ممکن نیست
    var si=statusInfo(rs.latest&&rs.latest.status);
    msg='نسخهٔ <b>Rev '+esc(pad2(revFmt(rs.maxRev)))+'</b> این سند هنوز تأیید نشده (وضعیت: '+esc(si.label)+')؛ برای ثبتِ ریویژنِ جدید ابتدا باید ریویژنِ فعلی تأیید شود.';
    cls="nd-revnote warn"; if(submitBtn) submitBtn.disabled=true; _newDocBlocked=true;
  }
  if(note){ note.className=cls; note.hidden=false; note.innerHTML=msg; }
}
/* شمارهٔ ریویژن پیشنهادی از روی داده‌های محلی (بدون رفت‌وبرگشت به سرور) */
function computeNextRev(c,o,pr,pt,ty){
  var C=String(c).toUpperCase(), O=pad2(o), P=pad2(pr), PT=pad2(pt), TY=String(ty).toUpperCase();
  var count=0, maxRev=-1;
  (DB.documents||[]).forEach(function(d){
    if(String(d.clientCode).toUpperCase()===C && pad2(d.orderNo)===O && pad2(d.projectNo)===P &&
       pad2(d.partNo)===PT && String(d.typeCode).toUpperCase()===TY){
      count++; var r=parseInt(d.rev,10); if(isNaN(r)) r=0; if(r>maxRev) maxRev=r;
    }
  });
  return count===0 ? "0" : revFmt(maxRev+1);
}
function currentNumber(){
  var c=(ndVal("nClient")||"").toUpperCase(),o=pad2(ndVal("nOrder")),pr=pad2(ndVal("nProject")),
      pt=pad2(ndVal("nPart")),ty=(ndVal("nType")||"").toUpperCase(),rv=revFmt(ndVal("nRev"));
  if(!c||!o||!pr||!pt||!ty||rv==="") return null;
  return ["FSM",c,o,pr,pt,ty,pad2(rv)].join("-");   // ریویژنِ دو‌رقمیِ صفرگذاری‌شده، هم‌راستا با ریل و بک‌اند
}
/* کپیِ شمارهٔ سند تولیدشده در کلیپ‌بورد */
function copyDocNumber(){
  var n=currentNumber(); if(!n){ toast("ابتدا اطلاعات را کامل کن.",true); return; }
  var done=function(){
    var h=document.getElementById("nCopyHint");   // نوتِ راهنما به‌طورِ دائم به «ذخیره شد» تبدیل می‌شود (بدونِ toast)
    if(h){ h.classList.add("ok"); h.innerHTML='<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>نام سند ذخیره شد.'; }
  };
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(n).then(done, function(){ if(fallbackCopy(n)) done(); else toast("کپی ناموفق بود؛ دستی انتخاب کنید.",true); });
  } else { if(fallbackCopy(n)) done(); else toast("کپی ناموفق بود؛ دستی انتخاب کنید.",true); }
}
function fallbackCopy(text){
  try{
    var ta=document.createElement("textarea"); ta.value=text;
    ta.style.position="fixed"; ta.style.top="-9999px"; ta.style.opacity="0";
    document.body.appendChild(ta); ta.focus(); ta.select();
    var ok=document.execCommand("copy"); document.body.removeChild(ta); return ok;
  }catch(e){ return false; }
}
function fileToBase64(file){
  return new Promise(function(res,rej){
    var fr=new FileReader();
    fr.onload=function(){ var s=fr.result; res(s.substring(s.indexOf(",")+1)); };
    fr.onerror=rej; fr.readAsDataURL(file);
  });
}
async function submitDocument(){
  if(_newDocBlocked){ toast("ریویژن فعلی هنوز تأیید نشده؛ نمی‌توان ریویژن جدید ثبت کرد.",true); return; }
  var n=currentNumber();
  if(!n){ toast("ابتدا همهٔ ایستگاه‌های شماره را کامل کن.",true); return; }
  var is3D=String(ndVal("nType")).toUpperCase().indexOf("3D")===0;
  var fi=document.getElementById("nFile"); var f=fi&&fi.files&&fi.files[0];
  if(!f){ toast(is3D?"بارگذاریِ فایلِ GLB/GLTF الزامی است.":"بارگذاری فایل سند الزامی است.",true); return; }
  if(f.size>25*1024*1024){ toast("حجم فایل بیش از ۲۵ مگابایت است.",true); return; }
  if(is3D){ var stpEl=document.getElementById("nFile3"), stpF=stpEl&&stpEl.files&&stpEl.files[0];
    if(!stpF){ toast("بارگذاریِ فایلِ STP الزامی است.",true); return; } }   // STP اجباری برای اسنادِ سه‌بعدی
  var noteEl=document.getElementById("nTitle");
  var payload={ clientCode:ndVal("nClient"), orderNo:ndVal("nOrder"), projectNo:ndVal("nProject"),
    partNo:ndVal("nPart"), typeCode:ndVal("nType"), rev:ndVal("nRev"), title:(noteEl?noteEl.value:"") };
  payload.fileBase64=await fileToBase64(f); payload.fileName=f.name; payload.mimeType=f.type;   // فایلِ اصلی (برای سه‌بعدی: GLB/GLTF)
  if(is3D){   // STP (اجباری) و USDZ (اختیاری) هم همراهِ همین درخواست ذخیره می‌شوند
    var stpEl3=document.getElementById("nFile3"), stpF3=stpEl3&&stpEl3.files&&stpEl3.files[0];
    if(stpF3){ if(stpF3.size>25*1024*1024){ toast("حجم فایل STP بیش از ۲۵ مگابایت است.",true); return; }
      payload.stpBase64=await fileToBase64(stpF3); payload.stpName=stpF3.name; payload.stpMime=stpF3.type; }
    var usdzEl=document.getElementById("nFile2"), usdzF=usdzEl&&usdzEl.files&&usdzEl.files[0];
    if(usdzF){ if(usdzF.size>25*1024*1024){ toast("حجم فایل USDZ بیش از ۲۵ مگابایت است.",true); return; }
      payload.usdzBase64=await fileToBase64(usdzF); payload.usdzName=usdzF.name; payload.usdzMime=usdzF.type; }
  }
  // آپلود به «مرکز انتقال» می‌رود (غیرمسدودکننده)؛ مودال بلافاصله بسته می‌شود و سایت آزاد می‌ماند.
  // ارسال برای بازبینی به‌صورتِ پیش‌فرض و خودکار پس از ثبت انجام می‌شود (بدونِ پرسش).
  ndReset(); closeNewDocModal();
  dlEnqueueUpload({
    label: n,                       // شمارهٔ سند به‌عنوانِ برچسبِ کارت
    action: "createDocument",
    payload: payload,
    onSuccess: async function(r){
      if(!r || !r.ok){ toast((r&&r.message)||"ثبت ناموفق بود.",true); return; }
      toast("ثبت شد: "+r.drawingNumber);
      // ارسالِ خودکار برای بازبینی (پیش‌فرضِ فعال)
      var sr=await api("submitForReview",{drawingNumber:r.drawingNumber},{silent:true, quiet:true});
      if(sr && sr.ok) toast("برای بازبینی ارسال شد");
      await refreshDocuments();
    }
  });
}

/* ================= مودالِ ثبت سند ================= */
function openNewDocModal(){
  if(ME.role!=="admin"){ toast("فقط مدیر می‌تواند سند ثبت کند.",true); return; }
  var m=document.getElementById("newDocModal"); if(!m) return;
  ndClearTimers();                                    // لغوِ تایمرها/انیمیشن‌های نیمه‌کارهٔ دفعهٔ قبل
  ndReset();
  // پاکسازیِ کاملِ DOMِ پویا تا هیچ ردپایی از دفعهٔ قبل نماند و ریل/آکاردئون/رینگ از نو ساخته شوند
  var rail=document.getElementById("ndRail"); if(rail) rail.innerHTML="";
  var stage=document.getElementById("ndStage"); if(stage) stage.innerHTML="";
  m.classList.remove("hidden");
  modalLock();   // قفلِ اسکرول با حفظِ موقعیت (تعریف در archive.js)
  var sc=document.getElementById("ndScroll"); if(sc) sc.scrollTop=0;   // اسکرول از ابتدا
  ndRender();                                         // ریل و آکاردئون از نو، انیمیشن‌ها از ابتدا
  if(sc) sc.scrollTop=0;
}
function closeNewDocModal(){
  ndCloseMenu();
  var m=document.getElementById("newDocModal"); if(m) m.classList.add("hidden");
  // قفل فقط وقتی باز می‌شود که هیچ مودالِ دیگری باز نمانده باشد
  if(typeof anyModalOpen!=="function" || !anyModalOpen()) modalUnlock();
}
document.addEventListener("keydown",function(e){
  if(e.key!=="Escape") return;
  var m=document.getElementById("newDocModal");
  if(m && !m.classList.contains("hidden")) closeNewDocModal();
});

/* ================= درگ‌ودراپِ فایل (پس از هر رندرِ بخشِ نهایی بایند می‌شود) ================= */
function ndFilePicked(zoneId,inputId){
  var inp=document.getElementById(inputId), lbl=document.getElementById(inputId+"Name"), zone=document.getElementById(zoneId);
  if(!inp||!zone) return;
  var f=inp.files&&inp.files[0];
  if(f){ if(lbl){ lbl.textContent="✓ "+f.name; lbl.hidden=false; } zone.classList.add("has-file"); }
  else { if(lbl){ lbl.textContent=""; lbl.hidden=true; } zone.classList.remove("has-file"); }
}
function ndAcceptOk(f,acc){
  if(!acc) return true;
  var name=(f.name||"").toLowerCase(), type=(f.type||"").toLowerCase();
  var parts=acc.split(",");
  for(var i=0;i<parts.length;i++){ var p=parts[i].trim().toLowerCase(); if(!p) continue;
    if(p==="image/*"){ if(type.indexOf("image/")===0) return true; }
    else if(p.charAt(0)==="."){ if(name.slice(-p.length)===p) return true; }
    else if(p.indexOf("/")>0){ if(type===p) return true; }
  }
  return false;
}
function ndBindDrop(zoneId,inputId){
  var zone=document.getElementById(zoneId), inp=document.getElementById(inputId);
  if(!zone||!inp) return;
  var depth=0;
  zone.addEventListener("dragenter",function(e){ e.preventDefault(); depth++; zone.classList.add("drag"); });
  zone.addEventListener("dragover",function(e){ e.preventDefault(); if(e.dataTransfer) e.dataTransfer.dropEffect="copy"; });
  zone.addEventListener("dragleave",function(e){ e.preventDefault(); depth=Math.max(0,depth-1); if(depth===0) zone.classList.remove("drag"); });
  zone.addEventListener("drop",function(e){
    e.preventDefault(); depth=0; zone.classList.remove("drag");
    var files=e.dataTransfer&&e.dataTransfer.files; if(!files||!files.length) return;
    var f=files[0];
    if(!ndAcceptOk(f, inp.getAttribute("accept")||"")){ toast("فرمتِ این فایل برای این بخش مجاز نیست.",true); return; }
    try{ var dt=new DataTransfer(); dt.items.add(f); inp.files=dt.files; }
    catch(err){ toast("مرورگرِ شما از رهاکردنِ فایل پشتیبانی نمی‌کند؛ از دکمهٔ انتخاب استفاده کنید.",true); return; }
    ndFilePicked(zoneId,inputId);
  });
}
function ndBindDropzones(){ ndBindDrop("nDrop","nFile"); ndBindDrop("nDrop2","nFile2"); ndBindDrop("nDrop3","nFile3"); }

/* ================= پیش‌تنظیمِ ویزارد پس از افزودنِ مشتری/سفارش/پروژه یا از پنلِ پروژه ================= */
function syncNewDocAfterClient(code){ ndPick("nClient",code); }
function syncNewDocAfterOrder(orderNo){ ndSet("nClient",_cp.client); ndPick("nOrder",pad2(orderNo)); }
function syncNewDocAfterProject(orderNo,projNo){ ndSet("nClient",_cp.client); ndSet("nOrder",pad2(orderNo)); ndPick("nProject",pad2(projNo)); }
/* ثبت سند جدید با پیش‌تنظیمِ پروژه (و در صورتِ امکان، نوع سند و قطعه) */
function goNewDocForProject(c,o,pr,typeCode,part){
  openNewDocModal();
  ndSet("nClient",c); ndSet("nOrder",pad2(o)); ndSet("nProject",pad2(pr));
  var pt="";
  if(part!==undefined && part!==null && String(part)!=="") pt=pad2(part);
  else if(typeCode && typeScope(typeCode)==="project") pt="00";
  ndSet("nPart",pt);
  if(typeCode && pt){ var sc=typeScope(typeCode); if((sc==="project")===(pt==="00")) ndSet("nType",String(typeCode).toUpperCase()); }
  ndRecomputeRev();
  ND.active=ndFirstIncomplete();
  ndRender();
}

async function refreshDocuments(){
  var r=await api("bootstrap",{});
  if(!r.ok){ return; }
  DB.clients=r.clients||[]; DB.orders=r.orders||[]; DB.projects=r.projects||[];
  DB.parts=r.parts||[]; DB.docTypes=r.docTypes||[]; DB.documents=r.documents||[];
  DB.templates=r.templates||[]; DB.workflow=r.workflow||[]; DB.partMods=r.partMods||[];
  DB.trashedDocs=r.trashedDocs||[];
  if(r.users&&r.users.length) DB.users=r.users;
  refreshAllSelects();
  renderArchive(); renderDataTables(); renderDashboard();
  if(!document.getElementById("tab-project").classList.contains("hidden")) rerenderProjectTab();
  /* اگر مودالِ جزئیاتِ سند زیرِ پنجرهٔ بسته‌شده باز مانده، با دادهٔ تازه دوباره رسم
     شود — وگرنه پس از تأیید/رد/افزودنِ فرمت، وضعیتِ کهنه را نشان می‌دهد. */
  if(typeof dmRefreshOpen==="function") dmRefreshOpen();
}
