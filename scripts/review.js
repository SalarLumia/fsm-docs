/* ================= گردش تأیید ================= */
async function submitReview(num){
  var r=await api("submitForReview",{drawingNumber:num});
  if(r.ok){ toast("برای بازبینی ارسال شد"); closeModal(); await refreshDocuments(); }
  else toast(r.message||"خطا",true);
}
async function approveDoc(num){
  if(!(await uiConfirm("تأیید سند «"+num+"»؟",{okLabel:"تأیید"}))) return;
  var r=await api("approveDocument",{drawingNumber:num});
  if(r.ok){ toast("سند تأیید شد"); closeModal(); await refreshDocuments(); }
  else toast(r.message||"خطا",true);
}
/* رد سند: مودال با باکس دلیل (اختیاری) */
function rejectDoc(num){
  var body='<div class="rej-box">'+
    '<p class="rej-lead">رد سند <span class="mono" style="direction:ltr">'+esc(num)+'</span></p>'+
    '<label class="fld">دلیل رد (اختیاری)</label>'+
    '<textarea id="rejReason" class="rej-ta" rows="3" placeholder="در صورت تمایل، دلیل رد را بنویسید تا ثبت‌کننده آن را ببیند…"></textarea>'+
    '<div class="rej-acts"><button class="btn" onclick="closeModal()">انصراف</button>'+
      '<button class="btn danger" onclick="confirmReject(\''+esc(num)+'\')">رد سند</button></div>'+
  '</div>';
  showModal("رد سند", body, "box-narrow");
  var t=document.getElementById("rejReason"); if(t) try{ t.focus(); }catch(e){}
}
async function confirmReject(num){
  var ta=document.getElementById("rejReason");
  var reason=ta?String(ta.value).trim():"";
  var r=await api("rejectDocument",{drawingNumber:num, comment:reason});
  if(r.ok){ toast("سند رد شد"); closeModal(); await refreshDocuments(); }
  else toast(r.message||"خطا",true);
}

/* یک ردیف کارتابل بازبینی (مشترک بین داشبورد و پنجرهٔ «مشاهدهٔ همه») */
function reviewItemHTML(d, canAct, withDot){
  return '<div class="rq-item">'+
    (withDot?'<div class="rq-marker"><div class="tl-dot"></div><div class="rq-line"></div></div>':'')+   // دایرهٔ متحرک + خط، فقط در مودالِ بازشده
    '<div class="rq-main"><div class="rq-num mono" onclick="openDocDetail(\''+esc(d.drawingNumber)+'\')">'+esc(d.drawingNumber)+'</div>'+
    '<div class="rq-meta">'+esc(docPhrase(d))+'</div></div>'+
    '<div class="rq-actions">'+
      viewIconBtn("openDocDetail('"+esc(d.drawingNumber)+"')")+
      (canAct?approveIconBtn("approveDoc('"+esc(d.drawingNumber)+"')"):'')+
      (canAct?rejectIconBtn("rejectDoc('"+esc(d.drawingNumber)+"')"):'')+
    '</div></div>';
}

/* کارتابل بازبینی روی داشبورد (برای بازبین و مدیر) — حداکثر ۳ مورد + «مشاهدهٔ همه» */
function renderReviewQueue(){
  var section=document.getElementById("reviewQueueSection");
  var host=document.getElementById("reviewQueueList"); if(!host||!section) return;
  if(ME.role!=="admin" && ME.role!=="reviewer") return; // بیننده: بخش با applyRoleVisibility مخفی است
  var pend=pendingDocs();
  var seeAll=document.getElementById("reviewSeeAll");
  // مدیرِ بدون مورد: بخش را پنهان کن تا داشبورد شلوغ نشود (بازبین همیشه می‌بیند)
  if(!pend.length && ME.role==="admin"){ section.style.display="none"; return; }
  section.style.display="";
  document.getElementById("reviewQueueCount").textContent=pend.length?(faN(pend.length)+" مورد"):"";
  if(seeAll) seeAll.hidden = pend.length<=3;   // دکمه فقط وقتی موردِ نهفته هست
  if(!pend.length){
    host.innerHTML=emptyState("موردی برای بازبینی نیست","اسنادی که مدیر برای بازبینی ارسال کند، اینجا برای تأیید یا رد نمایش داده می‌شوند.");
    return;
  }
  var canAct = (ME.role==="admin"||ME.role==="reviewer");
  host.innerHTML='<div class="rq-list">'+pend.slice(0,3).map(function(d){ return reviewItemHTML(d,canAct); }).join("")+'</div>';
}

