/* ================= شروع خودکار اگر نشست ذخیره شده باشد ================= */
/* این فایل باید آخرین اسکریپت بارگذاری‌شده باشد تا همهٔ توابع تعریف شده باشند. */
(function init(){
  var s=localStorage.getItem("fsm_session");
  if(s){ try{ ME=JSON.parse(s); if(ME&&ME.token){ startApp().catch(function(){ logout(); }); } }catch(e){} }
})();
