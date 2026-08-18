/* ============ مشتریان و پروژه‌ها (Client → Order → Projects) ============ */
var _cp = { client:"", order:"", orderFormOpen:false, editingOrder:"",
            projFormOpen:false, editingProject:"", logoData:undefined };
var _projView = { mode:"list", c:"", o:"", pr:"" };

function val(id){ var el=document.getElementById(id); return el?el.value:""; }
function renderProjectTab(){ renderClientPanel(); }

/* ============ درختِ ناوبریِ سایدبار: «مشتریان و پروژه‌ها» (اکسپندشونده) ============
   کلیکِ عنوان → رفتن به همان بخش؛ کلیکِ فلش → باز/بستنِ زیرمجموعه (بدونِ ناوبری).
   ریشه ← مشتری‌ها؛ هر مشتری: کلیکِ نام → پنلِ آن مشتری، کلیکِ فلش → پروژه‌هایش.
   پروژه‌ها به‌ترتیبِ سفارش‌ها (اولین تا آخرین) می‌آیند — projectsOf از پیش همین ترتیب را می‌دهد. */
var _nav = { open:false, clients:{}, built:false };
/* بازکردن/بستنِ نرمِ یک ظرفِ آکاردئونی (ترفندِ گرید 0fr↔1fr) + پخشِ آبشاریِ آیتم‌های تازه‌نمایان (nav-anim موقتی). */
function navAnimOpen(el, open){
  if(!el) return;
  el.classList.toggle("open", open);
  if(open){ el.classList.add("nav-anim"); setTimeout(function(){ el.classList.remove("nav-anim"); }, 480); }
}
function navToggleRoot(e){
  if(e&&e.stopPropagation)e.stopPropagation();
  _nav.open=!_nav.open;
  if(!_nav.built){ renderNavTree(); return; }           // اولین‌بار: بساز (درخت هنوز در DOM نیست)
  var exp=document.getElementById("navRootExp");
  if(exp){ exp.classList.toggle("open",_nav.open); exp.setAttribute("aria-expanded",_nav.open?"true":"false"); }
  if(document.body) document.body.classList.toggle("sb-wide",_nav.open); // پهن‌شدنِ سایدبار
  navAnimOpen(document.getElementById("navTreeChildren"), _nav.open);    // انیمیشنِ درجا، بدونِ بازسازی
}
function navToggleClient(e,code){
  if(e&&e.stopPropagation)e.stopPropagation();
  _nav.clients[code]=!_nav.clients[code];
  var open=_nav.clients[code];
  if(!_nav.built){ renderNavTree(); return; }
  var chev=document.getElementById("navchev-"+code);
  if(chev){ chev.classList.toggle("open",open); chev.setAttribute("aria-expanded",open?"true":"false"); }
  navAnimOpen(document.getElementById("navc-"+code), open);
}
function navGoClient(code){ _nav.open=true; switchTab("project"); selectClient(code); }
function navGoProject(c,o,pr){ _nav.open=true; _nav.clients[c]=true; openProject(c,o,pr); }
/* ناوبری به «پنلِ قطعه»: به جزئیاتِ پروژه می‌رود و به سکشنِ همان قطعه اسکرول + یک فلاشِ کوتاه می‌زند.
   برای اسنادِ سطحِ پروژه (قطعهٔ ۰۰) سکشنی نیست، پس فقط روی خودِ پروژه می‌ماند. */
function navGoPart(c,o,pr,pn){
  navGoProject(c,o,pr);
  var el=document.getElementById("pdpart-"+c+"-"+pad2(o)+"-"+pad2(pr)+"-"+pad2(pn));
  if(!el) return;
  try{ el.scrollIntoView({behavior:"smooth",block:"center"}); }catch(e){ el.scrollIntoView(); }
  el.classList.add("pd-flash"); setTimeout(function(){ el.classList.remove("pd-flash"); },1600);
}
function navClientLogo(c){
  if(c&&c.logo) return '<img class="nav-ci-logo" src="'+esc(c.logo)+'" alt="">';
  return '<span class="nav-ci-ph">'+esc((c&&c.code?String(c.code):"?").slice(0,2).toUpperCase())+'</span>';
}
/* درخت را همیشه به‌طورِ کامل می‌سازد (همهٔ مشتری‌ها و همهٔ پروژه‌ها در DOM می‌مانند، فقط با کلاسِ open
   جمع/باز می‌شوند تا انیمیشنِ گرید 0fr↔1fr کار کند). فقط این تابع innerHTML را عوض می‌کند؛
   باز/بسته‌کردنِ کاربر از راهِ navToggle* فقط کلاس را جابه‌جا می‌کند (بدونِ بازسازی، تا نرم بماند). */
function renderNavTree(){
  var host=document.getElementById("navTreeChildren"); if(!host) return;
  var exp=document.getElementById("navRootExp");
  if(exp){ exp.classList.toggle("open",_nav.open); exp.setAttribute("aria-expanded",_nav.open?"true":"false"); }
  if(document.body) document.body.classList.toggle("sb-wide",_nav.open); // پهن‌شدنِ سایدبار هنگامِ باز بودن
  host.classList.toggle("open",_nav.open);                               // ظرفِ ریشه (خودِ #navTreeChildren)
  // نارنجیِ مشتری/پروژه فقط وقتی که واقعاً روی تبِ پروژه هستیم (وگرنه در داشبورد نارنجی می‌ماند)
  var projActive=(typeof window!=="undefined" && window._activeTab==="project");
  var clients=clientsSorted(), inner;
  if(!clients.length){
    inner='<div class="nav-children"><div class="nav-empty">مشتری‌ای ثبت نشده.</div></div>';
  } else {
    inner='<div class="nav-children">'+clients.map(function(c){
      var cOpen=!!_nav.clients[c.code], projs=projectsOf(c.code);
      // موردِ جاری (روی پنلِ همین مشتری) در برابرِ «مسیر» (یکی از پروژه‌هایش باز است) — فقط یک نشانِ قوی
      var cIsCur=(projActive && _cp.client===c.code && _projView.mode!=="detail");
      var cIsPath=(projActive && _projView.mode==="detail" && _projView.c===c.code);
      var cCls=cIsCur?' cur':(cIsPath?' path':'');
      var chev = projs.length
        ? '<button class="nav-exp'+(cOpen?' open':'')+'" id="navchev-'+esc(c.code)+'" onclick="navToggleClient(event,\''+esc(c.code)+'\')" aria-label="پروژه‌های '+esc(c.name)+'" aria-expanded="'+(cOpen?'true':'false')+'"><svg class="chev" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg></button>'
        : '<span class="nav-exp-sp"></span>';
      var projItems = projs.length
        ? projs.map(function(p){
            var o=pad2(p.orderNo), pr=pad2(p.projectNo);
            var pCur=(projActive&&_projView.mode==="detail"&&_projView.c===c.code&&_projView.o===o&&_projView.pr===pr);
            return '<button class="nav-leaf nav-pleaf'+(pCur?' cur':'')+'" onclick="navGoProject(\''+esc(c.code)+'\',\''+esc(o)+'\',\''+esc(pr)+'\')"><span class="nav-dot"></span><span class="nav-lb">'+esc(p.description||("پروژهٔ "+pr))+'</span></button>';
          }).join("")
        : '<div class="nav-empty">پروژه‌ای نیست.</div>';
      // ظرفِ آکاردئونیِ پروژه‌ها (همیشه در DOM؛ open آن مستقل از ریشه است)
      var projCollapse='<div class="nav-collapse nav-projcollapse'+(cOpen?' open':'')+'" id="navc-'+esc(c.code)+'"><div class="nav-collapse-inner"><div class="nav-projwrap">'+projItems+'</div></div></div>';
      return '<div class="nav-cnode"><div class="nav-trow'+cCls+'">'+
        '<button class="nav-leaf nav-cleaf" onclick="navGoClient(\''+esc(c.code)+'\')">'+navClientLogo(c)+'<span class="nav-lb">'+esc(c.name)+'</span></button>'+
        chev+
      '</div>'+projCollapse+'</div>';
    }).join("")+'</div>';
  }
  host.innerHTML='<div class="nav-collapse-inner">'+inner+'</div>';
  _nav.built=true;
}

/* آیکون‌های خطی (svgIcon/ICON) در state.js تعریف شده‌اند تا در کل سایت یک‌دست باشند. */

/* لوگوی مشتری یا جایگزین حرفی */
function cpLogo(c,size){
  var s=size||40;
  if(c && c.logo) return '<img class="cp-logo" src="'+esc(c.logo)+'" alt="" style="width:'+s+'px;height:'+s+'px">';
  var initials=(c&&c.code?String(c.code):"?").slice(0,2).toUpperCase();
  return '<div class="cp-logo cp-logo-ph" style="width:'+s+'px;height:'+s+'px;font-size:'+Math.round(s*0.36)+'px">'+esc(initials)+'</div>';
}

/* فقط مدیر مجاز به مدیریتِ مشتری/سفارش/پروژه است (بیننده و بازبین: فقط مشاهده).
   بک‌اند هم این نوشتن‌ها را adminOnly می‌کند؛ این گارد برای بستنِ UI و پیامِ روشن است. */
function cpIsAdmin(){ return (typeof ME!=="undefined" && ME && ME.role==="admin"); }
function requireAdmin(){ if(!cpIsAdmin()){ toast("فقط مدیر مجاز به این کار است.",true); return false; } return true; }

/* ---- نمای اصلی: ریل مشتریان + تبِ مشتری انتخاب‌شده ---- */
function renderClientPanel(){
  var cpView=document.getElementById("cpView"); if(!cpView) return;
  document.getElementById("projectDetailView").classList.add("hidden");
  cpView.classList.remove("hidden");
  _projView.mode="list";

  var clients=clientsSorted();
  if(_cp.client && !clients.some(function(c){return c.code===_cp.client;})) _cp.client="";
  if(!_cp.client && clients.length) _cp.client=clients[0].code;

  // اعتبارسنجی/پیش‌فرض سفارش انتخاب‌شده
  var orders=_cp.client?ordersOf(_cp.client):[];
  if(_cp.order && !orders.some(function(o){return pad2(o.orderNo)===pad2(_cp.order);})) _cp.order="";
  if(!_cp.order && orders.length) _cp.order=pad2(orders[0].orderNo);

  cpView.innerHTML=''+
    '<div class="cp-grid rv-group">'+
      railHTML(clients)+
      '<div class="cp-detail rv-group" id="cpDetail">'+clientDetailHTML()+'</div>'+
    '</div>';
  renderNavTree();
}

function railHTML(clients){
  var admin=cpIsAdmin();
  var emptyMsg=admin?'مشتری‌ای ثبت نشده. با دکمهٔ + بالا اولین مشتری را بسازید.':'مشتری‌ای ثبت نشده.';
  return '<aside class="cp-rail">'+
    '<div class="cp-rail-hd"><span>'+SEC_IC_CLIENT+'مشتریان</span>'+
      (admin?'<button class="icon-btn" title="افزودن مشتری جدید" onclick="cpOpenClientModal(\'\')">'+ICON.plus+'</button>':'')+'</div>'+
    '<div class="cp-client-list" id="cpClientList"'+(admin?' ondragover="clientDragOver(event)" ondrop="event.preventDefault()"':'')+'>'+
      (clients.length?clients.map(clientItemHTML).join(""):'<p class="muted" style="padding:14px;font-size:12px">'+emptyMsg+'</p>')+
    '</div></aside>';
}

function clientItemHTML(c){
  var admin=cpIsAdmin();
  var en=clientNameEn(c.code);
  return '<div class="cp-client-item'+(c.code===_cp.client?" sel":"")+'" data-code="'+esc(c.code)+'"'+(admin?' draggable="true"':'')+' tabindex="0" role="button"'+
    (admin?' ondragstart="clientDragStart(event,\''+esc(c.code)+'\')" ondragend="clientDragEnd(event)"':'')+
    ' onclick="selectClient(\''+esc(c.code)+'\')">'+
    cpLogo(c,34)+
    '<div class="cp-ci-body"><span class="cp-ci-name">'+esc(c.name)+'</span>'+
      (en?'<span class="cp-ci-meta cmeta-en">'+esc(en)+'</span>':'')+'</div>'+
    (admin?'<span class="cp-grip" title="بکشید تا ترتیب عوض شود" aria-label="جابجاییِ ترتیب" onmousedown="cliGripDown()" onclick="event.stopPropagation()">'+
      '<svg viewBox="0 0 24 24"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg></span>':'')+
    '</div>';
}
/* ============ جابجاییِ ترتیبِ مشتری‌ها (drag & drop از روی دستهٔ ۶‌نقطه‌ای + انیمیشنِ FLIP) ============
   ترتیب در فیلدِ order هر مشتری ذخیره می‌شود؛ clientsSorted بر اساسِ همان مرتب می‌کند، پس
   هم در این ریل و هم در درختِ سایدبار یکسان دیده می‌شود. */
var _cliGripArmed=false, _cliDrag={code:null};
function cliGripDown(){ _cliGripArmed=true; }            // فقط کشیدن از روی دسته مجاز است
function clientDragStart(e,code){
  if(!_cliGripArmed){ if(e&&e.preventDefault)e.preventDefault(); return; }
  _cliGripArmed=false; _cliDrag.code=code;
  if(e.dataTransfer){ e.dataTransfer.effectAllowed="move"; try{ e.dataTransfer.setData("text/plain",code); }catch(_){} }
  var item=e.currentTarget;
  setTimeout(function(){ if(item&&item.classList) item.classList.add("cli-dragging"); },0);
}
function clientDragOver(e){
  if(e&&e.preventDefault)e.preventDefault();
  var list=document.getElementById("cpClientList"); if(!list) return;
  var dragging=list.querySelector(".cli-dragging"); if(!dragging) return;
  var after=cliAfterElement(list,e.clientY);
  if(after===dragging) return;
  if(after && dragging.nextElementSibling===after) return;
  if(after===null && dragging===list.lastElementChild) return;
  cliFlip(list,function(){ if(after===null) list.appendChild(dragging); else list.insertBefore(dragging,after); });
}
function cliAfterElement(list,y){
  var els=[].slice.call(list.querySelectorAll(".cp-client-item:not(.cli-dragging)"));
  var closest=null, closestOffset=-Infinity;
  els.forEach(function(el){ var b=el.getBoundingClientRect(); var off=y-(b.top+b.height/2);
    if(off<0 && off>closestOffset){ closestOffset=off; closest=el; } });
  return closest;
}
/* FLIP: موقعیتِ پیش از جابجایی را بگیر، DOM را عوض کن، سپس هر سلول را از موقعیتِ قبلی به جدید نرم بلغزان */
function cliFlip(list,mutate){
  var items=[].slice.call(list.querySelectorAll(".cp-client-item"));
  var firsts=items.map(function(el){ return el.getBoundingClientRect().top; });
  mutate();
  items.forEach(function(el,i){ var dy=firsts[i]-el.getBoundingClientRect().top;
    if(dy){ el.style.transition="none"; el.style.transform="translateY("+dy+"px)"; } });
  var play=function(){ items.forEach(function(el){ if(el.style.transform){
    el.style.transition="transform .2s cubic-bezier(.2,0,0,1)"; el.style.transform=""; } }); };
  if(typeof requestAnimationFrame==="function") requestAnimationFrame(play); else play();
}
function clientDragEnd(e){
  var item=e.currentTarget; if(item&&item.classList) item.classList.remove("cli-dragging");
  commitClientOrder();
}
/* ترتیبِ جدید را از DOM بخوان، در DB.clients بنویس، سایدبار را تازه کن و برای هر مشتریِ تغییرکرده ذخیره کن */
function commitClientOrder(){
  var list=document.getElementById("cpClientList"); if(!list) return;
  var codes=[].slice.call(list.querySelectorAll(".cp-client-item")).map(function(el){ return el.getAttribute("data-code"); });
  var changed=[];
  codes.forEach(function(code,i){ var c=DB.clients.find(function(x){ return x.code===code; });
    if(c && Number(c.order)!==i){ c.order=i; changed.push(c); } });
  if(!changed.length) return;
  renderNavTree();
  changed.forEach(function(c){ api("saveClient",{code:c.code,name:c.name,order:c.order}); });
}
if(typeof document!=="undefined" && document.addEventListener) document.addEventListener("mouseup",function(){ _cliGripArmed=false; });

function clientDetailHTML(){
  if(!_cp.client) return '<div class="empty-state" style="height:100%"><svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg><div class="es-title">یک مشتری را انتخاب کنید</div><div class="es-desc">از فهرست کنار، مشتری را انتخاب کنید تا سفارش‌ها و پروژه‌هایش نمایش داده شود؛ یا با دکمهٔ + مشتری جدید بسازید.</div></div>';
  var c=DB.clients.find(function(x){return x.code===_cp.client;}); if(!c) return '';
  var orders=ordersOf(c.code), projects=projectsOf(c.code);
  return identityHTML(c,orders,projects)+ordersSectionHTML(c,orders)+projectsSectionHTML(c,orders);
}

/* هویت مشتری (تبِ اختصاصی) */
function identityHTML(c,orders,projects){
  return '<div class="cp-identity">'+cpLogo(c,60)+
    '<div class="cp-id-body"><h2 class="cp-id-name">'+esc(c.name)+'</h2>'+
      '<div class="cp-id-meta">'+clientMetaHTML(c.code, orders.length, projects.length)+'</div></div>'+
    (cpIsAdmin()?'<div class="cp-id-acts">'+
      '<button class="btn sm" onclick="cpOpenClientModal(\''+esc(c.code)+'\')">'+ICON.edit+'ویرایش</button>'+
      '<button class="btn sm danger" onclick="del(\'deleteClient\',{code:\''+esc(c.code)+'\'})">'+ICON.trash+'حذف</button>'+
    '</div>':'')+'</div>';
}

/* نوار سفارش‌ها (فشرده، انتخابی) */
function ordersSectionHTML(c,orders){
  var admin=cpIsAdmin();
  var cards=orders.map(function(o){
    var np=projectsOf(c.code,pad2(o.orderNo)).length;
    var sel=pad2(o.orderNo)===pad2(_cp.order);
    return '<div class="cp-order-card'+(sel?" sel":"")+'" tabindex="0" role="button" onclick="selectOrder(\''+esc(pad2(o.orderNo))+'\')">'+
      '<div class="coc-top"><span class="coc-title">سفارش '+esc(pad2(o.orderNo))+'</span>'+
        (admin?'<span class="coc-acts">'+
          '<button class="icon-btn sm" title="ویرایش سفارش" onclick="event.stopPropagation();cpToggleOrderForm(\''+esc(pad2(o.orderNo))+'\')">'+ICON.edit+'</button>'+
          '<button class="icon-btn sm danger" title="حذف سفارش" onclick="event.stopPropagation();del(\'deleteOrder\',{clientCode:\''+esc(c.code)+'\',orderNo:\''+esc(pad2(o.orderNo))+'\'})">'+ICON.trash+'</button>'+
        '</span>':'')+'</div>'+
      '<div class="coc-desc">'+esc(o.title||"بدون عنوان")+'</div>'+
      '<div class="coc-meta"><bdi>'+faN(np)+' پروژه</bdi>'+(o.date?' · <bdi>'+fmtDate(o.date)+'</bdi>':'')+'</div>'+
    '</div>';
  }).join("");
  var addCard=admin?'<button class="cp-order-add" onclick="cpToggleOrderForm(\'\')">'+ICON.plus+'<span>سفارش جدید</span></button>':'';
  return '<div class="cp-section"><h3 class="spec-sec-t">'+SEC_IC_ORDERS+'سفارش‌ها</h3>'+
    '<div class="cp-order-strip">'+cards+addCard+'</div></div>';
}

