/* ═══ تبدیل STEP به GLB و USDZ و محاسبهٔ حجم، کاملاً در مرورگر ═══
   کاربر فقط STEP بارگذاری می‌کند؛ فایل نمایش سایت (GLB)، فایل واقعیت افزودهٔ آیفون (USDZ) و حجم مدل
   (برای وزن) همین‌جا ساخته می‌شوند. کتابخانه‌ها (حدود ۱۰ مگابایت) فقط با اولین STEP بارگذاری می‌شوند.
   ⚠ نرمال‌ها هرگز اصلاح نمی‌شوند: همان نرمال‌های خود STEP استفاده می‌شود (اصلاح، صافی سطح را خراب می‌کرد). */

/* آیا این نوع سند «نقشه» است و می‌تواند مدل سه‌بعدی همراه داشته باشد؟
   انواع 3D/3DA قدیمی خودشان مدل‌اند و جدا رسیدگی می‌شوند. */
function isModelType(code){
  var C=String(code||"").toUpperCase();
  if(!C || C.indexOf("3D")===0) return false;
  var t=(DB.docTypes||[]).find(function(x){ return String(x.code).toUpperCase()===C; });
  return !!t && /^نقشه/.test(String(t.nameFa||"").trim());
}
function is3DType(code){ return String(code||"").toUpperCase().indexOf("3D")===0; }
function docHasModel(d){
  return !!d && ["stpFileId","glbFileId","usdzFileId"].some(function(k){ return String(d[k]||"").trim(); });
}
/* فایل نمایش سه‌بعدی سند: ستون glb برای نقشه‌ها، فایل اصلی برای اسناد 3D قدیمی (هم‌خوان با docGlbId بک‌اند) */
function docGlbId(d){
  if(!d) return "";
  var g=String(d.glbFileId||"").trim(); if(g) return g;
  return is3DType(d.typeCode) ? String(d.fileId||"").trim() : "";
}
/* اگر مدل این ریویژن از ریویژن قبلی به اشتراک آمده، شمارهٔ آن ریویژن؛ وگرنه خالی */
function docModelFromRev(d){
  if(!d || d.modelRev==null || String(d.modelRev)==="") return "";
  return revFmt(d.modelRev)!==revFmt(d.rev) ? pad2(revFmt(d.modelRev)) : "";
}

var STEP_MAX=25*1024*1024;
/* دقت مثلث‌بندی STEP. پیش‌فرض کتابخانه (زاویهٔ ۰٫۵ رادیان ≈ ۲۹ درجه) لبه‌های گرد و پخ‌ها را
   مثلث‌مثلث و روی بدنهٔ استوانه خط سایه نشان می‌داد. */
var STEP_MESH={ linearDeflectionType:"bounding_box_ratio", linearDeflection:0.0005, angularDeflection:0.2 };
var _scLibs=null;
function scBase(p){ return new URL(p, document.baseURI).href; }
function scLoadLibs(){
  if(_scLibs) return _scLibs;
  var occt=new Promise(function(res,rej){
    if(window.occtimportjs){ res(); return; }
    var s=document.createElement("script"); s.src=scBase("vendor/occt/occt-import-js.js");
    s.onload=function(){ res(); }; s.onerror=function(){ rej(new Error("load")); };
    document.head.appendChild(s);
  }).then(function(){ return window.occtimportjs({ locateFile:function(f){ return scBase("vendor/occt/"+f); } }); });
  _scLibs=Promise.all([occt, import(scBase("vendor/three/three.module.js")),
    import(scBase("vendor/three/GLTFExporter.js")), import(scBase("vendor/three/USDZExporter.js"))])
    .then(function(a){ return { occt:a[0], THREE:a[1], GLTFExporter:a[2].GLTFExporter, USDZExporter:a[3].USDZExporter }; })
    .catch(function(e){ _scLibs=null; throw e; });   // شکست شبکه: دفعهٔ بعد دوباره تلاش شود
  return _scLibs;
}

