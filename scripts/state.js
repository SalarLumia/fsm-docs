/* ================= حالت برنامه ================= */
var DB = { clients:[], orders:[], projects:[], parts:[], docTypes:[], documents:[], users:[], templates:[], workflow:[], partMods:[], trashedDocs:[] };
var ME = { token:null, role:null, name:null, username:null, gender:null, position:null, avatar:null };

/* مجموعهٔ آواتارهای قابل‌انتخاب (خودبسنده، بدون منبع بیرونی) */
var AVATARS = ["👤","🧑","👨‍💼","👩‍💼","👨‍🔧","👩‍🔧","👨‍🏭","👩‍🏭","👨‍🔬","👩‍🔬","👨‍💻","👩‍💻","👷","👷‍♀️","🧑‍🎓","🦺"];

/* ================= مدیریتِ URLهای بلاب (پیش‌نمایش) =================
   نشتِ حافظه در جلسه‌های طولانی از اینجا می‌آمد: هر پیش‌نمایشِ فایل یا مدلِ سه‌بعدی
   یک URL.createObjectURL می‌ساخت که هیچ‌وقت آزاد نمی‌شد. حالا هر «کانال» فقط یک URLِ زنده
   دارد؛ ساختِ URLِ تازه، قبلی را revoke می‌کند، و بستنِ مودال/ترکِ پنل کانالش را آزاد می‌کند. */
var _blobUrls = {};
function previewBlobUrl(channel, blob){
  releaseBlobUrl(channel);
  var url = URL.createObjectURL(blob);
  _blobUrls[channel] = url;
  return url;
}
function releaseBlobUrl(channel){
  var u = _blobUrls[channel];
  if(u){ try{ URL.revokeObjectURL(u); }catch(e){} delete _blobUrls[channel]; }
}

/* ================= توابع کمکی پایه ================= */
function pad2(v){ v=String(v==null?"":v).trim(); if(v==="")return""; if(/^\d+$/.test(v)){while(v.length<2)v="0"+v;return v;} return v.toUpperCase(); }
/* تبدیلِ ارقامِ فارسی/عربی به لاتین — تا کدهایی که با کیبوردِ فارسی تایپ می‌شوند («۳D») رد نشوند. */
function enDigits(s){ return String(s==null?"":s)
  .replace(/[۰-۹]/g,function(d){return String("۰۱۲۳۴۵۶۷۸۹".indexOf(d));})
  .replace(/[٠-٩]/g,function(d){return String("٠١٢٣٤٥٦٧٨٩".indexOf(d));}); }
/* شمارهٔ ریویژن در کد نقشه: تک‌رقمی 0..9 (بدون صفرِ ابتدایی؛ «00» معنی ندارد). */
function revFmt(v){ v=String(v==null?"":v).trim(); if(v==="")return""; var n=parseInt(v,10); return isNaN(n)?"":String(n); }
function clientName(code){ var c=DB.clients.find(function(x){return x.code===code}); return c?c.name:code; }
/* نام لاتینِ مشتری برای قالبِ مشخصاتِ پروژه (LTR)؛ اگر ثبت نشده بود، به نامِ فارسی و سپس کد برمی‌گردد. */
function clientNameEn(code){ var c=DB.clients.find(function(x){return x.code===code}); return (c&&c.nameEn)?c.nameEn:(c?c.name:code); }
function typeName(code){ var t=DB.docTypes.find(function(x){return String(x.code).toUpperCase()===String(code).toUpperCase()}); return t?(t.nameFa||t.code):code; }
function typeScope(code){ var t=DB.docTypes.find(function(x){return String(x.code).toUpperCase()===String(code).toUpperCase()}); return t?t.scope:"part"; }
function partName(no){ if(pad2(no)==="00")return"سند پروژه"; var p=DB.parts.find(function(x){return pad2(x.partNo)===pad2(no)}); return p?p.name:no; }
function partRec(no){ return DB.parts.find(function(x){return pad2(x.partNo)===pad2(no);})||null; }
/* نام فارسی قطعه (اگر بود)، وگرنه نام انگلیسی */
function partNameFa(no){ if(pad2(no)==="00")return"سند پروژه"; var p=partRec(no); return p?(p.nameFa||p.name||pad2(no)):pad2(no); }
/* نامِ خالصِ پروژه (توضیحِ واردشده) از روی مختصاتِ یک سند — بدونِ هیچ پیشوند.
   ⚠ عمداً «خالص» است: اگر خودش پیشوند بگذارد، فراخوان نمی‌تواند بداند پیشوند دارد یا نه
   و نتیجه‌اش «پروژه پروژهٔ ۰۱» می‌شود. پیشوند فقط کارِ projectTitle است. */
