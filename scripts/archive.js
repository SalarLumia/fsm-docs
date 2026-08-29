/* ================= آرشیو ================= */
var _arch = { sortKey:"date", sortDir:-1, openNum:"", perPage:10, page:1, pages:1, sig:"" };
function faN(n){ return Number(n).toLocaleString("fa-IR"); }   // ارقامِ فارسی برای صفحه‌بندی
/* ستون‌های آرشیو (راست→چپ): «نوع» به‌صورتِ المانِ سند در راست‌ترین ستون؛ ریویژن حذف شد. */
var ARCH_COLS = [
  {k:"type",label:"نوع"},{k:"number",label:"شماره سند"},{k:"client",label:"مشتری"},
  {k:"order",label:"سفارش"},{k:"project",label:"پروژه"},{k:"part",label:"قطعه"},
  {k:"date",label:"",spacer:true},{k:"status",label:"وضعیت"}   // تاریخ در ستونِ وضعیت ادغام شد؛ این ستون فعلاً فاصله‌گذارِ خالی است
];
var KEBAB_IC = '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><circle cx="12" cy="5" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="12" cy="19" r="1.7"/></svg>';

function filteredDocs(){
  var q=(document.getElementById("aSearch").value||"").trim().toLowerCase();
  var fc=document.getElementById("aClient").value, ft=document.getElementById("aType").value,
      fl=document.getElementById("aLatest").value, fs=document.getElementById("aStatus").value,
      fp=document.getElementById("aProject").value, fo=document.getElementById("aOrder").value;
  return DB.documents.filter(function(d){
    if(fc && d.clientCode!==fc) return false;
    if(fo){ var oo=fo.split("|"); if(!(d.clientCode===oo[0] && pad2(d.orderNo)===pad2(oo[1]))) return false; }
    if(fp){ var pp=fp.split("|"); if(!(d.clientCode===pp[0] && pad2(d.orderNo)===pad2(pp[1]) && pad2(d.projectNo)===pad2(pp[2]))) return false; }
    if(ft && String(d.typeCode).toUpperCase()!==ft) return false;
    if(fs){ var st=String(d.status||"").toLowerCase();
            if(fs==="approved"){ if(!(st==="approved"||st==="active")) return false; }
            else if(st!==fs) return false; }
    if(fl==="1" && String(d.isLatest).toLowerCase()!=="true") return false;
    if(q){
      var blob=[d.drawingNumber,docPhrase(d),clientName(d.clientCode),d.clientCode,typeName(d.typeCode),d.typeCode,d.title,partName(d.partNo),d.projectNo,d.orderNo,d.partNo].join(" ").toLowerCase();
      if(blob.indexOf(q)<0) return false;
    }
    return true;
  });
}

/* --- مرتب‌سازی --- */
function archSortVal(d,key){
  switch(key){
    case "number":  return String(d.drawingNumber||"");
    case "client":  return clientName(d.clientCode)||"";
    case "order":   return numOf(d.orderNo);
    case "project": return numOf(d.projectNo);
    case "part":    return numOf(d.partNo);
    case "type":    return typeName(d.typeCode)||"";
    case "rev":     return numOf(d.rev);
    case "status":  return ({draft:0,pending:1,rejected:2,approved:3,active:3})[String(d.status||"").toLowerCase()]||0;
    case "date":    return String(d.timestamp||"");
    default: return "";
  }
}
function archCompare(a,b){
  var va=archSortVal(a,_arch.sortKey), vb=archSortVal(b,_arch.sortKey), r;
  if(typeof va==="number" && typeof vb==="number") r=va-vb;
  else r=String(va).localeCompare(String(vb),"fa");
  if(r===0) r=String(a.drawingNumber).localeCompare(String(b.drawingNumber),"en");
  return r*_arch.sortDir;
}
function sortArchive(key){
  if(_arch.sortKey===key) _arch.sortDir=-_arch.sortDir;
  else { _arch.sortKey=key; _arch.sortDir=(key==="date")?-1:1; }
  archRerender();   // اگر ردیفی باز است، اول انیمیشنِ بسته‌شدن، سپس سورت/رندر
}
/* سرستون‌ها قابلِ کلیک برای مرتب‌سازی‌اند؛ کنارِ هر ستونِ قابلِ‌سورت یک آیکونِ کوچکِ دوفلشه (بالا/پایین)
   همیشه دیده می‌شود و در حالتِ فعال نارنجی می‌شود (بالا=صعودی، پایین=نزولی). */
var SORT_IC='<span class="sort-ic"><svg viewBox="0 0 24 24"><polyline class="s-up" points="7 9 12 4 17 9"/><polyline class="s-down" points="7 15 12 20 17 15"/></svg></span>';
var SORTABLE={client:1,order:1,project:1,part:1};   // فقط این چهار ستون قابلِ مرتب‌سازی‌اند
function buildArchiveHead(){
  var host=document.getElementById("archiveHead"); if(!host) return;
  host.innerHTML='<tr>'+ARCH_COLS.map(function(col){
    if(col.spacer) return '<th aria-hidden="true"></th>';   // ستونِ فاصله‌گذارِ خالی (تاریخِ ادغام‌شده)
    if(!SORTABLE[col.k]) return '<th><span class="th-lbl">'+esc(col.label)+'</span></th>';   // بدونِ آیکونِ سورت
    var on=_arch.sortKey===col.k;
    var cls='sortable'+(on?(_arch.sortDir<0?' active desc':' active asc'):'');
    return '<th class="'+cls+'" onclick="sortArchive(\''+col.k+'\')" title="مرتب‌سازی"><span class="th-lbl">'+esc(col.label)+SORT_IC+'</span></th>';
  }).join("")+'<th class="arch-actcol" aria-hidden="true"></th></tr>';   // ستونِ باریکِ فلش/اکشن در انتهای چپ
}

/* ================= فیلترِ چیپ‌محور + پاپ‌اوورِ جامع =================
   سلکت‌های مخفی (aClient/aOrder/aProject/aType/aStatus/aLatest) منبعِ حقیقت‌اند؛ چیپ‌ها همان‌ها را ست/پاک می‌کنند. */
