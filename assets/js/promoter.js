
import { getDB, setDB, uid, ensureUserProfileShape } from './storage.js';
import { registerPromoter, loginPromoter, getSession, clearSession } from './auth.js';
import { $, $all, toast, hms, showStoresLinkIfAdmin } from './ui.js';
import { PROVINCES } from './constants.js';

let timer=null;

function render(){
  const s=getSession('promoter'); const authed=!!s;
  $('#auth-card').classList.toggle('hidden', authed);
  $('#promoter-app').classList.toggle('hidden', !authed);
  showStoresLinkIfAdmin();
  if(authed){
    $('#promoter-name').textContent=s.name;
    renderAvailable(); renderMyApps(); loadProfile(); renderFormsList(); renderMyHours();
    preloadAssignment(); syncTimer();
  }else{ hydrateProvinces(); }
}
function hydrateProvinces(){
  const sel=$('#su-province'); if(sel && !sel.dataset.bound){ sel.innerHTML=`<option value="">Select your province</option>`+PROVINCES.map(p=>`<option value="${p}">${p}</option>`).join(''); sel.dataset.bound='1'; }
  const psel=$('#pf-province'); if(psel && !psel.dataset.bound){ psel.innerHTML=`<option value="">Select province</option>`+PROVINCES.map(p=>`<option value="${p}">${p}</option>`).join(''); psel.dataset.bound='1'; }
}

function toggleDrawer(open){ $('#drawer').classList.toggle('open', open); $('#overlay').classList.toggle('open', open); }
function showSection(id){ $all('[data-section]').forEach(el=>el.classList.add('hidden')); $(id).classList.remove('hidden'); toggleDrawer(false); if(id==='#section-checkin'){ preloadAssignment(); syncTimer(); } if(id==='#section-hours'){ renderMyHours(); }}

function onSignup(e){ e.preventDefault();
  try{ const u=registerPromoter({ name:$('#su-name').value.trim(), email:$('#su-email').value.trim(), phone:$('#su-phone').value.trim(), province:$('#su-province').value, password:$('#su-pass').value.trim() }); toast(`Welcome ${u.name}!`); render(); }
  catch(err){ toast(err.message,'err'); }
}
function onLogin(e){ e.preventDefault();
  try{ const u=loginPromoter({ email:$('#li-email').value.trim(), password:$('#li-pass').value.trim() }); toast(`Welcome back ${u.name}!`); render(); }
  catch(err){ toast(err.message,'err'); }
}
function onLogout(){ clearSession('promoter'); render(); }

