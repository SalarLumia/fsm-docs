/* ================= انتخابگر تاریخ دوتقویمی (شمسی / میلادی) =================
   ورودی تاریخ مرورگر فقط میلادی است؛ این جزء همان کار را با امکان جابه‌جایی بین دو
   تقویم انجام می‌دهد. مقدار ذخیره‌شده همیشه ISO میلادی (yyyy-mm-dd) در یک ورودی مخفی
   با همان id است — پس بک‌اند و کد خواننده هیچ تغییری نمی‌خواهند؛ تقویم فقط نمایش است.

   ظاهر از الگوهای موجود سایت: قاب پاپ‌آور منوی فیلتر، سوئیچ .seg، حالت‌های هاور و
   انتخاب آیتم‌های فیلتر. انتخاب تقویم کاربر در مرورگرش به خاطر سپرده می‌شود. */

/* ── تبدیل جلالی ↔ میلادی (الگوریتم حسابی جلالی، هم‌ارز jalaali-js) ──
   روزها با شمارهٔ روز ژولینی (JDN) رد و بدل می‌شوند تا هر دو جهت از یک مسیر بگذرند. */
var DP_BREAKS=[-61,9,38,199,426,686,756,818,1111,1181,1210,1635,2060,2097,2192,2262,2324,2394,2456,3178];
function dpDiv(a,b){ return ~~(a/b); }
function dpMod(a,b){ return a-~~(a/b)*b; }
function dpJalCal(jy){
  var bl=DP_BREAKS.length, gy=jy+621, leapJ=-14, jp=DP_BREAKS[0], jm, jump=0, leap, leapG, march, n, i;
  for(i=1;i<bl;i++){
    jm=DP_BREAKS[i]; jump=jm-jp;
    if(jy<jm) break;
    leapJ=leapJ+dpDiv(jump,33)*8+dpDiv(dpMod(jump,33),4);
    jp=jm;
  }
  n=jy-jp;
  leapJ=leapJ+dpDiv(n,33)*8+dpDiv(dpMod(n,33)+3,4);
  if(dpMod(jump,33)===4 && jump-n===4) leapJ+=1;
  leapG=dpDiv(gy,4)-dpDiv((dpDiv(gy,100)+1)*3,4)-150;
  march=20+leapJ-leapG;
  if(jump-n<6) n=n-jump+dpDiv(jump+4,33)*33;
  leap=dpMod(dpMod(n+1,33)-1,4); if(leap===-1) leap=4;
  return {leap:leap, gy:gy, march:march};
}
function dpG2D(gy,gm,gd){
  var d=dpDiv((gy+dpDiv(gm-8,6)+100100)*1461,4)+dpDiv(153*dpMod(gm+9,12)+2,5)+gd-34840408;
  return d-dpDiv(dpDiv(gy+100100+dpDiv(gm-8,6),100)*3,4)+752;
}
function dpD2G(jdn){
  var j=4*jdn+139361631;
  j=j+dpDiv(dpDiv(4*jdn+183187720,146097)*3,4)*4-3908;
  var i=dpDiv(dpMod(j,1461),4)*5+308;
  var gd=dpDiv(dpMod(i,153),5)+1, gm=dpMod(dpDiv(i,153),12)+1, gy=dpDiv(j,1461)-100100+dpDiv(8-gm,6);
  return {y:gy, m:gm, d:gd};
}
function dpJ2D(jy,jm,jd){ var r=dpJalCal(jy); return dpG2D(r.gy,3,r.march)+(jm-1)*31-dpDiv(jm,7)*(jm-7)+jd-1; }
function dpD2J(jdn){
  var gy=dpD2G(jdn).y, jy=gy-621, r=dpJalCal(jy), k=jdn-dpG2D(gy,3,r.march), jm, jd;
  if(k>=0){
    if(k<=185){ jm=1+dpDiv(k,31); jd=dpMod(k,31)+1; return {y:jy, m:jm, d:jd}; }
    k-=186;
  } else { jy-=1; k+=179; if(r.leap===1) k+=1; }
  jm=7+dpDiv(k,30); jd=dpMod(k,30)+1;
  return {y:jy, m:jm, d:jd};
}
function dpJalLeap(jy){ return dpJalCal(jy).leap===0; }

