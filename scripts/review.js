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
  document.getElementById("reviewQueueCount").textContent=pend.length?(pend.length+" مورد"):"";
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
