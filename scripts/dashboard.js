/* ================= داشبورد ================= */
/* animate=true فقط هنگامِ ورود به تبِ داشبورد (بارِ اول یا کلیکِ سایدبار) داده می‌شود؛
   رفرش‌های پس‌زمینه (ثبتِ سند، تغییرِ تنظیمات) بدونِ آرگومان صدا می‌زنند تا شمارش/ورود دوباره پخش نشود. */
function renderDashboard(animate){
  var activeProjCount=DB.projects.filter(function(p){ return projectDocs(p).length>0; }).length;

  setKpi("kpiActiveProjects", activeProjCount,       animate, 0);
  setKpi("kpiDocs",           DB.documents.length,   animate, 1);
  setKpi("kpiApproved",       approvedDocs().length, animate, 2);
  setKpi("kpiPending",        pendingDocs().length,  animate, 3);
  updateKpiFeet();

  if(typeof renderReviewQueue==="function") renderReviewQueue();
  renderProjectCards(animate);
  renderRecentActivity();
}

/* متنِ واقعیِ «تغییر نسبت به دیروز» برایِ هر کارتِ شاخص — بر پایهٔ رویدادهای واقعیِ ۲۴ساعتِ اخیر
   (DB.workflow)، نه یک متنِ ثابتِ نمایشی. هر رویداد فقط یک‌بار می‌تواند در دلیلِ تغییرِ هر کارت بشمارَد. */
function updateKpiFeet(){
  var since=new Date(Date.now()-24*3600*1000).toISOString();
  var recentWf=(DB.workflow||[]).filter(function(w){ return (w.timestamp||"")>=since; });
  var countAction=function(a){ return recentWf.filter(function(w){ return w.action===a; }).length; };
  var newDocs=countAction("created")+countAction("revision");
  var approvedN=countAction("approved");
  var submittedN=countAction("submitted");
  var rejectedN=countAction("rejected");
  // پروژه‌های فعال: پروژه‌ای که اولین سندش در ۲۴ساعتِ اخیر ثبت شده، «تازه‌فعال‌شده» حساب می‌شود
  var newActiveProjects=DB.projects.filter(function(p){
    var docs=projectDocs(p); if(!docs.length) return false;
    var first=docs.reduce(function(m,d){ return (!m||(d.timestamp||"")<m)?(d.timestamp||""):m; },"");
    return first>=since;
  }).length;

  setKpiFoot("kpiFootActiveProjects", newActiveProjects, function(n){ return n+" پروژهٔ تازه‌فعال‌شده"; });
  setKpiFoot("kpiFootDocs", newDocs, function(n){ return n+" سندِ جدید"; });
  setKpiFoot("kpiFootApproved", approvedN, function(n){ return n+" تأییدِ جدید"; });
  setKpiFoot("kpiFootPending", submittedN, function(n){
    return rejectedN>0 ? (n+" ارسالِ جدید · "+faN(rejectedN)+" عدمِ تأیید") : (n+" ارسالِ جدید");
  });
}
function setKpiFoot(id, n, textFn){
  var el=document.getElementById(id); if(!el) return;
  var t=el.querySelector("span:last-child");
  if(!t) return;
  t.textContent = n>0 ? textFn(faN(n)) : "تغییری نسبت به دیروز ندارد";
}

/* آیا کاربر کاهشِ حرکت خواسته؟ همهٔ انیمیشن‌های تزئینی پشتِ این گیت می‌شوند. */
function prefersReducedMotion(){ return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); }

