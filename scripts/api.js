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
  // bootstrap با اسکلت/حالت خطای اختصاصی مدیریت می‌شود؛ overlay و توستِ عمومی لازم ندارد.
  // opts.silent = فراخوان خودش لودینگ را داخلِ خودش نشان می‌دهد (مثلِ ویوئرِ سه‌بعدی) و اورلیِ تمام‌صفحه نمی‌خواهد.
  // login هم silent است: خودِ دکمهٔ ورود اسپینر و متنِ «در حال ورود…» را نشان می‌دهد،
  // پس اورلیِ تمام‌صفحه اضافه و مزاحم است.
  var silent = (action === "ping" || action === "nextRevision" || action === "bootstrap" || action === "login") || !!(opts && opts.silent);
  if(!silent) setLoading(true, action);
  try {
    var res = await fetch(API_URL, {
      method:"POST",
      headers:{ "Content-Type":"text/plain;charset=utf-8" },
      body: JSON.stringify({ action:action, token:ME.token, payload:payload||{} }),
      redirect:"follow"
    });
    if(!res.ok) throw new Error("HTTP "+res.status);
    var data = await res.json();
    /* ⚠ خودِ login از این قاعده مستثناست: بک‌اند برای رمزِ اشتباه هم error:"AUTH"
       برمی‌گرداند، و اگر این‌جا logout() صدا زده شود پنلِ ورود بسته و پیامِ
       «نشست منقضی شد» داده می‌شود — در حالی که هنوز نشستی وجود ندارد.
       پیامِ رمزِ اشتباه را خودِ doLogin روی خطِ راهنما نشان می‌دهد. */
    if(data && data.error==="AUTH" && action!=="login"){ toast("نشست منقضی شد. دوباره وارد شوید.",true); logout(); }
    return data;
  } catch(e){
    // خطای شبکه/سرویس: پیام دوستانه (مگر برای فراخوانی‌های خاموش یا quiet که خودشان مدیریت می‌کنند)
    if(action!=="ping" && action!=="nextRevision" && action!=="bootstrap" && !(opts&&opts.quiet))
      toast("خطا در ارتباط با سرویس. اتصال اینترنت یا در دسترس‌بودن سرویس را بررسی کنید.", true);
    return { ok:false, message:"خطا در ارتباط با سرویس.", netError:true };
  } finally {
    if(!silent) setLoading(false);
  }
}

/* آپلودِ غیرمسدودکننده (XMLHttpRequest).
   نکتهٔ مهمِ CORS: هر شنونده‌ای روی xhr.upload درخواست را «غیرِساده» می‌کند و مرورگر یک preflight
   به‌صورتِ OPTIONS می‌فرستد؛ وب‌اپِ Apps Script فقط doGet/doPost دارد و به OPTIONS جواب نمی‌دهد،
   پس آپلود با خطای شبکه می‌افتد. برای همین هیچ شنونده‌ای روی xhr.upload نمی‌گذاریم تا درخواست
   «ساده» بماند و بدونِ preflight کار کند. در نتیجه درصدِ واقعیِ آپلود در دسترس نیست و نوار
   «نامعیّن» نمایش داده می‌شود. onProgress اینجا فراخوانی نمی‌شود (برای سازگاریِ امضا نگه داشته شده). */
function apiUpload(action, payload, onProgress){
  return new Promise(function(resolve){
    if(!API_URL || API_URL.indexOf("PASTE_")===0){ resolve({ ok:false, message:"آدرس سرویس (API_URL) تنظیم نشده است." }); return; }
    try{
      var xhr=new XMLHttpRequest();
      xhr.open("POST", API_URL, true);
      xhr.setRequestHeader("Content-Type","text/plain;charset=utf-8");
      xhr.onload=function(){
        var data=null; try{ data=JSON.parse(xhr.responseText); }catch(e){}
        if(!data){ resolve({ ok:false, message:"پاسخِ نامعتبر از سرویس." }); return; }
        if(data.error==="AUTH"){ toast("نشست منقضی شد. دوباره وارد شوید.",true); logout(); }
        resolve(data);
      };
      xhr.onerror  =function(){ resolve({ ok:false, message:"خطا در ارتباط با سرویس.", netError:true }); };
      xhr.ontimeout=function(){ resolve({ ok:false, message:"زمانِ ارتباط با سرویس به پایان رسید.", netError:true }); };
      xhr.send(JSON.stringify({ action:action, token:ME.token, payload:payload||{} }));
    }catch(e){ resolve({ ok:false, message:"خطا در ارسال.", netError:true }); }
  });
}