function projectName(d){
  if(!d) return "";
  // مقایسهٔ نرمال‌شده: کدِ مشتری گاهی با حروفِ کوچک/بزرگِ متفاوت ذخیره شده و شماره‌ها
  // ممکن است از شیت به‌صورتِ عدد بیایند (۱ به‌جای «۰۱»)، پس هر دو سمت یکسان‌سازی می‌شوند.
  var cc=String(d.clientCode||"").trim().toUpperCase();
  var p=(DB.projects||[]).find(function(x){
    return String(x.clientCode||"").trim().toUpperCase()===cc &&
           pad2(x.orderNo)===pad2(d.orderNo) && pad2(x.projectNo)===pad2(d.projectNo);
  });
  return (p&&p.description)?String(p.description).trim():"";
}
/* عنوانِ کاملِ پروژه، هم‌واژهٔ تیترِ صفحهٔ پروژه و کارتِ داشبورد: «پروژه تولید <نام>».
   اگر پروژه هنوز نامی ندارد، به شماره برمی‌گردد و آن‌وقت پیشوندِ درست «پروژهٔ» است. */
function projectTitle(d){
  var n=projectName(d);
  return n ? ("پروژه تولید "+n) : ("پروژهٔ "+pad2(d.projectNo));
}
/* سازگاری با فراخوان‌های قدیمی — همان عنوانِ کامل */
function projectLabel(d){ return projectTitle(d); }
/* توصیف طبیعیِ یک سند (راست‌به‌چپ): نوع نقشه، قطعه، پروژه (بدون شماره)، مشتری.
   برای اسناد سطح‌پروژه (قطعهٔ ۰۰) بخش «قطعه» حذف می‌شود. */
function docPhrase(d){
  var parts=[typeName(d.typeCode)];
  if(pad2(d.partNo)!=="00") parts.push("قطعه "+partNameFa(d.partNo));
  parts.push(projectTitle(d));   // خودِ عنوان پیشوند دارد؛ پیشوندِ دوم = «پروژه پروژهٔ ۰۱»
  parts.push(clientName(d.clientCode));
  return parts.join(" ");
}
function esc(s){ return String(s==null?"":s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];}); }
function todayISO(){ return new Date().toISOString().slice(0,10); }
function csv(s){ return String(s==null?"":s).split(",").map(function(x){return x.trim();}).filter(Boolean); }

/* ================= آیکون‌های خطیِ مشترک (یک‌دست در کل سایت) ================= */
function svgIcon(inner){ return '<svg viewBox="0 0 24 24" class="ic">'+inner+'</svg>'; }
var ICON = {
  plus:  svgIcon('<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>'),
  edit:  svgIcon('<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>'),
  trash: svgIcon('<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>'),
  open:  svgIcon('<path d="M15 3h6v6"/><path d="M10 14 L21 3"/><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/>'),
  check: svgIcon('<polyline points="20 6 9 17 4 12"/>'),
  x:     svgIcon('<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>'),
  copy:  svgIcon('<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>'),
  download: svgIcon('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>'),
  upload: svgIcon('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>'),
  send:  svgIcon('<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>')
};
/* دکمه‌های آیکونیِ استاندارد — همه‌جای سایت از همین‌ها استفاده کند تا یک‌دست بماند. onclick رشتهٔ کامل هندلر است. */
function editIconBtn(onclick,title){ return '<button class="icon-btn sm" title="'+(title||"ویرایش")+'" onclick="'+onclick+'">'+ICON.edit+'</button>'; }
function delIconBtn(onclick,title){ return '<button class="icon-btn sm danger" title="'+(title||"حذف")+'" onclick="'+onclick+'">'+ICON.trash+'</button>'; }
function viewIconBtn(onclick,title){ return '<button class="icon-btn sm" title="'+(title||"نمایش")+'" onclick="'+onclick+'">'+ICON.open+'</button>'; }
function approveIconBtn(onclick,title){ return '<button class="icon-btn sm ok" title="'+(title||"تأیید")+'" onclick="'+onclick+'">'+ICON.check+'</button>'; }
function rejectIconBtn(onclick,title){ return '<button class="icon-btn sm rej" title="'+(title||"رد")+'" onclick="'+onclick+'">'+ICON.x+'</button>'; }
function downloadIconBtn(onclick,title){ return '<button class="icon-btn sm" title="'+(title||"دانلود")+'" onclick="'+onclick+'">'+ICON.download+'</button>'; }
function sendIconBtn(onclick,title){ return '<button class="icon-btn sm" title="'+(title||"ارسال برای بازبینی")+'" onclick="'+onclick+'">'+ICON.send+'</button>'; }
function uploadIconBtn(onclick,title){ return '<button class="icon-btn sm" title="'+(title||"آپلود ریویژن جدید")+'" onclick="'+onclick+'">'+ICON.upload+'</button>'; }

