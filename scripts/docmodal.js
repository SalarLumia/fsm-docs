/* ================= مودال جزئیات سند ================= */
/* وضعیت ریویژن انتخاب‌شده در مودال (برای پیش‌نمایش و دانلود) */
var _dm = { num:"", selNum:"" };

/* شمارندهٔ بارگذاریِ پیش‌نمایش + برآوردگرِ نوارِ پیشرفتِ فعال.
   بدونِ این، اگر پیش‌نمایشی پیش از تکمیل بسته و پیش‌نمایشِ تازه‌ای باز شود، تایمرِ برآوردگرِ قبلی
   (که هنوز داخلِ await است و متوقف نشده) روی همان id=docPreviewHost می‌نویسد و عددِ درصد با نمونهٔ
   جدید «قاطی» می‌شود. هر بارگذاریِ نو، توکن را جلو می‌برد و برآوردگرِ قبلی را متوقف می‌کند. */
var _dpSeq = 0, _dpEst = null;
function _dpStopPreview(){ _dpSeq++; if(_dpEst){ _dpEst.stop(); _dpEst=null; } }

async function openDocDetail(num){
  var d=docByNumber(num);
  if(!d){
    // سندِ حذف‌شده هنوز در سطلِ زباله است؛ پیام باید همین را بگوید، نه «یافت نشد»
    if(trashedDocByNumber(num)) toast("این سند حذف شده و در سطلِ زباله است.",true);
    else toast("سند یافت نشد.",true);
    return;
  }
  var si=statusInfo(d.status);
  _dm.num=num; _dm.selNum=num;

  /* ---------- مشخصات سند: فقط نام‌های متنی (بدون کد) ---------- */
  var meta=[
    ["شماره سند", '<span class="mono" style="direction:ltr">'+esc(d.drawingNumber)+'</span>'],
    ["مشتری", esc(clientName(d.clientCode))],
    // برچسبِ ردیف خودش «پروژه» است؛ پس مقدار باید نامِ خالص باشد، نه عنوانِ پیشونددار
    ["پروژه", esc(projectName(d)||("شمارهٔ "+pad2(d.projectNo)))],
    ["قطعه", esc(partName(d.partNo))],
    ["نوع سند", esc(typeName(d.typeCode))],
    ["ثبت‌کننده", esc(userName(d.uploadedBy)||"—")],
    ["تاریخ ثبت", fmtTimeDate(d.timestamp)]
  ];
  // سطرِ «بازبین» حذف شد؛ اطلاعاتِ کاملِ بازبینی در سکشنِ گردش‌کار (تاریخچهٔ سند) نمایش داده می‌شود.
  var metaHTML=meta.map(function(m){return '<div class="dm-row"><span class="dm-k">'+m[0]+'</span><span class="dm-v">'+m[1]+'</span></div>';}).join("");

  /* بنرِ رد: بینِ سکشنِ مشخصات و تاریخچه؛ هم‌سبکِ ردیف‌های مشخصات (dm-row/dm-k/dm-v) با نقطهٔ قرمزِ پالس‌دار
     پیشِ تیتر (هم‌الگوی نقطهٔ فعالیتِ اخیرِ داشبورد) به‌جای بنرِ توپُرِ قبلی. */
  /* هشدارِ «نسخهٔ جدیدتر»: وقتی کاربر با اسکنِ QRِ یک نقشهٔ کاغذی وارد می‌شود، ممکن است
     کاغذِ دستش قدیمی باشد. اگر ویرایشِ تأییدشدهٔ جدیدتری هست، همین‌جا اعلام می‌شود تا
     کسی با نقشهٔ منسوخ قطعه نسازد. */
  var newerBanner=dmNewerRevBanner(d);

  var rejBanner = (String(d.status||"").toLowerCase()==="rejected")
    ? '<div class="dm-reject">'+
        '<div class="dm-reject-t"><span class="dm-reject-dot"></span>این سند نیاز به اعمال تغییرات دارد.</div>'+
        '<div class="dm-reject-note">'+(d.reviewNote?esc(d.reviewNote):'دلیلی ثبت نشده است.')+'</div>'+
      '</div>'
    : '';

  /* ---------- تاریخچهٔ ریویژن‌ها (جدید به قدیم) ---------- */
  var revs=revisionsOf(d);
  var revHTML=revs.map(function(rv){ return versionRowHTML(rv); }).join("");

  /* ---------- اکشن اصلیِ متن‌محورِ بالای پنل (کنار دانلود) بر اساس وضعیت ریویژن فعلی ---------- */
  var cur=revs[0]||d, cst=String(cur.status||"").toLowerCase();
  var actionBtn="";
  if(ME.role==="admin"){
    if(cst==="draft") actionBtn='<button class="btn dm-act" onclick="submitReview(\''+esc(cur.drawingNumber)+'\')">'+ICON.send+'ارسال برای بازبینی</button>';
    else if(cst==="rejected") actionBtn='<button class="btn dm-act" onclick="startRevisionUpload(\''+esc(cur.drawingNumber)+'\')">'+ICON.upload+'بارگذاری نسخهٔ جدید</button>';
    else if(cst==="approved") actionBtn='<button class="btn dm-act" onclick="startRevisionUpload(\''+esc(cur.drawingNumber)+'\')">'+ICON.upload+'بارگذاری ریویژن جدید</button>';
    // در حالِ بازبینی: دکمه غیرفعال (خاکستری) — کلیک روی آن، پیامِ راهنما + میان‌بر به کارتابلِ بازبینیِ همین سند را باز می‌کند
    else if(cst==="pending") actionBtn='<button class="btn dm-act dm-act-disabled" onclick="pendingUploadNotice(\''+esc(cur.drawingNumber)+'\')">'+ICON.upload+'بارگذاری نسخهٔ جدید</button>';
  }

  var dlIcon='<svg viewBox="0 0 24 24" style="width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;margin-inline-end:5px;vertical-align:-3px"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
  var is3DType=String(d.typeCode).toUpperCase().indexOf("3D")===0;
  var dlBtnHTML = is3DType
    ? '<div class="dm-dl-wrap" id="dmDlWrap">'+
        '<div class="dm-dl-pop" id="dmDlPop"></div>'+
        '<button class="btn dm-dl dm-dl-incomplete" id="dpDownload" onclick="dmDownloadSelected()" disabled>'+dlIcon+'دانلود سند</button>'+
      '</div>'
    : '<button class="btn primary dm-dl" id="dpDownload" onclick="dmDownloadSelected()" disabled>'+dlIcon+'دانلود سند</button>';
  var body=''+
    '<div class="doc-modal">'+
      '<div class="doc-preview">'+
        '<div class="dp-frame" id="docPreviewHost"></div>'+
        '<div class="dp-actions">'+actionBtn+dlBtnHTML+'</div>'+
      '</div>'+
      '<div class="doc-side">'+
        newerBanner+
        '<div class="dm-sec"><div class="dm-sec-t"><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>مشخصات سند</div>'+metaHTML+'</div>'+
        rejBanner+
        '<div class="dm-sec"><div class="dm-sec-t"><svg viewBox="0 0 24 24"><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><polyline points="12 7 12 12 15 15"/></svg>تاریخچهٔ سند</div>'+
          '<div class="ver-list">'+revHTML+'</div></div>'+
        dmQrSectionHTML(d)+
      '</div>'+
    '</div>';
  showModal(esc(docPhrase(d)), body, "doc-box");

  /* ریویژن جاری را به‌صورت پیش‌فرض در پیش‌نمایش بارگذاری کن (بدون باز کردن گردش‌کار) */
  dmSelectVersion(num);
}

