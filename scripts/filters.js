/* ================= موتورِ فیلترِ چیپ‌محور (مشترکِ همهٔ بخش‌ها) =================
   یک پاپ‌اوورِ دوپنله: پنلِ راست فهرستِ فیلدها، پنلِ چپ مقادیرِ فیلدِ انتخاب‌شده.
   هر فیلد چندانتخابی است: درونِ یک فیلد «یا» و بینِ فیلدها «و».
   هر بخش (آرشیو، ردیابی، …) با filtRegister «مشخصاتِ» خودش را می‌دهد:
     fields   : [{id,label}]                       — ستونِ راستِ منو
     sel      : {id:[values]}                      — مخزنِ انتخاب‌ها (منبعِ حقیقت)
     values(id): [{value, fa, en|enHtml}]          — گزینه‌های هر فیلد
     label(id,val): برچسبِ خواناى یک مقدار برای چیپ
     prune()  : (اختیاری) پاک‌سازیِ انتخاب‌های ناسازگار پس از تغییر
     onChange(): رندرِ دوبارهٔ همان بخش
     chipsHost/addBtnId: شناسهٔ ظرفِ چیپ‌ها و دکمهٔ + داخلِ آن
   ⚠ همهٔ توابعِ عمومی کلیدِ بخش را به‌عنوانِ اولین آرگومان می‌گیرند، چون از داخلِ
   onclickهای رشته‌ای صدا زده می‌شوند و باید بدانند به کدام بخش تعلق دارند. */
var FILT_SPECS = {};
function filtRegister(key, spec){ FILT_SPECS[key] = spec; }
function filtSpec(key){ return FILT_SPECS[key] || null; }
function filtSelOf(key, id){ var sp=filtSpec(key); return (sp && sp.sel[id]) || []; }
function filtHasVal(key, id, val){ return filtSelOf(key,id).indexOf(val)>=0; }
function filtFieldLabel(key, id){
  var sp=filtSpec(key); if(!sp) return id;
  for(var i=0;i<sp.fields.length;i++) if(sp.fields[i].id===id) return sp.fields[i].label;
  return id;
}
var FILT_CHEV='<svg viewBox="0 0 24 24" class="ic"><polyline points="15 6 9 12 15 18"/></svg>';        // ← بازشدنِ پنلِ کناری (RTL: چپ)

/* تاگلِ روشن/خاموشِ یک مقدار (منو باز می‌ماند تا تاگل‌ها دیده شوند) */
function filtToggleVal(key, id, val){
  var sp=filtSpec(key); if(!sp) return;
  var arr=sp.sel[id]; if(!arr) return;
  var i=arr.indexOf(val), nowOn=i<0;
  if(nowOn) arr.push(val); else arr.splice(i,1);           // هر مقدار مستقل روشن/خاموش می‌شود
  if(typeof sp.prune==="function") sp.prune(id);
  sp.onChange();         // چیپ‌ها + محتوای بخش
  filtRerenderMenu();    // به‌روزرسانیِ تاگل‌های منو (منو باز می‌ماند)
  filtCrossfade(val, nowOn);
}
/* حذفِ یک مقدار از چیپ؛ بدونِ val کلِ دسته پاک می‌شود */
function filtClear(key, id, val){
  var sp=filtSpec(key); if(!sp||!sp.sel[id]) return;
  sp.sel[id] = (val==null) ? [] : sp.sel[id].filter(function(v){ return v!==val; });
  if(typeof sp.prune==="function") sp.prune(id);
  sp.onChange();
}
/* پاک‌کردنِ همهٔ فیلترهای یک بخش (بدونِ دست‌زدن به جستجوی متنی) */
function filtClearAll(key){
  var sp=filtSpec(key); if(!sp) return;
  sp.fields.forEach(function(f){ sp.sel[f.id]=[]; });
  sp.onChange();
}
/* ═══ کراس‌فیدِ تاگل‌های مقدار ═══
   ⚠ گذارِ .ed-check از قبل در CSS تعریف شده بود ولی هیچ‌وقت دیده نمی‌شد: منو پس از
   هر کلیک با innerHTML از نو ساخته می‌شود و گذارِ CSS فقط روی عنصری اجرا می‌شود که
   *پیش از تغییر* وجود داشته — دایره‌ی تازه‌ساخته مستقیم در حالتِ نهایی متولد می‌شد.
   راه‌حل: پس از بازسازی، تاگلِ کلیک‌شده یک لحظه به حالتِ پیش از کلیک برمی‌گردد و
   بلافاصله به حالتِ جدید می‌رود. */