var FILT_FIELDS=[
  {id:"aClient",  label:"مشتری"},
  {id:"aOrder",   label:"سفارش"},
  {id:"aProject", label:"پروژه"},
  {id:"aType",    label:"نوع سند/فایل"},
  {id:"aStatus",  label:"وضعیت"},
  {id:"aLatest",  label:"ریویژن"}
];
var FILT_CHEV='<svg viewBox="0 0 24 24" class="ic"><polyline points="15 6 9 12 15 18"/></svg>';        // ← بازشدنِ پنلِ کناری (RTL: چپ)
function filtFieldById(id){ for(var i=0;i<FILT_FIELDS.length;i++) if(FILT_FIELDS[i].id===id) return FILT_FIELDS[i]; return null; }
function filtOptLabel(id,val){
  var s=document.getElementById(id); if(!s) return val;
  for(var i=0;i<s.options.length;i++) if(s.options[i].value===val) return s.options[i].text;
  return val;
}
/* تاگلِ روشن/خاموشِ یک مقدار در پنلِ دوم (منو باز می‌ماند تا تاگل‌ها دیده شوند) */
function filtToggleVal(id,val){
  var s=document.getElementById(id); if(!s) return;
  s.value=(s.value===val)?"":val;                         // کلیک روی مقدارِ روشن → خاموش
  if(id==="aClient"){ document.getElementById("aOrder").value=""; document.getElementById("aProject").value=""; }   // ریستِ وابسته‌ها
  renderArchive();       // چیپ‌ها + جدول
  filtRerenderMenu();    // به‌روزرسانیِ تاگل‌های منو (منو باز می‌ماند)
}
function filtClear(id){
  var s=document.getElementById(id); if(!s) return;
  s.value="";
  if(id==="aClient") onArchiveClientChange(); else renderArchive();
}
/* ردیفِ چیپ‌های فعال + دکمهٔ + (فقط وقتی حداقل یک فیلتر فعال است) */
function buildArchChips(){
  var host=document.getElementById("archChips"); if(!host) return;
  var chips=FILT_FIELDS.filter(function(f){ var s=document.getElementById(f.id); return s && s.value; }).map(function(f){
    var s=document.getElementById(f.id);
    // نامِ دسته (مشتری/پروژه/…) نوشته نمی‌شود؛ خودِ مقدار گویاست. عنوانِ دسته در tooltip می‌ماند.
    return '<span class="filt-chip" title="'+esc(f.label)+'">'+
      '<span class="fc-v">'+esc(filtOptLabel(f.id,s.value))+'</span>'+
      '<button class="fc-x" title="حذفِ این فیلتر" onclick="filtClear(\''+f.id+'\')">'+ICON.x+'</button></span>';
  });
  if(!chips.length){ host.innerHTML=""; host.hidden=true; filtCloseMenu(); return; }
  host.hidden=false;
  host.innerHTML=chips.join("")+
    '<button class="filt-add" id="filtAddBtn" title="افزودنِ فیلترِ بعدی" onclick="filtToggleMenu(event,\'filtAddBtn\')">'+ICON.plus+'</button>';
}
/* پاپ‌اوورِ دوپنله (مثلِ رفرنس): پنلِ راست = فهرستِ فیلدها؛ با کلیکِ هر فیلد، پنلِ مقادیرش کنارش باز می‌شود */
var _filtMenu=null;
/* مقادیرِ هر فیلد به‌صورتِ {value, fa (فارسی=راست), en (انگلیسی=چپ)} — مستقیم از داده */
function filtFieldValues(id){
  var fc=document.getElementById("aClient").value;
  if(id==="aClient") return clientsSorted().map(function(c){ return {value:c.code, fa:c.name||c.code, en:clientNameEn(c.code)}; });   // انگلیسی = نام لاتینِ مشتری
  if(id==="aType") return docTypesSorted().map(function(t){ return {value:String(t.code).toUpperCase(), fa:t.nameFa||t.code, en:t.nameEn||String(t.code).toUpperCase()}; });
  if(id==="aStatus") return [   // سمتِ چپ = تگِ وضعیت (به‌جای معادلِ انگلیسی)
    {value:"draft",fa:"پیش‌نویس"},{value:"pending",fa:"در انتظار بازبینی"},
    {value:"approved",fa:"تأییدشده"},{value:"rejected",fa:"ردشده"}
  ].map(function(x){ var si=statusInfo(x.value); return {value:x.value, fa:x.fa, enHtml:badgeHTML(si.cls,si.label)}; });
  if(id==="aLatest") return [{value:"1",fa:"فقط آخرین",en:"Latest"}];
  if(id==="aOrder") return (DB.orders||[]).filter(function(o){ return !fc||o.clientCode===fc; }).slice().sort(function(a,b){
      return String(a.clientCode).localeCompare(String(b.clientCode),"en")||(numOf(a.orderNo)-numOf(b.orderNo)); })
    .map(function(o){ return {value:o.clientCode+"|"+pad2(o.orderNo), fa:(o.title||("سفارش "+pad2(o.orderNo)))}; });   // بدونِ انگلیسی
  if(id==="aProject") return DB.projects.filter(function(p){ return !fc||p.clientCode===fc; }).slice().sort(function(a,b){
      return String(a.clientCode).localeCompare(String(b.clientCode),"en")||(numOf(a.orderNo)-numOf(b.orderNo))||(numOf(a.projectNo)-numOf(b.projectNo)); })
    .map(function(p){ return {value:p.clientCode+"|"+pad2(p.orderNo)+"|"+pad2(p.projectNo), fa:(p.description||("پروژه "+pad2(p.projectNo)))}; });   // بدونِ انگلیسی
  return [];
}
function filtMenuHTML(activeId){
  var fieldList='<div class="filt-fields">'+FILT_FIELDS.map(function(f){
    var s=document.getElementById(f.id), on=!!(s&&s.value), h="filtPickField('"+f.id+"')";
    return '<button type="button" class="filt-item filt-field'+(f.id===activeId?' active':'')+(on?' has-val':'')+'" onmouseover="'+h+'" onclick="event.stopPropagation();'+h+'"><span>'+esc(f.label)+'</span>'+FILT_CHEV+'</button>';
  }).join("")+'</div>';
  if(!activeId) return fieldList;   // هنوز فیلدی انتخاب نشده → فقط فهرستِ فیلدها
  var cur=(function(){ var s=document.getElementById(activeId); return s?s.value:""; })();
  var vals=filtFieldValues(activeId).map(function(v){
    var on=(v.value===cur);
    var enPart = v.enHtml ? ('<span class="fv-tag">'+v.enHtml+'</span>') : (v.en ? ('<span class="fv-en">'+esc(v.en)+'</span>') : '');
    return '<button type="button" class="filt-item filt-val'+(on?' sel':'')+'" onclick="event.stopPropagation();filtToggleVal(\''+activeId+'\',\''+esc(v.value)+'\')">'+
      '<span class="ff-l"><span class="ed-check'+(on?' on':'')+'"></span><span class="fv-fa">'+esc(v.fa)+'</span></span>'+enPart+'</button>';
  }).join("");
  var panel=vals||'<div class="filt-empty">گزینه‌ای نیست</div>';
  return fieldList+'<div class="filt-panel">'+panel+'</div>';
}
function filtPickField(id){
  if(!_filtMenu || _filtMenu._active===id) return;   // گاردِ ضدِ رندرِ تکراری هنگامِ حرکتِ موس روی همان فیلد
  _filtMenu._active=id; _filtMenu.innerHTML=filtMenuHTML(id); filtReposition();
}
function filtRerenderMenu(){ if(_filtMenu){ _filtMenu.innerHTML=filtMenuHTML(_filtMenu._active); filtReposition(); } }
function filtReposition(){ var a=_filtMenu&&document.getElementById(_filtMenu._anchor); if(a) filtPosition(a); }
function filtPosition(anchor){
  if(!_filtMenu) return;
  var r=anchor.getBoundingClientRect(), mw=_filtMenu.offsetWidth, mh=_filtMenu.offsetHeight;
  var top=r.bottom+12; if(top+mh>window.innerHeight-8) top=Math.max(8, r.top-mh-12);
  var left=r.right-mw; if(left<8) left=8; if(left+mw>window.innerWidth-8) left=window.innerWidth-8-mw;
  _filtMenu.style.top=Math.max(8,top)+"px"; _filtMenu.style.left=left+"px";
}
function filtOutside(e){ if(_filtMenu && _filtMenu.contains(e.target)) return; filtCloseMenu(); }
/* اسکرولِ صفحه منو را می‌بندد، اما اسکرول در خودِ منو نه (رویداد در فازِ capture می‌آید) */
function filtOnScroll(e){
  var t=e.target;
  if(_filtMenu && t && t.nodeType===1 && (t===_filtMenu || _filtMenu.contains(t))) return;
  filtCloseMenu();
}
function filtCloseMenu(){
  if(!_filtMenu) return;
  _filtMenu.remove(); _filtMenu=null;
  document.removeEventListener("click", filtOutside, false);
  document.removeEventListener("scroll", filtOnScroll, true);
  window.removeEventListener("resize", filtCloseMenu);
}
function filtToggleMenu(ev, anchorId){
  ev.stopPropagation();
  var wasFor=_filtMenu && _filtMenu._anchor===anchorId;
  filtCloseMenu();
  if(wasFor) return;   // toggle
  var anchor=document.getElementById(anchorId); if(!anchor) return;
  var m=document.createElement("div"); m.className="filt-pop"; m._anchor=anchorId;
  m.innerHTML=filtMenuHTML(null);
  document.body.appendChild(m); _filtMenu=m; filtPosition(anchor);
  setTimeout(function(){
    document.addEventListener("click", filtOutside, false);
    document.addEventListener("scroll", filtOnScroll, true);
    window.addEventListener("resize", filtCloseMenu);
  },0);
}