/* کارتِ شاخص: هنگامِ ورودِ تب با شمارشِ نرم از ۰ پر می‌شود؛ در رفرشِ پس‌زمینه یا کاهشِ حرکت، مستقیم. */
function setKpi(id, val, animate, index){
  var el=document.getElementById(id); if(!el) return;
  val=Math.max(0, parseInt(val,10)||0);
  if(!animate || prefersReducedMotion()){ el.textContent=faN(val); return; }
  countUp(el, val, (index||0)*90);   // تأخیرِ پلکانی تا شمارش‌ها با ورودِ آبشاریِ کارت‌ها هم‌گام شوند
}
/* شمارشِ ۰ → target با easeOutCubic — شمارشگرِ تعداد است، پس ارقامِ فارسی. */
function countUp(el, target, delay){
  target=Math.max(0, parseInt(target,10)||0);
  el.textContent=faN(0);
  var run=function(){
    var dur=Math.min(1100, 380+target*22), t0=null;   // اعدادِ بزرگ‌تر کمی طولانی‌تر (با سقف)
    function tick(ts){
      if(t0===null) t0=ts;
      var p=Math.min((ts-t0)/dur,1), eased=1-Math.pow(1-p,3);
      el.textContent=faN(Math.round(target*eased));
      if(p<1) requestAnimationFrame(tick); else el.textContent=faN(target);
    }
    requestAnimationFrame(tick);
  };
  if(delay>0) setTimeout(run, delay); else run();
}
/* ================= ورودِ آبشاریِ عمومیِ صفحات ================= */
/* از switchTab برای هر تب صدا زده می‌شود: به بلوک‌های سطح‌بالای تبِ فعال به‌ترتیب کلاسِ rv-in
   با تأخیرِ پلکانی می‌دهد تا از پایین بالا بیایند. سبک است چون فقط بلوک‌های سطح‌بالا (نه ردیف‌ها)
   با transform/opacity متحرک می‌شوند. */
function isHiddenEl(el){
  if(el.hidden) return true;
  var cs=window.getComputedStyle(el);
  return cs.display==="none" || cs.visibility==="hidden";
}
/* واحدهای آبشار: فرزندانِ مستقیمِ ریشه؛ ولی به درونِ هر ظرفِ rv-group (در هر عمق) فرو می‌رود
   تا فرزندانِ همان، واحدِ آبشار شوند — پس پنل‌های تودرتو (مثلِ پنلِ مشتریان) هم پلکانی می‌آیند نه یک‌جا. */
function collectRevealUnits(root){
  var out=[];
  (function walk(el){
    [].forEach.call(el.children, function(ch){
      if(isHiddenEl(ch)) return;
      if(ch.classList && ch.classList.contains("rv-group")) walk(ch);
      else out.push(ch);
    });
  })(root);
  return out;
}
/* به واحدهای درونِ root کلاسِ rv-in با تأخیرِ پلکانی می‌دهد؛ با reflow از نو پخش می‌شود.
   هم برای ورودِ کلِ تب استفاده می‌شود، هم برای بخشی از صفحه (مثلِ سمتِ راستِ پنلِ مشتریان هنگامِ سوئیچ). */
function revealCascade(root){
  if(!root) return;
  var prev=root.querySelectorAll(".rv-in");                       // پاک‌سازیِ پخشِ قبلی
  [].forEach.call(prev, function(el){ el.classList.remove("rv-in"); el.style.animationDelay=""; });
  if(prefersReducedMotion()) return;                              // کاهشِ حرکت: بدونِ آبشار، نمایشِ مستقیم
  var units=collectRevealUnits(root);
  void root.offsetWidth;                                          // اجبارِ reflow تا انیمیشن از نو پخش شود
  units.forEach(function(el,i){ el.style.animationDelay=(Math.min(i,10)*0.06)+"s"; el.classList.add("rv-in"); }); // سقفِ تأخیر برای فهرست‌های بلند
}
function playTabReveal(pane){ revealCascade(pane); }

/* کلیدِ یکتای هر پروژه (برای به‌خاطرسپاریِ کارتِ بازِ فعلی بینِ رفرش‌ها) */
function projKey(r){ return r.c+"|"+r.o+"|"+r.pr; }
/* کلیدِ پروژه‌ای که الان باید باز باشد؛ null = هنوز کاربر دستی چیزی انتخاب نکرده (پیش‌فرض: اولین ردیف) */
var _projOpenKey=null;