/* ── کمکی‌های مستقل از تقویم: هر تاریخ = JDN ──
   هر تقویم زبان خودش را دارد: شمسی = فارسی، ارقام فارسی، راست‌به‌چپ، شنبه‌اول؛
   میلادی = انگلیسی، ارقام لاتین، چپ‌به‌راست، یکشنبه‌اول و قالب ISO (مثل تقویم‌های رایج وب). */
var DP_LOC={
  j:{ dir:"rtl", months:["فروردین","اردیبهشت","خرداد","تیر","مرداد","شهریور","مهر","آبان","آذر","دی","بهمن","اسفند"],
      short:null, week:["ش","ی","د","س","چ","پ","ج"], today:"امروز", clear:"پاک کردن",
      prev:"ماه قبل", next:"ماه بعد", up:"انتخاب ماه و سال" },
  g:{ dir:"ltr", months:["January","February","March","April","May","June","July","August","September","October","November","December"],
      short:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
      week:["Su","Mo","Tu","We","Th","Fr","Sa"], today:"Today", clear:"Clear",
      prev:"Previous", next:"Next", up:"Choose month and year" }
};
function dpToJdn(cal,y,m,d){ return cal==="j"?dpJ2D(y,m,d):dpG2D(y,m,d); }
function dpFromJdn(cal,jdn){ return cal==="j"?dpD2J(jdn):dpD2G(jdn); }
function dpMonthLen(cal,y,m){
  if(cal==="j") return m<=6?31:(m<=11?30:(dpJalLeap(y)?30:29));
  return new Date(Date.UTC(y,m,0)).getUTCDate();
}
function dpP2(n){ return (n<10?"0":"")+n; }
/* ارقام هر تقویم: فارسی برای شمسی، لاتین برای میلادی */
function dpNum(cal,s){ s=String(s); return cal==="j"?s.replace(/[0-9]/g,function(d){ return "۰۱۲۳۴۵۶۷۸۹".charAt(+d); }):s; }
function dpIsoToJdn(iso){
  var m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso||"").trim()); if(!m) return null;
  return dpG2D(+m[1],+m[2],+m[3]);
}
function dpJdnToIso(jdn){ var g=dpD2G(jdn); return g.y+"-"+dpP2(g.m)+"-"+dpP2(g.d); }
function dpTodayJdn(){ var t=new Date(); return dpG2D(t.getFullYear(),t.getMonth()+1,t.getDate()); }
/* ستون هفته. JDN mod 7: دوشنبه=0 … یکشنبه=6. شمسی شنبه‌اول، میلادی یکشنبه‌اول. */
function dpWeekCol(cal,jdn){ return cal==="j"?dpMod(jdn+2,7):dpMod(jdn+1,7); }
/* شمسی: ۱۴۰۵/۰۶/۳۰ — میلادی: 2026-09-21 (ISO 8601) */
function dpFmt(cal,jdn){
  var x=dpFromJdn(cal,jdn);
  return cal==="j"?dpNum("j",x.y+"/"+dpP2(x.m)+"/"+dpP2(x.d)):(x.y+"-"+dpP2(x.m)+"-"+dpP2(x.d));
}
/* معادل تاریخ در تقویم «دیگر» — برای خط راهنمای زیر فیلد. تاریخ داخل جداکنندهٔ
   جهت (LRI…PDI) می‌نشیند تا تاریخ لاتین وسط جملهٔ فارسی به‌هم نریزد. */
function dpEquivText(iso){
  var jdn=dpIsoToJdn(iso); if(jdn==null) return "";
  var other=DP.cal==="j"?"g":"j";
  return (other==="j"?"معادل شمسی: ":"معادل میلادی: ")+"⁦"+dpFmt(other,jdn)+"⁩";
}

/* ── وضعیت ── view: d = روزها، m = ماه‌های یک سال، y = دوازده سال (مثل تقویم ویندوز) */
var DP={ cal:"j", id:"", view:"d", vy:0, vm:0, pop:null, field:null };
try{ var _dpc=localStorage.getItem("fsm_dp_cal"); if(_dpc==="g"||_dpc==="j") DP.cal=_dpc; }catch(e){}

