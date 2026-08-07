/* ================= تنظیمات سامانه (قطعات، انواع سند، کاربران) ================= */
function renderDataTables(){
  // parts (مرتب بر اساس شماره، صعودی)
  document.getElementById("partsBody").innerHTML=partsSorted().map(function(p){
    return "<tr><td class='col-el'><span class='el-badge'>"+partIconInner(p)+"</span></td><td class='nm-fa'>"+esc(p.nameFa||"—")+"</td><td class='spec-en c-mid'><span class='en-shift'>"+esc(p.name)+"</span></td><td class='col-act'><div class='row-actions'>"+editIconBtn("openPartModal('"+esc(pad2(p.partNo))+"')")+delIconBtn("del('deletePart',{partNo:'"+esc(pad2(p.partNo))+"'})")+"</div></td></tr>";
  }).join("")||emptyRow(4);
  // doctypes (مرتب بر اساس کد)
  document.getElementById("doctypesBody").innerHTML=docTypesSorted().map(function(t){
    return "<tr><td class='col-el'><span class='el-badge'>"+docTypeIconInner(t)+"</span></td><td class='nm-fa'>"+esc(t.nameFa)+"</td><td class='spec-en c-mid'><span class='en-shift'>"+esc(t.nameEn)+"</span></td><td class='spec-en c-mid'><span class='unit-shift'>"+esc(t.code)+"</span></td><td class='c-mid'>"+(t.scope==="project"?'<span class="tag proj"><svg viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>پروژه</span>':'<span class="tag"><svg viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>قطعه</span>')+"</td><td class='col-act'><div class='row-actions'>"+editIconBtn("openDocTypeModal('"+esc(t.code)+"')")+delIconBtn("del('deleteDocType',{code:'"+esc(t.code)+"'})")+"</div></td></tr>";
  }).join("")||emptyRow(6);
  // part info modules (پارامتر‌های اطلاعاتِ قطعه) — فهرستِ اصلیِ سراسری
  var pmBody=document.getElementById("partmodsBody");
  if(pmBody) pmBody.innerHTML=partModsSorted().map(function(m){
    return "<tr><td><div class='pm-cell'><span class='el-badge'>"+PARTMOD_EL_SVG+"</span><span class='nm-fa'>"+esc(m.nameFa)+"</span></div></td><td class='spec-en c-mid'><span class='en-shift'>"+esc(partModEn(m)||"—")+"</span></td><td class='spec-en c-mid'><span class='unit-shift'>"+esc(partModUnit(m)||"—")+"</span></td><td class='col-act'><div class='row-actions'>"+editIconBtn("openPartModModal('"+esc(m.nameFa)+"')")+delIconBtn("del('deletePartMod',{nameFa:'"+esc(m.nameFa)+"'})")+"</div></td></tr>";
  }).join("")||emptyRow(4);
  // users: کارتِ کاربر (آواتار + نام + نامِ کاربری) · سمت · تگِ نقش · ویرایش
  var meU=(typeof ME!=="undefined"&&ME)?String(ME.username||""):"";
  // ترتیبِ پیش‌فرض بر اساسِ نقش: مدیرِ سیستم ← بازبین ← بیننده (و در هر گروه، الفبایی)
  var _rr={admin:0,reviewer:1,viewer:2};
  var usersSorted=[].concat(DB.users||[]).sort(function(a,b){
    var ra=(_rr[a.role]!=null?_rr[a.role]:9), rb=(_rr[b.role]!=null?_rr[b.role]:9);
    if(ra!==rb) return ra-rb;
    return String(a.name||"").localeCompare(String(b.name||""),"fa");
  });
  document.getElementById("usersBody").innerHTML=usersSorted.map(function(u){
    var avChar = u.avatar || (String(u.name||u.username||"?").trim().charAt(0));
    var you = (meU && String(u.username)===meU) ? '<span class="u-you">شما</span>' : '';
    var uActive = (u.active!==false);
    var nameCell = '<div class="u-cell">'+
      '<button type="button" class="u-av lg av-toggle'+(uActive?' on':'')+'" aria-pressed="'+(uActive?'true':'false')+'" aria-label="فعال/غیرفعال کردنِ کاربر" title="فعال/غیرفعال کردنِ کاربر" onclick="toggleUserActive(event,\''+esc(u.username)+'\')">'+esc(avChar)+'</button>'+
      '<span class="u-name">'+esc((honorific(u.gender)?honorific(u.gender)+" ":"")+(u.name||""))+you+'</span></div>';
    var acts = '<div class="row-actions">'+editIconBtn("openUserModal('"+esc(u.username)+"')")+
      delIconBtn("deleteUserGuarded(event,'"+esc(u.username)+"')")+'</div>';
    return '<tr'+(uActive?'':' class="u-off"')+'><td>'+nameCell+'</td>'+
      '<td class="spec-en c-mid"><span class="en-shift">'+esc(u.username)+'</span></td>'+
      '<td class="meta-txt">'+esc(u.position||"—")+'</td>'+
      '<td>'+roleTag(u.role)+'</td>'+
      '<td>'+acts+'</td></tr>';
  }).join("")||emptyRow(5);
}
function emptyRow(cols){ return '<tr><td colspan="'+cols+'" class="muted" style="text-align:center;padding:14px">موردی نیست.</td></tr>'; }

