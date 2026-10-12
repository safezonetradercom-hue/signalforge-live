const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
let currentUser = null, allSignals = [], toastTimer;
const toast = (message, error=false) => {
  const el=$("#toast"); el.textContent=message; el.classList.toggle("error",error); el.classList.add("show");
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove("show"),3200);
};
async function api(url, options={}) {
  const response = await fetch(url, { credentials:"same-origin", ...options,
    headers: { ...(options.body ? {"Content-Type":"application/json"} : {}), ...(options.headers||{}) } });
  const data = await response.json().catch(()=>({}));
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data;
}
const json = data => JSON.stringify(data);
function showAuth(mode="login") {
  $("#auth-screen").classList.remove("hidden"); $("#app").classList.add("hidden");
  const login=mode==="login";
  $("#login-form").classList.toggle("hidden",!login);
  $("#register-form").classList.toggle("hidden",login);
  $("#auth-title").textContent=login?"Welcome back":"Create your account";
  $("#auth-subtitle").textContent=login?"Sign in to view your signal dashboard.":"Set up your SignalDesk workspace.";
  $("#switch-copy").textContent=login?"New to SignalDesk?":"Already have an account?";
  $("#switch-auth").textContent=login?"Create an account":"Sign in";
}
function showApp(user) {
  currentUser=user; $("#auth-screen").classList.add("hidden"); $("#app").classList.remove("hidden");
  const name=user.name||"Member", initial=name.trim().charAt(0).toUpperCase();
  $("#user-name").textContent=name; $("#user-role").textContent=user.role;
  $("#avatar").textContent=initial; $("#top-avatar").textContent=initial;
  $("#welcome-title").textContent=`Good to see you, ${name.split(" ")[0]}.`;
  $("#today-chip").textContent=new Intl.DateTimeFormat(undefined,{month:"short",day:"numeric",year:"numeric"}).format(new Date());
  $$(".admin-only").forEach(el=>el.classList.toggle("hidden",user.role!=="admin"));
  $("#year").textContent=new Date().getFullYear();
  setView("dashboard"); refresh();
}
function setView(view) {
  $$(".nav-link").forEach(el=>el.classList.toggle("active",el.dataset.view===view));
  $("#page-name").textContent=({dashboard:"Overview",signals:"Live signals",admin:"Manage signals"})[view]||"Overview";
  $("#table-heading").textContent=view==="signals"?"All signals":"Recent signals";
  $("#admin-section").classList.toggle("hidden",view!=="admin"||currentUser?.role!=="admin");
  $("#sidebar").classList.remove("open");
  if(view==="signals") $("#table-heading").scrollIntoView({block:"nearest",behavior:"smooth"});
}
async function refresh() {
  try {
    const [signalData,statsData]=await Promise.all([api("/api/signals"),api("/api/stats")]);
    allSignals=signalData.signals;
    $("#stat-total").textContent=statsData.stats.total;
    $("#stat-active").textContent=statsData.stats.active;
    $("#stat-wins").textContent=statsData.stats.wins;
    $("#stat-losses").textContent=statsData.stats.losses;
    $("#nav-active-count").textContent=statsData.stats.active;
    renderSignals();
  } catch(e) { toast(e.message,true); }
}
function escapeHtml(value) {
  return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function renderSignals() {
  const search=$("#signal-search").value.trim().toLowerCase(), status=$("#status-filter").value, market=$("#market-filter").value;
  let rows=allSignals.filter(s=>(!search||s.symbol.toLowerCase().includes(search))&&(!status||s.status===status)&&(!market||s.market===market));
  if(document.querySelector('.nav-link.active')?.dataset.view!=="signals") rows=rows.slice(0,6);
  const tbody=$("#signals-body");
  if(!rows.length){tbody.innerHTML='<tr><td colspan="8" class="empty-cell">No signals match your filters.</td></tr>';$("#table-count").textContent="0 signals";return;}
  const admin=currentUser?.role==="admin";
  tbody.innerHTML=rows.map(s=>`<tr>
    <td><div class="symbol-cell"><strong>${escapeHtml(s.symbol)}</strong><small>${escapeHtml(s.market)}</small></div></td>
    <td><span class="direction ${s.direction.toLowerCase()}">${s.direction==="BUY"?"↗":"↘"} ${escapeHtml(s.direction)}</span></td>
    <td>${escapeHtml(s.entry)}</td><td>${escapeHtml(s.stop_loss)}</td><td>${escapeHtml(s.take_profit)}</td><td>${escapeHtml(s.timeframe)}</td>
    <td><span class="status ${s.status.toLowerCase()}">${escapeHtml(s.status)}</span></td>
    ${admin?`<td><div class="row-actions"><select class="tiny-btn status-select" data-id="${s.id}" aria-label="Update status for ${escapeHtml(s.symbol)}">${["ACTIVE","WIN","LOSS","CANCELLED"].map(st=>`<option ${s.status===st?"selected":""}>${st}</option>`).join("")}</select><button class="tiny-btn delete-signal" data-id="${s.id}" aria-label="Delete ${escapeHtml(s.symbol)}">✕</button></div></td>`:""}
  </tr>`).join("");
  $("#table-count").textContent=`${rows.length} signal${rows.length===1?"":"s"}`;
  // colspan differs depending on whether the admin action column is present.
  tbody.querySelectorAll(".status-select").forEach(el=>el.addEventListener("change",async()=>{
    try { await api(`/api/signals/${el.dataset.id}`,{method:"PATCH",body:json({status:el.value})});toast("Signal status updated.");refresh(); }
    catch(e){toast(e.message,true);refresh();}
  }));
  tbody.querySelectorAll(".delete-signal").forEach(el=>el.addEventListener("click",async()=>{
    if(!confirm("Delete this signal permanently?"))return;
    try {await api(`/api/signals/${el.dataset.id}`,{method:"DELETE"});toast("Signal deleted.");refresh();}
    catch(e){toast(e.message,true);}
  }));
}
$("#switch-auth").addEventListener("click",()=>showAuth($("#login-form").classList.contains("hidden")?"login":"register"));
$("#login-form").addEventListener("submit",async e=>{
  e.preventDefault();const f=new FormData(e.currentTarget);
  try{const d=await api("/api/login",{method:"POST",body:json({email:f.get("email"),password:f.get("password")})});showApp(d.user);}
  catch(err){toast(err.message,true);}
});
$("#register-form").addEventListener("submit",async e=>{
  e.preventDefault();const f=new FormData(e.currentTarget);
  try{const d=await api("/api/register",{method:"POST",body:json({name:f.get("name"),email:f.get("email"),password:f.get("password")})});showApp(d.user);}
  catch(err){toast(err.message,true);}
});
$("#logout-btn").addEventListener("click",async()=>{try{await api("/api/logout",{method:"POST"});currentUser=null;showAuth("login");}catch(e){toast(e.message,true);}});
$$(".nav-link").forEach(el=>el.addEventListener("click",()=>setView(el.dataset.view)));
$("#view-all").addEventListener("click",()=>setView("signals"));
$("#new-signal-shortcut").addEventListener("click",()=>{setView("admin");$("#admin-section").scrollIntoView({behavior:"smooth",block:"start"});});
$("#menu-btn").addEventListener("click",()=>$("#sidebar").classList.toggle("open"));
["signal-search","status-filter","market-filter"].forEach(id=>$("#"+id).addEventListener(id==="signal-search"?"input":"change",renderSignals));
$("#signal-form").addEventListener("submit",async e=>{
  e.preventDefault();const f=new FormData(e.currentTarget);
  const payload=Object.fromEntries(f.entries());
  try{await api("/api/signals",{method:"POST",body:json(payload)});e.currentTarget.reset();toast("Signal published.");await refresh();setView("dashboard");}
  catch(err){toast(err.message,true);}
});
(async()=>{try{const d=await api("/api/me");if(d.user)showApp(d.user);else showAuth("login");}catch{showAuth("login");}})();
