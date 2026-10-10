/* ================= مودال جزئیات سند ================= */
/* وضعیت ریویژن انتخاب‌شده در مودال (برای پیش‌نمایش و دانلود) */
var _dm = { num:"", selNum:"", view:"doc" };   // view: «doc» نقشه یا «model» مدل سه‌بعدی همان نقشه

/* شمارندهٔ بارگذاری پیش‌نمایش + برآوردگر نوار پیشرفت فعال.
   بدون این، اگر پیش‌نمایشی پیش از تکمیل بسته و پیش‌نمایش تازه‌ای باز شود، تایمر برآوردگر قبلی
   (که هنوز داخل await است و متوقف نشده) روی همان id=docPreviewHost می‌نویسد و عدد درصد با نمونهٔ
   جدید «قاطی» می‌شود. هر بارگذاری نو، توکن را جلو می‌برد و برآوردگر قبلی را متوقف می‌کند. */
var _dpSeq = 0, _dpEst = null;
function _dpStopPreview(){ _dpSeq++; if(_dpEst){ _dpEst.stop(); _dpEst=null; } }

async function openDocDetail(num){
  var d=docByNumber(num);
  if(!d){
    // سند حذف‌شده هنوز در سطل زباله است؛ پیام باید همین را بگوید، نه «یافت نشد»
    if(trashedDocByNumber(num)) toast("این سند حذف شده و در سطل زباله است.",true);
    else toast("سند یافت نشد.",true);
    return;
  }
  var si=statusInfo(d.status);
  /* اگر خود پنجرهٔ جزئیات سند بالاترین لایه باشد، جای همان را می‌گیرد نه اینکه روی
     خودش باز شود (مثلاً دکمهٔ «مشاهدهٔ ویرایش جدیدتر» درون همین پنجره).
     پنجرهٔ از نوع دیگر (کارتابل، فهرست) دست‌نخورده زیر می‌ماند. */
  var _mh=document.getElementById("modalHost");
  var _topLayer=modalTop(_mh);
  var _swap=!!(_topLayer && _topLayer.querySelector && _topLayer.querySelector(".doc-modal"));
  if(_swap) _mh.removeChild(_topLayer);
  if(!_swap) _dm.view="doc";   // پنجرهٔ تازه همیشه با نقشه باز می‌شود
  _dm.num=num; _dm.selNum=num;

  var metaHTML=dmMetaHTML(d);
  var rejBanner=dmRejectHTML(d);

  /* ---------- تاریخچهٔ ریویژن‌ها (جدید به قدیم) ---------- */
  var revs=revisionsOf(d);
  var revHTML=revs.map(function(rv){ return versionRowHTML(rv); }).join("");

  /* ---------- اکشن اصلی متن‌محور بالای پنل (کنار دانلود) بر اساس وضعیت ریویژن فعلی ---------- */
  var cur=revs[0]||d, cst=String(cur.status||"").toLowerCase();
  var actionBtn="";
  if(ME.role==="admin"){
    if(cst==="draft") actionBtn='<button class="btn dm-act" onclick="submitReview(\''+esc(cur.drawingNumber)+'\')">'+ICON.send+'ارسال برای بازبینی</button>';
    else if(cst==="rejected") actionBtn='<button class="btn dm-act" onclick="startRevisionUpload(\''+esc(cur.drawingNumber)+'\')">'+ICON.upload+'بارگذاری نسخهٔ جدید</button>';
    else if(cst==="approved" && isRetiredType(cur.typeCode)) actionBtn="";   // فایل سه‌بعدی قدیمی: مدل تازه همراه نقشه بارگذاری می‌شود
    else if(cst==="approved") actionBtn='<button class="btn dm-act" onclick="startRevisionUpload(\''+esc(cur.drawingNumber)+'\')">'+ICON.upload+'بارگذاری ریویژن جدید</button>';
    // در حال بازبینی: دکمه غیرفعال (خاکستری) — کلیک روی آن، پیام راهنما + میان‌بر به کارتابل بازبینی همین سند را باز می‌کند
    else if(cst==="pending") actionBtn='<button class="btn dm-act dm-act-disabled" onclick="pendingUploadNotice(\''+esc(cur.drawingNumber)+'\')">'+ICON.upload+'بارگذاری نسخهٔ جدید</button>';
  }

  var dlIcon='<svg viewBox="0 0 24 24" style="width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;margin-inline-end:5px;vertical-align:-3px"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
  /* کشوی فرمت‌ها برای اسناد سه‌بعدی و نقشه‌هایی که مدل دارند (PDF + STEP + GLB + USDZ) */
  var is3DDoc=is3DType(d.typeCode) || isModelType(d.typeCode);
  var dlBtnHTML = is3DDoc
    ? '<div class="dm-dl-wrap" id="dmDlWrap">'+
        '<div class="dm-dl-pop" id="dmDlPop"></div>'+
        '<button class="btn primary dm-dl" id="dpDownload" onclick="dmDlMain(event)" aria-expanded="false" disabled>'+dlIcon+'<span class="dm-dl-txt">دانلود<span class="dm-dl-var" id="dpDlVar"><span class="v-a">فایل</span><span class="v-b">همه</span></span></span></button>'+
      '</div>'
    : '<button class="btn primary dm-dl" id="dpDownload" onclick="dmDownloadSelected()" disabled>'+dlIcon+'دانلود سند</button>';
  var body=''+
    '<div class="doc-modal">'+
      '<div class="doc-preview">'+
        /* بنر «ریویژن جدیدتر» روی پیش‌نمایش، چسبیده به پایین کادر — کنار همان نقشه‌ای که منسوخ است */
        '<div class="dp-stage"><div class="dp-frame" id="docPreviewHost"></div><div id="dmViewSw"></div><div id="dmNewerSlot"></div></div>'+
        '<div class="dp-actions">'+actionBtn+dmAddFormatBtnHTML(cur)+dlBtnHTML+'</div>'+
      '</div>'+
      /* ظرف داخلی: خود .doc-side جهت ltr دارد تا نوار اسکرول سمت راست
         بیفتد؛ جهت محتوا اینجا به rtl برمی‌گردد. */
      '<div class="doc-side"><div class="doc-side-in">'+
        '<div class="dm-sec"><div class="dm-sec-t"><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>مشخصات سند</div><div id="dmMeta" data-num="'+esc(d.drawingNumber)+'">'+metaHTML+'</div></div>'+
        '<div id="dmRej">'+rejBanner+'</div>'+
        '<div class="dm-sec"><div class="dm-sec-t"><svg viewBox="0 0 24 24"><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><polyline points="12 7 12 12 15 15"/></svg>تاریخچهٔ سند</div>'+
          '<div class="ver-list">'+revHTML+'</div></div>'+
        '<div id="dmQrWrap">'+dmQrSectionHTML(d)+'</div>'+
      '</div></div>'+
    '</div>';
  showModal(esc(docPhrase(d)), body, "doc-box");
  /* جایگزینی همین پنجره (بازرسم پس از تأیید/همگام‌سازی، یا رفتن به ریویژن دیگر) انیمیشن ورود نمی‌گیرد؛
     وگرنه پنجره با هر به‌روزرسانی بی‌دلیل چشمک می‌زد. */
  if(_swap){ var _nl=modalTop(_mh); if(_nl) _nl.classList.add("md-swap"); }
  wfFixLines(document.getElementById("modalHost"));   // چیدمان دو‌خطی توضیح/نام در گردش‌کار

  /* ریویژن جاری را به‌صورت پیش‌فرض در پیش‌نمایش بارگذاری کن (بدون باز کردن گردش‌کار) */
  dmSelectVersion(num);
}

/* ═══ افزودن مدل سه‌بعدی به نقشهٔ موجود، بدون ریویژن ═══
   برای نقشه‌ای که هنوز مدل ندارد (مثلاً مدلش بعداً آماده شده). فقط STEP گرفته می‌شود؛ GLB و USDZ و حجم
   در مرورگر ساخته و پشت سر هم در «مرکز انتقال» ثبت می‌شوند. شماره و وضعیت سند تغییر نمی‌کند. */