/* ================= مرتب‌سازی سراسری (کد/شماره صعودی، از ۱) ================= */
function numOf(v){ var n=parseInt(String(v==null?"":v).replace(/[^\d]/g,""),10); return isNaN(n)?0:n; }
function byCode(a,b){ return String(a.code).localeCompare(String(b.code),"en"); }
/* ترتیبِ دستیِ مشتری‌ها: ابتدا بر اساسِ فیلدِ order (اگر تنظیم شده)، سپس کد.
   همین ترتیب هم در ریلِ مشتریان و هم در درختِ سایدبار استفاده می‌شود. */
function clientOrderVal(c){ return (c.order===undefined||c.order===null||c.order==="")?9999:Number(c.order); }
function clientsSorted(){ return DB.clients.slice().sort(function(a,b){
  var d=clientOrderVal(a)-clientOrderVal(b); return d!==0?d:byCode(a,b); }); }
function docTypesSorted(){ return DB.docTypes.slice().sort(byCode); }
/* فهرستِ اصلیِ ماژول‌های اطلاعاتِ قطعه (سراسری)، مرتب بر اساس order سپس نام */
function partModsSorted(){ return (DB.partMods||[]).filter(function(m){ return String(m.active).toLowerCase()!=="false" && String(m.nameFa||"").trim()!==""; })
  .slice().sort(function(a,b){ var d=(Number(a.order)||0)-(Number(b.order)||0); return d!==0?d:String(a.nameFa).localeCompare(String(b.nameFa),"fa"); }); }
function partsSorted(){ return DB.parts.slice().sort(function(a,b){ return numOf(a.partNo)-numOf(b.partNo); }); }
function ordersOf(clientCode){ return DB.orders.filter(function(o){ return o.clientCode===clientCode; })
  .sort(function(a,b){ return numOf(a.orderNo)-numOf(b.orderNo); }); }
function projectsOf(clientCode, orderNo){
  return DB.projects.filter(function(p){ return p.clientCode===clientCode && (orderNo===undefined || pad2(p.orderNo)===pad2(orderNo)); })
    .sort(function(a,b){ return (numOf(a.orderNo)-numOf(b.orderNo)) || (numOf(a.projectNo)-numOf(b.projectNo)); });
}
/* متادیتای مشتری (راست‌به‌چپ و بدون ایراد bidi): «نامِ لاتین | کد | N سفارش | M پروژه».
   با inline-flex ترتیب قطعی می‌شود و با <bdi> هر بخش از بقیه ایزوله می‌ماند.
   جداکننده = خطِ عمودیِ نازک (هم‌سبکِ سطلِ زباله). شمارشگرها با ارقامِ فارسی. */
