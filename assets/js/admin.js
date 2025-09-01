import { getDB, setDB, uid } from './storage.js';
import { loginAdmin, getSession, clearSession } from './auth.js';
import { $, $all, toast, fmtMoney, percent } from './ui.js';

function renderState(){
  const session = getSession("admin");
  const authed = !!session;
  $('#admin-login').classList.toggle('hidden', authed);
  $('#admin-app').classList.toggle('hidden', !authed);
  if (authed) {
    $('#admin-name').textContent = session.name;
    renderCampaigns();
    renderPromoters();
  }
}

function onLogin(e){
  e.preventDefault();
  const email = $('#adm-email').value.trim();
  const password = $('#adm-pass').value.trim();
  try{
    const admin = loginAdmin({email, password});
    toast(`Welcome ${admin.name}!`);
    renderState();
  }catch(err){
    toast(err.message, 'err');
  }
}

function onLogout(){
  clearSession("admin");
  renderState();
}

/* -------- Campaigns -------- */
function onCreateCampaign(e){
  e.preventDefault();
  const title = $('#c-title').value.trim();
  const brand = $('#c-brand').value.trim();
  const location = $('#c-location').value.trim();
  const date = $('#c-date').value;
  const pay = parseFloat($('#c-pay').value||'0');
  const slots = parseInt($('#c-slots').value||'0',10);
  if(!title || !brand || !location || !date || !pay || !slots){
    toast("Please fill all campaign fields.", "warn"); return;
  }
  const db = getDB();
  const newC = { id: uid("cmp"), title, brand, location, date, pay, slots, status: "open", createdAt: new Date().toISOString() };
  db.campaigns.unshift(newC);
  setDB(db);
  toast("Campaign created.");
  e.target.reset();
  renderCampaigns();
}

