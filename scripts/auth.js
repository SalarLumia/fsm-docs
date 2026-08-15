/* ================= ورود / خروج ================= */
/* عمرِ توکنِ بک‌اند (۱۲ ساعت). اگر در Code.gs عوض شد، این هم باید هم‌گام شود؛
   بدترین حالتِ ناهماهنگی این است که یک بار درخواست به سرور می‌رود و رد می‌شود. */
var LG_TOKEN_TTL = 12*60*60*1000;
/* خطاهای ورود جای همان خطِ راهنما (تماس با مدیر) می‌نشینند، نه در یک بنرِ جداگانه:
   آیکون به مثلثِ اخطار عوض می‌شود و رنگ به قرمز. با پاک‌شدنِ خطا، متنِ راهنما برمی‌گردد. */
var LG_INFO_IC='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
var LG_WARN_IC='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
var LG_HINT_TXT='برای دریافت نام کاربری و رمز عبور با مدیر سیستم تماس بگیرید.';
function lgSetErr(msg){
  var el=document.querySelector(".lg-note"); if(!el) return;
  if(!msg){   // بازگشت به حالتِ راهنما
    el.classList.remove("err");
    el.innerHTML=LG_INFO_IC+"<span>"+LG_HINT_TXT+"</span>";
    el.removeAttribute("role");
    return;
  }
  el.innerHTML=LG_WARN_IC+"<span>"+esc(msg)+"</span>";
  /* اگر کلاسِ err از خطای قبلی مانده باشد، انیمیشنِ لرزش دوباره اجرا نمی‌شود؛
     برداشتن و reflow و افزودنِ دوباره، آن را برای هر خطای جدید از سر می‌گیرد. */
  el.classList.remove("err");
  void el.offsetWidth;
  el.classList.add("err");
  el.setAttribute("role","alert");   // صفحه‌خوان خطا را اعلام کند
}
/* دکمهٔ ورود در حالتِ در حالِ پردازش: غیرفعال + اسپینر، تا کلیکِ دوباره ثبت نشود */
function lgBusy(on){
  var b=document.getElementById("lgBtn"); if(!b) return;
  b.disabled=!!on;
  b.classList.toggle("loading", !!on);
  var l=b.querySelector(".lg-lbl");
  // نقطه‌ها با CSS متحرک می‌شوند (۱ تا ۴ و تکرار)، پس متن بدونِ نقطه نوشته می‌شود
  if(l) l.textContent = on ? "در حال ورود" : "ورود";
}
/* مرحلهٔ ۲ صفحهٔ ورود: برند جمع می‌شود و کارتِ ورود با انیمیشن باز می‌شود */
/* ═══ محاسبهٔ هندسهٔ صفحهٔ ورود ═══
   همهٔ عناصرِ بلوکِ برند absolute هستند تا حرکتشان روی هم اثر نگذارد؛ در نتیجه
   موقعیتِ ثابتِ هرکدام و مقدارِ جابه‌جایی‌شان باید این‌جا حساب شود.
   چیدمانِ مرحلهٔ ۱ از بالا به پایین: لوگو ← فاصله ← خط ← فاصله ← شرح ← دکمه
   در مرحلهٔ ۲: لوگو کوچک و بالا می‌رود، خط پهن و بالا می‌رود تا لبهٔ بالاییِ پنل. */