/* جمع/بازکردنِ سطرهای یک جدولِ تنظیمات — رفتار و انیمیشنِ فلش عیناً مثلِ درختِ سایدبار:
   کلاسِ collapsed روی خودِ table (tbody با انیمیشنِ max-height جمع می‌شود)، و کلاسِ open روی فلش (چرخشِ ۱۸۰°). */
function toggleMgmtTable(btn){
  var tbl=btn.closest("table"); if(!tbl) return;
  var collapsed=tbl.classList.toggle("collapsed");   // true = حالا جمع شد
  var open=!collapsed;
  btn.classList.toggle("open",open);
  btn.setAttribute("aria-expanded",open?"true":"false");
}

/* ---- آواتار ---- */
function fillAvatarPicker(){
  var host=document.getElementById("usAvatarPicker"); if(!host) return;
  host.innerHTML=AVATARS.map(function(a){ return '<button type="button" class="av-opt" data-av="'+a+'" onclick="pickAvatar(this)">'+a+'</button>'; }).join("");
}
function pickAvatar(btn){
  document.getElementById("usAvatar").value=btn.getAttribute("data-av");
  document.querySelectorAll("#usAvatarPicker .av-opt").forEach(function(b){ b.classList.toggle("sel", b===btn); });
}
function setAvatarSelected(av){
  document.getElementById("usAvatar").value=av||"";
  document.querySelectorAll("#usAvatarPicker .av-opt").forEach(function(b){ b.classList.toggle("sel", b.getAttribute("data-av")===av); });
}
function localUpsert(arr, matchFn, newItem){
  for(var i=0;i<arr.length;i++){ if(matchFn(arr[i])){ arr[i]=newItem; return; } }
  arr.push(newItem);
}

var DEL_MAP = {
  deleteClient:   {arr:'clients',   test:function(x,p){return x.code===p.code;}},
  deleteOrder:    {arr:'orders',    test:function(x,p){return x.clientCode===p.clientCode&&pad2(x.orderNo)===pad2(p.orderNo);}},
  deleteProject:  {arr:'projects',  test:function(x,p){return x.clientCode===p.clientCode&&pad2(x.orderNo)===pad2(p.orderNo)&&pad2(x.projectNo)===pad2(p.projectNo);}},
  deletePart:     {arr:'parts',     test:function(x,p){return pad2(x.partNo)===pad2(p.partNo);}},
  deleteDocType:  {arr:'docTypes',  test:function(x,p){return x.code===p.code;}},
  deletePartMod:  {arr:'partMods',  test:function(x,p){return String(x.nameFa)===String(p.nameFa);}},
  deleteUser:     {arr:'users',     test:function(x,p){return x.username===p.username;}}
};

function localRefresh(){
  refreshAllSelects(); renderDataTables();
  if(typeof renderClientPanel==="function") renderClientPanel();
  renderDashboard();
}

async function del(action,payload){
  if(!(typeof ME!=="undefined" && ME && ME.role==="admin")){ toast("فقط مدیر مجاز به حذف است.",true); return; }
  if(!(await uiConfirm("حذف این مورد؟",{danger:true,okLabel:"حذف"}))) return;
  var r=await api(action,payload);
  if(r.ok){
    var m=DEL_MAP[action];
    if(m) DB[m.arr]=DB[m.arr].filter(function(x){return !m.test(x,payload);});
    localRefresh(); toast("حذف شد");
  } else toast(r.message||"حذف ناموفق",true);
}

/* مدیریت مشتری‌ها/سفارش‌ها/پروژه‌ها به بخش «مشتریان و پروژه‌ها» (projects.js) منتقل شد. */

