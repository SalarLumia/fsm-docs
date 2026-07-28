/* ================= تنظیمات سامانه (قطعات، انواع سند، کاربران) ================= */
function renderDataTables(){
  // parts (مرتب بر اساس شماره، صعودی)
  document.getElementById("partsBody").innerHTML=partsSorted().map(function(p){
    return "<tr><td class='mono'>"+esc(pad2(p.partNo))+"</td><td style='direction:ltr;text-align:right'>"+esc(p.name)+"</td><td>"+esc(p.nameFa||"—")+"</td><td class='row-actions'>"+editIconBtn("editPart('"+esc(pad2(p.partNo))+"')")+delIconBtn("del('deletePart',{partNo:'"+esc(pad2(p.partNo))+"'})")+"</td></tr>";
  }).join("")||emptyRow(4);
  // doctypes (مرتب بر اساس کد)
  document.getElementById("doctypesBody").innerHTML=docTypesSorted().map(function(t){
    return "<tr><td class='mono'>"+esc(t.code)+"</td><td>"+esc(t.nameEn)+"</td><td>"+esc(t.nameFa)+"</td><td>"+(t.scope==="project"?'<span class="tag proj">پروژه</span>':'<span class="tag">قطعه</span>')+"</td><td class='row-actions'>"+editIconBtn("editDocType('"+esc(t.code)+"')")+delIconBtn("del('deleteDocType',{code:'"+esc(t.code)+"'})")+"</td></tr>";
  }).join("")||emptyRow(5);
  // part info modules (پارامتر‌های اطلاعاتِ قطعه) — فهرستِ اصلیِ سراسری
  var pmBody=document.getElementById("partmodsBody");
  if(pmBody) pmBody.innerHTML=partModsSorted().map(function(m){
    return "<tr><td>"+esc(m.nameFa)+"</td><td class='row-actions'>"+editIconBtn("editPartMod('"+esc(m.nameFa)+"')")+delIconBtn("del('deletePartMod',{nameFa:'"+esc(m.nameFa)+"'})")+"</td></tr>";
  }).join("")||emptyRow(2);
  // users: آواتار + نام و نام خانوادگی (با نشان آقا/خانم)
  document.getElementById("usersBody").innerHTML=(DB.users||[]).map(function(u){
    var avChar = u.avatar || (String(u.name||u.username||"?").trim().charAt(0));
    var nameCell = "<span class='u-av'>"+esc(avChar)+"</span> "+esc((honorific(u.gender)?honorific(u.gender)+" ":"")+(u.name||""));
    return "<tr><td class='mono' style='direction:ltr;text-align:right'>"+esc(u.username)+"</td><td>"+nameCell+"</td><td>"+esc(u.position||"—")+"</td><td>"+esc(roleLabel(u.role))+"</td><td class='row-actions'>"+editIconBtn("editUser('"+esc(u.username)+"')")+delIconBtn("del('deleteUser',{username:'"+esc(u.username)+"'})")+"</td></tr>";
  }).join("")||emptyRow(5);
  fillAvatarPicker();
}
function emptyRow(cols){ return '<tr><td colspan="'+cols+'" class="muted" style="text-align:center;padding:14px">موردی نیست.</td></tr>'; }

/* ---- مدیریت حالت افزودن/ویرایش (دکمهٔ هوشمند + قفل فیلد کلید) ---- */
var _editKey = { part:"", docType:"", partMod:"", user:"" };
function _setBtn(id,txt){ var b=document.getElementById(id); if(b) b.textContent=txt; }
function _show(id,on){ var e=document.getElementById(id); if(e) e.style.display=on?"":"none"; }
function _disable(id,on){ var e=document.getElementById(id); if(e) e.disabled=on; }

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
  if(!(await uiConfirm("حذف این مورد؟",{danger:true,okLabel:"حذف"}))) return;
  var r=await api(action,payload);
  if(r.ok){
    var m=DEL_MAP[action];
    if(m) DB[m.arr]=DB[m.arr].filter(function(x){return !m.test(x,payload);});
    localRefresh(); toast("حذف شد");
  } else toast(r.message||"حذف ناموفق",true);
}