function clientMetaHTML(code, ordersCount, projectsCount){
  var en=clientNameEn(code);
  var sep='<span class="cmeta-sep" aria-hidden="true"></span>';
  return '<span class="cmeta">'+
    (en?'<bdi class="cmeta-en">'+esc(en)+'</bdi>'+sep:'')+
    '<bdi class="mono">'+esc(code)+'</bdi>'+
    sep+
    '<bdi>'+faN(ordersCount)+' سفارش</bdi>'+
    sep+
    '<bdi>'+faN(projectsCount)+' پروژه</bdi>'+
  '</span>';
}
/* نام نمایشی کاربر از روی نام کاربری (نه خود نام کاربری) */
function userName(u){
  if(!u) return "";
  var rec=(DB.users||[]).find(function(x){ return String(x.username)===String(u); });
  return rec ? (rec.name||rec.username) : u;
}

/* تاریخ کامل شمسی (سال/ماه/روز) */
function fmtDate(ts){
  if(!ts) return "";
  var d=new Date(ts);
  if(isNaN(d)) return ts.slice?ts.slice(0,10):"";
  return d.toLocaleDateString("fa-IR",{year:"numeric",month:"long",day:"numeric"});
}
/* تاریخ + ساعت شمسی از یک timestamp */
function fmtDateTime(ts){
  if(!ts) return "";
  var d=new Date(ts); if(isNaN(d)) return String(ts).slice(0,10);
  return d.toLocaleDateString("fa-IR",{year:"numeric",month:"long",day:"numeric"})+" — "+
         d.toLocaleTimeString("fa-IR",{hour:"2-digit",minute:"2-digit"});
}
/* ساعت سپس تاریخ (برای نمایش راست‌به‌چپ: اول ساعت، بعد تاریخ) */
function fmtTimeDate(ts){
  if(!ts) return "";
  var d=new Date(ts); if(isNaN(d)) return String(ts).slice(0,10);
  return d.toLocaleTimeString("fa-IR",{hour:"2-digit",minute:"2-digit"})+" — "+
         d.toLocaleDateString("fa-IR",{year:"numeric",month:"long",day:"numeric"});
}
/* روز و تاریخ و ساعت کامل شمسی برای نوار بالا (از یک Date) */
function fmtDateTimeShamsi(d){
  d = d || new Date();
  var date = d.toLocaleDateString("fa-IR",{weekday:"long",year:"numeric",month:"long",day:"numeric"});
  var time = d.toLocaleTimeString("fa-IR",{hour:"2-digit",minute:"2-digit"});
  return date + " — " + time;
}
/* نسخهٔ HTMLِ ساعت هدر — استانداردِ فارسی و راست‌به‌چپ.
   دو نکته: (۱) الگوی ترکیبیِ locale برای fa-IR ترتیبِ اجزا را نامرتب برمی‌گرداند
   («۱۴۰۵ تیر ۲۸، یکشنبه»)، پس تاریخ را جزء‌به‌جزء در ترتیب درست می‌سازیم:
   «یکشنبه ۲۸ تیر ۱۴۰۵». (۲) تاریخ و ساعت هرکدام در <bdi> ایزوله می‌شوند تا اعداد و
   جداکننده در بستر RTL جابه‌جا نشوند (تاریخ سمت راست، ساعت سمت چپ). */
function fmtClockHTML(d){
  d = d || new Date();
  var wd  = d.toLocaleDateString("fa-IR",{weekday:"long"});
  var day = d.toLocaleDateString("fa-IR",{day:"numeric"});
  var mon = d.toLocaleDateString("fa-IR",{month:"long"});
  var yr  = d.toLocaleDateString("fa-IR",{year:"numeric"});
  var date= wd+" "+day+" "+mon+" "+yr;
  return '<bdi>'+esc(date)+'</bdi>';   // فقط تاریخ (ساعت حذف شد)
}