/* حجمِ فایل (بایت) از بک‌اند — برای محاسبهٔ پیشرفتِ واقعیِ دانلود پیش از استریم. بهترین‌تلاش و بی‌صدا. */
async function apiFileSize(fileId){
  try{ var r=await api("fileMeta",{fileId:fileId},{silent:true, quiet:true}); return (r&&r.ok)?(Number(r.size)||0):0; }
  catch(e){ return 0; }
}

/* دریافتِ فایل به‌صورتِ استریمی — برای نمایشِ پیشرفتِ بارگذاری بدونِ اورلیِ سراسری.
   onProgress(loaded,total): اگر total>0 (Content-Length یا expectedTotalِ داده‌شده) درصدِ دقیق ممکن است؛
   وگرنه (روی Apps Script معمولاً Content-Length نیست) حجمِ دریافتی نشان داده می‌شود.
   expectedTotal: طولِ تقریبیِ پاسخِ JSON (base64 + سرریز) که از حجمِ فایل حساب می‌شود تا درصد واقعی باشد. */
async function apiGetFileStreamed(fileId, onProgress, quiet, expectedTotal){
  if(!API_URL || API_URL.indexOf("PASTE_")===0) return { ok:false, message:"آدرس سرویس تنظیم نشده است." };
  try{
    var res=await fetch(API_URL,{ method:"POST", headers:{ "Content-Type":"text/plain;charset=utf-8" },
      body: JSON.stringify({ action:"getFile", token:ME.token, payload:{ fileId:fileId } }), redirect:"follow" });
    if(!res.ok) throw new Error("HTTP "+res.status);
    var total=parseInt(res.headers.get("Content-Length")||"0",10)||0;
    /* expectedTotal می‌تواند عدد باشد یا ظرفِ {v} که درخواستِ موازیِ حجم بعداً پرش می‌کند */
    var expT=function(){ return (expectedTotal && typeof expectedTotal==="object") ? (expectedTotal.v||0) : (expectedTotal||0); };
    if(!res.body || typeof res.body.getReader!=="function") return await res.json();   // مرورگرِ بدونِ استریم: یک‌جا
    var reader=res.body.getReader(), chunks=[], loaded=0, rd;
    while(!(rd=await reader.read()).done){
      chunks.push(rd.value); loaded+=rd.value.length;
      if(onProgress) try{ onProgress(loaded, total||expT()); }catch(_){}   // بدونِ Content-Length: از حجمِ فایل درصدِ واقعی بساز
    }
    var buf=new Uint8Array(loaded), off=0, i;
    for(i=0;i<chunks.length;i++){ buf.set(chunks[i], off); off+=chunks[i].length; }
    var data=JSON.parse(new TextDecoder("utf-8").decode(buf));
    if(data && data.error==="AUTH"){ toast("نشست منقضی شد. دوباره وارد شوید.",true); logout(); }
    return data;
  }catch(e){
    if(!quiet) toast("خطا در دریافت فایل. اتصال اینترنت را بررسی کنید.", true);
    return { ok:false, message:"خطا در دریافت فایل.", netError:true };
  }
}

/* دریافتِ فایل با «تلاشِ دوبارهٔ خودکار» — بازهٔ cold-start/وارم‌آپِ Apps Script (چند دقیقهٔ اولِ بعد از
   هر «New version») را پنهان می‌کند: در آن بازه اولین درخواست‌ها ممکن است خطا/تایم‌اوت بدهند. اینجا تا
   ۳ بار بی‌صدا تلاش می‌شود؛ اگر همه شکست خورد، آخرین نتیجهٔ ناموفق برمی‌گردد و خودِ فراخوان پیام می‌دهد.
   o.onProgress(loaded,total): اگر داده شود از مسیرِ استریمی (نوارِ پیشرفت) استفاده می‌شود. */