/* کارت‌های پروژهٔ باز‌شونده. animate=true فقط هنگامِ ورود به تبِ داشبورد: نوارِ پیشرفت از صفر پر می‌شود
   و عددِ درصدِ بالای آن هم‌زمان از صفر می‌شمارد؛ رفرش‌های پس‌زمینه مستقیم مقدارِ نهایی را نشان می‌دهند.
   همیشه دقیقاً یک کارت باز است: پیش‌فرض اولین ردیف؛ اگر کاربر دستی کارتِ دیگری را باز کند همان می‌ماند
   تا رفرش‌های بعدی (چون کلید در _projOpenKey نگه‌داشته می‌شود). */
function renderProjectCards(animate){
  var host=document.getElementById("projCardsList");
  if(!DB.projects.length){
    host.innerHTML=emptyState("پروژه‌ای ثبت نشده","برای شروع، از «تنظیمات» یک پروژه بسازید تا وضعیت تکمیل آن اینجا دیده شود.");
    return;
  }
  // آخرین پروژهٔ تغییریافته (جدیدترین timestampِ اسنادش) بالاترین؛ پروژهٔ بدونِ هیچ سندی ته صف
  var all=DB.projects.map(projectStats).sort(function(a,b){return (b.last||"").localeCompare(a.last||"");});
  var rows=all.slice(0,4);            // حداکثر ۴ پروژه در داشبورد
  var IC_OK='<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>';
  var IC_OPEN='<svg viewBox="0 0 24 24"><line x1="21.5" y1="12" x2="2.5" y2="12"/><polyline points="10 4.5 2.5 12 10 19.5"/></svg>';
  var doAnim = animate && !prefersReducedMotion();
  // اگر کلیدِ بازِ فعلی دیگر در فهرست نیست (یا هنوز چیزی انتخاب نشده)، پیش‌فرض روی اولین ردیف بیفتد
  var openIdx = rows.findIndex(function(r){ return projKey(r)===_projOpenKey; });
  if(openIdx<0){ openIdx = rows.length?0:-1; if(rows.length) _projOpenKey=projKey(rows[0]); }
  host.innerHTML='<div class="proj-list">'+rows.map(function(r,i){
    var msg=r.missingLabels.length
      ? '<div class="detail-msgs">'+
          r.missingLabels.map(function(lbl){return '<span class="status-chip warn">'+esc(lbl)+'</span>';}).join("")+'</div>'
      : (r.total?'<div class="detail-msgs"><span class="msg-note">'+IC_OK+'همهٔ اسنادِ الزامی ثبت شده‌اند</span></div>'
                :'<div class="detail-msgs"><span class="msg-note">هنوز سندِ الزامی‌ای تعریف نشده</span></div>');
    // حالتِ اولیهٔ انیمیشن: نوار خالی و عددِ درصد صفر؛ مقدارهای واقعی روی data-* برای مرحلهٔ پرشدن
    var pctText=doAnim?"0":r.pct, regW=doAnim?0:r.regPct, solW=doAnim?0:r.pct;
    var openCls=(i===openIdx)?" open":"";
    return '<div class="proj-card'+openCls+'" data-pct="'+r.pct+'" data-regpct="'+r.regPct+'" data-bar="'+esc(r.status.bar)+'" data-i="'+i+'" data-key="'+esc(projKey(r))+'">'+
      '<div class="proj-card-head" onclick="toggleProjCard(this)">'+
        '<div class="proj-card-row"><span class="proj-card-name">پروژه تولید '+esc(r.name)+'</span>'+
          '<span class="proj-chevron"><svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg></span></div>'+
        '<div class="proj-card-row"><span class="proj-card-meta">'+esc(r.client)+'</span></div>'+
        '<div class="proj-prog">'+
          '<span class="pp-big pp-pct">'+pctText+'٪</span>'+
          '<div class="proj-bar-bg"><div class="proj-bar-fill faint" style="width:'+regW+'%"></div>'+
            '<div class="proj-bar-fill solid" style="width:'+solW+'%;background:'+esc(r.status.bar)+'"></div></div>'+
        '</div>'+
      '</div>'+
      '<div class="proj-card-detail"><div class="pcd-inner"><div class="pcd-body">'+
        '<div class="detail-stats"><span>کل اسناد الزامی: <b>'+faN(r.total)+' سند</b></span><span>ثبت‌شده: <b>'+faN(r.reg)+' سند</b></span>'+
          '<span>تأییدشده: <b>'+faN(r.apr)+' سند</b></span><span>باقی‌مانده: <b>'+faN(r.miss)+' سند</b></span></div>'+
        '<div class="pcd-foot">'+msg+
          '<button class="btn sm proj-open-btn" onclick="openProject(\''+esc(r.c)+'\',\''+esc(r.o)+'\',\''+esc(r.pr)+'\')">مشاهدهٔ پروژه'+IC_OPEN+'</button>'+
        '</div>'+
      '</div></div></div>'+
    '</div>';
  }).join("")+'</div>';
  if(doAnim) requestAnimationFrame(function(){ requestAnimationFrame(playProjBarsIn); });   // یک فریم صبر تا استایلِ اولیه (۰٪) واقعاً رندر شود، بعد پر شدن اجرا شود
}
/* پرشدنِ آبشاریِ نوارهای پیشرفت + شمارشِ هم‌زمانِ عددِ درصد، هماهنگ با ورودِ آبشاریِ خودِ کارت‌ها (rv-in) */
function playProjBarsIn(){
  var cards=document.querySelectorAll("#projCardsList .proj-card");
  [].forEach.call(cards, function(card){
    var i=parseInt(card.getAttribute("data-i"),10)||0;
    var pct=parseInt(card.getAttribute("data-pct"),10)||0;
    var regPct=parseInt(card.getAttribute("data-regpct"),10)||0;
    var bar=card.getAttribute("data-bar")||"";
    var delay=180+i*70;   // پس از پایانِ ورودِ خودِ کارت (rv-in) شروع شود، با تأخیرِ پلکانیِ سبک بینِ کارت‌ها
    setTimeout(function(){
      var faint=card.querySelector(".proj-bar-fill.faint"), solid=card.querySelector(".proj-bar-fill.solid");
      if(faint) faint.style.width=regPct+"%";
      if(solid) solid.style.width=pct+"%";
      var numEl=card.querySelector(".pp-pct");
      if(numEl) countUpPercent(numEl, pct);
    }, delay);
  });
}
/* شمارشِ عددِ درصد از ۰ تا target، هم‌زمان با پرشدنِ نوار (همان مدت‌زمانِ transitionِ نوار: ۰٫۶ثانیه) */
function countUpPercent(el, target){
  target=Math.max(0, parseInt(target,10)||0);
  var dur=600, t0=null;
  function tick(ts){
    if(t0===null) t0=ts;
    var p=Math.min((ts-t0)/dur,1), eased=1-Math.pow(1-p,3);
    el.textContent=Math.round(target*eased)+"٪";
    if(p<1) requestAnimationFrame(tick); else el.textContent=target+"٪";
  }
  requestAnimationFrame(tick);
}
/* آکاردئون: همیشه دقیقاً یک کارت باز است (هرگز صفرتا).
   - کلیک روی کارتِ بسته: همان باز می‌شود (و بقیه بسته)، _projOpenKey به‌روزرسانی می‌شود.
   - کلیک روی کارتِ بازِ فعلی (یعنی «می‌خواهم مینیمایزش کنم»): به‌جای بستنِ کامل، پروژهٔ بعدیِ فهرست
     به‌جایش باز می‌شود (یا اگر آخری بود، اولین)، تا همیشه یکی باز بماند. */