/* ═══ افزودنِ فرمتِ مکمل به سندِ سه‌بعدیِ موجود ═══
   دکمه فقط وقتی می‌آید که واقعاً کاری برای انجام باشد: سندِ سه‌بعدی، مدیر، و دست‌کم یکی از
   دو فرمتِ STP/USDZ جا افتاده باشد. اگر هر دو موجودند دکمه اصلاً ساخته نمی‌شود. */
function dmMissingFormats(d){
  var out=[];
  if(!String(d.stpFileId||"").trim())  out.push({kind:"stp",  label:"STP",  accept:".stp,.step", tag:"فرمتِ اصلی برای آرشیوِ اسناد"});
  if(!String(d.usdzFileId||"").trim()) out.push({kind:"usdz", label:"USDZ", accept:".usdz",      tag:"برای نمایشِ واقعیتِ افزوده در iOS"});
  return out;
}
function dmAddFormatBtnHTML(d, is3DType){
  if(!is3DType || ME.role!=="admin" || !d) return "";
  if(!dmMissingFormats(d).length) return "";
  return '<button class="btn dm-act" onclick="openAddFormatModal(\''+esc(d.drawingNumber)+'\')">'+ICON.plus+'افزودن فرمت</button>';
}
var _af={ num:"", kind:"", file:null };
function openAddFormatModal(num){
  var d=docByNumber(num); if(!d){ toast("سند یافت نشد.",true); return; }
  var miss=dmMissingFormats(d);
  if(!miss.length){ toast("همهٔ فرمت‌ها از قبل ثبت شده‌اند.",true); return; }
  _af={ num:num, kind:miss[0].kind, file:null };
  var tabs = miss.length>1
    ? '<div class="af-tabs">'+miss.map(function(m,i){
        return '<button type="button" class="af-tab'+(i===0?' on':'')+'" data-kind="'+m.kind+'" onclick="afPickKind(\''+m.kind+'\')">'+esc(m.label)+'</button>';
      }).join("")+'</div>'
    : '';
  var zones = miss.map(function(m,i){
    return '<div class="af-zone" data-kind="'+m.kind+'"'+(i===0?'':' hidden')+'>'+
      rvDropzoneHTML("afDrop_"+m.kind,"afFile_"+m.kind,m.accept,"فایل "+m.label,m.tag)+'</div>';
  }).join("");
  showModal("افزودنِ فرمت به سند",
    '<div class="rv-up">'+
      '<div class="rv-num mono" style="direction:ltr">'+esc(num)+'</div>'+
      '<p class="rv-lead">فایلِ تکمیلی به همین سند افزوده می‌شود؛ '+
        'شمارهٔ سند و ویرایش تغییر نمی‌کند و سند دوباره به بازبینی نمی‌رود.</p>'+
      tabs+zones+
      '<div class="lg-note" style="margin-top:14px"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'+
        '<span>اگر خودِ طراحی تغییر کرده، به‌جای این کار ریویژنِ جدید بسازید.</span></div>'+
      '<div class="clm-actions"><button class="btn" onclick="closeModal()">انصراف</button>'+
        '<button class="btn primary" id="afSave" onclick="submitAddFormat()">'+ICON.plus+'افزودن</button></div>'+
    '</div>', "box-narrow");
  miss.forEach(function(m){ rvInitDrop("afDrop_"+m.kind,"afFile_"+m.kind); });
}
function afPickKind(kind){
  _af.kind=kind; _af.file=null;
  [].forEach.call(document.querySelectorAll(".af-tab"), function(b){ b.classList.toggle("on", b.getAttribute("data-kind")===kind); });
  [].forEach.call(document.querySelectorAll(".af-zone"), function(z){ z.hidden = z.getAttribute("data-kind")!==kind; });
}
async function submitAddFormat(){
  var inp=document.getElementById("afFile_"+_af.kind);
  var f=inp&&inp.files&&inp.files[0];
  if(!f){ toast("فایلی انتخاب نشده است.",true); return; }
  if(f.size>25*1024*1024){ toast("حجم فایل بیش از ۲۵ مگابایت است.",true); return; }
  var b64=await fileToBase64(f);
  var num=_af.num, kind=_af.kind;
  /* مثلِ بقیهٔ آپلودها از «مرکزِ انتقال» عبور می‌کند تا رابط قفل نشود و پیشرفت دیده شود.
     ⚙ برخلافِ ریویژن، عمداً submitForReview صدا زده نمی‌شود: سند تأییدشده می‌ماند. */
  closeModal();
  dlEnqueueUpload({
    label: num+" ‹ "+kind.toUpperCase(),
    action: "addFormat",
    payload: { drawingNumber:num, kind:kind, fileBase64:b64, fileName:f.name, mimeType:f.type },
    onSuccess: async function(r){
      if(!r || !r.ok){ toast((r&&r.message)||"افزودنِ فرمت ناموفق بود.",true); return; }
      toast("فرمتِ "+kind.toUpperCase()+" افزوده شد.");
      await refreshDocuments();
    }
  });
}
/* بنرِ «نسخهٔ جدیدتر موجود است».
   فقط وقتی نشان داده می‌شود که ویرایشِ *تأییدشدهٔ* جدیدتری وجود داشته باشد؛ پیش‌نویس یا
   در انتظارِ بازبینی هنوز مبنای ساخت نیست و اعلامش کاربر را گمراه می‌کند. */