/* پروژه‌های سفارشِ انتخاب‌شده (ردیف‌های تک‌خطی) */
function projectsSectionHTML(c,orders){
  var admin=cpIsAdmin();
  if(!orders.length) return '<div class="cp-section"><div class="cp-empty-hint">'+(admin?'برای افزودن پروژه، ابتدا یک سفارش بسازید.':'سفارشی ثبت نشده.')+'</div></div>';
  if(!_cp.order) return '';
  var projects=projectsOf(c.code,_cp.order);
  var rows=projects.length
    ? projects.map(function(p){ return projectRowHTML(c,p); }).join("")
    : '<div class="cp-empty-hint">'+(admin?'برای این سفارش پروژه‌ای ثبت نشده. با دکمهٔ «افزودن پروژه» شروع کنید.':'برای این سفارش پروژه‌ای ثبت نشده.')+'</div>';
  return '<div class="cp-section" id="cpProjSection"><h3 class="spec-sec-t">'+SEC_IC_PROJ+'پروژه‌های سفارش '+esc(_cp.order)+
      (admin?'<span class="sec-act"><button class="icon-btn" title="افزودن پروژه" onclick="cpToggleProjForm(\'\')">'+ICON.plus+'</button></span>':'')+'</h3>'+
    '<div class="cp-proj-rows rv-group">'+rows+'</div></div>';
}

function projectRowHTML(c,p){
  var s=projectStats(p);
  var o=pad2(p.orderNo), pr=pad2(p.projectNo);
  var code=esc(c.code+"-"+o+"-"+pr);
  return '<div class="cp-proj-row" tabindex="0" role="button" onclick="showProjectDetail(\''+esc(c.code)+'\',\''+esc(o)+'\',\''+esc(pr)+'\')">'+
    '<span class="cpr-name">'+esc(s.name)+'</span>'+
    '<span class="cpr-code mono">'+code+'</span>'+
    /* درصد اول می‌آید تا در چیدمان راست‌به‌چپ سمت راستِ نوار بنشیند */
    '<div class="cpr-prog"><span class="cpr-pct">'+s.pct+'٪</span>'+
      '<div class="proj-bar-bg"><div class="proj-bar-fill" style="width:'+s.pct+'%;background:'+s.status.bar+'"></div></div></div>'+
    '<span class="cpr-count" title="اسنادِ ثبت‌شده از کل">'+s.reg+'/'+s.total+'</span>'+
    (cpIsAdmin()?'<div class="cpr-acts" onclick="event.stopPropagation()">'+
      editIconBtn("cpToggleProjForm('"+esc(o)+"/"+esc(pr)+"')","ویرایش پروژه")+
      delIconBtn("del('deleteProject',{clientCode:'"+esc(c.code)+"',orderNo:'"+esc(o)+"',projectNo:'"+esc(pr)+"'})","حذف پروژه")+
    '</div>':'')+'</div>';
}

/* ---- تعامل‌ها ---- */
function selectClient(code){ _cp.client=code; _cp.order=""; _cp.orderFormOpen=false; _cp.editingOrder=""; _cp.projFormOpen=false; _cp.editingProject=""; renderClientPanel();
  // سوئیچِ مشتری: فقط سمتِ راست (هویت ← سفارش‌ها ← پروژه‌ها) پلکانی وارد می‌شود؛ ریلِ مشتریان ثابت می‌ماند
  if(typeof revealCascade==="function") revealCascade(document.getElementById("cpDetail")); }
function selectOrder(o){ _cp.order=pad2(o); _cp.orderFormOpen=false; _cp.editingOrder=""; _cp.projFormOpen=false; _cp.editingProject=""; renderClientPanel();
  // سوئیچِ سفارش: فقط بخشِ «پروژه‌های سفارش» (عنوان ← ردیف‌های پروژه) پلکانی وارد می‌شود
  if(typeof revealCascade==="function") revealCascade(document.getElementById("cpProjSection")); }

/* افزودن/ویرایش سفارش — مودال کوچکِ روی‌هم (روی پنل ثبت‌سند هم می‌نشیند) */
function cpToggleOrderForm(o){ cpOpenOrderModal(o); }
function cpOpenOrderModal(o){
  if(!requireAdmin()) return;
  if(!_cp.client){ toast("ابتدا مشتری را انتخاب کنید.",true); return; }
  var editing=!!o;
  _cp.editingOrder=editing?pad2(o):"";
  var rec=editing?ordersOf(_cp.client).find(function(x){return pad2(x.orderNo)===pad2(o);}):null;
  var body='<div class="clm">'+
    '<div class="clm-row"><label class="fld">'+(editing?"ویرایش عنوان سفارش "+esc(pad2(o)):"عنوان سفارش جدید")+'</label>'+
      '<input id="cpOTitle" placeholder="مثلاً دو مجموعه شافت و غلطک" value="'+esc(rec?rec.title||"":"")+'"></div>'+
    '<div class="clm-actions"><button class="btn" onclick="closeModal()">انصراف</button>'+
      '<button class="btn primary" onclick="cpSaveOrder()">'+(editing?"به‌روزرسانی":"افزودن سفارش")+'</button></div>'+
  '</div>';
  showModal((editing?"ویرایش سفارش":"سفارش جدید — "+esc(clientName(_cp.client))), body, "box-narrow");
  var t=document.getElementById("cpOTitle"); if(t) try{ t.focus(); }catch(e){}
}

/* افزودن/ویرایش پروژه — مودال کوچکِ روی‌هم */
function cpToggleProjForm(op){ cpOpenProjectModal(op); }
function cpOpenProjectModal(op){
  if(!requireAdmin()) return;
  if(!_cp.client){ toast("ابتدا مشتری را انتخاب کنید.",true); return; }
  var editing=!!op;
  _cp.editingProject=editing?op:"";
  var parts=editing?op.split("/"):[_cp.order,""];
  var orderNo=pad2(parts[0]);
  if(!orderNo){ toast("ابتدا یک سفارش انتخاب/ایجاد کنید.",true); return; }
  var rec=editing?projectsOf(_cp.client).find(function(p){return pad2(p.orderNo)===pad2(parts[0])&&pad2(p.projectNo)===pad2(parts[1]);}):null;
  var label=editing?("ویرایش پروژهٔ "+esc(pad2(parts[1]))+" — سفارش "+esc(orderNo)):("نام پروژهٔ جدید — سفارش "+esc(orderNo));
  var body='<div class="clm">'+
    '<div class="clm-row"><label class="fld">'+label+'</label>'+
      '<input id="cpPrDesc" placeholder="مثلاً مجموعه شفت و غلطک کوره سیمان" value="'+esc(rec?rec.description||"":"")+'"></div>'+
    '<div class="clm-actions"><button class="btn" onclick="closeModal()">انصراف</button>'+
      '<button class="btn primary" onclick="cpSaveProject()">'+(editing?"به‌روزرسانی":"افزودن پروژه")+'</button></div>'+
  '</div>';
  showModal((editing?"ویرایش پروژه":"پروژهٔ جدید"), body, "box-narrow");
  var t=document.getElementById("cpPrDesc"); if(t) try{ t.focus(); }catch(e){}
}

async function cpSaveOrder(){
  if(!_cp.client){ toast("ابتدا مشتری را انتخاب کنید.",true); return; }
  var title=val("cpOTitle").trim();
  /* در حالت ویرایش، سفارشِ موجود را برمی‌داریم تا «تاریخ ایجاد» و «ثبت‌کنندهٔ» اولیه حفظ شود
     (ارسال date به بک‌اند باعث می‌شود حتی نسخهٔ منتشرنشدهٔ قبلی هم تاریخ را بازننویسد). */
  var prev=_cp.editingOrder ? DB.orders.find(function(x){
    return x.clientCode===_cp.client && pad2(x.orderNo)===pad2(_cp.editingOrder); }) : null;
  var payload={clientCode:_cp.client, title:title};
  if(_cp.editingOrder) payload.orderNo=_cp.editingOrder;
  if(prev && prev.date) payload.date=prev.date;
  var r=await api("saveOrder",payload);
  if(!r.ok){ toast(r.message||"ذخیره ناموفق",true); return; }
  var on=r.orderNo;
  localUpsert(DB.orders,function(x){return x.clientCode===_cp.client&&pad2(x.orderNo)===pad2(on);},
    {clientCode:_cp.client,orderNo:on,title:title,
     date:(prev&&prev.date)||todayISO(), createdBy:(prev&&prev.createdBy)||ME.username});
  _cp.editingOrder=""; _cp.order=pad2(on);
  closeModal(); localRefresh(); toast("سفارش "+on+" ذخیره شد");
  if(newDocOpen()) syncNewDocAfterOrder(on); // اگر از پنل ثبت‌سند آمده‌ایم، خودکار انتخاب کن
}

async function cpSaveProject(){
  if(!_cp.client){ toast("ابتدا مشتری را انتخاب کنید.",true); return; }
  var editing=!!_cp.editingProject;
  var parts=editing?_cp.editingProject.split("/"):[_cp.order,""];
  var orderNo=pad2(parts[0]);
  if(!orderNo){ toast("سفارش نامشخص است.",true); return; }
  var desc=val("cpPrDesc").trim();
  var payload={clientCode:_cp.client, orderNo:orderNo, description:desc};
  if(editing) payload.projectNo=parts[1];
  var r=await api("saveProject",payload);
  if(!r.ok){ toast(r.message||"ذخیره ناموفق",true); return; }
  var pn=r.projectNo;
  var prev=DB.projects.find(function(x){return x.clientCode===_cp.client&&pad2(x.orderNo)===pad2(orderNo)&&pad2(x.projectNo)===pad2(pn);});
  localUpsert(DB.projects,function(x){return x.clientCode===_cp.client&&pad2(x.orderNo)===pad2(orderNo)&&pad2(x.projectNo)===pad2(pn);},
    {clientCode:_cp.client,orderNo:orderNo,projectNo:pn,description:desc,createdBy:ME.username,
     enabledTypes:(prev?prev.enabledTypes||"":""),projectParts:(prev?prev.projectParts||"":""),enabledSlots:(prev?prev.enabledSlots||"":"")});
  _cp.editingProject=""; _cp.order=orderNo;
  closeModal(); localRefresh(); toast("پروژه "+pn+" ذخیره شد");
  if(newDocOpen()) syncNewDocAfterProject(orderNo,pn); // اگر از پنل ثبت‌سند آمده‌ایم، خودکار انتخاب کن
}

/* همگام‌سازیِ ویزاردِ ثبت سند پس از افزودنِ مشتری/سفارش/پروژه: توابعِ
   syncNewDocAfterClient/Order/Project اکنون در documents.js (ویزاردِ ریلِ شماره) تعریف شده‌اند. */

/* ---- مودال افزودن/ویرایش مشتری (با لوگو) ---- */
function cpOpenClientModal(code){
  if(!requireAdmin()) return;
  var editing=!!code;
  var rec=editing?DB.clients.find(function(x){return x.code===code;}):null;
  _cp.logoData=undefined; // دست‌نخورده
  _cp.logoEditSrc=(rec&&rec.logo)||""; // لوگوی فعلی هنگام ویرایش
  var hasLogo=!!_cp.logoEditSrc;
  var body='<div class="clm">'+
    '<div class="clm-grid2">'+
      '<div class="clm-row"><label class="fld">کد مشتری</label>'+
        '<input id="clmCode" placeholder="MNK" maxlength="6" '+
          'oninput="this.value=this.value.replace(/[^A-Za-z0-9]/g,\'\').toUpperCase()" '+
          'style="direction:ltr;text-align:left;text-transform:uppercase" value="'+esc(rec?rec.code:"")+'"'+(editing?" disabled":"")+'></div>'+
      '<div class="clm-row"><label class="fld">نام مشتری</label>'+
        '<input id="clmName" placeholder="نام کامل شرکت" style="direction:rtl;text-align:right" value="'+esc(rec?rec.name:"")+'"></div>'+
    '</div>'+
    '<div class="clm-row"><label class="fld">نام لاتین مشتری</label>'+
      '<input id="clmNameEn" placeholder="Full company name (English)" dir="ltr" style="direction:ltr;text-align:left" '+
        'oninput="this.value=this.value.replace(/[^A-Za-z0-9 .,&()-]/g,\'\')" value="'+esc(rec?(rec.nameEn||""):"")+'">'+
      '<div class="hint">فقط حروف و اعدادِ انگلیسی؛ در قالبِ «مشخصات پروژه» به‌عنوانِ «نام مشتری» نمایش داده می‌شود.</div></div>'+
    '<div class="clm-row"><label class="fld">لوگوی مشتری (اختیاری)</label>'+
      '<div class="logo-up">'+
        '<label class="logo-up-box'+(hasLogo?" has":"")+'" id="clmLogoBox">'+clmBoxInner(_cp.logoEditSrc)+'</label>'+
        '<div class="logo-up-side">'+
          '<button class="icon-btn sm danger" id="clmLogoDel" title="حذف لوگو" onclick="cpClearLogo()"'+(hasLogo?'':' style="display:none"')+'>'+ICON.trash+'</button>'+
          '<div class="hint">برای انتخاب، روی کادر کلیک کنید.<br>حداکثر ۱۲۸ پیکسل، خودکار فشرده می‌شود.</div>'+
        '</div>'+
      '</div></div>'+
    '<div class="clm-actions"><button class="btn" onclick="closeModal()">انصراف</button>'+
      '<button class="btn primary" onclick="cpSaveClientModal(\''+esc(code)+'\')">'+(editing?"به‌روزرسانی":"افزودن")+'</button></div>'+
  '</div>';
  showModal((editing?"ویرایش مشتری":"مشتری جدید"), body, "box-narrow");
}
/* محتوای داخل کادر لوگو: ورودی فایل + (تصویر یا حالت خالیِ «انتخاب تصویر») */
function clmBoxInner(src){
  return '<input type="file" accept="image/*" style="display:none" onchange="cpPickLogo(this)">'+
    (src ? '<img src="'+esc(src)+'" alt="لوگو"><span class="logo-up-hint">تغییر تصویر</span>'
         : '<span class="logo-up-empty">'+ICON.upload+'<span>انتخاب تصویر</span></span>');
}
function renderClmLogo(){
  var box=document.getElementById("clmLogoBox"); if(!box) return;
  var src=(_cp.logoData!==undefined)?_cp.logoData:_cp.logoEditSrc;
  box.className="logo-up-box"+(src?" has":"");
  box.innerHTML=clmBoxInner(src);
  var del=document.getElementById("clmLogoDel"); if(del) del.style.display=src?"":"none";
}
function cpPickLogo(input){
  var f=input.files&&input.files[0]; if(!f) return;
  resizeImageToDataURL(f,128,function(url){
    if(!url){ toast("خواندن تصویر ناموفق بود.",true); return; }
    if(url.length>45000){ toast("تصویر بزرگ است؛ تصویر ساده‌تر یا کوچک‌تری انتخاب کنید.",true); return; }
    _cp.logoData=url; renderClmLogo();
  });
}
function cpClearLogo(){ _cp.logoData=""; renderClmLogo(); }
async function cpSaveClientModal(code){
  var editing=!!code;
  var codeVal=(editing?code:val("clmCode")).trim().toUpperCase();
  var name=val("clmName").trim();
  var nameEn=val("clmNameEn").trim();
  if(!codeVal||!name){ toast("کد و نام مشتری لازم است.",true); return; }
  var payload={code:codeVal,name:name,nameEn:nameEn};
  if(_cp.logoData!==undefined) payload.logo=_cp.logoData; // "" پاک می‌کند، dataURL تنظیم می‌کند
  var r=await api("saveClient",payload);
  if(!r.ok){ toast(r.message||"ذخیره ناموفق",true); return; }
  var existing=DB.clients.find(function(x){return x.code===codeVal;});
  var logo=(_cp.logoData!==undefined)?_cp.logoData:(existing?existing.logo:"");
  localUpsert(DB.clients,function(x){return x.code===codeVal;},{code:codeVal,name:name,nameEn:nameEn,active:true,logo:logo});
  _cp.client=codeVal; _cp.logoData=undefined;
  closeModal(); localRefresh(); toast("مشتری ذخیره شد");
  if(!editing && typeof newDocOpen==="function" && newDocOpen()) syncNewDocAfterClient(codeVal); // از پنل ثبت‌سند
}

/* کوچک‌سازی تصویر در مرورگر → dataURL فشرده (بدون منبع بیرونی) */
function resizeImageToDataURL(file,max,cb){
  var fr=new FileReader();
  fr.onload=function(){
    var img=new Image();
    img.onload=function(){
      var w=img.width||1, h=img.height||1, scale=Math.min(1, max/Math.max(w,h));
      var cw=Math.max(1,Math.round(w*scale)), ch=Math.max(1,Math.round(h*scale));
      var cv=document.createElement("canvas"); cv.width=cw; cv.height=ch;
      cv.getContext("2d").drawImage(img,0,0,cw,ch);
      var isPng=/png/i.test(file.type);
      try{ cb(cv.toDataURL(isPng?"image/png":"image/jpeg", isPng?undefined:0.85)); }
      catch(e){ cb(null); }
    };
    img.onerror=function(){ cb(null); };
    img.src=fr.result;
  };
  fr.onerror=function(){ cb(null); };
  fr.readAsDataURL(file);
}

