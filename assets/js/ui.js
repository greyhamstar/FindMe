
function $(q,r=document){return r.querySelector(q)}; function $all(q,r=document){return Array.from(r.querySelectorAll(q))}
function toast(m,t="info",ms=2100){const d=document.createElement('div'); d.className='toast'; d.innerHTML=`<div class="small">${m}</div>`; document.body.appendChild(d); setTimeout(()=>d.remove(),ms)}
function hms(s){s=Math.max(0,Math.floor(s||0));const h=String(Math.floor(s/3600)).padStart(2,'0');const m=String(Math.floor((s%3600)/60)).padStart(2,'0');const ss=String(s%60).padStart(2,'0');return `${h}:${m}:${ss}`}
function fmtZAR(n){try{return new Intl.NumberFormat('en-ZA',{style:'currency',currency:'ZAR'}).format(n)}catch{return `R ${Number(n||0).toFixed(2)}`}}
function showStoresLinkIfAdmin(){try{const raw=localStorage.getItem("FINDME_DB_V7"); if(!raw)return; const db=JSON.parse(raw); const has=db.sessions&&db.sessions.admin; const el=document.getElementById("nav-stores"); if(el) el.style.display=has?"inline":"none"}catch{}}
function haversine(lat1,lon1,lat2,lon2){function toRad(d){return d*Math.PI/180}const R=6371000;const dLat=toRad(lat2-lat1),dLon=toRad(lon2-lon1);const a=Math.sin(dLat/2)**2+Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;return 2*R*Math.asin(Math.sqrt(a))}
export { $, $all, toast, hms, fmtZAR, showStoresLinkIfAdmin, haversine };