var LG_GAP_DIV = 46;    // فاصلهٔ لوگو تا خط در مرحلهٔ ۱ (شرح و دکمه نسبت به خط جا می‌گیرند، پس با آن پایین می‌آیند)
var LG_GAP_END = 46;    // فاصلهٔ لوگوی کوچک‌شده تا خط در مرحلهٔ ۲ — برابرِ حالتِ بسته، تا فاصله حفظ شود
var LG_GAP_TXT = 26;    // فاصلهٔ خط تا شرحِ سامانه
var LG_LIFT    = 150;   // ← مقدارِ بالا‌آمدنِ کلِ مجموعه (لوگو + خط + پنل) در مرحلهٔ ۲
function lgSyncGeom(){
  var brand=document.querySelector(".login-brand"),
      mark=document.querySelector(".login-brand .mark"),
      below=document.querySelector(".lg-below");
  if(!brand||!mark||!below) return;
  var mw=mark.offsetWidth, mh=mark.offsetHeight;
  if(!mw||!mh) return;
  var target=parseFloat(getComputedStyle(mark).getPropertyValue("--lg-mark-w"));
  if(!target) return;
  var s=target/mw;                       // نسبتِ کوچک‌شدنِ لوگو در مرحلهٔ ۲
  var divTop=Math.round(mh+LG_GAP_DIV);  // جای خط در مرحلهٔ ۱ (زیرِ لوگوی بزرگ)
  var belowTop=divTop+LG_GAP_TXT;        // جای شرح و دکمه — ثابت، بدونِ هیچ انیمیشنی
  var belowH=below.offsetHeight||160;

  /* موقعیتِ نهایی: لوگو سرِ جای خودش کوچک می‌شود، خط با فاصلهٔ ثابت زیرِ آن می‌ایستد.
     لوگو با transform-origin بالا کوچک می‌شود، پس لبهٔ بالایش ثابت و ارتفاعِ دیده‌شده mh*s است.
     markY صفر است: لوگو نباید بالاتر برود؛ کمتر بالا‌رفتنِ خط کارِ LG_GAP_END را می‌کند. */
  var markY=0;
  var divEnd=Math.round(mh*s)+markY+LG_GAP_END; // جای نهاییِ خط = کفِ لوگوی کوچک + فاصله
  var divY=divEnd-divTop;                       // مقدارِ حرکتِ خط (منفی = بالا)

  brand.style.setProperty("--lg-mark-s", s.toFixed(4));
  brand.style.setProperty("--lg-mark-y", markY+"px");
  brand.style.setProperty("--lg-div-top", divTop+"px");
  brand.style.setProperty("--lg-div-y", divY+"px");
  brand.style.setProperty("--lg-below-top", belowTop+"px");
  // پنل دقیقاً از جایی که خط ایستاد باز می‌شود — یک متغیر برای هر دو، پس همیشه منطبق‌اند
  brand.style.setProperty("--lg-card-top", divEnd+"px");
  /* کلِ بلوک (لوگو + خط + پنل) در مرحلهٔ ۲ بالا می‌رود تا پنل بالاتر بنشیند.
     دو محدودیت: لوگوی کوچک‌شده از بالای صفحه بیرون نزند، و پنل هم از پایین جا بماند. */
  var brandTop=brand.getBoundingClientRect().top;
  var card=document.querySelector(".login-card");
  var cardH=card?card.scrollHeight:430;
  var maxUp=brandTop+markY-16;                                   // تا لبهٔ بالای صفحه
  var minUp=(brandTop+divEnd+cardH+24)-window.innerHeight;        // تا پنل پایین نیفتد
  var lift=Math.max(Math.max(0,minUp), Math.min(LG_LIFT, Math.max(0,maxUp)));
  brand.style.setProperty("--lg-lift", "-"+Math.round(lift)+"px");
  // ارتفاعِ ثابتِ بلوک: تا کفِ شرح و دکمه (چون همه absoluteاند، خودش ارتفاع نمی‌گیرد)
  brand.style.setProperty("--lg-brand-h", (belowTop+belowH)+"px");
  lgSyncBtn();         // جای دکمهٔ مرحلهٔ ۱ ذخیره شود تا در مرحلهٔ ۲ مبنای هم‌ترازی باشد
  lgSyncFrame(card);   // ابعادِ قاب و --lg-card-h را خودش تنظیم می‌کند
  /* اندازه‌ها واقعی شدند؛ از این لحظه گذارها آزادند. یک فریم صبر می‌کنیم تا مقادیرِ
     تازه رندر شوند و برداشتنِ کلاس، خودِ همان جابه‌جایی را انیمیت نکند. */
  if(_lgPre){
    _lgPre=false;
    requestAnimationFrame(function(){
      var w=document.getElementById("loginView");
      if(w) w.classList.remove("lg-premeasure");
    });
  }
}
var _lgPre=true;   // تا نخستین اندازه‌گیریِ موفق، گذارهای جای‌گیری خاموش‌اند
/* دکمهٔ «ورود» داخلِ پنل را روی همان نقطه‌ای می‌نشاند که دکمهٔ «ورود به سامانه» بود.
   ⚠ به‌جای محاسبهٔ زنجیره‌ایِ مختصات (که با offsetParentهای متفاوت و lift به‌سادگی
   غلط می‌شود)، اختلافِ واقعیِ دو دکمه روی صفحه اندازه گرفته و همان‌قدر جبران می‌شود.
   هر دو دکمه داخلِ بلوکِ برندند و با هم بالا می‌روند، پس lift در اختلاف حذف می‌شود. */
