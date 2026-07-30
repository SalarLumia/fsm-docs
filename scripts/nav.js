/* ================= ناوبری سایدبار ================= */
document.getElementById("sidebar-nav").addEventListener("click",function(e){
  var b=e.target.closest("button[data-tab]"); if(!b) return; switchTab(b.dataset.tab);
});
document.querySelector(".sb-bottom").addEventListener("click",function(e){
  var b=e.target.closest("button[data-tab]"); if(!b) return; switchTab(b.dataset.tab);
});
/* دسترس‌پذیری: فعال‌سازی کارت‌ها/ردیف‌های کلیک‌پذیر با Enter یا Space */
document.addEventListener("keydown",function(e){
  if(e.key!=="Enter" && e.key!==" " && e.key!=="Spacebar") return;
  var t=e.target;
  if(t && t.classList && (t.classList.contains("cp-client-item")||t.classList.contains("cp-order-card")||t.classList.contains("cp-proj-row"))){
    e.preventDefault(); t.click();
  }
});
function switchTab(name){
  // ترکِ نمای فعلی: مدلِ سه‌بعدیِ بارگذاری‌شده (اگر بود) و URLِ بلابش آزاد می‌شود تا حافظه نشت نکند
  if(typeof releaseBlobUrl==="function") releaseBlobUrl("mvModel");
  window._activeTab=name;   // تبِ فعالِ جاری؛ درختِ سایدبار حالتِ نارنجی را فقط برای همین تب نشان می‌دهد
  document.querySelectorAll(".nav-item[data-tab]").forEach(function(b){ b.classList.toggle("active", b.dataset.tab===name); });
  document.querySelectorAll(".tabpane").forEach(function(p){ p.classList.add("hidden"); });
  var pane=document.getElementById("tab-"+name);
  pane.classList.remove("hidden");
  if(name==="dashboard") renderDashboard(true);   // آرگومان true → شمارشِ عددیِ کارت‌های شاخص
  if(name==="project") renderProjectTab();
  // درختِ «مشتریان و پروژه‌ها» را تازه کن تا با ترکِ تبِ پروژه، نارنجیِ مشتری/پروژه پاک شود
  if(name!=="project" && typeof renderNavTree==="function") renderNavTree();
  if(typeof playTabReveal==="function") playTabReveal(pane);   // ورودِ آبشاریِ بلوک‌های همان تب
}

/* ================= جستجوی سریع ================= */
function onGlobalSearch(q){
  if(!q||!q.trim()){ return; }
  switchTab("archive");
  document.getElementById("aSearch").value=q;
  renderArchive();
}
