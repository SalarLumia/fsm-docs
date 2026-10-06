/* ================= پوشش لودینگ ================= */
var _loadingHideTimer;
function setLoading(on, action){
  var el = document.getElementById("loadingOverlay");
  if(on){
    clearTimeout(_loadingHideTimer);
    document.getElementById("loadingMsg").textContent = LOADING_MSGS[action] || "در حال پردازش...";
    el.classList.remove("hidden");
  } else {
    _loadingHideTimer = setTimeout(function(){ el.classList.add("hidden"); }, 60);
  }
}

/* ================= ارتباط با بک‌اند ================= */
async function api(action, payload, opts){
  if(!API_URL || API_URL.indexOf("PASTE_")===0){
    toast("آدرس سرویس (API_URL) در فایل scripts/config.js تنظیم نشده است.", true);
    return { ok:false, message:"آدرس سرویس (API_URL) تنظیم نشده است." };
  }
  // bootstrap با اسکلت/حالت خطای اختصاصی مدیریت می‌شود؛ overlay و توست عمومی لازم ندارد.
  // opts.silent = فراخوان خودش لودینگ را داخل خودش نشان می‌دهد (مثل ویوئر سه‌بعدی) و اورلی تمام‌صفحه نمی‌خواهد.
  // login هم silent است: خود دکمهٔ ورود اسپینر و متن «در حال ورود…» را نشان می‌دهد،
  // پس اورلی تمام‌صفحه اضافه و مزاحم است.
  var silent = (action === "ping" || action === "nextRevision" || action === "bootstrap" || action === "login") || !!(opts && opts.silent);
  if(!silent) setLoading(true, action);
  /* opts.timeout: سقف انتظار (میلی‌ثانیه) — برای بوت‌استرپ، تا سرور گیرکرده کاربر را بی‌پایان معطل نکند */
  var ctl=(opts && opts.timeout && typeof AbortController==="function")?new AbortController():null;
  var tmr=ctl?setTimeout(function(){ ctl.abort(); }, opts.timeout):null;
  try {
    var res = await fetch(API_URL, {
      method:"POST",
      headers:{ "Content-Type":"text/plain;charset=utf-8" },
      body: JSON.stringify({ action:action, token:ME.token, payload:payload||{} }),
      redirect:"follow", signal: ctl?ctl.signal:undefined
    });
    if(!res.ok) throw new Error("HTTP "+res.status);
    var data = await res.json();
    /* ⚠ خود login از این قاعده مستثناست: بک‌اند برای رمز اشتباه هم error:"AUTH"
       برمی‌گرداند، و اگر این‌جا logout() صدا زده شود پنل ورود بسته و پیام
       «نشست منقضی شد» داده می‌شود — در حالی که هنوز نشستی وجود ندارد.
       پیام رمز اشتباه را خود doLogin روی خط راهنما نشان می‌دهد. */
    if(data && data.error==="AUTH" && action!=="login"){ toast("نشست منقضی شد. دوباره وارد شوید.",true); logout(); }
    return data;
  } catch(e){
    // خطای شبکه/سرویس: پیام دوستانه (مگر برای فراخوانی‌های خاموش یا quiet که خودشان مدیریت می‌کنند)
    if(action!=="ping" && action!=="nextRevision" && action!=="bootstrap" && !(opts&&opts.quiet))
      toast("خطا در ارتباط با سرویس. اتصال اینترنت یا در دسترس‌بودن سرویس را بررسی کنید.", true);
    return { ok:false, message:"خطا در ارتباط با سرویس.", netError:true };
  } finally {
    clearTimeout(tmr);
    if(!silent) setLoading(false);
  }
}