/* --- فیلتر پروژه (وابسته به مشتری) --- */
function populateArchiveProjects(){
  var el=document.getElementById("aProject"); if(!el) return;
  var cur=el.value, fc=document.getElementById("aClient").value;
  var list=DB.projects.filter(function(p){ return !fc || p.clientCode===fc; }).slice().sort(function(a,b){
    return String(a.clientCode).localeCompare(String(b.clientCode),"en")||(numOf(a.orderNo)-numOf(b.orderNo))||(numOf(a.projectNo)-numOf(b.projectNo));
  });
  el.innerHTML='<option value="">همه پروژه‌ها</option>'+list.map(function(p){
    var val=p.clientCode+"|"+pad2(p.orderNo)+"|"+pad2(p.projectNo);
    var label=p.clientCode+"-"+pad2(p.orderNo)+"-"+pad2(p.projectNo)+(p.description?(" — "+p.description):"");
    return '<option value="'+esc(val)+'">'+esc(label)+'</option>';
  }).join("");
  el.value=(cur && list.some(function(p){ return (p.clientCode+"|"+pad2(p.orderNo)+"|"+pad2(p.projectNo))===cur; }))?cur:"";
}
/* فیلترِ سفارش (وابسته به مشتری) — value = «کدمشتری|شمارهٔ‌سفارش» */
function populateArchiveOrders(){
  var el=document.getElementById("aOrder"); if(!el) return;
  var cur=el.value, fc=document.getElementById("aClient").value;
  var list=(DB.orders||[]).filter(function(o){ return !fc || o.clientCode===fc; }).slice().sort(function(a,b){
    return String(a.clientCode).localeCompare(String(b.clientCode),"en")||(numOf(a.orderNo)-numOf(b.orderNo));
  });
  el.innerHTML='<option value="">همه سفارش‌ها</option>'+list.map(function(o){
    var val=o.clientCode+"|"+pad2(o.orderNo);
    var label=o.clientCode+"-"+pad2(o.orderNo)+(o.title?(" — "+o.title):"");
    return '<option value="'+esc(val)+'">'+esc(label)+'</option>';
  }).join("");
  el.value=(cur && list.some(function(o){ return (o.clientCode+"|"+pad2(o.orderNo))===cur; }))?cur:"";
}
function onArchiveClientChange(){ document.getElementById("aOrder").value=""; document.getElementById("aProject").value=""; renderArchive(); }
function clearArchiveFilters(){
  ["aSearch","aClient","aOrder","aProject","aType","aStatus","aLatest"].forEach(function(id){ var el=document.getElementById(id); if(el) el.value=""; });
  renderArchive();
}