function dmAddFormatBtnHTML(d){
  if(ME.role!=="admin" || !d || !isModelType(d.typeCode) || docHasModel(d)) return "";
  return '<button class="btn dm-act" onclick="openAddModelModal(\''+esc(d.drawingNumber)+'\')">'+ICON.plus+'افزودن مدل سه‌بعدی</button>';
}
var _af={ num:"" };
function openAddModelModal(num){
  var d=docByNumber(num); if(!d){ toast("سند یافت نشد.",true); return; }
  if(docHasModel(d)){ toast("این سند از قبل مدل سه‌بعدی دارد؛ برای مدل تازه، ریویژن جدید بسازید.",true); return; }
  _af={ num:num };
  _rv={ file:null, file3:null };   // rvFilePicked و rvInitDrop از همین وضعیت استفاده می‌کنند
  /* سربرگ هم‌الگوی پنجرهٔ ریویژن: یک سلول با رینگ نارنجی چرخان دور شمارهٔ سند */
  var stem=String(num).replace(/-[^-]*$/,""), rev=String(num).split("-").pop();
  showModal("افزودن مدل سه‌بعدی",
    '<div class="rv-band"><div class="rv-flow"><div class="rv-cell next">'+
      '<svg class="rv-ring" aria-hidden="true"><rect width="100%" height="100%" rx="12" ry="12" pathLength="100"/></svg>'+
      '<span class="rv-cn">'+esc(stem)+'-<b>'+esc(rev)+'</b></span><span class="rv-cap">3D FILE</span></div></div></div>'+
    '<div class="rv-up">'+
      '<div class="nd-up-grid nd-up-1">'+
        rvDropzoneHTML("rvDrop3","rvFile3",".stp,.step",DZ_MODEL_MAIN,DZ_MODEL_SUB)+
      '</div>'+
      '<div class="clm-actions"><button class="btn primary" id="afSave" onclick="submitAddModel()">ثبت</button></div>'+
    '</div>', "box-narrow");
  rvInitDrop("rvDrop3","rvFile3");
}
async function submitAddModel(){
  var f=_rv.file3;
  if(!f){ toast("فایل STEP انتخاب نشده است.",true); return; }
  var num=_af.num, btn=document.getElementById("afSave");
  if(btn) btn.disabled=true;
  var m;
  try{ m=await stepPayload(f, false); }
  catch(e){ if(btn) btn.disabled=false; toast(stepErrMsg(e),true); return; }
  closeModal();
  if(m.serverConvert){
    /* سرور از روی STEP فایل نمایش و واقعیت افزوده را می‌سازد و هر سه را ثبت می‌کند */
    dlEnqueueUpload({
      label: num+" ‹ STEP",
      action: "addFormat",
      payload: { drawingNumber:num, kind:"stp", fileBase64:m.stpBase64, fileName:m.stpName, mimeType:m.stpMime, serverConvert:true },
      onSuccess: async function(r){
        if(!r || !r.ok){ toast((r&&r.message)||"افزودن مدل ناموفق بود.",true); return; }
        toast("مدل سه‌بعدی افزوده شد."); await refreshDocuments();
      }
    });
    return;
  }
  /* سه کار پشت سر هم (صف انتقال ترتیبی است): اول STEP همراه حجم، بعد فایل نمایش و واقعیت افزوده */
  var jobs=[
    { kind:"stp",  b64:m.stpBase64,  name:m.stpName,  mime:m.stpMime, vol:true },
    { kind:"glb",  b64:m.glbBase64,  name:m.glbName,  mime:"model/gltf-binary" },
    { kind:"usdz", b64:m.usdzBase64, name:m.usdzName, mime:"model/vnd.usdz+zip" }
  ];
  jobs.forEach(function(j, i){
    var payload={ drawingNumber:num, kind:j.kind, fileBase64:j.b64, fileName:j.name, mimeType:j.mime };
    if(j.vol) payload.modelVolume=m.modelVolume;
    dlEnqueueUpload({
      label: num+" ‹ "+j.kind.toUpperCase(),
      action: "addFormat",
      payload: payload,
      onSuccess: async function(r){
        if(!r || !r.ok){ toast((r&&r.message)||"افزودن مدل ناموفق بود.",true); return; }
        if(i===jobs.length-1){ toast("مدل سه‌بعدی افزوده شد."); await refreshDocuments(); }
      }
    });
  });
}
/* بازرسم مودال جزئیات سند پس از تازه‌شدن داده.
   فقط وقتی که خودش بالاترین لایهٔ پشته باشد؛ وگرنه پنجرهٔ رویی (مثل فرم رد یا
   افزودن فرمت) که کاربر در حال پرکردن آن است نابود می‌شود. */
function dmRefreshOpen(){
  var host=document.getElementById("modalHost");
  var top=modalTop(host);
  if(!top || !top.querySelector || !top.querySelector(".doc-modal")) return;
  var num=_dm.num; if(!num) return;
  if(!docByNumber(num)) return;   // سند حذف شده — بازرسم بی‌معناست
  /* ریویژنی که کاربر در تاریخچه انتخاب کرده حفظ می‌شود (نه برگشت به ریویژنی که پنجره با آن باز شد) */
  if(_dm.selNum && docByNumber(_dm.selNum)) num=_dm.selNum;
  openDocDetail(num);             // خودش جای لایهٔ هم‌نوع رویی را می‌گیرد
}

/* بنر «نسخهٔ جدیدتر موجود است».
   فقط وقتی نشان داده می‌شود که ویرایش *تأییدشدهٔ* جدیدتری وجود داشته باشد؛ پیش‌نویس یا
   در انتظار بازبینی هنوز مبنای ساخت نیست و اعلامش کاربر را گمراه می‌کند. */
function dmNewerRevBanner(d){
  var cur=parseInt(d.rev,10); if(isNaN(cur)) return "";
  var newer=revisionsOf(d).filter(function(rv){
    return (parseInt(rv.rev,10)||0)>cur && String(rv.status||"").toLowerCase()==="approved";
  }).sort(function(a,b){ return (parseInt(b.rev,10)||0)-(parseInt(a.rev,10)||0); })[0];
  if(!newer) return "";
  return '<div class="dm-newer dp-newer"><div class="dm-newer-main">'+
    /* واژه و شکل شماره هم‌سان تاریخچهٔ سند: «ریویژن 01» (قبلاً «ویرایش ۱» — faN صفر ابتدایی را می‌انداخت) */
    '<div class="dm-newer-t"><span class="dm-newer-dot"></span>ریویژن جدیدتری تأیید شده است</div>'+
    '<div class="dm-newer-note">ریویژن به‌روزتری از این سند در سامانه ثبت شده است؛ برای چاپ سند، از آخرین ریویژن استفاده کنید.</div></div>'+
    /* درجا همان ریویژن در پیش‌نمایش انتخاب می‌شود (نه بازکردن دوبارهٔ پنجره) */
    '<button class="btn sm" onclick="dmSelectVersion(\''+esc(newer.drawingNumber)+'\')">مشاهدهٔ ریویژن '+esc(pad2(revFmt(newer.rev)))+'</button>'+
    /* بنر روی نقشه است و ممکن است جدول مشخصات پایین آن را بپوشاند؛ بستن فقط برای همین ریویژن و همین بار */
    '<button class="dm-newer-x" onclick="dmHideNewer()" aria-label="بستن" title="بستن">✕</button>'+
  '</div>';
}
function dmHideNewer(){ var s=document.getElementById("dmNewerSlot"); if(s) s.innerHTML=""; }

/* مشخصات سند (فقط نام‌های متنی، بدون کد) — برای ریویژن انتخاب‌شده */
function dmMetaHTML(d){
  var meta=[
    ["شماره سند", '<span class="mono" style="direction:ltr">'+esc(d.drawingNumber)+'</span>'],
    ["مشتری", esc(clientName(d.clientCode))],
    // برچسب ردیف خودش «پروژه» است؛ پس مقدار باید نام خالص باشد، نه عنوان پیشونددار
    ["پروژه", esc(projectName(d)||("شمارهٔ "+pad2(d.projectNo)))],
    ["قطعه", esc(partName(d.partNo))],
    ["نوع سند", esc(typeName(d.typeCode))],
    ["ثبت‌کننده", esc(userName(d.uploadedBy)||"—")],
    ["تاریخ ثبت", fmtTimeDate(d.timestamp)]
  ];
  // سطر «بازبین» حذف شد؛ اطلاعات کامل بازبینی در سکشن گردش‌کار (تاریخچهٔ سند) نمایش داده می‌شود.
  return meta.map(function(m){return '<div class="dm-row"><span class="dm-k">'+m[0]+'</span><span class="dm-v">'+m[1]+'</span></div>';}).join("");
}
/* بنر رد: بین سکشن مشخصات و تاریخچه؛ نقطهٔ قرمز پالس‌دار پیش تیتر */
function dmRejectHTML(d){
  return (String(d.status||"").toLowerCase()==="rejected")
    ? '<div class="dm-reject">'+
        '<div class="dm-reject-t"><span class="dm-reject-dot"></span>این سند نیاز به اعمال تغییرات دارد.</div>'+
        '<div class="dm-reject-note">'+(d.reviewNote?esc(d.reviewNote):'دلیلی ثبت نشده است.')+'</div>'+
      '</div>'
    : '';
}
/* همهٔ بخش‌های وابسته به ریویژن، همراه انتخاب ریویژن به‌روز می‌شوند: مشخصات، بنر رد، کد QR
   و بنر «ریویژن جدیدتر». قبلاً فقط یک‌بار و بر اساس سندی که پنجره با آن باز شده بود ساخته می‌شدند؛
   پس انتخاب ریویژن قدیمی از تاریخچه بنر را نشان نمی‌داد و برعکس، بنر روی ریویژن جدید می‌ماند. */
function dmApplySelection(d){
  var slot=document.getElementById("dmNewerSlot"); if(slot) slot.innerHTML=dmNewerRevBanner(d);
  var side=document.getElementById("dmMeta");
  if(side && side.getAttribute("data-num")===d.drawingNumber) return;   // بخش‌های کناری همین حالا مال همین ریویژن‌اند
  if(side){ side.innerHTML=dmMetaHTML(d); side.setAttribute("data-num", d.drawingNumber); }
  var rj=document.getElementById("dmRej"); if(rj) rj.innerHTML=dmRejectHTML(d);
  var qr=document.getElementById("dmQrWrap"); if(qr) qr.innerHTML=dmQrSectionHTML(d);
}

/* ═══ بخش کد QR سند ═══
   کد به همان ویرایشی اشاره می‌کند که رویش چاپ می‌شود (شمارهٔ ویرایش انتهای شمارهٔ سند است)،
   پس نقشهٔ کاغذی دست پیمانکار همیشه نسخهٔ خودش را باز می‌کند — نه نسخه‌ای که بعداً آمده.
   اگر ویرایش تأییدشدهٔ جدیدتری وجود داشته باشد، خود سامانه پس از باز شدن به کاربر می‌گوید. */