/* آپلود غیرمسدودکننده (XMLHttpRequest).
   نکتهٔ مهم CORS: هر شنونده‌ای روی xhr.upload درخواست را «غیرساده» می‌کند و مرورگر یک preflight
   به‌صورت OPTIONS می‌فرستد؛ وب‌اپ Apps Script فقط doGet/doPost دارد و به OPTIONS جواب نمی‌دهد،
   پس آپلود با خطای شبکه می‌افتد. برای همین هیچ شنونده‌ای روی xhr.upload نمی‌گذاریم تا درخواست
   «ساده» بماند و بدون preflight کار کند. در نتیجه درصد واقعی آپلود در دسترس نیست و نوار
   «نامعیّن» نمایش داده می‌شود. onProgress اینجا فراخوانی نمی‌شود (برای سازگاری امضا نگه داشته شده).
   onXhr(xhr): خود درخواست را به صدازننده می‌دهد تا بتواند لغوش کند (مرکز انتقال). */
function apiUpload(action, payload, onProgress, onXhr){
  return new Promise(function(resolve){
    if(!API_URL || API_URL.indexOf("PASTE_")===0){ resolve({ ok:false, message:"آدرس سرویس (API_URL) تنظیم نشده است." }); return; }
    try{
      var xhr=new XMLHttpRequest();
      xhr.open("POST", API_URL, true);
      xhr.setRequestHeader("Content-Type","text/plain;charset=utf-8");
      xhr.onload=function(){
        var data=null; try{ data=JSON.parse(xhr.responseText); }catch(e){}
        if(!data){ resolve({ ok:false, message:"پاسخ نامعتبر از سرویس." }); return; }
        if(data.error==="AUTH"){ toast("نشست منقضی شد. دوباره وارد شوید.",true); logout(); }
        resolve(data);
      };
      xhr.onerror  =function(){ resolve({ ok:false, message:"خطا در ارتباط با سرویس.", netError:true }); };
      xhr.ontimeout=function(){ resolve({ ok:false, message:"زمان ارتباط با سرویس به پایان رسید.", netError:true }); };
      xhr.onabort  =function(){ resolve({ ok:false, message:"لغو شد", canceled:true }); };
      if(onXhr) try{ onXhr(xhr); }catch(_){}
      xhr.send(JSON.stringify({ action:action, token:ME.token, payload:payload||{} }));
    }catch(e){ resolve({ ok:false, message:"خطا در ارسال.", netError:true }); }
  });
}

/* حجم فایل (بایت) از بک‌اند — برای محاسبهٔ پیشرفت واقعی دانلود پیش از استریم. بهترین‌تلاش و بی‌صدا. */
async function apiFileSize(fileId){
  try{ var r=await api("fileMeta",{fileId:fileId},{silent:true, quiet:true}); return (r&&r.ok)?(Number(r.size)||0):0; }
  catch(e){ return 0; }
}

/* دریافت فایل به‌صورت استریمی — برای نمایش پیشرفت بارگذاری بدون اورلی سراسری.
   onProgress(loaded,total): اگر total>0 (Content-Length یا expectedTotal داده‌شده) درصد دقیق ممکن است؛
   وگرنه (روی Apps Script معمولاً Content-Length نیست) حجم دریافتی نشان داده می‌شود.
   expectedTotal: طول تقریبی پاسخ JSON (base64 + سرریز) که از حجم فایل حساب می‌شود تا درصد واقعی باشد.
   signal: لغو از بیرون (دکمهٔ ضربدر مرکز انتقال)؛ نتیجه {canceled:true} است، نه خطا. */