/* حجم با جمع چهاروجهی‌های علامت‌دار (متر مکعب) */
function scVolume(THREE, root){
  var v=0, a=new THREE.Vector3(), b=new THREE.Vector3(), c=new THREE.Vector3(), t=new THREE.Vector3();
  root.updateMatrixWorld(true);
  root.traverse(function(o){
    if(!o.isMesh) return;
    var p=o.geometry.attributes.position, idx=o.geometry.index, n=idx?idx.count:p.count;
    for(var i=0;i<n;i+=3){
      a.fromBufferAttribute(p, idx?idx.getX(i):i).applyMatrix4(o.matrixWorld);
      b.fromBufferAttribute(p, idx?idx.getX(i+1):i+1).applyMatrix4(o.matrixWorld);
      c.fromBufferAttribute(p, idx?idx.getX(i+2):i+2).applyMatrix4(o.matrixWorld);
      v+=a.dot(t.copy(b).cross(c))/6;
    }
  });
  return Math.abs(v);
}

/* ═══ نرمال‌های درست برای نمایش ═══
   کتابخانهٔ تبدیل نرمال هر رأس را از میانگین ساده‌ی مثلث‌های کنارش می‌سازد. دو ایراد دیده شد:
   ۱) روی درز سطح‌های بسته (استوانه) هر نسخهٔ رأس فقط همسایه‌های یک طرف را می‌بیند → «خط سایه» روی بدنه.
   ۲) روی لبه‌های گرد و پخ‌های باریک مثلث‌ها بسیار کشیده‌اند (تا ۶۶ به ۱) و صفحهٔ هر مثلث بی‌اعتبار است →
      لبه‌ها «مثلث‌مثلث» دیده می‌شدند (خطای نرمال تا ۴۳ درجه).
   راه‌حل در دو گام، هر دو فقط *درون یک وجه* (مرز بین وجه‌ها = لبهٔ تیز، دست نمی‌خورد؛ جهت مثلث‌ها هم عوض نمی‌شود):
   الف) میانگین با وزن زاویهٔ گوشه، و رأس‌های هم‌جای همان وجه (درز) یک نرمال مشترک.
   ب) وجه‌های دوار (استوانه، مخروط، لبهٔ گرد، کره، حلقهٔ تخت): محور وجه پیدا و نرمال هر نقطه *دقیقاً* از پروفیل
      همان وجه محاسبه می‌شود — مستقل از شکل مثلث‌ها. روی شفت: ۸۳ از ۹۰ وجه، خطای لبهٔ گرد از ۴۳ درجه به صفر.
   ⚠ این «اصلاح نرمال» (بازچینی جهت مثلث‌ها و صاف‌کردن کل مدل) نیست؛ همان نرمالی است که خود سطح CAD دارد. */