function dmQrSectionHTML(d){
  var url=(typeof qrDocUrl==="function")?qrDocUrl(d.drawingNumber):"";
  if(!url) return "";
  var svg=(typeof qrSvg==="function")?qrSvg(url):"";
  if(!svg) return "";   // کتابخانهٔ QR نیامده — بخش اصلاً ساخته نمی‌شود
  return '<div class="dm-sec dm-qr-sec">'+
    '<div class="dm-sec-t"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><line x1="14" y1="14" x2="14" y2="21"/><line x1="18" y1="14" x2="18" y2="18"/><line x1="21" y1="18" x2="21" y2="21"/></svg>کد QR سند</div>'+
    '<div class="dm-qr-body">'+
      '<div class="dm-qr-img" id="dmQrImg">'+svg+'</div>'+
      '<div class="dm-qr-side">'+
        '<p class="dm-qr-note">برای درج کنار جدول مشخصات نقشه. با اسکن، همین ویرایش سند در سامانه باز می‌شود.</p>'+
        '<button class="btn sm" onclick="dmDownloadQr(\''+esc(d.drawingNumber)+'\')">'+ICON.download+'دریافت تصویر</button>'+
      '</div>'+
    '</div></div>';
}
/* دانلود QR به‌صورت SVG — برداری است، پس در هر ابعادی روی نقشه چاپ شود لبه‌هایش تیز می‌ماند
   (تصویر نقطه‌ای در چاپ بزرگ پله‌پله می‌شود و اسکنر را به زحمت می‌اندازد). */
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
  a.dataset.dlInternal="1";   // کلیک ساختگی نباید پنل انتقال را ببندد
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function(){ try{ URL.revokeObjectURL(a.href); }catch(e){} }, 4000);
}

/* یک ردیف ریویژن در تاریخچه: سر فشرده + اکشن‌های کارت (فقط حذف/رد/تأیید) + گردش‌کار اکسپند‌شونده */
/* ═══════════════ رندر PDF روی canvas (pdf.js) ═══════════════
   ⚠ کتابخانه تنبل بارگذاری می‌شود — ۳۱۳KB + ۱MB ورکر که فقط برای کاربری که
   واقعاً PDF باز می‌کند دانلود می‌شود، نه در بارگذاری اول سایت.
   نسخهٔ 3.11 عمداً انتخاب شد: آخرین نسخه‌ای که UMD می‌دهد. نسخهٔ ۴ به بالا
   فقط ES module است و با اسکریپت‌های کلاسیک این پروژه کار نمی‌کند. */
var _pdfLibPromise=null;
function ensurePdfLib(){
  if(window.pdfjsLib) return Promise.resolve(true);
  if(_pdfLibPromise) return _pdfLibPromise;
  _pdfLibPromise=new Promise(function(resolve){
    var sc=document.createElement("script"); sc.src="vendor/pdf.min.js";
    sc.onload=function(){
      if(window.pdfjsLib) window.pdfjsLib.GlobalWorkerOptions.workerSrc="vendor/pdf.worker.min.js";
      resolve(!!window.pdfjsLib);
    };
    sc.onerror=function(){ _pdfLibPromise=null; sc.remove(); resolve(false); };   // شکست شبکه‌ای کش نشود تا تلاش بعدی دوباره بارگذاری کند
    document.head.appendChild(sc);
  });
  return _pdfLibPromise;
}
/* همهٔ صفحات پشت سر هم رندر می‌شوند؛ قاب خودش اسکرول می‌کند.
   token برای این است که اگر کاربر وسط رندر ریویژن دیگری انتخاب کرد،
   صفحات نیمه‌کارهٔ قبلی روی نمای جدید نریزند. */
async function dmRenderPdf(host, blob, token){
  var ok=await ensurePdfLib();
  if(token!==_dpSeq) return;
  if(!ok){   // کتابخانه نیامد → همان ویوئر مرورگر، بدون ذره‌بین
    host.classList.remove("is-pdf"); host.classList.add("is-frame");
    host.innerHTML='<iframe src="'+previewBlobUrl("docPreview", blob)+'"></iframe>';
    return;
  }
  try{
    var buf=await blob.arrayBuffer();
    if(token!==_dpSeq) return;
    /* ⚠ فونت‌های استاندارد و CMapها: PDFهایی که فونت‌شان جاسازی نشده (رایج در خروجی نرم‌افزارهای
       نقشه‌کشی: Arial/Helvetica/ISOCPEUR) بدون این دو، با فونت جایگزین سیستم و عرض نادرست حروف
       کشیده می‌شدند — متن‌ها فاصله‌دار و به‌هم‌ریخته دیده می‌شد، در حالی که خود فایل سالم بود.
       هر دو پوشه محلی‌اند (vendor/pdfjs، هم‌نسخهٔ 3.11.174) و فقط برای همان PDF و همان فونت بار می‌شوند. */
    var pdf=await pdfjsLib.getDocument({data:buf,
      standardFontDataUrl:"vendor/pdfjs/standard_fonts/",
      cMapUrl:"vendor/pdfjs/cmaps/", cMapPacked:true}).promise;
    if(token!==_dpSeq) return;
    host.innerHTML='<div class="pdfv" id="pdfv"></div>';
    var wrap=host.querySelector(".pdfv");
    /* اندازهٔ نمایش: صفحه کامل داخل قاب جا می‌شود (contain) — همان
       قاعدهٔ پیش‌نمایش عکس، تا یک برگ A4 بدون اسکرول دیده شود.
       PAD = پدینگ ۱۰px دو طرف .pdfv + جایی برای اسکرول‌بار احتمالی. */
    var PAD=28;
    var boxW=Math.max(120,(host.clientWidth||600)-PAD);
    var boxH=Math.max(120,(host.clientHeight||600)-PAD);
    /* ⚠ رندر با سوپرسمپلینگ (بوم چند برابر اندازهٔ نمایش پیکسل می‌گیرد).
       ریشهٔ تاری: قبلاً مقیاس فقط dpr بود، پس روی نمایشگر معمولی (dpr=1)
       نقشهٔ A4 در همان ~۸۰۰px رندر می‌شد ≈ ۳ پیکسل بر میلی‌متر؛ متن
       ۲میلی‌متری نقشه ۶ پیکسل می‌شد و تار دیده می‌شد. ذره‌بین هم چیزی
       اضافه نمی‌کرد چون پیکسل بیشتری وجود نداشت. حالا به‌اندازهٔ بزرگ‌نمایی
       ذره‌بین پیکسل ذخیره رندر می‌شود. سقف مگاپیکسل جلوی پرشدن حافظه
       در PDFهای چندصفحه‌ای را می‌گیرد. */
    var dpr=Math.min(window.devicePixelRatio||1, 2);
    var ss=(typeof LENS_ZOOM==="number"?LENS_ZOOM:2);
    /* بودجهٔ کل ۱۶ مگاپیکسل بین صفحه‌ها تقسیم می‌شود (کف ۲ و سقف ۱۲)،
       تا یک نقشهٔ تک‌برگی بیشترین وضوح را بگیرد ولی PDF چندصفحه‌ای حافظه را نبلعد. */
    var MAXPX=Math.min(12e6, Math.max(2e6, 16e6/pdf.numPages));
    for(var i=1;i<=pdf.numPages;i++){
      var page=await pdf.getPage(i);
      if(token!==_dpSeq) return;
      var v1=page.getViewport({scale:1});
      var fit=Math.min(boxW/v1.width, boxH/v1.height);
      var cssW=Math.max(1,Math.round(v1.width*fit)), cssH=Math.max(1,Math.round(v1.height*fit));
      var q=dpr*ss, px=cssW*q*cssH*q;
      if(px>MAXPX) q*=Math.sqrt(MAXPX/px);
      var vp=page.getViewport({scale:fit*q});
      var cv=document.createElement("canvas");
      cv.width=Math.max(1,Math.floor(vp.width)); cv.height=Math.max(1,Math.floor(vp.height));
      cv.style.width=cssW+"px"; cv.style.height=cssH+"px";
      cv.className="pdf-page";
      /* ⚠ بوم باید صریحاً چپ‌به‌راست باشد: جهت متن canvas از عنصر به ارث می‌رسد و سایت RTL است.
         pdf.js بعضی متن‌ها را رشته‌ای می‌کشد (مثلاً متن‌هایی که reportlab در PDF نوشته)؛ در زمینهٔ RTL
         الگوریتم دوجهتی «:»، «-» و فاصله‌ها را جابه‌جا می‌کرد → «Shaf t»، «FSM -SCC». */
      cv.style.direction="ltr"; cv.setAttribute("dir","ltr");
      wrap.appendChild(cv);
      var ctx2d=cv.getContext("2d"); try{ ctx2d.direction="ltr"; }catch(e){}
      await page.render({canvasContext:ctx2d, viewport:vp}).promise;
      if(token!==_dpSeq) return;
    }
  }catch(e){
    host.classList.remove("is-pdf"); host.classList.add("is-frame");
    host.innerHTML='<iframe src="'+previewBlobUrl("docPreview", blob)+'"></iframe>';
  }
}

/* ═══════════════ ذره‌بین ═══════════════
   با کلیک روشن/خاموش می‌شود و تا وقتی روشن است، پنجرهٔ گردی همراه موس حرکت
   می‌کند و همان ناحیه را با بزرگ‌نمایی دوبرابر نشان می‌دهد.
   روش: به‌جای کپی پیکسل، همان عنصر (img یا canvas) با transform: scale
   داخل یک قاب گرد کشیده می‌شود و مبدأش طوری جابه‌جا می‌شود که نقطهٔ زیر
   نشانگر وسط ذره‌بین بیفتد. این هم برای عکس کار می‌کند هم برای canvas PDF. */