function renderCampaigns(){
  const db = getDB();
  const tbody = $('#camp-tbody');
  tbody.innerHTML = "";
  db.campaigns.forEach(c => {
    const apps = db.applications.filter(a => a.campaignId === c.id);
    const approved = apps.filter(a => a.status === "approved").length;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${c.title}</strong><div class="small muted">${c.brand}</div></td>
      <td>${c.location}<div class="small muted">${c.date}</div></td>
      <td>${fmtMoney(c.pay)}</td>
      <td>${approved}/${c.slots}</td>
      <td><span class="badge ${c.status==='open'?'ok':'warn'}">${c.status}</span></td>
      <td class="row" style="gap:8px">
        <button class="secondary" data-view="${c.id}">Applications</button>
        <button class="warning" data-close="${c.id}" ${c.status!=='open'?'disabled':''}>Close</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function onCampTableClick(e){
  const viewId = e.target.getAttribute('data-view');
  const closeId = e.target.getAttribute('data-close');
  if (viewId){ openApplications(viewId); }
  if (closeId){ closeCampaign(closeId); }
}

function closeCampaign(id){
  const db = getDB();
  const c = db.campaigns.find(x => x.id === id);
  if (!c) return;
  c.status = "closed";
  setDB(db);
  toast("Campaign closed.");
  renderCampaigns();
}

function openApplications(campaignId){
  const db = getDB();
  const c = db.campaigns.find(x => x.id === campaignId);
  const apps = db.applications.filter(a => a.campaignId === campaignId);
  $('#apps-title').textContent = c ? c.title : "Applications";
  const tbody = $('#apps-tbody');
  tbody.innerHTML = "";
  const stores = db.stores || [];
  apps.forEach(a => {
    const u = db.users.find(u => u.id === a.promoterId);
    const assignedStore = stores.find(s => s.id === a.storeId);
    const storeOptions = [`<option value="">${a.status==='approved'?'Select store':'Approve first'}</option>`]
      .concat(stores.map(s => `<option value="${s.id}" ${a.storeId===s.id?'selected':''}>${s.name} • ${s.city}</option>`))
      .join('');
    const disabled = a.status !== 'approved' ? 'disabled' : '';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${u?.name||'Unknown'}</strong><div class="small muted">${u?.email||''}</div></td>
      <td>
        <span class="badge ${a.status==='approved'?'ok':(a.status==='rejected'?'err':'warn')}">${a.status}</span>
        ${assignedStore ? `<div class="small muted">Store: ${assignedStore.name}, ${assignedStore.city}</div>` : ''}
      </td>
      <td class="row" style="gap:8px">
        <button data-approve="${a.id}" ${a.status==='approved'?'disabled':''}>Approve</button>
        <button class="danger" data-reject="${a.id}" ${a.status==='rejected'?'disabled':''}>Reject</button>
        <select data-assign-store="${a.id}" ${disabled} style="min-width:180px">${storeOptions}</select>
      </td>
    `;
    tbody.appendChild(tr);
  });
  $('#apps-modal').classList.remove('hidden');
}

function setAppStatus(appId, status){
  const db = getDB();
  const app = db.applications.find(a => a.id === appId);
  if (!app) return;
  app.status = status;
  if (status === "rejected") app.storeId = "";
  setDB(db);
  toast(`Application ${status}.`);
  openApplications(app.campaignId);
  renderCampaigns();
}

function onAppsModalClick(e){
  if (e.target.id === 'apps-close'){ $('#apps-modal').classList.add('hidden'); return; }
  const approve = e.target.getAttribute('data-approve');
  const reject = e.target.getAttribute('data-reject');
  if (approve) setAppStatus(approve, "approved");
  if (reject) setAppStatus(reject, "rejected");
}

function onAppsModalChange(e){
  const appId = e.target.getAttribute('data-assign-store');
  if (!appId) return;
  const storeId = e.target.value;
  const db = getDB();
  const app = db.applications.find(a => a.id === appId);
  if (!app) return;
  if (app.status !== 'approved') { toast("Approve the promoter before assigning a store.", "warn"); return; }
  app.storeId = storeId;
  setDB(db);
  toast("Store assigned.");
  openApplications(app.campaignId);
}

/* -------- Promoters Directory -------- */
function renderPromoters(){
  const db = getDB();
  const tbody = $('#promoters-tbody');
  tbody.innerHTML = "";
  db.users.forEach(u => {
    const completed = profileCompletion(u);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${u.name}</strong><div class="small muted">${u.email} • ${u.profile?.address?.province || '-'}</div></td>
      <td>${u.phone || "-"}</td>
      <td>
        <span class="badge ${u.kycVerified?'ok':'warn'}">${u.kycVerified?'Verified':'Unverified'}</span>
        <div class="small muted">${completed}% complete</div>
      </td>
      <td><button class="secondary" data-view-user="${u.id}">View profile</button></td>
    `;
    tbody.appendChild(tr);
  });
}

function profileCompletion(u){
  const fields = [
    u.name, u.email, u.phone,
    u.profile?.idNumber,
    u.profile?.address?.line1, u.profile?.address?.city, u.profile?.address?.postalCode, u.profile?.address?.country, u.profile?.address?.province,
    (u.profile?.banking?.iban || u.profile?.banking?.accountNumber),
    u.profile?.banking?.bankName, u.profile?.banking?.accountHolder
  ];
  const filled = fields.filter(v => v && String(v).trim().length>0).length;
  return percent(filled, fields.length);
}

function onPromotersTableClick(e){
  const viewId = e.target.getAttribute('data-view-user');
  if (!viewId) return;
  openUserProfile(viewId);
}

function openUserProfile(userId){
  const db = getDB();
  const u = db.users.find(x => x.id === userId);
  if (!u) return;
  $('#user-title').textContent = u.name;
  $('#user-meta').innerHTML = `
    <div class="small muted">${u.email} • ${u.phone||'-'} • ${u.profile?.address?.province||''} • Created ${new Date(u.createdAt).toLocaleDateString()}</div>
  `;
  const body = $('#user-body');
  const p = u.profile || {};
  const addr = p.address || {};
  const bank = p.banking || {};
  const ct = p.contact || {};
  const cv = p.documents?.cv;
  body.innerHTML = `
    <div class="grid grid-2">
      <div class="card">
        <h2>Identity</h2>
        <div class="small muted">ID/Passport Number</div>
        <div>${p.idNumber || '-'}</div>
      </div>
      <div class="card">
        <h2>Contact</h2>
        <div class="small muted">Alt Phone</div><div>${ct.altPhone || '-'}</div>
        <div class="small muted">Emergency Contact</div><div>${ct.emergencyName || '-'} ${ct.emergencyPhone? '• ' + ct.emergencyPhone : ''}</div>
      </div>
      <div class="card">
        <h2>Address</h2>
        <div>${addr.line1 || '-'}</div>
        <div>${addr.line2 || ''}</div>
        <div>${[addr.city, addr.postalCode].filter(Boolean).join(' ') || ''}</div>
        <div>${addr.province || ''}, ${addr.country || ''}</div>
      </div>
      <div class="card">
        <h2>Banking</h2>
        <div class="small muted">Account Holder</div><div>${bank.accountHolder || '-'}</div>
        <div class="small muted">Bank</div><div>${bank.bankName || '-'}</div>
        <div class="small muted">IBAN / Account No.</div><div>${bank.iban || bank.accountNumber || '-'}</div>
        <div class="small muted">Type / Branch</div><div>${[bank.accountType, bank.branchCode].filter(Boolean).join(' / ') || '-'}</div>
      </div>
      <div class="card">
        <h2>Documents</h2>
        ${cv ? `<div>CV: <a href="${cv.data}" download="${cv.name}">${cv.name}</a> <span class="small muted">(${Math.round(cv.size/1024)} KB)</span></div>` : '<div class="small muted">No CV uploaded</div>'}
      </div>
    </div>
  `;
  $('#verify-btn').textContent = u.kycVerified ? "Unverify" : "Mark Verified";
  $('#verify-btn').setAttribute('data-user', u.id);
  $('#user-modal').classList.remove('hidden');
}

function onUserModalClick(e){
  if (e.target.id === 'user-close'){ $('#user-modal').classList.add('hidden'); return; }
  const userId = e.target.getAttribute('data-user');
  if (!userId) return;
  const db = getDB();
  const u = db.users.find(x => x.id === userId);
  if (!u) return;
  u.kycVerified = !u.kycVerified;
  setDB(db);
  toast(`User ${u.kycVerified ? 'verified' : 'unverified'}.`);
  openUserProfile(userId);
  renderPromoters();
}

document.addEventListener('DOMContentLoaded', () => {
  renderState();
  $('#admin-login-form')?.addEventListener('submit', onLogin);
  $('#logout-btn')?.addEventListener('click', onLogout);
  $('#create-campaign-form')?.addEventListener('submit', onCreateCampaign);
  $('#camp-tbody')?.addEventListener('click', onCampTableClick);
  $('#apps-modal')?.addEventListener('click', onAppsModalClick);
  $('#apps-modal')?.addEventListener('change', onAppsModalChange);
  $('#promoters-tbody')?.addEventListener('click', onPromotersTableClick);
  $('#user-modal')?.addEventListener('click', onUserModalClick);
});