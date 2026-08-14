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
    /* توکن ۱۲ ساعته است و زمانِ انقضا هنگامِ ورود ذخیره می‌شود. اگر از آن گذشته،
       اصلاً درخواستی نمی‌فرستیم: مستقیم صفحهٔ ورود می‌آید و کاربر هرگز پوستهٔ
       برنامه را نمی‌بیند که بعد پرتاب شود. (نشستِ قدیمی که expiresAt ندارد،
       اعتبارش را بک‌اند تعیین می‌کند.) */
    if(saved.expiresAt && Date.now() >= saved.expiresAt){
      localStorage.removeItem("fsm_session");
      if(typeof toast==="function") toast("نشست منقضی شد. دوباره وارد شوید.");
      return;
    }
    ME=saved;
    /* deferReveal: تا وقتی بک‌اند نشست را تأیید نکرده، برنامه نمایش داده نمی‌شود.
       بدونِ این، صفحه باز می‌شد و چند ثانیه بعد کاربر بیرون انداخته می‌شد. */
    startApp({deferReveal:true}).catch(function(){ logout(); });
  }catch(e){ localStorage.removeItem("fsm_session"); }
})();