function dmNewerRevBanner(d){
  var cur=parseInt(d.rev,10); if(isNaN(cur)) return "";
  var newer=revisionsOf(d).filter(function(rv){
    return (parseInt(rv.rev,10)||0)>cur && String(rv.status||"").toLowerCase()==="approved";
  }).sort(function(a,b){ return (parseInt(b.rev,10)||0)-(parseInt(a.rev,10)||0); })[0];
  if(!newer) return "";
  return '<div class="dm-newer">'+
    '<div class="dm-newer-t"><span class="dm-newer-dot"></span>ویرایشِ جدیدتری تأیید شده است</div>'+
    '<div class="dm-newer-note">این سند ویرایشِ '+faN(pad2(d.rev))+' است؛ ویرایشِ '+faN(pad2(newer.rev))+' تأیید شده. '+
      'اگر نقشهٔ چاپیِ همین ویرایش را در دست دارید، از نسخهٔ تأییدشده استفاده کنید.</div>'+
    '<button class="btn sm" onclick="openDocDetail(\''+esc(newer.drawingNumber)+'\')">مشاهدهٔ ویرایشِ '+faN(pad2(newer.rev))+'</button>'+
  '</div>';
}

/* ═══ بخشِ کدِ QR سند ═══
   کد به همان ویرایشی اشاره می‌کند که رویش چاپ می‌شود (شمارهٔ ویرایش انتهای شمارهٔ سند است)،
   پس نقشهٔ کاغذیِ دستِ پیمانکار همیشه نسخهٔ خودش را باز می‌کند — نه نسخه‌ای که بعداً آمده.
   اگر ویرایشِ تأییدشدهٔ جدیدتری وجود داشته باشد، خودِ سامانه پس از باز شدن به کاربر می‌گوید. */
function dmQrSectionHTML(d){
  var url=(typeof qrDocUrl==="function")?qrDocUrl(d.drawingNumber):"";
  if(!url) return "";
  var svg=(typeof qrSvg==="function")?qrSvg(url):"";
  if(!svg) return "";   // کتابخانهٔ QR نیامده — بخش اصلاً ساخته نمی‌شود
  return '<div class="dm-sec dm-qr-sec">'+
    '<div class="dm-sec-t"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><line x1="14" y1="14" x2="14" y2="21"/><line x1="18" y1="14" x2="18" y2="18"/><line x1="21" y1="18" x2="21" y2="21"/></svg>کدِ QR سند</div>'+
    '<div class="dm-qr-body">'+
      '<div class="dm-qr-img" id="dmQrImg">'+svg+'</div>'+
      '<div class="dm-qr-side">'+
        '<p class="dm-qr-note">برای درج کنارِ جدولِ مشخصاتِ نقشه. با اسکن، همین ویرایشِ سند در سامانه باز می‌شود.</p>'+
        '<button class="btn sm" onclick="dmDownloadQr(\''+esc(d.drawingNumber)+'\')">'+ICON.download+'دریافت تصویر</button>'+
      '</div>'+
    '</div></div>';
}
/* دانلودِ QR به‌صورت SVG — برداری است، پس در هر ابعادی روی نقشه چاپ شود لبه‌هایش تیز می‌ماند
   (تصویرِ نقطه‌ای در چاپِ بزرگ پله‌پله می‌شود و اسکنر را به زحمت می‌اندازد). */
function dmDownloadQr(num){
  var host=document.getElementById("dmQrImg");
  var svg=host?host.querySelector("svg"):null;
  if(!svg){ toast("تصویر آماده نیست.",true); return; }
  var src='<?xml version="1.0" encoding="UTF-8"?>\n'+
    svg.outerHTML.replace("<svg ",'<svg xmlns="http://www.w3.org/2000/svg" ');
  var blob=new Blob([src],{type:"image/svg+xml;charset=utf-8"});
  var a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download="QR-"+String(num||"doc")+".svg";
  a.dataset.dlInternal="1";   // کلیکِ ساختگی نباید پنلِ انتقال را ببندد
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function(){ try{ URL.revokeObjectURL(a.href); }catch(e){} }, 4000);
}