/* ================= نقش، جنسیت، وضعیت ================= */
function roleLabel(r){ return r==="admin"?"مدیر":(r==="reviewer"?"بازبین":"بیننده"); }
/* پیشوند احترام برای هدر/جدول: «آقای/خانم + نام». (گزینهٔ جنسیت در فرم «آقا/خانم» است.) */
function honorific(gender){ return gender==="female"?"خانم":(gender==="male"?"آقای":""); }
/* وضعیت تأیید سند → کلاس نشان + برچسب */
function statusInfo(status){
  var s=String(status||"").toLowerCase();
  if(s==="approved"||s==="active") return {cls:"badge-approved",label:"تأیید"};
  if(s==="pending")  return {cls:"badge-pending", label:"بازبینی"};   /* یکی‌شده با تگِ رویدادِ «بازبینی» (هم‌مفهوم) */
  if(s==="rejected") return {cls:"badge-rejected",label:"عدم تایید"};
  return {cls:"badge-draft",label:"ایجادشده"};
}
/* آیکونِ اختصاصیِ هر بج (جایگزینِ نقطهٔ عمومی) — بر اساسِ کلاسِ بج انتخاب می‌شود */
function badgeIcon(cls){
  var c=String(cls||"");
  var check='<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>';
  var clock='<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></svg>';
  var eye='<svg viewBox="0 0 24 24"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>';
  var cross='<svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  var pencil='<svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>';
  var ban='<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><line x1="5.6" y1="5.6" x2="18.4" y2="18.4"/></svg>';
  if(/inactive/.test(c)) return ban;
  if(/approved|active/.test(c)) return check;
  if(/pending/.test(c)) return clock;
  if(/review/.test(c)) return eye;
  if(/rejected/.test(c)) return cross;
  return pencil;   // draft/archived و پیش‌فرض
}
/* رندرِ کاملِ یک بج: آیکونِ اختصاصی + برچسبِ کوتاه (همه‌جای سایت از این استفاده می‌کند) */
function badgeHTML(cls,label){ return '<span class="badge '+cls+'">'+badgeIcon(cls)+esc(label)+'</span>'; }
function workflowActionLabel(a){
  return { created:"ایجاد سند", revision:"ایجاد سند", submitted:"ارسال برای بازبینی",
           newversion:"بارگذاری نسخهٔ جدید", approved:"تأیید شد", rejected:"تأیید نشد",
           addformat:"افزودن فرمت" }[a] || a;
}
/* رنگ حلقهٔ هر رویداد در تایم‌لاین گردش‌کار.
   مراحل پیشروی همگی نارنجیِ برند‌اند (یک‌دست، بدون اختلاف سایه)؛
   فقط نتیجهٔ نهایی رنگ معنایی می‌گیرد: تأیید سبز، رد قرمز. */
function wfDotColor(action){
  return { created:"var(--brand)", revision:"var(--brand)", submitted:"var(--brand)",
           newversion:"var(--brand)", approved:"var(--ok)", rejected:"var(--err)",
           addformat:"var(--brand)" }[action] || "var(--muted)";
}
/* برچسب مراحلِ هنوز‌انجام‌نشده (حلقه‌های توخالیِ آینده) */
function wfFutureLabel(a){
  return { submitted:"ارسال برای بازبینی", approved:"تأیید توسط بازبین", newversion:"بارگذاری نسخهٔ جدید" }[a] || a;
}
/* مراحل آیندهٔ استاندارد بر اساس وضعیت فعلی یک ریویژن */
function wfFutureSteps(status){
  return { draft:["submitted","approved"], pending:["approved"],
           rejected:["newversion","submitted","approved"], approved:[] }[String(status||"").toLowerCase()] || [];
}
/* وضعیت ریویژنی یک مبنا (برای پنل ثبت سند):
   mode: "new" (اولین، ریویژن 00) | "revision" (ریویژن فعلی تأییدشده → مجاز) | "blocked" (ریویژن فعلی هنوز تأیید نشده). */
function revState(c,o,pr,pt,ty){
  var C=String(c).toUpperCase(), O=pad2(o), P=pad2(pr), PT=pad2(pt), TY=String(ty).toUpperCase();
  var base=(DB.documents||[]).filter(function(d){
    return String(d.clientCode).toUpperCase()===C && pad2(d.orderNo)===O && pad2(d.projectNo)===P &&
           pad2(d.partNo)===PT && String(d.typeCode).toUpperCase()===TY;
  });
  if(!base.length) return {mode:"new", nextRev:"0", maxRev:-1, latest:null};
  var maxRev=-1, latest=null;
  base.forEach(function(d){ var r=parseInt(d.rev,10); if(isNaN(r))r=0; if(r>=maxRev){ maxRev=r; latest=d; } });
  var approved=String(latest.status||"").toLowerCase()==="approved";
  return {mode:approved?"revision":"blocked", nextRev:revFmt(maxRev+1), maxRev:maxRev, latest:latest};
}