/* جای دکمهٔ مرحلهٔ ۱ روی صفحه، پیش از شروعِ گذار. در مرحلهٔ ۲ ذخیره می‌ماند
   تا دکمهٔ داخلِ پنل با همان مقایسه شود. */
var LG_START_Y = null;
function lgSyncBtn(){
  var start=document.querySelector(".lg-start");
  if(start) LG_START_Y=start.getBoundingClientRect().top;
}
/* ⚠ تنظیمِ نهایی فقط در مرحلهٔ ۲ ممکن است:
   در مرحلهٔ ۱ پنل بلور و اسکیل‌شده است و بلوکِ برند هنوز بالا نرفته، پس هر
   محاسبه‌ای آن‌جا تقریبی می‌ماند. این‌جا هر دو عنصر در جای نهایی‌شان‌اند و
   اختلافِ واقعی‌شان مستقیم اندازه گرفته و جبران می‌شود. */
function lgAlignBtn(){
  var card=document.querySelector(".login-card"), btn=document.querySelector(".btn-login");
  if(!card||!btn||LG_START_Y===null) return;
  var base=parseFloat(getComputedStyle(card).paddingTop)||32;
  var delta=LG_START_Y-btn.getBoundingClientRect().top;
  if(Math.abs(delta)<1) return;                 // از قبل هم‌تراز است
  var need=base+delta;
  card.style.paddingTop=Math.max(18, Math.min(140, Math.round(need)))+"px";
  lgSyncFrame(card);                            // ارتفاع عوض شد؛ قاب هم‌اندازه شود
}
/* ═══ نوار/قاب ═══
   یک SVG که در هر دو مرحله همان دو مسیر را دارد؛ فقط طولِ خطِ نمایان
   (stroke-dasharray) عوض می‌شود. مسیرها در مختصاتِ پیکسلیِ خودِ پنل نوشته می‌شوند
   تا گوشه‌های گِرد کشیده و بیضی نشوند و ضخامت در کلِ طول ثابت بماند.
   هر مسیر: از بالا-وسط → کنارهٔ خود → پایین → وسطِ پایین. دو مسیر آن‌جا به هم می‌رسند. */
function lgSyncFrame(card){
  if(!card) card=document.querySelector(".login-card");
  var svg=document.querySelector(".lg-frame");
  if(!card||!svg) return;
  var w=card.offsetWidth, h=card.scrollHeight;
  if(!w||!h) return;
  var r=parseFloat(getComputedStyle(card).borderRadius)||14;
  var cx=w/2, mx=w-1, my=h-1;   // ۱px تورفتگی تا ضخامتِ ۲ کامل داخلِ کادر بماند
  svg.setAttribute("viewBox","0 0 "+w+" "+h);
  svg.setAttribute("preserveAspectRatio","none");
  var right="M"+cx+" 1 H"+(mx-r)+" A"+r+" "+r+" 0 0 1 "+mx+" "+(1+r)+
            " V"+(my-r)+" A"+r+" "+r+" 0 0 1 "+(mx-r)+" "+my+" H"+cx;
  var left ="M"+cx+" 1 H"+(1+r)+" A"+r+" "+r+" 0 0 0 1 "+(1+r)+
            " V"+(my-r)+" A"+r+" "+r+" 0 0 0 "+(1+r)+" "+my+" H"+cx;
  var pr=svg.querySelector("path.r"), pl=svg.querySelector("path.l");
  if(pr) pr.setAttribute("d", right);
  if(pl) pl.setAttribute("d", left);
  /* ⚠ مقادیرِ dash بر حسبِ پیکسلِ واقعی است، نه کسر.
     قبلاً pathLength=1 بود و طول‌ها نرمال می‌شدند؛ همان باعث می‌شد مقدارِ نهایی
     کلِ مسیر را نپوشاند و قاب در میانهٔ دو کناره ناتمام بماند.
     حالا طولِ واقعیِ مسیر خوانده می‌شود، پس «کامل» یعنی دقیقاً کامل. */
  var total=(pr&&pr.getTotalLength)?pr.getTotalLength():(cx+h+w);
  var shown=Math.min(cx-r, 27);            // نیم‌عرضِ خطِ کوتاه (۵۴px کامل)
  svg.style.setProperty("--lg-shown", shown.toFixed(1)+"px");
  svg.style.setProperty("--lg-full",  Math.ceil(total+2)+"px");   // +2 تا نقطهٔ اتصال حتماً بسته شود
  svg.style.setProperty("--lg-gap",   Math.ceil(total*2)+"px");   // فاصله‌ای بزرگ‌تر از مسیر، تا الگو تکرار نشود
  // ارتفاعِ ظرفِ قاب همیشه با ارتفاعِ واقعیِ پنل یکی می‌ماند
  var brand=document.querySelector(".login-brand");
  if(brand) brand.style.setProperty("--lg-card-h", h+"px");
  return {w:w,h:h};
}
/* ⚠ چرا فقط load کافی نیست: load منتظرِ دانلودِ کاملِ تصویرها و فونت‌هاست. تا آن لحظه
   صفحه با مقادیرِ پیش‌فرضِ CSS رسم شده و نوارِ نارنجی جایی می‌ایستد که جای واقعی‌اش نیست؛
   بعد با رسیدنِ اندازه‌های واقعی سُر می‌خورد سرِ جای درست. راهِ حل: به‌محضِ آماده‌شدنِ
   لوگو (نه کلِ صفحه) اندازه‌گیری شود، و تا آن زمان گذارها خاموش بمانند. */