async function apiGetFileStreamed(fileId, onProgress, quiet, expectedTotal, signal){
  if(!API_URL || API_URL.indexOf("PASTE_")===0) return { ok:false, message:"آدرس سرویس تنظیم نشده است." };
  /* سقف انتظار تا *شروع* پاسخ (نه کل دانلود): سرور گیرکرده دیگر نوار را دقیقه‌ها نمی‌چرخاند.
     ۳۵ ثانیه چون Apps Script پیش از فرستادن اولین بایت، کل فایل را از درایو می‌خواند و base64 می‌کند
     (برای فایل بزرگ و شروع سرد ده‌ها ثانیه طول می‌کشد). پس از رسیدن سرآیندها، دانلود بی‌سقف ادامه دارد. */
  var ctl=(typeof AbortController==="function")?new AbortController():null, timedOut=false;
  var ttfb=ctl?setTimeout(function(){ timedOut=true; ctl.abort(); }, FILE_TTFB_MS):null;
  var onExt=function(){ if(ctl) ctl.abort(); };
  if(signal){ if(signal.aborted) return { ok:false, message:"لغو شد", canceled:true }; signal.addEventListener("abort", onExt); }
  try{
    var res=await fetch(API_URL,{ method:"POST", headers:{ "Content-Type":"text/plain;charset=utf-8" },
      body: JSON.stringify({ action:"getFile", token:ME.token, payload:{ fileId:fileId } }), redirect:"follow",
      signal: ctl?ctl.signal:undefined });
    clearTimeout(ttfb);
    // ⚠ گوگل هنگام اختلال به‌جای JSON یک صفحهٔ HTML («فعلاً نمی‌توانیم فایل را باز کنیم») با کد ۴۰۴ می‌فرستد
    if(!res.ok) throw new Error("HTTP "+res.status);
    var total=parseInt(res.headers.get("Content-Length")||"0",10)||0;
    /* expectedTotal می‌تواند عدد باشد یا ظرف {v} که درخواست موازی حجم بعداً پرش می‌کند */
    var expT=function(){ return (expectedTotal && typeof expectedTotal==="object") ? (expectedTotal.v||0) : (expectedTotal||0); };
    if(!res.body || typeof res.body.getReader!=="function") return await res.json();   // مرورگر بدون استریم: یک‌جا
    var reader=res.body.getReader(), chunks=[], loaded=0, rd;
    while(!(rd=await reader.read()).done){
      chunks.push(rd.value); loaded+=rd.value.length;
      if(onProgress) try{ onProgress(loaded, total||expT()); }catch(_){}   // بدون Content-Length: از حجم فایل درصد واقعی بساز
    }
    var buf=new Uint8Array(loaded), off=0, i;
    for(i=0;i<chunks.length;i++){ buf.set(chunks[i], off); off+=chunks[i].length; }
    var data=JSON.parse(new TextDecoder("utf-8").decode(buf));
    if(data && data.error==="AUTH"){ toast("نشست منقضی شد. دوباره وارد شوید.",true); logout(); }
    return data;
  }catch(e){
    clearTimeout(ttfb);
    if(signal && signal.aborted) return { ok:false, message:"لغو شد", canceled:true };
    if(!quiet) toast("خطا در دریافت فایل. اتصال اینترنت را بررسی کنید.", true);
    // netError = سرور پاسخ معتبری نداد (قطعی، صفحهٔ خطای گوگل، یا پاسخ غیر JSON) — نه «فایل نیست»
    return { ok:false, message:"خطا در دریافت فایل.", netError:true, timedOut:timedOut };
  }finally{
    if(signal) signal.removeEventListener("abort", onExt);
  }
}
var FILE_TTFB_MS=35000;

/* ================= علت شکست دریافت فایل (برای پیام دقیق) =================
   سه حالت متفاوت که قبلاً همه «پیش‌نمایش در دسترس نیست» بودند:
   ۱) سرور پاسخ معتبری نداد (netError) — با یک درخواست کوچک به خود سایت جدا می‌شود که
      مقصر سرور گوگل است (سایت در دسترس) یا اینترنت کاربر (هیچ‌کدام در دسترس نیست)؛
   ۲) سرور پاسخ داد ولی فایل را نیافت (ok:false بدون netError) — فایل در درایو حذف/جابه‌جا شده؛
   ۳) فایل رسید ولی نمایش داده نشد — این یکی را خود نمایشگر با FAIL_RENDER اعلام می‌کند. */
async function siteReachable(){
  try{
    var c=(typeof AbortController==="function")?new AbortController():null;
    var t=c?setTimeout(function(){ c.abort(); }, 6000):null;
    var r=await fetch("fsm-favicon.svg?probe="+Date.now(), {cache:"no-store", signal:c?c.signal:undefined});
    clearTimeout(t);
    return !!(r && r.ok);
  }catch(e){ return false; }
}
/* آیکون هر علت — سرور: دو چرخ‌دندهٔ درگیر که گیر می‌کنند (انیمیشن در components.css)؛
   اینترنت: وای‌فای خط‌خورده؛ فایل ناموجود: سند با «؟»؛ نمایش‌ناپذیر: سند با «×». */