/* یک ردیف ریویژن در تاریخچه: سرِ فشرده + اکشن‌های کارت (فقط حذف/رد/تأیید) + گردش‌کارِ اکسپند‌شونده */
function versionRowHTML(rv){
  var admin=ME.role==="admin", canReview=(admin||ME.role==="reviewer");
  var st=String(rv.status||"").toLowerCase();
  var isCur=String(rv.isLatest).toLowerCase()==="true";
  var rsi=statusInfo(rv.status);
  var acts=[];
  if(canReview && st==="pending"){
    acts.push(approveIconBtn("event.stopPropagation();approveDoc('"+esc(rv.drawingNumber)+"')"));
    acts.push(rejectIconBtn("event.stopPropagation();rejectDoc('"+esc(rv.drawingNumber)+"')"));
  }
  if(admin) acts.push(delIconBtn("event.stopPropagation();dmDeleteVersion('"+esc(rv.drawingNumber)+"')"));

  // سرِ فشرده: شماره + وضعیت در راست؛ اکشن‌ها (تأیید/رد/حذف) + فلشِ اکسپند در چپ، همه در یک خط.
  // تاریخ/نام دیگر زیرِ نام نمی‌آید (در گردش‌کارِ اکسپند‌شونده هست) تا سلول جمع‌وجور بماند.
  return '<div class="ver-row'+(isCur?" cur":"")+'" id="ver-'+esc(rv.drawingNumber)+'" onclick="dmToggleRev(\''+esc(rv.drawingNumber)+'\')">'+
    '<div class="ver-head">'+
      '<span class="ver-rev mono">ریویژن '+esc(pad2(revFmt(rv.rev)))+'</span>'+   // شمارهٔ دو‌رقمی (۰۰/۰۱/…)
      badgeHTML(rsi.cls, rsi.label)+
      (rv.fileId?'':'<span class="muted" style="font-size:11px">بدون فایل</span>')+
      '<div class="ver-head-end">'+
        (acts.length?'<div class="ver-acts">'+acts.join("")+'</div>':'')+
        '<span class="ver-chev"><svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg></span>'+
      '</div>'+
    '</div>'+
    '<div class="ver-wf"><div class="ver-wf-in">'+                                  // wrapper برای انیمیشنِ باز/بسته‌شدن (grid 0fr→1fr)
      '<div class="ver-wf-sep"></div>'+                                            // خطِ جداکنندهٔ پیوسته زیرِ سرِ ریویژن
      (rv.title?'<div class="ver-note"><b>یادداشت:</b> '+esc(rv.title)+'</div>':'')+
      workflowStepsHTML(rv.drawingNumber)+
    '</div></div>'+
  '</div>';
}

/* تایم‌لاین گردش‌کارِ یک ریویژن: رویدادهای انجام‌شده (حلقهٔ پر) + مراحلِ آیندهٔ استاندارد (حلقهٔ توخالی) */
function workflowStepsHTML(num){
  var d=docByNumber(num); if(!d) return '';
  var status=String(d.status||"").toLowerCase();
  var steps=workflowOf(num).map(function(w){
    return {label:workflowActionLabel(w.action), color:wfDotColor(w.action), done:true,
            meta:(userName(w.user)||"")+(w.comment?(" · "+w.comment):""), date:fmtDate(w.timestamp)};
  });
  wfFutureSteps(status).forEach(function(a){ steps.push({label:wfFutureLabel(a), done:false, meta:"", date:""}); });
  if(!steps.length) return '<p class="muted" style="padding:6px 2px">رویدادی ثبت نشده.</p>';
  // آخرین مرحلهٔ انجام‌شده = «مرحلهٔ فعلی» → حلقهٔ شعاعیِ متحرک (مثلِ رکوردهای فعالیتِ اخیرِ داشبورد)
  var lastDone=-1; steps.forEach(function(s,i){ if(s.done) lastDone=i; }); if(lastDone>=0) steps[lastDone].active=true;
  return '<div class="wf-timeline">'+steps.map(function(s,i){
    var last=(i===steps.length-1);
    return '<div class="wf-step '+(s.done?"done":"todo")+(s.active?" active":"")+'">'+
      '<div class="wf-rail"><span class="wf-ring"'+((s.done&&s.color)?(' style="--wf:'+s.color+'"'):'')+'></span>'+(last?'':'<span class="wf-line"></span>')+'</div>'+
      '<div class="wf-body"><div class="wf-label">'+esc(s.label)+'</div>'+
        (s.meta?'<div class="wf-meta">'+esc(s.meta)+'</div>':'')+'</div>'+
      (s.date?'<div class="wf-date">'+esc(s.date)+'</div>':'')+
    '</div>';
  }).join("")+'</div>';
}

/* کلیک روی یک ریویژن: آکاردئون گردش‌کار (هر لحظه یکی باز).
   فایل فقط وقتی دوباره بارگذاری می‌شود که ریویژنِ دیگری (غیر از ریویژنِ در حال نمایش) انتخاب شود؛
   کلیک روی همان ریویژنِ فعلی صرفاً منوی گردش‌کار را باز/بسته می‌کند بدون دریافت دوبارهٔ فایل. */
function dmToggleRev(num){
  var row=document.getElementById("ver-"+num); if(!row) return;
  var willOpen=!row.classList.contains("open");
  var list=document.querySelectorAll(".ver-row"); for(var i=0;i<list.length;i++) list[i].classList.remove("open");
  if(willOpen) row.classList.add("open");
  if(num!==_dm.selNum) dmSelectVersion(num);
}