/* المانِ قطعه/سند از روی کد به‌صورتِ خودکار ساخته می‌شود (partIconInner/docTypeIconInner
   در projects.js)؛ آپلودِ المانِ سفارشی حذف شد و دیگر ستونِ icon در بک‌اند لازم نیست. */

/* ---- قطعات: افزودن/ویرایش داخلِ مودال (هم‌استانداردِ پنلِ کاربران) ---- */
var _partEdit="";   // شمارهٔ قطعهٔ در حالِ ویرایش؛ "" = افزودنِ قطعهٔ جدید
function openPartModal(no){
  var p = no ? DB.parts.find(function(x){return pad2(x.partNo)===pad2(no);}) : null;
  _partEdit = p ? pad2(p.partNo) : "";
  var isEdit=!!p;
  var body='<div class="um-form">'+
    '<div class="um-row">'+
      '<div class="um-field"><label class="fld">کد قطعه'+(isEdit?'':' <span class="fld-hint">(خالی = خودکار)</span>')+'</label>'+
        '<input id="psNo" style="direction:ltr;text-align:left" placeholder="خودکار" value="'+esc(p?pad2(p.partNo):"")+'"'+(isEdit?" disabled":"")+'></div>'+
      '<div class="um-field"><label class="fld">نام انگلیسی قطعه</label>'+
        '<input id="psName" style="direction:ltr;text-align:left" placeholder="ROLLER" value="'+esc(p?(p.name||""):"")+'"></div>'+
    '</div>'+
    '<div class="um-field"><label class="fld">نام فارسی قطعه</label>'+
      '<input id="psFa" placeholder="غلطک" value="'+esc(p?(p.nameFa||""):"")+'"></div>'+
    '<div class="um-actions">'+
      '<button class="btn" onclick="closeModal()">انصراف</button>'+
      '<button class="btn primary" onclick="savePart()">'+(isEdit?"ذخیرهٔ تغییرات":"افزودن قطعه")+'</button>'+
    '</div>'+
  '</div>';
  showModal(isEdit?"ویرایشِ قطعه":"افزودنِ قطعه", body, "form-modal");
}
async function savePart(){
  var wasEdit=!!_partEdit;
  var name=(document.getElementById("psName").value||"").trim();
  var nameFa=(document.getElementById("psFa").value||"").trim();
  var noEl=document.getElementById("psNo");
  if(!name){ toast("نام انگلیسی قطعه لازم است.",true); return; }
  var payload={partNo:(wasEdit?_partEdit:(noEl?noEl.value:"")),name:name,nameFa:nameFa};
  var r=await api("savePart",payload);
  if(r.ok){
    var pno=r.partNo;
    localUpsert(DB.parts,function(x){return pad2(x.partNo)===pad2(pno);},{partNo:pno,name:name,nameFa:nameFa,allowedTypes:"",active:true});
    closeModal(); localRefresh(); toast("قطعه "+pno+(wasEdit?" به‌روزرسانی شد":" افزوده شد"));
  } else toast(r.message,true);
}