/* ============ جزئیات یک پروژه (چک‌لیست + جدول اسناد) ============ */
function findProject(c,o,pr){
  return DB.projects.find(function(p){ return p.clientCode===c && pad2(p.orderNo)===pad2(o) && pad2(p.projectNo)===pad2(pr); })||null;
}
function backToClients(){
  document.getElementById("projectDetailView").classList.add("hidden");
  document.getElementById("cpView").classList.remove("hidden");
  _projView.mode="list"; renderClientPanel();
  if(typeof revealCascade==="function") revealCascade(document.getElementById("cpView"));   // بازگشت هم آبشاری وارد شود
}
/* ================= نوارِ شاخص — عیناً پروتوتایپ ================= */
/* دوناتِ دولایه: کمانِ کم‌رنگ = ثبت‌شده (زیر)، کمانِ پررنگ = تأییدشده (رو). عدد = تأییدشده٪ */
function donutHTML(solidPct, regPct){
  var R=24, C=2*Math.PI*R;
  var col = solidPct===100 ? "var(--ok)" : "var(--brand)";
  var arc=function(pp,extra){ return '<circle class="d-fg" cx="29" cy="29" r="'+R+'" '+extra+
    ' stroke-dasharray="'+C.toFixed(1)+'" stroke-dashoffset="'+(C*(1-pp/100)).toFixed(1)+'"/>'; };
  return '<div class="dwrap"><svg viewBox="0 0 58 58">'+
    '<circle class="d-bg" cx="29" cy="29" r="'+R+'"/>'+
    arc(regPct,'stroke="var(--brand)" stroke-opacity=".3"')+
    arc(solidPct,'stroke="'+col+'"')+
    '</svg><span class="dtxt">'+solidPct+'٪</span></div>';
}
function cellDonut(label,appr,reg,total){
  var sp=total?Math.round(appr/total*100):0, rp=total?Math.round(reg/total*100):0;
  return '<div class="mcell"><div class="mdonut">'+donutHTML(sp,rp)+
      '<div class="mtext"><div class="mlabel">'+esc(label)+'</div>'+
        '<div class="mleg"><i></i>تأییدشده</div><div class="mleg faint"><i></i>ثبت‌شده</div></div>'+
    '</div></div>';
}
/* نوارِ شاخصِ پروژه — از دادهٔ واقعی؛ ساختار عیناً پروتوتایپ:
   سرتیتر (مستندات پروژه) + سه دونات (قطعات · نقشه‌ها · مدارک عمومی) */
function mbandHTML(p,s){
  var pdocs=projectDocs(p);
  var isApp=function(d){ var st=String(d.status||"").toLowerCase(); return st==="approved"||st==="active"; };
  var hasDoc=function(m){ return pdocs.some(function(d){ return pad2(d.partNo)===m.part && String(d.typeCode).toUpperCase()===m.type; }); };
  var hasApp=function(m){ return pdocs.some(function(d){ return pad2(d.partNo)===m.part && String(d.typeCode).toUpperCase()===m.type && isApp(d); }); };
  var projMods=s.modules.filter(function(m){ return m.part==="00"; });
  var partMods=s.modules.filter(function(m){ return m.part!=="00"; });
  var pTot=projMods.length, pReg=projMods.filter(hasDoc).length, pApp=projMods.filter(hasApp).length;
  var dTot=partMods.length, dReg=partMods.filter(hasDoc).length, dApp=partMods.filter(hasApp).length;
  var parts=projectPartsList(p);
  var modsOf=function(pn){ return partMods.filter(function(m){ return m.part===pn; }); };
  var partsReg=parts.filter(function(pn){ var mm=modsOf(pn); return mm.length && mm.every(hasDoc); }).length;
  var partsApp=parts.filter(function(pn){ var mm=modsOf(pn); return mm.length && mm.every(hasApp); }).length;
  var total=pTot+dTot, reg=pReg+dReg, apr=pApp+dApp;
  var regPct=total?Math.round(reg/total*100):0, aprPct=total?Math.round(apr/total*100):0;
  var hero='<div class="mcell"><div class="mdonut">'+
      '<div class="mhero-vis"><span class="mhero-pct">'+aprPct+'٪</span>'+
        '<div class="bar"><i class="faint" style="width:'+regPct+'%;background:var(--brand)"></i>'+
          '<i style="width:'+aprPct+'%;background:'+(aprPct===100?"var(--ok)":"var(--brand)")+'"></i></div>'+
      '</div>'+
      '<div class="mtext"><div class="mlabel">مستندات پروژه</div>'+
        '<div class="mleg"><i></i>تأییدشده</div><div class="mleg faint"><i></i>ثبت‌شده</div></div>'+
    '</div></div>';
  return hero+
    cellDonut("قطعات پروژه", partsApp, partsReg, parts.length)+
    cellDonut("نقشه‌های پروژه", dApp, dReg, dTot)+
    cellDonut("مدارک عمومی پروژه", pApp, pReg, pTot);
}
/* آیکن‌های سربرگِ کارت‌ها (خطی، هم‌زبانِ نظام طراحی) */
var SEC_IC_DOC='<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="14" y2="17"/></svg>';
var SEC_IC_PART='<svg viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>';
var SEC_IC_SPEC='<svg viewBox="0 0 24 24"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="14" y2="18"/></svg>';
var SEC_IC_INFO='<svg viewBox="0 0 24 24"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>';
/* آیکونِ سفارش عمداً «سبدِ خرید» شد تا با آیکونِ سندِ (SEC_IC_DOC) یکسان به‌نظر نرسد */
var SEC_IC_ORDERS='<svg viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>';
var SEC_IC_PROJ='<svg viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>';
/* آیکونِ مشتری (ساختمان) — تک‌منبع؛ در ریلِ مشتریان و در ویزاردِ ثبت سند استفاده می‌شود */
var SEC_IC_CLIENT='<svg viewBox="0 0 24 24"><path d="M3 21h18"/><path d="M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16"/><path d="M15 21v-7h4v7"/><line x1="8" y1="7" x2="10" y2="7"/><line x1="8" y1="11" x2="10" y2="11"/><line x1="8" y1="15" x2="10" y2="15"/></svg>';

function showProjectDetail(c,o,pr){
  c=String(c); o=pad2(o); pr=pad2(pr);
  _projView={mode:"detail",c:c,o:o,pr:pr}; _cp.client=c; _cp.order=o;
  renderNavTree();
  var p=findProject(c,o,pr);
  var host=document.getElementById("projectDetailView");
  document.getElementById("cpView").classList.add("hidden");
  host.classList.remove("hidden");
  if(!p){ host.innerHTML='<p class="muted">پروژه یافت نشد.</p>'; return; }
  var s=projectStats(p);
  var admin=ME.role==="admin";
  var stCls=s.status.cls==="badge-approved"?"s-done":(s.status.cls==="badge-pending"?"s-run":"s-idle");
  var specEdit=admin?'<span class="sec-act"><button class="icon-btn" title="ویرایش مشخصات پروژه" onclick="openProjectSpecs(\''+esc(c)+'\',\''+esc(o)+'\',\''+esc(pr)+'\')">'+ICON.edit+'</button></span>':'';
  var partsEdit=admin?'<span class="sec-act"><button class="icon-btn" title="افزودنِ قطعه به پروژه" onclick="openPartsPanel(\''+esc(c)+'\',\''+esc(o)+'\',\''+esc(pr)+'\')">'+ICON.plus+'</button></span>':'';

  host.innerHTML=''+
    '<section class="ppanel">'+
      '<header class="pp-head">'+
        '<div class="pp-head-main">'+
          '<h1>پروژه تولید '+esc(s.name)+'</h1>'+
          '<span class="mstate '+stCls+'">'+badgeIcon(s.status.cls)+esc(s.status.label)+'</span>'+
        '</div>'+
        '<div class="pp-head-actions">'+
          '<button class="btn sm" onclick="backToClients()"><svg viewBox="0 0 24 24" class="ic"><line x1="2.5" y1="12" x2="21.5" y2="12"/><polyline points="14 4.5 21.5 12 14 19.5"/></svg>بازگشت</button>'+
        '</div>'+
      '</header>'+
      '<div class="mband">'+mbandHTML(p,s)+'</div>'+
      '<div class="pp-content rv-group">'+
        /* کارتِ مشخصات: ستونِ راست = هویت+مشخصات+اسنادِ عمومی · ستونِ چپ = ویوئرِ سه‌بعدی */
        '<section class="spec-card spec-main">'+
          '<div class="spec3d">'+
            '<div class="spec-col">'+
              '<h3 class="spec-sec-t">'+SEC_IC_DOC+'مشخصات پروژه'+specEdit+'</h3>'+
              /* قالبِ ثابتِ مشخصات (۶ فیلد) + اسنادِ سطح‌پروژه، همه پشتِ سرِ هم */
              '<div class="spec-general">'+
                projectSpecTemplateRows(c,o,pr,s,p)+
                projectGeneralDocsHTML(p)+
              '</div>'+
            '</div>'+
            '<div class="model-col">'+projectModelHTML(p,admin,c,o,pr)+'</div>'+
          '</div>'+
        '</section>'+
        /* کارتِ قطعات: گریدِ دو‌ستونه، هر قطعه یک جعبه با اسنادِ خودش */
        '<section class="spec-card">'+
          '<h3 class="spec-sec-t">'+SEC_IC_PART+'قطعات پروژه'+partsEdit+'</h3>'+
          projectPartsDocsHTML(p)+
        '</section>'+
      '</div>'+
    '</section>';
  // ورودِ آبشاریِ بالا‌به‌پایین: هدر ← نوارِ شاخص ← کارتِ مشخصات ← کارتِ قطعات
  if(typeof revealCascade==="function") revealCascade(host.querySelector(".ppanel"));
  /* اولین مدلِ فهرست (مونتاژ اگر باشد، وگرنه قطعهٔ اول) خودکار بار می‌شود تا پنل
     با ویوئرِ خالی باز نشود. پس از رندرِ DOM اجرا می‌شود چون mvLoadPart به #mvShell نیاز دارد. */
  var first=(_mvParts||[]).filter(function(x){ return x.fileId; })[0];
  if(first) setTimeout(function(){
    if(document.getElementById("mvShell")) mvLoadPart(first.fileId, first.part);
  },0);
}

/* کارت «اسناد عمومی پروژه»: ماژول‌های سطح‌پروژه (scope=project روی قطعهٔ 00).
   طراحی فشرده: فقط ماژول‌های فعال ردیف می‌گیرند؛ خاموش‌ها چیپِ «افزودن» می‌شوند. */
function projectGeneralDocsHTML(p){
  var c=p.clientCode, o=pad2(p.orderNo), pr=pad2(p.projectNo);
  var admin=ME.role==="admin";
  var latest=projectDocs(p).filter(function(d){ return String(d.isLatest).toLowerCase()==="true"; });
  var enabled={}; projDocTypesOf(p).forEach(function(T){ enabled[T]=1; });
  latest.forEach(function(d){ if(pad2(d.partNo)==="00") enabled[String(d.typeCode).toUpperCase()]=1; });
  // ترتیبِ دلخواهِ همین پروژه (orderedProjectTypesFor)؛ فقط انواعِ فعال + هر نوعی که سند دارد
  return orderedProjectTypesFor(p).filter(function(t){ return enabled[String(t.code).toUpperCase()]; }).map(function(t){
    var T=String(t.code).toUpperCase();
    var doc=latest.filter(function(d){ return pad2(d.partNo)==="00" && String(d.typeCode).toUpperCase()===T; })
      .sort(function(a,b){ return (parseInt(b.rev)||0)-(parseInt(a.rev)||0); })[0]||null;
    return docRowClean(c,o,pr,"00",t,doc,admin);
  }).join("");
}

/* کارت «قطعات پروژه»: گریدِ دو‌ستونه — هر قطعه یک جعبه با «اطلاعاتِ قطعه» (ماژول‌ها) + اسنادِ آن. */
function projectPartsDocsHTML(p){
  var admin=ME.role==="admin";
  var latest=projectDocs(p).filter(function(d){ return String(d.isLatest).toLowerCase()==="true"; });
  var partTypes=docTypesSorted().filter(function(t){ return t.scope==="part"; });
  var parts=projectPartsList(p);
  if(!parts.length) return '<div class="cp-empty-hint">هنوز قطعه‌ای به این پروژه اضافه نشده. با دکمهٔ + کنارِ عنوان، قطعه اضافه کنید.</div>';
  var pc=p.clientCode, po=pad2(p.orderNo), ppr=pad2(p.projectNo);
  var groups=parts.map(function(pn){
    var rec=partRec(pn);
    return '<div class="spec-group" id="pdpart-'+esc(pc)+'-'+esc(po)+'-'+esc(ppr)+'-'+esc(pad2(pn))+'">'+
      '<div class="spec-hd">'+
        '<span class="spec-dot" aria-hidden="true"></span>'+
        '<span class="spec-name">'+esc(partNameFa(pn))+'</span>'+
        (admin?'<button class="icon-btn sm spec-edit" title="ویرایشِ اسناد و پارامترهای این قطعه" onclick="openPartEditPanel(\''+esc(pc)+'\',\''+esc(po)+'\',\''+esc(ppr)+'\',\''+esc(pad2(pn))+'\')">'+ICON.edit+'</button>':'')+
      '</div>'+
      '<div class="spec-body">'+
        partSpecRowsHTML(p,pn,admin)+
        partDocRowsHTML(p,pn,partTypes,latest,admin)+
      '</div></div>';
  }).join("");
  /* گریدِ دو‌ستونه است، پس تعدادِ فردِ قطعه یک جای خالیِ سفید می‌گذارد. آن جای خالی با
     یک باکسِ هم‌اندازهٔ «افزودنِ قطعه» پر می‌شود (هم‌سبکِ باکسِ «سفارش جدید»): هم چیدمان
     متقارن می‌ماند، هم افزودنِ قطعهٔ بعدی یک کلیک است. برای ۳ قطعه هم همین‌طور کار
     می‌کند، چون شرط «فرد بودن» است نه «یک بودن». */
  var canAdd = admin && partsSorted().some(function(pt){ return parts.indexOf(pad2(pt.partNo))<0; });
  if(canAdd && (parts.length%2)===1){
    groups+='<button type="button" class="spec-group spec-add" '+
      'onclick="openPartsPanel(\''+esc(pc)+'\',\''+esc(po)+'\',\''+esc(ppr)+'\')" '+
      'title="افزودنِ قطعه به این پروژه">'+ICON.plus+'<span>افزودنِ قطعه</span></button>';
  }
  return '<div class="spec-groups">'+groups+'</div>';
}
/* ردیف‌های اطلاعاتِ قطعه (وزن/جنس/…)؛ مقدار برای مدیر با کلیک قابلِ ویرایش است. */
function partSpecRowsHTML(p,pn,admin){
  var mods=partModsForPart(p,pn).filter(function(m){ return m.on && m.label; });   // فقط پارامترهای فعالِ همین قطعه
  if(!mods.length) return '';
  var vals=partValsOf(p,pn), c=p.clientCode, o=pad2(p.orderNo), pr=pad2(p.projectNo);
  return mods.map(function(m){
    var v=String(vals[m.label]==null?"":vals[m.label]);
    var cls=v?pdValClass(v):'spec-val ltr empty';
    var unit=(typeof partModUnitOf==="function")?partModUnitOf(m.label):"";   // واحدِ خودکارِ این پارامتر
    var body=v?(esc(v)+(unit?' <span class="spec-unit">'+esc(unit)+'</span>':'')):'Not specified';
    var edit=admin?' data-val="'+esc(v)+'" title="کلیک برای ویرایش" onclick="partSpecEdit(this,\''+esc(c)+'\',\''+esc(o)+'\',\''+esc(pr)+'\',\''+esc(pn)+'\',\''+esc(m.label)+'\')"':'';
    return '<div class="spec-row"><span class="spec-label"><span class="lbl-t">'+esc(m.label)+'</span></span>'+
      '<span class="'+cls+(admin?' editable':'')+'"'+edit+'>'+body+'</span></div>';
  }).join("");
}
/* ردیف‌های سندِ قطعه — انواعِ فعالِ سراسری + هر نوعی که سند دارد؛ تمیز و بدونِ چیپ. */
function partDocRowsHTML(p,pn,partTypes,latest,admin){
  var c=p.clientCode, o=pad2(p.orderNo), pr=pad2(p.projectNo);
  var by={}; partTypes.forEach(function(t){ by[String(t.code).toUpperCase()]=t; });
  // ترتیبِ نمایش = ترتیبِ دلخواهِ ذخیره‌شدهٔ همین قطعه (partDocTypesForPart از partDocsByPart می‌خواند و ترتیب را حفظ می‌کند)
  var rows=partDocTypesForPart(p,pn).map(function(T){ T=String(T).toUpperCase(); var t=by[T]; if(!t) return "";
    var doc=latest.filter(function(d){ return pad2(d.partNo)===pn && String(d.typeCode).toUpperCase()===T; })
      .sort(function(a,b){ return (parseInt(b.rev)||0)-(parseInt(a.rev)||0); })[0]||null;
    return docRowClean(c,o,pr,pn,t,doc,admin);
  }).join("");
  if(!rows) return admin?'<div class="pd-nodoc">نوعِ سندی انتخاب نشده — از دکمهٔ ویرایش اضافه کنید.</div>':'';
  return '<div class="pd-docs">'+rows+'</div>';
}
/* ویرایشِ درجای مقدارِ یک ماژولِ قطعه (بدونِ دکمهٔ جدا؛ کلیک روی مقدار) */
function partSpecEdit(el,c,o,pr,pn,label){
  if(!el || el.getAttribute("data-editing")==="1") return;
  el.setAttribute("data-editing","1");
  var raw=el.getAttribute("data-val")||"";
  el.innerHTML='<input class="spec-inline" value="'+esc(raw)+'" data-orig="'+esc(raw)+'" '+
    'onblur="partSpecSave(this,\''+esc(c)+'\',\''+esc(o)+'\',\''+esc(pr)+'\',\''+esc(pn)+'\',\''+esc(label)+'\')" '+
    'onkeydown="if(event.key===\'Enter\'){this.blur();}else if(event.key===\'Escape\'){this.value=this.getAttribute(\'data-orig\');this.blur();}">';
  var inp=el.querySelector&&el.querySelector("input"); if(inp){ try{ inp.focus(); inp.select(); }catch(e){} }
}
async function partSpecSave(inp,c,o,pr,pn,label){
  if(!inp) return;
  var val=String(inp.value||"").trim(), orig=inp.getAttribute("data-orig")||"";
  if(val===orig){ showProjectDetail(c,o,pr); return; }
  var p=findProject(c,o,pr); if(!p) return;
  var root=specsRoot(p); root.partVals=root.partVals||{};
  var key=pad2(pn); root.partVals[key]=root.partVals[key]||{};
  if(val) root.partVals[key][label]=val; else delete root.partVals[key][label];
  await saveSpecs(c,o,pr,root);
}