/* انتخاب یک ریویژن → پیش‌نمایش داخل صفحه + فعال‌کردن دانلود همان ریویژن */
async function dmSelectVersion(num){
  var d=docByNumber(num); if(!d) return;
  _dm.selNum=num;
  var myToken=++_dpSeq;                      // این بارگذاری؛ اگر بارگذاریِ تازه‌تری بیاید، این یکی باید بی‌سروصدا کنار برود
  if(_dpEst){ _dpEst.stop(); _dpEst=null; }  // برآوردگرِ پیش‌نمایشِ قبلی را متوقف کن تا دو تایمر روی یک المانِ درصد ننویسند
  // هایلایت ردیف انتخاب‌شده
  var list=document.querySelectorAll(".ver-row"); for(var i=0;i<list.length;i++) list[i].classList.remove("sel");
  var row=document.getElementById("ver-"+num); if(row) row.classList.add("sel");
  // وضعیت دکمهٔ دانلود بر اساس ریویژنِ انتخاب‌شده
  var is3DSel=String(d.typeCode).toUpperCase().indexOf("3D")===0;
  if(is3DSel){ dmInit3DDownload(d); }
  else { var dl=document.getElementById("dpDownload"); if(dl) dl.disabled=!d.fileId; }
  // پیش‌نمایش
  var host=document.getElementById("docPreviewHost"); if(!host) return;
  host.classList.remove("is-3d");   // پیش‌فرض: قابِ عادیِ flex (عکس/PDF)؛ فقط شاخهٔ سه‌بعدی دوباره فعالش می‌کند
  if(!d.fileId){
    host.innerHTML='<div class="empty-state"><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><div class="es-title">این ریویژن فایلی ندارد</div></div>';
    return;
  }
  var is3D = String(d.typeCode).toUpperCase()==="3D";
  // نوارِ پیشرفتِ درون‌بخشی به‌جای اورلیِ تمام‌صفحه؛ فایل به‌صورتِ استریمی در همین بخش لود می‌شود و بقیهٔ سایت آزاد می‌ماند
  host.innerHTML=(typeof loadBarHTML==="function")
    ? loadBarHTML(true, true)
    : '<div class="dm-loading"><div class="spinner" style="width:32px;height:32px;border-width:3px"></div><span>در حال بارگذاری…</span></div>';
  var getHost=function(){ return document.getElementById("docPreviewHost"); };
  var est=(typeof loadBarEstimate==="function")?loadBarEstimate(getHost, 94):null;   // پیشرفتِ نرم تا نوار روی صفر نماند
  _dpEst=est;
  try{
    var r=await getFileRetry(d.fileId, {onProgress: function(loaded,total){ if(est && total>0 && myToken===_dpSeq) est.real(Math.min(99,Math.round(loaded/total*100))); }});
    if(est) est.stop();
    if(_dpEst===est) _dpEst=null;
    // اگر کاربر بین‌بین ریویژن دیگری انتخاب کرده یا پیش‌نمایش بسته شده، این نتیجه را دور بریز
    if(myToken!==_dpSeq) return;
    host=document.getElementById("docPreviewHost"); if(!host) return;
    if(!r||!r.ok){ host.innerHTML='<div class="empty-state"><div class="es-title">پیش‌نمایش در دسترس نیست</div>'+dmRetryBtn(num)+'</div>'; return; }
    var blob=b64toBlob(r.base64, r.mimeType); var url=previewBlobUrl("docPreview", blob);
    // فایلِ سه‌بعدی (GLB/GLTF) نباید در iframe برود (مرورگر دانلودش می‌کند)؛ با model-viewer نمایش داده می‌شود
    var really3D = is3D || /^model\//.test(r.mimeType||"") || /\.(glb|gltf)$/i.test(r.name||"");
    if(really3D){
      if(typeof ensureModelViewer==="function") await ensureModelViewer();
      if(myToken!==_dpSeq) return;
      host=document.getElementById("docPreviewHost"); if(!host) return;
      if(window.customElements && customElements.get("model-viewer")){
        // قابِ پُر (بدونِ flex-centering که لبه را می‌بُرید) + همان تولباکسِ پنلِ پروژه
        host.classList.add("is-3d");
        host.innerHTML='<div class="mv-toolwrap">'+
          '<model-viewer id="dmMv" src="'+url+'" camera-controls touch-action="pan-y" shadow-intensity="1" exposure="0.95" '+
            'ar ar-modes="webxr scene-viewer quick-look" ar-scale="auto" alt="مدلِ سه‌بعدی" style="background:#f4f4f2"><button slot="ar-button" class="mv-ar"></button></model-viewer>'+
          mvPartBadgeHTML(partName(d.partNo))+                                    // برچسبِ نامِ انگلیسیِ قطعه + آیکونِ سه‌بعدی
          (typeof mvToolbarHTML==="function"?mvToolbarHTML():'')+
        '</div>';
      } else {
        host.innerHTML='<div class="empty-state"><svg viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg><div class="es-title">نمایشِ سه‌بعدی در دسترس نیست</div><div class="es-desc">فایلِ کتابخانهٔ model-viewer در پوشهٔ vendor موجود نیست.</div></div>';
      }
    } else {
      host.innerHTML=(r.mimeType.indexOf("image/")===0)?'<img src="'+url+'">':'<iframe src="'+url+'"></iframe>';
    }
  }catch(e){
    if(est) est.stop();
    if(_dpEst===est) _dpEst=null;
    if(myToken!==_dpSeq) return;
    host=document.getElementById("docPreviewHost");
    if(host) host.innerHTML='<div class="empty-state"><div class="es-title">خطا در بارگذاری پیش‌نمایش</div>'+dmRetryBtn(num)+'</div>';
  }
}
/* دکمهٔ «تلاش مجدد» برای بارگذاریِ دوبارهٔ پیش‌نمایش/مدل از ابتدا */
function dmRetryBtn(num){
  return '<button class="btn sm es-retry" onclick="dmSelectVersion(\''+esc(num)+'\')">'+
    '<svg viewBox="0 0 24 24" style="width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>'+
    'تلاش مجدد</button>';
}
/* برچسبِ نامِ انگلیسیِ قطعه (گوشهٔ ویوئرِ سه‌بعدی) — عیناً المانِ منوی انتخابِ قطعه: آیکونِ لایه‌ها + رنگِ متن (نه نارنجی) */
function mvPartBadgeHTML(name){
  if(!name) return '';
  return '<div class="mv-partbadge">'+MV_LAYERS_IC+'<span class="mv-pb-t">'+esc(name)+'</span></div>';
}

/* ================= دانلودِ اسنادِ سه‌بعدی: انتخابِ فرمت با هاور ================= */
var _dm3D = {};   // { GLB:true/false, STP:true/false, USDZ:true/false } — انتخابِ فعلی برای ریویژنِ در حالِ نمایش