/* ---- انواعِ سند: افزودن/ویرایش داخلِ مودال ---- */
var _docTypeEdit="";   // کدِ نوعِ سندِ در حالِ ویرایش؛ "" = افزودنِ نوعِ جدید
var SCOPE_SEG=[{val:"part",label:"قطعه"},{val:"project",label:"پروژه"}];
function openDocTypeModal(code){
  var t = code ? DB.docTypes.find(function(x){return String(x.code)===String(code);}) : null;
  _docTypeEdit = t ? String(t.code) : "";
  var isEdit=!!t;
  var body='<div class="um-form">'+
    '<div class="um-row">'+
      '<div class="um-field"><label class="fld">کد نوع سند</label>'+
        '<input id="dsCode" maxlength="6" style="direction:ltr;text-align:left;text-transform:uppercase" placeholder="MC" oninput="this.value=enDigits(this.value).replace(/[^A-Za-z0-9]/g,\'\').toUpperCase()" value="'+esc(t?(t.code||""):"")+'"'+(isEdit?" disabled":"")+'></div>'+
      '<div class="um-field"><label class="fld">نام انگلیسی سند</label>'+
        '<input id="dsEn" style="direction:ltr;text-align:left" placeholder="Machining" value="'+esc(t?(t.nameEn||""):"")+'"></div>'+
    '</div>'+
    '<div class="um-row">'+
      '<div class="um-field"><label class="fld">نام فارسی سند</label>'+
        '<input id="dsFa" placeholder="نقشه ماشینکاری" value="'+esc(t?(t.nameFa||""):"")+'"></div>'+
      '<div class="um-field"><label class="fld">سطح</label>'+segControl("dsScope",SCOPE_SEG,(t&&t.scope==="project")?"project":"part")+'</div>'+
    '</div>'+
    '<div class="um-actions">'+
      '<button class="btn" onclick="closeModal()">انصراف</button>'+
      '<button class="btn primary" onclick="saveDocType()">'+(isEdit?"ذخیرهٔ تغییرات":"افزودن نوع سند")+'</button>'+
    '</div>'+
  '</div>';
  showModal(isEdit?"ویرایشِ نوعِ سند":"افزودنِ نوعِ سند", body, "form-modal");
}
async function saveDocType(){
  var wasEdit=!!_docTypeEdit;
  var codeEl=document.getElementById("dsCode");
  var code=wasEdit?_docTypeEdit:enDigits(codeEl?codeEl.value:"").trim().toUpperCase();
  var scope=(document.getElementById("dsScope").value==="project"?"project":"part");
  var nameEn=document.getElementById("dsEn").value, nameFa=document.getElementById("dsFa").value;
  if(!code){ toast("کد نوع سند لازم است.",true); return; }
  if(!wasEdit){
    if(!/^[A-Z0-9]{1,6}$/.test(code)){ toast("کد نوع سند فقط حروف/اعداد لاتین (۱ تا ۶ نویسه).",true); return; }
    if((DB.docTypes||[]).some(function(x){return String(x.code).toUpperCase()===code;})){ toast("این کد نوع سند قبلاً وجود دارد.",true); return; }
  }
  var payload={code:code,nameFa:nameFa,nameEn:nameEn,scope:scope};
  var r=await api("saveDocType",payload);
  if(r.ok){
    localUpsert(DB.docTypes,function(x){return x.code===code;},{code:code,nameFa:nameFa,nameEn:nameEn,scope:scope,active:true}); closeModal(); localRefresh(); toast("نوع سند "+(wasEdit?"به‌روزرسانی شد":"افزوده شد"));
  } else toast(r.message,true);
}

/* ---- پارامتر‌های اطلاعاتِ قطعه (فهرستِ اصلیِ سراسری): افزودن/ویرایش داخلِ مودال ---- */
/* ترجمهٔ استانداردِ پارامترهای رایج — تا نامِ انگلیسی حتی پیش از ذخیرهٔ دستی هم نمایش داده شود.
   اگر پارامتر nameEn ذخیره‌شده داشته باشد، همان اولویت دارد؛ وگرنه از این مپ. */
var PARTMOD_EN={
  "وزن":"Weight","جنس":"Material","نوع عملیات حرارتی":"Heat Treatment","عملیات حرارتی":"Heat Treatment",
  "سختی":"Hardness","ابعاد":"Dimensions","اندازه":"Dimensions","تلورانس":"Tolerance","رواداری":"Tolerance",
  "زبری سطح":"Surface Roughness","زبری":"Roughness","استاندارد":"Standard","تعداد":"Quantity",
  "رنگ":"Color","پوشش":"Coating","چگالی":"Density","دمای ذوب":"Melting Point","مدول":"Modulus"
};
function partModEn(m){ return (m&&m.nameEn) ? String(m.nameEn) : ((m&&PARTMOD_EN[String(m.nameFa||"").trim()])||""); }
/* واحدِ استانداردِ پارامترهای کمی (پارامترهای متنی مثلِ جنس/عملیاتِ حرارتی واحد ندارند). */
var PARTMOD_UNIT={
  "وزن":"kg","سختی":"HB","ابعاد":"mm","اندازه":"mm","تلورانس":"mm","رواداری":"mm",
  "زبری سطح":"μm","زبری":"μm","چگالی":"g/cm³","دمای ذوب":"°C","مدول":"GPa","تعداد":"عدد"
};
function partModUnit(m){ return (m&&m.unit!=null&&String(m.unit)!=="") ? String(m.unit) : ((m&&PARTMOD_UNIT[String(m.nameFa||"").trim()])||""); }
/* واحدِ یک پارامتر بر اساسِ نامش (برای استفاده روی کارتِ قطعه در projects.js) */
function partModUnitOf(label){ var m=(DB.partMods||[]).find(function(x){return String(x.nameFa)===String(label);}); return partModUnit(m); }
/* المانِ مرجعِ پارامترها — تکی و مشترک (نه به‌ازای هر پارامتر). نمادِ اسلایدرِ سربخش، در همان کادرِ .el-badge
   اسناد؛ فقط همین‌جا به‌کار می‌رود تا ستونِ اولِ جدولِ پارامترها هم مثلِ آواتار/المانِ اسناد المان داشته باشد. */