(function lgEarlySync(){
  var img=document.querySelector(".login-brand .mark");
  if(img){
    if(img.complete && img.naturalWidth) lgSyncGeom();
    else img.addEventListener("load", lgSyncGeom, {once:true});
    img.addEventListener("error", lgSyncGeom, {once:true});   // حتی اگر لوگو نیامد، قفل باز شود
  }
  // فونتِ IRANSans ارتفاعِ شرح و دکمه را عوض می‌کند → پس از آماده‌شدنِ فونت‌ها یک‌بار دیگر
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(function(){ lgSyncGeom(); });
  /* تورِ ایمنی: اگر به هر دلیل اندازه‌گیری موفق نشد، قفلِ گذارها نباید برای همیشه بماند
     وگرنه انیمیشنِ باز‌شدنِ پنل هم اجرا نمی‌شود. */
  setTimeout(function(){
    var w=document.getElementById("loginView");
    if(w && w.classList.contains("lg-premeasure")){ _lgPre=false; w.classList.remove("lg-premeasure"); }
  }, 3000);
})();
window.addEventListener("load", lgSyncGeom);
window.addEventListener("resize", function(){
  var w=document.getElementById("loginView");
  if(w && !w.classList.contains("open")) lgSyncGeom();   // فقط در مرحلهٔ ۱ اندازه‌ها معتبرند
});
function lgOpen(){
  var w=document.getElementById("loginView"); if(!w) return;
  if(w.classList.contains("open")) return;
  lgSyncGeom();                     // هندسهٔ واقعی پیش از شروعِ گذار قفل شود
  w.classList.add("open");
  /* پس از پایانِ بالا‌رفتنِ بلوک (۵۵۰ms) دکمه روی جای دکمهٔ مرحلهٔ ۱ می‌نشیند.
     ⚠ زودتر از این ممکن نیست: تا وقتی بلوک در حالِ حرکت است، مختصاتِ دکمه
     لحظه‌ای است و اندازه‌گیری اشتباه می‌شود. */
  setTimeout(function(){ lgAlignBtn(); }, 600);
  // پس از پایانِ کاملِ کشو (۵۵۰ تأخیر + ۶۰۰ حرکت)، فوکوس روی نام کاربری
  setTimeout(function(){ var u=document.getElementById("lgUser"); if(u) u.focus(); }, 1150);
}
/* بازگشت به مرحلهٔ ۱ — همهٔ انیمیشن‌ها روی کلاسِ .open سوارند، پس با برداشتنِ آن خودبه‌خود معکوس اجرا می‌شوند.
   مقادیرِ فیلدها عمداً پاک نمی‌شوند تا اگر کاربر دوباره باز کرد، نوشته‌اش سرِ جایش باشد. */
