/* ═══ نسخهٔ محلی: برچسب وضعیت در هدر ═══
   فقط وقتی سایت از سرور محلی (server/run.py) باز شده فعال است (LOCAL_MODE در config.js)؛
   در نسخهٔ گیت‌هاب هیچ کاری نمی‌کند.
   نسخهٔ محلی محل کار اصلی است: هر تغییر اینجا ثبت و در پس‌زمینه به نسخهٔ گوگل فرستاده می‌شود.
   برچسب وضعیت صف ارسال، دریافت فایل‌ها و نتیجهٔ مقایسهٔ دو طرف را نشان می‌دهد. */
var _lc={ st:null, last:0 };
var LC_IDLE_MS=10000, LC_BUSY_MS=3000;

function localInit(){
  if(typeof LOCAL_MODE==="undefined" || !LOCAL_MODE) return;
  document.title="(محلی) "+document.title;
  setInterval(localTick, LC_BUSY_MS);
}
function localBusy(st){
  var ob=(st&&st.outbox)||{};
  return !!(st && (st.pullState==="running" || (st.files && st.files.running) || ob.pending ||
                   (ob.sync && ob.sync.state==="checking")));
}
async function localTick(){
  if(!ME || !ME.token) return;
  var app=document.getElementById("appView");
  if(!app || app.classList.contains("hidden")) return;
  if(!localBusy(_lc.st) && _lc.last && Date.now()-_lc.last<LC_IDLE_MS) return;
  _lc.last=Date.now();
  var r=await api("localStatus",{},{silent:true, quiet:true});
  if(!r || !r.ok) return;
  var prev=_lc.st||{};
  _lc.st=r; localRender();
  if(prev.pullState==="running" && r.pullState==="ok"){
    toast("داده‌ها از نسخهٔ گوگل دریافت شد.");
    if(typeof refreshDocuments==="function") refreshDocuments({background:true});
  }
  if(prev.pullState==="running" && r.pullState==="error") toast(r.pullError || "دریافت از گوگل ناموفق بود.", true);
  var ph=(prev.outbox||{}).halted, nh=(r.outbox||{}).halted;
  if(nh && (!ph || ph.seq!==nh.seq)) toast("ارسال به گوگل متوقف شد: "+(nh.message||""), true);
}
function localView(st){
  var ob=st.outbox||{}, f=st.files||{}, sync=ob.sync||{};
  if(ob.halted) return { cls:"err", text:"ارسال به گوگل متوقف شد: "+(ob.halted.message||"") };
  if(ob.pending) return { cls:"busy", text:"در صف ارسال به گوگل: "+faNum(ob.pending)+(ob.block?" · "+ob.block.message:"") };
  if(st.pullState==="running") return { cls:"busy", text:"در حال دریافت از گوگل…" };
  if(st.pullState==="error") return { cls:"err", text:st.pullError||"دریافت از گوگل ناموفق بود" };
  if(f.running && f.total) return { cls:"busy", text:"دریافت فایل‌ها: "+faNum(f.done)+" از "+faNum(f.total) };
  if(sync.state==="checking") return { cls:"busy", text:"در حال مقایسه با گوگل…" };
  if(sync.state==="mismatch") return { cls:"err", text:"ناهماهنگی با گوگل در: "+(sync.diff||[]).map(function(d){ return d.sheet; }).join("، ") };
  var at=sync.at||st.lastPullAt;
  return { cls:"ok", text:"هماهنگ با گوگل"+(at?" · "+fmtTimeDate(at):"") };
}
function localRender(){
  var host=document.querySelector(".top-bar-left");
  if(!host) return;
  var chip=document.getElementById("lcChip");
  if(!chip){
    chip=document.createElement("span"); chip.id="lcChip"; chip.className="lc-chip";
    var sep=document.createElement("span"); sep.className="tb-sep"; sep.setAttribute("aria-hidden","true");
    host.insertBefore(sep, host.firstChild); host.insertBefore(chip, host.firstChild);
  }
  var st=_lc.st||{}, ob=st.outbox||{}, f=st.files||{}, v=localView(st);
  var meta=v.text;
  if(!f.running && f.failed) meta+=" · "+faNum(f.failed)+" فایل دریافت نشد";
  chip.classList.toggle("busy", v.cls==="busy");
  chip.classList.toggle("err", v.cls==="err");
  chip.classList.toggle("ok", v.cls==="ok");
  chip.title="این نسخهٔ محلی است. هر تغییری که اینجا ثبت کنید، به ترتیب در پس‌زمینه به نسخهٔ گوگل هم فرستاده می‌شود؛ اگر اینترنت قطع باشد، صف منتظر می‌ماند و بعداً خودکار ادامه می‌دهد.";
  var btns="";
  if(ME.role==="admin"){
    if(ob.halted) btns='<button class="lc-btn" onclick="localRetry()">تلاش دوباره</button>'+
                       '<button class="lc-btn lc-danger" onclick="localDiscard()">کنار گذاشتن</button>';
    else if(!ob.pending && st.pullState!=="running") btns='<button class="lc-btn" onclick="localPull()">دریافت از گوگل</button>';
  }
  chip.innerHTML='<span class="lc-dot"></span><span>نسخهٔ محلی</span><span class="lc-meta">'+esc(meta)+'</span>'+btns;
}
function faNum(n){ return Number(n||0).toLocaleString("fa-IR"); }
function localPoke(){ _lc.last=0; localTick(); }
async function localPull(){
  var ok=await uiConfirm("همهٔ داده‌های این نسخهٔ محلی با آخرین وضعیت نسخهٔ گوگل جایگزین می‌شود. چون صف ارسال خالی است، چیزی از دست نمی‌رود.",
                         { title:"دریافت از گوگل", okLabel:"دریافت" });
  if(!ok) return;
  var r=await api("localPull",{},{silent:true});
  if(!r || !r.ok){ toast((r&&r.message)||"دریافت شروع نشد.", true); return; }
  _lc.st=Object.assign({}, _lc.st||{}, { pullState:"running" }); localRender(); localPoke();
}
async function localRetry(){
  var r=await api("localOutboxRetry",{},{silent:true});
  if(!r || !r.ok){ toast((r&&r.message)||"انجام نشد.", true); return; }
  localPoke();
}
async function localDiscard(){
  var ob=(_lc.st||{}).outbox||{}, n=(ob.pending||0)+(ob.halted?1:0);
  var ok=await uiConfirm(faNum(n)+" کار ارسال‌نشده کنار گذاشته می‌شود و نسخهٔ محلی دوباره عین نسخهٔ گوگل می‌شود. این کارها از بین می‌روند و قابل بازگشت نیستند.",
                         { title:"کنار گذاشتن صف ارسال", okLabel:"کنار گذاشتن", danger:true });
  if(!ok) return;
  var r=await api("localOutboxDiscard",{},{silent:true});
  if(!r || !r.ok){ toast((r&&r.message)||"انجام نشد.", true); return; }
  _lc.st=Object.assign({}, _lc.st||{}, { pullState:"running" }); localRender(); localPoke();
}
localInit();