/* پنجرهٔ کاملِ کارتابل بازبینی — همهٔ موارد، قابل اسکرول */
function openReviewAllModal(){
  var pend=pendingDocs();
  var canAct = (ME.role==="admin"||ME.role==="reviewer");
  var inner = pend.length
    ? '<div class="rq-list">'+pend.map(function(d){ return reviewItemHTML(d,canAct,true); }).join("")+'</div>'
    : emptyState("موردی برای بازبینی نیست","همهٔ اسناد بررسی شده‌اند.");
  showModal("کارتابل بازبینی", '<div class="seeall-body">'+inner+'</div>', "seeall-box");
  if(typeof revealCascade==="function") revealCascade(document.querySelector("#modalHost .rq-list"));   // ورودِ آبشاریِ ردیف‌ها، هم‌سبک با سایت
}

/* ================= بارگذاریِ نسخهٔ جدید هنگامی که سند هنوز در حالِ بازبینی است =================
   دکمهٔ «بارگذاریِ نسخهٔ جدید» در پنلِ جزئیات برای وضعیتِ pending غیرفعال (خاکستری) است؛ کلیک روی آن
   این پیام را باز می‌کند: راهنما + میان‌بر به کارتابلِ بازبینیِ «فقط همین یک سند» (نه کلِ صف). */
function pendingUploadNotice(num){
  var body='<div class="confirm-box">'+
    '<p class="confirm-msg">آخرین نسخه از این سند هنوز در مرحلهٔ بازبینی است و تأیید وضعیت نشده است. برای بارگذاریِ نسخهٔ جدید، ابتدا وضعیت نسخهٔ فعلی را مشخص نمایید.</p>'+
    '<div class="confirm-acts">'+
      '<button class="btn" data-v="0">انصراف</button>'+
      '<button class="btn primary" data-v="1">بازبینی</button>'+
    '</div>'+
  '</div>';
  var wrap=document.createElement("div");
  wrap.className="modal confirm-modal";
  wrap.innerHTML='<div class="box confirm-mbox">'+
    '<header><strong>در انتظارِ بازبینی</strong><button class="modal-x" data-v="0" aria-label="بستن" title="بستن">✕</button></header>'+
    '<div class="body">'+body+'</div></div>';
  document.body.appendChild(wrap);
  var close=function(){ if(wrap.parentNode) wrap.parentNode.removeChild(wrap); };
  var btns=wrap.querySelectorAll("[data-v]");
  for(var i=0;i<btns.length;i++){ (function(b){ b.addEventListener("click",function(){
    var open=b.getAttribute("data-v")==="1"; close(); if(open) openSingleReviewTray(num);
  }); })(btns[i]); }
  wrap.addEventListener("click",function(e){ if(e.target===wrap) close(); });
}

/* کارتابلِ بازبینیِ «تک‌رکوردی»: همان ظاهرِ کارتابلِ کامل، ولی فقط سندی که از پنلِ جزئیات صدا زده شده،
   و در یک لایهٔ بالاترِ z-index تا روی پنلِ جزئیاتِ باز بنشیند (پنل زیرش دست‌نخورده می‌ماند).
   اکشن‌های تأیید/رد اینجا مستقل از approveDoc/rejectDoc هستند (آن‌ها #modalHost یعنی خودِ پنلِ
   جزئیاتِ زیرین را می‌بندند)؛ نسخهٔ این‌جا فقط همین تری را می‌بندد و بعد پنلِ جزئیات را با
   وضعیتِ تازه دوباره می‌سازد. */