function toggleProjCard(head){
  var card=head.parentElement, list=card.parentElement;
  if(!list) return;
  var wasOpen=card.classList.contains("open");
  var cards=[].slice.call(list.querySelectorAll(".proj-card"));
  var target=card;
  if(wasOpen){
    var i=cards.indexOf(card);
    target=cards[(i+1)%cards.length];   // پروژهٔ بعدی؛ اگر آخری بود، برمی‌گردد به اولین
  }
  cards.forEach(function(c){ c.classList.remove("open"); });
  target.classList.add("open");
  _projOpenKey=target.getAttribute("data-key")||null;
}

/* یک ردیف تایم‌لاین فعالیت (مشترک بین داشبورد و پنجرهٔ «مشاهدهٔ همه») */
/* برچسب/رنگِ بج بر پایهٔ نوعِ رویداد (نه وضعیتِ لحظه‌ایِ سند) — هم‌واژهٔ تایم‌لاینِ گردش‌کار در مودال */
function wfActionBadge(action){
  var a=String(action||"").toLowerCase();
  var map={ approved:{cls:"badge-approved",label:"تأیید"},
            rejected:{cls:"badge-rejected",label:"عدم تایید"},
            submitted:{cls:"badge-pending",label:"بازبینی"},
            newversion:{cls:"badge-draft",label:"نسخهٔ جدید"},
            created:{cls:"badge-draft",label:"ایجاد"},
            revision:{cls:"badge-draft",label:"ایجاد"},
            deleted:{cls:"badge-rejected",label:"حذف"},          // حذفِ نرم (به سطلِ زباله، قابلِ بازیابی)
            restored:{cls:"badge-approved",label:"بازیابی"},      // بازگردانده‌شده از سطلِ زباله
            purged:{cls:"badge-rejected",label:"حذف دائمی"} };    // حذفِ همیشگی (معمولاً توسطِ «سامانه»)
  return map[a] || { cls:"badge-draft", label:workflowActionLabel(a) };
}
/* یک ردیفِ فعالیت = یک رویدادِ گردش‌کار (ثبت/ارسال/تأیید/رد/بارگذاریِ نسخه) */
function activityItemHTML(ev, isLast, asCard){
  var d=docByNumber(ev.drawingNumber);
  var meName=ev.user?esc(userName(ev.user)):'';
  var b=wfActionBadge(ev.action);
  var ctx=d?esc(docPhrase(d)):'';   // زمینه (نوع/قطعه/پروژه/مشتری)؛ اگر سند حذف شده باشد، فقط شماره
  var dateHTML='<span class="rq-date">'+fmtDate(ev.timestamp)+'</span>';
  var tagHTML=badgeHTML("wf-badge act-tag "+b.cls, b.label);
  /* بلوکِ متنیِ دو‌خطیِ ثابت: توضیح و «کاربر: نام» در یک جریانِ متنیِ واحد‌اند.
     - اگر توضیح یک‌خطی باشد، JS کلاسِ .one را می‌گذارد و توضیح بلوکی می‌شود تا نام به خطِ دوم برود.
     - اگر توضیح دو‌خطی شود، نام در ادامهٔ همان خطِ دوم پشتِ جداکنندهٔ نازک می‌آید.
     مرزِ راستِ متن (همان «خطِ قرمز») با padding-inline-end در CSS تعیین می‌شود تا زیرِ تگ نرود. */
  var whoHTML = meName
    ? '<span class="act-sep" aria-hidden="true"></span>'+
      '<span class="act-who"><span class="act-who-label">کاربر: </span>'+meName+'</span>'
    : '';
  var body =
    '<div class="act-body">'+
      '<div class="act-lines'+(ctx?'':' no-desc')+'">'+
        (ctx?'<span class="act-desc" title="'+ctx+'">'+ctx+'</span>':'')+
        whoHTML+
      '</div>'+
      tagHTML+
    '</div>';
  if(asCard){
    // نسخهٔ کارت (مودالِ «همهٔ فعالیت‌ها») — هم‌شکلِ کارتابل بازبینی؛ تاریخ بالا کنارِ شمارهٔ سند (سمتِ چپ)
    return '<div class="rq-item">'+
      '<div class="rq-marker"><div class="tl-dot"></div><div class="rq-line"></div></div>'+
      '<div class="rq-main">'+
        '<div class="rq-head-row"><div class="rq-num mono" onclick="openDocDetail(\''+esc(ev.drawingNumber)+'\')">'+esc(ev.drawingNumber)+'</div>'+dateHTML+'</div>'+
        body+
      '</div></div>';
  }
  return '<div class="tl-item">'+
    '<div class="tl-marker"><div class="tl-dot"></div><div class="tl-line"></div></div>'+
    '<div class="tl-body">'+
      '<div class="rq-head-row"><div class="tl-num" onclick="openDocDetail(\''+esc(ev.drawingNumber)+'\')">'+esc(ev.drawingNumber)+'</div>'+dateHTML+'</div>'+
      body+
    '</div></div>';
}
/* تعیینِ «حالت ۱ یا ۲» برای هر ردیفِ فعالیت، با اندازه‌گیریِ واقعیِ متن در عرضِ واقعیِ سلول
   (نه عددِ px حدسی — علتِ شکستِ تلاش‌های قبلی همین بود).
     ۱) نامِ کاربر موقتاً پنهان می‌شود تا ارتفاعِ خالصِ توضیح سنجیده شود.
        ارتفاع = یک خط → حالت ۱ (کلاسِ .one): توضیح بلوکی می‌شود و نام به خطِ دومِ مستقل می‌رود.
     ۲) وگرنه حالت ۲: نام در ادامهٔ همان خطِ دوم، پشتِ جداکنندهٔ نازک می‌ماند.
     ۳) اگر در حالت ۲ توضیحِ بلند، نام را به خطِ سوم هُل بدهد، انتهای توضیح با «…» کوتاه
        می‌شود (جست‌وجوی دودویی) تا نام حتماً روی خطِ دوم دیده شود؛ متنِ کامل در tooltip می‌ماند.
   نتیجه: همیشه دقیقاً دو خط — نه بیشتر (کلمپِ CSS + مرحلهٔ ۳)، نه کمتر (min-height روی .act-body). */