function renderAvailable(){
  const db=getDB(); const s=getSession('promoter'); const my=new Set(db.applications.filter(a=>a.promoterId===s.id).map(a=>a.campaignId));
  const tb=$('#avail-tbody'); tb.innerHTML='';
  const opens=db.campaigns.filter(c=>c.status==='open');
  if(!opens.length){ tb.innerHTML=`<tr><td colspan="3"><div class="empty">No open campaigns yet.</div></td></tr>`; return; }
  opens.forEach(c=>{
    const applied=my.has(c.id); const tr=document.createElement('tr');
    tr.innerHTML=`<td><strong>${c.title}</strong><div class="small muted">${c.brand}</div></td>
      <td>${c.location}<div class="small muted">${c.date}</div></td>
      <td><button data-apply="${c.id}" ${applied?'disabled':''}>${applied?'Applied':'Apply'}</button></td>`;
    tb.appendChild(tr);
  });
}
function renderMyApps(){
  const db=getDB(); const s=getSession('promoter'); const tb=$('#myapps-tbody'); const stores=db.stores||[];
  tb.innerHTML='';
  const mine=db.applications.filter(a=>a.promoterId===s.id).sort((a,b)=>a.createdAt<b.createdAt?1:-1);
  if(!mine.length){ tb.innerHTML=`<tr><td colspan="3"><div class="empty">No applications yet.</div></td></tr>`; return; }
  mine.forEach(a=>{
    const c=db.campaigns.find(x=>x.id===a.campaignId); const st=stores.find(x=>x.id===a.storeId);
    const tr=document.createElement('tr');
    tr.innerHTML=`<td><strong>${c?.title||'Campaign deleted'}</strong><div class="small muted">${c?.brand||''}</div></td>
      <td>${c?.location||''}<div class="small muted">${c?.date||''}</div>${a.status==='approved'&&st?`<div class="small muted">Store: <button class="secondary small" data-open-checkin data-store="${st.id}" data-campaign="${c?.id||''}">${st.name}, ${st.city}</button></div>`:''}</td>
      <td><span class="badge ${a.status==='approved'?'ok':(a.status==='rejected'?'err':'warn')}">${a.status}</span></td>`;
    tb.appendChild(tr);
  });
}
function onTablesClick(e){
  const apply=e.target.getAttribute('data-apply');
  if(apply){
    const db=getDB(); const s=getSession('promoter');
    if(db.applications.find(a=>a.campaignId===apply && a.promoterId===s.id)){ toast('You already applied.'); return; }
    db.applications.push({ id:uid('app'), campaignId:apply, promoterId:s.id, status:'applied', storeId:'', createdAt:new Date().toISOString() });
    setDB(db); toast('Applied!'); renderAvailable(); renderMyApps(); return;
  }
  if(e.target.hasAttribute('data-open-checkin')){ openCheckin(e.target.getAttribute('data-store'), e.target.getAttribute('data-campaign')); }
}
function activeCheckin(){
  const db=getDB(); const s=getSession('promoter');
  return db.checkins.find(ci=>ci.promoterId===s.id && !ci.end) || null;
}
function preloadAssignment(){
  const db=getDB(); const s=getSession('promoter'); const app=db.applications.find(a=>a.promoterId===s.id && a.status==='approved' && a.storeId);
  const st=db.stores||[]; if(!app){ $('#ci-store').textContent='—'; $('#ci-store').dataset.store=''; $('#ci-store').dataset.campaign=''; $('#ci-campaign').textContent='—'; return; }
  const store=st.find(x=>x.id===app.storeId); const camp=db.campaigns.find(x=>x.id===app.campaignId);
  $('#ci-store').textContent=`${store?.name||''} — ${store?.city||''}`; $('#ci-store').dataset.store=store?.id||''; $('#ci-store').dataset.campaign=camp?.id||''; $('#ci-campaign').textContent=camp?.title||'';
}
function openCheckin(storeId,campaignId){
  showSection('#section-checkin');
  const db=getDB(); const s=db.stores.find(x=>x.id===storeId); const c=db.campaigns.find(x=>x.id===campaignId);
  $('#ci-store').textContent=`${s?.name||''} — ${s?.city||''}`; $('#ci-store').dataset.store=storeId||''; $('#ci-store').dataset.campaign=campaignId||''; $('#ci-campaign').textContent=c?.title||'';
  syncTimer();
}
async function onCheckinClick(){
  const mode=this.dataset.mode; const db=getDB(); const s=getSession('promoter');
  if(mode==='in'){
    const storeId=$('#ci-store').dataset.store; const campaignId=$('#ci-store').dataset.campaign;
    if(!storeId || !campaignId){ toast('No store selected. Open it from My applications.','warn'); return; }
    const allowed=db.applications.some(a=>a.promoterId===s.id && a.campaignId===campaignId && a.storeId===storeId && a.status==='approved');
    if(!allowed){ toast('You need an approved assignment.','warn'); return; }
    const st=db.stores.find(x=>x.id===storeId);
    if(st && st.geofenceEnabled && st.lat!=null && st.lng!=null){
      if(!('geolocation' in navigator)){ toast('Location not available on this device.','warn'); return; }
      try{
        const pos = await new Promise((res,rej)=>navigator.geolocation.getCurrentPosition(res,rej,{enableHighAccuracy:true,timeout:8000}));
        const dist = (function latlngToMeters(lat1,lon1,lat2,lon2){const R=6371000;const toRad=d=>d*Math.PI/180;const dLat=toRad(lat2-lat1),dLon=toRad(lon2-lon1);const a=Math.sin(dLat/2)**2+Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;return 2*R*Math.asin(Math.sqrt(a))})(st.lat, st.lng, pos.coords.latitude, pos.coords.longitude);
        const radius = st.radius || 250;
        if(dist > radius){ toast(`You are too far from the store (~${Math.round(dist)}m). Need <= ${radius}m.`, 'warn', 3000); return; }
      }catch(err){ toast('Could not get your location.', 'warn'); return; }
    }
    if(activeCheckin()){ toast('Already checked in.', 'warn'); return; }
    const start=new Date(); const date=start.toISOString().slice(0,10);
    db.checkins.push({ id:uid('ci'), promoterId:s.id, campaignId, storeId, start:start.toISOString(), end:null, seconds:0, date });
    setDB(db); toast('Checked in.');
  }else{
    const ci=activeCheckin(); if(!ci){ toast('No active check-in.','warn'); return; }
    ci.end=new Date().toISOString(); ci.seconds=Math.max(0, Math.floor((new Date(ci.end)-new Date(ci.start))/1000)); setDB(db); toast('Checked out.');
  }
  syncTimer(); renderMyHours(); renderMyApps();
}
function syncTimer(){
  clearInterval(timer); const ci=activeCheckin(); const btn=$('#ci-btn'); const t=$('#ci-timer'); const banner=$('#ci-banner');
  if(!$('#section-checkin') || $('#section-checkin').classList.contains('hidden')) return;
  if(ci){ btn.textContent='Check Out'; btn.dataset.mode='out'; t.dataset.start=ci.start; banner.classList.remove('hidden'); banner.textContent='You have an active check-in running.'; tick(); timer=setInterval(tick, 1000); }
  else { btn.textContent='Check In'; btn.dataset.mode='in'; t.textContent='00:00:00'; banner.classList.add('hidden'); delete t.dataset.start; }
}
function tick(){ const t=$('#ci-timer'); const st=t.dataset.start; if(!st){ t.textContent='00:00:00'; return; } const secs=Math.floor((Date.now()-new Date(st).getTime())/1000); t.textContent=hms(secs); }