var DP_CAL_IC='<svg viewBox="0 0 24 24" class="ic"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';
var DP_R_IC='<svg viewBox="0 0 24 24" class="ic"><polyline points="9 18 15 12 9 6"/></svg>';
var DP_L_IC='<svg viewBox="0 0 24 24" class="ic"><polyline points="15 18 9 12 15 6"/></svg>';

/* فیلد تاریخ: ورودی مخفی ISO (همان id) + دکمه‌ای به شکل ورودی که پاپ‌آور را باز می‌کند.
   onInput (اختیاری) = کد اجرایی پس از هر تغییر، مثل oninput ورودی قدیمی. */
function dpFieldHTML(id, iso, onInput){
  return '<input type="hidden" id="'+id+'" value="'+esc(iso||"")+'"'+(onInput?' oninput="'+esc(onInput)+'"':'')+'>'+
    '<button type="button" class="dp-field" id="'+id+'Btn" aria-haspopup="dialog" onclick="dpToggle(\''+id+'\')">'+
      DP_CAL_IC+'<span class="dp-val" id="'+id+'Val">'+dpFieldText(iso)+'</span>'+
      '<span class="dp-cal-tag" id="'+id+'Tag">'+(DP.cal==="j"?"شمسی":"میلادی")+'</span>'+
    '</button>';
}
function dpFieldText(iso){
  var jdn=dpIsoToJdn(iso);
  return jdn==null?'<span class="dp-ph">انتخاب کنید</span>':dpFmt(DP.cal,jdn);
}
function dpSyncField(id){
  var inp=document.getElementById(id); if(!inp) return;
  /* خود فیلد بخشی از فرم فارسی است و با تقویم عوض نمی‌شود (جهت و متن پیش‌فرض ثابت)؛
     فقط تاریخ داخلش و برچسب تقویم به تقویم انتخاب‌شده درمی‌آیند. */
  var v=document.getElementById(id+"Val"), t=document.getElementById(id+"Tag");
  if(v) v.innerHTML=dpFieldText(inp.value);
  if(t) t.textContent=DP.cal==="j"?"شمسی":"میلادی";
}

/* ── پاپ‌آور ── */
function dpToggle(id){ if(DP.pop && DP.id===id) dpClose(); else dpOpen(id); }
function dpOpen(id){
  dpClose();
  var inp=document.getElementById(id), btn=document.getElementById(id+"Btn"); if(!inp||!btn) return;
  DP.id=id; DP.field=btn; DP.view="d";
  var base=dpIsoToJdn(inp.value); if(base==null) base=dpTodayJdn();
  var x=dpFromJdn(DP.cal,base); DP.vy=x.y; DP.vm=x.m;
  var p=document.createElement("div"); p.className="dp-pop dd-anim"; p.setAttribute("role","dialog"); p.setAttribute("aria-label","انتخاب تاریخ");
  /* پوسته یک‌بار ساخته می‌شود: سوئیچ تقویم (بخشی از رابط فارسی، همیشه راست‌به‌چپ) ثابت
     می‌ماند تا کراس‌فید .seg-btn پخش شود؛ فقط .dp-body از نو ساخته می‌شود. */
  p.innerHTML=
    '<div class="seg dp-seg">'+
      '<button type="button" class="seg-btn'+(DP.cal==="j"?" on":"")+'" data-cal="j" onclick="dpSetCal(\'j\')">شمسی</button>'+
      '<button type="button" class="seg-btn'+(DP.cal==="g"?" on":"")+'" data-cal="g" onclick="dpSetCal(\'g\')">میلادی</button>'+
    '</div><div class="dp-body"></div>';
  document.body.appendChild(p); DP.pop=p;
  btn.classList.add("open");
  dpRender(); dpPlace();
  /* بستن با کلیک بیرون، اسکرول هر ظرف، و تغییر اندازهٔ پنجره (مثل منوی فیلتر) */
  setTimeout(function(){
    document.addEventListener("pointerdown",dpOutside,true);
    window.addEventListener("scroll",dpOnScroll,true);
    window.addEventListener("resize",dpClose);
  },0);
}
function dpClose(){
  if(!DP.pop) return;
  popClose(DP.pop); DP.pop=null;
  if(DP.field) DP.field.classList.remove("open");
  document.removeEventListener("pointerdown",dpOutside,true);
  window.removeEventListener("scroll",dpOnScroll,true);
  window.removeEventListener("resize",dpClose);
}
function dpOutside(e){ if(DP.pop && !DP.pop.contains(e.target) && !(DP.field&&DP.field.contains(e.target))) dpClose(); }
function dpOnScroll(e){ if(DP.pop && !DP.pop.contains(e.target)) dpClose(); }
/* Escape: در نمای ماه/سال یک پله برمی‌گردد (مثل ویندوز)، در نمای روزها پاپ‌آور را می‌بندد.
   هرگز پنجرهٔ دربرگیرنده را نمی‌بندد — پس در فاز capture و پیش از بقیه. */
