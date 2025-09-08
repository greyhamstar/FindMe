
import { getDB, setDB, uid } from './storage.js';
import { loginAdmin, getSession, clearSession } from './auth.js';
import { $, toast, showStoresLinkIfAdmin } from './ui.js';
import { PROVINCES } from './constants.js';

function render(){
  const s=getSession('admin'); const authed=!!s;
  $('#stores-login').classList.toggle('hidden', authed);
  $('#stores-app').classList.toggle('hidden', !authed);
  showStoresLinkIfAdmin();
  if(authed){
    $('#admin-name').textContent=s.name;
    hydrateControls(); renderStores();
  }
}
function hydrateControls(){
  const sel=$('#s-province'); if(sel && !sel.dataset.bound){
    sel.innerHTML=`<option value="">Select province</option>` + PROVINCES.map(p=>`<option value="${p}">${p}</option>`).join('');
    sel.dataset.bound='1';
  }
  const db=getDB();
  $('#rep-campaign').innerHTML = `<option value="">Any campaign</option>` + db.campaigns.map(c=>`<option value="${c.id}">${c.title} • ${c.location}</option>`).join('');
  $('#rep-store').innerHTML = `<option value="">Any store</option>` + db.stores.map(s=>`<option value="${s.id}">${s.name} • ${s.city}</option>`).join('');
  const d=new Date(), y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), da=String(d.getDate()).padStart(2,'0');
  $('#rep-from').value = `${y}-${m}-01`; $('#rep-to').value = `${y}-${m}-${da}`;
}
function onLogin(e){ e.preventDefault();
  try{ const a=loginAdmin({email:$('#adm-email').value.trim(), password:$('#adm-pass').value.trim()}); toast(`Welcome ${a.name}!`); render(); }
  catch(err){ toast(err.message,'err'); }
}
function onLogout(){ clearSession('admin'); render() }

function renderStores(){
  const db=getDB(); const tb=$('#stores-tbody'); tb.innerHTML='';
  db.stores.forEach(s=>{
    const tr=document.createElement('tr');
    const geo = (s.lat!=null && s.lng!=null) ? `Geo: ${s.lat.toFixed(5)}, ${s.lng.toFixed(5)} • ${s.radius||250}m` : 'Geo: not set';
    tr.innerHTML=`<td><strong>${s.name}</strong><div class="small muted">${s.address}</div></td>
      <td>${s.city}</td><td>${s.province}</td>
      <td class="small muted">${geo} ${s.geofenceEnabled?'<span class="badge ok">Geofence ON</span>':'<span class="badge warn">Geofence OFF</span>'}</td>
      <td><button class="secondary" data-edit="${s.id}">Edit</button></td>`;
    tb.appendChild(tr);
  });
}
function onCreateStore(e){ e.preventDefault();
  const name=$('#s-name').value.trim(), province=$('#s-province').value, city=$('#s-city').value.trim(), address=$('#s-address').value.trim();
  const lat=parseFloat($('#s-lat').value||''); const lng=parseFloat($('#s-lng').value||''); const radius=parseInt($('#s-radius').value||'250',10);
  const enabled=$('#s-enable').checked;
  if(!name || !province || !city || !address){ toast('Fill all store fields.','warn'); return; }
  const db=getDB();
  db.stores.unshift({ id:uid('str'), name, province, city, address, lat: isNaN(lat)?null:lat, lng:isNaN(lng)?null:lng, radius: isNaN(radius)?250:radius, geofenceEnabled: enabled });
  setDB(db); toast('Store added.'); e.target.reset(); renderStores();
}
let editingId='';
function onStoreTableClick(e){ const id=e.target.getAttribute('data-edit'); if(!id) return; openEdit(id); }
function openEdit(id){
  const db=getDB(); const s=db.stores.find(x=>x.id===id); if(!s) return;
  editingId=id;
  $('#ed-name').value=s.name||''; $('#ed-province').value=s.province||''; $('#ed-city').value=s.city||''; $('#ed-address').value=s.address||'';
  $('#ed-lat').value=(s.lat!=null)?s.lat:''; $('#ed-lng').value=(s.lng!=null)?s.lng:''; $('#ed-radius').value=s.radius||250; $('#ed-enable').checked=!!s.geofenceEnabled;
  $('#edit-modal').classList.remove('hidden');
}
function closeEdit(){ $('#edit-modal').classList.add('hidden'); editingId=''; }
function saveEdit(e){ e.preventDefault();
  const db=getDB(); const s=db.stores.find(x=>x.id===editingId); if(!s) return;
  s.name=$('#ed-name').value.trim()||s.name;
  s.province=$('#ed-province').value||s.province;
  s.city=$('#ed-city').value.trim()||s.city;
  s.address=$('#ed-address').value.trim()||s.address;
  const lat=parseFloat($('#ed-lat').value||''); const lng=parseFloat($('#ed-lng').value||'');
  s.lat = isNaN(lat)?null:lat; s.lng = isNaN(lng)?null:lng;
  s.radius=parseInt($('#ed-radius').value||'250',10)||250;
  s.geofenceEnabled = $('#ed-enable').checked;
  setDB(db); toast('Store updated.'); closeEdit(); renderStores();
}
async function setFromMyLocation(){
  if(!('geolocation' in navigator)){ toast('Geolocation not supported on this device.','warn'); return; }
  try{
    const pos=await new Promise((res,rej)=>navigator.geolocation.getCurrentPosition(res,rej,{enableHighAccuracy:true,timeout:8000}));
    $('#ed-lat').value = String(pos.coords.latitude.toFixed(6));
    $('#ed-lng').value = String(pos.coords.longitude.toFixed(6));
    toast('Filled lat/lng from your current location.');
  }catch(err){ toast('Could not get your current location.','warn'); }
}
function clearGeoFields(){ $('#ed-lat').value=''; $('#ed-lng').value=''; }

