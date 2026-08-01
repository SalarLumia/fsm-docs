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
  var silent = (action === "ping" || action === "nextRevision" || action === "bootstrap") || !!(opts && opts.silent);
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
    if(data && data.error==="AUTH"){ toast("نشست منقضی شد. دوباره وارد شوید.",true); logout(); }
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

/* دریافتِ فایل به‌صورتِ استریمی — برای نمایشِ پیشرفتِ بارگذاری بدونِ اورلیِ سراسری.
   onProgress(loaded,total): اگر total>0 (سرور Content-Length داد) درصدِ دقیق ممکن است؛
   اگر total=0 (روی Apps Script معمولاً همین‌طور است چون پاسخ gzip/chunked است) حجمِ دریافتی نشان داده می‌شود. */
async function apiGetFileStreamed(fileId, onProgress, quiet){
  if(!API_URL || API_URL.indexOf("PASTE_")===0) return { ok:false, message:"آدرس سرویس تنظیم نشده است." };
  try{
    var res=await fetch(API_URL,{ method:"POST", headers:{ "Content-Type":"text/plain;charset=utf-8" },
      body: JSON.stringify({ action:"getFile", token:ME.token, payload:{ fileId:fileId } }), redirect:"follow" });
    if(!res.ok) throw new Error("HTTP "+res.status);
    var total=parseInt(res.headers.get("Content-Length")||"0",10)||0;
    if(!res.body || typeof res.body.getReader!=="function") return await res.json();   // مرورگرِ بدونِ استریم: یک‌جا
    var reader=res.body.getReader(), chunks=[], loaded=0, rd;
    while(!(rd=await reader.read()).done){
      chunks.push(rd.value); loaded+=rd.value.length;
      if(onProgress) try{ onProgress(loaded, total); }catch(_){}
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
async function getFileRetry(fileId, o){
  o=o||{}; var tries=3, r=null;
  for(var i=0;i<tries;i++){
    if(o.onProgress && typeof apiGetFileStreamed==="function") r=await apiGetFileStreamed(fileId, o.onProgress, true);
    else r=await api("getFile",{fileId:fileId},{silent:true, quiet:true});
    if(r && r.ok) return r;                     // موفق شد
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
