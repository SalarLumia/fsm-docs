/* ================= داشبورد ================= */
/* animate=true فقط هنگامِ ورود به تبِ داشبورد (بارِ اول یا کلیکِ سایدبار) داده می‌شود؛
   رفرش‌های پس‌زمینه (ثبتِ سند، تغییرِ تنظیمات) بدونِ آرگومان صدا می‌زنند تا شمارش/ورود دوباره پخش نشود. */
function renderDashboard(animate){
  var activeProjCount=DB.projects.filter(function(p){ return projectDocs(p).length>0; }).length;

  setKpi("kpiActiveProjects", activeProjCount,       animate, 0);
  setKpi("kpiDocs",           DB.documents.length,   animate, 1);
  setKpi("kpiApproved",       approvedDocs().length, animate, 2);
  setKpi("kpiPending",        pendingDocs().length,  animate, 3);

  if(typeof renderReviewQueue==="function") renderReviewQueue();
  renderProjectCards();
  renderRecentActivity();
}

/* آیا کاربر کاهشِ حرکت خواسته؟ همهٔ انیمیشن‌های تزئینی پشتِ این گیت می‌شوند. */
function prefersReducedMotion(){ return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); }

/* کارتِ شاخص: هنگامِ ورودِ تب با شمارشِ نرم از ۰ پر می‌شود؛ در رفرشِ پس‌زمینه یا کاهشِ حرکت، مستقیم. */
function setKpi(id, val, animate, index){
  var el=document.getElementById(id); if(!el) return;
  val=Math.max(0, parseInt(val,10)||0);
  if(!animate || prefersReducedMotion()){ el.textContent=val; return; }
  countUp(el, val, (index||0)*90);   // تأخیرِ پلکانی تا شمارش‌ها با ورودِ آبشاریِ کارت‌ها هم‌گام شوند
}
/* شمارشِ ۰ → target با easeOutCubic (ارقامِ لاتین، هم‌سو با بقیهٔ سایت). */
function countUp(el, target, delay){
  target=Math.max(0, parseInt(target,10)||0);
  el.textContent="0";
  var run=function(){
    var dur=Math.min(1100, 380+target*22), t0=null;   // اعدادِ بزرگ‌تر کمی طولانی‌تر (با سقف)
    function tick(ts){
      if(t0===null) t0=ts;
      var p=Math.min((ts-t0)/dur,1), eased=1-Math.pow(1-p,3);
      el.textContent=Math.round(target*eased);
      if(p<1) requestAnimationFrame(tick); else el.textContent=target;
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

/* کارت‌های پروژهٔ باز‌شونده */
function renderProjectCards(){
  var host=document.getElementById("projCardsList");
  if(!DB.projects.length){
    host.innerHTML=emptyState("پروژه‌ای ثبت نشده","برای شروع، از «تنظیمات» یک پروژه بسازید تا وضعیت تکمیل آن اینجا دیده شود.");
    return;
  }
  var all=DB.projects.map(projectStats).sort(function(a,b){return a.pct-b.pct;});
  var rows=all.slice(0,3);            // حداکثر ۳ پروژه در داشبورد
  var IC_OK='<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>';
  var IC_OPEN='<svg viewBox="0 0 24 24"><line x1="21.5" y1="12" x2="2.5" y2="12"/><polyline points="10 4.5 2.5 12 10 19.5"/></svg>';
  host.innerHTML='<div class="proj-list">'+rows.map(function(r){
    var msg=r.missingLabels.length
      ? '<div class="detail-msgs">'+
          r.missingLabels.map(function(lbl){return '<span class="status-chip warn">'+esc(lbl)+'</span>';}).join("")+'</div>'
      : (r.total?'<div class="detail-msgs"><span class="msg-note">'+IC_OK+'همهٔ اسنادِ الزامی ثبت شده‌اند</span></div>'
                :'<div class="detail-msgs"><span class="msg-note">هنوز سندِ الزامی‌ای تعریف نشده</span></div>');
    return '<div class="proj-card">'+
      '<div class="proj-card-head" onclick="toggleProjCard(this)">'+
        '<div class="proj-card-row"><span class="proj-card-name">پروژه تولید '+esc(r.name)+'</span>'+
          '<span class="proj-chevron"><svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg></span></div>'+
        '<div class="proj-card-row"><span class="proj-card-meta">'+esc(r.client)+'</span></div>'+
        '<div class="proj-prog">'+
          '<span class="pp-big">'+r.pct+'٪</span>'+
          '<div class="proj-bar-bg"><div class="proj-bar-fill faint" style="width:'+r.regPct+'%"></div>'+
            '<div class="proj-bar-fill solid" style="width:'+r.pct+'%;background:'+r.status.bar+'"></div></div>'+
        '</div>'+
      '</div>'+
      '<div class="proj-card-detail"><div class="pcd-inner"><div class="pcd-body">'+
        '<div class="detail-stats"><span>کل اسناد الزامی: <b>'+r.total+'</b></span><span>ثبت‌شده: <b>'+r.reg+'</b></span>'+
          '<span>تأییدشده: <b>'+r.apr+'</b></span><span>باقی‌مانده: <b>'+r.miss+'</b></span></div>'+
        '<div class="pcd-foot">'+msg+
          '<button class="btn sm proj-open-btn" onclick="openProject(\''+esc(r.c)+'\',\''+esc(r.o)+'\',\''+esc(r.pr)+'\')">مشاهدهٔ پروژه'+IC_OPEN+'</button>'+
        '</div>'+
      '</div></div></div>'+
    '</div>';
  }).join("")+'</div>';
}
/* آکاردئون: با باز شدن یک پروژه، بقیهٔ پروژه‌های باز بسته می‌شوند (هر لحظه فقط یکی باز) */
function toggleProjCard(head){
  var card=head.parentElement, willOpen=!card.classList.contains("open");
  var list=card.parentElement;
  if(list){ var open=list.querySelectorAll(".proj-card.open"); for(var i=0;i<open.length;i++) open[i].classList.remove("open"); }
  if(willOpen) card.classList.add("open");
}

/* یک ردیف تایم‌لاین فعالیت (مشترک بین داشبورد و پنجرهٔ «مشاهدهٔ همه») */
function activityItemHTML(d, isLast, asCard){
  var who=d.uploadedBy?(' · '+esc(userName(d.uploadedBy))):'';
  var si=statusInfo(d.status);
  if(asCard){
    // نسخهٔ کارت (مودالِ «همهٔ فعالیت‌ها») — هم‌شکلِ کارتابل بازبینی؛ فقط دایرهٔ متحرک، بدونِ خطِ عمودی
    return '<div class="rq-item">'+
      '<div class="rq-marker"><div class="tl-dot"></div><div class="rq-line"></div></div>'+
      '<div class="rq-main"><div class="rq-num mono" onclick="openDocDetail(\''+esc(d.drawingNumber)+'\')">'+esc(d.drawingNumber)+'</div>'+
        '<div class="rq-meta">'+esc(docPhrase(d))+who+'</div></div>'+
      '<div class="rq-aside"><span class="rq-date">'+fmtDate(d.timestamp)+'</span>'+
        '<span class="badge '+si.cls+'">'+si.label+'</span></div>'+
      '</div>';
  }
  return '<div class="tl-item">'+
    '<div class="tl-marker"><div class="tl-dot"></div><div class="tl-line"></div></div>'+
    '<div class="tl-body"><div class="tl-num" onclick="openDocDetail(\''+esc(d.drawingNumber)+'\')">'+esc(d.drawingNumber)+'</div>'+
    '<div class="tl-meta">'+esc(docPhrase(d))+who+'<span class="badge tl-badge '+si.cls+'">'+si.label+'</span></div></div>'+
    '<div class="tl-date">'+fmtDate(d.timestamp)+'</div>'+
    '</div>';
}
function sortedActivity(){
  return [].concat(DB.documents).sort(function(a,b){return (b.timestamp||"").localeCompare(a.timestamp||"");});
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
}

/* پنجرهٔ کاملِ فعالیت‌ها — همهٔ رویدادها بر اساس تاریخ، قابل اسکرول */
function openRecentAllModal(){
  var all=sortedActivity();
  var inner = all.length
    ? '<div class="rq-list">'+all.map(function(d){ return activityItemHTML(d, false, true); }).join("")+'</div>'
    : emptyState("فعالیتی ثبت نشده","با ثبت اولین سند، رویدادها اینجا نمایش داده می‌شوند.");
  showModal("همهٔ فعالیت‌ها", '<div class="seeall-body">'+inner+'</div>', "seeall-box");
  if(typeof revealCascade==="function") revealCascade(document.querySelector("#modalHost .rq-list"));   // ورودِ آبشاریِ کارت‌ها، هم‌سبک با سایت
}

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
