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
/* ═══ مقصدِ ورود از بیرون (اسکنِ QR) ═══
   نشانی به دو شکل می‌تواند بیاید:
     ۱) fooladshargh.com/d?n=<شماره>&r=<ویرایش>   ← همان چیزی که در QR چاپ می‌شود
     ۲) index.html#/doc/<شماره>                    ← لینکِ داخلیِ قابلِ اشتراک
   نکتهٔ مهم: کاربر معمولاً وارد نشده است، پس مقصد نگه داشته می‌شود تا پس از ورود
   به آن پرش کنیم. بخشِ پس از # هرگز به سرور نمی‌رود، پس شمارهٔ سند در لاگِ هیچ
   سروری ثبت نمی‌شود. */
var _pendingRoute = null;
function readRoute(){
  var n="";
  var qs=new RegExp("[?&]n=([^&]*)").exec(location.search);
  if(qs) n=decodeURIComponent(qs[1]);
  if(!n){
    var m=/^#\/doc\/([^\/?]+)/.exec(String(location.hash||""));
    if(m) n=decodeURIComponent(m[1]);
  }
  n=String(n||"").trim().toUpperCase();
  return n?{num:n}:null;
}
/* مقصد را در همان بارگذاریِ اول می‌خوانیم، پیش از آنکه چیزی نشانی را عوض کند */
_pendingRoute = readRoute();
/* پس از آماده‌شدنِ کامل سایت صدا زده می‌شود: اگر مقصدی بوده، همان سند باز می‌شود. */
function consumePendingRoute(){
  var rt=_pendingRoute; _pendingRoute=null;
  if(!rt) return false;
  if(typeof openDocDetail!=="function") return false;
  // نشانی تمیز شود تا رفرشِ بعدی دوباره همین سند را باز نکند
  try{ history.replaceState(null,"",location.pathname); }catch(e){}
  openDocDetail(rt.num);
  return true;
}
function switchTab(name){
  // ترکِ نمای فعلی: مدلِ سه‌بعدیِ بارگذاری‌شده (اگر بود) و URLِ بلابش آزاد می‌شود تا حافظه نشت نکند
  if(typeof releaseBlobUrl==="function") releaseBlobUrl("mvModel");
  window._activeTab=name;   // تبِ فعالِ جاری؛ درختِ سایدبار حالتِ نارنجی را فقط برای همین تب نشان می‌دهد
  /* CSS نمی‌تواند «کلاس برداشته شد» را تشخیص دهد، پس آیتمی که همین حالا فعال
     بود یک کلاسِ موقتِ leaving می‌گیرد تا آیکونش انیمیشنِ خروج (همان انیمیشنِ
     ورود، برعکس) را اجرا کند. تایمر روی خودِ عنصر نگه داشته می‌شود تا سوئیچِ
     پشتِ‌سرِ‌همِ تب‌ها تایمرِ قبلی را لغو کند و کلاس جا نماند. */
  document.querySelectorAll(".nav-item[data-tab]").forEach(function(b){
    var on = b.dataset.tab===name;
    if(!on && b.classList.contains("active")){
      if(b._leaveT) clearTimeout(b._leaveT);
      b.classList.add("leaving");
      b._leaveT=setTimeout(function(){ b.classList.remove("leaving"); b._leaveT=null; }, 520);
    }
    b.classList.toggle("active", on);
  });
  document.querySelectorAll(".tabpane").forEach(function(p){ p.classList.add("hidden"); });
  var pane=document.getElementById("tab-"+name);
  pane.classList.remove("hidden");
  if(name==="dashboard") renderDashboard(true);   // آرگومان true → شمارشِ عددیِ کارت‌های شاخص
  if(name==="project") renderProjectTab();
  if(name==="trash" && typeof renderTrash==="function") renderTrash();
  if(name==="help" && typeof renderHelp==="function") renderHelp();
  // درختِ «مشتریان و پروژه‌ها» را تازه کن تا با ترکِ تبِ پروژه، نارنجیِ مشتری/پروژه پاک شود
  if(name!=="project" && typeof navRefreshSelection==="function") navRefreshSelection();
  if(typeof playTabReveal==="function") playTabReveal(pane);   // ورودِ آبشاریِ بلوک‌های همان تب
}