/* لیستِ فرمت‌های موجود روی همین ریویژن (فقط آن‌هایی که واقعاً فایل دارند نشان داده می‌شوند) */
function dm3DFormats(d){
  var f=[];
  if(d.fileId)     f.push({key:"GLB",  label:"GLB / GLTF", sub:"نمایشِ سایت",        fileId:d.fileId,     name:d.drawingNumber+".glb"});
  if(d.stpFileId)  f.push({key:"STP",  label:"STP",         sub:"فرمتِ اصلیِ آرشیو",  fileId:d.stpFileId,  name:d.stpFileName||(d.drawingNumber+".stp")});
  if(d.usdzFileId) f.push({key:"USDZ", label:"USDZ",        sub:"واقعیتِ افزوده",     fileId:d.usdzFileId, name:d.usdzFileName||(d.drawingNumber+".usdz")});
  return f;
}
/* هنگامِ نمایشِ هر ریویژنِ سه‌بعدی: پاپ‌آورِ فرمت‌ها را می‌سازد و دکمهٔ دانلود را به حالتِ اولیه (ناقص) برمی‌گرداند */
function dmInit3DDownload(d){
  var wrap=document.getElementById("dmDlWrap"), pop=document.getElementById("dmDlPop"), btn=document.getElementById("dpDownload");
  if(!wrap||!pop||!btn) return;
  var formats=dm3DFormats(d);
  _dm3D={};   // با هر تعویضِ ریویژن، انتخاب‌های قبلی پاک می‌شوند
  if(!formats.length){
    pop.innerHTML=""; btn.disabled=true;
    btn.classList.remove("dm-dl-active"); btn.classList.add("dm-dl-incomplete");
    return;
  }
  pop.innerHTML=formats.map(function(fm){
    return '<button type="button" class="dm-dl-opt" data-k="'+fm.key+'" onclick="event.stopPropagation();dm3DToggle(\''+fm.key+'\')">'+
      '<span class="ed-check" id="dmChk-'+fm.key+'"></span>'+
      '<span class="dm-dl-opt-t"><span class="dm-dl-opt-l">'+esc(fm.label)+'</span><span class="dm-dl-opt-s">'+esc(fm.sub)+'</span></span>'+
    '</button>';
  }).join("");
  btn.disabled=false;
  btn.classList.remove("dm-dl-active"); btn.classList.add("dm-dl-incomplete");
}
/* تاگل‌کردنِ یک فرمت در پاپ‌آور — اولین انتخاب، دکمهٔ دانلود را از حالتِ ناقص به فعال (نارنجی) می‌برد */
function dm3DToggle(key){
  _dm3D[key]=!_dm3D[key];
  var chk=document.getElementById("dmChk-"+key); if(chk) chk.classList.toggle("on",_dm3D[key]);
  var any=Object.keys(_dm3D).some(function(k){ return _dm3D[k]; });
  var btn=document.getElementById("dpDownload");
  if(btn){ btn.classList.toggle("dm-dl-active",any); btn.classList.toggle("dm-dl-incomplete",!any); }
}
/* دانلود ریویژن در حال نمایش */
function dmDownloadSelected(){
  var d=docByNumber(_dm.selNum);
  if(!d){ toast("سند یافت نشد.",true); return; }
  var is3D=String(d.typeCode).toUpperCase().indexOf("3D")===0;
  if(!is3D){
    if(!d.fileId){ toast("این ریویژن فایلی برای دانلود ندارد.",true); return; }
    downloadFile(d.fileId, d.drawingNumber); return;
  }
  var formats=dm3DFormats(d).filter(function(fm){ return _dm3D[fm.key]; });
  if(!formats.length){ toast("دست‌کم یک فرمت را برای دانلود انتخاب کنید.",true); return; }
  formats.forEach(function(fm){ downloadFile(fm.fileId, fm.name); });
}

/* حذف یک ریویژن؛ پس از حذف، دوباره روی ریویژن باقی‌ماندهٔ همان مبنا باز می‌شود */
async function dmDeleteVersion(num){
  var d=docByNumber(num); if(!d) return;
  var isCur=String(d.isLatest).toLowerCase()==="true";
  var msg=isCur ? "حذف «ریویژن فعلی» ("+num+")؟ ریویژن قبلی جایگزینِ آن می‌شود و فایلش به سطلِ زبالهٔ گوگل‌درایو می‌رود (تا حدود یک ماه قابلِ بازیابی)."
                : "حذف ریویژن «"+num+"»؟ فایلش به سطلِ زبالهٔ گوگل‌درایو می‌رود (تا حدود یک ماه قابلِ بازیابی).";
  if(!(await uiConfirm(msg,{danger:true,okLabel:"حذف"}))) return;
  var r=await api("deleteDocument",{drawingNumber:num});
  if(!r.ok){ toast(r.message||"حذف ناموفق",true); return; }
  toast("ریویژن حذف شد");
  await refreshDocuments();
  // ریویژن‌های باقی‌ماندهٔ همین مبنا
  var remaining=DB.documents.filter(function(x){
    return x.clientCode===d.clientCode && pad2(x.orderNo)===pad2(d.orderNo) &&
           pad2(x.projectNo)===pad2(d.projectNo) && pad2(x.partNo)===pad2(d.partNo) &&
           String(x.typeCode).toUpperCase()===String(d.typeCode).toUpperCase();
  });
  if(remaining.length){
    var latest=remaining.filter(function(x){return String(x.isLatest).toLowerCase()==="true";})[0]||remaining[0];
    openDocDetail(latest.drawingNumber);
  } else { closeModal(); }
}

/* ============ بارگذاری ریویژن/نسخهٔ جدید (پنل فشرده: فقط فایل + توضیح) ============ */
var _rv = { baseNum:"", mode:"", file:null };