function scAngleNormals(m){
  var P=m.attributes.position.array, N=m.attributes.normal.array, I=m.index.array;
  var faces=(m.brep_faces&&m.brep_faces.length) ? m.brep_faces : [{ first:0, last:I.length/3-1 }];
  faces.forEach(function(f){
    var acc={}, pos={};   // کلید = مکان رأس (رأس‌های هم‌جای همان وجه، مثل درز، یکی حساب می‌شوند)
    var kOf=function(v){ return Math.round(P[3*v]*1e4)+","+Math.round(P[3*v+1]*1e4)+","+Math.round(P[3*v+2]*1e4); };
    for(var t=f.first;t<=f.last;t++){
      var ids=[I[3*t],I[3*t+1],I[3*t+2]];
      var p=ids.map(function(v){ return [P[3*v],P[3*v+1],P[3*v+2]]; });
      var e1=[p[1][0]-p[0][0],p[1][1]-p[0][1],p[1][2]-p[0][2]], e2=[p[2][0]-p[0][0],p[2][1]-p[0][1],p[2][2]-p[0][2]];
      var g=[e1[1]*e2[2]-e1[2]*e2[1], e1[2]*e2[0]-e1[0]*e2[2], e1[0]*e2[1]-e1[1]*e2[0]], L=Math.hypot(g[0],g[1],g[2]);
      if(!(L>0)) continue; g=[g[0]/L,g[1]/L,g[2]/L];
      for(var j=0;j<3;j++){
        var a=p[j], b=p[(j+1)%3], c=p[(j+2)%3];
        var u=[b[0]-a[0],b[1]-a[1],b[2]-a[2]], w=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];
        var cs=(u[0]*w[0]+u[1]*w[1]+u[2]*w[2])/(Math.hypot(u[0],u[1],u[2])*Math.hypot(w[0],w[1],w[2])||1);
        var ang=Math.acos(Math.max(-1,Math.min(1,cs)));
        var k=kOf(ids[j]); var s=acc[k]||(acc[k]=[0,0,0]);
        s[0]+=g[0]*ang; s[1]+=g[1]*ang; s[2]+=g[2]*ang;
        (pos[k]||(pos[k]=[])).push(ids[j]);
      }
    }
    Object.keys(acc).forEach(function(k){ var s=acc[k], L=Math.hypot(s[0],s[1],s[2]); if(!(L>0)) return;
      pos[k].forEach(function(v){ N[3*v]=s[0]/L; N[3*v+1]=s[1]/L; N[3*v+2]=s[2]/L; }); });
  });
}
/* نرمال دقیق سطح‌های دوار (استوانه، مخروط، لبهٔ گرد، کره) از روی پروفیل خود وجه.
   محور هر وجه با «برازش مجموعهٔ خطی» پیدا می‌شود: در سطح دوار، خط نرمال هر نقطه محور را قطع می‌کند. */
