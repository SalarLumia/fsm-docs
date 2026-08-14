/* ================= مرکز دانلود (صفِ معلق و غیرمسدودکننده) =================
   به‌جای اینکه دکمهٔ «دانلود» کلِ صفحه را مات کند و کاربر منتظر بماند، هر درخواست به یک
   «کارت» در پنلِ شناورِ مرکز دانلود می‌رود. فایل در پس‌زمینه (به‌صورتِ استریمی، با نمایشِ
   پیشرفت) آماده می‌شود و بقیهٔ سایت آزاد می‌ماند؛ به‌محضِ کامل‌شدن، فایل به‌صورتِ خودکار به
   فهرستِ دانلودِ مرورگر سپرده می‌شود. صف تک‌کاره است (هر لحظه یک فایل) تا فایلِ حجیم سرویس را
   قفل نکند؛ بقیه در حالتِ «در صف» منتظر می‌مانند. الگو: مرکزِ دانلودِ کنوا. */

var _dlJobs = [];      // {id, fileId, label, name, status, pct, loaded, total, blobUrl, msg}
var _dlSeq  = 0;       // شمارندهٔ یکتای کارها
var _dlActive = false; // آیا کارگرِ صف مشغولِ یک دانلود است؟
var _dlOpen = false;   // آیا دراپ‌داونِ مرکز انتقال باز است؟
var _dlUnseen = false; // آیا کارِ تمام‌شده‌ای هست که کاربر هنوز پنل را برایش باز نکرده؟ (نشانِ سبز)
var _dlLastKind = "download"; // نوعِ آخرین کارِ فعال/تمام‌شده — برای آیکونِ دکمه (آپلود/دانلود)

/* افزودنِ یک درخواست به صف. label = برچسبِ نمایشیِ اولیه (معمولاً شمارهٔ سند) تا پیش از رسیدنِ
   نامِ واقعیِ فایل چیزی برای نشان‌دادن باشد. */
function dlEnqueue(fileId, label){
  if(!fileId){ toast("این مورد فایلی برای دانلود ندارد.",true); return; }
  var id = ++_dlSeq;
  _dlJobs.push({ id:id, kind:"download", fileId:fileId, label:(label||"سند"), name:"", status:"queued",
                 pct:0, loaded:0, total:0, blobUrl:null, msg:"" });
  xferAutoOpen();
  dlPump();
}
/* پنل در هر حالتی باز می‌شود — حتی وقتی مودال باز است. دکمهٔ هدر و پنل با کلاسِ
   body.modal-open از زیرِ پوششِ تیره بیرون می‌آیند، پس پیشرفتِ دانلود دیده می‌شود
   و کاربر فکر نمی‌کند دکمهٔ دانلود کار نکرده است. */
function xferAutoOpen(){ xferOpen(); }

/* افزودنِ یک کارِ آپلود به همان صف/پنل. opts = { label, action, payload, onSuccess(r) }.
   آپلود در پس‌زمینه انجام می‌شود (با پیشرفتِ واقعیِ XHR) و سایت آزاد می‌ماند. */
function dlEnqueueUpload(opts){
  opts=opts||{};
  var id = ++_dlSeq;
  _dlJobs.push({ id:id, kind:"upload", label:(opts.label||"سند"), name:(opts.label||"سند"), status:"queued",
                 pct:0, loaded:0, total:0, processing:false, msg:"",
                 action:opts.action, payload:opts.payload, onSuccess:opts.onSuccess });
  xferAutoOpen();
  dlPump();
  return id;
}

/* کارگرِ صف: هر بار اولین کارِ «در صف» را برمی‌دارد و کاملش می‌کند، سپس سراغِ بعدی می‌رود.
   دو نوعِ کار: دانلود (استریمِ فایل + سپردن به مرورگر) و آپلود (ارسالِ درخواست با پیشرفتِ واقعی). */
