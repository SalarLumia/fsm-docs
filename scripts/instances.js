/* ================= ردیابیِ قطعاتِ تولیدی (نمونه‌های فیزیکی) =================
   سامانه‌ای موازیِ اسناد: هر رکورد یک قطعهٔ تولیدیِ *واقعی* از یک قطعهٔ پروژه است.
   دو شناسه دارد:
     • instanceId — سراسری و همیشگی (FSM-INST-0001)؛ هرگز تکرار یا بازاستفاده نمی‌شود.
     • کدِ خوانا — FSM-MNK-02-01-02-INST02 (از روی کدِ قطعه + شمارهٔ ترتیبیِ همان قطعه).
   برای این کدها سندی ساخته یا بارگذاری نمی‌شود؛ فقط شناسنامهٔ مادهٔ خام و وضعیتِ تولید است.
   سقفِ تولید = پارامترِ «تعداد» همان قطعه؛ فقط قطعاتِ «تأییدشده» در آن شمرده می‌شوند
   (قاعده‌ها در بک‌اند هم اعمال می‌شوند، پس دورزدنِ رابط بی‌اثر است). */

var INST_UNDO_IC='<svg viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>';
var _inst = { q:"", loaded:false, editId:"", rec:null };
/* ═══ فیلترِ چیپ‌محور — همان موتورِ آرشیو (scripts/filters.js) ═══
   هفت دسته: مشتری، سفارش، پروژه، قطعه، وضعیت، تأمین‌کننده و نوعِ مادهٔ خام.
   درونِ هر دسته «یا» و بینِ دسته‌ها «و» — عیناً مثلِ آرشیو. */
var _instSel={iClient:[],iOrder:[],iProject:[],iPart:[],iStatus:[],iSource:[],iRaw:[]};
var INST_FIELDS=[
  {id:"iClient",  label:"مشتری"},
  {id:"iOrder",   label:"سفارش"},
  {id:"iProject", label:"پروژه"},
  {id:"iPart",    label:"قطعه"},
  {id:"iStatus",  label:"وضعیت"},
  {id:"iSource",  label:"تأمین‌کننده"},
  {id:"iRaw",     label:"نوع مادهٔ خام"}
];
function instFiltSel(id){ return _instSel[id]||[]; }
/* کلیدِ سفارش/پروژه مثلِ آرشیو ترکیبی است تا هم‌نام‌های مشتری‌های مختلف قاطی نشوند */
function instOrderKey(r){ return String(r.clientCode||"").toUpperCase()+"|"+pad2(r.orderNo); }
function instProjKey(r){ return instOrderKey(r)+"|"+pad2(r.projectNo); }
/* گزینه‌های هر دسته: فقط از دلِ خودِ قطعاتِ ثبت‌شده، نه از کلِ پایگاه داده —
   فیلتری که هیچ نتیجه‌ای ندارد اصلاً پیشنهاد نمی‌شود. */