var LENS_ZOOM=2, LENS_SIZE=190;
function dmLensAttach(host){
  if(!host || host._lensOn) return;
  host._lensOn=true;
  host.classList.add("lens-ready");
  var lens=null, srcEl=null;

  function targetAt(x,y){
    var els=host.querySelectorAll("img, canvas.pdf-page");
    for(var i=0;i<els.length;i++){
      var r=els[i].getBoundingClientRect();
      if(x>=r.left && x<=r.right && y>=r.top && y<=r.bottom) return els[i];
    }
    return null;
  }
  function build(el){
    kill();
    srcEl=el;
    lens=document.createElement("div");
    lens.className="dm-lens";
    lens.style.width=LENS_SIZE+"px"; lens.style.height=LENS_SIZE+"px";
    var clone=el.cloneNode(true);         // canvas: cloneNode محتوا را نمی‌آورد → دستی می‌کشیم
    if(el.tagName==="CANVAS"){
      clone.width=el.width; clone.height=el.height;
      clone.getContext("2d").drawImage(el,0,0);
    }
    clone.className="dm-lens-src";
    clone.removeAttribute("style");
    lens.appendChild(clone);
    document.body.appendChild(lens);
  }
  function place(x,y){
    if(!lens||!srcEl) return;
    var r=srcEl.getBoundingClientRect();
    var w=r.width*LENS_ZOOM, h=r.height*LENS_ZOOM;
    var c=lens.firstChild;
    c.style.width=w+"px"; c.style.height=h+"px";
    // نقطهٔ زیر نشانگر باید وسط ذره‌بین بیفتد
    c.style.left=(LENS_SIZE/2 - (x-r.left)*LENS_ZOOM)+"px";
    c.style.top =(LENS_SIZE/2 - (y-r.top )*LENS_ZOOM)+"px";
    lens.style.left=(x-LENS_SIZE/2)+"px";
    lens.style.top =(y-LENS_SIZE/2)+"px";
  }
  function kill(){
    if(lens&&lens.parentNode) lens.parentNode.removeChild(lens);
    lens=null; srcEl=null;
  }
  host.addEventListener("click", function(e){
    if(lens){ kill(); return; }                 // کلیک دوم = خاموش
    var el=targetAt(e.clientX,e.clientY); if(!el) return;
    build(el); place(e.clientX,e.clientY);
  });
  host.addEventListener("mousemove", function(e){
    if(!lens) return;
    var el=targetAt(e.clientX,e.clientY);
    if(!el){ kill(); return; }                  // از روی سند بیرون رفت
    if(el!==srcEl){ build(el); }                // صفحهٔ دیگر PDF
    place(e.clientX,e.clientY);
  });
  host.addEventListener("mouseleave", kill);
  /* اسکرول یا بستن مودال، ذره‌بین را می‌بندد تا روی جای اشتباه نماند */
  host.addEventListener("scroll", kill, true);
  window.addEventListener("scroll", kill, true);
}
/* نماد سند با شمارهٔ ریویژن در مرکز — هم‌ساختار docTypeIconInner در projects.js
   (همان مسیر SVG و همان قاعدهٔ متن داخلی) تا زبان بصری «المان» یکدست بماند. */
function revIconInner(rev){
  return '<svg class="el-doc" viewBox="0 0 24 24">'+
    '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>'+
    '<polyline points="14 2 14 8 20 8"/>'+
    '<text x="12" y="16.5" text-anchor="middle" fill="currentColor" stroke="none" font-size="8">'+esc(rev)+'</text>'+
  '</svg>';
}
function versionRowHTML(rv){
  var admin=ME.role==="admin", canReview=(admin||ME.role==="reviewer");
  var st=String(rv.status||"").toLowerCase();
  var isCur=String(rv.isLatest).toLowerCase()==="true";
  var acts=[];
  if(canReview && st==="pending"){
    acts.push(approveIconBtn("event.stopPropagation();approveDoc('"+esc(rv.drawingNumber)+"')"));
    acts.push(rejectIconBtn("event.stopPropagation();rejectDoc('"+esc(rv.drawingNumber)+"')"));
  }
  if(admin) acts.push(delIconBtn("event.stopPropagation();dmDeleteVersion('"+esc(rv.drawingNumber)+"')"));

  /* سر سطر عمداً کم‌جزئیات است: فقط شمارهٔ ریویژن و فلش اکسپند.
     «بدون فایل» و اکشن‌ها (تأیید/رد/حذف) داخل بخش بازشونده رفتند تا فهرست در
     حالت بسته آرام بماند و اکشن حذف هم پشت یک کلیک آگاهانه باشد. */
  return '<div class="ver-row'+(isCur?" cur":"")+'" id="ver-'+esc(rv.drawingNumber)+'" onclick="dmToggleRev(\''+esc(rv.drawingNumber)+'\')">'+
    '<div class="ver-head">'+
      /* المان ریویژن: همان نماد سند کددار سایت (docTypeIconInner)، ولی به‌جای
         کد نوع سند، شمارهٔ دو‌رقمی ریویژن داخلش می‌نشیند. */
      '<span class="el-badge ver-el">'+revIconInner(pad2(revFmt(rv.rev)))+'</span>'+
      '<span class="ver-rev mono">ریویژن '+esc(pad2(revFmt(rv.rev)))+'</span>'+   // شمارهٔ دو‌رقمی (۰۰/۰۱/…)
      '<div class="ver-head-end">'+
        '<span class="ver-chev"><svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg></span>'+
      '</div>'+
    '</div>'+
    /* سطر توضیح: متن در راست و اکشن‌ها (تأیید/رد/حذف) در چپ — دقیقاً زیر فلش
       اکسپند. اکشن‌ها فقط در حالت باز دیده می‌شوند (CSS)، پس حذف همچنان پشت
       یک کلیک آگاهانه می‌ماند. توضیح در هر دو حالت دیده می‌شود. */
    ((rv.title||acts.length)
      ? '<div class="ver-descrow'+(rv.title?'':' no-desc')+'">'+
          (rv.title?'<div class="ver-desc" title="'+esc(rv.title)+'">'+esc(rv.title)+'</div>':'<span class="ver-desc"></span>')+
          (acts.length?'<div class="ver-acts">'+acts.join("")+'</div>':'')+
        '</div>'
      : '')+
    '<div class="ver-wf"><div class="ver-wf-in">'+                                  // wrapper برای انیمیشن باز/بسته‌شدن (grid 0fr→1fr)
      '<div class="ver-wf-sep"></div>'+                                            // خط جداکنندهٔ پیوسته زیر سر ریویژن
      /* ⚠ تگ وضعیت کلاً حذف شد: تایم‌لاین گردش‌کار پایین همین بخش، وضعیت را
         دقیق‌تر می‌گوید — مرحلهٔ انجام‌شده با رنگ و مرحلهٔ فعلی با حلقهٔ متحرک.
         برای سند در انتظار هم مرحلهٔ «ارسال برای بازبینی» انجام‌شده و «تأیید
         توسط بازبین» به‌عنوان مرحلهٔ آینده دیده می‌شود، پس تگ چیزی اضافه نمی‌کرد. */
      (rv.fileId?'':'<div class="ver-bar"><span class="muted" style="font-size:11px">بدون فایل</span></div>')+
      /* ⚠ یادداشت جداگانه حذف شد: همان متن هنگام ثبت به‌عنوان comment در
         گردش‌کار ذخیره می‌شود (Code.gs ▸ addWorkflow) و زیر مرحلهٔ خودش
         دیده می‌شود. تأیید و رد هم comment خودشان را دارند، پس همهٔ
         توضیحات یک‌جا و کنار رویداد مربوطشان نمایش داده می‌شوند. */
      workflowStepsHTML(rv.drawingNumber)+
    '</div></div>'+
  '</div>';
}

/* تایم‌لاین گردش‌کار یک ریویژن: رویدادهای انجام‌شده (حلقهٔ پر) + مراحل آیندهٔ استاندارد (حلقهٔ توخالی) */
/* همان قاعدهٔ «فعالیت‌های اخیر» (fixActivityLines) برای گردش‌کار:
   ▸ اگر توضیح در یک خط جا شود  → نام به خط دوم مستقل می‌رود (کلاس .one)
   ▸ اگر توضیح به خط دوم برسد → نام در ادامهٔ همان خط، پشت جداکنندهٔ نازک
   تفاوت با مرجع: اینجا متن بریده نمی‌شود. در فهرست فعالیت‌ها همهٔ رکوردها باید
   دقیقاً دو‌خطی بمانند تا فهرست یکدست باشد، ولی گردش‌کار سقف ارتفاع ندارد و
   کوتاه‌کردن توضیح فنی سند (که تنها جای دیدنش همین‌جاست) ضرر دارد. */
function wfFixLines(root){
  if(!root) return;
  var lines=root.querySelectorAll(".wf-lines");
  for(var i=0;i<lines.length;i++){
    var el=lines[i];
    var note=el.querySelector(".wf-note");
    if(!note){ el.classList.remove("one"); continue; }   // بدون توضیح: نام از همان خط اول
    el.classList.remove("one");                          // پاک‌سازی تا اندازه‌گیری تمیز باشد
    var tail=el.querySelectorAll(".wf-sep,.wf-who");
    var j;
    var lh=parseFloat(getComputedStyle(el).lineHeight)||17.6;
    // نام موقتاً پنهان می‌شود تا ارتفاع خود توضیح سنجیده شود
    for(j=0;j<tail.length;j++) tail[j].style.display="none";
    var oneLine = note.getBoundingClientRect().height < (lh*1.5);
    for(j=0;j<tail.length;j++) tail[j].style.display="";
    if(oneLine) el.classList.add("one");
  }
}
function workflowStepsHTML(num){
  var d=docByNumber(num); if(!d) return '';
  var status=String(d.status||"").toLowerCase();
  var steps=workflowOf(num).map(function(w){
    /* توضیح و نام کاربر جدا نگه داشته می‌شوند تا در دو خط بیایند:
       اول توضیح، بعد نام ثبت‌کننده. */
    return {label:workflowActionLabel(w.action), color:wfDotColor(w.action), done:true,
            note:String(w.comment||""), who:(userName(w.user)||""), date:fmtDate(w.timestamp)};
  });
  wfFutureSteps(status).forEach(function(a){ steps.push({label:wfFutureLabel(a), done:false, meta:"", date:""}); });
  if(!steps.length) return '<p class="muted" style="padding:6px 2px">رویدادی ثبت نشده.</p>';
  // آخرین مرحلهٔ انجام‌شده = «مرحلهٔ فعلی» → حلقهٔ شعاعی متحرک (مثل رکوردهای فعالیت اخیر داشبورد)
  var lastDone=-1; steps.forEach(function(s,i){ if(s.done) lastDone=i; }); if(lastDone>=0) steps[lastDone].active=true;
  /* ⚠ معکوس‌کردن بعد از تعیین «مرحلهٔ فعلی» انجام می‌شود، وگرنه lastDone به
     عنصر اشتباه اشاره می‌کرد. جدیدترین رویداد بالا می‌آید — همان ترتیبی که
     فهرست ریویژن‌ها دارد (revisionsOf هم نزولی مرتب می‌کند). */
  steps.reverse();
  return '<div class="wf-timeline">'+steps.map(function(s,i){
    var last=(i===steps.length-1);
    return '<div class="wf-step '+(s.done?"done":"todo")+(s.active?" active":"")+'">'+
      '<div class="wf-rail"><span class="wf-ring"'+((s.done&&s.color)?(' style="--wf:'+s.color+'"'):'')+'></span>'+(last?'':'<span class="wf-line"></span>')+'</div>'+
      /* ساختار دو‌خطی «فعالیت‌های اخیر»: توضیح و نام در یک ظرف واحد می‌آیند و
         wfFixLines پس از رندر تصمیم می‌گیرد نام به خط دوم مستقل برود (توضیح
         یک‌خطی) یا در ادامهٔ خط دوم پشت جداکننده بنشیند (توضیح دو‌خطی). */
      '<div class="wf-body"><div class="wf-label">'+esc(s.label)+'</div>'+
        ((s.note||s.who)
          ? '<div class="wf-lines'+(s.note?'':' no-note')+'">'+
              (s.note?'<span class="wf-note" title="'+esc(s.note)+'">'+esc(s.note)+'</span>':'')+
              (s.who?'<span class="wf-sep" aria-hidden="true"></span><span class="wf-who">'+esc(s.who)+'</span>':'')+
            '</div>'
          : '')+
      '</div>'+
      (s.date?'<div class="wf-date">'+esc(s.date)+'</div>':'')+
    '</div>';
  }).join("")+'</div>';
}