async function dlPump(){
  if(_dlActive) return;
  var job = _dlJobs.filter(function(j){ return j.status==="queued"; })[0];
  if(!job) return;
  _dlActive = true;
  job.status="working"; job.pct=0; job.loaded=0; job.total=0; job.processing=false; job.msg="";
  dlRender();
  try{
    if(job.kind==="upload"){
      var ru = await apiUpload(job.action, job.payload, function(loaded,total){
        if(loaded<0){ job.processing=true; job.pct=100; dlProgress(job); return; }   // آپلود تمام → پردازشِ سرور
        job.loaded=loaded; job.total=total;
        if(total>0) job.pct=Math.min(99, Math.round(loaded/total*100));
        dlProgress(job);
      });
      if(!ru || !ru.ok){ job.status="error"; job.msg=(ru&&ru.message)||"ثبت ناموفق بود."; dlRender(); }
      else { job.pct=100; job.status="done"; job.result=ru; dlRender();
             if(typeof job.onSuccess==="function"){ try{ job.onSuccess(ru); }catch(e){} } }
    } else {
      var r = await getFileRetry(job.fileId, { onProgress:function(loaded,total){
        job.loaded=loaded; job.total=total;
        if(total>0) job.pct=Math.min(99, Math.round(loaded/total*100));
        dlProgress(job);   // به‌روزرسانیِ سبکِ فقطِ همان کارت (بدونِ بازسازیِ کلِ فهرست)
      }});
      if(!r || !r.ok){
        job.status="error"; job.msg=(r&&r.message)||"دریافتِ فایل ناموفق بود.";
        dlRender();
      } else {
        var blob = b64toBlob(r.base64, r.mimeType);
        job.name = r.name || (job.label+"");
        job.mimeType = r.mimeType||"";
        job.blobUrl = URL.createObjectURL(blob);
        job.pct = 100; job.status="done";
        dlRender();
        dlHandOff(job);   // سپردن به دانلودِ مرورگر
      }
    }
  }catch(e){
    job.status="error"; job.msg=(job.kind==="upload")?"خطا در ثبت.":"خطا در دریافتِ فایل.";
    dlRender();
  } finally {
    if(job.status==="done" || job.status==="error"){
      _dlLastKind=job.kind;
      if(!_dlOpen) _dlUnseen=true;   // اگر پنل باز نیست، نشانِ سبز/قرمز تا بازشدنِ پنل بماند
      dlUpdateHeader();
    }
    _dlActive=false;
    dlPump();   // کارِ بعدیِ صف (اگر باشد)
  }
}

/* سپردنِ فایلِ آماده‌شده به فهرستِ دانلودِ مرورگر (لینکِ نامرئیِ download). */
function dlHandOff(job){
  if(!job || !job.blobUrl) return;
  var a=document.createElement("a");
  a.href=job.blobUrl; a.download=job.name||"file";
  /* ⚠ این کلیکِ ساختگی روی body می‌نشیند و تا شنوندهٔ «کلیکِ بیرون» بالا می‌رود،
     پس با تمام‌شدنِ هر دانلود، پنل خودبه‌خود بسته می‌شد. با این نشانه، آن شنونده
     کلیکِ خودی را نادیده می‌گیرد و پنل تا کلیکِ واقعیِ کاربر باز می‌ماند. */
  a.dataset.dlInternal="1";
  document.body.appendChild(a); a.click(); a.remove();
  // blobUrl را نگه می‌داریم تا «دانلودِ دوباره» ممکن باشد؛ با حذفِ کارت یا «پاک‌کردن» آزاد می‌شود.
}

/* ---------- رندرِ پنل (دراپ‌داونِ زیرِ دکمهٔ هدر) ---------- */
/* ⚠ پنل باید فرزندِ مستقیمِ body باشد، نه داخلِ هدر.
   دلیل: .top-bar با position:sticky و z-index:30 یک «زمینهٔ چیدمان» می‌سازد و هر
   چیزی داخلش — حتی با position:fixed و z-index:120 — زیرِ سقفِ همان ۳۰ حبس می‌شود،
   پس هرگز روی مودالِ z-index:80 دیده نمی‌شد. با انتقال به body این سقف برداشته می‌شود. */