function fixActivityLines(root){
  if(!root) return;
  var lines=root.querySelectorAll(".act-lines");
  for(var i=0;i<lines.length;i++){
    var el=lines[i];
    var desc=el.querySelector(".act-desc");
    if(!desc){ el.classList.remove("one"); continue; }
    el.classList.remove("one");                       // پاک‌سازی تا اندازه‌گیری تمیز باشد
    var full=desc.getAttribute("data-full");
    if(full===null){ full=desc.textContent; desc.setAttribute("data-full", full); }
    else desc.textContent=full;                       // بازگردانی به متنِ کامل پیش از اندازه‌گیریِ دوباره
    var tail=el.querySelectorAll(".act-sep,.act-who");
    var j;
    var lh=parseFloat(getComputedStyle(el).lineHeight)||19.55;
    var TWO=lh*2.5;                                   // آستانهٔ «بیش از دو خط» (با رواداریِ نصفِ خط)
    // مرحله ۱ — آیا توضیح به‌تنهایی در یک خط جا می‌شود؟ (نام موقتاً پنهان)
    for(j=0;j<tail.length;j++) tail[j].style.display="none";
    var oneLine = desc.getBoundingClientRect().height < (lh*1.5);
    for(j=0;j<tail.length;j++) tail[j].style.display="";
    if(oneLine){ el.classList.add("one"); continue; }  // حالت ۱ — نام به خطِ دومِ مستقل می‌رود
    // مرحله ۲ — حالت ۲: نام باید در ادامهٔ خطِ دوم دیده شود. اگر توضیح آن‌قدر بلند باشد که
    // با افزودنِ نام به خطِ سوم برسد، انتهای توضیح با «…» کوتاه می‌شود تا جا برای نام باز شود.
    // کلمپ موقتاً برداشته می‌شود تا ارتفاعِ واقعی (نه ارتفاعِ بریده‌شده) اندازه گرفته شود.
    el.style.webkitLineClamp="unset"; el.style.display="block";
    var h=function(){ return el.getBoundingClientRect().height; };
    if(h()>TWO){
      var lo=0, hi=full.length, best=0;
      while(lo<=hi){                                   // جست‌وجوی دودویی روی طولِ متن
        var mid=(lo+hi)>>1;
        desc.textContent=full.slice(0,mid).replace(/\s+$/,"")+"…";
        if(h()<=TWO){ best=mid; lo=mid+1; } else hi=mid-1;
      }
      desc.textContent=best>0 ? full.slice(0,best).replace(/\s+$/,"")+"…" : "…";
    }
    el.style.webkitLineClamp=""; el.style.display="";  // بازگرداندنِ کلمپ (لایهٔ دومِ محافظت)
  }
}
/* با تغییرِ عرضِ پنجره نقطهٔ شکستِ متن عوض می‌شود؛ حالتِ ۱/۲ باید دوباره حساب شود */
var _actLinesT=null;
window.addEventListener("resize", function(){
  clearTimeout(_actLinesT);
  _actLinesT=setTimeout(function(){
    fixActivityLines(document.getElementById("recentDocsList"));
    fixActivityLines(document.getElementById("modalHost"));
  }, 150);
});
/* رویدادهای گردش‌کار به‌ترتیبِ زمانِ نزولی — تأیید/رد/ارسال هم اینجا رویدادِ تازه می‌سازند.
   fallback: اگر برگهٔ Workflow خالی بود (قبل از setup)، از خودِ اسناد (رویدادِ ثبت) بازسازی می‌شود. */