/* یک بخش: ردیف‌های تمیزِ سند (سبکِ پروتوتایپ) + نوارِ افزودنِ سریع برای انواعِ خاموش */
function sectionModulesHTML(c,o,pr,types,part,proj,onSet,slotOn,admin,latest){
  var active=[], off=[];
  types.forEach(function(t){
    var T=String(t.code).toUpperCase();
    var doc=latest.filter(function(d){ return pad2(d.partNo)===part && String(d.typeCode).toUpperCase()===T; })
      .sort(function(a,b){ return (parseInt(b.rev)||0)-(parseInt(a.rev)||0); })[0]||null;
    var isOn = proj ? (onSet.indexOf(T)>=0) : !!slotOn[part+"-"+T];
    if(doc || isOn) active.push({t:t,T:T,doc:doc}); else off.push({t:t,T:T});
  });
  var rows=active.map(function(m){ return moduleRowHTML(c,o,pr,m,part,proj,admin); }).join("");
  var add="";
  if(admin && off.length){
    add='<div class="doc-add-row"><span class="doc-add-lbl">'+ICON.plus+'افزودن سند:</span>'+off.map(function(m){
      var fn=proj
        ? "toggleProjectType('"+esc(c)+"','"+esc(o)+"','"+esc(pr)+"','"+esc(m.T)+"',true)"
        : "toggleProjectSlot('"+esc(c)+"','"+esc(o)+"','"+esc(pr)+"','"+esc(part)+"','"+esc(m.T)+"',true)";
      return '<button class="doc-add-pill" onclick="'+fn+'" title="افزودن «'+esc(m.t.nameFa)+'» به فهرست">'+esc(m.t.nameFa)+'</button>';
    }).join("")+'</div>';
  }
  if(!rows && !add) return '<div class="mod-empty">سندی برای این بخش ثبت نشده.</div>';
  if(!rows) return '<div class="mod-empty">هنوز سندی برای این بخش انتخاب نشده.</div>'+add;
  return '<div class="pd-docs">'+rows+'</div>'+add;
}

/* ردیفِ تمیزِ سند — عیناً پروتوتایپ: آیکن + نامِ کامل (راست) · شمارهٔ سند (چپ).
   بدونِ بجِ وضعیت، بدونِ «بارگذاری نشده» و بدونِ دکمهٔ حذف — همان دو ستونِ ردیفِ مشخصات. */
/* «المانِ» نوعِ سند: به‌صورتِ خودکار از روی کد ساخته می‌شود — علامتِ اصلیِ سند با «کدِ سند»
   (MC/AS/…) در مرکزِ آن؛ برای نوعِ «3D» همان المانِ مکعبی. محتوای داخلِ کادرِ .doc-ic / .el-badge
   را برمی‌گرداند و در جدولِ تنظیمات و پنلِ پروژه یکی است. */
function docTypeIconInner(t){
  var rawCode=String(t&&t.code!=null?t.code:"").toUpperCase();
  if(rawCode.indexOf("3D")===0) return MODEL_IC;   // هر نوعِ مدلِ سه‌بعدی (3D، 3DA، …): المانِ مکعبی، نه نمادِ سند
  var code=esc(rawCode);
  var fs=code.length>=3?6:8;   // کدِ ۳ حرفی کوچک‌تر تا داخلِ نمادِ سند جا شود
  return '<svg class="el-doc" viewBox="0 0 24 24">'+
    '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>'+
    '<polyline points="14 2 14 8 20 8"/>'+
    '<text x="12" y="16.5" text-anchor="middle" fill="currentColor" stroke="none" font-size="'+fs+'">'+code+'</text>'+
    '</svg>';
}
/* «المانِ» قطعه: به‌صورتِ خودکار کدِ قطعه داخلِ همان کادر. */
function partIconInner(p){
  return '<span class="el-code">'+esc(pad2(p&&p.partNo))+'</span>';
}
function docRowClean(c,o,pr,part,t,doc,admin){
  var T=String(t.code).toUpperCase();
  var ic=docTypeIconInner(t);   // آیکونِ سفارشی یا پیش‌فرض (مکعب برای 3D)
  if(doc){
    var num=esc(doc.drawingNumber), open="openDocDetail('"+num+"')";
    return '<div class="doc-row">'+
      '<span class="doc-head">'+
        '<button type="button" class="doc-ic" title="نمایش جزئیات سند" aria-label="نمایش جزئیات سند" onclick="'+open+'">'+ic+'</button>'+
        '<span class="doc-name">'+esc(t.nameFa)+'</span></span>'+
      '<span class="doc-acts">'+
        '<span class="doc-num" title="'+num+'" onclick="'+open+'">'+num+'</span>'+
      '</span></div>';
  }
  // روشن ولی بدونِ سند: ردیفِ خاکستری با شمارهٔ آینده؛ کلیک → بارگذاری (فقط مدیر)
  var expected="FSM-"+c+"-"+o+"-"+pr+"-"+part+"-"+T+"-0";
  var goFn="goNewDocForProject('"+esc(c)+"','"+esc(o)+"','"+esc(pr)+"','"+esc(T)+"','"+esc(part)+"')";
  var tip=admin?'برای بارگذاری کلیک کنید':'هنوز بارگذاری نشده';
  return '<div class="doc-row empty">'+
    '<span class="doc-head">'+
      '<button type="button" class="doc-ic" title="'+tip+'" aria-label="'+tip+'"'+(admin?' onclick="'+goFn+'"':' disabled')+'>'+ic+'</button>'+
      '<span class="doc-name">'+esc(t.nameFa)+'</span></span>'+
    '<span class="doc-acts">'+
      '<span class="doc-none" title="'+tip+'"'+(admin?' onclick="'+goFn+'"':'')+'>'+esc(expected)+'</span>'+
    '</span></div>';
}
function moduleRowHTML(c,o,pr,m,part,proj,admin){ return docRowClean(c,o,pr,part,m.t,m.doc,admin); }

/* کنترل «افزودن قطعه» به پروژه */
function addPartHTML(p,c,o,pr){
  var inProject=projectPartsList(p);
  var avail=partsSorted().filter(function(pt){ return inProject.indexOf(pad2(pt.partNo))<0; });
  if(!avail.length) return '<div class="cp-empty-hint" style="margin-top:8px">همهٔ قطعات به این پروژه اضافه شده‌اند.</div>';
  return '<div class="pd-addpart">'+
    '<select id="pdAddPartSel" class="pd-addpart-sel">'+
      avail.map(function(pt){ return opt(pad2(pt.partNo), pad2(pt.partNo)+" — "+(pt.nameFa||pt.name)); }).join("")+
    '</select>'+
    '<button class="btn sm primary" onclick="addProjectPart(\''+esc(c)+'\',\''+esc(o)+'\',\''+esc(pr)+'\')">'+ICON.plus+'افزودن قطعه</button>'+
  '</div>';
}

/* روشن/خاموش‌کردن ماژول سطح‌پروژه (enabledTypes) */
async function toggleProjectType(c,o,pr,typeCode,turnOn){
  var p=findProject(c,o,pr); if(!p) return;
  var T=String(typeCode).toUpperCase();
  var stored=csv(p.enabledTypes||"").map(function(x){ return String(x).toUpperCase(); });
  if(turnOn){ if(stored.indexOf(T)<0) stored.push(T); }
  else { stored=stored.filter(function(x){ return x!==T; }); }
  var newCsv=stored.join(",");
  p.enabledTypes=newCsv;            // به‌روزرسانی خوش‌بینانه
  showProjectDetail(c,o,pr);
  var r=await api("saveProject",{clientCode:c,orderNo:o,projectNo:pr,enabledTypes:newCsv});
  if(!r||!r.ok){ toast((r&&r.message)||"ذخیرهٔ سند الزامی ناموفق بود",true); }
}

/* روشن/خاموش‌کردن ماژول سطح‌قطعه (enabledSlots) — اسلات = PART-TYPE */
async function toggleProjectSlot(c,o,pr,part,typeCode,turnOn){
  var p=findProject(c,o,pr); if(!p) return;
  var key=pad2(part)+"-"+String(typeCode).toUpperCase();
  var stored=csv(p.enabledSlots||"").map(function(x){ return String(x).toUpperCase(); });
  if(turnOn){ if(stored.indexOf(key)<0) stored.push(key); }
  else { stored=stored.filter(function(x){ return x!==key; }); }
  var newCsv=stored.join(",");
  p.enabledSlots=newCsv;            // به‌روزرسانی خوش‌بینانه
  showProjectDetail(c,o,pr);
  var r=await api("saveProject",{clientCode:c,orderNo:o,projectNo:pr,enabledSlots:newCsv});
  if(!r||!r.ok){ toast((r&&r.message)||"ذخیرهٔ سند الزامی ناموفق بود",true); }
}

/* افزودن یک قطعه به پروژه */
async function addProjectPart(c,o,pr){
  var sel=document.getElementById("pdAddPartSel"); if(!sel||!sel.value) return;
  var pn=pad2(sel.value);
  var p=findProject(c,o,pr); if(!p) return;
  var list=projectPartsList(p);
  if(list.indexOf(pn)<0) list.push(pn);
  var newCsv=list.join(",");
  p.projectParts=newCsv;
  showProjectDetail(c,o,pr);
  var r=await api("saveProject",{clientCode:c,orderNo:o,projectNo:pr,projectParts:newCsv});
  if(!r||!r.ok){ toast((r&&r.message)||"افزودن قطعه ناموفق بود",true); }
}

/* حذف یک قطعه از پروژه (فقط اگر سندی برای آن ثبت نشده باشد) */
async function removeProjectPart(c,o,pr,pn){
  var p=findProject(c,o,pr); if(!p) return;
  pn=pad2(pn);
  if(projectDocs(p).some(function(d){ return pad2(d.partNo)===pn; })){ toast("این قطعه سند ثبت‌شده دارد و حذف نمی‌شود.",true); return; }
  if(!(await uiConfirm("حذف قطعهٔ «"+partNameFa(pn)+"» از این پروژه؟",{danger:true,okLabel:"حذف"}))) return;
  var list=projectPartsList(p).filter(function(x){ return x!==pn; });
  var slots=csv(p.enabledSlots||"").filter(function(s){ return String(s).toUpperCase().indexOf(pn+"-")!==0; });
  p.projectParts=list.join(","); p.enabledSlots=slots.join(",");
  showProjectDetail(c,o,pr);
  var r=await api("saveProject",{clientCode:c,orderNo:o,projectNo:pr,projectParts:p.projectParts,enabledSlots:p.enabledSlots});
  if(!r||!r.ok){ toast((r&&r.message)||"حذف قطعه ناموفق بود",true); }
}

/* تابعِ goNewDocForProject (ثبت سند با پیش‌تنظیمِ پروژه/نوع/قطعه) اکنون در documents.js
   (ویزاردِ ریلِ شماره) تعریف شده است. */

/* ============ مشخصاتِ پروژه و قطعات — همه در p.specs (JSON) ذخیره می‌شوند ============
   ساختار: { project:[{label,value,on}], partMods:[{label,unit,on}],
             partVals:{"03":{"وزن":"96",...}}, partDocTypes:["MC","AC",...] }
   سازگاریِ عقب‌رو: اگر p.specs یک آرایهٔ ساده بود، همان = ماژول‌های سطحِ پروژه. بدونِ تغییرِ بک‌اند. */
function specsRoot(p){
  var raw=p&&p.specs, root={project:[],partMods:null,partVals:{},partDocTypes:null,projDocTypes:null,projDocOrder:null,tpl:null,partModsByPart:null,partDocsByPart:null};
  if(raw){ try{ var j=(typeof raw==="string")?JSON.parse(raw):raw;
    if(Array.isArray(j)){ root.project=j; }
    else if(j&&typeof j==="object"){
      if(Array.isArray(j.project)) root.project=j.project;
      if(Array.isArray(j.partMods)) root.partMods=j.partMods;
      if(j.partVals&&typeof j.partVals==="object") root.partVals=j.partVals;
      if(Array.isArray(j.partDocTypes)) root.partDocTypes=j.partDocTypes;
      if(Array.isArray(j.projDocTypes)) root.projDocTypes=j.projDocTypes;
      if(Array.isArray(j.projDocOrder)) root.projDocOrder=j.projDocOrder;   // ترتیبِ دلخواهِ نمایشِ اسنادِ سطحِ پروژه (شاملِ خاموش‌ها)
      if(j.tpl&&typeof j.tpl==="object") root.tpl=j.tpl;
      if(j.partModsByPart&&typeof j.partModsByPart==="object") root.partModsByPart=j.partModsByPart;   // پارامترهای per-part: {"03":["وزن",...]}
      if(j.partDocsByPart&&typeof j.partDocsByPart==="object") root.partDocsByPart=j.partDocsByPart;   // انواعِ سندِ per-part: {"03":["MC",...]}
    }
  }catch(e){} }
  return root;
}
/* ماژول‌های سطحِ پروژه (دسته‌بندی محصول و…) */
function projectSpecs(p){
  return specsRoot(p).project.map(function(m){ return {label:String(m.label||m.key||""),value:String(m.value==null?"":m.value),on:m.on!==false}; });
}
function projectSpecsSeed(){ return [{label:"دسته‌بندی محصول",value:"",on:true}]; }
/* ماژول‌های پیش‌فرضِ اطلاعاتِ قطعه (fallback فقط وقتی فهرستِ اصلی خالی و پروژه هم چیزی ندارد) */
function partModsSeed(){ return [{label:"وزن",on:true},{label:"جنس",on:true},{label:"نوع عملیات حرارتی",on:true}]; }
/* ماژول‌های اطلاعاتِ قطعهٔ این پروژه = فهرستِ اصلیِ سراسری (DB.partMods) با روشن/خاموشِ per-project.
   overlayِ پروژه در specs.partMods نگه‌داری می‌شود؛ ماژولِ قدیمیِ محلی که در فهرستِ اصلی نیست هم حفظ می‌شود. */
function partModsOf(p){
  var overlay={}, seen={}, out=[];
  (specsRoot(p).partMods||[]).forEach(function(x){ var l=String(x.label||""); if(l) overlay[l]=(x.on!==false); });
  partModsSorted().forEach(function(m){ var l=String(m.nameFa||""); if(!l||seen[l]) return; seen[l]=1;
    out.push({label:l, on: overlay.hasOwnProperty(l)?overlay[l]:true}); });
  Object.keys(overlay).forEach(function(l){ if(!seen[l]){ seen[l]=1; out.push({label:l, on:overlay[l], legacy:true}); } });
  return out.length?out:partModsSeed();
}
function partValsOf(p,part){ var v=specsRoot(p).partVals[pad2(part)]; return (v&&typeof v==="object")?v:{}; }
/* انواعِ سندِ سطحِ قطعه که این پروژه فعال کرده؛ اگر تعریف نشده، از enabledSlotsِ قدیمی مهاجرت می‌شود */
function partDocTypesOf(p){
  var r=specsRoot(p);
  if(r.partDocTypes) return r.partDocTypes.map(function(x){ return String(x).toUpperCase(); });
  var set={}; csv(p.enabledSlots||"").forEach(function(s){ var seg=String(s).toUpperCase().split("-"); if(seg[1]) set[seg[1]]=1; });
  return Object.keys(set);
}

/* ============ پیکربندیِ per-part: پارامترها و انواعِ سند برای هر قطعهٔ خاص ============
   داده‌ها در specs ذخیره می‌شوند (بدونِ تغییرِ بک‌اند):
     partModsByPart = {"03":["وزن","جنس"],...}   ·   partDocsByPart = {"03":["MC","AC"],...}
   سازگاریِ عقب‌رو: اگر برای قطعه‌ای per-part تعریف نشده، از انتخابِ سطحِ پروژه (partMods/partDocTypes) پر می‌شود. */

/* فهرستِ اصلیِ پارامترها برای این پروژه = سراسری (DB.partMods) + برچسب‌های قدیمیِ محلی */
function partModMaster(p){
  var seen={}, out=[], r=specsRoot(p);
  partModsSorted().forEach(function(m){ var l=String(m.nameFa||""); if(!l||seen[l]) return; seen[l]=1; out.push({label:l,legacy:false}); });
  (r.partMods||[]).forEach(function(x){ var l=String(x.label||""); if(l&&!seen[l]){ seen[l]=1; out.push({label:l,legacy:true}); } });
  var bp=r.partModsByPart||{};
  Object.keys(bp).forEach(function(pn){ (bp[pn]||[]).forEach(function(l){ l=String(l||""); if(l&&!seen[l]){ seen[l]=1; out.push({label:l,legacy:true}); } }); });
  if(!out.length) partModsSeed().forEach(function(m){ out.push({label:m.label,legacy:false}); });
  return out;
}
/* پارامترهای یک قطعهٔ خاص: [{label,on,legacy}] */
function partModsForPart(p,part){
  var pn=pad2(part), r=specsRoot(p), master=partModMaster(p), bp=r.partModsByPart||{};
  /* ترتیبِ ذخیره‌شدهٔ همین قطعه مبناست: اول پارامترهای فعال به همان ترتیبی که کاربر
     چیده، سپس بقیه به ترتیبِ فهرستِ اصلی. پیش از این همیشه از master.map ساخته می‌شد،
     پس ترتیبِ دلخواه ذخیره می‌شد ولی هیچ‌جا دیده نمی‌شد. */
  if(bp[pn]){
    var on={}; bp[pn].forEach(function(l){ on[String(l)]=1; });
    var by={}; master.forEach(function(m){ by[m.label]=m; });
    var out=[], seen={};
    bp[pn].forEach(function(l){ l=String(l); var m=by[l];
      if(m&&!seen[l]){ out.push({label:m.label,on:true,legacy:m.legacy}); seen[l]=1; } });
    master.forEach(function(m){ if(!seen[m.label]) out.push({label:m.label,on:!!on[m.label],legacy:m.legacy}); });
    return out;
  }
  var proj={}; (r.partMods||[]).forEach(function(x){ if(x.label) proj[String(x.label)]=(x.on!==false); });   // fallbackِ پروژه‌ای
  return master.map(function(m){ return {label:m.label,on: proj.hasOwnProperty(m.label)?proj[m.label]:true, legacy:m.legacy}; });
}
/* فهرستِ اصلیِ انواعِ سندِ سطحِ قطعه (از تنظیماتِ سراسری) */
function partDocMaster(){
  return docTypesSorted().filter(function(t){ return t.scope==="part"; })
    .map(function(t){ return {code:String(t.code).toUpperCase(), label:t.nameFa||String(t.code).toUpperCase()}; });
}
/* انواعِ سندِ فعالِ یک قطعهٔ خاص (کد)؛ نوعی که برای همان قطعه سند دارد همیشه فعال است */
function partDocTypesForPart(p,part){
  var pn=pad2(part), r=specsRoot(p), bp=r.partDocsByPart||{}, set={};
  if(bp[pn]){ bp[pn].forEach(function(T){ set[String(T).toUpperCase()]=1; }); }
  else { partDocTypesOf(p).forEach(function(T){ set[String(T).toUpperCase()]=1; }); }   // fallbackِ پروژه‌ای
  projectDocs(p).forEach(function(d){ if(pad2(d.partNo)===pn) set[String(d.typeCode).toUpperCase()]=1; });
  return Object.keys(set);
}
/* انواعِ سندی که برای یک قطعه سندِ ثبت‌شده دارند (قابلِ قفل‌شدن در پنل) */
function partDocLockedTypes(p,part){
  var pn=pad2(part), set={}; projectDocs(p).forEach(function(d){ if(pad2(d.partNo)===pn) set[String(d.typeCode).toUpperCase()]=1; });
  return set;
}
/* نوشتنِ کاملِ ساختار به p.specs + ذخیرهٔ خوش‌بینانه در بک‌اند (بدونِ تغییرِ بک‌اند) */
async function saveSpecs(c,o,pr,root,extra){
  var json=JSON.stringify(root);
  var p=findProject(c,o,pr); if(p) p.specs=json;
  var payload={clientCode:c,orderNo:o,projectNo:pr,specs:json};
  if(extra){ for(var k in extra){ if(extra.hasOwnProperty(k)) payload[k]=extra[k]; } }
  showProjectDetail(c,o,pr);
  var r=await api("saveProject",payload);
  if(!r||!r.ok){ toast((r&&r.message)||"ذخیره ناموفق بود",true); }
}