var PARTMOD_EL_SVG='<svg viewBox="0 0 24 24"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><circle cx="7" cy="7" r="1.3"/></svg>';
var _partModEdit="";   // نامِ پارامترِ در حالِ ویرایش؛ "" = افزودنِ پارامترِ جدید
function openPartModModal(name){
  var m = name ? (DB.partMods||[]).find(function(x){return String(x.nameFa)===String(name);}) : null;
  _partModEdit = m ? String(m.nameFa) : "";
  var isEdit=!!m;
  var body='<div class="um-form">'+
    '<div class="um-row">'+
      '<div class="um-field"><label class="fld">نام فارسی پارامتر</label>'+
        '<input id="pmName" placeholder="مثلاً وزن، جنس، سختی" value="'+esc(m?(m.nameFa||""):"")+'"></div>'+
      '<div class="um-field"><label class="fld">نام انگلیسی پارامتر</label>'+
        '<input id="pmNameEn" style="direction:ltr;text-align:left" placeholder="Weight" value="'+esc(m?partModEn(m):"")+'"></div>'+
    '</div>'+
    '<div class="um-field"><label class="fld">واحد <span class="fld-hint">(اختیاری؛ خودکار کنارِ مقدار نمایش داده می‌شود)</span></label>'+
      '<input id="pmUnit" style="direction:ltr;text-align:left" placeholder="kg" value="'+esc(m?partModUnit(m):"")+'"></div>'+
    '<div class="um-actions">'+
      '<button class="btn" onclick="closeModal()">انصراف</button>'+
      '<button class="btn primary" onclick="savePartMod()">'+(isEdit?"ذخیرهٔ تغییرات":"افزودن پارامتر")+'</button>'+
    '</div>'+
  '</div>';
  showModal(isEdit?"ویرایشِ پارامتر":"افزودنِ پارامتر", body, "form-modal");
}
async function savePartMod(){
  var name=String((document.getElementById("pmName").value)||"").trim();
  if(!name){ toast("نام پارامتر لازم است.",true); return; }
  var nameEn=String((document.getElementById("pmNameEn").value)||"").trim();
  var unit=String((document.getElementById("pmUnit").value)||"").trim();
  var wasEdit=!!_partModEdit, oldName=_partModEdit;
  var dup=(DB.partMods||[]).some(function(x){ return String(x.nameFa).trim()===name && String(x.nameFa)!==oldName; });
  if(dup){ toast("این نامِ پارامتر قبلاً وجود دارد.",true); return; }
  var payload={nameFa:name,nameEn:nameEn,unit:unit};
  // در هر ویرایش oldName فرستاده می‌شود (نه فقط هنگامِ تغییرِ نام) تا بک‌اند ویرایشِ درجا را
  // «افزودنِ نامِ تکراری» تشخیص ندهد؛ اگر oldName === nameFa بک‌اند فقط ردیف را به‌روزرسانی می‌کند.
  if(wasEdit && oldName) payload.oldName=oldName;
  var r=await api("savePartMod",payload);
  if(!r||!r.ok){ toast((r&&r.message)||"ذخیره ناموفق بود",true); return; }
  if(wasEdit && oldName && oldName!==name){
    var ord=0, idx=-1;
    (DB.partMods||[]).forEach(function(x,i){ if(String(x.nameFa)===oldName){ ord=Number(x.order)||0; idx=i; } });
    if(idx>=0) DB.partMods.splice(idx,1);
    localUpsert(DB.partMods,function(x){return String(x.nameFa)===name;},{nameFa:name,nameEn:nameEn,unit:unit,active:true,order:ord});
    await migratePartModRename(oldName,name);   // انتقالِ پارامتر در همهٔ پروژه‌هایی که آن را دارند
  } else {
    var existing=(DB.partMods||[]).filter(function(x){ return String(x.nameFa)===name; })[0], ord;
    if(existing){ ord=Number(existing.order)||0; }
    else { var mx=0; (DB.partMods||[]).forEach(function(x){ var n=Number(x.order)||0; if(n>mx)mx=n; }); ord=mx+1; }
    localUpsert(DB.partMods,function(x){return String(x.nameFa)===name;},{nameFa:name,nameEn:nameEn,unit:unit,active:true,order:ord});
  }
  closeModal(); localRefresh(); toast("پارامتر "+(wasEdit?"به‌روزرسانی شد":"افزوده شد"));
}
/* تغییرِ نامِ یک پارامتر در فهرستِ اصلی → به‌روزرسانیِ همان نام در specsِ همهٔ پروژه‌ها (overlay + مقادیر) */
async function migratePartModRename(oldName,newName){
  if(!oldName || oldName===newName) return;
  for(var i=0;i<(DB.projects||[]).length;i++){
    var p=DB.projects[i], root=specsRoot(p), changed=false;
    if(Array.isArray(root.partMods)){
      root.partMods.forEach(function(m){ if(m && String(m.label)===oldName){ m.label=newName; changed=true; } });
    }
    if(root.partModsByPart && typeof root.partModsByPart==="object"){   // per-part: برچسب در آرایهٔ هر قطعه
      Object.keys(root.partModsByPart).forEach(function(pn){ var arr=root.partModsByPart[pn];
        if(Array.isArray(arr)){ for(var k=0;k<arr.length;k++){ if(String(arr[k])===oldName){ arr[k]=newName; changed=true; } } } });
    }
    if(root.partVals && typeof root.partVals==="object"){
      Object.keys(root.partVals).forEach(function(pn){ var row=root.partVals[pn];
        if(row && row[oldName]!==undefined){ row[newName]=row[oldName]; delete row[oldName]; changed=true; } });
    }
    if(changed){
      var json=JSON.stringify(root); p.specs=json;
      await api("saveProject",{clientCode:p.clientCode,orderNo:pad2(p.orderNo),projectNo:pad2(p.projectNo),specs:json});
    }
  }
}