/* نامِ کاملِ سفارش (اگر عنوان داشته باشد) — برای نمایش در حالتِ اکسپند‌شده */
function archOrderTitle(d){
  var o=(DB.orders||[]).find(function(x){ return x.clientCode===d.clientCode && pad2(x.orderNo)===pad2(d.orderNo); });
  return (o&&o.title)?o.title:("سفارش "+pad2(d.orderNo));
}
var ARCH_CHEV='<svg class="chev" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>';
function renderArchive(){
  _arch.openNum="";                 // با هر رندر (مرتب‌سازی/فیلتر) اکسپندها بسته می‌شوند
  populateArchiveOrders();
  populateArchiveProjects();
  buildArchChips();                 // ردیفِ چیپ‌های فیلترِ فعال
  buildArchiveHead();
  var rows=filteredDocs().slice().sort(archCompare);
  // امضای فیلتر/سورت/تعدادِ صفحه — اگر تغییر کند به صفحهٔ ۱ برمی‌گردیم (ناوبریِ صفحه امضا را عوض نمی‌کند)
  var sig=[_arch.sortKey,_arch.sortDir,_arch.perPage,
    document.getElementById("aSearch").value,document.getElementById("aClient").value,
    document.getElementById("aOrder").value,document.getElementById("aProject").value,document.getElementById("aType").value,
    document.getElementById("aStatus").value,document.getElementById("aLatest").value].join("|");
  if(sig!==_arch.sig){ _arch.page=1; _arch.sig=sig; }
  var total=rows.length, per=_arch.perPage;
  var pages=Math.max(1, Math.ceil(total/per)); _arch.pages=pages;
  if(_arch.page>pages) _arch.page=pages;
  if(_arch.page<1) _arch.page=1;
  var startI=(_arch.page-1)*per, pageRows=rows.slice(startI, startI+per);
  var admin=ME.role==="admin";
  function archWrap(inner){ return '<div class="arch-det-wrap"><div class="arch-det-in"><div class="arch-det-pad">'+(inner||"")+'</div></div></div>'; }
  var html=pageRows.map(function(d){
    var si=statusInfo(d.status);
    var num=esc(d.drawingNumber);
    var hov=' onmouseover="archHover(event,\''+num+'\',1)" onmouseout="archHover(event,\''+num+'\',0)"';
    // ---- ردیفِ اصلی (فشرده، کدمحور) — کلیک روی هر جای ردیف = اکسپند. آخرین ستونِ چپ = نوارِ کنترل (فلش) ----
    var main="<tr class=\"arch-row\" id=\"arow-"+num+"\" onclick=\"archToggleRow('"+num+"')\""+hov+">"+
      '<td><span class="el-badge" title="'+esc(typeName(d.typeCode))+'">'+docTypeIconInner({code:d.typeCode})+'</span></td>'+
      '<td><span class="arch-num" title="نمایش جزئیات سند" onclick="archCellNav(event,\''+num+'\',\'doc\')">'+num+'</span></td>'+
      '<td><span class="arch-client arch-anim" title="'+esc(clientName(d.clientCode))+'" onclick="archCellNav(event,\''+num+'\',\'client\')">'+esc(clientNameEn(d.clientCode))+'</span></td>'+
      '<td class="arch-code"><span class="arch-anim">سفارش '+esc(pad2(d.orderNo))+'</span></td>'+
      '<td class="arch-code"><span class="arch-anim arch-lnk" title="'+esc(projectLabel(d))+'" onclick="archCellNav(event,\''+num+'\',\'project\')">پروژه '+esc(pad2(d.projectNo))+'</span></td>'+
      '<td class="arch-cell"><span class="arch-anim arch-lnk" title="'+esc(partNameFa(d.partNo))+'" onclick="archCellNav(event,\''+num+'\',\'part\')">'+esc(partName(d.partNo))+'</span></td>'+
      '<td class="arch-date"><span class="arch-hide">'+fmtDate(d.timestamp)+'</span></td>'+   /* ستونِ تاریخ ادغام شد: محتوا مخفی، فقط عرضِ ستون حفظ می‌شود تا بقیه جابه‌جا نشوند */
      '<td class="adg-c-status"><span class="arch-stat">'+badgeHTML(si.cls, si.label)+'</span></td>'+   /* وضعیت: تگ در حالتِ بسته و باز هم‌اندازه می‌ماند */
      '<td class="arch-actcol"><button class="arch-exp" title="جزئیاتِ بیشتر" aria-label="جزئیاتِ بیشتر" onclick="event.stopPropagation();archToggleRow(\''+num+'\')">'+ARCH_CHEV+'</button></td>'+
    "</tr>";
    // ---- ردیفِ جزئیات: زیرِ هر ستون، نامِ فارسیِ متناظر با نقطهٔ نارنجی؛ ۹ سلولِ واقعیِ هم‌عرض با ستون‌های جدول ----
    var faDoc=esc(typeName(d.typeCode)+(pad2(d.partNo)==="00"?"":" "+partNameFa(d.partNo)));
    var cName=esc(clientName(d.clientCode)), oTitle=esc(archOrderTitle(d)), pLabel=esc(projectLabel(d)), pFa=esc(partNameFa(d.partNo));
    function sub(t){ return t ? '<span class="arch-date" title="'+t+'"><i class="dot brand"></i>'+t+'</span>' : ""; }
    function subND(t){ return t ? '<span class="arch-date" title="'+t+'">'+t+'</span>' : ""; }   // بدونِ نقطهٔ نارنجی (ستون‌های وسط‌چین)
    var acts=(d.fileId?downloadIconBtn("event.stopPropagation();downloadFile('"+esc(d.fileId)+"','"+num+"')","دانلود"):"")+
      (admin?delIconBtn("event.stopPropagation();delDocument('"+num+"')","حذف"):"");
    var detail="<tr class=\"arch-detail\" id=\"adet-"+num+"\""+hov+">"+
      '<td>'+archWrap("")+'</td>'+
      '<td class="adg-c-doc">'+archWrap(sub(faDoc))+'</td>'+
      '<td class="adg-c-client">'+archWrap(subND(cName))+'</td>'+
      '<td class="adg-c-order">'+archWrap(subND(oTitle))+'</td>'+
      '<td class="adg-c-proj">'+archWrap(subND(pLabel))+'</td>'+
      '<td class="adg-c-part">'+archWrap(pad2(d.partNo)==="00"?"":subND(pFa))+'</td>'+   /* قطعه: نامِ فارسی بدونِ نقطهٔ نارنجی */
      '<td>'+archWrap("")+'</td>'+
      '<td class="adg-c-status">'+archWrap('<span class="arch-date">'+fmtDate(d.timestamp)+'</span>')+'</td>'+   /* خط دوم زیرِ تگِ وضعیت = تاریخ (سبکِ زیرنویس، بدونِ نقطهٔ نارنجی) */
      '<td class="arch-actcol">'+archWrap('<div class="arch-det-actcol">'+acts+'</div>')+'</td>'+
    "</tr>";
    return main+detail;
  }).join("");
  document.getElementById("archiveBody").innerHTML = html || '<tr><td colspan="9" class="muted" style="text-align:center;padding:24px">موردی با این فیلترها یافت نشد.</td></tr>';
  var endI=Math.min(startI+per, total);
  document.getElementById("archiveFoot").innerHTML = archFootHTML(total, startI, endI, _arch.page, pages);
}