function instFieldValues(id){
  var rows=DB.instances||[], seen={}, out=[];
  function push(val, fa, en){ if(!val||seen[val]) return; seen[val]=1; out.push({value:val, fa:fa, en:en||""}); }
  var fc=instFiltSel("iClient"), fo=instFiltSel("iOrder"), fp=instFiltSel("iProject");
  if(id==="iStatus") return ["producing","approved","rejected"].map(function(st){
    var si=instStatusInfo(st); return {value:st, fa:INST_STATUS_FA[st], enHtml:badgeHTML(si.cls,si.label)}; });
  rows.forEach(function(r){
    var cc=String(r.clientCode||"").toUpperCase();
    if(id==="iClient") push(cc, clientName(cc), clientNameEn(cc));
    else if(id==="iOrder"){
      if(fc.length && fc.indexOf(cc)<0) return;
      var o=(DB.orders||[]).find(function(x){ return String(x.clientCode).toUpperCase()===cc && pad2(x.orderNo)===pad2(r.orderNo); });
      push(instOrderKey(r), (o&&o.title)?o.title:("سفارش "+pad2(r.orderNo)), cc+"-"+pad2(r.orderNo));
    }
    else if(id==="iProject"){
      if(fc.length && fc.indexOf(cc)<0) return;
      if(fo.length && fo.indexOf(instOrderKey(r))<0) return;
      push(instProjKey(r), projDesc(r), cc+"-"+pad2(r.orderNo)+"-"+pad2(r.projectNo));
    }
    else if(id==="iPart"){
      if(fc.length && fc.indexOf(cc)<0) return;
      if(fp.length && fp.indexOf(instProjKey(r))<0) return;
      push(pad2(r.partNo), partNameFa(r.partNo), pad2(r.partNo));
    }
    else if(id==="iSource") push(String(r.sourceName||""), String(r.sourceName||""));
    else if(id==="iRaw") push(String(r.rawType||""), String(r.rawType||""));
  });
  return out.sort(function(a,b){ return String(a.fa).localeCompare(String(b.fa),"fa"); });
}
/* برچسبِ چیپ: برای دسته‌های ترکیبی از همان فهرستِ مقادیر خوانده می‌شود */
function instFiltLabel(id,val){
  var list=instFieldValues(id);
  for(var i=0;i<list.length;i++) if(list[i].value===val) return list[i].fa;
  if(id==="iStatus") return INST_STATUS_FA[val]||val;
  if(id==="iPart") return partNameFa(val);
  return val;
}
/* با تغییرِ دسته‌های بالادست، انتخاب‌های ناسازگارِ پایین‌دست کنار می‌روند */
function instPrune(){
  var fc=instFiltSel("iClient"), fo=instFiltSel("iOrder"), fp=instFiltSel("iProject");
  if(fc.length){
    _instSel.iOrder=_instSel.iOrder.filter(function(v){ return fc.indexOf(String(v).split("|")[0])>=0; });
    _instSel.iProject=_instSel.iProject.filter(function(v){ return fc.indexOf(String(v).split("|")[0])>=0; });
  }
  if(fo.length) _instSel.iProject=_instSel.iProject.filter(function(v){ return fo.indexOf(String(v).split("|").slice(0,2).join("|"))>=0; });
  if(fp.length){
    var ok={}; (DB.instances||[]).forEach(function(r){ if(fp.indexOf(instProjKey(r))>=0) ok[pad2(r.partNo)]=1; });
    _instSel.iPart=_instSel.iPart.filter(function(v){ return ok[v]; });
  }
}
filtRegister("inst", {
  fields: INST_FIELDS, sel: _instSel, values: instFieldValues, label: instFiltLabel,
  prune: instPrune, onChange: function(){ drawInstances(); },
  chipsHost: "instChips", addBtnId: "instFiltAddBtn"
});

/* با ورود به تبِ ردیابی: رکوردها یک‌بار از سرور گرفته می‌شوند (در بوت‌استرپ نمی‌آیند) */
async function renderInstances(){
  var host=document.getElementById("instBody"); if(!host) return;
  if(!DB.instancesLoaded){
    host.innerHTML=instSkeletonHTML(5);
    var r=await api("listInstances",{},{silent:true, quiet:true});
    if(!r||!r.ok){
      host.innerHTML='<div class="rb-empty muted">خطا در دریافتِ فهرستِ قطعاتِ تولیدی.'+
        (r&&r.error==="UNKNOWN_ACTION"?' این بخش نیاز به انتشارِ مجددِ بک‌اند دارد (Deploy ▸ New version).':'')+'</div>';
      return;
    }
    DB.instances=r.instances||[]; DB.instancesLoaded=true;
  }
  drawInstances();
}
/* تازه‌سازیِ کاملِ فهرست از سرور (پس از هر ثبت/تغییرِ وضعیت) */
async function refreshInstances(){
  var r=await api("listInstances",{},{silent:true, quiet:true});
  if(r&&r.ok){ DB.instances=r.instances||[]; DB.instancesLoaded=true; }
  drawInstances();
  if(typeof rerenderProjectTab==="function" && !document.getElementById("tab-project").classList.contains("hidden")) rerenderProjectTab();
}

/* اسکلتِ لود: قالبِ نوارِ ابزار و جدول بی‌درنگ ساخته می‌شود و سلول‌ها با shimmer منتظرِ
   داده می‌مانند — عیناً الگوی سطلِ زباله. پیامِ متنی عمداً ندارد: خودِ قالب می‌گوید چه
   چیزی دارد می‌آید، و چون ستون‌ها همان‌جایی‌اند که خواهند بود، رسیدنِ داده پرشی ندارد. */
