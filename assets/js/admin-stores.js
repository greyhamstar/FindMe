import { getDB, setDB, uid } from './storage.js';
import { loginAdmin, getSession, clearSession } from './auth.js';
import { $, $all, toast } from './ui.js';
import { PROVINCES } from './constants.js';

function ensureAuthed(){
  const session = getSession("admin");
  const authed = !!session;
  $('#stores-login').classList.toggle('hidden', authed);
  $('#stores-app').classList.toggle('hidden', !authed);
  if (authed){
    $('#admin-name').textContent = session.name;
    hydrateProvinceSelects();
    renderStores();
    hydrateCampaigns();
    hydrateReportSelectors();
  }
}

function hydrateProvinceSelects(){
  const sel = $('#s-province');
  if (sel && !sel.dataset.bound){
    sel.innerHTML = `<option value="">Select province</option>` + PROVINCES.map(p=>`<option value="${p}">${p}</option>`).join('');
    sel.dataset.bound = "1";
  }
}

function hydrateCampaigns(){
  const db = getDB();
  const sel = $('#lk-campaign');
  sel.innerHTML = `<option value="">Select campaign</option>` + db.campaigns.map(c=>`<option value="${c.id}">${c.title} • ${c.location} • ${c.date}</option>`).join('');
}

function hydrateReportSelectors(){
  const db = getDB();
  const ssel = $('#rep-store');
  ssel.innerHTML = `<option value="">Select store</option>` + db.stores.map(s=>`<option value="${s.id}">${s.name} • ${s.city}</option>`).join('');
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const dd = String(d.getDate()).padStart(2,'0');
  $('#rep-date').value = `${yyyy}-${mm}-${dd}`;
}

function onLogin(e){
  e.preventDefault();
  const email = $('#adm-email').value.trim();
  const password = $('#adm-pass').value.trim();
  try{
    const admin = loginAdmin({email, password});
    toast(`Welcome ${admin.name}!`);
    ensureAuthed();
  }catch(err){
    toast(err.message, 'err');
  }
}

function onLogout(){
  clearSession("admin");
  ensureAuthed();
}

function renderStores(){
  const db = getDB();
  const tbody = $('#stores-tbody');
  tbody.innerHTML = "";
  db.stores.forEach(s => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${s.name}</strong><div class="small muted">${s.address}</div></td>
      <td>${s.city}</td>
      <td>${s.province}</td>
    `;
    tbody.appendChild(tr);
  });
}

function onCreateStore(e){
  e.preventDefault();
  const name = $('#s-name').value.trim();
  const province = $('#s-province').value;
  const city = $('#s-city').value.trim();
  const address = $('#s-address').value.trim();
  if (!name || !province || !city || !address){ toast("Fill all store fields.", "warn"); return; }
  const db = getDB();
  db.stores.unshift({ id: uid("str"), name, province, city, address });
  setDB(db);
  toast("Store added.");
  e.target.reset();
  renderStores();
}

function onSelectCampaign(){
  renderLinkTable(this.value);
}

function renderLinkTable(campaignId){
  const db = getDB();
  const tbody = $('#link-tbody');
  tbody.innerHTML = "";
  if (!campaignId) return;
  const apps = db.applications.filter(a => a.campaignId === campaignId && a.status === 'approved');
  const stores = db.stores || [];
  apps.forEach(a => {
    const u = db.users.find(u => u.id === a.promoterId);
    const tr = document.createElement('tr');
    const storeOptions = [`<option value="">Select store</option>`]
      .concat(stores.map(s => `<option value="${s.id}" ${a.storeId===s.id?'selected':''}>${s.name} • ${s.city}</option>`))
      .join('');
    tr.innerHTML = `
      <td><strong>${u?.name||'Unknown'}</strong><div class="small muted">${u?.email||''}</div></td>
      <td>
        <select data-assign-store="${a.id}" style="min-width:220px">${storeOptions}</select>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function onAssignChange(e){
  const appId = e.target.getAttribute('data-assign-store');
  if (!appId) return;
  const storeId = e.target.value;
  const db = getDB();
  const app = db.applications.find(a => a.id === appId);
  if (!app) return;
  app.storeId = storeId;
  setDB(db);
  toast("Store linked.");
}

/* ------- Reports ------- */
function loadReport(){
  const db = getDB();
  const storeId = $('#rep-store').value;
  const date = $('#rep-date').value; // YYYY-MM-DD
  const tbody = $('#rep-tbody');
  tbody.innerHTML = "";
  if (!storeId || !date){ toast("Pick store and date.", "warn"); return; }
  const store = db.stores.find(s => s.id === storeId);
  $('#rep-title').textContent = `Report — ${store?.name || ''} — ${date}`;
  const rows = db.checkins.filter(ci => ci.storeId === storeId && ci.date === date);
  rows.forEach(ci => {
    const u = db.users.find(u => u.id === ci.promoterId);
    const camp = db.campaigns.find(c => c.id === ci.campaignId);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${u?.name || 'Unknown'}</strong><div class="small muted">${u?.email || ''}</div></td>
      <td>${camp?.title || '-'}</td>
      <td>${new Date(ci.start).toLocaleTimeString()}</td>
      <td>${ci.end ? new Date(ci.end).toLocaleTimeString() : '-'}</td>
      <td>${formatDuration(ci.seconds)}</td>
    `;
    tbody.appendChild(tr);
  });
  $('#download-btn').dataset.rows = JSON.stringify(rows);
}

function formatDuration(sec){
  const s = Math.max(0, Math.floor(sec||0));
  const h = String(Math.floor(s/3600)).padStart(2,'0');
  const m = String(Math.floor((s%3600)/60)).padStart(2,'0');
  const ss = String(s%60).padStart(2,'0');
  return `${h}:${m}:${ss}`;
}

function downloadCSV(){
  const db = getDB();
  const storeId = $('#rep-store').value;
  const date = $('#rep-date').value;
  if (!storeId || !date){ toast("Pick store and date.", "warn"); return; }
  const rows = db.checkins.filter(ci => ci.storeId === storeId && ci.date === date);
  const store = db.stores.find(s => s.id === storeId);
  const header = ["Promoter Name","Promoter Email","Campaign","Start","End","Duration (sec)"];
  const lines = [header.join(",")];
  rows.forEach(ci => {
    const u = db.users.find(u => u.id === ci.promoterId);
    const camp = db.campaigns.find(c => c.id === ci.campaignId);
    const line = [
      (u?.name||"").replace(/,/g," "),
      (u?.email||"").replace(/,/g," "),
      (camp?.title||"").replace(/,/g," "),
      new Date(ci.start).toISOString(),
      ci.end ? new Date(ci.end).toISOString() : "",
      Math.max(0, Math.floor(ci.seconds||0))
    ].join(",");
    lines.push(line);
  });
  const csv = lines.join("\\n");
  const blob = new Blob([csv], {type: "text/csv"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `checkins_${(store?.name||'store').replace(/\\s+/g,'-')}_${date}.csv`;
  document.body.appendChild(a);
  a.click();
  setTimeout(()=>{
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

document.addEventListener('DOMContentLoaded', () => {
  ensureAuthed();
  $('#stores-login-form')?.addEventListener('submit', onLogin);
  $('#logout-btn')?.addEventListener('click', onLogout);
  $('#create-store-form')?.addEventListener('submit', onCreateStore);
  $('#lk-campaign')?.addEventListener('change', onSelectCampaign);
  $('#link-tbody')?.addEventListener('change', onAssignChange);
  $('#load-report')?.addEventListener('click', loadReport);
  $('#download-btn')?.addEventListener('click', downloadCSV);
});