
import { getDB, setDB, uid } from './storage.js';
import { loginAdmin, getSession, clearSession } from './auth.js';
import { $, $all, toast, fmtZAR, showStoresLinkIfAdmin } from './ui.js';

let building={ title:"", campaignId:"", questions:[] };

function render(){
  const s=getSession('admin'); const authed=!!s;
  $('#admin-login').classList.toggle('hidden', authed);
  $('#admin-app').classList.toggle('hidden', !authed);
  showStoresLinkIfAdmin();
  if(authed){
    $('#admin-name').textContent=s.name;
    renderCampaigns(); renderPromoters(); renderForms(); hydrateCampaignSelect();
  }
}
function onLogin(e){ e.preventDefault();
  try{ const a=loginAdmin({ email:$('#adm-email').value.trim(), password:$('#adm-pass').value.trim() }); toast(`Welcome ${a.name}!`); render(); }
  catch(err){ toast(err.message,'err'); }
}
function onLogout(){ clearSession('admin'); render(); }

function onCreateCampaign(e){ e.preventDefault();
  const title=$('#c-title').value.trim(), brand=$('#c-brand').value.trim(), location=$('#c-location').value.trim();
  const date=$('#c-date').value, pay=parseFloat($('#c-pay').value||'0'), slots=parseInt($('#c-slots').value||'0',10);
  if(!title||!brand||!location||!date||!pay||!slots){ toast('Fill all campaign fields.','warn'); return; }
  const db=getDB(); db.campaigns.unshift({ id:uid('cmp'), title, brand, location, date, pay, slots, status:'open', createdAt:new Date().toISOString() });
  setDB(db); toast('Campaign created.'); e.target.reset(); renderCampaigns(); hydrateCampaignSelect();
}
function renderCampaigns(){
  const db=getDB(); const tb=$('#camp-tbody'); tb.innerHTML='';
  db.campaigns.forEach(c=>{
    const apps=db.applications.filter(a=>a.campaignId===c.id);
    const approved=apps.filter(a=>a.status==='approved').length;
    const tr=document.createElement('tr');
    tr.innerHTML=`<td><strong>${c.title}</strong><div class="small muted">${c.brand}</div></td>
      <td>${c.location}<div class="small muted">${c.date}</div></td>
      <td>${fmtZAR(c.pay)}</td>
      <td>${approved}/${c.slots}</td>
      <td><span class="badge ${c.status==='open'?'ok':'warn'}">${c.status}</span></td>
      <td class="row" style="gap:8px">
        <button class="secondary" data-view="${c.id}">Applications</button>
        <button class="warning" data-close="${c.id}" ${c.status!=='open'?'disabled':''}>Close</button>
      </td>`;
    tb.appendChild(tr);
  });
}
function onCampClick(e){
  const view=e.target.getAttribute('data-view'); const close=e.target.getAttribute('data-close');
  if(view) openApps(view); if(close) closeCampaign(close);
}
function closeCampaign(id){ const db=getDB(); const c=db.campaigns.find(x=>x.id===id); if(!c) return; c.status='closed'; setDB(db); toast('Campaign closed.'); renderCampaigns(); }