function lgClose(){
  var w=document.getElementById("loginView"); if(!w) return;
  if(!w.classList.contains("open")) return;
  if(lgIsBusy()) return;            // وسطِ ارسالِ درخواست بسته نشود
  w.classList.remove("open");
  lgSetErr("");
  var a=document.activeElement;     // فوکوس از فیلدِ پنهان‌شده برداشته شود
  if(a && w.contains(a) && typeof a.blur==="function") a.blur();
}
function lgIsBusy(){
  var b=document.getElementById("lgBtn");
  return !!(b && b.disabled);
}
/* Escape = بازگشت؛ کلیک روی فضای بیرونِ کارت هم می‌بندد (هم‌رفتار با مودال‌های سایت) */
document.addEventListener("keydown", function(e){
  if(e.key!=="Escape") return;
  var w=document.getElementById("loginView");
  if(!w || w.classList.contains("hidden") || !w.classList.contains("open")) return;
  lgClose();
});
document.addEventListener("click", function(e){
  var w=document.getElementById("loginView");
  if(!w || w.classList.contains("hidden") || !w.classList.contains("open")) return;
  if(e.target.closest(".login-card")) return;      // داخلِ کارت: کاری نکن
  if(e.target.closest(".lg-start")) return;        // دکمهٔ آغاز خودش باز می‌کند
  if(!w.contains(e.target)) return;                // کلیکِ بیرون از صفحهٔ ورود
  lgClose();
});
/* نمایش/پنهان‌سازیِ رمز */
function lgTogglePass(){
  var i=document.getElementById("lgPass"), b=document.getElementById("lgEye");
  if(!i||!b) return;
  var show = i.type==="password";
  i.type = show ? "text" : "password";
  b.classList.toggle("on", show);
  b.setAttribute("aria-pressed", show?"true":"false");
  var t = show ? "پنهان‌کردن رمز عبور" : "نمایش رمز عبور";
  b.setAttribute("aria-label", t); b.setAttribute("title", t);
  i.focus();
}
async function doLogin(){
  if(document.getElementById("lgBtn") && document.getElementById("lgBtn").disabled) return;   // جلوگیری از ارسالِ دوباره
  var u=document.getElementById("lgUser").value.trim();
  var p=document.getElementById("lgPass").value;
  lgSetErr("");
  if(!u||!p){ lgSetErr("نام کاربری و رمز را وارد کنید."); return; }
  lgBusy(true);
  try{
    var r=await api("login",{username:u,password:p});
    if(!r.ok){
      /* پیامِ یکسان برای «کاربر پیدا نشد» و «رمز اشتباه»: اگر این دو از هم
         تفکیک شوند، می‌شود با آزمون‌وخطا فهمید کدام نام‌کاربری‌ها وجود دارند.
         خطای شبکه استثناست، چون کاربر باید بداند مشکل از اتصال است نه رمز. */
      lgSetErr(r.netError ? (r.message||"خطا در ارتباط با سرویس.") : "نام کاربری یا رمز عبور نادرست است.");
      lgBusy(false); return;
    }
    ME={ token:r.token, role:r.role, name:r.name, username:r.username, gender:r.gender||"", position:r.position||"", avatar:r.avatar||"" };
    /* زمانِ انقضا کنارِ توکن ذخیره می‌شود تا در بازگشاییِ بعدی، نشستِ تمام‌شده
       بدونِ رفت‌وبرگشت به سرور تشخیص داده شود (توکنِ بک‌اند ۱۲ ساعته است).
       اگر روزی خودِ بک‌اند expiresAt بفرستد، همان ملاک قرار می‌گیرد. */
    ME.expiresAt = r.expiresAt || (Date.now() + LG_TOKEN_TTL);
    localStorage.setItem("fsm_session", JSON.stringify(ME));
    // رمز نباید پس از ورود در DOM بماند
    var pw=document.getElementById("lgPass");
    if(pw){ pw.value=""; pw.type="password"; }
    var eye=document.getElementById("lgEye");
    if(eye){ eye.classList.remove("on"); eye.setAttribute("aria-pressed","false"); }
    await startApp();
    lgBusy(false);
  }catch(e){ lgSetErr("خطا در اتصال به سرویس."); lgBusy(false); }
}
/* خروجِ دستی (دکمهٔ سایدبار): اول تأیید می‌گیرد.
   ⚠ عمداً جدا از logout() است — خروجِ خودکار (نشستِ منقضی یا نشستِ نامعتبر)
   نباید منتظرِ تأییدِ کاربر بماند و باید فوراً انجام شود. */
