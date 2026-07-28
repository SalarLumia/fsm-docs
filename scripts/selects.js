/* ================= پر کردن سلکت‌ها ================= */
function opt(v,label){ return '<option value="'+esc(v)+'">'+esc(label)+'</option>'; }
/* آخرین گزینهٔ «افزودن مورد جدید» (کاربر با انتخابش به صفحهٔ مربوط هدایت می‌شود) */
function addNewOpt(label){ return '<option value="__ADD__">＋ '+esc(label)+'</option>'; }
function refreshAllSelects(){
  // مشتری در فرم ثبت سند (مرتب بر اساس کد) + گزینهٔ افزودن مشتری
  var clientOpts = '<option value="">— انتخاب مشتری —</option>' + clientsSorted().map(function(c){return opt(c.code, c.name+" ("+c.code+")");}).join("");
  var nc=document.getElementById("nClient"); if(nc) nc.innerHTML=clientOpts+addNewOpt("افزودن مشتری جدید…");
  // فیلتر آرشیو (بدون گزینهٔ افزودن) — انتخاب فعلی هنگام رفرش داده حفظ می‌شود
  var acEl=document.getElementById("aClient"), acPrev=acEl?acEl.value:"";
  if(acEl){ acEl.innerHTML='<option value="">همه</option>'+clientsSorted().map(function(c){return opt(c.code,c.name);}).join(""); acEl.value=acPrev; }
  var atEl=document.getElementById("aType"), atPrev=atEl?atEl.value:"";
  if(atEl){ atEl.innerHTML='<option value="">همه</option>'+docTypesSorted().map(function(t){return opt(t.code,t.nameFa);}).join(""); atEl.value=atPrev; }
  // نوع سند در فرم ثبت (مرتب بر اساس کد) + گزینهٔ افزودن نوع
  document.getElementById("nType").innerHTML='<option value="">— نوع سند —</option>'+docTypesSorted().map(function(t){return opt(t.code,t.nameFa+" — "+t.code+(t.scope==="project"?" (پروژه)":""));}).join("")+addNewOpt("افزودن نوع سند جدید…");
}
function fillOrderSelect(selId, clientCode){
  var el=document.getElementById(selId); if(!el)return;
  el.innerHTML='<option value="">— سفارش —</option>'+
    ordersOf(clientCode).map(function(o){return opt(pad2(o.orderNo), pad2(o.orderNo)+(o.title?(" — "+o.title):""));}).join("")+
    (selId==="nOrder"?addNewOpt("افزودن سفارش جدید…"):"");
}
function fillProjectSelect(selId, clientCode, orderNo){
  var el=document.getElementById(selId); if(!el)return;
  el.innerHTML='<option value="">— پروژه —</option>'+projectsOf(clientCode, orderNo).map(function(p){return opt(pad2(p.projectNo), pad2(p.projectNo)+(p.description?(" — "+p.description):""));}).join("")+
    (selId==="nProject"?addNewOpt("افزودن پروژهٔ جدید…"):"");
}
function onClientChange(ctx){
  if(ctx==="n"){
    if(onAddNewSelect("nClient")) return;
    fillOrderSelect("nOrder", nClient.value); document.getElementById("nProject").innerHTML='<option value="">— پروژه —</option>'; updatePreview();
  }
}
function onOrderChange(ctx){
  if(ctx==="n"){
    if(onAddNewSelect("nOrder")) return;
    fillProjectSelect("nProject", nClient.value, nOrder.value); updatePreview();
  }
}