function openApps(campId){
  const db=getDB(); const c=db.campaigns.find(x=>x.id===campId);
  $('#apps-title').textContent=c?c.title:'Applications';
  const tb=$('#apps-tbody'); tb.innerHTML='';
  const stores=db.stores||[];
  db.applications.filter(a=>a.campaignId===campId).forEach(a=>{
    const u=db.users.find(u=>u.id===a.promoterId);
    const assigned=stores.find(s=>s.id===a.storeId);
    const opts=['<option value="">'+(a.status==='approved'?'Select store':'Approve first')+'</option>']
      .concat(stores.map(s=>`<option value="${s.id}" ${a.storeId===s.id?'selected':''}>${s.name} • ${s.city}</option>`)).join('');
    const dis=a.status!=='approved'?'disabled':'';
    const tr=document.createElement('tr');
    tr.innerHTML=`<td><strong>${u?.name||'Unknown'}</strong><div class="small muted">${u?.email||''}</div></td>
      <td><span class="badge ${a.status==='approved'?'ok':(a.status==='rejected'?'err':'warn')}">${a.status}</span>
        ${assigned?`<div class="small muted">Store: ${assigned.name}, ${assigned.city}</div>`:''}</td>
      <td class="row" style="gap:8px">
        <button data-approve="${a.id}" ${a.status==='approved'?'disabled':''}>Approve</button>
        <button class="danger" data-reject="${a.id}" ${a.status==='rejected'?'disabled':''}>Reject</button>
        <select data-assign="${a.id}" ${dis} style="min-width:200px">${opts}</select>
      </td>`;
    tb.appendChild(tr);
  });
  $('#apps-modal').classList.remove('hidden');
}
function setAppStatus(appId, status){
  const db=getDB(); const a=db.applications.find(x=>x.id===appId); if(!a) return;
  a.status=status; if(status==='rejected') a.storeId='';
  setDB(db); toast(`Application ${status}.`); openApps(a.campaignId); renderCampaigns();
}
function onAppsClick(e){
  if(e.target.id==='apps-close'){ $('#apps-modal').classList.add('hidden'); return; }
  const ap=e.target.getAttribute('data-approve'), rj=e.target.getAttribute('data-reject');
  if(ap) setAppStatus(ap,'approved'); if(rj) setAppStatus(rj,'rejected');
}
function onAppsChange(e){
  const id=e.target.getAttribute('data-assign'); if(!id) return;
  const db=getDB(); const a=db.applications.find(x=>x.id===id); if(!a) return;
  if(a.status!=='approved'){ toast('Approve before assigning.','warn'); return; }
  a.storeId=e.target.value; setDB(db); toast('Store assigned.'); openApps(a.campaignId);
}

function renderPromoters(){
  const db=getDB(); const tb=$('#promoters-tbody'); tb.innerHTML='';
  db.users.forEach(u=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`<td><strong>${u.name}</strong><div class="small muted">${u.email} • ${u.profile?.address?.province||'-'}</div></td>
      <td>${u.phone||'-'}</td>
      <td><span class="badge ${u.kycVerified?'ok':'warn'}">${u.kycVerified?'Verified':'Unverified'}</span></td>
      <td><button class="secondary" data-view-user="${u.id}">View</button></td>`;
    tb.appendChild(tr);
  });
}
function onPromotersClick(e){
  const id=e.target.getAttribute('data-view-user'); if(!id) return;
  const db=getDB(); const u=db.users.find(x=>x.id===id); if(!u) return;
  $('#user-title').textContent=u.name; $('#user-meta').textContent = `${u.email} • ${u.phone||'-'} • ${u.profile?.address?.province||''}`;
  const p=u.profile||{}, a=p.address||{}, b=p.banking||{}, cv=p.documents?.cv;
  $('#user-body').innerHTML=`<div class="grid grid-2">
    <div class="card"><h2>Identity</h2><div class="small muted">ID/Passport</div><div>${p.idNumber||'-'}</div></div>
    <div class="card"><h2>Address</h2><div>${a.line1||'-'}</div><div>${a.city||''} ${a.postalCode||''}</div><div>${a.province||''}, ${a.country||''}</div></div>
    <div class="card"><h2>Banking</h2><div class="small muted">Holder</div><div>${b.accountHolder||'-'}</div><div class="small muted">Bank</div><div>${b.bankName||'-'}</div><div class="small muted">Acc/IBAN</div><div>${b.accountNumber||b.iban||'-'}</div></div>
    <div class="card"><h2>Documents</h2>${cv?`<div>CV: <a href="${cv.data}" download="${cv.name}">${cv.name}</a> <span class="small muted">(${Math.round((cv.size||0)/1024)} KB)</span></div>`:'<div class="small muted">No CV uploaded</div>'}</div>
  </div>`;
  $('#verify-btn').textContent=u.kycVerified?'Unverify':'Mark Verified'; $('#verify-btn').setAttribute('data-user',u.id);
  $('#user-modal').classList.remove('hidden');
}
function onUserModalClick(e){
  if(e.target.id==='user-close'){ $('#user-modal').classList.add('hidden'); return; }
  const id=e.target.getAttribute('data-user'); if(!id) return;
  const db=getDB(); const u=db.users.find(x=>x.id===id); if(!u) return;
  u.kycVerified=!u.kycVerified; setDB(db); toast(`User ${u.kycVerified?'verified':'unverified'}.`); onPromotersClick({target:{getAttribute:()=>id}}); renderPromoters();
}