/* ترتیبِ ثابتِ اسنادِ سطحِ پروژه؛ انواعِ ناشناخته پس از این ترتیب می‌آیند (به ترتیبِ تنظیمات) */
var PROJ_DOC_ORDER=["AS","PS","QP","MTC"];
function orderedProjectTypes(){
  var types=docTypesSorted().filter(function(t){ return t.scope==="project"; });
  var rank=function(code){ var i=PROJ_DOC_ORDER.indexOf(String(code).toUpperCase()); return i<0?PROJ_DOC_ORDER.length:i; };
  return types.map(function(t,i){ return {t:t,i:i,r:rank(t.code)}; })
    .sort(function(a,b){ return a.r!==b.r ? a.r-b.r : a.i-b.i; })
    .map(function(x){ return x.t; });
}
/* همان فهرست، ولی با ترتیبِ دلخواهِ همین پروژه (specs.projDocOrder) اگر تعریف شده باشد؛
   نوع‌هایی که در ترتیبِ ذخیره‌شده نیستند (نوعِ تازه‌اضافه‌شده) پس از آن‌ها به ترتیبِ پیش‌فرض می‌آیند. */
function orderedProjectTypesFor(p){
  var base=orderedProjectTypes(), ord=specsRoot(p).projDocOrder;
  if(!ord||!ord.length) return base;
  var by={}; base.forEach(function(t){ by[String(t.code).toUpperCase()]=t; });
  var out=[], seen={};
  ord.forEach(function(cd){ cd=String(cd).toUpperCase(); if(by[cd]&&!seen[cd]){ out.push(by[cd]); seen[cd]=1; } });
  base.forEach(function(t){ var cd=String(t.code).toUpperCase(); if(!seen[cd]){ out.push(t); seen[cd]=1; } });
  return out;
}
/* انواعِ سندِ سطحِ پروژه که این پروژه فعال کرده؛ اگر تعریف نشده، همه فعال‌اند */
function projDocTypesOf(p){
  var r=specsRoot(p);
  if(r.projDocTypes) return r.projDocTypes.map(function(x){ return String(x).toUpperCase(); });
  return docTypesSorted().filter(function(t){ return t.scope==="project"; }).map(function(t){ return String(t.code).toUpperCase(); });
}
/* دسته‌بندیِ محصولِ پروژه (تنها فیلدِ متنیِ قالبِ ثابت)؛ از ساختارِ tpl یا ماژولِ قدیمی */
function projectCategory(p){
  var root=specsRoot(p);
  if(root.tpl && root.tpl.category!=null) return String(root.tpl.category);
  var m=(root.project||[]).filter(function(x){ return String(x.label||"").indexOf("دسته")>=0; })[0];
  return m?String(m.value||""):"";
}
/* قالبِ ثابتِ مشخصاتِ پروژه (۶ فیلد) برای نمایش در کارتِ «مشخصات پروژه» */
function projectSpecTemplateRows(c,o,pr,s,p){
  var dt=projectDates(p), cat=projectCategory(p), nParts=projectPartsList(p).length;
  return pdMetaRow("نام مشتری", '<span title="'+esc(clientName(c)||c)+'">'+esc(clientNameEn(c))+'</span>')+
    pdMetaRow("کد پروژه", esc(c+"-"+o+"-"+pr))+
    metaRowOrDash("تاریخ ایجاد", dt.created)+
    metaRowOrDash("تاریخ آخرین تغییرات", dt.updated)+
    (cat?pdMetaRow("دسته‌بندی محصول", esc(cat))
        :'<div class="spec-row"><span class="spec-label"><span class="lbl-t">دسته‌بندی محصول</span></span>'+
           '<span class="spec-val ltr empty">Not specified</span></div>')+
    '<div class="spec-row"><span class="spec-label"><span class="lbl-t">تعداد کل قطعات</span></span>'+
      '<span class="spec-val ltr">'+esc(String(nParts))+' <span class="unit">'+(nParts===1?"part":"parts")+'</span></span></div>';
}
/* ردیفِ فقط‌خواندنیِ قالب در پنلِ ویرایش (واحدِ اختیاری؛ چپ‌چینی از روی مقدار تعیین می‌شود) */
function edFldRO(label,val,unit){
  var body=esc(val)+(unit?' <span class="unit">'+esc(unit)+'</span>':'');
  return '<div class="ed-fld-row"><span class="ed-fld-lab">'+esc(label)+'</span>'+
    '<span class="ed-fld-val auto'+(isLtrVal(val)?' ltr':'')+'">'+body+'</span></div>';
}

/* تشخیصِ جوابِ لاتین (عیناً پروتوتایپ): اگر پاسخ هیچ حرفِ فارسی/عربی نداشت و حرف/رقمِ لاتین
   داشت، لاتین شمرده می‌شود و از سمتِ چپ نوشته می‌شود. ارقامِ فارسی هم داخلِ همین بازه‌اند،
   پس تاریخ‌ها را با رقمِ لاتین می‌سازیم تا مثلِ پروتوتایپ چپ‌چین شوند. */
function isLtrVal(sv){ sv=String(sv==null?"":sv).replace(/<[^>]*>/g,""); return !/[؀-ۿ]/.test(sv) && /[A-Za-z0-9]/.test(sv); }
function pdValClass(raw){ return 'spec-val'+(isLtrVal(raw)?' ltr':''); }
/* ردیفِ برچسب/مقدار — جوابِ لاتین خودکار چپ‌چین، جوابِ فارسی راست‌چین (عیناً پروتوتایپ) */
function pdMetaRow(label,valHTML){
  return '<div class="spec-row"><span class="spec-label"><span class="lbl-t">'+esc(label)+'</span></span>'+
    '<span class="'+pdValClass(valHTML)+'">'+valHTML+'</span></div>';
}
/* تاریخِ شمسیِ عددی با رقمِ لاتین: «1405/04/29» تا مثلِ پروتوتایپ چپ‌چین شود */
function fmtDateJalaliNum(ts){
  if(!ts) return "";
  var d=new Date(ts); if(isNaN(d.getTime())) return String(ts).slice(0,10);
  try{ return d.toLocaleDateString("fa-IR-u-nu-latn",{year:"numeric",month:"2-digit",day:"2-digit"}); }
  catch(e){ try{ return d.toLocaleDateString("en-CA"); }catch(e2){ return ""; } }
}
function tsOf(v){ if(v==null||v==="")return null; var t=new Date(v).getTime(); return isNaN(t)?null:t; }
/* تاریخِ سفارشِ والدِ پروژه (fallback برای پروژه‌های قدیمی) */
function orderTs(p){ var o=DB.orders.find(function(x){ return x.clientCode===p.clientCode && pad2(x.orderNo)===pad2(p.orderNo); }); return o?tsOf(o.date):null; }
/* تاریخِ ایجاد/آخرین‌تغییرِ پروژه:
   • پروژهٔ جدید (createdAt ذخیره‌شده دارد): ایجاد = createdAt؛ آخرین‌تغییر = جدیدترینِ (createdAt, updatedAt, جدیدترین سند)
     ⇐ تا وقتی ویرایش/سندی نبوده، آخرین‌تغییر با ایجاد یکی است.
   • پروژهٔ قدیمی (createdAt ندارد): هر دو = «اولین سند» یا «تاریخِ سفارش» (برابر)؛ فقط اگر بعداً ویرایش شده باشد،
     آخرین‌تغییرش با updatedAt جلو می‌رود. */
function projectDates(p){
  var ns=projectDocs(p).map(function(d){ return tsOf(d.timestamp); }).filter(function(n){ return n!=null; });
  var docMin=ns.length?Math.min.apply(null,ns):null, docMax=ns.length?Math.max.apply(null,ns):null;
  var createdAt=tsOf(p.createdAt), updatedAt=tsOf(p.updatedAt), created, updated;
  if(createdAt!=null){
    created=createdAt; updated=createdAt;
    if(updatedAt!=null) updated=Math.max(updated,updatedAt);
    if(docMax!=null) updated=Math.max(updated,docMax);
  } else {
    var fb=(docMin!=null)?docMin:orderTs(p);
    if(fb==null) return {created:"",updated:""};
    created=fb; updated=(updatedAt!=null)?Math.max(fb,updatedAt):fb;
  }
  return { created: created!=null?fmtDateJalaliNum(created):"",
           updated: updated!=null?fmtDateJalaliNum(updated):"" };
}
/* هویتِ پروژه — عیناً پروتوتایپ: مشتری · کد پروژه · تاریخ ایجاد · تاریخ آخرین تغییرات */
function pdIdentityRows(c,o,pr,s,p){
  var dt=projectDates(p);
  return pdMetaRow("مشتری", '<span title="'+esc(s.client||clientName(c))+'">'+esc(c)+'</span>')+
    pdMetaRow("کد پروژه", esc(c+"-"+o+"-"+pr))+
    metaRowOrDash("تاریخ ایجاد", dt.created)+
    metaRowOrDash("تاریخ آخرین تغییرات", dt.updated);
}
function metaRowOrDash(label,val){
  if(val) return pdMetaRow(label, esc(val));
  return '<div class="spec-row"><span class="spec-label"><span class="lbl-t">'+esc(label)+'</span></span>'+
    '<span class="spec-val empty">ثبت نشده</span></div>';
}
/* ردیف‌های ماژولِ مشخصات — جوابِ لاتین چپ‌چین؛ اگر پروژه مشخصاتی ندارد، پیش‌فرضِ «دسته‌بندی محصول» */
function projectSpecsRows(p){
  var specs=projectSpecs(p).filter(function(m){ return m.on && m.label; });
  if(!specs.length) specs=projectSpecsSeed().filter(function(m){ return m.on && m.label; });
  return specs.map(function(m){
    var v=m.value, cls=v?pdValClass(v):'spec-val empty';
    return '<div class="spec-row"><span class="spec-label"><span class="lbl-t">'+esc(m.label)+'</span></span>'+
      '<span class="'+cls+'">'+(v?esc(v):'—')+'</span></div>';
  }).join("");
}

/* --- پنلِ ویرایشِ مشخصاتِ پروژه: قالبِ ثابت (۶ فیلد) + اسنادِ پروژه (طرحِ .ed-* سایت) --- */
var PSED=null;
function openProjectSpecs(c,o,pr){
  if(ME.role!=="admin"){ toast("فقط مدیر می‌تواند ویرایش کند.",true); return; }
  var p=findProject(c,o,pr); if(!p) return;
  var on={}; projDocTypesOf(p).forEach(function(T){ on[T]=1; });
  PSED={ c:c,o:o,pr:pr, name:(p.description||""), category:projectCategory(p),
    projDocs: orderedProjectTypesFor(p).map(function(t){ var T=String(t.code).toUpperCase(); return {code:T,label:t.nameFa||T,on:!!on[T]}; })
  };
  showModal("ویرایش مشخصات پروژه",
    '<div class="ed-body" id="psedBody"></div>'+
    '<div class="ed-foot"><div class="btn-row">'+
      '<button class="btn" onclick="closeModal()">انصراف</button>'+
      '<button class="btn primary" onclick="saveProjectSpecs()">ذخیره</button>'+
    '</div></div>', "edit-box");
  drawProjectSpecsBody(c,o,pr);
}
function drawProjectSpecsBody(c,o,pr){
  var host=document.getElementById("psedBody"); if(!host||!PSED) return;
  var p=findProject(c,o,pr); if(!p) return;
  /* کارتِ ۱: فیلدهای قابلِ ویرایشِ کاربر — نامِ پروژه و دسته‌بندیِ محصول.
     (مشتری/کد/تاریخ‌ها/تعدادِ قطعات را سامانه خودکار می‌سازد؛ در ویرایش نمایش داده نمی‌شوند.) */
  var tplCard='<div class="ed-card"><h4 class="ed-sec-t">'+SEC_IC_DOC+'مشخصات پروژه</h4>'+
    '<div class="ed-fld-row"><span class="ed-fld-lab">نام پروژه</span>'+
      '<input type="text" id="psedName" placeholder="مثلاً Roller W=700" value="'+esc(PSED.name)+'" oninput="PSED.name=this.value"></div>'+
    '<div class="ed-fld-row"><span class="ed-fld-lab">دسته‌بندی محصول</span>'+
      '<input type="text" dir="ltr" id="psedCategory" placeholder="e.g. Power Transmission Parts" value="'+esc(PSED.category)+'" oninput="PSED.category=this.value"></div>'+
  '</div>';
  /* کارتِ ۲: اسناد پروژه — فقط روشن/خاموش؛ افزودنِ نوعِ جدید فقط در تنظیمات */
  var nOn=PSED.projDocs.filter(function(x){ return x.on; }).length;
  var docRows=PSED.projDocs.map(function(x,i){ return pedDragRow(x.on,x.label,x.code,"psedToggleDoc("+i+")"); }).join("");
  var docsCard='<div class="ed-card"><h4 class="ed-sec-t">'+SEC_IC_DOC+'اسناد پروژه<span class="ed-count">'+faN(nOn)+' سند</span></h4>'+
    (docRows?'<div class="ed-scroll" data-reorder="proj" ondragover="edRowDragOver(event)" ondrop="event.preventDefault()">'+docRows+'</div>':'<div class="ed-req-note">نوعِ سندِ سطحِ پروژه‌ای تعریف نشده.</div>')+
    '<div class="ed-req-note"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>برای افزودنِ نوعِ جدیدِ سند، به «تنظیمات ◂ انواع اسناد» بروید.</div>'+
    '<div class="ed-req-note"><svg viewBox="0 0 24 24"><path d="M12 16V4"/><path d="M7 9l5-5 5 5"/><path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>برای بارگذاریِ فایلِ هر سند، در پنلِ مدیریتِ پروژه روی آیکونِ همان سند کلیک کنید.</div>'+
  '</div>';
  host.innerHTML=tplCard+docsCard;
}
function psedToggleDoc(i){ var x=PSED.projDocs[i]; if(x){ x.on=!x.on; drawProjectSpecsBody(PSED.c,PSED.o,PSED.pr); } }
async function saveProjectSpecs(){
  if(!PSED) return;
  var c=PSED.c,o=PSED.o,pr=PSED.pr, p=findProject(c,o,pr); if(!p) return;
  var root=specsRoot(p);
  root.tpl=root.tpl||{}; root.tpl.category=String(PSED.category||"").trim();
  root.projDocTypes=PSED.projDocs.filter(function(x){ return x.on; }).map(function(x){ return x.code; });
  root.projDocOrder=PSED.projDocs.map(function(x){ return x.code; });   // ترتیبِ دلخواهِ نمایش (شاملِ خاموش‌ها)
  root.project=[];   // قالبِ ثابت جایگزینِ ماژول‌های پویا شد
  var desc=String(PSED.name||"").trim();
  p.description=desc;                       // به‌روزرسانیِ محلی تا UI فوراً نامِ تازه را نشان دهد
  closeModal();
  await saveSpecs(c,o,pr,root,{description:desc});
}

/* ============ پنلِ ویرایشِ قطعات پروژه: عضویتِ قطعات + انواعِ سند + ماژول‌های اطلاعاتِ قطعه ============ */
var PED=null;
/* ساختِ وضعیتِ مشترکِ پنلِ ویرایش — هم پنجرهٔ افزودنِ قطعه، هم ویرایشِ تک‌قطعه */
function pedInitState(c,o,pr,p){
  var inProj={}; projectPartsList(p).forEach(function(pn){ inProj[pn]=1; });   // قطعاتی که الان عضوِ پروژه‌اند
  PED={ c:c,o:o,pr:pr,
    parts: partsSorted().map(function(pt){ var no=pad2(pt.partNo); return {no:no,fa:partNameFa(no),en:pt.name||"",on:!!inProj[no]}; }),
    docMaster: partDocMaster(),          // فهرستِ اصلیِ انواعِ سندِ سطحِ قطعه [{code,label}]
    paramMaster: partModMaster(p),       // فهرستِ اصلیِ پارامترها [{label,legacy}]
    selPart: null,                       // قطعهٔ در حالِ پیکربندی
    // وضعیتِ per-part برای همهٔ قطعاتِ سیستم؛ اگر ذخیره‌شده باشد از آن، وگرنه از fallbackِ پروژه‌ای پر می‌شود
    docsByPart: (function(){ var out={}; partsSorted().forEach(function(pt){ var pn=pad2(pt.partNo);
      var d={}; partDocTypesForPart(p,pn).forEach(function(T){ d[String(T).toUpperCase()]=true; }); out[pn]=d; }); return out; })(),
    // ترتیبِ دلخواهِ نمایشِ انواعِ سند برای هر قطعه؛ از ترتیبِ ذخیره‌شده (partDocsByPart) پر می‌شود
    docOrderByPart: (function(){ var out={}; partsSorted().forEach(function(pt){ var pn=pad2(pt.partNo);
      out[pn]=partDocTypesForPart(p,pn).map(function(T){ return String(T).toUpperCase(); }); }); return out; })(),
    modsByPart: (function(){ var out={}; partsSorted().forEach(function(pt){ var pn=pad2(pt.partNo);
      var m={}; partModsForPart(p,pn).forEach(function(x){ m[x.label]=x.on; }); out[pn]=m; }); return out; })(),
    // ترتیبِ دلخواهِ نمایشِ پارامترها برای هر قطعه — هم‌الگوی docOrderByPart
    modOrderByPart: (function(){ var out={}; partsSorted().forEach(function(pt){ var pn=pad2(pt.partNo);
      out[pn]=partModsForPart(p,pn).map(function(x){ return x.label; }); }); return out; })(),
    vals: (function(){ var src=specsRoot(p).partVals||{}, out={};
      Object.keys(src).forEach(function(k){ var r=src[k]||{}, kk=pad2(k); out[kk]={};
        Object.keys(r).forEach(function(l){ out[kk][l]=String(r[l]==null?"":r[l]); }); });
      return out; })()   // کپیِ مقادیرِ per-part تا تا زمانِ ذخیره، محلی ویرایش شوند
  };
  PED.single=false;
}
function openPartsPanel(c,o,pr){
  if(ME.role!=="admin"){ toast("فقط مدیر می‌تواند ویرایش کند.",true); return; }
  var p=findProject(c,o,pr); if(!p) return;
  pedInitState(c,o,pr,p);
  showModal("افزودنِ قطعه به پروژه",
    '<div class="ed-body" id="pedBody"></div>'+
    '<div class="ed-foot"><div class="btn-row">'+
      '<button class="btn" onclick="closeModal()">انصراف</button>'+
      '<button class="btn primary" id="pedSave" onclick="savePartsPanel()">ذخیره</button>'+
    '</div></div>', "edit-box");
  drawPartsBody();
}
/* ═══ ویرایشِ یک قطعهٔ مشخص ═══
   همان دو کارتِ «انواعِ سند» و «پارامترها»، ولی بدونِ دراپ‌داونِ انتخابِ قطعه:
   قطعه از همان کارتی می‌آید که کاربر دکمهٔ ویرایشِ آن را زده، پس یک مرحلهٔ انتخاب حذف می‌شود.
   عضویتِ قطعات در این پنجره دست‌کاری نمی‌شود — آن کارِ دکمهٔ افزودنِ سربرگ است. */