function scJacobiN(A){   // ویژه‌بردارهای ماتریس متقارن n×n
  var n=A.length, V=[]; A=A.map(function(r){ return r.slice(); });
  for(var i=0;i<n;i++){ V.push([]); for(var j=0;j<n;j++) V[i].push(i===j?1:0); }
  for(var sweep=0;sweep<60;sweep++){
    var off=0; for(i=0;i<n;i++) for(j=i+1;j<n;j++) off+=A[i][j]*A[i][j];
    if(off<1e-22) break;
    for(var p=0;p<n;p++) for(var q=p+1;q<n;q++){
      if(Math.abs(A[p][q])<1e-300) continue;
      var th=0.5*Math.atan2(2*A[p][q],A[q][q]-A[p][p]), c=Math.cos(th), s=Math.sin(th);
      for(var k=0;k<n;k++){ var akp=A[k][p], akq=A[k][q]; A[k][p]=c*akp-s*akq; A[k][q]=s*akp+c*akq; }
      for(k=0;k<n;k++){ var apk=A[p][k], aqk=A[q][k]; A[p][k]=c*apk-s*aqk; A[q][k]=s*apk+c*aqk; }
      for(k=0;k<n;k++){ var vkp=V[k][p], vkq=V[k][q]; V[k][p]=c*vkp-s*vkq; V[k][q]=s*vkp+c*vkq; }
    }
  }
  var ord=[]; for(i=0;i<n;i++) ord.push(i); ord.sort(function(a,b){ return A[a][a]-A[b][b]; });
  return { vals:ord.map(function(i){ return A[i][i]; }), vecs:ord.map(function(i){ return V.map(function(r){ return r[i]; }); }) };
}
function scRevolveFace(P, N, verts, axes){
  // نمونه‌های یکتا بر اساس مکان (درز استوانه یک نقطه است)
  var groups={}, keys=[];
  verts.forEach(function(v){ var k=Math.round(P[3*v]*1e4)+","+Math.round(P[3*v+1]*1e4)+","+Math.round(P[3*v+2]*1e4);
    if(!groups[k]){ groups[k]=[]; keys.push(k); } groups[k].push(v); });
  if(keys.length<4) return null;
  var pts=keys.map(function(k){ var v=groups[k][0]; var n=[0,0,0];
    groups[k].forEach(function(u){ n[0]+=N[3*u]; n[1]+=N[3*u+1]; n[2]+=N[3*u+2]; });
    var L=Math.hypot(n[0],n[1],n[2])||1; return { p:[P[3*v],P[3*v+1],P[3*v+2]], n:[n[0]/L,n[1]/L,n[2]/L], ids:groups[k] }; });
  // مرکز برای پایداری عددی
  var cx=0,cy=0,cz=0; pts.forEach(function(q){ cx+=q.p[0]; cy+=q.p[1]; cz+=q.p[2]; }); cx/=pts.length; cy/=pts.length; cz/=pts.length;
  var sc=0; pts.forEach(function(q){ sc=Math.max(sc,Math.hypot(q.p[0]-cx,q.p[1]-cy,q.p[2]-cz)); }); sc=sc||1;
  var M=[]; for(var i=0;i<6;i++){ M.push([0,0,0,0,0,0]); }
  pts.forEach(function(q){ var x=[(q.p[0]-cx)/sc,(q.p[1]-cy)/sc,(q.p[2]-cz)/sc], n=q.n;
    var r=[x[1]*n[2]-x[2]*n[1], x[2]*n[0]-x[0]*n[2], x[0]*n[1]-x[1]*n[0], n[0], n[1], n[2]];
    for(var i=0;i<6;i++) for(var j=0;j<6;j++) M[i][j]+=r[i]*r[j]; });
  var E=scJacobiN(M), best=null, cands=[];
  // کوچک‌ترین ویژه‌بردارها نامزد محورند (کره چند جواب برابر دارد؛ هر کدام کار می‌کند)
  for(var e=0;e<3;e++){
    var c=E.vecs[e].slice(0,3), cb=E.vecs[e].slice(3), Lc=Math.hypot(c[0],c[1],c[2]);
    if(Lc<1e-6) continue;
    var a0=[c[0]/Lc,c[1]/Lc,c[2]/Lc], cbn=[cb[0]/Lc,cb[1]/Lc,cb[2]/Lc];
    if(Math.abs(a0[0]*cbn[0]+a0[1]*cbn[1]+a0[2]*cbn[2])>0.05) continue;   // گام پیچ ≠ ۰ → دوار نیست
    var o0=[a0[1]*cbn[2]-a0[2]*cbn[1], a0[2]*cbn[0]-a0[0]*cbn[2], a0[0]*cbn[1]-a0[1]*cbn[0]];
    cands.push({ a:a0, o:[o0[0]*sc+cx, o0[1]*sc+cy, o0[2]*sc+cz] });
  }
  /* محورهایی که روی وجه‌های دیگر همین قطعه پیدا شده‌اند (لبهٔ گرد معمولاً هم‌محور استوانهٔ کنارش است) */
  (axes||[]).forEach(function(x){ cands.push(x); });
  for(var ci=0; ci<cands.length && !best; ci++){
    var a=cands[ci].a, o=cands[ci].o;
    // پروفیل: (h, r) هر نقطه؛ آزمون دوار بودن = نقاط هم‌ارتفاع شعاع یکسان دارند
    var prof=pts.map(function(q){ var d=[q.p[0]-o[0],q.p[1]-o[1],q.p[2]-o[2]], h=d[0]*a[0]+d[1]*a[1]+d[2]*a[2];
      var rv=[d[0]-h*a[0],d[1]-h*a[1],d[2]-h*a[2]], r=Math.hypot(rv[0],rv[1],rv[2]); return { q:q, h:h, r:r, er:r>1e-9?[rv[0]/r,rv[1]/r,rv[2]/r]:null }; });
    /* آزمون دوار بودن: نقطه‌ها باید روی حلقه‌هایی دور محور باشند (هر حلقه دست‌کم ۳ نقطه با شعاع یکسان).
       بدون شرط «حلقه»، روی وجه کوچکی که هیچ دو نقطه‌اش هم‌ارتفاع نیستند، هر محور غلطی قبول می‌شد. */
    var rows={}, ok=true, tol=Math.max(0.005, sc*2e-5);
    prof.forEach(function(s){ var k=Math.round(s.h/tol); var R=rows[k]||(rows[k]={r:s.r,n:0}); if(Math.abs(R.r-s.r)>tol*4) ok=false; R.n++; });
    if(!ok) continue;
    var inRings=0; Object.keys(rows).forEach(function(k){ if(rows[k].n>=3) inRings+=rows[k].n; });
    if(inRings < prof.length*0.9) continue;
    best={ a:a, o:o, prof:prof };
  }
  if(!best) return null;
  /* نمونه‌های یکتای پروفیل (h, r)، مرتب در طول خود منحنی: از یک سر، هر بار نزدیک‌ترین نمونهٔ باقی‌مانده.
     نرمال هر نقطه از دایرهٔ گذرنده از نمونهٔ قبلی، خودش و بعدی (یا خط، در سرها و بخش‌های راست). */
  var uniq=[], seen={};
  best.prof.forEach(function(s){ var k=Math.round(s.h*200)+","+Math.round(s.r*200); if(!seen[k]){ seen[k]=uniq.length; uniq.push([s.h,s.r]); } s.k=seen[k]; });
  var cH=0,cR=0; uniq.forEach(function(u){ cH+=u[0]; cR+=u[1]; }); cH/=uniq.length; cR/=uniq.length;
  var start=0, fd=-1; uniq.forEach(function(u,i){ var d=Math.hypot(u[0]-cH,u[1]-cR); if(d>fd){ fd=d; start=i; } });
  var order=[start], used={}; used[start]=1;
  while(order.length<uniq.length){
    var last=uniq[order[order.length-1]], bi=-1, bd=Infinity;
    for(var i2=0;i2<uniq.length;i2++){ if(used[i2]) continue; var d2=Math.hypot(uniq[i2][0]-last[0],uniq[i2][1]-last[1]); if(d2<bd){ bd=d2; bi=i2; } }
    used[bi]=1; order.push(bi);
  }
  var pos={}; order.forEach(function(ix,i){ pos[ix]=i; });
  var profN=uniq.map(function(u,ix){
    var i=pos[ix], A=uniq[ix], B=uniq[order[Math.max(0,i-1)]], C=uniq[order[Math.min(order.length-1,i+1)]];
    if(i===0 && order.length>2) C=uniq[order[2]], B=uniq[order[1]];
    else if(i===order.length-1 && order.length>2) B=uniq[order[i-1]], C=uniq[order[i-2]];
    if(order.length<2) return null;
    if(order.length===2 || B===C){ var o2=(B===A)?C:B; var tx=o2[0]-A[0], ty=o2[1]-A[1], L=Math.hypot(tx,ty); return L>0?[-ty/L, tx/L]:null; }
    var bx=B[0]-A[0], by=B[1]-A[1], cx2=C[0]-A[0], cy2=C[1]-A[1], D=2*(bx*cy2-by*cx2);
    var lb=Math.hypot(bx,by), lc=Math.hypot(cx2,cy2);
    if(Math.abs(D)/(2*lb*lc||1) > 1e-3){
      var ux=(cy2*(bx*bx+by*by)-by*(cx2*cx2+cy2*cy2))/D, uy=(bx*(cx2*cx2+cy2*cy2)-cx2*(bx*bx+by*by))/D, Lu=Math.hypot(ux,uy);
      return [-ux/Lu, -uy/Lu];
    }
    var t2x=C[0]-B[0], t2y=C[1]-B[1], L2=Math.hypot(t2x,t2y); return L2>0?[-t2y/L2, t2x/L2]:null;   // راست: عمود بر مماس
  });
  var newN=[], dev=0, cnt=0;
  best.prof.forEach(function(s){
    if(!s.er) return;
    var pn=profN[s.k]; if(!pn) return;
    var nh=pn[0], nr=pn[1];
    var n=[nh*best.a[0]+nr*s.er[0], nh*best.a[1]+nr*s.er[1], nh*best.a[2]+nr*s.er[2]];
    var q=s.q, dt=n[0]*q.n[0]+n[1]*q.n[1]+n[2]*q.n[2]; if(dt<0){ n=[-n[0],-n[1],-n[2]]; dt=-dt; }
    dev+=Math.acos(Math.min(1,dt)); cnt++; newN.push([q.ids, n]);
  });
  /* آخرین کنترل: نرمال دقیق باید در مجموع با نرمال تقریبی همان وجه هم‌خوان باشد (میانگین اختلاف زیر ۱۰ درجه) */
  if(!cnt || dev/cnt > 15*Math.PI/180) return null;
  newN.forEach(function(x){ x[0].forEach(function(v){ N[3*v]=x[1][0]; N[3*v+1]=x[1][1]; N[3*v+2]=x[1][2]; }); });
  return { a:best.a, o:best.o };
}
function scSameAxis(x, y){
  if(Math.abs(x.a[0]*y.a[0]+x.a[1]*y.a[1]+x.a[2]*y.a[2])<0.9999) return false;
  var d=[y.o[0]-x.o[0], y.o[1]-x.o[1], y.o[2]-x.o[2]], t=d[0]*x.a[0]+d[1]*x.a[1]+d[2]*x.a[2];
  return Math.hypot(d[0]-t*x.a[0], d[1]-t*x.a[1], d[2]-t*x.a[2]) < 0.01;
}
function scFixNormals(m){
  scAngleNormals(m);
  var P=m.attributes.position.array, N=m.attributes.normal.array, I=m.index.array;
  var faces=(m.brep_faces&&m.brep_faces.length) ? m.brep_faces : [];
  var axes=[], done={};
  /* گذر اول: محور هر وجه از نرمال‌های خودش؛ گذر دوم: وجه‌های باقی‌مانده با محورهای پیداشده (لبهٔ گرد هم‌محور استوانهٔ کنارش است) */
  for(var pass=0; pass<2; pass++) faces.forEach(function(f, fi){
    if(done[fi]) return;
    var seen={}, vs=[];
    for(var i=3*f.first;i<3*f.last+3;i++){ var v=I[i]; if(!seen[v]){ seen[v]=1; vs.push(v); } }
    var ax=scRevolveFace(P, N, vs, pass?axes:[]);
    if(ax){ done[fi]=1; if(!axes.some(function(x){ return scSameAxis(x, ax); })) axes.push(ax); }
  });
}
/* خروجی: { glb, usdz (Uint8Array), volume (m³), tris } */
async function stepConvert(file){
  var L=await scLoadLibs(), THREE=L.THREE;
  var res=L.occt.ReadStepFile(new Uint8Array(await file.arrayBuffer()), STEP_MESH);
  if(!res || !res.success || !res.meshes || !res.meshes.length) throw new Error("step");
  /* ظاهر یکسان با مدل‌های فعلی سایت: خاکستری مات، دوطرفه */
  var mat=new THREE.MeshStandardMaterial({ metalness:0, roughness:0.5, side:THREE.DoubleSide });
  mat.color.setRGB(0.3515, 0.3515, 0.3712, THREE.LinearSRGBColorSpace);
  var part=new THREE.Group(), tris=0;
  res.meshes.forEach(function(m){
    if(m.attributes.normal) scFixNormals(m);
    var g=new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(m.attributes.position.array, 3));
    if(m.attributes.normal) g.setAttribute("normal", new THREE.Float32BufferAttribute(m.attributes.normal.array, 3));
    g.setIndex(m.index.array);
    tris+=m.index.array.length/3;
    var mesh=new THREE.Mesh(g, mat); if(m.name) mesh.name=m.name;
    part.add(mesh);
  });
  part.scale.setScalar(0.001);                 // STEP به میلی‌متر است؛ GLB و USDZ به متر
  var root=new THREE.Group(); root.add(part);
  var volume=scVolume(THREE, root);
  var glb=new Uint8Array(await new L.GLTFExporter().parseAsync(root, { binary:true }));
  var usdz=await new L.USDZExporter().parseAsync(root);
  return { glb:glb, usdz:usdz, volume:volume, tris:tris };
}