var FAIL_IC={
  server:'<svg class="es-ic es-gears" viewBox="0 0 24 24"><g class="g1"><path d="M13.86,8.83 L15.54,9.12 L15.54,10.88 L13.86,11.17 L13.26,12.61 L14.25,14.00 L13.00,15.25 L11.61,14.26 L10.17,14.86 L9.88,16.54 L8.12,16.54 L7.83,14.86 L6.39,14.26 L5.00,15.25 L3.75,14.00 L4.74,12.61 L4.14,11.17 L2.46,10.88 L2.46,9.12 L4.14,8.83 L4.74,7.39 L3.75,6.00 L5.00,4.75 L6.39,5.74 L7.83,5.14 L8.12,3.46 L9.88,3.46 L10.17,5.14 L11.61,5.74 L13.00,4.75 L14.25,6.00 L13.26,7.39Z"/><circle cx="9" cy="10" r="2"/></g><g class="g2"><path d="M20.68,17.95 L21.65,18.76 L20.88,20.08 L19.71,19.64 L18.57,20.30 L18.36,21.53 L16.84,21.53 L16.63,20.30 L15.49,19.64 L14.32,20.08 L13.55,18.76 L14.52,17.95 L14.52,16.65 L13.55,15.84 L14.32,14.52 L15.49,14.96 L16.63,14.30 L16.84,13.07 L18.36,13.07 L18.57,14.30 L19.71,14.96 L20.88,14.52 L21.65,15.84 L20.68,16.65Z"/><circle cx="17.6" cy="17.3" r="1.3"/></g></svg>',
  offline:'<svg class="es-ic" viewBox="0 0 24 24"><line x1="2" y1="2" x2="22" y2="22"/><path d="M8.5 16.5a5 5 0 0 1 7 0"/><path d="M2 8.82a15 15 0 0 1 4.17-2.65"/><path d="M10.66 5c4.01-.36 8.14.9 11.34 3.76"/><path d="M16.85 11.25a10 10 0 0 1 2.22 1.68"/><path d="M5 13a10 10 0 0 1 5.24-2.76"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>',
  missing:'<svg class="es-ic" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M10 12.5a2 2 0 1 1 2.8 1.8c-.5.2-.8.7-.8 1.2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>',
  render:'<svg class="es-ic" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9.5" y1="12.5" x2="14.5" y2="17.5"/><line x1="14.5" y1="12.5" x2="9.5" y2="17.5"/></svg>',
  auth:'<svg class="es-ic" viewBox="0 0 24 24"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>'
};
var FAIL_RENDER={ ic:FAIL_IC.render, t:"فایل دریافت شد ولی قابل نمایش نیست", d:"ممکن است فایل خراب باشد یا قالبش پشتیبانی نشود." };
async function fileFailInfo(r){
  if(!r || r.netError){
    if(await siteReachable())
      return { ic:FAIL_IC.server, t:"سرور گوگل پاسخ نمی‌دهد", d:"چند دقیقهٔ دیگر دوباره تلاش کنید." };
    return { ic:FAIL_IC.offline, t:"اتصال اینترنت برقرار نیست", d:"پس از برقراری اتصال، دوباره تلاش کنید." };
  }
  if(r.error==="AUTH") return { ic:FAIL_IC.auth, t:"نشست منقضی شد", d:"دوباره وارد شوید." };
  return { ic:FAIL_IC.missing, t:"فایل این سند پیدا نشد", d:"ممکن است از گوگل‌درایو حذف یا جابه‌جا شده باشد." };
}

/* دریافت فایل با «تلاش دوبارهٔ خودکار» — بازهٔ cold-start/وارم‌آپ Apps Script (چند دقیقهٔ اول بعد از
   هر «New version») را پنهان می‌کند: در آن بازه اولین درخواست‌ها ممکن است خطا/تایم‌اوت بدهند. اینجا تا
   ۳ بار بی‌صدا تلاش می‌شود؛ اگر همه شکست خورد، آخرین نتیجهٔ ناموفق برمی‌گردد و خود فراخوان پیام می‌دهد.
   o.onProgress(loaded,total): اگر داده شود از مسیر استریمی (نوار پیشرفت) استفاده می‌شود. */