function openPartEditPanel(c,o,pr,pn){
  if(ME.role!=="admin"){ toast("فقط مدیر می‌تواند ویرایش کند.",true); return; }
  var p=findProject(c,o,pr); if(!p) return;
  pedInitState(c,o,pr,p);
  PED.selPart=pad2(pn);
  PED.single=true;   // حالتِ تک‌قطعه‌ای: کارتِ عضویتِ قطعات رسم نمی‌شود
  showModal("ویرایشِ قطعهٔ «"+esc(partNameFa(pn))+"»",
    '<div class="ed-body" id="pedBody"></div>'+
    '<div class="ed-foot"><div class="btn-row">'+
      '<button class="btn" onclick="closeModal()">انصراف</button>'+
      '<button class="btn primary" id="pedSave" onclick="savePartsPanel()">ذخیره</button>'+
    '</div></div>', "edit-box");
  drawPartsBody();
}
function pedCountParts(){ return PED?PED.parts.filter(function(x){ return x.on; }).length:0; }
function pedTogglePart(i){ var x=PED.parts[i]; if(x){ x.on=!x.on; drawPartsBody(); } }
/* انتخابِ قطعه برای پیکربندیِ per-part */
function pedSelectPart(pn){ pedDDCloseAll(); PED.selPart=pad2(pn); drawPartsBody(); }
/* منوی انتخابِ قطعه (سفارشی، هم‌شکلِ دکمه‌های سایت) — باز/بسته و بستن با کلیکِ بیرون */
function pedDDCloseAll(){ var a=document.querySelectorAll(".ed-part-dd.open"); for(var i=0;i<a.length;i++) a[i].classList.remove("open");
  document.removeEventListener("click", pedDDOutside, true); }
function pedDDOutside(e){ if(e.target && e.target.closest && e.target.closest(".ed-part-dd")) return; pedDDCloseAll(); }
function pedDDToggle(which){ var dd=document.getElementById("edDD-"+which); if(!dd) return;
  var willOpen=!dd.classList.contains("open"); pedDDCloseAll();
  if(willOpen){ dd.classList.add("open"); setTimeout(function(){ document.addEventListener("click", pedDDOutside, true); },0); } }
function pedPartDD(which, onParts, sel){
  var selRec=onParts.filter(function(x){ return x.no===sel; })[0];
  var label=selRec?selRec.fa:'انتخابِ قطعه';   // تا قطعه‌ای انتخاب نشده، جای‌گیرِ راهنما
  var opts=onParts.map(function(x){ return '<button type="button" class="ed-part-opt'+(x.no===sel?' on':'')+'" onclick="pedSelectPart(\''+esc(x.no)+'\')">'+esc(x.fa)+'</button>'; }).join("");
  return '<div class="ed-part-dd" id="edDD-'+which+'">'+
    '<button type="button" class="ed-part-trig" onclick="pedDDToggle(\''+which+'\')" title="انتخابِ قطعه">'+
      '<span>'+esc(label)+'</span>'+ED_CHEV_IC+'</button>'+
    '<div class="ed-part-menu">'+opts+'</div></div>';
}
/* روشن/خاموشِ یک نوعِ سند برای قطعهٔ انتخاب‌شده (نوعی که سند دارد قفل است) */
function pedTogglePartDoc(code){ var pn=PED.selPart; code=String(code||"").toUpperCase(); if(!pn||!code) return;
  var p=findProject(PED.c,PED.o,PED.pr);
  if(p && partDocLockedTypes(p,pn)[code]){ toast("این نوع برای این قطعه سندِ ثبت‌شده دارد و نمی‌توان غیرفعالش کرد.",true); return; }
  var d=PED.docsByPart[pn]||(PED.docsByPart[pn]={}); d[code]=!d[code]; drawPartsBody(); }
/* روشن/خاموشِ یک پارامتر برای قطعهٔ انتخاب‌شده */
function pedTogglePartMod(mi){ var pn=PED.selPart, x=PED.paramMaster[mi]; if(!pn||!x) return;
  var m=PED.modsByPart[pn]||(PED.modsByPart[pn]={}); m[x.label]=!m[x.label]; drawPartsBody(); }
function pedCheckRow(on,label,code,fn){
  return '<div class="ed-doc-row'+(on?'':' off')+'">'+
    '<button type="button" class="ed-check'+(on?' on':'')+'" role="checkbox" aria-checked="'+(on?'true':'false')+'" aria-label="'+esc(label)+'" onclick="'+fn+'"></button>'+
    '<span class="ed-name"><span>'+esc(label)+'</span></span>'+
    '<span class="ed-doc-code">'+esc(code)+'</span>';
}
/* آیکونِ قفل (SVG) — برای نوعِ سندی که سندِ ثبت‌شده دارد و قابلِ غیرفعال‌سازی نیست */
var ED_LOCK_IC='<svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
/* آیکونِ فلشِ منوی کشویی */
var ED_CHEV_IC='<svg class="ed-chev" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>';
/* آیکونِ توجه — برای پیامِ نارنجیِ «اول قطعه را انتخاب کنید» */
var ED_ALERT_IC='<svg viewBox="0 0 24 24"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';

/* ============ جابجاییِ ترتیبِ نمایشِ اسناد در پنل‌های ویرایش (دستهٔ ۶‌نقطه‌ای + انیمیشنِ FLIP) ============
   دقیقاً مثلِ فهرستِ مشتری‌ها: فقط با کشیدن از روی دسته فعال می‌شود. قابِ اسکرول صفتِ data-reorder
   دارد (proj برای اسنادِ سطحِ پروژه، part برای اسنادِ هر قطعه) تا در پایانِ کشیدن ترتیبِ جدید ثبت شود.
   ترتیبِ سطحِ پروژه در specs.projDocOrder و ترتیبِ هر قطعه در specs.partDocsByPart ذخیره می‌شود. */
var ED_GRIP_IC='<svg viewBox="0 0 24 24"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>';
function edGripHTML(){ return '<span class="ed-grip" title="بکشید تا ترتیبِ نمایش عوض شود" aria-label="جابجاییِ ترتیب" onmousedown="edGripDown()" onclick="event.stopPropagation()">'+ED_GRIP_IC+'</span>'; }
var _edGripArmed=false;
function edGripDown(){ _edGripArmed=true; }            // فقط کشیدن از روی دسته مجاز است
function edRowDragStart(e){
  var item=e.currentTarget;
  if(!_edGripArmed){ if(e&&e.preventDefault)e.preventDefault(); return; }
  _edGripArmed=false;
  if(e.dataTransfer){ e.dataTransfer.effectAllowed="move"; try{ e.dataTransfer.setData("text/plain",item.getAttribute("data-code")||""); }catch(_){} }
  setTimeout(function(){ if(item&&item.classList) item.classList.add("ed-dragging"); },0);
}
function edRowDragOver(e){
  if(e&&e.preventDefault)e.preventDefault();
  var list=e.currentTarget; if(!list) return;
  var dragging=list.querySelector(".ed-dragging"); if(!dragging) return;
  var after=edAfterRow(list,e.clientY);
  if(after===dragging) return;
  if(after && dragging.nextElementSibling===after) return;
  if(after===null && dragging===list.lastElementChild) return;
  edFlipRows(list,function(){ if(after===null) list.appendChild(dragging); else list.insertBefore(dragging,after); });
}
function edAfterRow(list,y){
  var els=[].slice.call(list.querySelectorAll(".ed-doc-row:not(.ed-dragging)"));
  var closest=null, closestOffset=-Infinity;
  els.forEach(function(el){ var b=el.getBoundingClientRect(); var off=y-(b.top+b.height/2);
    if(off<0 && off>closestOffset){ closestOffset=off; closest=el; } });
  return closest;
}
function edFlipRows(list,mutate){
  var items=[].slice.call(list.querySelectorAll(".ed-doc-row"));
  var firsts=items.map(function(el){ return el.getBoundingClientRect().top; });
  mutate();
  items.forEach(function(el,i){ var dy=firsts[i]-el.getBoundingClientRect().top;
    if(dy){ el.style.transition="none"; el.style.transform="translateY("+dy+"px)"; } });
  var play=function(){ items.forEach(function(el){ if(el.style.transform){
    el.style.transition="transform .18s cubic-bezier(.2,0,0,1)"; el.style.transform=""; } }); };
  if(typeof requestAnimationFrame==="function") requestAnimationFrame(play); else play();
}
function edRowDragEnd(e){
  var item=e.currentTarget; if(item&&item.classList) item.classList.remove("ed-dragging");
  var list=item.closest && item.closest(".ed-scroll[data-reorder]"); if(!list) return;
  var codes=[].slice.call(list.querySelectorAll(".ed-doc-row")).map(function(el){ return el.getAttribute("data-code"); });
  var kind=list.getAttribute("data-reorder");
  if(kind==="proj") edCommitProjOrder(codes);
  else if(kind==="part") edCommitPartOrder(codes);
  else if(kind==="mod") edCommitModOrder(codes);   // پارامترها: data-code همان برچسبِ پارامتر است
}
if(typeof document!=="undefined" && document.addEventListener) document.addEventListener("mouseup",function(){ _edGripArmed=false; });
/* ترتیبِ جدیدِ DOM را در آرایهٔ وضعیت بنویس، سپس رندرِ دوباره تا اندیس‌های onclick درست بمانند */
function edCommitProjOrder(codes){
  if(!PSED) return;
  var by={}; PSED.projDocs.forEach(function(x){ by[x.code]=x; });
  var next=[]; codes.forEach(function(cd){ if(by[cd]){ next.push(by[cd]); delete by[cd]; } });
  PSED.projDocs.forEach(function(x){ if(by[x.code]) next.push(x); });   // هر ردیفِ جامانده، ته
  PSED.projDocs=next;
  drawProjectSpecsBody(PSED.c,PSED.o,PSED.pr);
}
function edCommitPartOrder(codes){
  if(!PED||!PED.selPart) return;
  var pn=PED.selPart, valid={}; PED.docMaster.forEach(function(x){ valid[x.code]=1; });
  var next=[], seen={};
  codes.forEach(function(cd){ cd=String(cd||"").toUpperCase(); if(valid[cd]&&!seen[cd]){ next.push(cd); seen[cd]=1; } });
  pedPartDocList(pn).forEach(function(x){ if(!seen[x.code]){ next.push(x.code); seen[x.code]=1; } });
  PED.docOrderByPart[pn]=next;
  drawPartsBody();
}
/* فهرستِ انواعِ سندِ یک قطعه به ترتیبِ دلخواهِ همان قطعه؛ اگر ترتیبی نبود، ترتیبِ فهرستِ اصلی */
function pedPartDocList(pn){
  var ord=PED.docOrderByPart?PED.docOrderByPart[pn]:null, by={};
  PED.docMaster.forEach(function(x){ by[x.code]=x; });
  var out=[], seen={};
  (ord||[]).forEach(function(cd){ cd=String(cd||"").toUpperCase(); if(by[cd]&&!seen[cd]){ out.push(by[cd]); seen[cd]=1; } });
  PED.docMaster.forEach(function(x){ if(!seen[x.code]){ out.push(x); seen[x.code]=1; } });
  return out;
}
/* فهرستِ پارامترهای یک قطعه به ترتیبِ دلخواهِ همان قطعه؛ اگر ترتیبی نبود، ترتیبِ فهرستِ اصلی */
function pedPartModList(pn){
  var ord=PED.modOrderByPart?PED.modOrderByPart[pn]:null, by={};
  PED.paramMaster.forEach(function(x){ by[x.label]=x; });
  var out=[], seen={};
  (ord||[]).forEach(function(l){ l=String(l); if(by[l]&&!seen[l]){ out.push(by[l]); seen[l]=1; } });
  PED.paramMaster.forEach(function(x){ if(!seen[x.label]){ out.push(x); seen[x.label]=1; } });
  return out;
}
/* ثبتِ ترتیبِ جدیدِ پارامترها پس از کشیدن */
function edCommitModOrder(labels){
  if(!PED||!PED.selPart) return;
  var pn=PED.selPart, valid={};
  PED.paramMaster.forEach(function(x){ valid[x.label]=1; });
  var next=[], seen={};
  labels.forEach(function(l){ l=String(l||""); if(valid[l]&&!seen[l]){ next.push(l); seen[l]=1; } });
  pedPartModList(pn).forEach(function(x){ if(!seen[x.label]){ next.push(x.label); seen[x.label]=1; } });
  PED.modOrderByPart[pn]=next;
  drawPartsBody();
}

