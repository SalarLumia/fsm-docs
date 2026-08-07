/* ================= پر کردن سلکت‌ها ================= */
function opt(v,label){ return '<option value="'+esc(v)+'">'+esc(label)+'</option>'; }
/* فیلترهای آرشیو هنوز <select> واقعی‌اند؛ ثبت سند به ویزاردِ ریلِ شماره (documents.js) منتقل شد. */
function refreshAllSelects(){
  // فیلتر آرشیو (بدون گزینهٔ افزودن) — انتخاب فعلی هنگام رفرش داده حفظ می‌شود
  var acEl=document.getElementById("aClient"), acPrev=acEl?acEl.value:"";
  if(acEl){ acEl.innerHTML='<option value="">همه</option>'+clientsSorted().map(function(c){return opt(c.code,c.name);}).join(""); acEl.value=acPrev; }
  var atEl=document.getElementById("aType"), atPrev=atEl?atEl.value:"";
  if(atEl){ atEl.innerHTML='<option value="">همه</option>'+docTypesSorted().map(function(t){return opt(t.code,t.nameFa);}).join(""); atEl.value=atPrev; }
  // اگر پنل ثبت سند باز است، ریل/منوها را با دادهٔ تازه دوباره بساز
  if(typeof newDocOpen==="function" && newDocOpen() && typeof ndRender==="function") ndRender();
}
