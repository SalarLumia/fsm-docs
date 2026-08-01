/* ================= مرکز دانلود (صفِ معلق و غیرمسدودکننده) =================
   به‌جای اینکه دکمهٔ «دانلود» کلِ صفحه را مات کند و کاربر منتظر بماند، هر درخواست به یک
   «کارت» در پنلِ شناورِ مرکز دانلود می‌رود. فایل در پس‌زمینه (به‌صورتِ استریمی، با نمایشِ
   پیشرفت) آماده می‌شود و بقیهٔ سایت آزاد می‌ماند؛ به‌محضِ کامل‌شدن، فایل به‌صورتِ خودکار به
   فهرستِ دانلودِ مرورگر سپرده می‌شود. صف تک‌کاره است (هر لحظه یک فایل) تا فایلِ حجیم سرویس را
   قفل نکند؛ بقیه در حالتِ «در صف» منتظر می‌مانند. الگو: مرکزِ دانلودِ کنوا. */

var _dlJobs = [];      // {id, fileId, label, name, status, pct, loaded, total, blobUrl, msg}
var _dlSeq  = 0;       // شمارندهٔ یکتای کارها
var _dlActive = false; // آیا کارگرِ صف مشغولِ یک دانلود است؟
var _dlMin = false;    // وضعیتِ جمع‌شدهٔ پنل

/* افزودنِ یک درخواست به صف. label = برچسبِ نمایشیِ اولیه (معمولاً شمارهٔ سند) تا پیش از رسیدنِ
   نامِ واقعیِ فایل چیزی برای نشان‌دادن باشد. */
function dlEnqueue(fileId, label){
  if(!fileId){ toast("این مورد فایلی برای دانلود ندارد.",true); return; }
  var id = ++_dlSeq;
  _dlJobs.push({ id:id, fileId:fileId, label:(label||"سند"), name:"", status:"queued",
                 pct:0, loaded:0, total:0, blobUrl:null, msg:"" });
  _dlMin=false;   // با افزودنِ کارِ نو، پنل باز شود
  dlRender();
  dlPump();
}

/* کارگرِ صف: هر بار اولین کارِ «در صف» را برمی‌دارد و کاملش می‌کند، سپس سراغِ بعدی می‌رود. */
async function dlPump(){
  if(_dlActive) return;
  var job = _dlJobs.filter(function(j){ return j.status==="queued"; })[0];
  if(!job) return;
  _dlActive = true;
  job.status="working"; job.pct=0; job.loaded=0; job.total=0; job.msg="";
  dlRender();
  try{
    var r = await getFileRetry(job.fileId, { onProgress:function(loaded,total){
      job.loaded=loaded; job.total=total;
      if(total>0) job.pct=Math.min(99, Math.round(loaded/total*100));
      dlProgress(job);   // به‌روزرسانیِ سبکِ فقطِ همان کارت (بدونِ بازسازیِ کلِ فهرست)
    }});
    if(!r || !r.ok){
      job.status="error"; job.msg=(r&&r.message)||"دریافتِ فایل ناموفق بود.";
      dlRender();
    } else {
      var blob = b64toBlob(r.base64, r.mimeType);
      job.name = r.name || (job.label+"");
      job.mimeType = r.mimeType||"";
      job.blobUrl = URL.createObjectURL(blob);
      job.pct = 100; job.status="done";
      dlRender();
      dlHandOff(job);   // سپردن به دانلودِ مرورگر
    }
  }catch(e){
    job.status="error"; job.msg="خطا در دریافتِ فایل.";
    dlRender();
  } finally {
    _dlActive=false;
    dlPump();   // کارِ بعدیِ صف (اگر باشد)
  }
}

/* سپردنِ فایلِ آماده‌شده به فهرستِ دانلودِ مرورگر (لینکِ نامرئیِ download). */
function dlHandOff(job){
  if(!job || !job.blobUrl) return;
  var a=document.createElement("a");
  a.href=job.blobUrl; a.download=job.name||"file";
  document.body.appendChild(a); a.click(); a.remove();
  // blobUrl را نگه می‌داریم تا «دانلودِ دوباره» ممکن باشد؛ با حذفِ کارت یا «پاک‌کردن» آزاد می‌شود.
}

/* ---------- رندرِ پنل ---------- */
function dlHost(){
  var h=document.getElementById("dlCenter");
  if(!h){ h=document.createElement("div"); h.id="dlCenter"; h.className="dl-center"; document.body.appendChild(h); }
  return h;
}
function dlRender(){
  var host=dlHost();
  if(!_dlJobs.length){ host.className="dl-center"; host.innerHTML=""; return; }
  var activeN=_dlJobs.filter(function(j){ return j.status==="working"||j.status==="queued"; }).length;
  var doneN =_dlJobs.filter(function(j){ return j.status==="done"; }).length;
  var title = activeN ? ("در حال دانلود ("+activeN+")") : "دانلودها";
  host.className="dl-center show"+(_dlMin?" min":"");
  host.innerHTML=
    '<div class="dl-head" onclick="dlToggleMin()" title="'+(_dlMin?"بازکردن":"جمع‌کردن")+'">'+
      '<span class="dl-title">'+DL_IC.center+'<span>'+esc(title)+'</span></span>'+
      '<div class="dl-head-acts" onclick="event.stopPropagation()">'+
        (doneN? '<button class="dl-textbtn" onclick="dlClearDone()" title="پاک‌کردنِ کامل‌شده‌ها">پاک‌کردن</button>':'')+
        '<button class="dl-iconbtn" onclick="dlToggleMin()" title="'+(_dlMin?"بازکردن":"جمع‌کردن")+'" aria-label="جمع/باز">'+
          (_dlMin?DL_IC.up:DL_IC.down)+'</button>'+
      '</div>'+
    '</div>'+
    '<div class="dl-list">'+_dlJobs.map(dlItemHTML).join("")+'</div>';
}

