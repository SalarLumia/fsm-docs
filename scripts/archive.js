/* ================= آرشیو ================= */
var _arch = { sortKey:"date", sortDir:-1 };
var ARCH_COLS = [
  {k:"number",label:"شماره سند"},{k:"client",label:"مشتری"},{k:"order",label:"سفارش"},
  {k:"project",label:"پروژه"},{k:"part",label:"قطعه"},{k:"type",label:"نوع"},
  {k:"rev",label:"ریویژن"},{k:"status",label:"وضعیت"},{k:"date",label:"تاریخ"}
];
var ARCH_CLIP = '<svg class="file-ic" viewBox="0 0 24 24" title="دارای فایل"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>';

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
    var latest=String(d.isLatest).toLowerCase()==="true";
    var hasFile=!!d.fileId;
    var si=statusInfo(d.status);
    return "<tr>"+
      '<td class="mono" style="direction:ltr;text-align:left">'+(hasFile?ARCH_CLIP:'')+'<a href="#" onclick="openDocDetail(\''+esc(d.drawingNumber)+'\');return false">'+esc(d.drawingNumber)+"</a></td>"+
      "<td>"+esc(clientName(d.clientCode))+"</td>"+
      "<td>"+esc(pad2(d.orderNo))+"</td><td>"+esc(pad2(d.projectNo))+"</td>"+
      "<td>"+esc(partName(d.partNo))+"</td>"+
      "<td>"+esc(typeName(d.typeCode))+"</td>"+
      '<td class="mono">'+esc(d.rev)+' <span class="pill '+(latest?"latest":"old")+'">'+(latest?"آخرین":"قدیمی")+"</span></td>"+
      '<td><span class="badge '+si.cls+'">'+si.label+"</span></td>"+
      "<td>"+fmtDate(d.timestamp)+"</td>"+
      '<td class="row-actions">'+
        viewIconBtn("openDocDetail('"+esc(d.drawingNumber)+"')")+
        (hasFile?downloadIconBtn("downloadFile('"+d.fileId+"')"):'')+
        (admin?delIconBtn("delDocument('"+esc(d.drawingNumber)+"')"):'')+
      "</td></tr>";
  }).join("");
  document.getElementById("archiveBody").innerHTML = html || '<tr><td colspan="10" class="muted" style="text-align:center;padding:24px">موردی با این فیلترها یافت نشد.</td></tr>';
  document.getElementById("archiveCount").textContent = rows.length+" سند";
}
async function delDocument(num){
  if(!(await uiConfirm("حذف سند «"+num+"»؟ سند از فهرست حذف و فایلش به سطلِ زبالهٔ گوگل‌درایو منتقل می‌شود (تا حدود یک ماه قابلِ بازیابی).",{danger:true,okLabel:"حذف"}))) return;
  var r=await api("deleteDocument",{drawingNumber:num});
  if(r.ok){ toast("حذف شد"); refreshDocuments(); } else toast(r.message||"حذف ناموفق",true);
}

/* ================= پیش‌نمایش / دانلود فایل ================= */
async function previewFile(fileId){
  toast("در حال بازکردن…");
  var r=await api("getFile",{fileId:fileId});
  if(!r.ok){ toast(r.message||"خطا در دریافت فایل",true); return; }
  var blob=b64toBlob(r.base64, r.mimeType); var url=previewBlobUrl("filePreview", blob);
  var inner = r.mimeType.indexOf("image/")===0 ? '<img src="'+url+'">' : '<iframe src="'+url+'"></iframe>';
  showModal(esc(r.name), inner);
}
async function downloadFile(fileId){
  toast("در حال آماده‌سازی دانلود…");
  var r=await api("getFile",{fileId:fileId});
  if(!r.ok){ toast(r.message||"خطا",true); return; }
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