/* کلیک روی یک ریویژن: آکاردئون گردش‌کار (هر لحظه یکی باز).
   فایل فقط وقتی دوباره بارگذاری می‌شود که ریویژن دیگری (غیر از ریویژن در حال نمایش) انتخاب شود؛
   کلیک روی همان ریویژن فعلی صرفاً منوی گردش‌کار را باز/بسته می‌کند بدون دریافت دوبارهٔ فایل. */
function dmToggleRev(num){
  var row=document.getElementById("ver-"+num); if(!row) return;
  var willOpen=!row.classList.contains("open");
  var list=document.querySelectorAll(".ver-row"); for(var i=0;i<list.length;i++) list[i].classList.remove("open");
  if(willOpen) row.classList.add("open");
  /* ⚠ سطر بسته ارتفاع صفر دارد (grid-template-rows:0fr)، پس اندازه‌گیری اولیه
     رویش بی‌معناست. پس از باز شدن دوباره سنجیده می‌شود. */
  if(willOpen) wfFixLines(row);
  if(num!==_dm.selNum) dmSelectVersion(num);
}

/* انتخاب یک ریویژن → پیش‌نمایش داخل صفحه + فعال‌کردن دانلود همان ریویژن */
async function dmSelectVersion(num, _retried){
  var d=docByNumber(num); if(!d) return;
  _dm.selNum=num;
  dmApplySelection(d);
  var myToken=++_dpSeq;                      // این بارگذاری؛ اگر بارگذاری تازه‌تری بیاید، این یکی باید بی‌سروصدا کنار برود
  if(_dpEst){ _dpEst.stop(); _dpEst=null; }  // برآوردگر پیش‌نمایش قبلی را متوقف کن تا دو تایمر روی یک المان درصد ننویسند
  // هایلایت ردیف انتخاب‌شده
  var row=document.getElementById("ver-"+num);
  var list=document.querySelectorAll(".ver-row"); for(var i=0;i<list.length;i++) xfSet(list[i],"sel",list[i]===row);
  // وضعیت دکمهٔ دانلود بر اساس ریویژن انتخاب‌شده
  if(is3DType(d.typeCode) || isModelType(d.typeCode)){ dmInit3DDownload(d); }
  else { var dl=document.getElementById("dpDownload"); if(dl) dl.disabled=!d.fileId; }
  /* نقشهٔ دارای مدل: سوییچ «نقشه / مدل سه‌بعدی» روی پیش‌نمایش */
  var glbId=docGlbId(d), canModel=!is3DType(d.typeCode) && !!glbId;
  if(!canModel) _dm.view="doc";
  var asModel=canModel && _dm.view==="model";
  dmRenderViewSwitch(d, canModel);
  var fid=asModel ? glbId : d.fileId;
  // پیش‌نمایش
  var host=document.getElementById("docPreviewHost"); if(!host) return;
  host.classList.remove("is-3d"); host.classList.remove("is-frame");   // پیش‌فرض: قاب عادی flex (عکس/PDF)؛ فقط شاخهٔ سه‌بعدی دوباره فعالش می‌کند
  if(!fid){
    host.innerHTML='<div class="empty-state"><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><div class="es-title">این ریویژن فایلی ندارد</div></div>';
    return;
  }
  var is3D = asModel || String(d.typeCode).toUpperCase()==="3D";
  // نوار پیشرفت درون‌بخشی به‌جای اورلی تمام‌صفحه؛ فایل به‌صورت استریمی در همین بخش لود می‌شود و بقیهٔ سایت آزاد می‌ماند
  /* هم‌سبک لودینگ ویوئر سه‌بعدی: اسپینر لیساژو + عنوان + نام لاتین نوع سند،
     و نوار پیشرفت زیر همه. نام لاتین خط جداگانه و LTR است، وگرنه در یک خط
     فارسی ترتیب کلمات به‌هم می‌ریزد. */
  var _dEn=(typeof typeNameEn==="function")?typeNameEn(d.typeCode):String(d.typeCode||"");
  host.innerHTML=(typeof loadBarHTML==="function")
    ? '<div class="dp-load">'+
        '<div class="mv-empty-ic mv-load-ic">'+((typeof MV_LOAD_IC!=="undefined")?MV_LOAD_IC:"")+'</div>'+
        '<div class="mv-empty-t">'+(asModel?'در حال بارگذاری مدل':'در حال بارگذاری سند')+'</div>'+
        (_dEn?'<div class="mv-load-name">'+esc(_dEn)+'</div>':'')+
      '</div>'+
      /* نوار بیرون .dp-load و در حالت چسبیده‌به‌کف (نه inline) — عیناً مثل ویوئر
         سه‌بعدی؛ مرجع position آن .dp-frame است که relative دارد. */
      loadBarHTML(false, true)
    : '<div class="dm-loading"><div class="spinner" style="width:32px;height:32px;border-width:3px"></div><span>در حال بارگذاری</span></div>';
  var getHost=function(){ return document.getElementById("docPreviewHost"); };
  var est=(typeof loadBarEstimate==="function")?loadBarEstimate(getHost, 94):null;   // پیشرفت نرم تا نوار روی صفر نماند
  _dpEst=est;
  try{
    var r=await getFileRetry(fid, {onProgress: function(loaded,total){ if(est && total>0 && myToken===_dpSeq) est.real(Math.min(99,Math.round(loaded/total*100))); }});
    if(est) est.stop();
    if(_dpEst===est) _dpEst=null;
    // اگر کاربر بین‌بین ریویژن دیگری انتخاب کرده یا پیش‌نمایش بسته شده، این نتیجه را دور بریز
    if(myToken!==_dpSeq) return;
    host=document.getElementById("docPreviewHost"); if(!host) return;
    if(!r||!r.ok){
      var fi=await fileFailInfo(r);
      if(myToken!==_dpSeq) return;
      host=document.getElementById("docPreviewHost"); if(!host) return;
      host.innerHTML=dmFailHTML(fi, num); return;
    }
    var blob=b64toBlob(r.base64, r.mimeType); var url=previewBlobUrl("docPreview", blob);
    // فایل سه‌بعدی (GLB/GLTF) نباید در iframe برود (مرورگر دانلودش می‌کند)؛ با model-viewer نمایش داده می‌شود
    var really3D = is3D || /^model\//.test(r.mimeType||"") || /\.(glb|gltf)$/i.test(r.name||"");
    if(really3D){
      if(typeof ensureModelViewer==="function") await ensureModelViewer();
      if(myToken!==_dpSeq) return;
      host=document.getElementById("docPreviewHost"); if(!host) return;
      if(window.customElements && customElements.get("model-viewer")){
        // قاب پر (بدون flex-centering که لبه را می‌برید) + همان تولباکس پنل پروژه
        host.classList.add("is-3d");
        /* قاب بین پیش‌نمایش‌ها بازاستفاده می‌شود؛ اگر پیش‌نمایش قبلی (PDF/تصویر) اسکرول
           خورده باشد، همان موقعیت می‌ماند و مدل تازه جابه‌جا دیده می‌شود. */
        host.scrollLeft=0; host.scrollTop=0;
        host.innerHTML='<div class="mv-toolwrap">'+
          '<model-viewer id="dmMv" src="'+url+'" camera-controls touch-action="pan-y" shadow-intensity="1" exposure="0.95" '+
            'ar ar-modes="webxr scene-viewer quick-look" ar-scale="auto" alt="مدل سه‌بعدی" style="background:#f4f4f2"><button slot="ar-button" class="mv-ar"></button></model-viewer>'+
          mvPartBadgeHTML(partName(d.partNo))+                                    // برچسب نام انگلیسی قطعه + آیکون سه‌بعدی
          (typeof mvToolbarHTML==="function"?mvToolbarHTML():'')+
        '</div>';
      } else {
        // کتابخانه نیامد: تقریباً همیشه اینترنت ناپایدار است (فایلش در vendor هست)
        host.innerHTML=dmFailHTML(FAIL_ASSET, num);
      }
    } else {
      var isPdf = /pdf/i.test(r.mimeType||"") || /\.pdf$/i.test(r.name||"");
      if(r.mimeType.indexOf("image/")===0){
        host.innerHTML='<img src="'+url+'">';
        dmLensAttach(host);                       // ذره‌بین چسبیده به موس
      }else if(isPdf){
        /* PDF با pdf.js روی canvas رندر می‌شود، نه در iframe.
           دلیل: محتوای iframe به‌خاطر سیاست امنیتی مرورگر خواندنی نیست، پس
           ذره‌بین روی آن ممکن نبود. با canvas، پیکسل‌ها در اختیار ماست. */
        host.classList.add("is-pdf");
        host.scrollLeft=0; host.scrollTop=0;
        await dmRenderPdf(host, blob, myToken);
        if(myToken!==_dpSeq) return;
        dmLensAttach(host);
      }else{
        /* هر چیز دیگری (غیر عکس و PDF) همان ویوئر داخلی مرورگر را می‌گیرد؛
           اسکرول قاب خاموش می‌شود تا دو اسکرول‌بار هم‌زمان پیدا نشود. */
        host.classList.add("is-frame");
        host.scrollLeft=0; host.scrollTop=0;
        host.innerHTML='<iframe src="'+url+'"></iframe>';
      }
    }
  }catch(e){
    if(est) est.stop();
    if(_dpEst===est) _dpEst=null;
    if(myToken!==_dpSeq) return;
    /* فایل رسید ولی نمایش شکست خورد. با اینترنت ناپایدار این معمولاً خرابی فایل نیست (بارگذاری
       ابزار نمایش یا خود دریافت نیمه‌کاره ماند)؛ پس نسخهٔ در حافظه دور ریخته و یک‌بار بی‌صدا از نو
       گرفته می‌شود. فقط اگر بار دوم هم شکست خورد پیام داده می‌شود — و اگر اینترنت قطع است، همان را می‌گوید. */
    if(typeof fileCacheDrop==="function") fileCacheDrop(fid);
    try{ console.warn("[FSM] نمایش پیش‌نمایش ناموفق:", e); }catch(_){}
    if(!_retried){ dmSelectVersion(num, true); return; }
    var online=(typeof siteReachable==="function")?await siteReachable():true;
    if(myToken!==_dpSeq) return;
    host=document.getElementById("docPreviewHost");
    if(host) host.innerHTML=dmFailHTML(online?FAIL_RENDER:FAIL_ASSET, num);
  }
}
/* سوییچ «نقشه / مدل سه‌بعدی» گوشهٔ پیش‌نمایش. اگر مدل از ریویژن قبلی به اشتراک آمده، در حالت مدل گفته می‌شود. */
function dmRenderViewSwitch(d, canModel){
  var slot=document.getElementById("dmViewSw"); if(!slot) return;
  if(!canModel){ slot.innerHTML=""; return; }
  var from=docModelFromRev(d), m=_dm.view==="model";
  slot.innerHTML='<div class="dm-vsw">'+
    '<div class="seg">'+
      '<button type="button" class="seg-btn'+(m?'':' on')+'" onclick="dmSetView(\'doc\')">نقشه</button>'+
      '<button type="button" class="seg-btn'+(m?' on':'')+'" onclick="dmSetView(\'model\')">مدل سه‌بعدی</button>'+
    '</div>'+
    (m && from ? '<span class="dm-vsw-from">مدل ریویژن '+Number(from).toLocaleString("fa-IR",{minimumIntegerDigits:2})+'</span>' : '')+
  '</div>';
}
function dmSetView(v){
  if(_dm.view===v) return;
  _dm.view=v;
  if(_dm.selNum) dmSelectVersion(_dm.selNum);
}
/* حالت خطای پیش‌نمایش: علت واقعی (fileFailInfo / FAIL_RENDER) + توضیح + «تلاش مجدد» */
function dmFailHTML(fi, num){
  return '<div class="empty-state">'+(fi.ic||"")+'<div class="es-title">'+esc(fi.t)+'</div>'+
    '<div class="es-desc">'+esc(fi.d)+'</div>'+dmRetryBtn(num)+'</div>';
}
/* دکمهٔ «تلاش مجدد» برای بارگذاری دوبارهٔ پیش‌نمایش/مدل از ابتدا */
function dmRetryBtn(num){
  return '<button class="btn sm es-retry" onclick="dmSelectVersion(\''+esc(num)+'\')">'+
    '<svg viewBox="0 0 24 24" style="width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>'+
    'تلاش مجدد</button>';
}
/* برچسب نام انگلیسی قطعه (گوشهٔ ویوئر سه‌بعدی) — عیناً المان منوی انتخاب قطعه: آیکون لایه‌ها + رنگ متن (نه نارنجی) */
function mvPartBadgeHTML(name){
  if(!name) return '';
  return '<div class="mv-partbadge">'+MV_LAYERS_IC+'<span class="mv-pb-t">'+esc(name)+'</span></div>';
}