/* ===== صفحه‌بندی (rows-per-page + بازه + ناوبری) و دکمهٔ خروجی ===== */
var PG_IC={
  first:'<svg viewBox="0 0 24 24"><polyline points="7 6 13 12 7 18"/><polyline points="13 6 19 12 13 18"/></svg>',
  prev:'<svg viewBox="0 0 24 24"><polyline points="9 6 15 12 9 18"/></svg>',
  next:'<svg viewBox="0 0 24 24"><polyline points="15 6 9 12 15 18"/></svg>',
  last:'<svg viewBox="0 0 24 24"><polyline points="17 6 11 12 17 18"/><polyline points="11 6 5 12 11 18"/></svg>'
};
var CSV_IC='<svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
function pgBtn(fn,ic,dis,title){ return '<button class="pg-btn" title="'+title+'" aria-label="'+title+'"'+(dis?' disabled':' onclick="'+fn+'"')+'>'+ic+'</button>'; }
var PG_PER=[10,20,30];
function archFootHTML(total,startI,endI,page,pages){
  var per=_arch.perPage;
  var menu=PG_PER.map(function(n){ return '<button type="button" class="pg-drop-opt'+(n===per?' selected':'')+'" role="option" aria-selected="'+(n===per?'true':'false')+'" onclick="pgPick('+n+')">'+faN(n)+'</button>'; }).join("");
  var drop='<span class="pg-drop" id="pgDrop">'+
      '<button type="button" class="pg-drop-btn" aria-haspopup="listbox" aria-expanded="false" aria-label="تعدادِ سطر در هر صفحه" onclick="pgToggle(event)">'+
        '<span class="pg-drop-val">'+faN(per)+'</span>'+
        '<svg class="pg-drop-chev" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>'+
      '</button>'+
      '<span class="pg-drop-menu" role="listbox">'+menu+'</span>'+
    '</span>';
  var range = total ? (faN(startI+1)+"–"+faN(endI)+" از "+faN(total)+" سند") : "۰ سند";
  var atFirst=page<=1, atLast=page>=pages;
  return '<div class="arch-pager">'+   /* دکمهٔ خروجی به تیترِ بالای بخش منتقل شد */
      drop+
      '<span class="pg-lbl">سطر در هر صفحه</span>'+
      '<span class="pg-range">'+range+'</span>'+
      '<span class="pg-nav">'+
        pgBtn("archFirst()",PG_IC.first,atFirst,"صفحهٔ اول")+
        pgBtn("archPrev()",PG_IC.prev,atFirst,"صفحهٔ قبلی")+
        '<span class="pg-cur">'+faN(page)+' از '+faN(pages)+'</span>'+
        pgBtn("archNext()",PG_IC.next,atLast,"صفحهٔ بعدی")+
        pgBtn("archLast()",PG_IC.last,atLast,"صفحهٔ آخر")+
      '</span>'+
    '</div>';
}
/* رندرِ دوباره با احترام به انیمیشنِ بسته‌شدنِ ردیفِ باز (مثلِ مرتب‌سازی) */
function archRerender(){
  var openNum=_arch.openNum;
  var reduce=window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if(openNum && !reduce){ archToggleRow(openNum); setTimeout(renderArchive,360); }
  else renderArchive();
}
function archSetPerPage(v){ _arch.perPage=parseInt(v,10)||10; _arch.page=1; archRerender(); }
/* دراپ‌داونِ سفارشیِ «تعدادِ سطر»: باز/بست با انیمیشن، بستن با کلیکِ بیرون */
function pgToggle(ev){
  ev.stopPropagation();
  var d=document.getElementById("pgDrop"); if(!d) return;
  document.removeEventListener("click", pgOutside, false);
  var open=d.classList.toggle("open");
  var b=d.querySelector(".pg-drop-btn"); if(b) b.setAttribute("aria-expanded", open?"true":"false");
  if(open) document.addEventListener("click", pgOutside, false);
}
function pgOutside(e){ var d=document.getElementById("pgDrop"); if(d && d.contains(e.target)) return; pgClose(); }
function pgClose(){
  var d=document.getElementById("pgDrop");
  if(d){ d.classList.remove("open"); var b=d.querySelector(".pg-drop-btn"); if(b) b.setAttribute("aria-expanded","false"); }
  document.removeEventListener("click", pgOutside, false);
}
function pgPick(n){ pgClose(); if(n!==_arch.perPage) archSetPerPage(n); }
function archGoPage(p){ _arch.page=Math.max(1, Math.min(p, _arch.pages||1)); archRerender(); }
function archFirst(){ archGoPage(1); }
function archPrev(){ archGoPage(_arch.page-1); }
function archNext(){ archGoPage(_arch.page+1); }
function archLast(){ archGoPage(_arch.pages||1); }

/* هاورِ یکتا روی کلِ رکورد (سر + جزئیات به‌صورتِ یک تکه) — با guardِ relatedTarget تا جابه‌جایی درونِ رکورد فلیکر نکند */
function archHover(ev, num, on){
  var r=document.getElementById("arow-"+num), d=document.getElementById("adet-"+num);
  if(!on){ var rt=ev&&ev.relatedTarget;
    if(rt && ((r&&r.contains(rt))||(d&&d.contains(rt)))) return; }   // موس هنوز داخلِ همان رکورد است
  if(r) r.classList.toggle("hov", !!on);
  if(d) d.classList.toggle("hov", !!on);
}
/* اکسپندِ آکاردئونیِ یک ردیف — هر لحظه فقط یکی باز می‌ماند */
function archToggleRow(num){
  var row=document.getElementById("arow-"+num), det=document.getElementById("adet-"+num);
  if(!row||!det) return;
  var willOpen=!det.classList.contains("open");
  var body=document.getElementById("archiveBody");
  var op=body.querySelectorAll(".arch-detail.open,.arch-row.open");
  for(var i=0;i<op.length;i++) op[i].classList.remove("open");
  var table=body.closest(".arch-table");                 // کلاسِ has-open روی جدول → جابه‌جاییِ تیترِ «نوع» هنگامِ اکسپند
  if(willOpen){
    row.classList.add("open"); det.classList.add("open"); _arch.openNum=num; if(table) table.classList.add("has-open");
  }
  else { _arch.openNum=""; if(table) table.classList.remove("has-open"); }
}

/* کلیک روی سلول‌های لینک‌دار (شماره/مشتری/پروژه/قطعه): فقط وقتی ردیف اکسپند است ناوبری می‌کند؛
   در حالتِ کولپس هیچ نمی‌کند و می‌گذارد کلیک به ردیف برسد تا فقط باز شود. */