async function confirmLogout(){
  var ok=await uiConfirm("از حساب کاربری خود خارج می‌شوید؟",
    { title:"خروج از سامانه", okLabel:"خروج", cancelLabel:"انصراف", danger:true });
  if(ok) logout();
}
function logout(){
  ME={token:null}; localStorage.removeItem("fsm_session");
  stopClock();
  document.getElementById("appView").classList.add("hidden");
  document.getElementById("loginView").classList.remove("hidden");
  lgSetErr(""); lgBusy(false);            // صفحهٔ ورود تمیز برگردد (بدونِ خطا/اسپینرِ نشست قبلی)
  document.getElementById("loginView").classList.remove("open");   // بازگشت به مرحلهٔ ۱ (برندِ بزرگ)
  var pw=document.getElementById("lgPass");
  if(pw){ pw.value=""; pw.type="password"; }
  var eye=document.getElementById("lgEye");
  if(eye){ eye.classList.remove("on"); eye.setAttribute("aria-pressed","false"); }
}
/* opts.deferReveal=true → پوستهٔ برنامه تا تأییدِ نشست نشان داده نمی‌شود.
   برای بازگشایی از نشستِ ذخیره‌شده لازم است: قبلاً برنامه فوراً باز می‌شد و اگر
   توکن منقضی بود چند ثانیه بعد کاربر به بیرون پرتاب می‌شد. با ورودِ دستی این
   تأخیر لازم نیست، چون توکن همان لحظه از سرور گرفته شده و قطعاً معتبر است. */