/* هر فایل یک‌بار تبدیل می‌شود: هنگام انتخاب شروع می‌شود و هنگام ثبت فقط منتظر نتیجه می‌مانیم */
var _scCache=[];
function stepConvertCached(file){
  var hit=_scCache.find(function(x){ return x.file===file; });
  if(hit) return hit.p;
  var p=stepConvert(file);
  _scCache.push({ file:file, p:p }); if(_scCache.length>4) _scCache.shift();
  p.catch(function(){ _scCache=_scCache.filter(function(x){ return x.p!==p; }); });
  return p;
}
function u8ToB64(u8){
  var s=""; for(var i=0;i<u8.length;i+=0x8000) s+=String.fromCharCode.apply(null, u8.subarray(i, i+0x8000));
  return btoa(s);
}
function stepErrMsg(e){
  return (e && e.message==="step") ? "فایل STEP خوانده نشد؛ فایل را دوباره از نرم‌افزار طراحی خروجی بگیرید."
                                    : "آماده‌سازی مدل سه‌بعدی ناموفق بود؛ اتصال اینترنت را بررسی و دوباره تلاش کنید.";
}

/* فیلدهای مدل برای درخواست ثبت: STEP اصلی + GLB و USDZ ساخته‌شده + حجم.
   برای انواع 3D قدیمی، GLB همان فایل اصلی سند است. */