function fileSleep(ms){ return new Promise(function(res){ setTimeout(res, ms); }); }
/* حافظهٔ موقتِ فایل‌ها (fileId → پاسخِ getFile) برای همین نشستِ صفحه.
   هر پیش‌نمایش (مدلِ سه‌بعدیِ پنلِ پروژه، فایلِ مودالِ جزئیات) پس از هر بازرسم دوباره از درایو
   دانلود می‌شد. محتوای یک fileId عوض نمی‌شود (ریویژن/نسخهٔ جدید فایلِ تازه با شناسهٔ تازه می‌سازد)،
   پس نگه‌داشتنش امن است. سقفِ تعداد و حجم تا حافظهٔ مرورگر پر نشود؛ قدیمی‌ترین‌ها اول بیرون می‌روند. */
var _fileCache={}, _fileCacheOrder=[], _fileCacheChars=0;
var FILE_CACHE_MAX_N=20, FILE_CACHE_MAX_CHARS=120*1024*1024;   // ≈ ۹۰ مگابایت فایلِ واقعی (base64)
function fileCachePut(id, r){
  var n=String(r.base64||"").length;
  if(!id || n>FILE_CACHE_MAX_CHARS/2) return;   // فایلِ خیلی بزرگ کش نمی‌شود
  if(_fileCache[id]){ _fileCacheChars-=String(_fileCache[id].base64||"").length; _fileCacheOrder=_fileCacheOrder.filter(function(x){ return x!==id; }); }
  _fileCache[id]=r; _fileCacheOrder.push(id); _fileCacheChars+=n;
  while(_fileCacheOrder.length>FILE_CACHE_MAX_N || _fileCacheChars>FILE_CACHE_MAX_CHARS){
    var old=_fileCacheOrder.shift(); _fileCacheChars-=String((_fileCache[old]||{}).base64||"").length; delete _fileCache[old];
  }
}
async function getFileRetry(fileId, o){
  o=o||{}; var tries=3, r=null;
  if(fileId && _fileCache[fileId]){ if(o.onProgress) try{ o.onProgress(1,1); }catch(e){} return _fileCache[fileId]; }
  /* اگر onProgress هست ولی حجمِ موردانتظار داده نشده، حجم از بک‌اند گرفته می‌شود تا درصد واقعی شود.
     ⚡ هم‌زمان با دانلود، نه پیش از آن: قبلاً دانلود تا پایانِ این درخواست (۱–۲ ثانیه) منتظر می‌ماند.
     تا رسیدنش، نوار با پیشرفتِ تخمینی جلو می‌رود؛ پس از رسیدن، درصدِ واقعی جایش را می‌گیرد. */
  var exp=Number(o.expectedTotal)||0;
  if(o.onProgress && !exp && typeof apiFileSize==="function"){
    var holder={v:0}; exp=holder;
    apiFileSize(fileId).then(function(sz){ if(sz>0) holder.v=Math.ceil(sz/3)*4 + 120; });   // طولِ base64 + سرریزِ JSON
  }
  for(var i=0;i<tries;i++){
    if(o.onProgress && typeof apiGetFileStreamed==="function") r=await apiGetFileStreamed(fileId, o.onProgress, true, exp);
    else r=await api("getFile",{fileId:fileId},{silent:true, quiet:true});
    if(r && r.ok){ fileCachePut(fileId, r); return r; }   // موفق شد
    if(i<tries-1) await fileSleep(650*(i+1));   // ۰٫۶۵s سپس ۱٫۳s پیش از تلاشِ بعدی
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
   روی هر مودالِ باز می‌نشیند (z بالاتر) و مودال زیرین را دست نمی‌زند. */
function uiConfirm(message, opts){
  opts=opts||{};
  return new Promise(function(resolve){
    var okLabel=opts.okLabel||"تأیید", cancelLabel=opts.cancelLabel||"انصراف";
    var okClass=opts.danger?"btn danger":"btn primary";
    var title=opts.title||(opts.danger?"تأیید حذف":"تأیید");
    var wrap=document.createElement("div");
    wrap.className="modal confirm-modal";
    // فریمِ استانداردِ مودالِ سایت (هدر + بدنه) تا با بقیهٔ پنجره‌های سایت یکپارچه باشد
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
      if(wrap.parentNode) wrap.parentNode.removeChild(wrap);
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