async function startApp(opts){
  var defer=!!(opts&&opts.deferReveal);
  if(!defer){
    // پوستهٔ برنامه را فوراً نشان بده و اسکلت بارگذاری بگذار، سپس داده را بگیر
    document.getElementById("loginView").classList.add("hidden");
    document.getElementById("appView").classList.remove("hidden");
    renderUserHeader();
    applyRoleVisibility();
    /* تبِ داشبورد در HTML با hidden شروع می‌شود؛ اینجا عمداً باز می‌شود تا اسکلتِ
       بارگذاری دیده شود. محتوایش هنوز اسکلت است، نه دادهٔ کهنه.
       ⚠ کلاسِ lg-noreveal: مرحلهٔ اسکلت نباید انیمیشنِ ورودِ آبشاری بگیرد، وگرنه
       آبشار دوبار پخش می‌شود — یک‌بار روی اسکلت و یک‌بار روی دادهٔ واقعی. */
    var dash=document.getElementById("tab-dashboard");
    if(dash){ dash.classList.add("no-reveal"); dash.classList.remove("hidden"); }
    if(typeof showDashboardSkeleton==="function") showDashboardSkeleton();
  }

  var r=await api("bootstrap",{});
  /* نشستِ نامعتبر: api خودش logout() را صدا زده و صفحهٔ ورود را آورده،
     پس این‌جا فقط باید بی‌سروصدا برگردیم (وگرنه خطای bootstrap هم روی آن می‌نشیند). */
  if(!ME.token) return;
  if(!r || !r.ok){
    if(defer){   // هنوز چیزی نمایش داده نشده؛ حالا پوسته را بیاور تا خطا جایی دیده شود
      document.getElementById("loginView").classList.add("hidden");
      document.getElementById("appView").classList.remove("hidden");
      renderUserHeader(); applyRoleVisibility();
    }
    // قفلِ مرحلهٔ اسکلت باید برداشته شود، وگرنه پیامِ خطا هم بی‌انیمیشن و پنهان می‌ماند
    var dashErr=document.getElementById("tab-dashboard");
    if(dashErr){ dashErr.classList.remove("no-reveal"); dashErr.classList.remove("hidden"); }
    if(typeof showBootstrapError==="function") showBootstrapError(); return;
  }
  if(defer){   // نشست تأیید شد؛ حالا با اطمینان برنامه را نشان بده
    document.getElementById("loginView").classList.add("hidden");
    document.getElementById("appView").classList.remove("hidden");
    renderUserHeader();
    applyRoleVisibility();
  }
  DB.clients=r.clients||[]; DB.orders=r.orders||[]; DB.projects=r.projects||[];
  DB.parts=r.parts||[]; DB.docTypes=r.docTypes||[]; DB.documents=r.documents||[]; DB.users=r.users||[];
  DB.templates=r.templates||[]; DB.workflow=r.workflow||[]; DB.partMods=r.partMods||[];
  DB.trashedDocs=r.trashedDocs||[];   // شناسنامهٔ اسنادِ حذف‌شده، برای معنا‌دار ماندنِ رویدادهای گذشته
  if(!r.backendVersion){ toast("بک‌اندِ سرویس هنوز نسخهٔ قدیمی است. در Apps Script از Deploy ▸ Manage deployments، روی همان deployment «New version» را دیپلوی کنید.", true); }
  /* نقشِ معتبر همان است که بک‌اند اعلام می‌کند، نه آنچه در localStorage نوشته شده.
     بدونِ این خط، دست‌کاریِ fsm_session می‌توانست دکمه‌های مدیر را در رابط باز کند
     (اقدامِ واقعی را بک‌اند رد می‌کند، ولی نباید اصلاً نمایش داده شود). */
  if(r.role) ME.role=r.role;
  // غنی‌سازی پروفایل کاربر جاری از رکورد خودش (برای مدیر که فهرست کاربران را دارد)
  var meRec=(DB.users||[]).find(function(x){return x.username===ME.username;});
  if(meRec){
    if(meRec.role) ME.role=meRec.role;
    ME.name=meRec.name||ME.name; ME.gender=meRec.gender||ME.gender; ME.position=meRec.position||ME.position; ME.avatar=meRec.avatar||ME.avatar;
  }
  localStorage.setItem("fsm_session", JSON.stringify(ME));   // نشستِ ذخیره‌شده با مقادیرِ تأییدشده هم‌گام شود
  applyRoleVisibility();   // اگر نقش اصلاح شد، رابط فوراً با آن هماهنگ شود
  renderUserHeader();
  startClock();
  applyRoleVisibility();
  refreshAllSelects();
  renderArchive(); renderDataTables();
  if(typeof renderNavTree==="function") renderNavTree();
  // قفلِ مرحلهٔ اسکلت برداشته می‌شود تا آبشار دقیقاً یک‌بار، روی دادهٔ واقعی، پخش شود
  var dashPane=document.getElementById("tab-dashboard");
  if(dashPane) dashPane.classList.remove("no-reveal");
  switchTab("dashboard");
}
/* هدر کاربر: آواتار + (آقای/خانم + نام) + تگِ نقش | سمت */
function renderUserHeader(){
  var hon=honorific(ME.gender);
  var nm=ME.name||ME.username||"";
  document.getElementById("uName").textContent=(hon?hon+" ":"")+nm;
  var rt=document.getElementById("uRole"); if(rt) rt.innerHTML=(typeof roleTag==="function")?roleTag(ME.role):"";
  var pos=document.getElementById("uPosition");
  pos.textContent=ME.position||"";
  pos.style.display=ME.position?"":"none";
  var av=document.getElementById("uAvatar");
  if(av){
    if(ME.avatar){ av.textContent=ME.avatar; av.classList.add("emoji"); }
    else { av.textContent=(nm.trim()[0]||"?"); av.classList.remove("emoji"); }
  }
}
function applyRoleVisibility(){
  var admin = ME.role==="admin";
  var reviewer = ME.role==="reviewer";
  document.querySelectorAll(".adminOnly").forEach(function(el){ el.style.display = admin ? "" : "none"; });
  document.querySelectorAll(".reviewerOnly").forEach(function(el){ el.style.display = (admin||reviewer) ? "" : "none"; });
}

/* ================= ساعت زندهٔ شمسی در نوار بالا ================= */
var _clockTimer;
function startClock(){
  stopClock();
  var el=document.getElementById("topClock");
  if(!el) return;
  el.innerHTML=fmtClockHTML();
  _clockTimer=setInterval(function(){
    var e=document.getElementById("topClock");
    if(e) e.innerHTML=fmtClockHTML();
  }, 30000);
}
function stopClock(){ if(_clockTimer){ clearInterval(_clockTimer); _clockTimer=null; } }
