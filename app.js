const samples=[
 {pair:"EUR/USD (OTC)",direction:"CALL",time:"14:20",expiry:"1 min",status:"DEMO EXAMPLE"},
 {pair:"GBP/JPY (OTC)",direction:"PUT",time:"14:23",expiry:"1 min",status:"DEMO EXAMPLE"},
 {pair:"NZD/CHF (OTC)",direction:"PUT",time:"14:26",expiry:"1 min",status:"DEMO EXAMPLE"},
 {pair:"AUD/CAD (OTC)",direction:"CALL",time:"14:29",expiry:"1 min",status:"DEMO EXAMPLE"}
];
const container=document.querySelector("#signals");let active="ALL";
function render(){const rows=samples.filter(s=>active==="ALL"||s.direction===active);document.querySelector("#total").textContent=String(rows.length).padStart(2,"0");container.innerHTML=rows.map(s=>`<article class="signal"><div class="signal-top"><div class="pair">${s.pair}</div><span class="tag ${s.direction}">${s.direction}</span></div><div class="meta"><div><small>Example time</small><strong>${s.time}</strong></div><div><small>Expiry</small><strong>${s.expiry}</strong></div></div><div class="status">● <b>${s.status}</b> — not a real market signal</div></article>`).join("");}
document.querySelectorAll(".filter").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll(".filter").forEach(x=>x.classList.remove("active"));b.classList.add("active");active=b.dataset.filter;render()}));
document.querySelector("#refresh").addEventListener("click",()=>{render();const b=document.querySelector("#refresh");b.textContent="✓ Refreshed";setTimeout(()=>b.textContent="↻ Refresh",900)});
render();