function $(q, root=document){ return root.querySelector(q); }
function $all(q, root=document){ return Array.from(root.querySelectorAll(q)); }

function toast(msg, type="info", timeout=2200){
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = `<span class="small">${msg}</span>`;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), timeout);
}

function fmtMoneyZAR(n){
  try{ return new Intl.NumberFormat('en-ZA', {style:'currency', currency:'ZAR'}).format(n); }
  catch{ return `R ${Number(n||0).toFixed(2)}`; }
}

function percent(n, d){ if(!d) return 0; return Math.round((n/d)*100); }

function formatHMS(seconds){
  seconds = Math.max(0, Math.floor(seconds||0));
  const h = String(Math.floor(seconds/3600)).padStart(2,'0');
  const m = String(Math.floor((seconds%3600)/60)).padStart(2,'0');
  const s = String(seconds%60).padStart(2,'0');
  return `${h}:${m}:${s}`;
}

export { $, $all, toast, fmtMoneyZAR as fmtMoney, percent, formatHMS };