function instSkeletonHTML(n){
  var admin=ME.role==="admin";
  var bar='<div class="inst-bar">'+
    '<div class="arch-search"><span class="sk" style="height:38px;border-radius:10px"></span></div>'+
    '<span class="sk" style="height:12px;width:96px"></span>'+
  '</div>';
  var row='<tr class="inst-row">'+
    '<td><div class="inst-code"><span class="sk" style="height:13px;width:152px"></span>'+
      '<span class="sk" style="height:11px;width:112px;margin-top:5px"></span></div></td>'+
    '<td><div class="inst-part"><span class="sk" style="height:13px;width:88px"></span>'+
      '<span class="sk" style="height:11px;width:134px;margin-top:5px"></span></div></td>'+
    '<td class="c-mid"><span class="sk" style="height:23px;width:78px;border-radius:20px;margin:0 auto"></span></td>'+
    '<td class="c-mid"><span class="sk" style="height:12px;width:74px;margin:0 auto"></span></td>'+
    '<td><span class="sk" style="height:12px;width:98px"></span></td>'+
    '<td><span class="sk" style="height:12px;width:86px"></span></td>'+
    '<td class="c-mid"><span class="sk" style="height:12px;width:62px;margin:0 auto"></span></td>'+
    (admin?'<td class="col-act"><div class="row-actions">'+
      '<span class="sk" style="height:26px;width:26px;border-radius:8px"></span>'+
      '<span class="sk" style="height:26px;width:26px;border-radius:8px"></span></div></td>':'')+
  '</tr>';
  var body=''; for(var i=0;i<(n||4);i++) body+=row;
  return bar+'<div class="tablewrap"><table class="mgmt-table inst-tbl"><thead><tr>'+
      '<th>کد قطعه تولیدی</th><th>قطعه</th><th class="c-mid">وضعیت</th><th class="c-mid">تاریخ ورود</th>'+
      '<th>تأمین‌کننده</th><th>مادهٔ خام</th><th class="c-mid"><span class="en-shift">شمارهٔ هیت</span></th>'+
      (admin?'<th class="col-act"><span class="act-h">عملیات</span></th>':'')+
    '</tr></thead><tbody>'+body+'</tbody></table></div>';
}
function instSorted(){
  return (DB.instances||[]).slice().sort(function(a,b){
    return String(b.instanceId||"").localeCompare(String(a.instanceId||""),"en");   // تازه‌ترین بالا
  });
}
function instFiltered(){
  var q=String(_inst.q||"").trim().toLowerCase();
  var fc=instFiltSel("iClient"), fo=instFiltSel("iOrder"), fp=instFiltSel("iProject"),
      fpart=instFiltSel("iPart"), fs=instFiltSel("iStatus"), fsrc=instFiltSel("iSource"), fraw=instFiltSel("iRaw");
  return instSorted().filter(function(r){
    if(fc.length    && fc.indexOf(String(r.clientCode||"").toUpperCase())<0) return false;
    if(fo.length    && fo.indexOf(instOrderKey(r))<0) return false;
    if(fp.length    && fp.indexOf(instProjKey(r))<0) return false;
    if(fpart.length && fpart.indexOf(pad2(r.partNo))<0) return false;
    if(fs.length    && fs.indexOf(String(r.status||"producing"))<0) return false;
    if(fsrc.length  && fsrc.indexOf(String(r.sourceName||""))<0) return false;
    if(fraw.length  && fraw.indexOf(String(r.rawType||""))<0) return false;
    if(!q) return true;
    var blob=[instanceCode(r), r.instanceId, r.heatNumber, r.supplierSerial, r.sourceName, r.rawType,
      partNameFa(r.partNo), clientName(r.clientCode), r.note].join(" ").toLowerCase();
    return blob.indexOf(q)>=0;
  });
}
function instSetQ(v){ _inst.q=v; drawInstances(); }