function hydrateCampaignSelect(){
  const db=getDB(); const sel=$('#f-campaign'); if(!sel) return;
  sel.innerHTML = `<option value="">(Optional) Bind to campaign</option>` + db.campaigns.map(c=>`<option value="${c.id}">${c.title} • ${c.location} • ${c.date}</option>`).join('');
}
function onStartForm(e){ e.preventDefault();
  building={ title:$('#f-title').value.trim(), campaignId:$('#f-campaign').value, questions:[] };
  if(!building.title){ toast('Give the form a title.','warn'); return; }
  $('#builder').classList.remove('hidden'); $('#questions').innerHTML=''; toast('Form started. Add questions.');
}
function onAddQuestion(e){ e.preventDefault();
  const type=$('#q-type').value, label=$('#q-label').value.trim(), req=$('#q-req').checked;
  const opts=($('#q-options').value||'').split(',').map(s=>s.trim()).filter(Boolean);
  if(!label){ toast('Question label required.','warn'); return; }
  const q={ id:uid('q'), type, label, options: type==='select'||type==='rating'?opts:[], required:req };
  building.questions.push(q);
  const li=document.createElement('div'); li.className='card';
  li.innerHTML = `<strong>${building.questions.length}. ${q.label}</strong> <span class="small muted">(${q.type}${q.options.length?': '+q.options.join(' / '):''}${q.required?' • required':''})</span>`;
  $('#questions').appendChild(li); $('#q-label').value=''; $('#q-options').value=''; $('#q-req').checked=false;
}
function onSaveForm(e){ e.preventDefault();
  if(!building.title || building.questions.length===0){ toast('Add a title and at least one question.','warn'); return; }
  const db=getDB(); db.forms.unshift({ id:uid('form'), title:building.title, campaignId:building.campaignId||'', questions:building.questions });
  setDB(db); toast('Form saved.'); building={title:'',campaignId:'',questions:[]}; $('#builder').classList.add('hidden'); $('#form-create').reset(); renderForms();
}
function renderForms(){
  const db=getDB(); const tb=$('#forms-tbody'); tb.innerHTML='';
  db.forms.forEach(f=>{
    const camp=db.campaigns.find(c=>c.id===f.campaignId);
    const tr=document.createElement('tr');
    tr.innerHTML=`<td><strong>${f.title}</strong><div class="small muted">${camp?`${camp.title} • ${camp.location}`:'No campaign bound'}</div></td>
      <td>${f.questions.length}</td>
      <td class="row" style="gap:8px"><button class="secondary" data-export="${f.id}">Export responses CSV</button></td>`;
    tb.appendChild(tr);
  });
}
function onFormsClick(e){
  const exportId=e.target.getAttribute('data-export'); if(!exportId) return;
  const db=getDB(); const f=db.forms.find(x=>x.id===exportId); if(!f){ toast('Form not found.','err'); return; }
  const rows=db.formResponses.filter(r=>r.formId===exportId);
  const header=['Promoter Name','Promoter Email','Campaign','Submitted At'].concat(f.questions.map(q=>q.label.replace(/,/g,' ')));
  const lines=[header.join(',')];
  rows.forEach(r=>{
    const u=db.users.find(x=>x.id===r.promoterId); const camp=db.campaigns.find(c=>c.id===r.campaignId);
    const answers=f.questions.map(q=>String(r.answers[q.id]??'').replace(/,/g,' '));
    lines.push([u?.name||'', u?.email||'', camp?.title||'', new Date(r.createdAt).toISOString(), ...answers].join(','));
  });
  const csv=lines.join('\\n'); const blob=new Blob([csv],{type:'text/csv'}); const url=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download=`form_${f.title.replace(/\\s+/g,'-')}_responses.csv`; document.body.appendChild(a); a.click();
  setTimeout(()=>{document.body.removeChild(a); URL.revokeObjectURL(url)},100);
}

document.addEventListener('DOMContentLoaded', ()=>{
  render();
  $('#admin-login-form')?.addEventListener('submit', onLogin);
  $('#logout-btn')?.addEventListener('click', onLogout);
  $('#create-campaign-form')?.addEventListener('submit', onCreateCampaign);
  $('#camp-tbody')?.addEventListener('click', onCampClick);
  $('#apps-modal')?.addEventListener('click', onAppsClick);
  $('#apps-modal')?.addEventListener('change', onAppsChange);
  $('#promoters-tbody')?.addEventListener('click', onPromotersClick);
  $('#user-modal')?.addEventListener('click', onUserModalClick);
  $('#form-create')?.addEventListener('submit', onStartForm);
  $('#add-q')?.addEventListener('click', onAddQuestion);
  $('#save-form')?.addEventListener('click', onSaveForm);
  $('#forms-tbody')?.addEventListener('click', onFormsClick);
});