/* اسکرول به فرمِ بخش + اعلان، تا کاربر بفهمد فرم برای ویرایش پر شده است */
function focusEditForm(el,msg){
  try{ el.scrollIntoView({behavior:"smooth",block:"center"}); }catch(e){}
  try{ el.focus({preventScroll:true}); }catch(e){}
  toast(msg+" — پس از تغییر، دکمهٔ «به‌روزرسانی» را بزنید");
}
/* اسکرول/فوکوس روی یک فیلد بر پایهٔ شناسه (برای هدایت از سلکت‌های «افزودن مورد جدید») */
function focusField(id,msg){
  var el=document.getElementById(id); if(!el) return;
  try{ el.scrollIntoView({behavior:"smooth",block:"center"}); }catch(e){}
  try{ el.focus({preventScroll:true}); }catch(e){}
  if(msg) toast(msg);
}

/* مدیریت مشتری‌ها/سفارش‌ها/پروژه‌ها به بخش «مشتریان و پروژه‌ها» (projects.js) منتقل شد. */

function editPart(no){
  var p=DB.parts.find(function(x){return pad2(x.partNo)===pad2(no)});
  if(!p){ toast("قطعه پیدا نشد",true); return; }
  ptNo.value=pad2(p.partNo); ptName.value=p.name; ptFa.value=p.nameFa||"";
  _editKey.part=pad2(p.partNo);
  _disable("ptNo",true); _setBtn("savePartBtn","به‌روزرسانی"); _show("cancelPartBtn",true);
  focusEditForm(ptName,"قطعهٔ «"+(p.nameFa||p.name)+"» برای ویرایش بارگذاری شد");
}
function resetPartForm(){
  ptNo.value="";ptName.value="";ptFa.value=""; _editKey.part="";
  _disable("ptNo",false); _setBtn("savePartBtn","افزودن"); _show("cancelPartBtn",false);
}
async function savePart(){
  var wasEdit=!!_editKey.part;
  var name=ptName.value.trim(), nameFa=ptFa.value.trim();
  if(!name){ toast("نام انگلیسی قطعه لازم است.",true); return; }
  var r=await api("savePart",{partNo:ptNo.value,name:name,nameFa:nameFa});
  if(r.ok){
    var pno=r.partNo;
    localUpsert(DB.parts,function(x){return pad2(x.partNo)===pad2(pno);},{partNo:pno,name:name,nameFa:nameFa,allowedTypes:"",active:true});
    resetPartForm(); localRefresh(); toast("قطعه "+pno+(wasEdit?" به‌روزرسانی شد":" افزوده شد"));
  } else toast(r.message,true);
}

function editDocType(code){
  var t=DB.docTypes.find(function(x){return String(x.code)===String(code)});
  if(!t){ toast("نوع سند پیدا نشد",true); return; }
  dtCode.value=t.code; dtFa.value=t.nameFa; dtEn.value=t.nameEn; dtScope.value=t.scope;
  _editKey.docType=String(t.code);
  _disable("dtCode",true); _setBtn("saveDocTypeBtn","به‌روزرسانی"); _show("cancelDocTypeBtn",true);
  focusEditForm(dtFa,"نوع سند «"+t.nameFa+"» برای ویرایش بارگذاری شد");
}
function resetDocTypeForm(){
  dtCode.value="";dtFa.value="";dtEn.value="";dtScope.value="part"; _editKey.docType="";
  _disable("dtCode",false); _setBtn("saveDocTypeBtn","افزودن"); _show("cancelDocTypeBtn",false);
}
async function saveDocType(){
  var wasEdit=!!_editKey.docType;
  var code=enDigits(dtCode.value).trim().toUpperCase(), scope=(dtScope.value==='project'?'project':'part');
  if(!code){ toast("کد نوع سند لازم است.",true); return; }
  if(!wasEdit){
    if(!/^[A-Z0-9]{1,6}$/.test(code)){ toast("کد نوع سند فقط حروف/اعداد لاتین (۱ تا ۶ نویسه).",true); return; }
    if((DB.docTypes||[]).some(function(x){return String(x.code).toUpperCase()===code;})){ toast("این کد نوع سند قبلاً وجود دارد.",true); return; }
  }
  var r=await api("saveDocType",{code:code,nameFa:dtFa.value,nameEn:dtEn.value,scope:scope});
  if(r.ok){ localUpsert(DB.docTypes,function(x){return x.code===code;},{code:code,nameFa:dtFa.value,nameEn:dtEn.value,scope:scope,active:true}); resetDocTypeForm(); localRefresh(); toast("نوع سند "+(wasEdit?"به‌روزرسانی شد":"افزوده شد")); }
  else toast(r.message,true);
}

