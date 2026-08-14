/* ================= شروع خودکار اگر نشست ذخیره شده باشد ================= */
/* این فایل باید آخرین اسکریپت بارگذاری‌شده باشد تا همهٔ توابع تعریف شده باشند. */
/* ⚠ نشستِ ذخیره‌شده «ادعا» است نه سند: کاربر می‌تواند fsm_session را در
   localStorage دست‌کاری کند و مثلاً role را admin بگذارد. اینجا فقط پوسته را
   با آن می‌سازیم؛ اعتبارِ واقعی را بک‌اند با امضای توکن تعیین می‌کند و هر
   درخواستِ نامعتبر با error:"AUTH" به logout ختم می‌شود.
   نقش هم در startApp از پاسخِ بک‌اند بازنویسی می‌شود، پس دست‌کاریِ نقش در
   حافظهٔ مرورگر فقط تا اولین پاسخِ سرور دوام دارد. */
(function init(){
  var s=localStorage.getItem("fsm_session");
  if(!s) return;
  try{
    var saved=JSON.parse(s);
    if(!saved || typeof saved.token!=="string" || !saved.token){ localStorage.removeItem("fsm_session"); return; }
    ME=saved;
    startApp().catch(function(){ logout(); });
  }catch(e){ localStorage.removeItem("fsm_session"); }
})();