function sortedActivity(){
  var wf=DB.workflow||[];
  if(wf.length) return [].concat(wf).sort(function(a,b){ return String(b.timestamp||"").localeCompare(String(a.timestamp||"")); });
  return [].concat(DB.documents||[]).map(function(d){ return {drawingNumber:d.drawingNumber, action:"created", user:d.uploadedBy, timestamp:d.timestamp}; })
    .sort(function(a,b){ return String(b.timestamp||"").localeCompare(String(a.timestamp||"")); });
}

/* فعالیت اخیر — تایم‌لاین، حداکثر ۳ مورد + «مشاهدهٔ همه» */
function renderRecentActivity(){
  var host=document.getElementById("recentDocsList");
  var all=sortedActivity();
  var SHOW=5;   // رکوردهای بیشتر تا سلولِ فعالیت هم‌ارتفاعِ سلولِ پیشرفتِ پروژه‌ها پر شود
  var seeAll=document.getElementById("recentSeeAll");
  if(seeAll) seeAll.hidden = all.length<=SHOW;   // دکمه فقط وقتی موردِ نهفته هست
  if(!all.length){
    host.innerHTML=emptyState("فعالیتی ثبت نشده","با ثبت اولین سند، رویدادها اینجا به‌صورت تایم‌لاین نمایش داده می‌شوند.");
    return;
  }
  var recent=all.slice(0,SHOW);
  host.innerHTML='<div class="timeline-list">'+recent.map(function(d,i){
    return activityItemHTML(d, i===recent.length-1);
  }).join("")+'</div>';
  fixActivityLines(host);   // تعیینِ حالتِ ۱/۲ پس از چیده‌شدنِ متن در عرضِ واقعی
}