/* ================= دانلود اسناد سه‌بعدی: فهرست فرمت‌ها با هاور =================
   بدون حالت انتخاب: فقط دکمهٔ دانلود کنار هر ردیف همان فرمت را دانلود می‌کند (خود ردیف کلیک‌پذیر نیست) و
   دکمهٔ پایین همیشه همهٔ فرمت‌ها را یکجا دانلود می‌کند. */
/* لیست فرمت‌های موجود روی همین ریویژن (فقط آن‌هایی که واقعاً فایل دارند نشان داده می‌شوند) */
function dm3DFormats(d){
  var f=[];
  if(!is3DType(d.typeCode)){
    var ext=(String(d.fileName||"").match(/\.([a-z0-9]+)$/i)||[])[1]||"PDF";
    if(d.fileId)     f.push({key:"DOC",  label:ext.toUpperCase(), sub:"فایل نقشه",         fileId:d.fileId,     name:d.drawingNumber});
    if(d.stpFileId)  f.push({key:"STP",  label:"STEP",            sub:"مدل سه‌بعدی اصلی",  fileId:d.stpFileId,  name:d.drawingNumber+".stp"});
    if(d.glbFileId)  f.push({key:"GLB",  label:"GLB",             sub:"نمایش سه‌بعدی",     fileId:d.glbFileId,  name:d.drawingNumber+".glb"});
    if(d.usdzFileId) f.push({key:"USDZ", label:"USDZ",            sub:"واقعیت افزوده آیفون", fileId:d.usdzFileId, name:d.drawingNumber+".usdz"});
    return f;
  }
  if(d.fileId)     f.push({key:"GLB",  label:"GLB / GLTF", sub:"نمایش سایت",        fileId:d.fileId,     name:d.drawingNumber+".glb"});
  if(d.stpFileId)  f.push({key:"STP",  label:"STP",         sub:"فرمت اصلی آرشیو",  fileId:d.stpFileId,  name:d.stpFileName||(d.drawingNumber+".stp")});
  if(d.usdzFileId) f.push({key:"USDZ", label:"USDZ",        sub:"واقعیت افزوده",     fileId:d.usdzFileId, name:d.usdzFileName||(d.drawingNumber+".usdz")});
  return f;
}
/* هنگام نمایش هر ریویژن سه‌بعدی: پاپ‌آور فرمت‌ها را می‌سازد.
   هر ردیف هم‌سبک ردیف مرکز دانلود است: کاشی فایل + نام/توضیح + دکمهٔ دانلود. */
var DM_DL_CUBE='<svg viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>';
var DM_DL_ARROW='<svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
function dmInit3DDownload(d){
  var wrap=document.getElementById("dmDlWrap"), pop=document.getElementById("dmDlPop"), btn=document.getElementById("dpDownload");
  if(!wrap||!pop||!btn) return;
  var formats=dm3DFormats(d);
  dmDlSetOpen(false);   // با عوض‌شدن ریویژن، کشو بسته و متن دکمه به حالت اول برمی‌گردد
  if(!formats.length){ pop.innerHTML=""; btn.disabled=true; return; }
  pop.innerHTML='<div class="dm-dl-list"><div class="dm-dl-in">'+formats.map(function(fm){
    return '<div class="dm-dl-opt">'+
      '<span class="dm-dl-tile">'+DM_DL_CUBE+'</span>'+
      '<span class="dm-dl-opt-t"><span class="dm-dl-opt-l">'+esc(fm.label)+'</span><span class="dm-dl-opt-s">'+esc(fm.sub)+'</span></span>'+
      '<button type="button" class="dm-dl-one" title="دانلود '+esc(fm.label)+'" aria-label="دانلود '+esc(fm.label)+'"'+
        ' onclick="event.stopPropagation();dm3DDownloadOne(\''+fm.key+'\')">'+DM_DL_ARROW+'</button>'+
    '</div>';
  }).join("")+'</div></div>';
  btn.disabled=false;
}
/* کشوی فرمت‌ها با کلیک (نه هاور) باز می‌شود: کلیک اول روی دکمهٔ اصلی کشو را رو به بالا باز
   می‌کند و متن دکمه «دانلود همه» می‌شود؛ کلیک دوم همهٔ فرمت‌ها را دانلود می‌کند.
   اگر فقط یک فرمت هست، کشو لازم نیست و همان کلیک اول دانلود می‌کند. */