function fileSleep(ms){ return new Promise(function(res){ setTimeout(res, ms); }); }
/* حافظهٔ موقت فایل‌ها (fileId → پاسخ getFile) برای همین نشست صفحه.
   هر پیش‌نمایش (مدل سه‌بعدی پنل پروژه، فایل مودال جزئیات) پس از هر بازرسم دوباره از درایو
   دانلود می‌شد. محتوای یک fileId عوض نمی‌شود (ریویژن/نسخهٔ جدید فایل تازه با شناسهٔ تازه می‌سازد)،
   پس نگه‌داشتنش امن است. سقف تعداد و حجم تا حافظهٔ مرورگر پر نشود؛ قدیمی‌ترین‌ها اول بیرون می‌روند. */
var _fileCache={}, _fileCacheOrder=[], _fileCacheChars=0;
var FILE_CACHE_MAX_N=20, FILE_CACHE_MAX_CHARS=120*1024*1024;   // ≈ ۹۰ مگابایت فایل واقعی (base64)
function fileCachePut(id, r){
  var n=String(r.base64||"").length;
  if(!id || n>FILE_CACHE_MAX_CHARS/2) return;   // فایل خیلی بزرگ کش نمی‌شود
  if(_fileCache[id]){ _fileCacheChars-=String(_fileCache[id].base64||"").length; _fileCacheOrder=_fileCacheOrder.filter(function(x){ return x!==id; }); }
  _fileCache[id]=r; _fileCacheOrder.push(id); _fileCacheChars+=n;
  while(_fileCacheOrder.length>FILE_CACHE_MAX_N || _fileCacheChars>FILE_CACHE_MAX_CHARS){
    var old=_fileCacheOrder.shift(); _fileCacheChars-=String((_fileCache[old]||{}).base64||"").length; delete _fileCache[old];
  }
}
/* فایلی که رسید ولی نمایش داده نشد نباید در حافظه بماند؛ وگرنه «تلاش مجدد» همان نسخهٔ معیوب را برمی‌داشت. */
function fileCacheDrop(id){
  if(!id || !_fileCache[id]) return;
  _fileCacheChars-=String(_fileCache[id].base64||"").length; delete _fileCache[id];
  _fileCacheOrder=_fileCacheOrder.filter(function(x){ return x!==id; });
}
/* اطلاعات خطای «ابزار نمایش (کتابخانهٔ محلی سایت) بارگذاری نشد» — با اینترنت ناپایدار پیش می‌آید، نه با خرابی فایل */
var FAIL_ASSET={ ic:FAIL_IC.offline, t:"ابزار نمایش بارگذاری نشد", d:"اتصال اینترنت ناپایدار است. فایل سالم است؛ دوباره تلاش کنید." };
async function getFileRetry(fileId, o){
  o=o||{}; var tries=3, r=null;
  if(fileId && _fileCache[fileId]){ if(o.onProgress) try{ o.onProgress(1,1); }catch(e){} return _fileCache[fileId]; }
  /* اگر onProgress هست ولی حجم موردانتظار داده نشده، حجم از بک‌اند گرفته می‌شود تا درصد واقعی شود.
     ⚡ هم‌زمان با دانلود، نه پیش از آن: قبلاً دانلود تا پایان این درخواست (۱–۲ ثانیه) منتظر می‌ماند.
     تا رسیدنش، نوار با پیشرفت تخمینی جلو می‌رود؛ پس از رسیدن، درصد واقعی جایش را می‌گیرد. */
  var exp=Number(o.expectedTotal)||0;
  if(o.onProgress && !exp && typeof apiFileSize==="function"){
    var holder={v:0}; exp=holder;
    apiFileSize(fileId).then(function(sz){ if(sz>0) holder.v=Math.ceil(sz/3)*4 + 120; });   // طول base64 + سرریز JSON
  }
  for(var i=0;i<tries;i++){
    if(o.signal && o.signal.aborted) return { ok:false, message:"لغو شد", canceled:true };
    if(o.onProgress && typeof apiGetFileStreamed==="function") r=await apiGetFileStreamed(fileId, o.onProgress, true, exp, o.signal);
    else r=await api("getFile",{fileId:fileId},{silent:true, quiet:true});
    if(r && r.ok){ fileCachePut(fileId, r); return r; }   // موفق شد
    /* تکرار فقط برای شکست‌های سریع و گذرا (صفحهٔ خطای گوگل، قطعی لحظه‌ای). سرور گیرکرده (timedOut)
       یا «فایل نیست» (پاسخ معتبر سرور) با تکرار درست نمی‌شود و فقط انتظار را چند برابر می‌کرد. */
    if(r && (r.canceled || r.timedOut || !r.netError)) break;
    if(i<tries-1) await fileSleep(650*(i+1));   // ۰٫۶۵s سپس ۱٫۳s پیش از تلاش بعدی
  }
  return r;
}