function archCellNav(ev, num, kind){
  var row=document.getElementById("arow-"+num);
  if(!row || !row.classList.contains("open")) return;   // کولپس → bubble می‌شود و ردیف باز می‌شود
  ev.stopPropagation();
  var d=docByNumber(num); if(!d) return;
  if(kind==="doc") openDocDetail(num);
  else if(kind==="client") navGoClient(d.clientCode);
  else if(kind==="project") navGoProject(d.clientCode, pad2(d.orderNo), pad2(d.projectNo));
  else if(kind==="part") navGoPart(d.clientCode, pad2(d.orderNo), pad2(d.projectNo), pad2(d.partNo));
}

/* ================= منوی سه‌نقطه‌ایِ عملیاتِ آرشیو =================
   منو به body چسبانده و با position:fixed جای می‌گیرد تا overflowِ .tablewrap آن را نبُرد.
   کلیکِ بیرون/اسکرول/تغییرِ اندازه ⟵ بسته می‌شود؛ کلیکِ دوباره روی همان دکمه = toggle. */
var _archMenu=null;
function archCloseKebab(){
  if(!_archMenu) return;
  _archMenu.remove(); _archMenu=null;
  document.removeEventListener("click",_archDocClick,false);
  document.removeEventListener("scroll",archCloseKebab,true);
  window.removeEventListener("resize",archCloseKebab);
}
function _archDocClick(e){ if(_archMenu && _archMenu.contains(e.target)) return; archCloseKebab(); }
function archKebab(ev, num){
  ev.stopPropagation();
  var wasFor=_archMenu && _archMenu._num===num;
  archCloseKebab();
  if(wasFor) return;                                   // toggle: کلیکِ دوباره ⟵ بستن
  var r=ev.currentTarget.getBoundingClientRect();
  var m=document.createElement("div"); m.className="kebab-pop"; m._num=num;
  m.innerHTML=
    '<button class="kebab-item" onclick="archCloseKebab();openDocDetail(\''+esc(num)+'\')">'+ICON.edit+'ویرایش</button>'+
    '<button class="kebab-item danger" onclick="archCloseKebab();delDocument(\''+esc(num)+'\')">'+ICON.trash+'حذف</button>';
  document.body.appendChild(m);
  var mw=m.offsetWidth, mh=m.offsetHeight;
  var top=r.bottom+5; if(top+mh>window.innerHeight-8) top=r.top-mh-5;   // اگر پایین جا نبود، بالا باز شود
  var left=r.right-mw; if(left<8) left=8;                              // در RTL راست‌ترازِ دکمه
  m.style.top=Math.max(8,top)+"px"; m.style.left=left+"px";
  _archMenu=m;
  setTimeout(function(){
    document.addEventListener("click",_archDocClick,false);
    document.addEventListener("scroll",archCloseKebab,true);
    window.addEventListener("resize",archCloseKebab);
  },0);
}
async function delDocument(num){
  if(!(await uiConfirm("حذف سند «"+num+"»؟ سند به «سطل زباله» می‌رود و تا ۳۰ روز قابلِ بازیابی است؛ پس از آن سامانه آن را برای همیشه حذف می‌کند.",{danger:true,okLabel:"حذف"}))) return;
  var r=await api("deleteDocument",{drawingNumber:num});
  if(r.ok){ toast("به سطلِ زباله منتقل شد"); refreshDocuments(); } else toast(r.message||"حذف ناموفق",true);
}

/* ================= سطلِ زباله (تبِ اسنادِ حذف‌شده — قابلِ بازیابی تا ۳۰ روز) ================= */
var RB_RESTORE_IC='<svg class="ic" viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>';
var RB_PURGE_IC='<svg class="ic" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>';
var _rbDocs=[];   // آخرین فهرستِ دریافت‌شده (برای «خالی‌کردنِ سطل»)
function renderTrash(){ rbRefresh(); }   // با سوییچ به تبِ «سطل زباله» صدا زده می‌شود
/* اسکلتِ سطلِ زباله: قالبِ ردیف‌ها بی‌درنگ ساخته می‌شود و سلول‌ها با shimmer در حالِ لود می‌مانند
   تا داده‌ها از سرور برسند — بدونِ اورلیِ تمام‌صفحه (مثلِ لودِ اولِ داشبورد). */
