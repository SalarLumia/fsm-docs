/* ═══ راهنمای موس سایت (جای tooltip خام مرورگر) ═══
   هر title در کل سایت (چه در HTML، چه ساخته‌شده با JS، حتی بعدها) با رسیدن موس به جعبه‌ای هم‌شکل
   راهنمای نمودارهای پیشرفت (.sgt) تبدیل می‌شود و راهنمای خام مرورگر دیگر نمی‌آید.
   قاعده: راهنمایی که فقط همان متن روی صفحه را تکرار می‌کند به‌درد نمی‌خورد و نشان داده نمی‌شود،
   مگر آن متن روی صفحه با «…» کوتاه شده باشد (آن‌وقت نام کامل را نشان می‌دهد).
   title با اولین رسیدن موس به data-tip منتقل می‌شود؛ اگر دکمه متنی ندارد (فقط آیکون)، همان متن
   aria-label هم می‌شود تا صفحه‌خوان‌ها نام دکمه را از دست ندهند.
   متن «…»دار بی‌راهنما (text-overflow:ellipsis، مثل نام پروژه در سایدبار): اگر واقعاً بریده شده باشد، خود متن
   کاملش نشان داده می‌شود؛ پس هر جای سایت که متنی کوتاه شود، بدون title جداگانه هم نام کامل را دارد. */
var _tt={el:null, box:null, timer:0};
var TT_DELAY=350;
function ttNorm(s){ return String(s==null?"":s).replace(/\s+/g," ").trim(); }
/* آیا متن این المان (یا یکی از زیرمجموعه‌هایش) روی صفحه بریده شده؟ */
function ttTruncated(el){
  var list=[el].concat([].slice.call(el.querySelectorAll("*")).slice(0,30));
  for(var i=0;i<list.length;i++){ var x=list[i];
    if(x.clientWidth && x.scrollWidth>x.clientWidth+1) return true;
    if(x.clientHeight && x.scrollHeight>x.clientHeight+1 && getComputedStyle(x).overflow!=="visible") return true; }
  return false;
}
function ttAdopt(el){
  if(!el.hasAttribute("title")) return;
  var t=el.getAttribute("title"); el.removeAttribute("title");
  if(t) el.setAttribute("data-tip", t); else el.removeAttribute("data-tip");
  if(t && !el.hasAttribute("aria-label") && !ttNorm(el.textContent)) el.setAttribute("aria-label", t);
}
/* متن راهنما چیزی بیش از متن روی صفحه دارد؟ */
function ttWorth(el, tip){
  var vis=ttNorm(el.innerText||el.textContent||el.value||""), t=ttNorm(tip);
  if(!t) return false;
  if(t!==vis) return true;          // اطلاعات تازه (مثلاً نام دکمهٔ آیکونی یا توضیح بیشتر)
  return ttTruncated(el);           // همان متن است: فقط اگر روی صفحه کوتاه شده
}
/* نزدیک‌ترین متن «…»دار بریده‌شده زیر موس (تا ۴ لایه بالاتر)؛ برای جاهایی که title ندارند */
function ttCutText(t){
  for(var i=0, e=t; e && e!==document.body && i<4; i++, e=e.parentElement){
    if(e.nodeType!==1) continue;
    if(getComputedStyle(e).textOverflow==="ellipsis" && e.scrollWidth>e.clientWidth+1) return e;
  }
  return null;
}
function ttHide(){
  clearTimeout(_tt.timer); _tt.el=null;
  if(_tt.box) _tt.box.classList.remove("on");
}
function ttShow(el, own){
  var tip=own ? ttNorm(el.innerText||el.textContent) : el.getAttribute("data-tip");
  if(!tip || !document.body.contains(el)) return;
  var b=_tt.box;
  if(!b){ b=_tt.box=document.createElement("div"); b.className="ftip"; b.setAttribute("role","tooltip"); document.body.appendChild(b); }
  b.textContent=tip;
  b.dir=/[؀-ۿ]/.test(tip)?"rtl":"ltr";          // جهت از خود متن: فارسی راست‌به‌چپ، لاتین چپ‌به‌راست
  b.classList.remove("on","down"); b.style.left="0px"; b.style.top="0px";
  var r=el.getBoundingClientRect(), w=b.offsetWidth, h=b.offsetHeight, gap=8;
  var left=Math.max(8, Math.min(r.left+r.width/2-w/2, window.innerWidth-w-8));
  var top=r.top-gap-h, down=top<8;
  if(down) top=r.bottom+gap;
  b.style.left=left+"px"; b.style.top=top+"px"; b.classList.toggle("down", down);
  requestAnimationFrame(function(){ if(_tt.el===el) b.classList.add("on"); });
}
document.addEventListener("mouseover", function(e){
  var el=e.target && e.target.closest ? e.target.closest("[title],[data-tip]") : null, own=false;
  if(el){ ttAdopt(el); if(!el.hasAttribute("data-tip") || !ttWorth(el, el.getAttribute("data-tip"))) el=null; }   // راهنمای بی‌فایده جای متن بریده را نگیرد
  if(!el && e.target && e.target.nodeType===1){ el=ttCutText(e.target); own=!!el; }
  if(el===_tt.el) return;
  ttHide();
  if(!el) return;
  _tt.el=el; _tt.timer=setTimeout(function(){ if(_tt.el===el) ttShow(el, own); }, TT_DELAY);
}, true);
document.addEventListener("mouseout", function(e){
  if(_tt.el && (!e.relatedTarget || !_tt.el.contains(e.relatedTarget))) ttHide();
}, true);
["mousedown","scroll","keydown","wheel"].forEach(function(ev){ window.addEventListener(ev, ttHide, true); });
window.addEventListener("blur", ttHide);