window.addEventListener("keydown",function(e){
  if(e.key!=="Escape" || !DP.pop) return;
  e.stopPropagation();
  if(DP.view==="y"){ DP.view="m"; dpRender(); }
  else if(DP.view==="m"){ DP.view="d"; dpRender(); }
  else { dpClose(); if(DP.field) DP.field.focus(); }
},true);
/* زیر فیلد، لبهٔ راست هم‌تراز با فیلد (RTL)؛ اگر پایین جا نبود، بالای فیلد */
function dpPlace(){
  var p=DP.pop, b=DP.field; if(!p||!b) return;
  var r=b.getBoundingClientRect(), w=p.offsetWidth, h=p.offsetHeight, gap=6;
  var left=Math.max(8, Math.min(r.right-w, window.innerWidth-w-8));
  var down=(r.bottom+gap+h<=window.innerHeight-8), top=down?r.bottom+gap:Math.max(8,r.top-gap-h);
  p.classList.toggle("up", !down);
  p.style.left=left+"px"; p.style.top=top+"px";
}

/* ── رندر: سه نما با یک قاب (عنوان کلیک‌پذیر + دو فلش + شبکه) ── */
function dpRender(){
  var body=DP.pop&&DP.pop.querySelector(".dp-body"); if(!body) return;
  var cal=DP.cal, L=DP_LOC[cal], inp=document.getElementById(DP.id);
  var sel=inp?dpIsoToJdn(inp.value):null, today=dpTodayJdn();
  var selD=sel!=null?dpFromJdn(cal,sel):null, todD=dpFromJdn(cal,today);
  var title, grid, cls, up=true;
  if(DP.view==="d"){
    var first=dpToJdn(cal,DP.vy,DP.vm,1), len=dpMonthLen(cal,DP.vy,DP.vm), lead=dpWeekCol(cal,first), cells="";
    for(var i=0;i<lead;i++) cells+='<span class="dp-blank"></span>';
    for(var d=1;d<=len;d++){
      var jdn=first+d-1;
      cells+='<button type="button" class="dp-day'+(jdn===sel?" on":"")+(jdn===today?" today":"")+
        '" data-jdn="'+jdn+'" onclick="dpPick('+jdn+')">'+dpNum(cal,d)+'</button>';
    }
    title=L.months[DP.vm-1]+" "+dpNum(cal,DP.vy);
    grid='<div class="dp-week">'+L.week.map(function(w){ return '<span>'+w+'</span>'; }).join("")+'</div>'+
         '<div class="dp-grid dp-days">'+cells+'</div>';
    cls="dp-v-d";
  } else if(DP.view==="m"){
    title=dpNum(cal,DP.vy);
    grid='<div class="dp-grid dp-cells">'+L.months.map(function(nm,k){
      var m=k+1, on=selD&&selD.y===DP.vy&&selD.m===m, now=todD.y===DP.vy&&todD.m===m;
      return '<button type="button" class="dp-cell'+(on?" on":"")+(now?" today":"")+'" data-m="'+m+'" onclick="dpPickMonth('+m+')">'+(L.short?L.short[k]:nm)+'</button>';
    }).join("")+'</div>';
    cls="dp-v-m";
  } else {
    var y0=DP.vy-dpMod(DP.vy,12), ys="";   // بلوک‌های دوازده‌ساله، ثابت و قابل پیش‌بینی
    for(var yy=y0;yy<y0+12;yy++){
      ys+='<button type="button" class="dp-cell'+(selD&&selD.y===yy?" on":"")+(todD.y===yy?" today":"")+'" data-y="'+yy+'" onclick="dpPickYear('+yy+')">'+dpNum(cal,yy)+'</button>';
    }
    title=dpNum(cal,y0)+" – "+dpNum(cal,y0+11);
    grid='<div class="dp-grid dp-cells">'+ys+'</div>';
    cls="dp-v-y"; up=false;   // بالاترین سطح؛ عنوان دیگر جایی نمی‌برد
  }
  /* فلش‌ها به جهت همان تقویم: در راست‌به‌چپ «قبلی» سمت راست است، در چپ‌به‌راست سمت چپ */
  var prevIc=L.dir==="rtl"?DP_R_IC:DP_L_IC, nextIc=L.dir==="rtl"?DP_L_IC:DP_R_IC;
  body.setAttribute("dir",L.dir);
  body.innerHTML=
    '<div class="dp-nav">'+
      '<button type="button" class="icon-btn sm" title="'+L.prev+'" aria-label="'+L.prev+'" onclick="dpShift(-1)">'+prevIc+'</button>'+
      (up?'<button type="button" class="dp-title up" title="'+L.up+'" onclick="dpUp()">'+title+'</button>'
         :'<span class="dp-title">'+title+'</span>')+
      '<button type="button" class="icon-btn sm" title="'+L.next+'" aria-label="'+L.next+'" onclick="dpShift(1)">'+nextIc+'</button>'+
    '</div>'+
    '<div class="dp-view '+cls+'">'+grid+'</div>'+
    '<div class="dp-foot">'+
      '<button type="button" class="btn sm" onclick="dpPick('+today+')">'+L.today+'</button>'+
      (sel!=null?'<button type="button" class="dp-clear" onclick="dpPick(null)">'+L.clear+'</button>':'')+
    '</div>';
}
/* فلش‌ها در هر نما یک واحد همان نما جابه‌جا می‌کنند: ماه / سال / دوازده سال */
function dpShift(delta){
  if(DP.view==="d"){
    var m=DP.vm+delta, y=DP.vy;
    if(m<1){ m=12; y--; } else if(m>12){ m=1; y++; }
    DP.vy=y; DP.vm=m;
  } else DP.vy+=delta*(DP.view==="m"?1:12);
  dpRender();
}
function dpUp(){ DP.view=DP.view==="d"?"m":"y"; dpRender(); }
function dpPickYear(y){ DP.vy=y; DP.view="m"; dpRender(); }
function dpPickMonth(m){ DP.vm=m; DP.view="d"; dpRender(); }
/* جابه‌جایی تقویم: همان لحظه در تقویم دیگر (روز انتخاب‌شده، وگرنه وسط ماه در حال نمایش) */
function dpSetCal(cal){
  if(cal===DP.cal) return;
  var inp=document.getElementById(DP.id), sel=inp?dpIsoToJdn(inp.value):null;
  var cur=sel!=null?dpFromJdn(DP.cal,sel):null;
  var anchor=(cur && cur.y===DP.vy && cur.m===DP.vm) ? sel : dpToJdn(DP.cal,DP.vy,DP.vm,15);
  DP.cal=cal;
  try{ localStorage.setItem("fsm_dp_cal",cal); }catch(e){}
  DP.pop.querySelectorAll(".dp-seg .seg-btn").forEach(function(b){
    var on=b.getAttribute("data-cal")===cal;
    if(typeof xfSet==="function") xfSet(b,"on",on); else b.classList.toggle("on",on);
  });
  var x=dpFromJdn(cal,anchor); DP.vy=x.y; DP.vm=x.m;
  dpRender(); dpSyncField(DP.id);
  if(inp) inp.dispatchEvent(new Event("input"));   // خط «معادل» هم به تقویم دیگر برگردد
}
function dpPick(jdn){
  var inp=document.getElementById(DP.id); if(!inp) return;
  inp.value=(jdn==null)?"":dpJdnToIso(jdn);
  dpSyncField(DP.id);
  inp.dispatchEvent(new Event("input"));
  var f=DP.field; dpClose(); if(f) f.focus();
}