function loadProfile(){
  hydrateProvinces(); const db=getDB(); const s=getSession('promoter'); const u=db.users.find(x=>x.id===s.id); if(!u) return; ensureUserProfileShape(u);
  $('#pf-name').value=u.name||''; $('#pf-email').value=u.email||''; $('#pf-phone').value=u.phone||''; $('#pf-idnum').value=u.profile.idNumber||'';
  $('#pf-line1').value=u.profile.address.line1||''; $('#pf-line2').value=u.profile.address.line2||''; $('#pf-city').value=u.profile.address.city||'';
  $('#pf-postal').value=u.profile.address.postalCode||''; $('#pf-country').value=u.profile.address.country||'South Africa'; $('#pf-province').value=u.profile.address.province||'';
  $('#pf-accholder').value=u.profile.banking.accountHolder||''; $('#pf-bankname').value=u.profile.banking.bankName||''; $('#pf-iban').value=u.profile.banking.iban||'';
  $('#pf-accnum').value=u.profile.banking.accountNumber||''; $('#pf-acctype').value=u.profile.banking.accountType||''; $('#pf-branch').value=u.profile.banking.branchCode||'';
  const cv=u.profile.documents?.cv; $('#cv-info').innerHTML = cv ? `<a href="${cv.data}" download="${cv.name}">${cv.name}</a> <span class="small muted">(${Math.round((cv.size||0)/1024)} KB)</span>` : '<span class="small muted">No CV uploaded</span>';
}
function onSaveProfile(e){ e.preventDefault();
  const db=getDB(); const s=getSession('promoter'); const u=db.users.find(x=>x.id===s.id); if(!u) return;
  const idn=$('#pf-idnum').value.trim(); if(!idn){ toast('ID/Passport number is required.','warn'); return; }
  u.name=$('#pf-name').value.trim()||u.name; u.email=$('#pf-email').value.trim()||u.email; u.phone=$('#pf-phone').value.trim();
  u.profile.idNumber=idn; u.profile.address.line1=$('#pf-line1').value.trim(); u.profile.address.line2=$('#pf-line2').value.trim();
  u.profile.address.city=$('#pf-city').value.trim(); u.profile.address.postalCode=$('#pf-postal').value.trim(); u.profile.address.country=$('#pf-country').value.trim()||'South Africa';
  u.profile.address.province=$('#pf-province').value; u.profile.banking.accountHolder=$('#pf-accholder').value.trim(); u.profile.banking.bankName=$('#pf-bankname').value.trim();
  u.profile.banking.iban=$('#pf-iban').value.trim(); u.profile.banking.accountNumber=$('#pf-accnum').value.trim(); u.profile.banking.accountType=$('#pf-acctype').value.trim(); u.profile.banking.branchCode=$('#pf-branch').value.trim();
  setDB(db); toast('Profile saved.'); loadProfile();
}
function onUploadCV(e){
  const file=e.target.files[0]; if(!file) return;
  const reader=new FileReader();
  reader.onload = ()=>{
    const db=getDB(); const s=getSession('promoter'); const u=db.users.find(x=>x.id===s.id); if(!u) return;
    u.profile.documents.cv = { name:file.name, size:file.size, type:file.type, data: reader.result };
    setDB(db); toast('CV uploaded.'); loadProfile();
  };
  reader.readAsDataURL(file);
}

