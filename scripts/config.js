/* ================= پیکربندی ================= */
/* آدرس exec بک‌اند Apps Script (پس از هر انتشار نسخهٔ جدید، در صورت تغییر به‌روزرسانی شود) */
var API_URL = "https://script.google.com/macros/s/AKfycbzbA19MkrR8LGySKeb0fRTRbHgicDUFbRu3iKWcXGnep_tUEUEO62IwFGO9ZX70tCEM/exec";

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