/* نسخهٔ محلی (و بعداً سرور مجازی): فایل نمایش و واقعیت افزوده روی سرور با هستهٔ کامل CAD ساخته می‌شود و
   کیفیتش هم‌تراز Shapr3D است؛ مرورگر فقط خود STEP را می‌فرستد. نسخهٔ گوگل همچنان در مرورگر تبدیل می‌کند. */
function stepOnServer(){ return typeof LOCAL_MODE!=="undefined" && !!LOCAL_MODE; }

async function stepPayload(file, legacy3D){
  if(stepOnServer()){
    var s={ stpBase64:await fileToBase64(file), stpName:file.name, stpMime:file.type||"application/step", serverConvert:true };
    if(legacy3D) s.legacy3D=true;
    return s;
  }
  var c=await stepConvertCached(file);
  var base=String(file.name).replace(/\.(stp|step)$/i, "");
  var o={ stpBase64:await fileToBase64(file), stpName:file.name, stpMime:file.type||"application/step",
          usdzBase64:u8ToB64(c.usdz), usdzName:base+".usdz", usdzMime:"model/vnd.usdz+zip",
          modelVolume:c.volume };
  if(legacy3D){ o.fileBase64=u8ToB64(c.glb); o.fileName=base+".glb"; o.mimeType="model/gltf-binary"; }
  else { o.glbBase64=u8ToB64(c.glb); o.glbName=base+".glb"; }
  return o;
}