/* پنجرهٔ کاملِ فعالیت‌ها — همهٔ رویدادها بر اساس تاریخ، قابل اسکرول */
/* ================= پنجرهٔ «همهٔ فعالیت‌ها»: صفحه‌بندی‌شده ================= */
var _raAll=[], _raPage=1;
var RA_PER=10;   // تعدادِ رکورد در هر صفحه
function openRecentAllModal(){
  _raAll=sortedActivity();
  _raPage=1;
  raRender();
}
function raRender(){
  var total=_raAll.length, pages=Math.max(1, Math.ceil(total/RA_PER));
  if(_raPage>pages) _raPage=pages;
  var startI=(_raPage-1)*RA_PER, endI=Math.min(startI+RA_PER, total);
  var pageRows=_raAll.slice(startI, endI);
  var inner = total
    ? '<div class="rq-list">'+pageRows.map(function(d){ return activityItemHTML(d, false, true); }).join("")+'</div>'
    : emptyState("فعالیتی ثبت نشده","با ثبت اولین سند، رویدادها اینجا نمایش داده می‌شوند.");
  var foot = total>RA_PER ? raPagerHTML(total,startI,endI,_raPage,pages) : '';
  showModal("همهٔ فعالیت‌ها", '<div class="seeall-body">'+inner+foot+'</div>', "seeall-box");
  fixActivityLines(document.getElementById("modalHost"));   // همان قاعدهٔ دو‌خطی در پنجرهٔ «همهٔ فعالیت‌ها»
  if(typeof revealCascade==="function") revealCascade(document.querySelector("#modalHost .rq-list"));   // ورودِ آبشاریِ کارت‌ها، هم‌سبک با سایت
}
/* صفحه‌بندیِ سبک (بدونِ دراپ‌داونِ تعدادِ سطر و بدونِ متنِ بازه) — فقط ناوبری، وسط‌چین */
function raPagerHTML(total,startI,endI,page,pages){
  var atFirst=page<=1, atLast=page>=pages;
  return '<div class="arch-pager ra-pager">'+
      '<span class="pg-nav">'+
        pgBtn("raFirst()",PG_IC.first,atFirst,"صفحهٔ اول")+
        pgBtn("raPrev()",PG_IC.prev,atFirst,"صفحهٔ قبلی")+
        pgBtn("raNext()",PG_IC.next,atLast,"صفحهٔ بعدی")+
        pgBtn("raLast()",PG_IC.last,atLast,"صفحهٔ آخر")+
      '</span>'+
    '</div>';
}
function raFirst(){ _raPage=1; raRender(); }
function raPrev(){ if(_raPage>1){ _raPage--; raRender(); } }
function raNext(){ var pages=Math.max(1, Math.ceil(_raAll.length/RA_PER)); if(_raPage<pages){ _raPage++; raRender(); } }
function raLast(){ _raPage=Math.max(1, Math.ceil(_raAll.length/RA_PER)); raRender(); }