function dmDlSetOpen(open){
  var wrap=document.getElementById("dmDlWrap"), btn=document.getElementById("dpDownload");
  if(!wrap) return;
  // ارتفاع واقعی دکمه تا پنل دقیقاً دورش بنشیند (درصد در padding نسبت به عرض حساب می‌شود، نه ارتفاع)
  if(open && btn) wrap.style.setProperty("--dlh", btn.offsetHeight+"px");
  wrap.classList.toggle("open", !!open);
  if(btn) btn.setAttribute("aria-expanded", open?"true":"false");
}
function dmDlMain(e){
  if(e) e.stopPropagation();
  var wrap=document.getElementById("dmDlWrap"), d=docByNumber(_dm.selNum);
  if(wrap && d && !wrap.classList.contains("open") && dm3DFormats(d).length>1){ dmDlSetOpen(true); return; }
  dmDownloadSelected();
  dmDlSetOpen(false);
}
/* کلیک بیرون از کشو یا کلید Escape کشو را می‌بندد */
document.addEventListener("click", function(e){
  var wrap=document.getElementById("dmDlWrap");
  if(wrap && wrap.classList.contains("open") && !wrap.contains(e.target)) dmDlSetOpen(false);
});
document.addEventListener("keydown", function(e){
  var wrap=document.getElementById("dmDlWrap");
  if(e.key==="Escape" && wrap && wrap.classList.contains("open")){ e.stopPropagation(); dmDlSetOpen(false); }
}, true);
/* دانلود تکی یک فرمت (دکمهٔ کنار هر ردیف) */
function dm3DDownloadOne(key){
  var d=docByNumber(_dm.selNum); if(!d) return;
  var fm=dm3DFormats(d).filter(function(x){ return x.key===key; })[0];
  if(fm) downloadFile(fm.fileId, fm.name);
}
/* دانلود ریویژن در حال نمایش */
function dmDownloadSelected(){
  var d=docByNumber(_dm.selNum);
  if(!d){ toast("سند یافت نشد.",true); return; }
  var is3D=is3DType(d.typeCode) || isModelType(d.typeCode);
  if(!is3D){
    if(!d.fileId){ toast("این ریویژن فایلی برای دانلود ندارد.",true); return; }
    downloadFile(d.fileId, d.drawingNumber); return;
  }
  var formats=dm3DFormats(d);   // دکمهٔ پایین = همهٔ فرمت‌ها یکجا
  if(!formats.length){ toast("این ریویژن فایلی برای دانلود ندارد.",true); return; }
  formats.forEach(function(fm){ downloadFile(fm.fileId, fm.name); });
}

/* حذف یک ریویژن؛ پس از حذف، دوباره روی ریویژن باقی‌ماندهٔ همان مبنا باز می‌شود */
async function dmDeleteVersion(num){
  var d=docByNumber(num); if(!d) return;
  var isCur=String(d.isLatest).toLowerCase()==="true";
  var msg=isCur ? "حذف «ریویژن فعلی» ("+num+")؟ ریویژن قبلی جایگزین آن می‌شود و فایلش به سطل زبالهٔ گوگل‌درایو می‌رود (تا حدود یک ماه قابل بازیابی)."
                : "حذف ریویژن «"+num+"»؟ فایلش به سطل زبالهٔ گوگل‌درایو می‌رود (تا حدود یک ماه قابل بازیابی).";
  if(!(await uiConfirm(msg,{danger:true,okLabel:"حذف"}))) return;
  /* خوش‌بینانه: ریویژن همین حالا از فهرست بیرون می‌رود و جزئیات روی ریویژن باقی‌مانده باز می‌شود؛
     حذف در پس‌زمینه انجام و اگر ناموفق شد داده از سرور برمی‌گردد. */
  var op=optimisticOp(function(){ localDeleteDoc(num); },
    function(){ return api("deleteDocument",{drawingNumber:num},{silent:true}); });
  dmAfterDelete(d);
  var r=await op;
  if(!r.ok){ toast(r.message||"حذف ناموفق",true); return; }
  toast("ریویژن حذف شد");
}
function dmAfterDelete(d){
  // ریویژن‌های باقی‌ماندهٔ همین مبنا
  var remaining=DB.documents.filter(function(x){
    return x.clientCode===d.clientCode && pad2(x.orderNo)===pad2(d.orderNo) &&
           pad2(x.projectNo)===pad2(d.projectNo) && pad2(x.partNo)===pad2(d.partNo) &&
           String(x.typeCode).toUpperCase()===String(d.typeCode).toUpperCase();
  });
  if(remaining.length){
    var latest=remaining.filter(function(x){return String(x.isLatest).toLowerCase()==="true";})[0]||remaining[0];
    openDocDetail(latest.drawingNumber);   // خودش جای لایهٔ جزئیات کنونی را می‌گیرد
  } else { closeModal(); }
}

/* ============ بارگذاری ریویژن/نسخهٔ جدید (پنل فشرده: فقط فایل + توضیح) ============ */
var _rv = { baseNum:"", mode:"", file:null };

/* سربرگ «ریویژن جدید»: دو سلول — ریویژن فعلی ← ریویژنی که ساخته می‌شود.
   قبلاً فقط شمارهٔ سند مبنا (یعنی ریویژن قبلی) بزرگ نشان داده می‌شد و گمراه‌کننده بود.
   الگو همان ریل ویزارد ثبت سند است: چپ‌به‌راست، مقدار بالا و برچسب لاتین کوچک زیرش،
   و خط اتصال نازک بین سلول‌ها. بخش ریویژن جدا رنگ می‌گیرد تا تنها تفاوت دو شماره دیده شود. */
function rvFlowHTML(d, rs){
  var prev=(rs.latest&&rs.latest.drawingNumber)||d.drawingNumber;
  var stem=["FSM",String(d.clientCode).toUpperCase(),pad2(d.orderNo),pad2(d.projectNo),pad2(d.partNo),String(d.typeCode).toUpperCase()].join("-");
  var prevRev=String(prev).split("-").pop();
  var num=function(rev){ return '<span class="rv-cn">'+esc(stem)+'-<b>'+esc(rev)+'</b></span>'; };
  return '<div class="rv-flow">'+
    '<div class="rv-cell prev">'+num(prevRev)+'<span class="rv-cap">CURRENT REV</span></div>'+
    '<span class="rv-cx" aria-hidden="true"></span>'+
    /* رینگ با SVG (نه conic-gradient): خط با سرعت ثابت روی محیط کادر حرکت می‌کند.
       گرادیان زاویه‌ای در کادر عریض روی ضلع‌های بلند تند و روی ضلع‌های کوتاه کند می‌شد. */
    '<div class="rv-cell next"><svg class="rv-ring" aria-hidden="true"><rect width="100%" height="100%" rx="12" ry="12" pathLength="100"/></svg>'+
      num(pad2(rs.nextRev))+'<span class="rv-cap">NEW REV</span></div>'+
  '</div>';
}
/* تصمیم‌گیر ورودی: بر اساس وضعیت ریویژن فعلی مبنا، حالت درست را باز می‌کند. */
function startRevisionUpload(num){
  var d=docByNumber(num); if(!d){ toast("سند یافت نشد.",true); return; }
  var cur=revisionsOf(d)[0]||d, cst=String(cur.status||"").toLowerCase();
  if(cst==="approved") openRevisionUploadModal(cur.drawingNumber,"revision");
  else if(cst==="rejected") openRevisionUploadModal(cur.drawingNumber,"version");
  else toast("برای بارگذاری، وضعیت ریویژن فعلی باید «تأیید شده» (ریویژن جدید) یا «نیاز به اعمال تغییرات» (نسخهٔ جدید) باشد.",true);
}