/* ================= ماژول‌های سند و تکمیل پروژه =================
   مدل داده: هر پروژه دو دستهٔ ماژول دارد —
   ۱) سطح‌پروژه: انواع سند با scope=project (روی قطعهٔ 00). ذخیره در p.enabledTypes.
   ۲) سطح‌قطعه: برای هر قطعهٔ پروژه، انواع سند با scope=part. هر «اسلات» = «PART-TYPE»
      و در p.enabledSlots ذخیره می‌شود؛ قطعاتِ پروژه در p.projectParts.
   هر ماژولی که سند داشته باشد، خودکار «روشن» شمرده می‌شود. */
function projectDocs(p){
  return DB.documents.filter(function(d){
    return d.clientCode===p.clientCode && pad2(d.orderNo)===pad2(p.orderNo) && pad2(d.projectNo)===pad2(p.projectNo);
  });
}
/* کد انواع سطح‌پروژه */
function projTypeCodes(){ return DB.docTypes.filter(function(t){return t.scope==="project";}).map(function(t){return String(t.code).toUpperCase();}); }
/* انواع سطح‌پروژهٔ «روشن» = ذخیره‌شده (فیلترشده به سطح‌پروژه) ∪ دارای سند سطح‌پروژه */
function projectProjTypes(p){
  var codes=projTypeCodes(), set={};
  /* ⚠ مثلِ projectPartSlots: منبعِ اصلی specs.projDocTypes است — همانی که
     بندِ «مستندات پروژه» از روی آن رسم می‌شود. enabledTypes ذخیرهٔ قدیمی است
     و فقط وقتی به کار می‌آید که ساختارِ تازه وجود نداشته باشد. */
  var fromSpecs=(function(){
    try{
      var r=(typeof specsRoot==="function")?specsRoot(p):null;
      return (r&&r.projDocTypes)?r.projDocTypes:null;
    }catch(e){ return null; }
  })();
  if(fromSpecs){ fromSpecs.forEach(function(t){ var u=String(t).toUpperCase(); if(u) set[u]=1; }); }
  else { csv(p.enabledTypes||"").forEach(function(t){ var u=String(t).toUpperCase(); if(codes.indexOf(u)>=0) set[u]=1; }); }
  projectDocs(p).forEach(function(d){ if(pad2(d.partNo)==="00"){ set[String(d.typeCode).toUpperCase()]=1; } });
  return Object.keys(set);
}
/* قطعات پروژه = ذخیره‌شده ∪ قطعاتِ دارای سند (به‌جز 00). خروجی: آرایهٔ کد قطعه، مرتب. */
function projectPartsList(p){
  var set={};
  csv(p.projectParts||"").forEach(function(x){ var u=pad2(x); if(u && u!=="00") set[u]=1; });
  projectDocs(p).forEach(function(d){ var pn=pad2(d.partNo); if(pn && pn!=="00") set[pn]=1; });
  return Object.keys(set).sort(function(a,b){ return numOf(a)-numOf(b); });
}
/* تجزیهٔ یک اسلات «PART-TYPE» → {part,type} (یا null) */
function parseSlot(s){
  s=String(s||"").toUpperCase().trim(); if(!s) return null;
  var i=s.indexOf("-"); if(i<0) return null;
  var part=pad2(s.slice(0,i)), type=s.slice(i+1).replace(/\s/g,"");
  if(!part||!type||part==="00") return null;
  return {part:part, type:type};
}
/* اسلات‌های سطح‌قطعهٔ «روشن» = ذخیره‌شده ∪ دارای سند. خروجی: آرایهٔ {part,type}. */
function projectPartSlots(p){
  var map={};
  /* ⚠ منبعِ درست: ساختارِ per-part در specs.partDocsByPart — همانی که پنلِ
     «قطعات پروژه» از روی آن رسم می‌شود. پیش‌تر فقط enabledSlots (ذخیرهٔ قدیمیِ
     سطحِ پروژه) خوانده می‌شد؛ پس ماژول‌هایی که از پنلِ ویرایشِ قطعه
     تعریف شده بودند در شمارش نمی‌آمدند و درصد اشتباه بالا می‌رفت. */
  var perPart=(function(){
    try{
      var r=(typeof specsRoot==="function")?specsRoot(p):null;
      return (r&&r.partDocsByPart)?r.partDocsByPart:null;
    }catch(e){ return null; }
  })();
  if(perPart){
    projectPartsList(p).forEach(function(pn){
      var arr=perPart[pn];
      if(arr && arr.length){ arr.forEach(function(T){
        T=String(T).toUpperCase(); if(T) map[pn+"-"+T]={part:pn,type:T}; }); }
      else { /* قطعه‌ای که هنوز پیکربندیِ per-part ندارد → fallbackِ سطحِ پروژه */
        csv(p.enabledSlots||"").forEach(function(sl){ var m=parseSlot(sl);
          if(m && m.part===pn) map[m.part+"-"+m.type]=m; }); }
    });
  } else {
    csv(p.enabledSlots||"").forEach(function(sl){ var m=parseSlot(sl); if(m) map[m.part+"-"+m.type]=m; });
  }
  // هر سندِ موجود هم یک ماژولِ واقعی است، حتی اگر در پیکربندی نباشد
  projectDocs(p).forEach(function(d){ var pn=pad2(d.partNo); if(pn && pn!=="00"){ var t=String(d.typeCode).toUpperCase(); map[pn+"-"+t]={part:pn,type:t}; } });
  return Object.keys(map).map(function(k){ return map[k]; });
}
/* آخرین سند یک نوع مدرک داخل یک پروژه (بدون توجه به قطعه) */
function latestDocOfType(pdocs, typeCode){
  var list=pdocs.filter(function(d){ return String(d.typeCode).toUpperCase()===String(typeCode).toUpperCase(); });
  if(!list.length) return null;
  list.sort(function(a,b){ return (b.timestamp||"").localeCompare(a.timestamp||""); });
  return list[0];
}
/* تکمیل بر پایهٔ ماژول‌ها: مجموع ماژول‌های روشن (سطح‌پروژه + اسلات‌های قطعه)؛
   هر ماژولی که حداقل یک سند دارد = پوشش‌داده‌شده. */