/* تصمیم‌گیرِ ورودی: بر اساس وضعیت ریویژن فعلیِ مبنا، حالت درست را باز می‌کند. */
function startRevisionUpload(num){
  var d=docByNumber(num); if(!d){ toast("سند یافت نشد.",true); return; }
  var cur=revisionsOf(d)[0]||d, cst=String(cur.status||"").toLowerCase();
  if(cst==="approved") openRevisionUploadModal(cur.drawingNumber,"revision");
  else if(cst==="rejected") openRevisionUploadModal(cur.drawingNumber,"version");
  else toast("برای بارگذاری، وضعیت ریویژن فعلی باید «تأیید شده» (ریویژن جدید) یا «نیاز به اعمال تغییرات» (نسخهٔ جدید) باشد.",true);
}

function openRevisionUploadModal(baseNum, mode){
  var d=docByNumber(baseNum); if(!d){ toast("سند یافت نشد.",true); return; }
  // نوعِ سند از روی همان مبنا مشخص می‌شود: برای سه‌بعدی، فرمتِ آپلود باید همانی بماند که قبلاً ثبت شده (STP/GLB/USDZ)،
  // نه فرمتِ عمومیِ PDF/تصویر — وگرنه امکانِ بارگذاریِ فایلِ سه‌بعدی از این مسیر اصلاً وجود نداشت.
  var is3D=String(d.typeCode).toUpperCase().indexOf("3D")===0;
  _rv={ baseNum:baseNum, mode:mode, file:null, file3:null, file2:null, is3D:is3D };
  var isVer=(mode==="version");
  var rs=revState(d.clientCode,d.orderNo,d.projectNo,d.partNo,d.typeCode);
  var lead=isVer
    ? 'نسخهٔ اصلاح‌شدهٔ همین ریویژن (بدون تغییر شماره) را بارگذاری کنید؛ نسخهٔ قبلی جایگزین می‌شود.'
    : 'ریویژن بعدی این سند («<b>ریویژن '+esc(pad2(rs.nextRev))+'</b>») ثبت می‌شود.';
  var noteLabel=isVer?"توضیحات این نسخه":"توضیحات این ریویژن";
  var upIco='<svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>';
  var stpTag = isVer?"فرمتِ اصلی برای آرشیوِ اسناد — اختیاری":"فرمتِ اصلی برای آرشیوِ اسناد — الزامی";
  var glbTag = isVer?"برای نمایش در سایت — اختیاری":"برای نمایش در سایت — الزامی";
  var dzHTML = is3D
    ? '<div class="nd-up-grid nd-up-3">'+
        rvDropzoneHTML("rvDrop3","rvFile3",".stp,.step","فایل STP",stpTag)+
        rvDropzoneHTML("rvDrop","rvFile",".glb,.gltf","فایل GLB/GLTF",glbTag)+
        rvDropzoneHTML("rvDrop2","rvFile2",".usdz","فایل USDZ","برای نمایش در واقعیتِ افزوده — اختیاری")+
      '</div>'
    : '<div class="nd-up-grid nd-up-1">'+
        rvDropzoneHTML("rvDrop","rvFile",".pdf,image/*","فایل","PDF یا تصویر — الزامی")+
      '</div>';
  // فقط برای «نسخهٔ جدید» (سندِ ردشده) صادق است: می‌شود فقط فرمتِ تغییریافته را بارگذاری کرد
  var hint3D = (is3D && isVer)
    ? '<div class="rv-3d-hint"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="12.5"/><circle cx="12" cy="16" r=".6" fill="currentColor" stroke="none"/></svg>'+
        '<span>فقط فرمتی را بارگذاری کنید که تغییر کرده؛ هر فرمتی که خالی بماند، از نسخهٔ قبلیِ همین سند استفاده می‌شود.</span></div>'
    : '';
  var body='<div class="rv-up">'+
    '<div class="rv-num mono" style="direction:ltr">'+esc(baseNum)+'</div>'+
    '<p class="rv-lead">'+lead+'</p>'+
    dzHTML+hint3D+
    '<label class="fld" style="margin-top:12px">'+noteLabel+'</label>'+
    '<textarea id="rvNote" class="rej-ta" rows="2" placeholder="'+(isVer?"تغییرات این نسخه…":"تغییرات و دلیل این ریویژن…")+'"></textarea>'+
    '<div class="clm-actions"><button class="btn" onclick="closeModal()">انصراف</button>'+
      '<button class="btn primary" onclick="submitRevisionUpload()">'+upIco+'بارگذاری</button></div>'+
  '</div>';
  showModal(isVer?"بارگذاری نسخهٔ جدید":"بارگذاری ریویژن جدید", body, "box-narrow");
  rvInitDrop("rvDrop","rvFile");
  if(is3D){ rvInitDrop("rvDrop3","rvFile3"); rvInitDrop("rvDrop2","rvFile2"); }
}

function rvDropzoneHTML(zoneId,inputId,accept,main,sub){
  return '<label class="dropzone" id="'+zoneId+'" for="'+inputId+'">'+
    '<input id="'+inputId+'" class="dz-input" type="file" accept="'+accept+'" onchange="rvFilePicked(\''+zoneId+'\',\''+inputId+'\')">'+
    '<div class="dz-body"><span class="dz-ico">'+RV_UPLOAD+'</span>'+
      '<div class="dz-main">'+esc(main)+'</div><div class="dz-sub">'+esc(sub)+'</div>'+
      '<div class="dz-file" id="'+inputId+'Name" hidden></div></div>'+
    '<div class="dz-overlay"><span>اینجا رها کنید</span></div></label>';
}
var RV_UPLOAD='<svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>';