function loadReport(){
  const db=getDB();
  const storeId=$('#rep-store').value; const campaignId=$('#rep-campaign').value;
  const from=$('#rep-from').value; const to=$('#rep-to').value;
  const fromD=new Date(from+'T00:00:00'); const toD=new Date(to+'T23:59:59');
  const tb=$('#rep-tbody'); tb.innerHTML='';
  const rows=db.checkins.filter(ci=>{
    const t=new Date(ci.start).getTime();
    if (storeId && ci.storeId!==storeId) return false;
    if (campaignId && ci.campaignId!==campaignId) return false;
    return t>=fromD.getTime() && t<=toD.getTime();
  });
  const byPromoter={};
  rows.forEach(ci=>{ if(!ci.end) return; byPromoter[ci.promoterId]=(byPromoter[ci.promoterId]||0)+Math.max(0,Math.floor(ci.seconds||0)); });
  Object.entries(byPromoter).forEach(([pid,secs])=>{
    const u=db.users.find(x=>x.id===pid);
    const tr=document.createElement('tr');
    tr.innerHTML=`<td><strong>${u?.name||'Unknown'}</strong><div class="small muted">${u?.email||''}</div></td><td>${secs}</td><td>${(secs/3600).toFixed(2)}</td>`;
    tb.appendChild(tr);
  });
  $('#rep-title').textContent = `Report — ${from} to ${to}`;
}
function downloadCSV(){
  const db=getDB();
  const storeId=$('#rep-store').value; const campaignId=$('#rep-campaign').value;
  const from=$('#rep-from').value; const to=$('#rep-to').value;
  const fromD=new Date(from+'T00:00:00'); const toD=new Date(to+'T23:59:59');
  const rows=db.checkins.filter(ci=>{
    const t=new Date(ci.start).getTime();
    if (storeId && ci.storeId!==storeId) return false;
    if (campaignId && ci.campaignId!==campaignId) return false;
    return t>=fromD.getTime() && t<=toD.getTime();
  });
  const byPromoter={};
  rows.forEach(ci=>{ if(!ci.end) return; byPromoter[ci.promoterId]=(byPromoter[ci.promoterId]||0)+Math.max(0,Math.floor(ci.seconds||0)); });
  const header=['Promoter Name','Promoter Email','Total Seconds','Total Hours'];
  const lines=[header.join(',')];
  Object.entries(byPromoter).forEach(([pid,secs])=>{
    const u=db.users.find(x=>x.id===pid);
    lines.push([ (u?.name||'').replace(/,/g,' '), (u?.email||'').replace(/,/g,' '), secs, (secs/3600).toFixed(2) ].join(','));
  });
  const csv=lines.join('\\n'); const blob=new Blob([csv],{type:'text/csv'}); const url=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download=`hours_${from}_to_${to}.csv`; document.body.appendChild(a); a.click();
  setTimeout(()=>{document.body.removeChild(a); URL.revokeObjectURL(url)},100);
}

document.addEventListener('DOMContentLoaded', ()=>{
  render();
  $('#stores-login-form')?.addEventListener('submit', onLogin);
  $('#logout-btn')?.addEventListener('click', onLogout);
  $('#create-store-form')?.addEventListener('submit', onCreateStore);
  $('#stores-tbody')?.addEventListener('click', onStoreTableClick);
  $('#load-report')?.addEventListener('click', loadReport);
  $('#download-btn')?.addEventListener('click', downloadCSV);
  $('#ed-close')?.addEventListener('click', ()=>$('#edit-modal').classList.add('hidden'));
  $('#ed-save')?.addEventListener('click', saveEdit);
  $('#ed-usegps')?.addEventListener('click', setFromMyLocation);
  $('#ed-cleargeo')?.addEventListener('click', clearGeoFields);
});