function projectStats(p){
  var pdocs=projectDocs(p);
  var projTypes=projectProjTypes(p);            // ["QP",...]
  var slots=projectPartSlots(p);                // [{part,type},...]
  var modules=projTypes.map(function(T){ return {part:"00",type:T}; }).concat(slots);
  var hasDocFor=function(m){ return pdocs.some(function(d){ return pad2(d.partNo)===m.part && String(d.typeCode).toUpperCase()===m.type; }); };
  var covered=modules.filter(hasDocFor);
  var missingMods=modules.filter(function(m){ return !hasDocFor(m); });
  var total=modules.length, reg=covered.length;
  // درصدِ «تکمیل» بر پایهٔ اسنادِ «تأییدشده» است (نه ثبت‌شده)، تا در همهٔ نماها (پنل مشتری، داشبورد،
  // صفحهٔ جزئیات) و با تگِ «کامل» یکدست باشد. reg/total همچنان شمارشِ «ثبت‌شده» را نگه می‌دارد.
  var isApp=function(d){ var s=String(d.status||"").toLowerCase(); return s==="approved"||s==="active"; };
  var hasAprFor=function(m){ return pdocs.some(function(d){
    return pad2(d.partNo)===m.part && String(d.typeCode).toUpperCase()===m.type && isApp(d); }); };
  var aprMods=modules.filter(hasAprFor);
  var apr=aprMods.length;
  /* «باقی‌مانده» = هر ماژولی که هنوز سندِ تأییدشده ندارد — چه اصلاً سندی برایش
     بارگذاری نشده باشد، چه سندش هنوز در مرحلهٔ بازبینی باشد. این همان عددی است
     که در جریانِ کارِ واقعی معنی دارد: چقدر تا کاملِ واقعی مانده. */
  var pendingMods=modules.filter(function(m){ return !hasAprFor(m); });
  var pct=total>0?Math.min(100,Math.round(apr/total*100)):0;   // درصدِ تکمیل = تأییدشده ÷ کل
  var regPct=total>0?Math.min(100,Math.round(reg/total*100)):0; // سطحِ «ثبت‌شده» (وجودِ سند، هر وضعیتی)
  var last=pdocs.reduce(function(m,d){return (d.timestamp||"")>m?(d.timestamp||""):m;},"");
  var lbl=function(m){ return typeName(m.type)+(m.part!=="00"?(" — "+partNameFa(m.part)):""); };
  var missingLabels=missingMods.map(lbl);        // فقط آن‌هایی که هیچ سندی ندارند
  var pendingLabels=pendingMods.map(lbl);        // همهٔ آن‌هایی که هنوز تأیید نشده‌اند
  /* ماژول‌هایی که سند دارند ولی هنوز تأیید نشده‌اند (در بازبینی/پیش‌نویس/ردشده) */
  var inRev=pendingMods.length-missingMods.length;
  var st = (total>0 && apr>=total) ? {cls:"badge-approved",label:"کامل",bar:"var(--ok)"}
         : reg>0                   ? {cls:"badge-pending", label:"در حال تکمیل",bar:"var(--warn)"}
         :                           {cls:"badge-draft",   label:"شروع‌نشده",bar:"#d4d3ce"};
  return {pct:pct,regPct:regPct,reg:reg,total:total,apr:apr,
          miss:pendingMods.length,            // باقی‌مانده = هنوز تأییدنشده (نه‌فقط بی‌سند)
          noDoc:missingMods.length,           // زیرمجموعه: اصلاً سندی ندارند
          inRev:inRev,                        // زیرمجموعه: سند دارند ولی تأیید نشده
          missingLabels:missingLabels,pendingLabels:pendingLabels,
          modules:modules,last:last,status:st,docCount:pdocs.length,
          name:p.description||"پروژهٔ بدون نام",client:clientName(p.clientCode),
          c:p.clientCode,o:pad2(p.orderNo),pr:pad2(p.projectNo),proj:p};
}