function drawInstances(){
  var host=document.getElementById("instBody"); if(!host) return;
  var admin=ME.role==="admin", rows=instFiltered();
  var addBtn=document.getElementById("instAddBtn"); if(addBtn) addBtn.style.display=admin?"":"none";
  /* نوارِ ابزار عیناً الگوی آرشیو: جستجوی متنی با دکمهٔ فیلترِ آیکونی داخلِ باکس،
     و زیرش ردیفِ چیپ‌های فیلترِ فعال (که خودِ موتورِ فیلتر پُرش می‌کند). */
  var bar='<div class="inst-bar">'+
    '<div class="arch-search">'+
      '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>'+
      '<input id="instSearch" placeholder="کدِ قطعهٔ تولیدی، شمارهٔ هیت، سریال، توضیحات…" value="'+esc(_inst.q)+'" oninput="instSetQ(this.value)">'+
      '<button type="button" class="icon-btn sm arch-filter-btn" id="instFilterBtn" title="افزودنِ فیلتر" onclick="filtToggleMenu(event,\'instFilterBtn\',\'inst\')">'+
        '<svg viewBox="0 0 24 24" class="ic"><line x1="5" y1="7" x2="19" y2="7"/><line x1="7" y1="12" x2="17" y2="12"/><line x1="10" y1="17" x2="14" y2="17"/></svg>'+
      '</button></div>'+
    '<span class="inst-count">'+faN(rows.length)+' قطعهٔ تولیدی</span>'+
  '</div>'+
  '<div id="instChips" class="arch-chips" hidden></div>';

  if(!(DB.instances||[]).length){
    host.innerHTML=bar+'<div class="rb-empty">'+emptyState("هنوز قطعهٔ تولیدی‌ای ثبت نشده",
      "برای هر قطعهٔ فیزیکیِ تولیدشده یک رکورد ثبت کنید تا مادهٔ خام، شمارهٔ هیت و وضعیتِ تولیدش ردیابی شود.")+'</div>';
    buildFiltChips("inst");
    return;
  }
  var body=rows.map(function(r){ return instRowHTML(r,admin); }).join("")||emptyRow(admin?8:7);
  host.innerHTML=bar+
    '<div class="tablewrap"><table class="mgmt-table inst-tbl"><thead><tr>'+
      '<th>کد قطعه تولیدی</th><th>قطعه</th><th class="c-mid">وضعیت</th><th class="c-mid">تاریخ ورود</th>'+
      '<th>تأمین‌کننده</th><th>مادهٔ خام</th><th class="c-mid"><span class="en-shift">شمارهٔ هیت</span></th>'+
      (admin?'<th class="col-act"><span class="act-h">عملیات</span></th>':'')+
    '</tr></thead><tbody>'+body+'</tbody></table></div>';
  buildFiltChips("inst");   // ردیفِ چیپ‌های فیلترِ فعال (زیرِ نوارِ جستجو)
  if(!rows.length) host.querySelector("tbody").innerHTML='<tr><td colspan="'+(admin?8:7)+'" class="muted" style="text-align:center;padding:16px">با این فیلترها قطعهٔ تولیدی‌ای پیدا نشد.</td></tr>';
}
function instRowHTML(r,admin){
  var si=instStatusInfo(r.status), st=String(r.status||"producing");
  var acts="";
  if(admin){
    acts='<div class="row-actions">'+
      (st!=="approved"?'<button class="icon-btn sm ok" title="تأیید قطعهٔ تولیدی" onclick="instStatus(\''+esc(r.instanceId)+'\',\'approved\')">'+ICON.check+'</button>':'')+
      (st!=="rejected"?'<button class="icon-btn sm rej" title="ریجکت قطعهٔ تولیدی" onclick="instStatus(\''+esc(r.instanceId)+'\',\'rejected\')">'+ICON.x+'</button>':'')+
      (st==="rejected"?'<button class="icon-btn sm" title="بازگرداندن به «در حال تولید»" onclick="instStatus(\''+esc(r.instanceId)+'\',\'producing\')">'+INST_UNDO_IC+'</button>':'')+
      editIconBtn("openInstanceModal('"+esc(r.instanceId)+"')")+
    '</div>';
  }
  var serial=String(r.supplierSerial||"").trim();
  return '<tr class="inst-row st-'+esc(st)+'">'+
    '<td><div class="inst-code"><span class="inst-num">'+esc(instanceCode(r))+'</span>'+
      '<span class="inst-id">'+esc(r.instanceId)+(serial?' · سریالِ تأمین‌کننده: '+esc(serial):'')+'</span></div></td>'+
    '<td><div class="inst-part"><span class="nm-fa">'+esc(partNameFa(r.partNo))+'</span>'+
      '<span class="inst-proj">'+esc(clientName(r.clientCode))+' · '+esc(projDesc(r))+'</span></div></td>'+
    '<td class="c-mid">'+badgeHTML(si.cls,si.label)+'</td>'+
    '<td class="c-mid"><span class="spec-en">'+esc(instDateFa(r.receivedAt))+'</span></td>'+
    '<td>'+esc(r.sourceName||"—")+'</td>'+
    '<td>'+esc(r.rawType||"—")+'</td>'+
    '<td class="c-mid spec-en"><span class="en-shift">'+esc(r.heatNumber||"—")+'</span></td>'+
    (admin?'<td class="col-act">'+acts+'</td>':'')+
  '</tr>';
}
/* توضیحِ پروژه برای ستونِ «قطعه» (اگر پروژه پیدا نشد، کدش) */
function projDesc(r){
  var p=findProject(r.clientCode,pad2(r.orderNo),pad2(r.projectNo));
  return (p&&p.description)?p.description:(String(r.clientCode||"")+"-"+pad2(r.orderNo)+"-"+pad2(r.projectNo));
}
/* تاریخِ ذخیره‌شده ISO است؛ نمایش شمسیِ عددی (مثلِ بقیهٔ تاریخ‌های سایت) */
function instDateFa(iso){
  var s=String(iso||"").trim(); if(!s) return "—";
  var d=new Date(s+(s.length<=10?"T00:00:00":""));
  if(isNaN(d.getTime())) return s;
  try{ return d.toLocaleDateString("fa-IR-u-nu-latn",{year:"numeric",month:"2-digit",day:"2-digit"}); }catch(e){ return s; }
}

/* ═══ تغییرِ وضعیت ═══
   تأیید ممکن است از سمتِ بک‌اند رد شود (سقفِ «تعداد» پر است) — پیامش عیناً نمایش داده می‌شود. */