/* ردیفِ چک‌لیستِ قابلِ کشیدن: دایرهٔ روشن/خاموش + نام + (اکسترا مثلِ قفل) + کد + دستهٔ ۶‌نقطه‌ای (سمتِ چپ) */
function pedDragRow(on,label,code,fn,extra,dis){
  return '<div class="ed-doc-row ed-drag'+(on?'':' off')+'" draggable="true" data-code="'+esc(code)+'" ondragstart="edRowDragStart(event)" ondragend="edRowDragEnd(event)">'+
    '<button type="button" class="ed-check'+(on?' on':'')+'"'+(dis?' disabled':'')+' role="checkbox" aria-checked="'+(on?'true':'false')+'" aria-label="'+esc(label)+'" onclick="'+fn+'"></button>'+
    '<span class="ed-name"><span>'+esc(label)+'</span></span>'+
    (extra||'')+
    '<span class="ed-doc-code">'+esc(code)+'</span>'+
    edGripHTML()+
  '</div>';
}
function drawPartsBody(){
  pedDDCloseAll();   // هر بار رندر، منوهای بازِ قبلی و لیسنرِ کلیکِ بیرون پاک می‌شوند
  var host=document.getElementById("pedBody"); if(!host) return;
  var nPart=pedCountParts();
  var single=!!PED.single;   // حالتِ ویرایشِ یک قطعهٔ مشخص
  /* کارتِ ۱: قطعاتِ پروژه (روشن/خاموش) — فقط در پنجرهٔ افزودن؛ در ویرایشِ تک‌قطعه معنا ندارد */
  var partRows=PED.parts.map(function(x,i){ return pedCheckRow(x.on,x.fa,x.en||"","pedTogglePart("+i+")")+'</div>'; }).join("");
  var partNote=(nPart>0)
    ? '<div class="ed-req-note"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>'+faN(nPart)+' قطعه انتخاب شده.</div>'
    : '<div class="ed-req-note"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>دست‌کم یک قطعه انتخاب کنید.</div>';
  var partsCard=single?"":'<div class="ed-card"><h4 class="ed-sec-t">'+SEC_IC_PART+'قطعات پروژه<span class="ed-count">'+faN(nPart)+' قطعه</span></h4>'+
    '<div class="ed-scroll">'+partRows+'</div>'+partNote+
    '<div class="ed-req-note"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>برای افزودنِ قطعهٔ جدید، به «تنظیمات ◂ قطعات» بروید.</div>'+
    '</div>';

  /* ---- پیکربندیِ per-part: اول قطعه را انتخاب کن، سپس انواعِ سند و پارامترهایش را تنظیم کن ---- */
  var onParts=PED.parts.filter(function(x){ return x.on; });
  var perPart="";
  if(!single){
    /* پنجرهٔ افزودن فقط عضویتِ قطعات را دارد؛ تنظیماتِ هر قطعه در کارتِ خودش ویرایش می‌شود */
    perPart="";
  } else if(!onParts.length){
    perPart='<div class="ed-card"><div class="ed-req-note"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>ابتدا از کارتِ بالا یک قطعه انتخاب کنید تا انواعِ سند و پارامترهایش را جداگانه تنظیم کنید.</div></div>';
  } else {
    if(PED.selPart && !onParts.some(function(x){ return x.no===PED.selPart; })) PED.selPart=null;   // قطعهٔ خاموش‌شده؟ انتخاب پاک شود
    var sel=PED.selPart;   // می‌تواند null باشد: هنوز قطعه‌ای انتخاب نشده
    // پیامِ نارنجیِ توجه — تا وقتی قطعه‌ای از منو انتخاب نشده، جای توضیحاتِ عادی می‌نشیند
    var promptNote='<div class="ed-req-note attn">'+ED_ALERT_IC+'برای اعمالِ تغییرات در این بخش، ابتدا قطعهٔ موردِنظر را از منو انتخاب کنید.</div>';

    /* ---- کارتِ انواعِ سندِ قطعه ---- */
    /* در حالتِ تک‌قطعه‌ای دراپ‌داون لازم نیست: قطعه از قبل مشخص است */
    var docHead='<h4 class="ed-sec-t">'+SEC_IC_DOC+'انواعِ سندِ قطعه'+(single?'':pedPartDD('doc',onParts,sel))+'</h4>';
    var docsCard;
    if(!sel){
      docsCard='<div class="ed-card">'+docHead+promptNote+'</div>';
    } else {
      var p2=findProject(PED.c,PED.o,PED.pr);
      var locked=(p2?partDocLockedTypes(p2,sel):{});
      var dmap=PED.docsByPart[sel]||(PED.docsByPart[sel]={});
      var docRows=pedPartDocList(sel).map(function(x){ var on=!!dmap[x.code], lock=!!locked[x.code];
        var extra=lock?'<span class="ed-lock-ic" title="سندِ ثبت‌شده دارد؛ قابلِ غیرفعال‌سازی نیست">'+ED_LOCK_IC+'</span>':'';
        return pedDragRow(on,x.label,x.code,"pedTogglePartDoc('"+esc(x.code)+"')",extra,lock);
      }).join("");
      var hasLock=PED.docMaster.some(function(x){ return locked[x.code]; });
      var lockNote=hasLock?'<div class="ed-req-note">'+ED_LOCK_IC+'این ماژول بدلیل داشتن سند ثبت شده، امکان غیرفعال شدن ندارد.</div>':'';
      docsCard='<div class="ed-card">'+docHead+
        (docRows?'<div class="ed-scroll" data-reorder="part" ondragover="edRowDragOver(event)" ondrop="event.preventDefault()">'+docRows+'</div>':'<div class="ed-req-note">سندِ سطحِ قطعه‌ای تعریف نشده.</div>')+
        lockNote+
        '<div class="ed-req-note"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>اسنادِ بالا مخصوصِ قطعهٔ انتخاب‌شده است؛ برای افزودنِ سندِ جدید به «تنظیمات ◂ انواع اسناد» بروید.</div>'+
        '</div>';
    }

    /* ---- کارتِ پارامترهای قطعه ---- */
    var modHead='<h4 class="ed-sec-t">'+SEC_IC_INFO+'پارامترهای قطعه'+(single?'':pedPartDD('mod',onParts,sel))+'</h4>';
    var modsCard;
    if(!sel){
      modsCard='<div class="ed-card">'+modHead+promptNote+'</div>';
    } else {
      var mmap=PED.modsByPart[sel]||(PED.modsByPart[sel]={});
      /* به ترتیبِ دلخواهِ همین قطعه رسم می‌شود (نه فهرستِ اصلی)، و مثلِ انواعِ سند قابلِ کشیدن است.
         شناسهٔ ردیف برچسبِ پارامتر است، چون پارامتر کدِ کوتاه ندارد. */
      var mIdx={}; PED.paramMaster.forEach(function(m,i){ mIdx[m.label]=i; });
      var modRows=pedPartModList(sel).map(function(x){ var on=!!mmap[x.label];
        var mi=mIdx[x.label];   // اندیس در فهرستِ اصلی — مستقل از ترتیبِ نمایش
        var extra=x.legacy?'<span class="ed-doc-code" title="در فهرستِ اصلی نیست">قدیمی</span>':'';
        return '<div class="ed-doc-row ed-drag'+(on?'':' off')+'" draggable="true" data-code="'+esc(x.label)+'" ondragstart="edRowDragStart(event)" ondragend="edRowDragEnd(event)">'+
          '<button type="button" class="ed-check'+(on?' on':'')+'" role="checkbox" aria-checked="'+(on?'true':'false')+'" aria-label="'+esc(x.label)+'" onclick="pedTogglePartMod('+mi+')"></button>'+
          '<span class="ed-name"><span>'+esc(x.label)+'</span></span>'+
          extra+
          edGripHTML()+
        '</div>';
      }).join("");
      modsCard='<div class="ed-card">'+modHead+
        (modRows?'<div class="ed-scroll" data-reorder="mod" ondragover="edRowDragOver(event)" ondrop="event.preventDefault()">'+modRows+'</div>':'<div class="ed-req-note">پارامتری تعریف نشده.</div>')+
        '<div class="ed-req-note"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>پارامترهای بالا مخصوصِ قطعهٔ انتخاب‌شده است؛ برای افزودن/ویرایشِ پارامتر به «تنظیمات ◂ انواع پارامتر های قطعات» بروید.</div></div>';
    }

    perPart=docsCard+modsCard;
  }
  var sv=document.getElementById("pedSave"); if(sv) sv.disabled=(nPart<1);
  host.innerHTML=partsCard+perPart;
}
async function savePartsPanel(){
  if(pedCountParts()<1){ toast("دست‌کم یک قطعه انتخاب کنید.",true); return; }
  var c=PED.c,o=PED.o,pr=PED.pr, p=findProject(c,o,pr); if(!p) return;
  var parts=PED.parts.filter(function(x){ return x.on; }).map(function(x){ return x.no; });
  var keep={}; parts.forEach(function(pn){ keep[pad2(pn)]=1; });

  /* قطعاتی که کاربر خاموش کرده ولی هنوز سندِ ثبت‌شده دارند.
     چون «قطعاتِ پروژه» = ذخیره‌شده ∪ دارای‌سند، تا وقتی سندِ قطعه هست، خاموش‌کردنِ تنها اثری ندارد.
     پس یا باید همهٔ اسنادِ قطعه هم حذف شود یا قطعه می‌ماند — با تأییدِ صریحِ کاربر. */
  var removed=[];   // [{pn, docs:[...]}]
  projectPartsList(p).forEach(function(pn){
    if(keep[pn]) return;
    var docs=projectDocs(p).filter(function(d){ return pad2(d.partNo)===pn; });
    if(docs.length) removed.push({pn:pn, docs:docs});
  });
  if(removed.length){
    var names=removed.map(function(x){ return "«"+partNameFa(x.pn)+"»"; }).join(" و ");
    var nDoc=removed.reduce(function(s,x){ return s+x.docs.length; },0);
    var ok=await uiConfirm(
      "با حذفِ قطعهٔ "+names+" از این پروژه، همهٔ اسنادِ ثبت‌شدهٔ آن ("+nDoc+" سند شاملِ همهٔ ویرایش‌ها) هم "+
      "به‌طورِ کامل حذف می‌شود و فایل‌هایشان از گوگل‌درایو پاک می‌گردد. این کار برگشت‌ناپذیر است. آیا ادامه می‌دهید؟",
      { danger:true, okLabel:"حذفِ قطعه و اسنادش", cancelLabel:"انصراف", title:"حذفِ کاملِ قطعه" });
    if(!ok) return;   // انصراف: پنل باز می‌ماند و هیچ‌چیز حذف نمی‌شود
    var delNums={};
    removed.forEach(function(x){ x.docs.forEach(function(d){ if(d.drawingNumber) delNums[d.drawingNumber]=1; }); });
    var nums=Object.keys(delNums), i;
    for(i=0;i<nums.length;i++){
      var dr=await api("deleteDocument",{drawingNumber:nums[i]});
      if(!dr||!dr.ok){ toast((dr&&dr.message)||("حذفِ سندِ «"+nums[i]+"» ناموفق بود؛ عملیات متوقف شد."),true);
        await refreshDocuments(); return; }
    }
    // به‌روزرسانیِ خوش‌بینانهٔ محلی تا قطعه بی‌درنگ برود و از union دوباره برنگردد
    DB.documents=DB.documents.filter(function(d){ return !delNums[d.drawingNumber]; });
    var rmSet={}; removed.forEach(function(x){ rmSet[x.pn]=1; });
    p.enabledSlots=csv(p.enabledSlots||"").filter(function(s){ var m=parseSlot(s); return !(m && rmSet[m.part]); }).join(",");
    toast(nDoc+" سند حذف شد");
  }

  /* پیکربندیِ per-part: برای هر قطعهٔ فعال، انواعِ سند و پارامترهایش جداگانه ذخیره می‌شود.
     نوعی که برای قطعه سند دارد همیشه در فهرست می‌ماند (قابلِ حذف نیست). */
  var docsByPart={}, modsByPart={};
  parts.forEach(function(pnRaw){ var pn=pad2(pnRaw);
    var d=PED.docsByPart[pn]||{}, arrD=[];
    pedPartDocList(pn).forEach(function(x){ if(d[x.code]) arrD.push(x.code); });   // فقط فعال‌ها، به ترتیبِ دلخواهِ همین قطعه
    var lock=partDocLockedTypes(p,pn); Object.keys(lock).forEach(function(T){ if(arrD.indexOf(T)<0) arrD.push(T); });
    docsByPart[pn]=arrD;
    var m=PED.modsByPart[pn]||{}, arrM=[];
    pedPartModList(pn).forEach(function(x){ if(m[x.label]) arrM.push(x.label); });   // فقط فعال‌ها، به ترتیبِ دلخواهِ همین قطعه
    modsByPart[pn]=arrM;
  });
  var root=specsRoot(p);
  root.partDocsByPart=docsByPart; root.partModsByPart=modsByPart;
  /* union برای سازگاریِ عقب‌رو + حفظِ برچسب‌های قدیمی: قطعه‌ای که از بیرونِ پنل اضافه شود از این fallback پر می‌شود */
  var modUnion={}; Object.keys(modsByPart).forEach(function(pn){ modsByPart[pn].forEach(function(l){ modUnion[l]=1; }); });
  root.partMods=PED.paramMaster.map(function(x){ return {label:x.label,unit:"",on:!!modUnion[x.label]}; });
  var docUnion={}; Object.keys(docsByPart).forEach(function(pn){ docsByPart[pn].forEach(function(cd){ docUnion[cd]=1; }); });
  root.partDocTypes=Object.keys(docUnion);
  /* مقادیرِ per-part از PED.vals: فقط قطعاتِ فعال و فقط مقادیرِ ناخالی نگه داشته می‌شوند */
  var pv={};
  Object.keys(PED.vals||{}).forEach(function(pn){
    if(!keep[pad2(pn)]) return;
    var row={}, src=PED.vals[pn]||{};
    Object.keys(src).forEach(function(l){ var v=String(src[l]==null?"":src[l]).trim(); if(v) row[l]=v; });
    if(Object.keys(row).length) pv[pad2(pn)]=row;
  });
  root.partVals=pv;
  p.projectParts=parts.join(",");
  closeModal();
  var extra={projectParts:p.projectParts};
  if(removed.length) extra.enabledSlots=p.enabledSlots;
  await saveSpecs(c,o,pr,root,extra);
}

/* ============ مدلِ سه‌بعدیِ پروژه — نوعِ سندِ «3D» روی قطعهٔ 00 ============
   بدونِ سازوکارِ ذخیرهٔ تازه: مدل مثلِ هر سندِ دیگر با همان جریانِ آپلود (createDocument)
   در Drive ذخیره می‌شود و ویوئر فایل را با همان api("getFile") می‌خواند. کتابخانهٔ
   نمایش به‌صورتِ محلی و فقط هنگامِ نیاز بارگذاری می‌شود (بدونِ منبعِ بیرونی). */
var MODEL_IC='<svg viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>';
var MODEL_PLAY_IC='<svg viewBox="0 0 24 24" class="ic"><path d="M21 12a9 9 0 1 1-6.22-8.56"/><polyline points="21 3 21 9 15 9"/></svg>';
/* آیا نوعِ سندِ 3D در سیستم تعریف شده؟ (کاربر از «تنظیمات ◂ انواع اسناد» با scope=پروژه اضافه می‌کند) */
function has3DType(){ return docTypesSorted().some(function(t){ return String(t.code).toUpperCase()==="3D"; }); }
/* مدل حالا در سطحِ قطعه است: هر قطعه می‌تواند سندِ نوعِ «3D» خودش را داشته باشد
   (FSM-...-PART-3D-REV). فهرستِ قطعاتِ دارای مدل برای منوی انتخابِ چپِ ویوئر ساخته می‌شود. */
var _mvParts=[];            // [{part,name,fileId,num}] — قطعاتِ دارای مدلِ سه‌بعدی
var _mvPickerExpanded=false; // وضعیتِ باز/بستهٔ منوی انتخابِ قطعه
var _mvLoadSeq=0;           // توکنِ بارگذاری — فقط جدیدترین mvLoadPart اجازهٔ تغییرِ DOM دارد (ضدِ رقابت/تکرار)
var _mvEst=null;            // برآوردگرِ نوارِ پیشرفتِ فعالِ ویوئر — تا تایمرِ بارگذاریِ قبلی با بارگذاریِ جدید روی یک المانِ درصد ننویسد
var _mvCurFileId=null;      // شناسهٔ فایلِ GLBِ مدلِ درحال‌نمایش در پنلِ پروژه (برای منابعِ AR)
function projectModelParts(p){
  /* هر نوعِ سندی که با 3D شروع می‌شود مدلِ سه‌بعدی است (3D برای قطعه، 3DA برای مونتاژ). */
  var all=projectDocs(p).filter(function(d){ return String(d.typeCode).toUpperCase().indexOf("3D")===0 &&
    String(d.isLatest).toLowerCase()==="true"; });
  var byPart={}; all.forEach(function(d){ byPart[pad2(d.partNo)]=d; });
  var out=[];
  /* مدلِ مونتاژِ سطحِ پروژه (قطعهٔ ۰۰) همیشه سلولِ اول است — کلِّ مجموعه پیش از اجزای آن. */
  /* برچسب عمداً ثابتِ Assembly است، نه نامِ کاملِ نوعِ سند: ردیف‌های دیگرِ این منو
     نامِ قطعه‌اند (Shaft، Drive Pinion)، پس این‌جا هم باید کوتاه و هم‌وزن باشد. */
  if(byPart["00"]) out.push({part:"00", name:"Assembly", fileId:byPart["00"].fileId||"", num:byPart["00"].drawingNumber});
  // سپس قطعات، دقیقاً به ترتیبِ فهرستِ قطعاتِ پروژه
  var pns=projectPartsList(p).filter(function(pn){ return pn!=="00" && byPart[pn]; });
  Object.keys(byPart).forEach(function(pn){ if(pn!=="00" && pns.indexOf(pn)<0) pns.push(pn); });   // احتیاط: مدلی که در فهرست نیست
  pns.forEach(function(pn){ var d=byPart[pn];
    out.push({part:pn, name:partName(pn), fileId:d.fileId||"", num:d.drawingNumber}); });
  // شماره‌گذاریِ متوالی از ۱ پس از چیدنِ کاملِ ترتیب
  out.forEach(function(x,i){ x.idx=i+1; });
  return out;
}
/* منوی انتخابِ قطعه — عیناً هم‌طراحیِ تولباکسِ سمتِ راست (شیشه‌ای، ۳۳px، فونتِ ۱۲٫۵)، ولی سمتِ چپ */
var MV_LAYERS_IC='<svg viewBox="0 0 24 24"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>';
function mvPickerHTML(parts, selPart){
  var rows=(parts||[]).map(function(mp){
    var on=pad2(mp.part)===pad2(selPart);
    return '<button class="mv-pick'+(on?' on':'')+'" onclick="mvSelectPart(\''+esc(mp.part)+'\')" title="'+esc(mp.name)+'">'+
      '<span class="mv-pk-no">'+esc(String(mp.idx))+'</span>'+
      '<span class="mv-pick-lab">'+esc(mp.name)+'</span></button>';
  }).join("");
  var attn = selPart ? '' : ' attn';   // تا وقتی مدلی انتخاب نشده، منو آرام «تنفس» می‌کند تا جلبِ توجه شود
  return '<div class="mv-picker'+(_mvPickerExpanded?' expanded':'')+attn+'" id="mvPicker">'+
    '<button class="mv-pick mv-pick-hd" onclick="mvPickerToggle()" title="انتخابِ مدلِ سه‌بعدی" aria-label="انتخابِ مدل">'+MV_LAYERS_IC+'</button>'+
    rows+'</div>';
}
function projectModelHTML(p,admin,c,o,pr){
  _mvParts=projectModelParts(p);
  if(!_mvParts.length){
    var can3D=has3DType();
    return '<div class="mv-empty"><div class="mv-empty-ic">'+MODEL_IC+'</div>'+
      '<div class="mv-empty-t">مدلِ سه‌بعدیِ قطعه‌ای بارگذاری نشده است</div>'+
      (can3D
        ? '<div class="mv-empty-s">'+(admin?'برای هر قطعه، در کارتِ «قطعات پروژه» نوعِ «مدل سه‌بعدی» را فعال و فایلِ GLB را آپلود کنید.':'هنوز برای هیچ قطعه‌ای مدلی ثبت نشده.')+'</div>'
        : '<div class="mv-empty-s">'+(admin?'برای فعال‌سازی، نوعِ سندِ «3D» را در «تنظیمات ◂ انواع اسناد» با سطحِ «قطعه» بسازید.':'مدل سه‌بعدی هنوز فعال نشده.')+'</div>')+
    '</div>';
  }
  return '<div class="mv-shell" id="mvShell">'+
    mvPickerHTML(_mvParts, "")+
    '<div class="mv-ph" id="mvPh">'+
      '<div class="mv-empty-ic">'+MODEL_IC+'</div>'+
      '<div class="mv-empty-t">نمایشِ مدلِ سه‌بعدی</div>'+
      '<div class="mv-empty-s">مدلی را از منوی سمتِ چپ انتخاب کنید.</div>'+
    '</div>'+
  '</div>';
}
/* بارگذاریِ محلیِ کتابخانهٔ model-viewer — فقط یک‌بار و فقط هنگامِ اولین نمایش */
var _mvLibPromise=null;
function ensureModelViewer(){
  if(window.customElements && customElements.get("model-viewer")) return Promise.resolve();
  if(_mvLibPromise) return _mvLibPromise;
  _mvLibPromise=new Promise(function(resolve){
    var s=document.createElement("script"); s.type="module"; s.src="vendor/model-viewer.min.js";
    s.onload=function(){ resolve(); }; s.onerror=function(){ resolve(); };
    document.head.appendChild(s);
    setTimeout(resolve,4000); // مهلتِ رجیسترشدنِ custom element
  });
  return _mvLibPromise;
}
/* انتخابِ قطعه از منوی چپ → بارگذاریِ مدلِ همان قطعه */
function mvSelectPart(part){
  var mp=(_mvParts||[]).filter(function(x){ return pad2(x.part)===pad2(part); })[0];
  if(!mp){ return; }
  if(!mp.fileId){ toast("این مورد مدلی برای نمایش ندارد.",true); return; }
  mvLoadPart(mp.fileId, part);
}
function mvPickerToggle(){ _mvPickerExpanded=!_mvPickerExpanded;
  var el=document.getElementById("mvPicker"); if(!el) return;
  if(_mvPickerExpanded) el.classList.add("expanded"); else el.classList.remove("expanded"); }
/* ============ نوارِ لودینگِ درون‌بخشیِ مشترک (ویوئرِ سه‌بعدی و پیش‌نمایشِ مودالِ سند) ============
   خطِ سوییپِ پیوسته + چیپِ درصد در وسط. inline=true → وسطِ بخش؛ showPct=true → چیپِ درصد دارد.
   کلاس‌محور است (نه id) تا چند نمونه هم‌زمان تداخل نکنند؛ عملیات درونِ یک scope انجام می‌شود. */
function loadBarHTML(inline, showPct){
  return '<div class="mv-load'+(inline?' inline':'')+'">'+
    '<div class="mv-load-track"><span class="mv-load-fill"></span></div>'+
    (showPct?'<span class="mv-load-pct">0٪</span>':'')+'</div>';
}
function loadBarPct(scope, p){ if(!scope) return; var el=scope.querySelector(".mv-load-pct"); if(!el) return;
  p=Math.max(0,Math.min(100,Math.round(p))); el.textContent=p+"٪"; }
/* پیشرفتِ دریافتِ استریمی: درصد اگر total معلوم باشد، وگرنه حجمِ دریافتی (MB) */
function loadBarProgress(scope, loaded, total){ if(!scope) return; var el=scope.querySelector(".mv-load-pct"); if(!el) return;
  el.textContent = total>0 ? (Math.min(99,Math.round(loaded/total*100))+"٪") : ((loaded/1048576).toFixed(1)+" MB"); }
/* پیشرفتِ تخمینیِ نرم — چون بارِ سنگین روی Apps Script «پردازشِ سمتِ سرور» است (بدونِ بایت و بدونِ Content-Length)
   و شمارشِ بایت روی صفر می‌ماند، یک تخمینِ نمایی نشان می‌دهیم تا کاربر حرکت ببیند؛ با real() سیگنالِ واقعی
   (اگر بود) جایش را می‌گیرد و با done() به ۱۰۰ می‌رسد. */