function dlItemHTML(j){
  var name = esc(j.name||j.label);
  var state, cls="";
  if(j.status==="queued")      state="در صف…";
  else if(j.status==="working") state = j.total>0 ? ("در حال دریافت… "+j.pct+"٪")
                                                  : ("در حال دریافت… "+(j.loaded/1048576).toFixed(1)+" MB");
  else if(j.status==="done"){   state="دانلود شد"; cls="ok"; }
  else {                        state=j.msg||"ناموفق"; cls="err"; }

  var indet=(j.status==="working" && !(j.total>0));
  var bar=(j.status==="working"||j.status==="queued")
    ? '<div class="dl-bar'+(indet?" indet":"")+'"><span class="dl-fill" style="width:'+(indet?100:j.pct)+'%"></span></div>'
    : '';

  var acts="";
  if(j.status==="done")       acts+='<button class="dl-iconbtn" onclick="dlRedownload('+j.id+')" title="دانلودِ دوباره" aria-label="دانلودِ دوباره">'+DL_IC.dl+'</button>';
  else if(j.status==="error") acts+='<button class="dl-iconbtn" onclick="dlRetry('+j.id+')" title="تلاشِ دوباره" aria-label="تلاشِ دوباره">'+DL_IC.retry+'</button>';
  acts+='<button class="dl-iconbtn" onclick="dlRemove('+j.id+')" title="حذف از فهرست" aria-label="حذف">'+DL_IC.x+'</button>';

  return '<div class="dl-item '+j.status+'" data-id="'+j.id+'">'+
    '<span class="dl-fileic">'+dlFileIcon(j)+'</span>'+
    '<div class="dl-main">'+
      '<div class="dl-name" title="'+name+'">'+name+'</div>'+
      '<div class="dl-state '+cls+'">'+esc(state)+'</div>'+
      bar+
    '</div>'+
    '<div class="dl-acts">'+acts+'</div>'+
  '</div>';
}

/* به‌روزرسانیِ سبکِ پیشرفت (فقط متنِ وضعیت + عرضِ نوار) تا با هر chunk کلِ فهرست بازسازی نشود. */
function dlProgress(j){
  var host=document.getElementById("dlCenter"); if(!host) return;
  var el=host.querySelector('.dl-item[data-id="'+j.id+'"]'); if(!el){ dlRender(); return; }
  var st=el.querySelector(".dl-state");
  if(st) st.textContent = j.total>0 ? ("در حال دریافت… "+j.pct+"٪")
                                    : ("در حال دریافت… "+(j.loaded/1048576).toFixed(1)+" MB");
  if(j.total>0){ var f=el.querySelector(".dl-fill"); if(f){ el.querySelector(".dl-bar").classList.remove("indet"); f.style.width=j.pct+"%"; } }
}

/* ---------- اکشن‌ها ---------- */
function _dlById(id){ return _dlJobs.filter(function(j){ return j.id===id; })[0]||null; }
function dlToggleMin(){ _dlMin=!_dlMin; dlRender(); }
function dlRedownload(id){ var j=_dlById(id); if(j && j.blobUrl) dlHandOff(j); }
function dlRetry(id){ var j=_dlById(id); if(!j) return; j.status="queued"; j.pct=0; j.msg=""; dlRender(); dlPump(); }
function dlRemove(id){
  var j=_dlById(id);
  if(j && j.blobUrl){ try{ URL.revokeObjectURL(j.blobUrl); }catch(e){} }
  _dlJobs=_dlJobs.filter(function(x){ return x.id!==id; });
  dlRender();
}
function dlClearDone(){
  _dlJobs.forEach(function(j){ if(j.status==="done" && j.blobUrl){ try{ URL.revokeObjectURL(j.blobUrl); }catch(e){} } });
  _dlJobs=_dlJobs.filter(function(j){ return j.status!=="done"; });
  dlRender();
}

/* ---------- آیکون‌ها ---------- */
var DL_IC = {
  center:'<svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
  dl:'<svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
  retry:'<svg viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>',
  x:'<svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  up:'<svg viewBox="0 0 24 24"><polyline points="18 15 12 9 6 15"/></svg>',
  down:'<svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>'
};
function dlFileIcon(j){
  var m=String(j.mimeType||"").toLowerCase(), n=String(j.name||j.label||"").toLowerCase();
  if(m.indexOf("image/")===0)
    return '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
  if(/^model\//.test(m) || /\.(glb|gltf)$/.test(n))
    return '<svg viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>';
  // پیش‌فرض: سند
  return '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
}
