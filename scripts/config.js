/* ================= پیکربندی ================= */
/* آدرس exec بک‌اند Apps Script (پس از هر انتشار نسخهٔ جدید، در صورت تغییر به‌روزرسانی شود) */
var API_URL = "https://script.google.com/macros/s/AKfycbzbA19MkrR8LGySKeb0fRTRbHgicDUFbRu3iKWcXGnep_tUEUEO62IwFGO9ZX70tCEM/exec";

/* ═══ آدرسِ پایهٔ کدهای QR روی اسنادِ چاپی ═══
   ⚠ این مقدار روی کاغذ چاپ می‌شود و دیگر قابلِ تغییر نیست. پس عمداً روی دامنهٔ خودِ
   شرکت است، نه آدرسِ میزبانی؛ روزی که سایت به سرورِ اختصاصی منتقل شود فقط DNS
   می‌چرخد و همهٔ نقشه‌های چاپ‌شده سالم می‌مانند.
   نشانیِ کوتاه (/d) عمدی است: هر کاراکترِ کمتر یعنی مربع‌های درشت‌تر در QR و
   خوانده‌شدنِ مطمئن‌تر روی نقشه‌ای که تا شده، لوله شده یا روغنی است. */
var QR_BASE = "https://fooladshargh.com/d";
/* آدرسِ QR یک سند مشخص.
   شمارهٔ ویرایش خودش انتهای شمارهٔ سند است (…-CB-01)، پس پارامترِ جداگانه لازم نیست
   و کاغذ همیشه به همان نسخه‌ای می‌رود که رویش چاپ شده است. */
function qrDocUrl(drawingNumber){
  var n=String(drawingNumber||"").trim();
  return n ? (QR_BASE+"?n="+encodeURIComponent(n)) : "";
}

/* پیام‌های نمایش هنگام بارگذاری، به تفکیک اکشن */
var LOADING_MSGS = {
  login:"در حال ورود...", bootstrap:"در حال بارگذاری داده‌ها...",
  saveClient:"در حال ذخیرهٔ مشتری...", saveOrder:"در حال ثبت سفارش...",
  saveProject:"در حال ثبت پروژه...", savePart:"در حال ثبت قطعه...",
  saveDocType:"در حال ذخیرهٔ نوع سند...", saveUser:"در حال ذخیرهٔ کاربر...",
  createDocument:"در حال ثبت سند...", uploadFile:"در حال آپلود فایل...",
  deleteDocument:"در حال حذف سند...", deleteClient:"در حال حذف...",
  deleteOrder:"در حال حذف...", deleteProject:"در حال حذف...",
  deletePart:"در حال حذف...", deleteDocType:"در حال حذف...", deleteUser:"در حال حذف...",
  getFile:"در حال دریافت فایل...", listDocuments:"در حال بارگذاری..."
};