function renderFormsList(){
  const db=getDB(); const s=getSession('promoter'); const myCamps=new Set(db.applications.filter(a=>a.promoterId===s.id).map(a=>a.campaignId));
  const tb=$('#forms-list'); tb.innerHTML='';
  const avail=(db.forms||[]).filter(f=>!f.campaignId || myCamps.has(f.campaignId));
  if(!avail.length){ tb.innerHTML=`<tr><td colspan="3"><div class="empty">No forms available.</div></td></tr>`; return; }
  avail.forEach(f=>{
    const camp=db.campaigns.find(c=>c.id===f.campaignId);
    const tr=document.createElement('tr');
    tr.innerHTML=`<td><strong>${f.title}</strong></td><td>${camp?`${camp.title} • ${camp.location}`:'General'}</td><td><button class="secondary" data-open-form="${f.id}">Fill</button></td>`;
    tb.appendChild(tr);
  });
}
function onFormsClick(e){
  const fid=e.target.getAttribute('data-open-form'); if(!fid) return; openForm(fid);
}
function openForm(fid){
  const db=getDB(); const f=db.forms.find(x=>x.id===fid); if(!f){ toast('Form not found.','err'); return; }
  $('#fm-title').textContent=f.title; const frm=$('#fm-form'); frm.innerHTML='';
  f.questions.forEach(q=>{
    const wrap=document.createElement('div'); wrap.className='row';
    let inner='';
    if(q.type==='select'){
      inner=`<div><label>${q.label}${q.required?' *':''}</label><select data-q="${q.id}">${q.options.map(o=>`<option>${o}</option>`).join('')}</select></div>`;
    }else if(q.type==='number'){
      inner=`<div><label>${q.label}${q.required?' *':''}</label><input data-q="${q.id}" type="number" placeholder="0"/></div>`;
    }else if(q.type==='rating'){
      inner=`<div><label>${q.label}${q.required?' *':''}</label><select data-q="${q.id}"><option>1</option><option>2</option><option>3</option><option>4</option><option>5</option></select></div>`;
    }else if(q.type==='photo'){
      inner=`<div><label>${q.label}${q.required?' *':''}</label><input data-q-photo="${q.id}" type="file" accept="image/*" /></div>`;
    }else{
      inner=`<div><label>${q.label}${q.required?' *':''}</label><input data-q="${q.id}" placeholder="Type your answer"/></div>`;
    }
    wrap.innerHTML=inner; frm.appendChild(wrap);
  });
  $('#fm-submit').dataset.form=f.id;
  $('#form-modal').classList.remove('hidden');
}
function closeForm(){ $('#form-modal').classList.add('hidden'); }
function submitForm(e){
  e.preventDefault();
  const db=getDB(); const s=getSession('promoter'); const fid=$('#fm-submit').dataset.form;
  const f=db.forms.find(x=>x.id===fid); if(!f) return;
  const answers={}, photos={};
  let valid=true;
  $('#fm-form [data-q]').forEach(el=>{
    const qid=el.getAttribute('data-q'); const val=el.value;
    const q=f.questions.find(x=>x.id===qid);
    if(q?.required && !val){ valid=false; }
    answers[qid]=val;
  });
  const uploads=[...document.querySelectorAll('#fm-form [data-q-photo]')];
  const readers=uploads.map(input=>{
    const file=input.files?.[0]; const qid=input.getAttribute('data-q-photo'); const q=f.questions.find(x=>x.id===qid);
    if(q?.required && !file){ valid=false; }
    if(!file) return Promise.resolve();
    return new Promise((res)=>{
      const r=new FileReader(); r.onload=()=>{ photos[qid]=r.result; res(); }; r.readAsDataURL(file);
    });
  });
  Promise.all(readers).then(()=>{
    if(!valid){ toast('Please answer all required fields.','warn'); return; }
    db.formResponses.push({ id:uid('resp'), formId:fid, campaignId:f.campaignId||'', promoterId:s.id, answers, photos, createdAt:new Date().toISOString() });
    setDB(db); toast('Form submitted.'); closeForm();
  });
}