function rvFilePicked(zoneId,inputId){
  var inp=document.getElementById(inputId), lbl=document.getElementById(inputId+"Name"), zone=document.getElementById(zoneId);
  var f=inp&&inp.files&&inp.files[0];
  if(inputId==="rvFile3") _rv.file3=f||null;
  else if(inputId==="rvFile2") _rv.file2=f||null;
  else _rv.file=f||null;
  if(f){ if(lbl){ lbl.textContent="✓ "+f.name; lbl.hidden=false; } if(zone) zone.classList.add("has-file"); }
  else { if(lbl){ lbl.textContent=""; lbl.hidden=true; } if(zone) zone.classList.remove("has-file"); }
}
function rvInitDrop(zoneId,inputId){
  var zone=document.getElementById(zoneId), inp=document.getElementById(inputId);
  if(!zone||!inp) return;
  var depth=0, is3D=(inputId!=="rvFile")||_rv.is3D;
  zone.addEventListener("dragenter",function(e){ e.preventDefault(); depth++; zone.classList.add("drag"); });
  zone.addEventListener("dragover",function(e){ e.preventDefault(); if(e.dataTransfer) e.dataTransfer.dropEffect="copy"; });
  zone.addEventListener("dragleave",function(e){ e.preventDefault(); depth=Math.max(0,depth-1); if(depth===0) zone.classList.remove("drag"); });
  zone.addEventListener("drop",function(e){
    e.preventDefault(); depth=0; zone.classList.remove("drag");
    var files=e.dataTransfer&&e.dataTransfer.files; if(!files||!files.length) return;
    var f=files[0];
    var ok = inputId==="rvFile3" ? /\.(stp|step)$/i.test(f.name)
           : inputId==="rvFile2" ? /\.usdz$/i.test(f.name)
           : _rv.is3D            ? /\.(glb|gltf)$/i.test(f.name)
           :                       (/^image\//.test(f.type)||/pdf$/i.test(f.type)||/\.pdf$/i.test(f.name));
    if(!ok){ toast("فرمتِ فایل مجاز نیست.",true); return; }
    try{ var dt=new DataTransfer(); dt.items.add(f); inp.files=dt.files; }
    catch(err){ toast("مرورگر شما از رهاکردن فایل پشتیبانی نمی‌کند؛ از دکمهٔ انتخاب استفاده کنید.",true); return; }
    rvFilePicked(zoneId,inputId);
  });
}
async function submitRevisionUpload(){
  var isVer=(_rv.mode==="version");
  var f=_rv.file;
  // «نسخهٔ جدید» (سندِ ردشده) روی سه‌بعدی: هر سه فایل اختیاری‌اند — هرکدام خالی بماند، نسخهٔ قبلیِ
  // همان فایل در بک‌اند دست‌نخورده می‌ماند؛ فقط باید دست‌کم یکی از سه فایل انتخاب شده باشد.
  // «ریویژنِ جدید» (سندِ تأییدشده) یک رکوردِ کاملاً جدید می‌سازد، پس فایلِ اصلی (و برای سه‌بعدی، STP) همچنان الزامی است.
  if(_rv.is3D && isVer){
    if(!f && !_rv.file3 && !_rv.file2){ toast("دست‌کم یکی از فایل‌های STP، GLB یا USDZ را بارگذاری کنید.",true); return; }
  } else {
    if(!f){ toast(_rv.is3D?"بارگذاریِ فایلِ GLB/GLTF الزامی است.":"بارگذاری فایل الزامی است.",true); return; }
    if(_rv.is3D && !_rv.file3){ toast("بارگذاریِ فایلِ STP الزامی است.",true); return; }
  }
  if(f && f.size>25*1024*1024){ toast("حجم فایل بیش از ۲۵ مگابایت است.",true); return; }
  var ta=document.getElementById("rvNote"); var note=ta?String(ta.value).trim():"";
  var base=docByNumber(_rv.baseNum); if(!base){ toast("سند یافت نشد.",true); return; }
  var b64=f?(await fileToBase64(f)):null;
  // انتخابِ اندپوینت/پیلود بر اساسِ حالت (ریویژنِ جدیدِ همان مبنا یا سندِ جدید)
  var action, payload, label;
  if(isVer){
    action="uploadNewVersion";
    payload={drawingNumber:_rv.baseNum, note:note};
    if(f){ payload.fileBase64=b64; payload.fileName=f.name; payload.mimeType=f.type; }
    label=_rv.baseNum;
  } else {
    var rs=revState(base.clientCode,base.orderNo,base.projectNo,base.partNo,base.typeCode);
    action="createDocument";
    payload={clientCode:base.clientCode, orderNo:base.orderNo, projectNo:base.projectNo,
        partNo:base.partNo, typeCode:base.typeCode, rev:rs.nextRev, title:note,
        fileBase64:b64, fileName:f.name, mimeType:f.type};
    label=base.drawingNumber;
  }
  // اسنادِ سه‌بعدی: STP و USDZ هم همراهِ همین درخواست ارسال می‌شوند (هرکدام که انتخاب شده باشد)
  if(_rv.is3D){
    if(_rv.file3){
      if(_rv.file3.size>25*1024*1024){ toast("حجم فایل STP بیش از ۲۵ مگابایت است.",true); return; }
      payload.stpBase64=await fileToBase64(_rv.file3); payload.stpName=_rv.file3.name; payload.stpMime=_rv.file3.type;
    }
    if(_rv.file2){
      if(_rv.file2.size>25*1024*1024){ toast("حجم فایل USDZ بیش از ۲۵ مگابایت است.",true); return; }
      payload.usdzBase64=await fileToBase64(_rv.file2); payload.usdzName=_rv.file2.name; payload.usdzMime=_rv.file2.type;
    }
  }
  // آپلود به «مرکز انتقال» می‌رود؛ مودال بلافاصله بسته می‌شود و ارسال برای بازبینی خودکار انجام می‌شود.
  closeModal();
  dlEnqueueUpload({
    label: label, action: action, payload: payload,
    onSuccess: async function(r){
      if(!r || !r.ok){ toast((r&&r.message)||"بارگذاری ناموفق",true); return; }
      var targetNum = r.drawingNumber || _rv.baseNum;
      toast("بارگذاری شد");
      var sr=await api("submitForReview",{drawingNumber:targetNum},{silent:true, quiet:true});
      if(sr && sr.ok) toast("برای بازبینی ارسال شد");
      await refreshDocuments();
    }
  });
}