function openSingleReviewTray(num){
  var d=docByNumber(num); if(!d){ toast("سند یافت نشد.",true); return; }
  var canAct = (ME.role==="admin"||ME.role==="reviewer");
  var actsHTML = canAct
    ? viewIconBtn("openDocDetail('"+esc(num)+"')")+
      approveIconBtn("srtApprove('"+esc(num)+"')")+
      rejectIconBtn("srtReject('"+esc(num)+"')")
    : viewIconBtn("openDocDetail('"+esc(num)+"')");
  var row='<div class="rq-item">'+
    '<div class="rq-marker"><div class="tl-dot"></div><div class="rq-line"></div></div>'+
    '<div class="rq-main"><div class="rq-num mono">'+esc(num)+'</div>'+
    '<div class="rq-meta">'+esc(docPhrase(d))+'</div></div>'+
    '<div class="rq-actions">'+actsHTML+'</div></div>';
  var wrap=document.createElement("div");
  wrap.className="modal single-review-modal";
  wrap.id="srtHost";
  wrap.innerHTML='<div class="box seeall-box single-review-box">'+
    '<header><strong>کارتابل بازبینی</strong><button class="modal-x" onclick="srtClose()" aria-label="بستن" title="بستن">✕</button></header>'+
    '<div class="body"><div class="seeall-body"><div class="rq-list">'+row+'</div></div></div></div>';
  document.body.appendChild(wrap);
  wrap.addEventListener("click",function(e){ if(e.target===wrap) srtClose(); });
}
function srtClose(){ var w=document.getElementById("srtHost"); if(w&&w.parentNode) w.parentNode.removeChild(w); }
async function srtApprove(num){
  if(!(await uiConfirm("تأیید سند «"+num+"»؟",{okLabel:"تأیید"}))) return;
  var r=await api("approveDocument",{drawingNumber:num});
  if(!r.ok){ toast(r.message||"خطا",true); return; }
  toast("سند تأیید شد"); srtClose(); await refreshDocuments();
  if(typeof openDocDetail==="function") openDocDetail(num);
}
function srtReject(num){
  var body='<div class="rej-box">'+
    '<p class="rej-lead">رد سند <span class="mono" style="direction:ltr">'+esc(num)+'</span></p>'+
    '<label class="fld">دلیل رد (اختیاری)</label>'+
    '<textarea id="srtRejReason" class="rej-ta" rows="3" placeholder="در صورت تمایل، دلیل رد را بنویسید تا ثبت‌کننده آن را ببیند…"></textarea>'+
    '<div class="rej-acts"><button class="btn" data-v="0">انصراف</button>'+
      '<button class="btn danger" data-v="1">رد سند</button></div>'+
  '</div>';
  var wrap=document.createElement("div");
  wrap.className="modal confirm-modal";
  wrap.id="srtRejHost";
  wrap.innerHTML='<div class="box box-narrow"><header><strong>رد سند</strong>'+
    '<button class="modal-x" data-v="0" aria-label="بستن" title="بستن">✕</button></header>'+
    '<div class="body">'+body+'</div></div>';
  document.body.appendChild(wrap);
  var close=function(){ if(wrap.parentNode) wrap.parentNode.removeChild(wrap); };
  var btns=wrap.querySelectorAll("[data-v]");
  for(var i=0;i<btns.length;i++){ (function(b){ b.addEventListener("click",function(){
    var ok=b.getAttribute("data-v")==="1"; close(); if(ok) srtConfirmReject(num);
  }); })(btns[i]); }
  wrap.addEventListener("click",function(e){ if(e.target===wrap) close(); });
  var t=document.getElementById("srtRejReason"); if(t) try{ t.focus(); }catch(e){}
}
async function srtConfirmReject(num){
  var ta=document.getElementById("srtRejReason");
  var reason=ta?String(ta.value).trim():"";
  var r=await api("rejectDocument",{drawingNumber:num, comment:reason});
  if(!r.ok){ toast(r.message||"خطا",true); return; }
  toast("سند رد شد"); srtClose(); await refreshDocuments();
  if(typeof openDocDetail==="function") openDocDetail(num);
}