/* ---- کاربران (نقش + جنسیت + سمت + آواتار) ---- */
function validUsername(u){ return /^[A-Za-z][A-Za-z0-9._-]{2,19}$/.test(u); }
/* حذفِ زندهٔ نویسه‌های غیرمجاز از باکسِ نام کاربری (فقط لاتین، عدد، . _ -) */
function filterUsername(el){ if(el) el.value=el.value.replace(/[^A-Za-z0-9._-]/g,""); }
/* تگِ رنگیِ نقش (با آیکون) — هم‌سبک با tag سایت، رنگ‌ها غیرِبرند تا نارنجی فقط برند بماند */
function roleTag(role){
  var r=String(role||"viewer");
  var cls = r==="admin"?"role-admin":(r==="reviewer"?"role-reviewer":"role-viewer");
  var ic = r==="admin"
    ? '<svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>'
    : (r==="reviewer"
      ? '<svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'
      : '<svg viewBox="0 0 24 24"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>');
  return '<span class="tag '+cls+'">'+ic+esc(roleLabel(r))+'</span>';
}

/* ---- کاربران: افزودن/ویرایش داخلِ مودال (به‌جای فرمِ همیشه-باز) ---- */
var _userEdit = "";   // نامِ کاربریِ در حالِ ویرایش؛ "" = افزودنِ کاربرِ جدید
var GENDERS_SEG=[{val:"male",label:"آقا"},{val:"female",label:"خانم"}];
var ROLES_SEG=[{val:"viewer",label:"بیننده"},{val:"reviewer",label:"بازبین"},{val:"admin",label:"مدیر"}];
/* کنترلِ سگمنتی (تک‌انتخابی) — مقدار در یک input مخفیِ هم‌id ذخیره می‌شود تا saveUser بدون تغییر بخواندش */
function segControl(id, opts, cur){
  return '<input type="hidden" id="'+id+'" value="'+esc(cur)+'">'+
    '<div class="seg">'+opts.map(function(o){
      return '<button type="button" class="seg-btn'+(o.val===cur?" on":"")+'" data-val="'+esc(o.val)+'" onclick="pickSeg(\''+id+'\',this)">'+esc(o.label)+'</button>';
    }).join("")+'</div>';
}
function pickSeg(id, btn){
  var h=document.getElementById(id); if(h) h.value=btn.getAttribute("data-val");
  var wrap=btn.parentNode; if(wrap) wrap.querySelectorAll(".seg-btn").forEach(function(b){ b.classList.toggle("on", b===btn); });
}
function togglePass(id, btn){
  var i=document.getElementById(id); if(!i) return;
  var show=(i.type==="password"); i.type=show?"text":"password";
  if(btn) btn.classList.toggle("on", show);
}
/* مدیرِ اصلیِ سامانه = اولین مدیر در فهرست؛ غیرقابلِ غیرفعال‌سازی و حذف */
function primaryAdminUsername(){
  var a=(DB.users||[]).filter(function(x){return String(x.role)==="admin";});
  return a.length?String(a[0].username):"";
}
/* لرزشِ کوتاهِ «این کار مجاز نیست» — استانداردِ انیمیشنِ خطا */
function shakeEl(el){
  if(!el||!el.classList) return;
  el.classList.remove("shake"); void el.offsetWidth; el.classList.add("shake");
  setTimeout(function(){ if(el&&el.classList) el.classList.remove("shake"); }, 450);
}
/* toggleِ دایره‌ایِ فعال/غیرفعالِ کاربر روی ردیفِ جدول (نقطهٔ تو‌پُر = فعال).
   تغییر بلافاصله در UI اعمال (خوش‌بینانه) و در بک‌اند ماندگار می‌شود؛ اگر ذخیره ناموفق بود، برمی‌گردد. */