function renderMyHours(){
  const db=getDB(); const s=getSession('promoter');
  const list=$('#hours-list'); list.innerHTML='';
  const rows=db.checkins.filter(ci=>ci.promoterId===s.id && ci.end);
  if(!rows.length){ list.innerHTML='<div class="empty">No tracked hours yet.</div>'; return; }
  const byDate={};
  rows.forEach(ci=>{ byDate[ci.date]= (byDate[ci.date]||0) + Math.max(0,Math.floor(ci.seconds||0)); });
  const dates=Object.keys(byDate).sort((a,b)=>a<b?1:-1);
  dates.forEach(d=>{
    const sec=byDate[d]; const item=document.createElement('div'); item.className='row';
    item.innerHTML=`<div><strong>${d}</strong><div class="small muted">${(sec/3600).toFixed(2)} hrs</div></div><div class="badge">${hms(sec)}</div>`;
    list.appendChild(item);
  });
}

document.addEventListener('DOMContentLoaded', ()=>{
  render();
  $('#signup-form')?.addEventListener('submit', onSignup);
  $('#login-form')?.addEventListener('submit', onLogin);
  $('#logout-btn')?.addEventListener('click', onLogout);
  $('#avail-tbody')?.addEventListener('click', onTablesClick);
  $('#myapps-tbody')?.addEventListener('click', onTablesClick);
  $('#ci-btn')?.addEventListener('click', onCheckinClick);
  $('#profile-form')?.addEventListener('submit', onSaveProfile);
  $('#cv-file')?.addEventListener('change', onUploadCV);
  $('#burger')?.addEventListener('click', ()=>toggleDrawer(true));
  $('#overlay')?.addEventListener('click', ()=>toggleDrawer(false));
  $all('[data-nav]').forEach(a=>a.addEventListener('click', (e)=>{ e.preventDefault(); showSection(a.getAttribute('href')); }));
  $('#forms-list')?.addEventListener('click', onFormsClick);
  $('#fm-close')?.addEventListener('click', ()=>$('#form-modal').classList.add('hidden'));
  $('#fm-submit')?.addEventListener('click', submitForm);
});