async function instStatus(id, st){
  if(!requireAdmin()) return;
  var r=(DB.instances||[]).find(function(x){ return String(x.instanceId)===String(id); }); if(!r) return;
  var lbl=INST_STATUS_FA[st]||st;
  var ask={ approved:"این قطعهٔ تولیدی «تأیید شده» علامت بخورد و در شمارشِ «تعداد» حساب شود؟",
            rejected:"این قطعهٔ تولیدی ریجکت شود؟ شمارهٔ ترتیبی‌اش آزاد نمی‌شود و به قطعهٔ دیگری داده نخواهد شد.",
            producing:"این قطعهٔ تولیدی به «در حال تولید» برگردد؟" }[st];
  if(!(await uiConfirm(ask,{okLabel:lbl,danger:(st==="rejected")}))) return;
  var res=await api("setInstanceStatus",{instanceId:id,status:st},{silent:true});
  if(!res||!res.ok){ toast((res&&res.message)||"تغییرِ وضعیت ناموفق بود.",true); return; }
  toast("وضعیت: "+lbl);
  await refreshInstances();
}

/* ═══ ویزاردِ ثبت/ویرایشِ قطعهٔ تولیدی ═══
   عیناً همان تجربهٔ «ثبت سند / فایل جدید»: ریلِ افقیِ کد در بالا، آکاردئونِ ایستگاه‌ها
   در پایین، و بخشِ نهایی که پس از کاملِ‌شدنِ کد باز می‌شود. موتورش مشترک است
   (scripts/wizard.js) تا هستهٔ سایت یکی بماند؛ اینجا فقط «پارامترهای این بخش» تعریف می‌شوند. */
var IW_ORDER=["iwC","iwO","iwP","iwPart"];
function iwPartObj(pn){ return (DB.parts||[]).filter(function(p){ return pad2(p.partNo)===pad2(pn); })[0]; }
/* شمارهٔ ترتیبیِ بعدیِ همین قطعه = همهٔ رکوردهای موجود + ۱ (ریجکت‌شده‌ها هم شمرده می‌شوند،
   چون شماره‌شان هرگز آزاد نمی‌شود). شمارهٔ نهایی را بک‌اند می‌دهد؛ این فقط پیش‌نمایش است. */