function rbSkeletonHTML(n){
  var row='<div class="rb-item rb-skel">'+
      '<span class="el-badge rb-typeic"><span class="sk" style="width:26px;height:30px;border-radius:5px"></span></span>'+
      '<div class="rb-info">'+
        '<span class="sk" style="height:14px;width:170px"></span>'+
        '<span class="sk" style="height:12px;width:60%;margin-top:5px"></span>'+
      '</div>'+
      '<div class="rb-aside"><span class="sk" style="height:12px;width:82px"></span><span class="sk" style="height:11px;width:54px;margin-top:5px"></span></div>'+
      '<span class="sk" style="height:24px;width:74px;border-radius:20px"></span>'+
      '<span class="sk" style="height:26px;width:26px;border-radius:8px"></span>'+
      '<span class="sk" style="height:26px;width:26px;border-radius:8px"></span>'+
    '</div>';
  var out=''; for(var i=0;i<(n||4);i++) out+=row; return out;
}
async function rbRefresh(){
  var host=document.getElementById("rbBody"); if(!host) return;
  host.innerHTML='<div class="rb-list">'+rbSkeletonHTML(4)+'</div>';
  var r=await api("listDeleted",{},{silent:true, quiet:true});
  var btnAll=document.getElementById("rbPurgeAll");
  if(!r||!r.ok){ _rbDocs=[]; if(btnAll) btnAll.style.display="none"; host.innerHTML='<div class="rb-empty muted">خطا در دریافتِ فهرست.</div>'; return; }
  var docs=r.documents||[]; _rbDocs=docs;
  if(btnAll) btnAll.style.display=docs.length?"":"none";
  if(!docs.length){ host.innerHTML='<div class="rb-empty">'+emptyState("سطلِ زباله خالی است","اسنادی که حذف کنید تا ۳۰ روز اینجا می‌مانند و قابلِ بازیابی‌اند؛ پس از آن سامانه آن‌ها را برای همیشه پاک می‌کند.")+'</div>'; return; }
  host.innerHTML='<div class="rb-list">'+docs.map(rbRowHTML).join("")+'</div>';
}
function rbRowHTML(d){
  var num=esc(d.drawingNumber);
  // ترتیب: نامِ فارسیِ سند ← قطعه ← پروژه ← مشتری؛ جداکننده = خطِ عمودیِ نازک و کم‌رنگ (rb-sep)
  var parts=[typeName(d.typeCode), partNameFa(d.partNo), projectLabel(d), clientName(d.clientCode)]
    .filter(Boolean).map(esc).map(function(x){ return '<span>'+x+'</span>'; }).join('<i class="rb-sep"></i>');
  var by=d.deletedBy?esc(userName(d.deletedBy)):"—";
  var dl=Number(d.daysLeft||0);
  return '<div class="rb-item">'+
    '<span class="el-badge rb-typeic">'+docTypeIconInner({code:d.typeCode})+'</span>'+
    '<div class="rb-info">'+
      '<div class="rb-num mono">'+num+'</div>'+
      '<div class="rb-meta"><i class="dot brand"></i>'+parts+'</div>'+
    '</div>'+
    '<div class="rb-aside">'+
      '<span class="rb-del-date">'+esc(fmtDate(d.deletedAt))+'</span>'+
      '<span class="rb-del-by">'+by+'</span>'+
    '</div>'+
    '<span class="rb-days'+(dl<=5?" low":"")+'">'+faN(dl)+' روز مانده</span>'+
    '<div class="rb-acts">'+
      '<button class="icon-btn sm" onclick="rbRestore(\''+num+'\')" title="بازیابیِ سند" aria-label="بازیابیِ سند">'+RB_RESTORE_IC+'</button>'+
      '<button class="icon-btn sm danger" onclick="rbPurge(\''+num+'\')" title="حذف برای همیشه" aria-label="حذف برای همیشه">'+RB_PURGE_IC+'</button>'+
    '</div>'+
  '</div>';
}
async function rbRestore(num){
  var r=await api("restoreDocument",{drawingNumber:num});
  if(r&&r.ok){ toast("بازیابی شد"); await rbRefresh(); refreshDocuments(); }
  else toast((r&&r.message)||"بازیابی ناموفق",true);
}
/* حذفِ همیشگیِ یک سند از سطلِ زباله (برگشت‌ناپذیر) */
async function rbPurge(num){
  if(!(await uiConfirm("سندِ «"+num+"» برای همیشه حذف می‌شود و دیگر قابلِ بازیابی نیست. مطمئنید؟",{danger:true,okLabel:"حذف برای همیشه"}))) return;
  var r=await api("purgeDocument",{drawingNumber:num});
  if(r&&r.ok){ toast("برای همیشه حذف شد"); await rbRefresh(); }
  else toast((r&&r.message)||"حذف ناموفق",true);
}
/* خالی‌کردنِ کاملِ سطلِ زباله — همهٔ رکوردها برای همیشه حذف می‌شوند */
async function rbPurgeAll(){
  var nums=_rbDocs.map(function(d){ return d.drawingNumber; });
  if(!nums.length) return;
  if(!(await uiConfirm("همهٔ "+faN(nums.length)+" سندِ داخلِ سطلِ زباله برای همیشه حذف می‌شوند و قابلِ بازیابی نیستند. مطمئنید؟",{danger:true,okLabel:"حذف همه"}))) return;
  toast("در حال حذفِ همه…");
  for(var i=0;i<nums.length;i++){ await api("purgeDocument",{drawingNumber:nums[i]},{silent:true,quiet:true}); }
  toast("سطلِ زباله خالی شد");
  await rbRefresh();
}

/* ================= پیش‌نمایش / دانلود فایل ================= */
async function previewFile(fileId){
  toast("در حال بازکردن…");
  var r=await getFileRetry(fileId);
  if(!r||!r.ok){ toast((r&&r.message)||"خطا در دریافت فایل",true); return; }
  var blob=b64toBlob(r.base64, r.mimeType); var url=previewBlobUrl("filePreview", blob);
  var inner = r.mimeType.indexOf("image/")===0 ? '<img src="'+url+'">' : '<iframe src="'+url+'"></iframe>';
  showModal(esc(r.name), inner);
}
/* دانلود دیگر کلِ صفحه را مسدود نمی‌کند: درخواست به «مرکز دانلود» (صفِ معلق) می‌رود و فایل در
   پس‌زمینه آماده و سپس به مرورگر سپرده می‌شود. label = شمارهٔ سند برای نمایشِ اولیهٔ کارت. */
async function downloadFile(fileId, label){
  if(typeof dlEnqueue==="function"){ dlEnqueue(fileId, label); return; }
  // مسیرِ یدکی (اگر مرکزِ دانلود بارگذاری نشده بود)
  toast("در حال آماده‌سازی دانلود…");
  var r=await getFileRetry(fileId);
  if(!r||!r.ok){ toast((r&&r.message)||"خطا",true); return; }
  var blob=b64toBlob(r.base64, r.mimeType); var url=URL.createObjectURL(blob);
  var a=document.createElement("a"); a.href=url; a.download=r.name; a.click(); URL.revokeObjectURL(url);
}
function b64toBlob(b64,mime){
  var bin=atob(b64); var len=bin.length; var arr=new Uint8Array(len);
  for(var i=0;i<len;i++) arr[i]=bin.charCodeAt(i);
  return new Blob([arr],{type:mime||"application/octet-stream"});
}
/* آیا مودالِ *باز*ی روی صفحه هست؟
   ⚠ صرفِ querySelector(".modal") کافی نیست: #newDocModal همیشه در DOM هست و فقط
   با کلاسِ hidden پنهان می‌شود، پس همیشه پیدا می‌شد و کلاسِ modal-open هرگز
   برداشته نمی‌شد — نتیجه‌اش قفل‌ماندنِ اسکرولِ کلِ سایت بود. */
function anyModalOpen(){
  var all=document.querySelectorAll(".modal");
  for(var i=0;i<all.length;i++){
    var m=all[i];
    if(m.classList.contains("hidden")) continue;
    if(m.offsetParent===null && getComputedStyle(m).display==="none") continue;
    return true;
  }
  return false;
}
/* ===== قفلِ اسکرولِ پس‌زمینه =====
   ⚠ هدر position:sticky است و به اسکرولِ صفحه چسبیده. اگر صفحه پایین آمده باشد
   و همان‌جا قفل شود، هدر بالای کادرِ دید می‌ماند و دیده نمی‌شود — همان باگی که
   در پنلِ جزئیاتِ سند رخ می‌داد.
   راه‌حل: پیش از قفل، صفحه به بالا برده می‌شود تا هدر در کادر باشد؛ موقعیتِ قبلی
   نگه داشته و هنگامِ بستن دقیقاً برگردانده می‌شود، پس کاربر جایش را گم نمی‌کند.
   (position:fixed روی body امتحان شد و غلط بود: ارتفاعِ صفحه جمع می‌شد،
   نوارِ اسکرول غیب می‌شد و هدر با topِ منفی بریده می‌شد.) */