/* ================= ریویژن‌ها و گردش‌کار ================= */
function docByNumber(num){ return DB.documents.find(function(d){return d.drawingNumber===num;})||null; }
/* سندِ حذف‌شده (سطلِ زباله) — فقط شناسنامه، بدونِ فایل */
function trashedDocByNumber(num){
  return (DB.trashedDocs||[]).find(function(d){return d.drawingNumber===num;})||null;
}
/* برای «تاریخچه»: سندِ زنده، و اگر نبود سندِ حذف‌شده.
   عمداً از docByNumber جداست تا هیچ نمای عادی سندِ حذف‌شده را زنده نپندارد.
   خروجی با isTrashed مشخص می‌شود تا فراخوان بداند با چه چیزی طرف است. */
function docByNumberAny(num){
  var d=docByNumber(num);
  if(d) return d;
  var t=trashedDocByNumber(num);
  return t?Object.assign({},t,{isTrashed:true}):null;
}
/* همهٔ ریویژن‌های یک مبنا (جدید به قدیم) */
function revisionsOf(doc){
  return DB.documents.filter(function(d){
    return d.clientCode===doc.clientCode && pad2(d.orderNo)===pad2(doc.orderNo) &&
      pad2(d.projectNo)===pad2(doc.projectNo) && pad2(d.partNo)===pad2(doc.partNo) &&
      String(d.typeCode).toUpperCase()===String(doc.typeCode).toUpperCase();
  }).sort(function(a,b){ return (parseInt(b.rev)||0)-(parseInt(a.rev)||0); });
}
/* تاریخچهٔ گردش‌کار یک شماره سند (قدیم به جدید) */
function workflowOf(drawingNumber){
  return DB.workflow.filter(function(w){ return w.drawingNumber===drawingNumber; })
    .sort(function(a,b){ return (a.timestamp||"").localeCompare(b.timestamp||""); });
}
/* اسناد در انتظار بازبینی — جدیدترین (آخرین ارسال‌شده) بالاترین */
function pendingDocs(){
  return DB.documents.filter(function(d){ return String(d.status||"").toLowerCase()==="pending"; })
    .sort(function(a,b){ return (b.timestamp||"").localeCompare(a.timestamp||""); });
}
function approvedDocs(){ return DB.documents.filter(function(d){ var s=String(d.status||"").toLowerCase(); return s==="approved"||s==="active"; }); }