function dlHost(){
  var h=document.getElementById("dlCenter");
  if(!h){ h=document.createElement("div"); h.id="dlCenter"; h.className="dl-center"; }
  if(h.parentNode!==document.body) document.body.appendChild(h);
  return h;
}
function dlRender(){
  var host=dlHost();
  var activeN=_dlJobs.filter(function(j){ return j.status==="working"||j.status==="queued"; }).length;
  var doneN =_dlJobs.filter(function(j){ return j.status==="done"; }).length;
  var title = activeN ? ("در حال انتقال ("+faN(activeN)+")") : "انتقال‌ها";
  host.className="dl-center"+(_dlOpen?" open":"");
  var listHTML = _dlJobs.length
    ? '<div class="dl-list">'+_dlJobs.map(dlItemHTML).join("")+'</div>'
    : '<div class="dl-empty">'+DL_IC.center+'<span>انتقالی وجود ندارد</span></div>';
  host.innerHTML=
    '<div class="dl-head">'+
      '<span class="dl-title">'+DL_IC.center+'<span>'+esc(title)+'</span></span>'+
      '<div class="dl-head-acts">'+
        (doneN? '<button class="dl-textbtn" onclick="dlClearDone()" title="پاک‌کردنِ کامل‌شده‌ها">پاک‌کردن</button>':'')+
      '</div>'+
    '</div>'+listHTML;
  dlUpdateHeader();
}

/* متنِ وضعیتِ یک کار — بسته به نوع (آپلود/دانلود) و مرحله */
function dlStateText(j){
  var up=(j.kind==="upload");
  if(j.status==="queued")  return "در صف…";
  if(j.status==="working"){
    if(up){ if(j.processing) return "در حال پردازش…";
            return j.total>0 ? ("در حال بارگذاری… "+faN(j.pct)+"٪")
                             : "در حال بارگذاری…"; }   /* آپلود درصدِ واقعی ندارد (محدودیتِ Apps Script) → نوارِ نامعیّن */
    return j.total>0 ? ("در حال دریافت… "+faN(j.pct)+"٪")
                     : ("در حال دریافت… "+(j.loaded/1048576).toFixed(1)+" MB");
  }
  if(j.status==="done") return up ? "بارگذاری شد" : "دریافت شد";
  return j.msg || "ناموفق";
}
function dlItemHTML(j){
  var up=(j.kind==="upload");
  var name = esc(j.name||j.label);
  var state=dlStateText(j), cls = j.status==="done"?"ok" : (j.status==="error"?"err":"");
  // نوارِ نامعیّن وقتی درصدِ واقعی نداریم (یا مرحلهٔ پردازشِ سرور در آپلود)
  var indet=(j.status==="working" && ((up && j.processing) || !(j.total>0)));
  var bar=(j.status==="working"||j.status==="queued")
    ? '<div class="dl-bar'+(indet?" indet":"")+'"><span class="dl-fill"'+(indet?'':' style="width:'+j.pct+'%"')+'></span></div>'
    : '';

  var acts="";
  if(j.status==="done" && !up) acts+='<button class="dl-iconbtn" onclick="dlRedownload('+j.id+')" title="دانلودِ دوباره" aria-label="دانلودِ دوباره">'+DL_IC.dl+'</button>';
  else if(j.status==="error")  acts+='<button class="dl-iconbtn" onclick="dlRetry('+j.id+')" title="تلاشِ دوباره" aria-label="تلاشِ دوباره">'+DL_IC.retry+'</button>';

  // آیکونِ سرِ هر رکورد بسته به نوع: آپلود = فلشِ بالا، دانلود = فلشِ پایین
  return '<div class="dl-item '+j.status+(up?" up":" down")+'" data-id="'+j.id+'">'+
    '<span class="dl-fileic'+(up?" up":" down")+'">'+(up?DL_IC.up_badge:DL_IC.dl)+'</span>'+
    '<div class="dl-main">'+
      '<div class="dl-name" title="'+name+'">'+name+'</div>'+
      '<div class="dl-state '+cls+'">'+esc(state)+'</div>'+
      bar+
    '</div>'+
    '<div class="dl-acts">'+acts+'</div>'+
  '</div>';
}