/* ================= توست ================= */
function toast(msg,isErr){
  var t=document.createElement("div"); t.className="toast "+(isErr?"err":"ok"); t.textContent=msg;
  document.getElementById("toastHost").appendChild(t);
  setTimeout(function(){ t.style.opacity="0"; t.style.transition=".4s"; setTimeout(function(){t.remove();},400); },3200);
}

/* ================= دیالوگ تأیید (هم‌سبک با سایت، وسط صفحه) =================
   جایگزین confirm() مرورگر. Promise برمی‌گرداند: true=تأیید، false=انصراف.
   روی هر مودال باز می‌نشیند (z بالاتر) و مودال زیرین را دست نمی‌زند. */
function uiConfirm(message, opts){
  opts=opts||{};
  return new Promise(function(resolve){
    var okLabel=opts.okLabel||"تأیید", cancelLabel=opts.cancelLabel||"انصراف";
    var okClass=opts.danger?"btn danger":"btn primary";
    var title=opts.title||(opts.danger?"تأیید حذف":"تأیید");
    var wrap=document.createElement("div");
    wrap.className="modal confirm-modal";
    // فریم استاندارد مودال سایت (هدر + بدنه) تا با بقیهٔ پنجره‌های سایت یکپارچه باشد
    wrap.innerHTML='<div class="box confirm-mbox">'+
      '<header><strong>'+esc(title)+'</strong>'+
        '<button class="modal-x" data-v="0" aria-label="بستن" title="بستن">✕</button></header>'+
      '<div class="body"><div class="confirm-box">'+
        '<p class="confirm-msg">'+esc(message)+'</p>'+
        '<div class="confirm-acts">'+
          '<button class="btn" data-v="0">'+esc(cancelLabel)+'</button>'+
          '<button class="'+okClass+'" data-v="1">'+esc(okLabel)+'</button>'+
        '</div>'+
      '</div></div></div>';
    document.body.appendChild(wrap);
    var onKey;
    var settle=function(val){
      if(onKey) document.removeEventListener("keydown",onKey,true);
      /* پاسخ بی‌درنگ برمی‌گردد (کار بعدی معطل انیمیشن نمی‌ماند)؛ خود پنجره با انیمیشن بسته می‌شود */
      modalClose(wrap, function(){ if(wrap.parentNode) wrap.parentNode.removeChild(wrap); });
      resolve(val);
    };
    var btns=wrap.querySelectorAll("[data-v]");
    for(var i=0;i<btns.length;i++){ (function(b){ b.addEventListener("click",function(){ settle(b.getAttribute("data-v")==="1"); }); })(btns[i]); }
    wrap.addEventListener("click",function(e){ if(e.target===wrap) settle(false); });
    onKey=function(e){ if(e.key==="Escape"){ e.preventDefault(); e.stopPropagation(); settle(false); }
                       else if(e.key==="Enter"){ e.preventDefault(); e.stopPropagation(); settle(true); } };
    document.addEventListener("keydown",onKey,true);
    var ok=wrap.querySelector('[data-v="1"]'); if(ok) try{ ok.focus(); }catch(e){}
  });
}
