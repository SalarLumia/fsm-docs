/* ================= فرم ثبت سند ================= */
function fillPartSelect(scope){
  var el=document.getElementById("nPart");
  if(scope==="project"){
    el.innerHTML='<option value="00">00 — سند پروژه</option>'; el.value="00"; el.disabled=true;
    document.getElementById("partHint").textContent="این نوع سند سطح پروژه است؛ قطعه روی 00 قفل شد.";
  }else{
    el.disabled=false;
    el.innerHTML='<option value="">— قطعه —</option>'+partsSorted().map(function(p){return opt(pad2(p.partNo), pad2(p.partNo)+" — "+p.name);}).join("")+addNewOpt("افزودن قطعهٔ جدید…");
    document.getElementById("partHint").textContent="";
  }
}
function onTypeChange(){ if(onAddNewSelect("nType")) return;
  // نوعِ 3D فایلِ مدل می‌گیرد؛ انتخاب‌گرِ فایل باید .glb/.gltf را هم نشان دهد
  var T=String(nType.value||"").toUpperCase(), fi=document.getElementById("nFile");
  if(fi) fi.accept = (T==="3D") ? ".glb,.gltf" : ".pdf,image/*";
  fillPartSelect(typeScope(nType.value)); updatePreview(); }

/* گزینهٔ «افزودن مورد جدید» در سلکت‌ها.
   مشتری/سفارش/پروژه به‌صورت مودالِ روی‌هم باز می‌شوند تا پنل ثبت‌سند بسته نشود؛
   قطعه/نوع سند (فهرست ثابت سطح‌سیستم) به «تنظیمات» می‌روند و پنل بسته می‌شود. */
function onAddNewSelect(id){
  var el=document.getElementById(id); if(!el || el.value!=="__ADD__") return false;
  el.value=""; // بازگردانی تا روی «افزودن» نماند
  if(id==="nClient"){ cpOpenClientModal(""); }
  else if(id==="nOrder"){
    if(nClient.value){ _cp.client=nClient.value; cpOpenOrderModal(""); }
    else toast("ابتدا مشتری را انتخاب کنید.",true);
  }
  else if(id==="nProject"){
    if(nClient.value && nOrder.value){ _cp.client=nClient.value; _cp.order=pad2(nOrder.value); cpOpenProjectModal(""); }
    else toast("ابتدا مشتری و سفارش را انتخاب کنید.",true);
  }
  else if(id==="nPart"){ toast("برای افزودن قطعهٔ جدید، از منوی «تنظیمات» اقدام کنید.",true); }
  else if(id==="nType"){ toast("برای افزودن نوع سند جدید، از منوی «تنظیمات» اقدام کنید.",true); }
  return true;
}
/* آیا پنل ثبت سند اکنون باز است؟ (برای همگام‌سازی خودکار سلکت‌ها پس از افزودن سفارش/پروژه) */
function newDocOpen(){ var m=document.getElementById("newDocModal"); return !!(m && !m.classList.contains("hidden")); }

["nProject","nPart","nRev"].forEach(function(id){ document.addEventListener("input",function(e){ if(e.target.id===id) {fetchRevIfReady(id); updatePreview();} }); });
document.addEventListener("change",function(e){ if(["nProject","nPart","nType"].indexOf(e.target.id)>=0){ if(onAddNewSelect(e.target.id)) return; fetchRevIfReady(e.target.id); updatePreview(); } });

function fetchRevIfReady(changedId){
  if(changedId==="nRev") return; // ریویژن خودکار مدیریت می‌شود
  var c=nClient.value,o=nOrder.value,pr=nProject.value,pt=nPart.value,ty=nType.value;
  if(c&&o&&pr&&pt&&ty){
    document.getElementById("nRev").value=computeNextRev(c,o,pr,pt,ty);
    updatePreview();
  }
  updateRevMode();
}

/* مدیریت خودکار ریویژن در پنل ثبت سند:
   - سند جدید (ریویژن 00): باکس «عنوان/توضیح».
   - ریویژنِ جدیدِ مجاز (ریویژن فعلی تأییدشده): پیام + جایگزینی باکس با «توضیحات این ریویژن».
   - مسدود (ریویژن فعلی تأیید نشده): هشدار + غیرفعال‌کردن دکمهٔ ثبت. */