/* ---- پارامتر‌های اطلاعاتِ قطعه (فهرستِ اصلیِ سراسری) ---- */
function editPartMod(name){
  var m=(DB.partMods||[]).find(function(x){ return String(x.nameFa)===String(name); });
  if(!m){ toast("پارامتر پیدا نشد",true); return; }
  ptmName.value=m.nameFa; _editKey.partMod=String(m.nameFa);
  _setBtn("savePartModBtn","به‌روزرسانی"); _show("cancelPartModBtn",true);
  focusEditForm(ptmName,"پارامتر «"+m.nameFa+"» برای ویرایش بارگذاری شد");
}
function resetPartModForm(){
  ptmName.value=""; _editKey.partMod="";
  _setBtn("savePartModBtn","افزودن"); _show("cancelPartModBtn",false);
}
async function savePartMod(){
  var name=String(ptmName.value||"").trim();
  if(!name){ toast("نام پارامتر لازم است.",true); return; }
  var wasEdit=!!_editKey.partMod, oldName=_editKey.partMod;
  var dup=(DB.partMods||[]).some(function(x){ return String(x.nameFa).trim()===name && String(x.nameFa)!==oldName; });
  if(dup){ toast("این نامِ پارامتر قبلاً وجود دارد.",true); return; }
  var payload={nameFa:name};
  if(wasEdit && oldName && oldName!==name) payload.oldName=oldName;
  var r=await api("savePartMod",payload);
  if(!r||!r.ok){ toast((r&&r.message)||"ذخیره ناموفق بود",true); return; }
  if(wasEdit && oldName && oldName!==name){
    var ord=0, idx=-1;
    (DB.partMods||[]).forEach(function(x,i){ if(String(x.nameFa)===oldName){ ord=Number(x.order)||0; idx=i; } });
    if(idx>=0) DB.partMods.splice(idx,1);
    localUpsert(DB.partMods,function(x){return String(x.nameFa)===name;},{nameFa:name,active:true,order:ord});
    await migratePartModRename(oldName,name);   // انتقالِ پارامتر در همهٔ پروژه‌هایی که آن را دارند
  } else {
    var existing=(DB.partMods||[]).filter(function(x){ return String(x.nameFa)===name; })[0], ord;
    if(existing){ ord=Number(existing.order)||0; }
    else { var mx=0; (DB.partMods||[]).forEach(function(x){ var n=Number(x.order)||0; if(n>mx)mx=n; }); ord=mx+1; }
    localUpsert(DB.partMods,function(x){return String(x.nameFa)===name;},{nameFa:name,active:true,order:ord});
  }
  resetPartModForm(); localRefresh(); toast("پارامتر "+(wasEdit?"به‌روزرسانی شد":"افزوده شد"));
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
function editUser(username){
  var u=(DB.users||[]).find(function(x){return String(x.username)===String(username)});
  if(!u){ toast("کاربر پیدا نشد",true); return; }
  usUser.value=u.username; usName.value=u.name||""; usRole.value=u.role||"viewer"; usPass.value="";
  document.getElementById("usGender").value=u.gender||"male";
  document.getElementById("usPosition").value=u.position||"";
  setAvatarSelected(u.avatar||"");
  _editKey.user=String(u.username);
  _disable("usUser",true); _setBtn("saveUserBtn","به‌روزرسانی"); _show("cancelUserBtn",true);
  focusEditForm(usName,"کاربر «"+(u.name||u.username)+"» برای ویرایش بارگذاری شد");
}
function resetUserForm(){
  usUser.value="";usName.value="";usPass.value="";document.getElementById("usPosition").value="";
  document.getElementById("usGender").value="male"; usRole.value="viewer"; setAvatarSelected("");
  _editKey.user="";
  _disable("usUser",false); _setBtn("saveUserBtn","افزودن"); _show("cancelUserBtn",false);
}
async function saveUser(){
  var wasEdit=!!_editKey.user;
  var uname=usUser.value.trim(), name=usName.value.trim(), role=usRole.value;
  var gender=document.getElementById("usGender").value, position=document.getElementById("usPosition").value;
  var avatar=document.getElementById("usAvatar").value;
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
  var r=await api("saveUser",{username:uname,name:name,password:usPass.value,role:role,gender:gender,position:position,avatar:avatar});
  if(r.ok){
    localUpsert(DB.users,function(x){return x.username===uname;},{username:uname,name:name,role:role,active:true,gender:gender,position:position,avatar:avatar});
    resetUserForm(); localRefresh(); toast("کاربر "+(wasEdit?"به‌روزرسانی شد":"افزوده شد"));
  } else toast(r.message,true);
}