var _userActiveBusy = {};
function applyUserActiveUI(btn, on){
  if(btn){ btn.classList.toggle("on", on); btn.setAttribute("aria-pressed", on?"true":"false"); }   // حلقهٔ نارنجی دورِ آواتار
  var tr=btn?btn.closest("tr"):null; if(tr) tr.classList.toggle("u-off", !on);   // فریز/آزادکردنِ سطر
}
async function toggleUserActive(ev, username){
  if(ev && ev.stopPropagation) ev.stopPropagation();
  var u=(DB.users||[]).find(function(x){return String(x.username)===String(username);});
  if(!u) return;
  var btn=(ev&&ev.currentTarget)?ev.currentTarget:null;
  if(String(username)===primaryAdminUsername()){ shakeEl(btn); return; }   // مدیرِ اصلی: قفل
  if(_userActiveBusy[username]) return;                                     // ضدِ دوبار-کلیک هنگامِ ذخیره
  _userActiveBusy[username]=true;
  var next=(u.active===false);                                             // وضعیتِ هدف (اگر غیرفعال بود → فعال)
  applyUserActiveUI(btn, next); u.active=next;                             // به‌روزرسانیِ خوش‌بینانه
  var r=await api("setUserActive",{username:username, active:next},{silent:true});
  _userActiveBusy[username]=false;
  if(!r || !r.ok){
    applyUserActiveUI(btn, !next); u.active=!next;                         // برگرداندن به حالتِ قبل
    shakeEl(btn);
    if(r && r.error==="UNKNOWN_ACTION") toast("این قابلیت نیاز به انتشارِ مجددِ بک‌اند دارد (Deploy ▸ New version).",true);
    else if(r && r.message && !r.netError) toast(r.message,true);
  }
}
function openUserModal(username){
  var u = username ? (DB.users||[]).find(function(x){return String(x.username)===String(username);}) : null;
  _userEdit = u ? String(u.username) : "";
  var isEdit=!!u;
  var eye='<svg viewBox="0 0 24 24"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>';
  var body='<div class="um-form">'+
    '<div class="um-field"><label class="fld">نام و نام خانوادگی</label>'+
      '<input id="usName" placeholder="علی شفیعی" value="'+esc(u?(u.name||""):"")+'"></div>'+
    '<div class="um-row">'+
      '<div class="um-field"><label class="fld">نام کاربری (لاتین)</label>'+
        '<input id="usUser" placeholder="ali" style="direction:ltr;text-align:left" oninput="filterUsername(this)" value="'+esc(u?(u.username||""):"")+'"'+(isEdit?" disabled":"")+'></div>'+
      '<div class="um-field"><label class="fld">جنسیت</label>'+segControl("usGender",GENDERS_SEG,(u&&u.gender)||"male")+'</div>'+
    '</div>'+
    '<div class="um-field"><label class="fld">سمت</label>'+
      '<input id="usPosition" placeholder="واحد تحقیق و توسعه" value="'+esc(u?(u.position||""):"")+'"></div>'+
    '<div class="um-field"><label class="fld">رمز عبور'+(isEdit?' <span class="fld-hint">(برای بی‌تغییر ماندن خالی بگذارید)</span>':'')+'</label>'+
      '<div class="pass-wrap"><input id="usPass" type="password" placeholder="••••••">'+
        '<button type="button" class="pass-eye" onclick="togglePass(\'usPass\',this)" title="نمایش/مخفی">'+eye+'</button></div></div>'+
    '<div class="um-field"><label class="fld">نقش</label>'+segControl("usRole",ROLES_SEG,(u&&u.role)||"viewer")+'</div>'+
    '<div class="um-field"><label class="fld">آواتار (در هدر نمایش داده می‌شود)</label>'+
      '<div class="avatar-picker" id="usAvatarPicker"></div><input type="hidden" id="usAvatar"></div>'+
    '<div class="um-actions">'+
      '<button class="btn" onclick="closeModal()">انصراف</button>'+
      '<button class="btn primary" onclick="saveUser()">'+(isEdit?"ذخیرهٔ تغییرات":"افزودن کاربر")+'</button>'+
    '</div>'+
  '</div>';
  showModal(isEdit?"ویرایشِ کاربر":"افزودنِ کاربر", body, "user-modal");
  fillAvatarPicker();
  setAvatarSelected(u?(u.avatar||""):"");
}
async function deleteUserGuarded(ev, username){
  var btn=(ev&&ev.currentTarget)?ev.currentTarget:null;
  var u=(DB.users||[]).find(function(x){return String(x.username)===String(username);});
  if(!u){ toast("کاربر پیدا نشد",true); return; }
  if(String(username)===primaryAdminUsername()){ shakeEl(btn); return; }   // مدیرِ اصلی: قفل
  var meU=(typeof ME!=="undefined"&&ME)?String(ME.username||""):"";
  if(meU && String(username)===meU){ shakeEl(btn); toast("نمی‌توانید حسابِ کاربریِ خودتان را حذف کنید.",true); return; }
  if(u.role==="admin" && (DB.users||[]).filter(function(x){return x.role==="admin";}).length<=1){
    shakeEl(btn); toast("آخرین مدیرِ سیستم را نمی‌توان حذف کرد.",true); return;
  }
  if(!(await uiConfirm("حذفِ کاربر «"+(u.name||u.username)+"»؟ این کار برگشت‌ناپذیر است.",{danger:true,okLabel:"حذف"}))) return;
  var r=await api("deleteUser",{username:username});
  if(r.ok){
    DB.users=(DB.users||[]).filter(function(x){return String(x.username)!==String(username);});
    closeModal(); localRefresh(); toast("کاربر حذف شد");
  } else toast(r.message||"حذف ناموفق",true);
}
async function saveUser(){
  var wasEdit=!!_userEdit;
  var uname=usUser.value.trim(), name=usName.value.trim(), role=usRole.value;
  var gender=usGender.value, position=usPosition.value.trim();
  var avatar=usAvatar.value;
  var _ex=(DB.users||[]).find(function(x){return String(x.username)===uname;});
  var active=_ex?(_ex.active!==false):true;   // وضعیت از toggleِ ردیف کنترل می‌شود؛ اینجا فقط حفظش می‌کنیم
  if(!uname || !name){ toast("نام کاربری و نام و نام خانوادگی لازم است.",true); return; }
  if(!wasEdit){
    // قوانین فقط هنگام افزودن کاربر جدید (نام کاربری هنگام ویرایش قفل است)
    if(!validUsername(uname)){ toast("نام کاربری فقط لاتین: شروع با حرف، ۳ تا ۲۰ نویسه، فقط حروف و اعداد و . _ -",true); return; }
    if((DB.users||[]).some(function(x){return String(x.username).toLowerCase()===uname.toLowerCase();})){ toast("این نام کاربری قبلاً وجود دارد.",true); return; }
    if(!usPass.value){ toast("برای کاربر جدید رمز عبور لازم است.",true); return; }
  }
  // نام و نام خانوادگی نباید برای کاربر دیگری تکراری باشد
  if((DB.users||[]).some(function(x){return String(x.name||"").trim()===name && String(x.username)!==uname;})){
    toast("این نام و نام خانوادگی قبلاً برای کاربر دیگری ثبت شده است.",true); return;
  }
  // محافظ: آخرین مدیرِ سیستم نباید از نقشِ مدیریت خارج شود (قفل‌شدنِ کاملِ دسترسیِ ادمین)
  if(wasEdit && role!=="admin"){
    var cur=(DB.users||[]).find(function(x){return String(x.username)===uname;});
    if(cur && cur.role==="admin" && (DB.users||[]).filter(function(x){return x.role==="admin";}).length<=1){
      toast("آخرین مدیرِ سیستم را نمی‌توان از نقشِ مدیریت خارج کرد.",true); return;
    }
  }
  var r=await api("saveUser",{username:uname,name:name,password:usPass.value,role:role,gender:gender,position:position,avatar:avatar});
  if(r.ok){
    localUpsert(DB.users,function(x){return x.username===uname;},{username:uname,name:name,role:role,active:active,gender:gender,position:position,avatar:avatar});
    closeModal(); localRefresh(); toast("کاربر "+(wasEdit?"به‌روزرسانی شد":"افزوده شد"));
  } else toast(r.message,true);
}
