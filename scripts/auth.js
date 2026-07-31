/* ================= ورود / خروج ================= */
async function doLogin(){
  var u=document.getElementById("lgUser").value.trim();
  var p=document.getElementById("lgPass").value;
  document.getElementById("lgErr").textContent="";
  if(!u||!p){ document.getElementById("lgErr").textContent="نام کاربری و رمز را وارد کنید."; return; }
  try{
    var r=await api("login",{username:u,password:p});
    if(!r.ok){ document.getElementById("lgErr").textContent=r.message||"ورود ناموفق بود."; return; }
    ME={ token:r.token, role:r.role, name:r.name, username:r.username, gender:r.gender||"", position:r.position||"", avatar:r.avatar||"" };
    localStorage.setItem("fsm_session", JSON.stringify(ME));
    await startApp();
  }catch(e){ document.getElementById("lgErr").textContent="خطا در اتصال به سرویس."; }
}
function logout(){
  ME={token:null}; localStorage.removeItem("fsm_session");
  stopClock();
  document.getElementById("appView").classList.add("hidden");
  document.getElementById("loginView").classList.remove("hidden");
}
async function startApp(){
  // پوستهٔ برنامه را فوراً نشان بده و اسکلت بارگذاری بگذار، سپس داده را بگیر
  document.getElementById("loginView").classList.add("hidden");
  document.getElementById("appView").classList.remove("hidden");
  renderUserHeader();
  applyRoleVisibility();
  if(typeof showDashboardSkeleton==="function") showDashboardSkeleton();

  var r=await api("bootstrap",{});
  if(!r || !r.ok){ if(typeof showBootstrapError==="function") showBootstrapError(); return; }
  DB.clients=r.clients||[]; DB.orders=r.orders||[]; DB.projects=r.projects||[];
  DB.parts=r.parts||[]; DB.docTypes=r.docTypes||[]; DB.documents=r.documents||[]; DB.users=r.users||[];
  DB.templates=r.templates||[]; DB.workflow=r.workflow||[]; DB.partMods=r.partMods||[];
  if(!r.backendVersion){ toast("بک‌اندِ سرویس هنوز نسخهٔ قدیمی است. در Apps Script از Deploy ▸ Manage deployments، روی همان deployment «New version» را دیپلوی کنید.", true); }
  // غنی‌سازی پروفایل کاربر جاری از رکورد خودش (برای مدیر که فهرست کاربران را دارد)
  var meRec=(DB.users||[]).find(function(x){return x.username===ME.username;});
  if(meRec){ ME.name=meRec.name||ME.name; ME.gender=meRec.gender||ME.gender; ME.position=meRec.position||ME.position; ME.avatar=meRec.avatar||ME.avatar; }
  renderUserHeader();
  startClock();
  applyRoleVisibility();
  refreshAllSelects();
  renderArchive(); renderDataTables();
  if(typeof renderNavTree==="function") renderNavTree();
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