var _mlY=0, _mlOn=false;
function modalLock(){
  if(_mlOn) return;
  _mlY=window.pageYOffset||document.documentElement.scrollTop||0;
  if(_mlY>0) window.scrollTo(0,0);   // هدر به بالای کادرِ دید بیاید
  document.body.classList.add("modal-open");
  _mlOn=true;
  // دکمهٔ انتقال با این کلاس fixed می‌شود؛ مختصاتش باید همین‌جا ست شود
  if(typeof xferPlaceBtn==="function") xferPlaceBtn();
}
function modalUnlock(){
  if(!_mlOn) return;
  document.body.classList.remove("modal-open");
  if(_mlY>0) window.scrollTo(0,_mlY);   // بازگشت به همان جای قبلی
  _mlOn=false;
  if(typeof xferPlaceBtn==="function") xferPlaceBtn();   // دکمه به جریانِ هدر برگردد
}
/* پنجره‌ها روی هم انباشته می‌شوند (پشته).
   پیش از این، showModal محتوای modalHost را بازنویسی می‌کرد و closeModal همه را یکجا پاک
   می‌کرد؛ پس بازکردنِ پنجره‌ای از درونِ پنجرهٔ دیگر، پنجرهٔ زیرین را نابود می‌کرد و بستنِ
   رویی کاربر را تا صفحهٔ زیرین عقب می‌برد. حالا هر پنجره یک لایهٔ مستقل است و
   closeModal فقط لایهٔ رویی را برمی‌دارد. */
function showModal(title,innerHTML,boxClass){
  var host=document.getElementById("modalHost");
  var layer=document.createElement("div");
  layer.className="modal";
  layer.onclick=function(e){ if(e.target===layer) closeModal(); };
  layer.innerHTML='<div class="box'+(boxClass?" "+boxClass:"")+'">'+
    '<header><strong>'+title+'</strong><button class="modal-x" onclick="closeModal()" aria-label="بستن" title="بستن">✕</button></header>'+
    '<div class="body">'+innerHTML+'</div></div>';
  host.appendChild(layer);
  modalLock();
}
/* به‌روزرسانیِ درجایِ همین پنجره — بدونِ ساختنِ لایهٔ تازه.
   ⚠ چرا لازم است: showModal عمداً appendChild می‌کند تا پنجرهٔ تودرتو
   (مثلاً جزئیاتِ سند ← بارگذاریِ ریویژن) روی قبلی بنشیند و با بستن،
   زیرین باقی بماند. ولی پنجره‌ای که خودش را دوباره رسم می‌کند (مثلِ
   صفحه‌بندی) نباید لایهٔ تازه بسازد — وگرنه با هر کلیک یک پنجره روی
   پنجره جمع می‌شود، پس‌زمینه تیره‌تر می‌شود و بستن باید چندبار تکرار شود. */
function updateModal(title,innerHTML,boxClass){
  var host=document.getElementById("modalHost");
  var top=host?host.lastElementChild:null;
  if(!top) return showModal(title,innerHTML,boxClass);   // پنجره‌ای باز نیست → بساز
  var box=top.querySelector(".box");
  if(!box) return showModal(title,innerHTML,boxClass);
  if(boxClass) box.className="box "+boxClass;
  var t=box.querySelector("header strong"); if(t) t.innerHTML=title;
  var b=box.querySelector(".body"); if(b) b.innerHTML=innerHTML;
  return;
}
/* بستنِ فقط بالاترین پنجره؛ اگر زیرش پنجره‌ای بود، همان دوباره دیده می‌شود. */
function closeModal(){
  var host=document.getElementById("modalHost");
  var top=host?host.lastElementChild:null;
  /* پاکسازیِ پیش‌نمایش فقط وقتی که همین لایه صاحبِ پیش‌نمایش باشد؛ وگرنه بستنِ
     یک پنجرهٔ کوچکِ رویی، پیش‌نمایشِ مودالِ زیرین را هم خاموش می‌کند. */
  var ownsPreview = !!(top && top.querySelector && top.querySelector("#docPreviewHost, #filePreviewHost"));
  if(ownsPreview){
    if(typeof _dpStopPreview==="function") _dpStopPreview();
    if(typeof releaseBlobUrl==="function"){ releaseBlobUrl("docPreview"); releaseBlobUrl("filePreview"); }
  }
  if(top) host.removeChild(top); else if(host) host.innerHTML="";
  if(!anyModalOpen()) modalUnlock();
}
/* بستنِ کلِ پشته — برای جاهایی که پس از یک عمل، ماندنِ پنجرهٔ زیرین بی‌معناست */
function closeAllModals(){
  var host=document.getElementById("modalHost");
  if(typeof _dpStopPreview==="function") _dpStopPreview();
  if(typeof releaseBlobUrl==="function"){ releaseBlobUrl("docPreview"); releaseBlobUrl("filePreview"); }
  if(host) host.innerHTML="";
  if(!anyModalOpen()) modalUnlock();
}

/* ================= خروجی CSV ================= */
function exportCSV(){
  var rows=filteredDocs();
  var head=["Drawing Number","Title","Client","Client Code","Order","Project","Part No","Part Name","Type","Type Code","Rev","Note","Latest","Uploaded By","Date","File URL"];
  var lines=[head.join(",")];
  rows.forEach(function(d){
    var rec=[d.drawingNumber,docPhrase(d),clientName(d.clientCode),d.clientCode,d.orderNo,d.projectNo,pad2(d.partNo),partName(d.partNo),typeName(d.typeCode),d.typeCode,d.rev,d.title,d.isLatest,d.uploadedBy,d.timestamp,d.fileUrl];
    lines.push(rec.map(function(v){ v=String(v==null?"":v).replace(/"/g,'""'); return '"'+v+'"'; }).join(","));
  });
  var csv="﻿"+lines.join("\r\n"); // BOM برای فارسی در اکسل
  var blob=new Blob([csv],{type:"text/csv;charset=utf-8"}); var url=URL.createObjectURL(blob);
  var a=document.createElement("a"); a.href=url; a.download="FSM-documents.csv"; a.click(); URL.revokeObjectURL(url);
}