function iwNextSeq(){
  if(_inst.rec) return pad2(_inst.rec.seq);
  var c=wzVal("iwC"), o=wzVal("iwO"), pr=wzVal("iwP"), pn=wzVal("iwPart");
  if(!(c&&o&&pr&&pn)) return "";
  var n=instCountsOf(c,o,pr,pn);
  return pad2(n.producing+n.approved+n.rejected+1);
}
function iwCode(){
  var c=wzVal("iwC"), o=wzVal("iwO"), pr=wzVal("iwP"), pn=wzVal("iwPart"), sq=iwNextSeq();
  if(!(c&&o&&pr&&pn&&sq)) return "";
  return [FSM_CODE,String(c).toUpperCase(),pad2(o),pad2(pr),pad2(pn),"INST"+sq].join("-");
}
var INST_WIZ={
  ids:{ modal:"newInstModal", rail:"iwRail", stage:"iwStage", final:"iwFinal",
        scroll:"iwScroll", spacer:"iwSpacer", ring:"iwRing", pulse:"iwPulse" },
  order:IW_ORDER, tail:"iwSeq", readOnly:false,
  meta:{ iwC:{cap:"مشتری"}, iwO:{cap:"سفارش"}, iwP:{cap:"پروژه"}, iwPart:{cap:"قطعه"} },
  en:{ FSM:"COMPANY", iwC:"CLIENT", iwO:"ORDER", iwP:"PROJECT", iwPart:"PART", iwSeq:"INSTANCE" },
  /* مشتری/سفارش/پروژه از بخشِ «مشتریان و پروژه‌ها» ساخته می‌شوند، پس اینجا دکمهٔ «+» ندارد */
  addTitles:{},
  segVal:function(f){
    if(f==="iwSeq"){ var sq=iwNextSeq(); return sq?("INST"+sq):""; }
    var v=wzVal(f); if(!v) return "";
    return (f==="iwC")?String(v).toUpperCase():pad2(v);
  },
  options:function(f){
    if(f==="iwC") return clientsSorted().map(function(c){
      return {val:c.code, label:c.name, icon:'<span class="nd-logo">'+cpLogo(c,30)+'</span>'}; });
    if(f==="iwO"){ var c=wzVal("iwC"); if(!c) return [];
      return ordersOf(c).map(function(o){ var n=pad2(o.orderNo);
        return {val:n, label:(o.title||("سفارش "+n)), icon:ndNumBadge(n)}; }); }
    if(f==="iwP"){ var c2=wzVal("iwC"), o2=wzVal("iwO"); if(!c2||!o2) return [];
      return projectsOf(c2,o2).map(function(p){ var n=pad2(p.projectNo);
        return {val:n, label:(p.description||("پروژه "+n)), icon:ndNumBadge(n)}; }); }
    if(f==="iwPart"){
      /* فقط قطعاتِ همین پروژه — قطعهٔ ۰۰ (سطحِ پروژه) اینجا معنا ندارد، چون
         قطعهٔ تولیدی همیشه یک قطعهٔ فیزیکیِ واقعی است. */
      var c3=wzVal("iwC"), o3=wzVal("iwO"), pr3=wzVal("iwP"); if(!(c3&&o3&&pr3)) return [];
      var proj=findProject(c3,o3,pr3); if(!proj) return [];
      return projectPartsList(proj).map(function(pn){
        var po=iwPartObj(pn);
        return {val:pad2(pn), label:partNameFa(pn), icon:ndElBadge(po?partIconInner(po):('<span class="el-code">'+esc(pad2(pn))+'</span>'))}; });
    }
    return [];
  },
  titleIc:function(f){
    var m={ iwC:(typeof SEC_IC_CLIENT!=="undefined"?SEC_IC_CLIENT:""),
            iwO:(typeof SEC_IC_ORDERS!=="undefined"?SEC_IC_ORDERS:""),
            iwP:(typeof SEC_IC_PROJ!=="undefined"?SEC_IC_PROJ:""),
            iwPart:(typeof SEC_IC_PART!=="undefined"?SEC_IC_PART:"") };
    return m[f]||"";
  },
  emptyMsg:function(f){
    if(f==="iwO") return "برای این مشتری سفارشی ثبت نشده.";
    if(f==="iwP") return "برای این سفارش پروژه‌ای ثبت نشده.";
    if(f==="iwPart") return "برای این پروژه قطعه‌ای تعریف نشده؛ از صفحهٔ پروژه قطعه اضافه کنید.";
    return "موردی برای انتخاب نیست.";
  },
  stepHint:function(f){
    if(f==="iwPart") return "فقط قطعاتِ همین پروژه فهرست می‌شوند؛ هر قطعهٔ تولیدی به یکی از آن‌ها بسته می‌شود.";
    return "";
  },
  finalHTML:function(){ return iwFinalHTML(); },
  onFinalShown:function(){ instDateHint(); instQtyHint(); },
  onFinalSync:function(){ instQtyHint(); iwSyncPreview(); }
};
var INST_UP_IC='<svg viewBox="0 0 24 24"><path d="M12 2l9 5v10l-9 5-9-5V7z"/><path d="M3 7l9 5 9-5"/><line x1="12" y1="12" x2="12" y2="22"/></svg>';
/* بخشِ نهایی: شناسنامهٔ مادهٔ خام + کدِ قطعهٔ تولیدی + دکمهٔ ثبت — هم‌قابِ «بارگذاری سند/فایل» */
function iwFinalHTML(){
  var r=_inst.rec, sup=suppliersSorted(), raw=rawTypesSorted();
  var curSup=r?String(r.sourceName||""):"", curRaw=r?String(r.rawType||""):"";
  function opts(list,cur){
    return '<option value="">انتخاب کنید</option>'+list.map(function(m){
      return '<option value="'+esc(m.nameFa)+'"'+(cur===m.nameFa?" selected":"")+'>'+esc(m.nameFa)+'</option>'; }).join("")+
      /* مقدارِ قدیمیِ حذف‌شده از فهرستِ اصلی نباید بی‌صدا گم شود */
      ((cur && !list.some(function(m){ return m.nameFa===cur; }))?'<option value="'+esc(cur)+'" selected>'+esc(cur)+' (خارج از فهرست)</option>':'');
  }
  return ''+
  '<div class="nd-finalbox">'+
    '<div class="nd-final-hd"><span class="nd-sec-ic">'+INST_UP_IC+'</span><span class="nd-sec-t">شناسنامهٔ مادهٔ خام</span></div>'+
    '<div class="nd-sec-div"></div>'+
    '<div class="nd-final-inner">'+
      '<div class="nd-fstack">'+
        '<div class="um-row">'+
          '<div class="um-field"><label class="fld">تاریخ ورودِ مادهٔ خام</label>'+
            '<input type="date" id="inDate" style="direction:ltr;text-align:left" value="'+esc(r?String(r.receivedAt||""):"")+'" oninput="instDateHint()">'+
            '<span class="fld-hint" id="inDateFa"></span></div>'+
          '<div class="um-field"><label class="fld">شمارهٔ هیت / بچ</label>'+
            '<input id="inHeat" style="direction:ltr;text-align:left" placeholder="H-4471" value="'+esc(r?String(r.heatNumber||""):"")+'"></div>'+
        '</div>'+
        '<div class="um-row">'+
          '<div class="um-field"><label class="fld">تأمین‌کننده / کارگاهِ سازنده</label><select id="inSup">'+opts(sup,curSup)+'</select></div>'+
          '<div class="um-field"><label class="fld">نوع مادهٔ خام</label><select id="inRaw">'+opts(raw,curRaw)+'</select></div>'+
        '</div>'+
        '<div class="um-row">'+
          '<div class="um-field"><label class="fld">سریالِ فیزیکیِ تأمین‌کننده <span class="fld-hint">(اختیاری)</span></label>'+
            '<input id="inSerial" style="direction:ltr;text-align:left" value="'+esc(r?String(r.supplierSerial||""):"")+'"></div>'+
          '<div class="um-field"><label class="fld">توضیحات</label>'+
            '<input id="inNote" placeholder="هر نکتهٔ لازم دربارهٔ این قطعه" value="'+esc(r?String(r.note||""):"")+'"></div>'+
        '</div>'+
        '<div class="ed-req-note" id="inQty"></div>'+
        ((sup.length&&raw.length)?'':'<div class="ed-req-note attn">'+ED_ALERT_IC+'فهرستِ تأمین‌کنندگان یا انواعِ مادهٔ خام خالی است؛ از «تنظیمات» پُرش کنید.</div>')+
      '</div>'+
      '<div class="nd-actions">'+
        '<div class="nd-namewrap">'+
          '<button type="button" class="nd-nameline" onclick="iwCopyCode()" title="برای کپی، روی کد کلیک کنید">'+
            '<span class="nd-name-t">کد قطعهٔ تولیدی</span>'+
            '<span class="nd-final-num" id="iwPreview">'+esc(iwCode())+'</span>'+
          '</button>'+
          '<div class="nd-step-hint nd-copy-hint">'+WZ_INFO_IC+'برای کپی کردن کد، روی آن کلیک نمایید.</div>'+
        '</div>'+
        '<button type="button" class="btn primary" id="iwSubmitBtn" onclick="saveInstance()">'+(r?"ذخیرهٔ تغییرات":"ثبت قطعهٔ تولیدی")+'</button>'+
      '</div>'+
    '</div>'+
  '</div>';
}
function iwSyncPreview(){ var el=document.getElementById("iwPreview"); if(el) el.textContent=iwCode(); }
function iwCopyCode(){
  var code=iwCode(); if(!code) return;
  try{ navigator.clipboard.writeText(code); toast("کد قطعهٔ تولیدی کپی شد"); }catch(e){}
}
/* ctx (اختیاری) = {c,o,pr,pn} وقتی از کارتِ قطعه باز می‌شود: ایستگاه‌ها از پیش پر می‌شوند
   ولی قفل نیستند — دقیقاً مثلِ «ثبت سند» که از صفحهٔ پروژه با پیش‌تنظیم باز می‌شود. */