function filtCrossfade(val, nowOn){
  if(!_filtMenu) return;
  var bs=_filtMenu.querySelectorAll(".filt-val"), el=null;
  for(var i=0;i<bs.length;i++) if(bs[i].getAttribute("data-val")===val){ el=bs[i].querySelector(".ed-check"); break; }
  if(el) xfReplay(el, "on");            // زیرساختِ مشترک در state.js
}
/* ردیفِ چیپ‌های فعال + دکمهٔ + (فقط وقتی حداقل یک فیلتر فعال است) */
function buildFiltChips(key){
  var sp=filtSpec(key); if(!sp) return;
  var host=document.getElementById(sp.chipsHost); if(!host) return;
  var chips=[];
  sp.fields.forEach(function(f){
    // یک چیپ برای هر مقدارِ روشن. نامِ دسته نوشته نمی‌شود؛ خودِ مقدار گویاست و عنوانِ دسته در tooltip می‌ماند.
    filtSelOf(key,f.id).forEach(function(v){
      chips.push('<span class="filt-chip" title="'+esc(f.label)+'">'+
        '<span class="fc-v">'+esc(sp.label(f.id,v))+'</span>'+
        '<button class="fc-x" title="حذفِ این فیلتر" onclick="filtClear(\''+key+'\',\''+esc(f.id)+'\',\''+esc(v)+'\')">'+ICON.x+'</button></span>');
    });
  });
  if(!chips.length){ host.innerHTML=""; host.hidden=true; filtCloseMenu(); return; }
  host.hidden=false;
  host.innerHTML=chips.join("")+
    '<button class="filt-add" id="'+esc(sp.addBtnId)+'" title="افزودنِ فیلترِ بعدی" onclick="filtToggleMenu(event,\''+esc(sp.addBtnId)+'\',\''+key+'\')">'+ICON.plus+'</button>';
}

/* ═══ پاپ‌اوورِ دوپنله ═══ */
var _filtMenu=null;
function filtMenuHTML(key, activeId){
  var sp=filtSpec(key); if(!sp) return "";
  var fieldList='<div class="filt-fields">'+sp.fields.map(function(f){
    var on=filtSelOf(key,f.id).length>0, h="filtPickField('"+key+"','"+f.id+"')";
    return '<button type="button" class="filt-item filt-field'+(f.id===activeId?' active':'')+(on?' has-val':'')+'" onmouseover="'+h+'" onclick="event.stopPropagation();'+h+'"><span>'+esc(f.label)+'</span>'+FILT_CHEV+'</button>';
  }).join("")+'</div>';
  if(!activeId) return fieldList;   // هنوز فیلدی انتخاب نشده → فقط فهرستِ فیلدها
  var vals=sp.values(activeId).map(function(v){
    var on=filtHasVal(key,activeId,v.value);
    var enPart = v.enHtml ? ('<span class="fv-tag">'+v.enHtml+'</span>') : (v.en ? ('<span class="fv-en">'+esc(v.en)+'</span>') : '');
    return '<button type="button" class="filt-item filt-val'+(on?' sel':'')+'" data-val="'+esc(v.value)+'" onclick="event.stopPropagation();filtToggleVal(\''+key+'\',\''+esc(activeId)+'\',\''+esc(v.value)+'\')">'+
      '<span class="ff-l"><span class="ed-check'+(on?' on':'')+'"></span><span class="fv-fa">'+esc(v.fa)+'</span></span>'+enPart+'</button>';
  }).join("");
  var panel=vals||'<div class="filt-empty">گزینه‌ای نیست</div>';
  return fieldList+'<div class="filt-panel">'+panel+'</div>';
}
function filtPickField(key, id){
  if(!_filtMenu || _filtMenu._active===id) return;   // گاردِ ضدِ رندرِ تکراری هنگامِ حرکتِ موس روی همان فیلد
  _filtMenu._active=id; _filtMenu.innerHTML=filtMenuHTML(_filtMenu._key, id); filtReposition();
}
function filtRerenderMenu(){ if(_filtMenu){ _filtMenu.innerHTML=filtMenuHTML(_filtMenu._key, _filtMenu._active); filtReposition(); } }
function filtReposition(){ var a=_filtMenu&&document.getElementById(_filtMenu._anchor); if(a) filtPosition(a); }
function filtPosition(anchor){
  if(!_filtMenu) return;
  var r=anchor.getBoundingClientRect(), mw=_filtMenu.offsetWidth, mh=_filtMenu.offsetHeight;
  var top=r.bottom+12; if(top+mh>window.innerHeight-8) top=Math.max(8, r.top-mh-12);
  var left=r.right-mw; if(left<8) left=8; if(left+mw>window.innerWidth-8) left=window.innerWidth-8-mw;
  _filtMenu.style.top=Math.max(8,top)+"px"; _filtMenu.style.left=left+"px";
}
function filtOutside(e){ if(_filtMenu && _filtMenu.contains(e.target)) return; filtCloseMenu(); }
/* اسکرولِ صفحه منو را می‌بندد، اما اسکرول در خودِ منو نه (رویداد در فازِ capture می‌آید) */
function filtOnScroll(e){
  var t=e.target;
  if(_filtMenu && t && t.nodeType===1 && (t===_filtMenu || _filtMenu.contains(t))) return;
  filtCloseMenu();
}
function filtCloseMenu(){
  if(!_filtMenu) return;
  _filtMenu.remove(); _filtMenu=null;
  document.removeEventListener("click", filtOutside, false);
  document.removeEventListener("scroll", filtOnScroll, true);
  window.removeEventListener("resize", filtCloseMenu);
}
function filtToggleMenu(ev, anchorId, key){
  ev.stopPropagation();
  var wasFor=_filtMenu && _filtMenu._anchor===anchorId;
  filtCloseMenu();
  if(wasFor) return;   // toggle
  var anchor=document.getElementById(anchorId); if(!anchor) return;
  var m=document.createElement("div"); m.className="filt-pop"; m._anchor=anchorId; m._key=key||"arch";
  m.innerHTML=filtMenuHTML(m._key, null);
  document.body.appendChild(m); _filtMenu=m; filtPosition(anchor);
  setTimeout(function(){
    document.addEventListener("click", filtOutside, false);
    document.addEventListener("scroll", filtOnScroll, true);
    window.addEventListener("resize", filtCloseMenu);
  },0);
}