/* اسکلت بارگذاری داشبورد (تا رسیدن داده از سرویس) */
function skBlocks(n,cls){ var s=""; for(var i=0;i<n;i++) s+='<div class="sk '+cls+'"></div>'; return s; }
function showDashboardSkeleton(){
  ["kpiDocs","kpiActiveProjects","kpiApproved","kpiPending"].forEach(function(id){
    var el=document.getElementById(id); if(el) el.innerHTML='<span class="sk sk-num"></span>';
  });
  var pc=document.getElementById("projCardsList"); if(pc) pc.innerHTML='<div class="proj-list">'+skBlocks(3,"sk-card")+'</div>';
  var rc=document.getElementById("recentDocsList"); if(rc) rc.innerHTML=skBlocks(4,"sk-row");
}
/* حالت خطای بارگذاری اولیه با دکمهٔ تلاش دوباره */
function showBootstrapError(){
  ["kpiDocs","kpiActiveProjects","kpiApproved","kpiPending"].forEach(function(id){ var el=document.getElementById(id); if(el) el.textContent="—"; });
  var rc=document.getElementById("recentDocsList"); if(rc) rc.innerHTML="";
  var pc=document.getElementById("projCardsList");
  if(pc) pc.innerHTML='<div class="empty-state">'+
    '<svg viewBox="0 0 24 24"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'+
    '<div class="es-title">بارگذاری داده‌ها ناموفق بود</div>'+
    '<div class="es-desc">ارتباط با سرویس برقرار نشد. اتصال اینترنت را بررسی کنید و دوباره تلاش کنید.</div>'+
    '<button class="btn primary" style="margin-top:14px" onclick="startApp()">تلاش دوباره</button></div>';
}

/* حالت خالی قابل‌استفاده */
function emptyState(title,desc){
  return '<div class="empty-state">'+
    '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>'+
    '<div class="es-title">'+esc(title)+'</div><div class="es-desc">'+esc(desc)+'</div></div>';
}

/* باز کردن پروژه از داشبورد → صفحهٔ جزئیات پروژه */
function openProject(c,o,pr){
  switchTab("project");
  showProjectDetail(c,pad2(o),pad2(pr));
}