function openInstanceModal(id, ctx){
  if(!requireAdmin()) return;
  var r = id ? (DB.instances||[]).filter(function(x){ return String(x.instanceId)===String(id); })[0] : null;
  _inst.editId = r ? String(r.instanceId) : "";
  _inst.rec = r || null;
  INST_WIZ.readOnly = !!r;                       // هویتِ یک رکوردِ ثبت‌شده عوض نمی‌شود
  var t=document.getElementById("iwTitle");
  if(t) t.textContent = r ? ("ویرایشِ قطعهٔ تولیدی "+instanceCode(r)) : "ثبت قطعهٔ تولیدیِ جدید";
  wzOpen(INST_WIZ);
  var pre = r ? {c:r.clientCode,o:r.orderNo,pr:r.projectNo,pn:r.partNo} : ((ctx&&ctx.c)?ctx:null);
  if(pre){ wzSet("iwC",String(pre.c).toUpperCase()); wzSet("iwO",pad2(pre.o)); wzSet("iwP",pad2(pre.pr)); wzSet("iwPart",pad2(pre.pn)); }
  /* اگر کد از پیش کامل است (ویرایش یا ورود از کارتِ قطعه) هیچ ایستگاهی فعال نمی‌ماند
     و مستقیم بخشِ نهایی باز می‌شود — عیناً رفتارِ پنلِ ثبتِ سند. */
  WZ.active = wzFirstIncomplete();
  wzRender();
  var sc=document.getElementById("iwScroll"); if(sc) sc.scrollTop=0;
}
function closeNewInstModal(){ wzClose(); _inst.editId=""; _inst.rec=null; }
document.addEventListener("keydown",function(e){
  if(e.key!=="Escape") return;
  if(wzIsOpen("newInstModal")) closeNewInstModal();
});
function instSel(id){ var el=document.getElementById(id); return el?el.value:""; }
/* معادلِ شمسیِ تاریخِ انتخاب‌شده، زیرِ همان فیلد (تقویمِ مرورگر میلادی است) */
function instDateHint(){
  var el=document.getElementById("inDateFa"); if(!el) return;
  var v=instSel("inDate");
  el.textContent=v?("معادلِ شمسی: "+instDateFa(v)):"";
}
/* وضعیتِ سهمیهٔ همین قطعه: «۱ از ۲ تأییدشده» + هشدارِ عبور از سقف */
function instQtyHint(){
  var box=document.getElementById("inQty"); if(!box) return;
  var c=wzVal("iwC"), o=wzVal("iwO"), pr=wzVal("iwP"), pn=wzVal("iwPart");
  if(!(c&&o&&pr&&pn)){ box.innerHTML=""; box.className="ed-req-note"; return; }
  var q=partQtyOf(c,o,pr,pn), n=instCountsOf(c,o,pr,pn);
  var txt="قطعاتِ تولیدیِ این قطعه: "+faN(n.approved)+" تأییدشده"+
    (n.producing?(" · "+faN(n.producing)+" در حال تولید"):"")+
    (n.rejected?(" · "+faN(n.rejected)+" ریجکت‌شده"):"")+
    (q?(" — «تعداد»ِ تعریف‌شده: "+faN(q)):" — پارامترِ «تعداد» برای این قطعه تعریف نشده");
  var over=q && (n.approved+n.producing)>=q;
  box.className="ed-req-note"+((q&&n.approved>=q)||over?" attn":"");
  box.innerHTML=((q&&n.approved>=q)||over?ED_ALERT_IC:WZ_INFO_IC)+
    esc(txt)+((q&&n.approved>=q)?" — سهمیه پر است و ثبتِ قطعهٔ تازه ممکن نیست.":(over?" — با ثبتِ قطعهٔ تازه از «تعداد» فراتر می‌روید.":""));
}
/* «تعداد»ِ یک قطعهٔ پروژه از پارامترهای همان قطعه (هم‌منطقِ partQuantity در بک‌اند) */
function partQtyOf(c,o,pr,pn){
  var p=findProject(c,o,pr); if(!p) return 0;
  var v=(typeof partValsOf==="function")?partValsOf(p,pn):{};
  var n=parseInt(String(v["تعداد"]||"").replace(/[^\d]/g,""),10);
  return isNaN(n)?0:n;
}
async function saveInstance(){
  if(!requireAdmin()) return;
  var c=wzVal("iwC"), o=wzVal("iwO"), pr=wzVal("iwP"), pn=wzVal("iwPart");
  if(!(c&&o&&pr&&pn)){ toast("قطعهٔ پروژه را کامل انتخاب کنید.",true); return; }
  var payload={ clientCode:c, orderNo:pad2(o), projectNo:pad2(pr), partNo:pad2(pn),
    receivedAt:instSel("inDate"), sourceName:instSel("inSup"), rawType:instSel("inRaw"),
    heatNumber:String((document.getElementById("inHeat")||{}).value||"").trim(),
    supplierSerial:String((document.getElementById("inSerial")||{}).value||"").trim(),
    note:String((document.getElementById("inNote")||{}).value||"").trim() };
  var req=[["receivedAt","تاریخ ورود"],["sourceName","تأمین‌کننده"],["rawType","نوع مادهٔ خام"],["heatNumber","شمارهٔ هیت"]];
  for(var i=0;i<req.length;i++) if(!payload[req[i][0]]){ toast("فیلدِ «"+req[i][1]+"» الزامی است.",true); return; }
  if(_inst.editId) payload.instanceId=_inst.editId;
  var r=await api("saveInstance",payload,{silent:true});
  if(!r||!r.ok){ toast((r&&r.message)||"ذخیره ناموفق بود.",true); return; }
  closeNewInstModal();
  toast(_inst.editId?"قطعهٔ تولیدی به‌روزرسانی شد":("قطعهٔ تولیدی ثبت شد: "+r.instanceId));
  if(r.warn) toast(r.warn,true);
  _inst.editId=""; _inst.rec=null;
  await refreshInstances();
}

/* ═══ ورودی از کارتِ قطعه در صفحهٔ پروژه ═══ */
function openPartInstances(c,o,pr,pn){
  /* همان فیلترهای بخش، ولی از پیش روی این قطعه تنظیم‌شده — پس کاربر می‌بیند
     چه فیلتری خورده و می‌تواند با یک کلیک چیپش را بردارد. */
  _inst.q="";
  _instSel.iClient=[String(c).toUpperCase()];
  _instSel.iOrder=[String(c).toUpperCase()+"|"+pad2(o)];
  _instSel.iProject=[String(c).toUpperCase()+"|"+pad2(o)+"|"+pad2(pr)];
  _instSel.iPart=[pad2(pn)];
  _instSel.iStatus=[]; _instSel.iSource=[]; _instSel.iRaw=[];
  switchTab("instances");
  if(DB.instancesLoaded) drawInstances();
}