/* به‌روزرسانیِ سبکِ پیشرفت (فقط متنِ وضعیت + عرضِ نوار) تا با هر chunk کلِ فهرست بازسازی نشود. */
function dlProgress(j){
  var host=document.getElementById("dlCenter"); if(!host) return;
  var el=host.querySelector('.dl-item[data-id="'+j.id+'"]'); if(!el){ dlRender(); return; }
  var st=el.querySelector(".dl-state"); if(st) st.textContent = dlStateText(j);
  var bar=el.querySelector(".dl-bar"), f=el.querySelector(".dl-fill");
  var indet=(j.kind==="upload" && j.processing) || !(j.total>0);
  if(bar) bar.classList.toggle("indet", indet);
  if(f) f.style.width = indet ? "" : (j.pct+"%");   // نامعیّن: عرض را به CSS بسپار (sweepِ ۴۵٪)
  dlUpdateHeader();
}

/* ---------- نشانگرِ هدر (سمتِ چپِ نوارِ بالا) ---------- */
function dlUpdateHeader(){
  var btn=document.getElementById("xferBtn"); if(!btn) return;
  var activeN=_dlJobs.filter(function(j){ return j.status==="working"||j.status==="queued"; }).length;
  var errN  =_dlJobs.filter(function(j){ return j.status==="error"; }).length;
  var doneN =_dlJobs.filter(function(j){ return j.status==="done"; }).length;
  var badge=btn.querySelector(".xfer-badge");
  // آیکونِ دکمه ثابت است (فلشِ بالا+پایینِ «انتقال»)؛ شکل هرگز عوض نمی‌شود، فقط رنگ (کلاس‌های زیر).
  // نشانِ «تمام‌شدهٔ ندیده»: فقط رنگ (سبز برای موفق، قرمز برای خطا) — شکلِ آیکون همان می‌ماند
  var notifyErr  = (activeN===0 && _dlUnseen && errN>0);
  var notifyDone = (activeN===0 && _dlUnseen && doneN>0 && !notifyErr);
  btn.classList.toggle("busy", activeN>0);
  btn.classList.toggle("alldone", notifyDone);
  btn.classList.toggle("err", notifyErr);
  btn.classList.toggle("open", _dlOpen);
  var n = activeN || (notifyErr ? errN : 0);
  if(badge) badge.textContent = n ? faN(n) : "";
  btn.setAttribute("title", activeN? ("در حال انتقال ("+faN(activeN)+")") : "انتقال‌ها");
}

/* ---------- اکشن‌ها ---------- */
function _dlById(id){ return _dlJobs.filter(function(j){ return j.id===id; })[0]||null; }
/* دراپ‌داونِ مرکز انتقال: باز/بست با انیمیشن، بستن با کلیکِ بیرون */
function xferToggle(){ if(_dlOpen) xferClose(); else xferOpen(); }
/* پنل زیرِ دکمهٔ هدر جای می‌گیرد. چون position:fixed است، مختصات باید این‌جا
   از روی جای واقعیِ دکمه حساب شود؛ این‌طور روی مودال هم درست می‌نشیند و با
   اسکرول یا تغییرِ اندازهٔ صفحه از جای دکمه جدا نمی‌افتد. */