function loadBarEstimate(getScope, cap){
  // پیشرفتِ تخمینی آرام‌تر و واقع‌گرایانه‌تر: دیرتر به سقف می‌رسد و نزدیکِ سقف کند می‌خزد
  // تا کاربر تا پایانِ دانلودِ واقعیِ مدل حسِ «گیرکردن روی ۹۲» نگیرد.
  cap=cap||92; var p=0, useReal=false, timer=setInterval(tick,220);
  function tick(){ if(useReal) return; p += Math.max(0.3,(cap-p)*0.02); if(p>cap)p=cap;
    var s=getScope&&getScope(); if(s) loadBarPct(s, Math.round(p)); }
  function stop(){ if(timer){ clearInterval(timer); timer=null; } }
  return { real:function(v){ useReal=true; var s=getScope&&getScope(); if(s) loadBarPct(s, v); },
           stop:stop, done:function(){ stop(); var s=getScope&&getScope(); if(s) loadBarPct(s, 100); } };
}
function loadBarHide(scope){ if(!scope) return; var el=scope.querySelector(".mv-load"); if(!el) return;
  el.style.opacity="0"; setTimeout(function(){ if(el.parentNode) el.parentNode.removeChild(el); },240); }

async function mvLoadPart(fileId, part){
  if(!fileId){ toast("این قطعه مدلی ندارد.",true); return; }
  _mvCurFileId=fileId;   // برای دکمهٔ واقعیتِ افزوده (منابعِ عمومیِ AR از روی همین شناسه)
  var shell=document.getElementById("mvShell"); if(!shell) return;
  var myToken=++_mvLoadSeq;   // اگر بارگذاریِ تازه‌تری شروع شود، این یکی باید بی‌سروصدا کنار برود
  if(_mvEst){ _mvEst.stop(); _mvEst=null; }   // برآوردگرِ بارگذاریِ قبلی را متوقف کن تا دو تایمر روی یک المانِ درصد ننویسند
  var scope=function(){ return document.getElementById("mvShell"); };
  // به‌جای اورلیِ تمام‌صفحه، نوارِ لودینگِ درون‌ویوئری تا بقیهٔ سایت هم دیده شود
  var _mp=(_mvParts||[]).filter(function(x){ return pad2(x.part)===pad2(part); })[0];
  var _mnm=_mp?_mp.name:"";   // نامِ مدلِ در‌حالِ بارگذاری — تا کاربر بداند کدام قطعه دارد می‌آید
  shell.innerHTML=mvPickerHTML(_mvParts, part)+
    '<div class="mv-ph" id="mvPh"><div class="mv-empty-ic">'+MODEL_IC+'</div>'+
      '<div class="mv-empty-t">در حال بارگذاریِ '+(_mnm?esc(_mnm):"مدل")+'…</div></div>'+
    loadBarHTML(false, true);
  await ensureModelViewer();
  if(myToken!==_mvLoadSeq) return;   // بارگذاریِ جدیدتری جای این را گرفت؛ به DOM دست نزن
  if(!(window.customElements && customElements.get("model-viewer"))){
    loadBarHide(scope());
    var ph0=document.getElementById("mvPh");
    if(ph0) ph0.innerHTML='<div class="mv-empty-ic">'+MODEL_IC+'</div><div class="mv-empty-t">نمایشِ درون‌صفحه در دسترس نیست</div>'+
      '<div class="mv-empty-s">فایلِ <span class="mono">vendor/model-viewer.min.js</span> را در پوشهٔ vendor قرار دهید.</div>';
    return;
  }
  var est=loadBarEstimate(scope, 92);   // پیشرفتِ نرمِ تخمینی تا نوار روی صفر نماند
  _mvEst=est;
  try{
    var r=await getFileRetry(fileId, {onProgress: function(loaded,total){ if(myToken===_mvLoadSeq && total>0) est.real(Math.min(99,Math.round(loaded/total*100))); }});
    if(myToken!==_mvLoadSeq){ est.stop(); return; }   // منسوخ شد — نتیجه را دور بریز
    if(!r||!r.ok){ est.stop(); loadBarHide(scope()); var ph1=document.getElementById("mvPh"); if(ph1) ph1.innerHTML='<div class="mv-empty-t">دریافتِ مدل ناموفق بود.</div>'+mvRetryBtn(fileId,part); return; }
    var blob=b64toBlob(r.base64, r.mimeType||"model/gltf-binary");
    var url=previewBlobUrl("mvModel", blob);
    var sh=document.getElementById("mvShell"); if(!sh){ est.stop(); return; }
    // مدل را جای placeholder بگذار و تولباکس را اضافه کن؛ نوار و منو دست‌نخورده می‌مانند (تخمین ادامه دارد)
    var ph=document.getElementById("mvPh");
    if(!ph){ est.stop(); return; }   // placeholder نیست ⇒ وضعیتِ غیرمنتظره؛ هرگز مدلِ دوم اضافه نکن
    var mvTag='<model-viewer id="mvEl" src="'+url+'" camera-controls touch-action="pan-y" shadow-intensity="1" exposure="0.95" '+
      'ar ar-modes="webxr scene-viewer quick-look" ar-scale="auto" alt="مدلِ سه‌بعدیِ قطعهٔ '+esc(pad2(part))+'" style="width:100%;height:100%">'+
      '<button slot="ar-button" class="mv-ar"></button></model-viewer>';
    ph.outerHTML=mvTag;
    if(!sh.querySelector(".mv-tools")) sh.insertAdjacentHTML("afterbegin", mvToolbarHTML());
    var mv=document.getElementById("mvEl");
    if(mv){ mv.addEventListener("load", function(){ if(myToken===_mvLoadSeq){ est.done(); loadBarHide(scope()); } }); }
    else { est.done(); loadBarHide(scope()); }
  }catch(e){ est.stop(); loadBarHide(scope()); var ph2=document.getElementById("mvPh"); if(ph2) ph2.innerHTML='<div class="mv-empty-t">خطا در بارگذاری مدل.</div>'+mvRetryBtn(fileId,part); }
}
/* دکمهٔ «تلاش مجدد» بارگذاریِ مدلِ سه‌بعدی از ابتدا (روی خطا/عدمِ دریافت) */
function mvRetryBtn(fileId, part){
  return '<button class="btn sm mv-retry" onclick="mvLoadPart(\''+esc(String(fileId))+'\',\''+esc(String(part))+'\')">'+
    '<svg viewBox="0 0 24 24" style="width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>تلاش مجدد</button>';
}
/* منوی ابزارِ ویوئر — همبرگر + واقعیت افزوده + تمام‌صفحه + چرخش + نمای اولیه.
   ویوئر-مستقل است: هم در پنلِ پروژه (#mvEl داخلِ .mv-shell) و هم در مودالِ سند (#dmMv داخلِ .mv-toolwrap)
   کار می‌کند؛ توابع ویوئر و ظرف را از روی خودِ دکمه پیدا می‌کنند (بدونِ id، تا تداخلِ id رخ ندهد). */
function mvToolbarHTML(){
  var burger='<svg viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>';
  var arIc='<svg viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>';
  var full='<svg viewBox="0 0 24 24"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>';
  var spin='<svg viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-6.22-8.56"/><polyline points="21 3 21 9 15 9"/></svg>';
  var reset='<svg viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>';
  return '<div class="mv-tools">'+
    '<button class="mv-tool mv-burger" onclick="mvToolsToggle(this)" title="ابزارها" aria-label="ابزارها">'+burger+'</button>'+
    '<button class="mv-tool" onclick="mvAR(this)" title="مشاهده در واقعیت افزوده"><span class="mv-lab">واقعیت افزوده</span>'+arIc+'</button>'+
    '<button class="mv-tool" onclick="mvFull(this)" title="تمام‌صفحه"><span class="mv-lab">تمام‌صفحه</span>'+full+'</button>'+
    '<button class="mv-tool" onclick="mvSpin(this)" title="چرخش خودکار"><span class="mv-lab">چرخش خودکار</span>'+spin+'</button>'+
    '<button class="mv-tool" onclick="mvReset(this)" title="نمای اولیه"><span class="mv-lab">نمای اولیه</span>'+reset+'</button>'+
  '</div>';
}
/* ظرفِ ویوئرِ همین دکمه (پنلِ پروژه یا مودالِ سند) و خودِ model-viewer درونش */
function mvBoxOf(btn){ return (btn&&btn.closest)?btn.closest(".mv-shell,.mv-toolwrap"):null; }
function mvViewerOf(btn){ var box=mvBoxOf(btn); var m=box?box.querySelector("model-viewer"):null;
  return m||document.getElementById("mvEl")||document.getElementById("dmMv"); }
function mvToolsToggle(btn){ var t=(btn&&btn.closest)?btn.closest(".mv-tools"):null; if(t) t.classList.toggle("expanded"); }
function mvFull(btn){ var s=mvBoxOf(btn)||document.getElementById("mvShell");
  if(s&&s.requestFullscreen) try{ s.requestFullscreen(); }catch(e){} }
function mvSpin(btn){ var m=mvViewerOf(btn); if(!m) return;
  if(m.hasAttribute("auto-rotate")){ m.removeAttribute("auto-rotate"); if(btn) btn.classList.remove("on"); }
  else { m.setAttribute("auto-rotate",""); if(btn) btn.classList.add("on"); } }
function mvReset(btn){ var m=mvViewerOf(btn); if(!m) return;
  try{ m.cameraOrbit="auto auto auto"; if(m.resetTurntableRotation) m.resetTurntableRotation(); if(m.jumpCameraToGoal) m.jumpCameraToGoal(); }catch(e){} }
/* ============ واقعیتِ افزوده (AR) ============
   دکمهٔ AR آگاه از دستگاه است: iPhone → AR Quick Look با فایلِ USDZ · Android → Scene Viewer با فایلِ GLB ·
   دسکتاپ → کدِ QRِ واقعی که به صفحهٔ سبکِ ar.html اشاره می‌کند تا کاربر با موبایل اسکن و در AR باز کند.
   فایل‌ها هنگامِ ثبت «عمومی (هرکس با لینک)» شده‌اند تا اپ‌های AR بتوانند واکشی‌شان کنند. */
function driveDirectUrl(id){ return id ? "https://drive.google.com/uc?export=download&id="+id : ""; }
function arPlatform(){
  var ua=navigator.userAgent||"";
  if(/iPad|iPhone|iPod/.test(ua) || (navigator.platform==="MacIntel" && navigator.maxTouchPoints>1)) return "ios";
  if(/Android/i.test(ua)) return "android";
  return "desktop";
}
/* سندِ مربوط به ویوئرِ همین دکمه: مودالِ سند → از روی ریویژنِ انتخاب‌شده؛ پنلِ پروژه → از روی شناسهٔ GLBِ درحال‌نمایش */
function mvArDoc(btn){
  var box=mvBoxOf(btn);
  // ویوئرِ مودالِ سند: سند از روی ریویژنِ انتخاب‌شده مشخص می‌شود
  if(box && box.querySelector("#dmMv")){
    if(typeof _dm!=="undefined" && _dm && _dm.selNum){
      var d=docByNumber(_dm.selNum); if(d) return d;
    }
    return null;   // ⚠ به _mvCurFileId برنگرد: آن مالِ پنلِ پروژه است
  }
  /* پنلِ پروژه: شناسهٔ مدلِ درحال‌نمایش. فقط وقتی معتبر است که همین ویوئر روی صفحه باشد،
     وگرنه مقدارِ به‌جامانده از مدلِ قبلی باعث می‌شد AR سندِ اشتباهی را باز کند. */
  if(_mvCurFileId && document.getElementById("mvShell")){
    var m=(DB.documents||[]).filter(function(x){ return String(x.fileId)===String(_mvCurFileId); })[0];
    if(m) return m;
  }
  return null;
}
function mvAR(btn){
  var mv=mvViewerOf(btn), d=mvArDoc(btn);
  if(!d || (!d.fileId && !d.usdzFileId)){
    if(mv && mv.canActivateAR){ try{ mv.activateAR(); return; }catch(e){} }   // آخرین چاره: AR درون‌مرورگر
    showARQr(null); return;
  }
  var src={ glbId:d.fileId||"", usdzId:d.usdzFileId||"", drawingNumber:d.drawingNumber||"",
            glbUrl:driveDirectUrl(d.fileId), usdzUrl:driveDirectUrl(d.usdzFileId) };
  // اطمینان از عمومی‌بودنِ فایل‌ها (اسنادِ جدید از قبل عمومی‌اند؛ این تضمینِ اسنادِ قدیمی است) — بدونِ انتظار تا ژستِ کلیک برای iOS حفظ شود
  try{ var pr=api("arSources", d.drawingNumber?{drawingNumber:d.drawingNumber}:{fileId:d.fileId}); if(pr&&pr.catch) pr.catch(function(){}); }catch(e){}
  arLaunch(src, mv);
}
function arLaunch(src, mv){
  var plat=arPlatform();
  if(plat==="ios"){
    // نبودِ فایل → همان پنلِ هشدار (هم‌شکل با دسکتاپ)، نه فقط یک توستِ گذرا
    if(!src.usdzUrl){ showARQr(src); return; }
    var a=document.createElement("a"); a.setAttribute("rel","ar"); a.href=src.usdzUrl;
    var img=document.createElement("img"); img.style.display="none"; a.appendChild(img);   // Quick Look به یک فرزندِ img نیاز دارد
    document.body.appendChild(a); a.click();
    setTimeout(function(){ if(a.parentNode) a.parentNode.removeChild(a); }, 1500);
  } else if(plat==="android"){
    if(!src.glbUrl){ showARQr(src); return; }
    var fb=arPageUrl(src);   // اگر ARCore نبود، به همان صفحهٔ ar.html برگردد
    window.location.href="intent://arvr.google.com/scene-viewer/1.0?file="+encodeURIComponent(src.glbUrl)+
      "&mode=ar_preferred&title="+encodeURIComponent(src.drawingNumber||"مدلِ سه‌بعدی")+
      "#Intent;scheme=https;package=com.google.android.googlequicksearchbox;action=android.intent.action.VIEW;"+
      "S.browser_fallback_url="+encodeURIComponent(fb)+";end;";
  } else {
    if(mv && mv.canActivateAR){ try{ mv.activateAR(); return; }catch(e){} }
    showARQr(src);   // دسکتاپ: QR برای اسکن با موبایل
  }
}
/* نشانیِ صفحهٔ سبکِ AR (کنارِ index.html، حتی در زیرمسیرِ GitHub Pages) با شناسه‌های فایل */
function arPageBase(){ return location.href.replace(/[?#].*$/,"").replace(/[^/]*$/,""); }
function arPageUrl(src){
  var u=arPageBase()+"ar.html?g="+encodeURIComponent(src.glbId||"");
  if(src.usdzId) u+="&u="+encodeURIComponent(src.usdzId);
  if(src.drawingNumber) u+="&n="+encodeURIComponent(src.drawingNumber);
  return u;
}
/* هشدارِ کمبودِ فایلِ AR — همان الگوی .ed-req-note: آیکون + متن، این‌بار قرمز.
   GLB برای اندروید لازم است و USDZ برای آیفون؛ نبودِ هرکدام یک پلتفرم را از کار می‌اندازد. */
function arWarnHTML(src){
  var miss=[];
  if(!src || !src.glbId)  miss.push("GLB (برای اندروید)");
  if(!src || !src.usdzId) miss.push("USDZ (برای آیفون)");
  if(!miss.length) return "";
  var ic='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>'+
         '<line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
  var txt = miss.length===2
    ? "برای این سند هیچ فایلِ واقعیتِ افزوده‌ای بارگذاری نشده است؛ نمایش در AR ممکن نیست."
    : "فایلِ "+miss[0]+" برای این سند بارگذاری نشده است؛ روی آن دستگاه نمایش در AR ممکن نیست.";
  return '<div class="ar-warn">'+ic+'<span>'+esc(txt)+'</span></div>';
}
function showARQr(src){
  var url=(src && (src.glbId||src.usdzId)) ? arPageUrl(src) : null;
  var warn=arWarnHTML(src);
  /* ⚠ اگر هیچ فایلی نباشد، QR ساخته نمی‌شود. پیش‌تر این‌جا یک کدِ تصادفیِ بی‌معنی
     (fakeQrSvg) نمایش داده می‌شد که اسکن نمی‌شد و کاربر را سردرگم می‌کرد. */
  var code=url?qrSvg(url):"";
  var body='<div class="qr-body">'+warn;
  if(code){
    body+='<div class="qr-sub">این کد را با دوربینِ موبایل اسکن کنید تا مدل به‌صورتِ واقعیتِ افزوده روی گوشی باز شود.</div>'+
          '<div class="qr-code">'+code+'</div>'+
          (src.drawingNumber?'<div class="qr-sub mono" style="direction:ltr;margin:14px 0 0">'+esc(src.drawingNumber)+'</div>':'');
  } else if(url){
    // فایل هست ولی ساختِ QR ممکن نشد — نشانی را مستقیم بده تا کاربر بی‌راه‌حل نماند
    body+='<div class="qr-sub">ساختِ کدِ QR ممکن نشد. این نشانی را روی موبایل باز کنید:</div>'+
          '<div class="qr-sub mono" style="direction:ltr;word-break:break-all">'+esc(url)+'</div>';
  }
  body+='</div>';
  showModal("مشاهده در واقعیت افزوده", body, "box-narrow");
}
/* کدِ QRِ واقعی از روی کتابخانهٔ vendor/qrcode.min.js (byte mode، سطحِ M). ماژول‌ها به‌صورتِ SVG با حاشیهٔ آرام (quiet zone).
   ⚠ اگر کتابخانه در دسترس نباشد یا رمزگذاری شکست بخورد، رشتهٔ خالی برمی‌گردد.
   قبلاً این‌جا یک کدِ تصادفی (fakeQrSvg) ساخته می‌شد که ظاهرِ QR داشت ولی اسکن نمی‌شد؛
   کدِ بی‌معنی بدتر از نبودِ کد است، چون کاربر بیهوده تلاش می‌کند. */
function qrSvg(text){
  var q;
  if(typeof qrcode==="undefined") return "";
  try{ q=qrcode(0,"M").addData(text).make(); }catch(e){ return ""; }
  var n=q.getModuleCount(), quiet=4, size=n+quiet*2, rects="";
  for(var r=0;r<n;r++) for(var c=0;c<n;c++) if(q.isDark(r,c))
    rects+='<rect x="'+(c+quiet)+'" y="'+(r+quiet)+'" width="1" height="1"/>';
  return '<svg viewBox="0 0 '+size+' '+size+'" shape-rendering="crispEdges" preserveAspectRatio="xMidYMid meet">'+
    '<rect width="'+size+'" height="'+size+'" fill="#fff"/><g fill="#1c1c1e">'+rects+'</g></svg>';
}

/* بازسازی تب پس از reload داده */
function rerenderProjectTab(){
  if(_projView.mode==="detail") showProjectDetail(_projView.c,_projView.o,_projView.pr);
  else renderClientPanel();
}