var _newDocBlocked=false;
function updateRevMode(){
  var banner=document.getElementById("nRevBanner");
  var titleLabel=document.getElementById("nTitleLabel");
  var titleInp=document.getElementById("nTitle");
  var submitBtn=document.getElementById("nSubmitBtn");
  var c=nClient.value,o=nOrder.value,pr=nProject.value,pt=nPart.value,ty=nType.value;
  function noteAsNote(){ // یادداشت عادیِ سند
    if(titleLabel) titleLabel.textContent="یادداشت مربوط به این سند / نقشه";
    if(titleInp) titleInp.placeholder="یادداشت یا توضیح دربارهٔ این سند…";
  }
  function reset(){
    if(banner){ banner.hidden=true; banner.className="nrev-banner"; banner.innerHTML=""; }
    noteAsNote();
    if(submitBtn) submitBtn.disabled=false;
    _newDocBlocked=false;
  }
  if(!(c&&o&&pr&&pt&&ty)){ reset(); return; }
  var rs=revState(c,o,pr,pt,ty);
  if(rs.mode==="new"){ reset(); return; }
  if(rs.mode==="revision"){
    if(banner){ banner.hidden=false; banner.className="nrev-banner info";
      banner.innerHTML='ریویژن فعلی این سند («'+esc(revFmt(rs.maxRev))+'») تأیید شده است؛ این ثبت می‌شود <b>ریویژن '+esc(rs.nextRev)+'</b>.'; }
    if(titleLabel) titleLabel.textContent="توضیحات مربوط به تغییرات این ریویژن";
    if(titleInp) titleInp.placeholder="تغییرات و دلیل این ریویژن را بنویسید…";
    if(submitBtn) submitBtn.disabled=false;
    _newDocBlocked=false;
  } else { // blocked
    var si=statusInfo(rs.latest&&rs.latest.status);
    if(banner){ banner.hidden=false; banner.className="nrev-banner warn";
      banner.innerHTML='ریویژن فعلی این سند («'+esc(revFmt(rs.maxRev))+'») هنوز تأیید نشده (وضعیت: '+esc(si.label)+'). '+
        'برای ثبت ریویژن جدید ابتدا باید ریویژن فعلی تأیید شود.'; }
    noteAsNote();
    if(submitBtn) submitBtn.disabled=true;
    _newDocBlocked=true;
  }
}
/* شمارهٔ ریویژن پیشنهادی از روی داده‌های محلی:
   اولین ریویژن این سند ۰۰، دومی ۰۱ و… (بدون رفت‌وبرگشت به سرور). */
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
  var c=(nClient.value||"").toUpperCase(),o=pad2(nOrder.value),pr=pad2(nProject.value),pt=pad2(nPart.value),ty=(nType.value||"").toUpperCase(),rv=revFmt(nRev.value);
  if(!c||!o||!pr||!pt||!ty||rv==="") return null;
  return ["FSM",c,o,pr,pt,ty,rv].join("-");
}
function updatePreview(){
  var n=currentNumber(); var box=document.getElementById("nPreviewBox"), el=document.getElementById("nPreview");
  var copyBtn=document.getElementById("nCopyBtn");
  if(n){ el.textContent=n; el.classList.remove("muted"); box.classList.remove("invalid"); if(copyBtn) copyBtn.hidden=false; }
  else { el.textContent="منتظر تکمیل اطلاعات…"; box.classList.add("invalid"); if(copyBtn) copyBtn.hidden=true; }
}
/* کپی شمارهٔ سند تولیدشده در کلیپ‌بورد */
function copyDocNumber(){
  var n=currentNumber(); if(!n){ toast("ابتدا اطلاعات را کامل کن.",true); return; }
  var done=function(){
    var b=document.getElementById("nCopyBtn");
    if(b && !b._busy){ b._busy=true; var html=b.innerHTML; b.classList.add("ok"); b.innerHTML='<svg class="ic" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>کپی شد';
      setTimeout(function(){ b.innerHTML=html; b.classList.remove("ok"); b._busy=false; },1500); }
    toast("شماره سند کپی شد");
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
  if(!n){ toast("ابتدا همهٔ فیلدها را کامل کن.",true); return; }
  // بارگذاری فایل الزامی است — سند بدون فایل ناقص است
  var f=document.getElementById("nFile").files[0];
  if(!f){ toast("بارگذاری فایل سند الزامی است.",true); return; }
  if(f.size>25*1024*1024){ toast("حجم فایل بیش از ۲۵ مگابایت است.",true); return; }
  var payload={ clientCode:nClient.value, orderNo:nOrder.value, projectNo:nProject.value,
    partNo:nPart.value, typeCode:nType.value, rev:nRev.value, title:nTitle.value };
  payload.fileBase64=await fileToBase64(f); payload.fileName=f.name; payload.mimeType=f.type;
  toast("در حال ثبت…");
  var r=await api("createDocument",payload);
  if(!r.ok){ toast(r.message||"ثبت ناموفق بود.",true); return; }
  toast("ثبت شد: "+r.drawingNumber);
  await refreshDocuments();
  // ریست بخشی
  document.getElementById("nFile").value=""; document.getElementById("nTitle").value="";
  onFilePicked();
  fetchRevIfReady("nType");
  closeNewDocModal();
  // پاپ‌آپ: ارسال برای بازبینی؟ (برای پیش‌بردن سریع‌ترِ روند)
  if(await uiConfirm("این سند برای بازبینی ارسال شود؟",{okLabel:"ارسال"})){
    var sr=await api("submitForReview",{drawingNumber:r.drawingNumber});
    if(sr.ok){ toast("برای بازبینی ارسال شد"); await refreshDocuments(); }
    else toast(sr.message||"ارسال ناموفق",true);
  }
}

/* ================= مودال ثبت سند (پاپ‌آپ) ================= */
function openNewDocModal(){
  if(ME.role!=="admin"){ toast("فقط مدیر می‌تواند سند ثبت کند.",true); return; }
  var m=document.getElementById("newDocModal"); if(!m) return;
  m.classList.remove("hidden");
  document.body.classList.add("modal-open");
  var f=document.getElementById("nClient"); if(f) try{ f.focus(); }catch(e){}
  updateRevMode();
}
function closeNewDocModal(){
  var m=document.getElementById("newDocModal"); if(m) m.classList.add("hidden");
  document.body.classList.remove("modal-open");
}
document.addEventListener("keydown",function(e){
  if(e.key!=="Escape") return;
  var m=document.getElementById("newDocModal");
  if(m && !m.classList.contains("hidden")) closeNewDocModal();
});

/* ================= درگ‌ودراپ فایل ================= */
function onFilePicked(){
  var inp=document.getElementById("nFile"), lbl=document.getElementById("nFileName"), zone=document.getElementById("nDrop");
  if(!inp||!lbl||!zone) return;
  var f=inp.files&&inp.files[0];
  if(f){ lbl.textContent="✓ "+f.name; lbl.hidden=false; zone.classList.add("has-file"); }
  else { lbl.textContent=""; lbl.hidden=true; zone.classList.remove("has-file"); }
}
(function initDropzone(){
  var zone=document.getElementById("nDrop"), inp=document.getElementById("nFile");
  if(!zone||!inp) return;
  var depth=0;
  zone.addEventListener("dragenter",function(e){ e.preventDefault(); depth++; zone.classList.add("drag"); });
  zone.addEventListener("dragover",function(e){ e.preventDefault(); if(e.dataTransfer) e.dataTransfer.dropEffect="copy"; });
  zone.addEventListener("dragleave",function(e){ e.preventDefault(); depth=Math.max(0,depth-1); if(depth===0) zone.classList.remove("drag"); });
  zone.addEventListener("drop",function(e){
    e.preventDefault(); depth=0; zone.classList.remove("drag");
    var files=e.dataTransfer&&e.dataTransfer.files; if(!files||!files.length) return;
    var f=files[0];
    var ok=/^image\//.test(f.type)||/pdf$/i.test(f.type)||/\.(pdf|glb|gltf)$/i.test(f.name);
    if(!ok){ toast("فقط فایل PDF، تصویر یا مدلِ سه‌بعدی (‎.glb/.gltf) مجاز است.",true); return; }
    try{ var dt=new DataTransfer(); dt.items.add(f); inp.files=dt.files; }
    catch(err){ toast("مرورگر شما از رهاکردن فایل پشتیبانی نمی‌کند؛ از دکمهٔ انتخاب استفاده کنید.",true); return; }
    onFilePicked();
  });
})();

async function refreshDocuments(){
  var r=await api("bootstrap",{});
  if(!r.ok){ return; }
  DB.clients=r.clients||[]; DB.orders=r.orders||[]; DB.projects=r.projects||[];
  DB.parts=r.parts||[]; DB.docTypes=r.docTypes||[]; DB.documents=r.documents||[];
  DB.templates=r.templates||[]; DB.workflow=r.workflow||[]; DB.partMods=r.partMods||[];
  if(r.users&&r.users.length) DB.users=r.users;
  refreshAllSelects();
  renderArchive(); renderDataTables(); renderDashboard();
  if(!document.getElementById("tab-project").classList.contains("hidden")) rerenderProjectTab();
}