function xferPlace(){
  var host=document.getElementById("dlCenter"), btn=document.getElementById("xferBtn");
  if(!host) return;
  var r=btn?btn.getBoundingClientRect():null;
  /* ⚠ اگر مودالی باز باشد، هدر دیده نمی‌شود (body با overflow:hidden قفل می‌شود و
     هدرِ sticky زمینهٔ اسکرولش را از دست می‌دهد)، پس مختصاتِ دکمه بی‌معنی است.
     در آن حالت پنل را مستقل از دکمه، به گوشهٔ بالای صفحه می‌چسبانیم تا دیده شود. */
  if(!r || r.width===0 || r.bottom<=0){
    host.style.top="16px";
    host.style.left="16px";
    return;
  }
  host.style.top=Math.round(r.bottom+10)+"px";
  // در RTL دکمه سمتِ چپِ هدر است؛ پنل از همان لبه باز می‌شود ولی از کادر بیرون نزند
  var left=Math.max(12, Math.min(r.left, window.innerWidth-330-12));
  host.style.left=Math.round(left)+"px";
}
function xferOpen(){
  _dlUnseen=false;                 // بازکردنِ پنل = دیده‌شدن؛ نشانِ سبز/قرمز پاک می‌شود
  /* ⚠ ترتیب مهم است: اول محتوا و مختصات در حالتِ بسته ست می‌شود، بعد در فریمِ
     بعدی کلاسِ open می‌آید. اگر جای عنصر هم‌زمان با کلاس عوض شود، مرورگر گذار را
     از موقعیتِ قبلی شروع می‌کند و پنل به‌جای بازشدنِ نرم، از جای دیگری می‌پرد. */
  if(!_dlOpen){
    _dlOpen=false; dlRender();     // رندر در حالتِ بسته
    xferPlace();                   // جای درست پیش از شروعِ انیمیشن
    var host=document.getElementById("dlCenter");
    if(host) void host.offsetWidth; // اعمالِ فوریِ حالتِ اولیه (reflow)
  }
  _dlOpen=true;
  dlRender();
  xferPlace();
  document.removeEventListener("click", xferOutside, true);
  setTimeout(function(){ document.addEventListener("click", xferOutside, true); }, 0);
}
window.addEventListener("resize", function(){ if(_dlOpen) xferPlace(); });
window.addEventListener("scroll", function(){ if(_dlOpen) xferPlace(); }, true);
function xferClose(){
  _dlOpen=false; dlRender();
  document.removeEventListener("click", xferOutside, true);
}
function xferOutside(e){
  // کلیکِ ساختگیِ تحویلِ فایل به مرورگر، نه کلیکِ کاربر → پنل نباید بسته شود
  if(e.target && e.target.dataset && e.target.dataset.dlInternal) return;
  var wrap=document.getElementById("xferWrap");
  if(wrap && wrap.contains(e.target)) return;   // کلیک روی دکمهٔ هدر → باز بماند
  /* ⚠ پنل فرزندِ body است نه xferWrap، پس باید جداگانه بررسی شود؛ وگرنه کلیک روی
     دکمه‌های داخلِ خودِ پنل (تلاشِ دوباره، حذف، پاک‌کردن) آن را می‌بست. */
  var host=document.getElementById("dlCenter");
  if(host && host.contains(e.target)) return;
  xferClose();
}
function dlRedownload(id){ var j=_dlById(id); if(j && j.blobUrl) dlHandOff(j); }
function dlRetry(id){ var j=_dlById(id); if(!j) return; j.status="queued"; j.pct=0; j.msg=""; dlRender(); dlPump(); }
function dlRemove(id){
  var j=_dlById(id);
  if(j && j.blobUrl){ try{ URL.revokeObjectURL(j.blobUrl); }catch(e){} }
  _dlJobs=_dlJobs.filter(function(x){ return x.id!==id; });
  dlRender();
}
function dlClearDone(){
  _dlJobs.forEach(function(j){ if(j.status==="done" && j.blobUrl){ try{ URL.revokeObjectURL(j.blobUrl); }catch(e){} } });
  _dlJobs=_dlJobs.filter(function(j){ return j.status!=="done"; });
  dlRender();
}

/* ---------- آیکون‌ها ---------- */
var DL_IC = {
  center:'<svg viewBox="0 0 24 24"><polyline points="4 8 8 4 12 8"/><line x1="8" y1="4" x2="8" y2="20"/><polyline points="12 16 16 20 20 16"/><line x1="16" y1="20" x2="16" y2="4"/></svg>',
  dl:'<svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
  retry:'<svg viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>',
  x:'<svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  up:'<svg viewBox="0 0 24 24"><polyline points="18 15 12 9 6 15"/></svg>',
  down:'<svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>',
  up_badge:'<svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>'
};
function dlFileIcon(j){
  var m=String(j.mimeType||"").toLowerCase(), n=String(j.name||j.label||"").toLowerCase();
  if(m.indexOf("image/")===0)
    return '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
  if(/^model\//.test(m) || /\.(glb|gltf)$/.test(n))
    return '<svg viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>';
  // پیش‌فرض: سند
  return '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
}
