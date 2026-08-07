/* ================= آرشیو ================= */
var _arch = { sortKey:"date", sortDir:-1 };
/* ستون‌های آرشیو (راست→چپ): «نوع» به‌صورتِ المانِ سند در راست‌ترین ستون؛ ریویژن حذف شد. */
var ARCH_COLS = [
  {k:"type",label:"نوع"},{k:"number",label:"شماره سند"},{k:"client",label:"مشتری"},
  {k:"order",label:"سفارش"},{k:"project",label:"پروژه"},{k:"part",label:"قطعه"},
  {k:"status",label:"وضعیت"},{k:"date",label:"تاریخ"}
];
var KEBAB_IC = '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><circle cx="12" cy="5" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="12" cy="19" r="1.7"/></svg>';

function filteredDocs(){
  var q=(document.getElementById("aSearch").value||"").trim().toLowerCase();
  var fc=document.getElementById("aClient").value, ft=document.getElementById("aType").value,
      fl=document.getElementById("aLatest").value, fs=document.getElementById("aStatus").value,
      fp=document.getElementById("aProject").value;
  return DB.documents.filter(function(d){
    if(fc && d.clientCode!==fc) return false;
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
  renderArchive();
}
function buildArchiveHead(){
  var host=document.getElementById("archiveHead"); if(!host) return;
  host.innerHTML='<tr>'+ARCH_COLS.map(function(col){
    var on=_arch.sortKey===col.k, arrow=on?(_arch.sortDir<0?' ▼':' ▲'):'';
    return '<th class="sortable'+(on?' active':'')+'" onclick="sortArchive(\''+col.k+'\')" title="مرتب‌سازی">'+esc(col.label)+'<span class="sort-ar">'+arrow+'</span></th>';
  }).join("")+'<th>عملیات</th></tr>';
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
function onArchiveClientChange(){ document.getElementById("aProject").value=""; renderArchive(); }
function clearArchiveFilters(){
  ["aSearch","aClient","aProject","aType","aStatus","aLatest"].forEach(function(id){ var el=document.getElementById(id); if(el) el.value=""; });
  renderArchive();
}

function renderArchive(){
  populateArchiveProjects();
  buildArchiveHead();
  var rows=filteredDocs().slice().sort(archCompare);
  var admin=ME.role==="admin";
  var html=rows.map(function(d){
    var si=statusInfo(d.status);
    var num=esc(d.drawingNumber), open="openDocDetail('"+num+"')";
    return "<tr>"+
      // نوع → المانِ سند (راست‌ترین ستون؛ ستونِ نوعِ متنی حذف شد)
      '<td><span class="el-badge" title="'+esc(typeName(d.typeCode))+'">'+docTypeIconInner({code:d.typeCode})+'</span></td>'+
      // شماره سند — سبکِ پنلِ پروژه، کلیک‌پذیر (جایگزینِ دکمهٔ نمایش)
      '<td><span class="arch-num" title="نمایش جزئیات سند" onclick="'+open+'">'+num+'</span></td>'+
      // مشتری → کد + تولتیپِ نامِ کامل + کلیک به پنلِ همان مشتری
      '<td><span class="arch-client" title="'+esc(clientName(d.clientCode))+'" onclick="navGoClient(\''+esc(d.clientCode)+'\')">'+esc(d.clientCode)+'</span></td>'+
      '<td>'+esc(pad2(d.orderNo))+'</td>'+
      '<td>'+esc(pad2(d.projectNo))+'</td>'+
      '<td>'+esc(partName(d.partNo))+'</td>'+
      '<td>'+badgeHTML(si.cls, si.label)+'</td>'+
      '<td class="arch-date">'+fmtDate(d.timestamp)+'</td>'+
      // عملیات → منوی سه‌نقطه‌ای (فقط مدیر: ویرایش + حذف)
      '<td class="arch-act">'+(admin?'<button class="kebab-btn" title="عملیات" aria-label="عملیات" onclick="archKebab(event,\''+num+'\')">'+KEBAB_IC+'</button>':'')+'</td>'+
    "</tr>";
  }).join("");
  document.getElementById("archiveBody").innerHTML = html || '<tr><td colspan="9" class="muted" style="text-align:center;padding:24px">موردی با این فیلترها یافت نشد.</td></tr>';
  document.getElementById("archiveCount").textContent = rows.length+" سند";
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
  if(!(await uiConfirm("حذف سند «"+num+"»؟ سند از فهرست حذف و فایلش به سطلِ زبالهٔ گوگل‌درایو منتقل می‌شود (تا حدود یک ماه قابلِ بازیابی).",{danger:true,okLabel:"حذف"}))) return;
  var r=await api("deleteDocument",{drawingNumber:num});
  if(r.ok){ toast("حذف شد"); refreshDocuments(); } else toast(r.message||"حذف ناموفق",true);
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
function showModal(title,innerHTML,boxClass){
  var host=document.getElementById("modalHost");
  host.innerHTML='<div class="modal" onclick="if(event.target===this)closeModal()"><div class="box'+(boxClass?" "+boxClass:"")+'">'+
    '<header><strong>'+title+'</strong><button class="modal-x" onclick="closeModal()" aria-label="بستن" title="بستن">✕</button></header>'+
    '<div class="body">'+innerHTML+'</div></div></div>';
}
function closeModal(){
  // توقفِ برآوردگرِ نوارِ پیشرفتِ پیش‌نمایش تا تایمرش پس از بسته‌شدن روی پیش‌نمایشِ بعدی ننویسد
  if(typeof _dpStopPreview==="function") _dpStopPreview();
  // آزادسازیِ URLهای بلابِ مودال (پیش‌نمایشِ سند/فایل) تا در جلسه‌های طولانی حافظه نشت نکند
  if(typeof releaseBlobUrl==="function"){ releaseBlobUrl("docPreview"); releaseBlobUrl("filePreview"); }
  document.getElementById("modalHost").innerHTML="";
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
