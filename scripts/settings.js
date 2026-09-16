/* ================= تنظیمات سامانه (قطعات، انواع سند، کاربران) ================= */
function renderDataTables(){
  // parts (مرتب بر اساس شماره، صعودی)
  document.getElementById("partsBody").innerHTML=partsSorted().map(function(p){
    return "<tr><td class='col-el'><span class='el-badge'>"+partIconInner(p)+"</span></td><td class='nm-fa'>"+esc(p.nameFa||"—")+"</td><td class='spec-en c-mid'><span class='en-shift'>"+esc(p.name)+"</span></td><td class='col-act'><div class='row-actions'>"+editIconBtn("openPartModal('"+esc(pad2(p.partNo))+"')")+delIconBtn("del('deletePart',{partNo:'"+esc(pad2(p.partNo))+"'})")+"</div></td></tr>";
  }).join("")||emptyRow(4);
  /* doctypes — ترتیبِ این جدول همان «ترتیبِ پیش‌فرض» در همهٔ پروژه‌هاست: اول اسنادِ سطحِ پروژه،
     سپس سطحِ قطعه؛ جابه‌جایی فقط درونِ هر گروه (data-scope). */
  document.getElementById("doctypesBody").innerHTML=docTypesDefault("project").concat(docTypesDefault("part")).map(function(t){
    return "<tr "+mgRowAttrs(t.code, t.scope==="project"?"project":"part")+"><td class='col-el'><span class='el-badge'>"+docTypeIconInner(t)+"</span></td><td class='nm-fa'>"+esc(t.nameFa)+"</td><td class='spec-en c-mid'><span class='en-shift'>"+esc(t.nameEn)+"</span></td><td class='spec-en c-mid'><span class='unit-shift'>"+esc(t.code)+"</span></td><td class='c-mid'>"+(t.scope==="project"?'<span class="tag proj"><svg viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>پروژه</span>':'<span class="tag"><svg viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>قطعه</span>')+"</td><td class='col-act'><div class='row-actions'>"+editIconBtn("openDocTypeModal('"+esc(t.code)+"')")+delIconBtn("del('deleteDocType',{code:'"+esc(t.code)+"'})")+mgGripHTML()+"</div></td></tr>";
  }).join("")||emptyRow(6);
  // part info modules (پارامتر‌های اطلاعاتِ قطعه) — فهرستِ اصلیِ سراسری
  var pmBody=document.getElementById("partmodsBody");
  if(pmBody) pmBody.innerHTML=partModsSorted().map(function(m){   // ترتیبِ این جدول = ترتیبِ پیش‌فرضِ پارامترها
    return "<tr "+mgRowAttrs(m.nameFa,"")+"><td><div class='pm-cell'><span class='el-badge'>"+PARTMOD_EL_SVG+"</span><span class='nm-fa'>"+esc(m.nameFa)+"</span></div></td><td class='spec-en c-mid'><span class='en-shift'>"+esc(partModEn(m)||"—")+"</span></td><td class='spec-en c-mid'><span class='unit-shift'>"+esc(partModUnit(m)||"—")+"</span></td><td class='col-act'><div class='row-actions'>"+editIconBtn("openPartModModal('"+esc(m.nameFa)+"')")+delIconBtn("del('deletePartMod',{nameFa:'"+esc(m.nameFa)+"'})")+mgGripHTML()+"</div></td></tr>";
  }).join("")||emptyRow(4);
  // فهرست‌های اصلیِ ردیابی: تأمین‌کنندگان و انواعِ مادهٔ خام (ترتیبِ هر جدول با کشیدن)
  renderNamedMaster("suppliersBody", suppliersSorted(), "openSupplierModal", "deleteSupplier", SUPPLIER_EL_SVG);
  renderNamedMaster("rawtypesBody", rawTypesSorted(), "openRawTypeModal", "deleteRawType", RAWTYPE_EL_SVG);
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
  document.querySelectorAll("#usAvatarPicker .av-opt").forEach(function(b){ xfSet(b, "sel", b===btn); });
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
  deleteSupplier: {arr:'suppliers', test:function(x,p){return String(x.nameFa)===String(p.nameFa);}},
  deleteRawType:  {arr:'rawTypes',  test:function(x,p){return String(x.nameFa)===String(p.nameFa);}},
  deleteUser:     {arr:'users',     test:function(x,p){return x.username===p.username;}}
};