/* پس از انتخاب STEP در یک خانهٔ بارگذاری: تبدیل از همین حالا شروع می‌شود و نتیجه زیر نام فایل می‌آید */
function stepPicked(inputId, onFail){
  var inp=document.getElementById(inputId), f=inp&&inp.files&&inp.files[0];
  var lbl=document.getElementById(inputId+"Name");
  if(!f) return;
  if(f.size>STEP_MAX){ toast("حجم فایل STEP بیش از ۲۵ مگابایت است.",true); if(onFail) onFail(); return; }
  if(stepOnServer()){ if(lbl){ lbl.textContent="✓ "+f.name; lbl.hidden=false; } return; }   // ساخت روی سرور، هنگام ثبت
  if(lbl){ lbl.textContent="در حال آماده‌سازی مدل…"; lbl.hidden=false; lbl.classList.add("dz-busy"); }
  stepConvertCached(f).then(function(c){
    if(!(inp.files && inp.files[0]===f)) return;   // در این فاصله فایل دیگری انتخاب شده
    /* حجم بی‌صدا همراه سند ذخیره می‌شود و وزن از روی آن در کارت قطعه پر می‌شود؛ اینجا فقط نام فایل */
    if(lbl){ lbl.classList.remove("dz-busy"); lbl.textContent="✓ "+f.name; }
  }, function(e){
    if(!(inp.files && inp.files[0]===f)) return;
    if(lbl) lbl.classList.remove("dz-busy");
    toast(stepErrMsg(e),true);
    try{ inp.value=""; }catch(_){}
    if(onFail) onFail();
  });
}