function openRevisionUploadModal(baseNum, mode){
  var d=docByNumber(baseNum); if(!d){ toast("سند یافت نشد.",true); return; }
  // نوع سند از روی همان مبنا مشخص می‌شود: برای سه‌بعدی، فرمت آپلود باید همانی بماند که قبلاً ثبت شده (STP/GLB/USDZ)،
  // نه فرمت عمومی PDF/تصویر — وگرنه امکان بارگذاری فایل سه‌بعدی از این مسیر اصلاً وجود نداشت.
  var is3D=is3DType(d.typeCode), isModel=isModelType(d.typeCode);
  var isVer=(mode==="version");
  var rs=revState(d.clientCode,d.orderNo,d.projectNo,d.partNo,d.typeCode);
  /* ریویژن جدید نقشه‌ای که مدل دارد: پیش‌فرض «مدل تغییر نکرده» ← همان مدل ریویژن قبلی به اشتراک گرفته می‌شود */
  var canKeep=isModel && !isVer && docHasModel(rs.latest||d);
  _rv={ baseNum:baseNum, mode:mode, file:null, file3:null, is3D:is3D, isModel:isModel, canKeep:canKeep, modelOn:!canKeep };
  var lead=isVer
    ? 'نسخهٔ اصلاح‌شدهٔ همین ریویژن (بدون تغییر شماره) را بارگذاری کنید؛ نسخهٔ قبلی جایگزین می‌شود.'
    : 'ریویژن بعدی این سند با عنوان «<b>ریویژن '+esc(pad2(rs.nextRev))+'</b>» ثبت می‌شود.';
  var noteLabel=isVer?"توضیحات این نسخه":"توضیحات این ریویژن";
  // نامی که این بارگذاری می‌سازد: نسخهٔ جدید همان شماره را نگه می‌دارد؛ ریویژن جدید شمارهٔ ریویژن بعدی را می‌گیرد
  var newNum=isVer ? baseNum
    : ["FSM",String(d.clientCode).toUpperCase(),pad2(d.orderNo),pad2(d.projectNo),pad2(d.partNo),String(d.typeCode).toUpperCase(),pad2(rs.nextRev)].join("-");
  var upIco='<svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>';
  var stpZone=function(){ return rvDropzoneHTML("rvDrop3","rvFile3",".stp,.step",DZ_MODEL_MAIN,DZ_MODEL_SUB); };
  var dzHTML = is3D
    ? '<div class="nd-up-grid nd-up-1">'+stpZone()+'</div>'
    : isModel
    ? '<div class="nd-up-grid nd-up-2">'+
        rvDropzoneHTML("rvDrop","rvFile",".pdf,image/*",DZ_DRAW_MAIN,DZ_DRAW_SUB)+
        stpZone()+
      '</div>'
    : '<div class="nd-up-grid nd-up-1">'+
        rvDropzoneHTML("rvDrop","rvFile",".pdf,image/*","فایل",DZ_DRAW_SUB)+
      '</div>';
  var infoTxt = (isVer && (is3D || isModel)) ? (is3D
      ? 'فایل STEP اصلاح‌شده را بارگذاری کنید؛ فایل‌های نمایش از روی آن دوباره ساخته می‌شوند.'
      : 'فقط فایلی را بارگذاری کنید که تغییر کرده؛ هر کدام خالی بماند، فایل قبلی همین نسخه می‌ماند.') : '';
  var hint3D = infoTxt ? '<div class="rv-3d-hint">'+RV_INFO+'<span>'+infoTxt+'</span></div>' : '';
  /* چیدمان هم‌الگوی ویزارد ثبت سند: نوار شماره بالا (زمینهٔ خاکستری + سایهٔ زیرش، مثل .nd-rail)،
     و در بدنه اول توضیحات و بعد بارگذاری فایل (مثل .nd-fstack). */
  var body='<div class="rv-band">'+
      (isVer ? '<div class="rv-num mono" style="direction:ltr">'+esc(baseNum)+'</div>' : rvFlowHTML(d, rs))+
    '</div>'+
    '<div class="rv-up">'+
    /* هم‌کلاس توضیح ویزارد ثبت سند (#nRevBanner): نقطهٔ نارنجی + متن ۱۱px کم‌رنگ + بخش پررنگ نارنجی */
    '<div class="nd-revnote">'+lead+'</div>'+
    '<div class="nd-fstack">'+
      '<div class="ndoc-note"><textarea id="rvNote" class="ndoc-note-ta" aria-label="'+esc(noteLabel)+'" placeholder="'+(isVer?"تغییرات این نسخه را بنویسید.":NOTE_PH_REV)+'"></textarea></div>'+
      dzHTML+
    '</div>'+
    hint3D+
    /* ردیف پایانی عیناً مثل ویزارد ثبت سند (.nd-actions): خط جداکننده، «نام سند» قابل‌کپی و دکمهٔ ثبت در انتهای چپ */
    '<div class="nd-actions">'+
      '<div class="nd-namewrap">'+
        '<button type="button" class="nd-nameline" onclick="copyNumWithHint(\''+esc(newNum)+'\',\'rvCopyHint\')" title="برای کپی، روی نام کلیک کنید">'+
          '<span class="nd-name-t">نام سند</span>'+
          '<span class="nd-final-num">'+esc(newNum)+'</span>'+
        '</button>'+
        '<div class="nd-step-hint nd-copy-hint" id="rvCopyHint">'+ND_INFO_IC+'برای کپی کردن نام سند، روی آن کلیک نمایید.</div>'+
      '</div>'+
      '<button class="btn primary" onclick="submitRevisionUpload()">'+upIco+(isVer?'ثبت نسخه':'ثبت ریویژن')+'</button>'+
    '</div>'+
  '</div>';
  showModal(isVer?"بارگذاری نسخهٔ جدید":"بارگذاری ریویژن جدید", body, "box-narrow");
  rvInitDrop("rvDrop","rvFile");
  rvInitDrop("rvDrop3","rvFile3");
  /* ریویژن نقشه‌ای که مدل دارد: تیک گوشهٔ خانهٔ فایل 3D یعنی «مدل هم تغییر کرده».
     خاموش (پیش‌فرض) = خانه خاکستری و همان مدل ریویژن قبلی می‌ماند؛ روشن = خانه مثل خانهٔ نقشه فعال می‌شود. */
  if(canKeep){
    var z3=document.getElementById("rvDrop3");
    if(z3){
      z3.insertAdjacentHTML("afterbegin",'<button type="button" class="ed-check dz-check" role="checkbox" aria-checked="false" '+
        'title="مدل سه‌بعدی هم در این ریویژن تغییر کرده است" onclick="event.preventDefault();event.stopPropagation();rvToggleModel()"></button>');
      z3.addEventListener("click", function(e){ if(!_rv.modelOn){ e.preventDefault(); rvToggleModel(); } });
    }
    rvApplyModelOn();
  }
}
var RV_INFO='<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="12.5"/><circle cx="12" cy="16" r=".6" fill="currentColor" stroke="none"/></svg>';
/* متن یکسان خانه‌های بارگذاری در همهٔ فرم‌ها: خط اول چیست، خط دوم چه فرمتی */
var DZ_DRAW_MAIN="نقشه مهندسی", DZ_DRAW_SUB="PDF یا تصویر", DZ_MODEL_MAIN="فایل 3D", DZ_MODEL_SUB="STEP یا STP";
function rvToggleModel(){
  _rv.modelOn=!_rv.modelOn;
  if(!_rv.modelOn){   // خاموش‌کردن، فایل انتخاب‌شده را هم کنار می‌گذارد
    var inp=document.getElementById("rvFile3"); if(inp) try{ inp.value=""; }catch(e){}
    rvFilePicked("rvDrop3","rvFile3");
  }
  rvApplyModelOn();
}
function rvApplyModelOn(){
  var z=document.getElementById("rvDrop3"); if(!z) return;
  z.classList.toggle("dz-off", !_rv.modelOn);
  var inp=document.getElementById("rvFile3"); if(inp) inp.disabled=!_rv.modelOn;
  var c=z.querySelector(".dz-check");
  if(c){ c.classList.toggle("on", _rv.modelOn); c.setAttribute("aria-checked", _rv.modelOn?"true":"false"); }
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
  else _rv.file=f||null;
  if(f){ if(lbl){ lbl.textContent="✓ "+f.name; lbl.hidden=false; } if(zone) zone.classList.add("has-file"); }
  else { if(lbl){ lbl.textContent=""; lbl.hidden=true; } if(zone) zone.classList.remove("has-file"); }
  if(f && inputId==="rvFile3") stepPicked(inputId, function(){ rvFilePicked(zoneId,inputId); });
}
function rvInitDrop(zoneId,inputId){
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
    var ok = inputId==="rvFile3" ? /\.(stp|step)$/i.test(f.name)
           :                       (/^image\//.test(f.type)||/pdf$/i.test(f.type)||/\.pdf$/i.test(f.name));
    if(!ok){ toast("فرمت فایل مجاز نیست.",true); return; }
    if(inputId==="rvFile3" && _rv.canKeep && !_rv.modelOn) rvToggleModel();   // رهاکردن فایل 3D یعنی مدل تغییر کرده
    try{ var dt=new DataTransfer(); dt.items.add(f); inp.files=dt.files; }
    catch(err){ toast("مرورگر شما از رهاکردن فایل پشتیبانی نمی‌کند؛ از دکمهٔ انتخاب استفاده کنید.",true); return; }
    rvFilePicked(zoneId,inputId);
  });
}
async function submitRevisionUpload(){
  var isVer=(_rv.mode==="version");
  var f=_rv.file, stp=(_rv.is3D || (_rv.isModel && _rv.modelOn)) ? _rv.file3 : null;
  /* «نسخهٔ جدید» (سند ردشده): هر فایلی که خالی بماند، فایل قبلی همین نسخه می‌ماند؛ دست‌کم یکی لازم است.
     «ریویژن جدید» رکورد تازه می‌سازد: فایل نقشه الزامی است و اگر کلید «مدل تغییر کرده» روشن باشد، STEP هم. */
  if(_rv.is3D){
    if(!stp){ toast("بارگذاری فایل STEP الزامی است.",true); return; }
  } else if(isVer){
    if(!f && !stp){ toast(_rv.isModel?"دست‌کم یکی از فایل نقشه یا مدل سه‌بعدی را بارگذاری کنید.":"بارگذاری فایل الزامی است.",true); return; }
  } else {
    if(!f){ toast("بارگذاری فایل الزامی است.",true); return; }
    if(_rv.canKeep && _rv.modelOn && !stp){ toast("مدل تازه را بارگذاری کنید، یا کلید «مدل تغییر کرده» را خاموش کنید.",true); return; }
  }
  if(f && f.size>25*1024*1024){ toast("حجم فایل بیش از ۲۵ مگابایت است.",true); return; }
  var ta=document.getElementById("rvNote"); var note=ta?String(ta.value).trim():"";
  var base=docByNumber(_rv.baseNum); if(!base){ toast("سند یافت نشد.",true); return; }
  var b64=f?(await fileToBase64(f)):null;
  // انتخاب اندپوینت/پیلود بر اساس حالت (ریویژن جدید همان مبنا یا سند جدید)
  var action, payload, label;
  if(isVer){
    action="uploadNewVersion";
    payload={drawingNumber:_rv.baseNum, note:note};
    label=_rv.baseNum;
  } else {
    var rs=revState(base.clientCode,base.orderNo,base.projectNo,base.partNo,base.typeCode);
    action="createDocument";
    payload={clientCode:base.clientCode, orderNo:base.orderNo, projectNo:base.projectNo,
        partNo:base.partNo, typeCode:base.typeCode, rev:rs.nextRev, title:note};
    if(_rv.canKeep && !_rv.modelOn) payload.keepModel=true;   // فقط نقشه عوض شده: مدل ریویژن قبلی مشترک می‌ماند
    label=base.drawingNumber;
  }
  if(f){ payload.fileBase64=b64; payload.fileName=f.name; payload.mimeType=f.type; }
  /* STEP ← GLB و USDZ و حجم، ساخته‌شده در مرورگر (برای 3D قدیمی، GLB همان فایل اصلی است) */
  if(stp){
    try{ Object.assign(payload, await stepPayload(stp, _rv.is3D)); }
    catch(e){ toast(stepErrMsg(e),true); return; }
  }
  // آپلود به «مرکز انتقال» می‌رود؛ مودال بلافاصله بسته می‌شود و ارسال برای بازبینی خودکار انجام می‌شود.
  closeModal();
  dlEnqueueUpload({
    label: label, action: action, payload: payload,
    onSuccess: async function(r){
      if(!r || !r.ok){ toast((r&&r.message)||"بارگذاری ناموفق",true); return; }
      toast("بارگذاری شد");
      var sr=await uploadedThenSubmit(r, payload, isVer?{num:payload.drawingNumber, note:note}:null);
      if(sr && sr.ok) toast("برای بازبینی ارسال شد");
    }
  });
}