/* ═══ ترتیبِ پیش‌فرض: کشیدنِ ردیف‌های جدول‌های «انواع اسناد» و «پارامترها» ═══
   هم‌الگوی فهرستِ مشتری‌ها و پنل‌های پروژه: فقط کشیدن از روی دستهٔ ۶‌نقطه‌ای، با انیمیشنِ FLIP.
   پس از رهاکردن، کلِ ترتیب با یک درخواست (reorderMaster) ذخیره می‌شود و همهٔ پروژه‌هایی که
   ترتیبِ اختصاصی ندارند بی‌درنگ از آن پیروی می‌کنند. */
var _mgGripArmed=false;
function mgRowAttrs(key, scope){
  return "data-key='"+esc(key)+"'"+(scope?" data-scope='"+scope+"'":"")+" draggable='true' ondragstart='mgRowDragStart(event)' ondragend='mgRowDragEnd(event)'";
}
function mgGripHTML(){ return '<span class="ed-grip mg-grip" title="بکشید تا ترتیبِ پیش‌فرض در پروژه‌ها عوض شود" aria-label="جابجاییِ ترتیب" onmousedown="mgGripDown()" onclick="event.stopPropagation()">'+ED_GRIP_IC+'</span>'; }
function mgGripDown(){ _mgGripArmed=true; }
function mgRowDragStart(e){
  var tr=e.currentTarget;
  if(!_mgGripArmed){ if(e&&e.preventDefault) e.preventDefault(); return; }
  _mgGripArmed=false;
  if(e.dataTransfer){ e.dataTransfer.effectAllowed="move"; try{ e.dataTransfer.setData("text/plain",tr.getAttribute("data-key")||""); }catch(_){} }
  setTimeout(function(){ tr.classList.add("mg-dragging"); },0);
}
function mgRowDragOver(e){
  if(e&&e.preventDefault) e.preventDefault();
  var tb=e.currentTarget, drag=tb&&tb.querySelector("tr.mg-dragging"); if(!drag) return;
  var scope=drag.getAttribute("data-scope")||"";
  var rows=[].slice.call(tb.querySelectorAll("tr[data-key]")).filter(function(r){ return (r.getAttribute("data-scope")||"")===scope; });
  var after=null, best=-Infinity;
  rows.forEach(function(r){ if(r===drag) return; var b=r.getBoundingClientRect(), off=e.clientY-(b.top+b.height/2);
    if(off<0 && off>best){ best=off; after=r; } });
  if(after===drag || (after && drag.nextElementSibling===after)) return;
  var last=rows[rows.length-1];
  if(!after && drag===last) return;
  mgFlip(tb, function(){
    if(after) tb.insertBefore(drag, after);
    else tb.insertBefore(drag, last.nextElementSibling);   // تهِ همان گروه، نه تهِ کلِ جدول
  });
}
function mgFlip(tb, mutate){
  var items=[].slice.call(tb.querySelectorAll("tr[data-key]"));
  var firsts=items.map(function(el){ return el.getBoundingClientRect().top; });
  mutate();
  items.forEach(function(el,i){ var dy=firsts[i]-el.getBoundingClientRect().top;
    if(dy){ el.style.transition="none"; el.style.transform="translateY("+dy+"px)"; } });
  requestAnimationFrame(function(){ items.forEach(function(el){ if(el.style.transform){
    el.style.transition="transform .18s cubic-bezier(.2,0,0,1)"; el.style.transform=""; } }); });
}
function mgRowDragEnd(e){
  var tr=e.currentTarget; tr.classList.remove("mg-dragging");
  var tb=tr.parentNode; if(!tb) return;
  var keys=[].slice.call(tb.querySelectorAll("tr[data-key]")).map(function(r){ return r.getAttribute("data-key"); });
  if(tb.id==="doctypesBody") mgCommitOrder("docTypes", DB.docTypes, "code", keys);
  else if(tb.id==="partmodsBody") mgCommitOrder("partMods", DB.partMods, "nameFa", keys);
  else if(tb.id==="suppliersBody") mgCommitOrder("suppliers", DB.suppliers, "nameFa", keys);
  else if(tb.id==="rawtypesBody") mgCommitOrder("rawTypes", DB.rawTypes, "nameFa", keys);
}
async function mgCommitOrder(table, arr, keyField, keys){
  var changed=false;
  keys.forEach(function(k,i){ var row=(arr||[]).find(function(x){ return String(x[keyField])===k; });
    if(row && Number(row.order)!==i){ row.order=i; changed=true; } });
  if(!changed) return;
  localRefresh();   // جدول‌ها و پروژهٔ بازِ فعلی بی‌درنگ با ترتیبِ تازه
  var r=await api("reorderMaster",{table:table, keys:keys},{silent:true});
  if(!r||!r.ok){
    if(r && r.error==="UNKNOWN_ACTION") toast("ذخیرهٔ ترتیب نیاز به انتشارِ مجددِ بک‌اند دارد (Deploy ▸ New version).",true);
    else toast((r&&r.message)||"ذخیرهٔ ترتیب ناموفق بود.",true);
    return;
  }
  toast("ترتیبِ پیش‌فرض ذخیره شد");
}
if(typeof document!=="undefined" && document.addEventListener) document.addEventListener("mouseup",function(){ _mgGripArmed=false; });

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
    /* localUpsert جایگزینِ کامل است؛ پس هنگامِ ویرایش باید از نسخهٔ قبلی شروع کنیم،
       وگرنه allowedTypes (انواعِ سندِ مجازِ این قطعه) در نسخهٔ داخلِ مرورگر پاک می‌شود. */
    var prevPart=(DB.parts||[]).filter(function(x){ return pad2(x.partNo)===pad2(pno); })[0];
    var nextPart={}; if(prevPart){ for(var k in prevPart){ if(prevPart.hasOwnProperty(k)) nextPart[k]=prevPart[k]; } }
    nextPart.partNo=pno; nextPart.name=name; nextPart.nameFa=nameFa; nextPart.active=true;
    if(!prevPart) nextPart.allowedTypes="";
    localUpsert(DB.parts,function(x){return pad2(x.partNo)===pad2(pno);},nextPart);
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
  "زبری سطح":"μm","زبری":"μm","چگالی":"g/cm³","دمای ذوب":"°C","مدول":"GPa","تعداد":"pcs"
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
    if(root.ordPartMods && typeof root.ordPartMods==="object"){   // ترتیبِ اختصاصیِ پارامترها
      Object.keys(root.ordPartMods).forEach(function(pn){ var arr=root.ordPartMods[pn];
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

/* ═══ فهرست‌های اصلیِ نام‌محورِ ردیابی: تأمین‌کننده و نوعِ مادهٔ خام ═══
   ساختارشان یکی است (نام فارسی + نام انگلیسی + ترتیب)، پس رندر و مودالشان مشترک است. */
var SUPPLIER_EL_SVG='<svg viewBox="0 0 24 24"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h3.5L22 11v5h-6z"/><circle cx="5.5" cy="19" r="1.6"/><circle cx="18" cy="19" r="1.6"/></svg>';
var RAWTYPE_EL_SVG='<svg viewBox="0 0 24 24"><path d="M12 2l9 5v10l-9 5-9-5V7z"/><path d="M3 7l9 5 9-5"/><line x1="12" y1="12" x2="12" y2="22"/></svg>';
function renderNamedMaster(bodyId, rows, editFn, delAction, icon){
  var host=document.getElementById(bodyId); if(!host) return;
  host.innerHTML=rows.map(function(m){
    return "<tr "+mgRowAttrs(m.nameFa,"")+"><td><div class='pm-cell'><span class='el-badge'>"+icon+"</span><span class='nm-fa'>"+esc(m.nameFa)+"</span></div></td>"+
      "<td class='spec-en c-mid'><span class='en-shift'>"+esc(m.nameEn||"—")+"</span></td>"+
      "<td class='col-act'><div class='row-actions'>"+editIconBtn(editFn+"('"+esc(m.nameFa)+"')")+
        delIconBtn("del('"+delAction+"',{nameFa:'"+esc(m.nameFa)+"'})")+mgGripHTML()+"</div></td></tr>";
  }).join("")||emptyRow(3);
}
var _namedEdit={sup:"", raw:""};
function openSupplierModal(name){ openNamedMasterModal("sup", name, DB.suppliers, "تأمین‌کننده", "مثلاً فولاد مبارکه", "e.g. Mobarakeh Steel"); }
function openRawTypeModal(name){ openNamedMasterModal("raw", name, DB.rawTypes, "نوع مادهٔ خام", "مثلاً گرد فولادی", "e.g. Steel Round Bar"); }
function openNamedMasterModal(kind, name, arr, title, phFa, phEn){
  var m = name ? (arr||[]).find(function(x){ return String(x.nameFa)===String(name); }) : null;
  _namedEdit[kind]= m ? String(m.nameFa) : "";
  var body='<div class="um-form">'+
    '<div class="um-row">'+
      '<div class="um-field"><label class="fld">نام فارسی</label>'+
        '<input id="nmFa" placeholder="'+esc(phFa)+'" value="'+esc(m?(m.nameFa||""):"")+'"></div>'+
      '<div class="um-field"><label class="fld">نام انگلیسی</label>'+
        '<input id="nmEn" style="direction:ltr;text-align:left" placeholder="'+esc(phEn)+'" value="'+esc(m?(m.nameEn||""):"")+'"></div>'+
    '</div>'+
    '<div class="um-actions">'+
      '<button class="btn" onclick="closeModal()">انصراف</button>'+
      '<button class="btn primary" onclick="saveNamedMaster(\''+kind+'\')">ذخیره</button>'+
    '</div></div>';
  showModal((m?"ویرایشِ ":"افزودنِ ")+title, body, "form-modal");
}
async function saveNamedMaster(kind){
  var isSup=(kind==="sup"), arr=isSup?DB.suppliers:DB.rawTypes;
  var name=String(document.getElementById("nmFa").value||"").trim();
  var nameEn=String(document.getElementById("nmEn").value||"").trim();
  if(!name){ toast("نام لازم است.",true); return; }
  var oldName=_namedEdit[kind];
  if((arr||[]).some(function(x){ return String(x.nameFa).trim()===name && String(x.nameFa)!==oldName; })){ toast("این نام قبلاً ثبت شده است.",true); return; }
  var payload={nameFa:name,nameEn:nameEn};
  if(oldName) payload.oldName=oldName;
  var r=await api(isSup?"saveSupplier":"saveRawType", payload);
  if(!r||!r.ok){ toast((r&&r.message)||"ذخیره ناموفق بود",true); return; }
  var ord=0, idx=-1;
  (arr||[]).forEach(function(x,i){ if(String(x.nameFa)===(oldName||name)){ ord=Number(x.order)||0; idx=i; } });
  if(oldName && idx>=0) arr.splice(idx,1);
  else if(!oldName){ var mx=0; (arr||[]).forEach(function(x){ var n=Number(x.order)||0; if(n>mx)mx=n; }); ord=mx+1; }
  localUpsert(arr,function(x){ return String(x.nameFa)===name; },{nameFa:name,nameEn:nameEn,active:true,order:ord});
  /* تغییرِ نام فقط فهرستِ اصلی را عوض می‌کند؛ قطعاتِ تولیدیِ ثبت‌شده مقدارِ متنیِ خودشان را
     نگه می‌دارند تا سابقهٔ آن‌ها دست‌نخورده بماند (ردیابی به گذشته وابسته است). */
  closeModal(); localRefresh(); toast((isSup?"تأمین‌کننده ":"نوع مادهٔ خام ")+(oldName?"به‌روزرسانی شد":"افزوده شد"));
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
  var wrap=btn.parentNode; if(wrap) wrap.querySelectorAll(".seg-btn").forEach(function(b){ xfSet(b, "on", b===btn); });
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
  if(btn){ xfSet(btn, "on", on); btn.setAttribute("aria-pressed", on?"true":"false"); }   // حلقهٔ نارنجی دورِ آواتار
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
  /* دو آیکون روی هم؛ CSS بینشان کراس‌فید می‌کند (هم‌الگوی چشمِ صفحهٔ ورود) */
  var eye='<svg class="eye-on" viewBox="0 0 24 24"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>'+
          '<svg class="eye-off" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
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
