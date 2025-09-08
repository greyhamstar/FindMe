
function $(q,r=document){return r.querySelector(q)}; function $all(q,r=document){return Array.from(r.querySelectorAll(q))}
function toast(msg,type="info",ms=2100){ const t=document.createElement('div'); t.className='toast'; t.innerHTML=`<div class="small">${msg}</div>`; document.body.appendChild(t); setTimeout(()=>t.remove(), ms); }
function fmtZAR(n){ try{ return new Intl.NumberFormat('en-ZA',{style:'currency',currency:'ZAR'}).format(n); }catch{ return `R ${Number(n||0).toFixed(2)}` } }
function hms(secs){ secs=Math.max(0,Math.floor(secs||0)); const h=String(Math.floor(secs/3600)).padStart(2,'0'); const m=String(Math.floor((secs%3600)/60)).padStart(2,'0'); const s=String(secs%60).padStart(2,'0'); return `${h}:${m}:${s}`; }
function showStoresLinkIfAdmin(){ try{const raw=localStorage.getItem("FINDME_DB_V8"); if(!raw) return; const db=JSON.parse(raw); const has=db.sessions && db.sessions.admin; const el=document.getElementById('nav-stores'); if(el) el.style.display=has?'inline':'none'; }catch{} }
function haversine(lat1,lon1,lat2,lon2){
  function toRad(d){return d*Math.PI/180}
  const R=6371000; const dLat=toRad(lat2-lat1); const dLon=toRad(lon2-lon1);
  const a=Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return 2*R*Math.asin(Math.sqrt(a));
}
export { $, $all, toast, fmtZAR, hms, showStoresLinkIfAdmin, haversine };
