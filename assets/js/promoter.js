import { getDB, setDB, uid, ensureUserProfileShape } from './storage.js';
import { registerPromoter, loginPromoter, getSession, clearSession } from './auth.js';
import { $, $all, toast, formatHMS } from './ui.js';
import { PROVINCES } from './constants.js';

let timerInt = null;

function renderState(){
  const session = getSession("promoter");
  const authed = !!session;
  $('#auth-card').classList.toggle('hidden', authed);
  $('#promoter-app').classList.toggle('hidden', !authed);
  if (authed) {
    $('#promoter-name').textContent = session.name;
    renderAvailable();
    renderMyApps();
    loadProfileForm();
    syncActiveTimer();
  } else {
    hydrateProvinceSelects();
  }
}

function hydrateProvinceSelects(){
  const sel = $('#su-province');
  if (sel && !sel.dataset.bound){
    sel.innerHTML = `<option value="">Select your province</option>` + PROVINCES.map(p=>`<option value="${p}">${p}</option>`).join('');
    sel.dataset.bound = "1";
  }
  const psel = $('#pf-province');
  if (psel && !psel.dataset.bound){
    psel.innerHTML = `<option value="">Select province</option>` + PROVINCES.map(p=>`<option value="${p}">${p}</option>`).join('');
    psel.dataset.bound = "1";
  }
}

/* --------- Mobile Drawer --------- */
function toggleDrawer(open){
  $('#drawer').classList.toggle('open', open);
  $('#overlay').classList.toggle('open', open);
}
function showSection(id){
  $all('[data-section]').forEach(el => el.classList.add('hidden'));
  $(id).classList.remove('hidden');
  toggleDrawer(false);
  if (id === '#section-checkin'){ syncActiveTimer(); }
}

/* -------- Auth -------- */
function onSignup(e){
  e.preventDefault();
  const name = $('#su-name').value.trim();
  const email = $('#su-email').value.trim();
  const phone = $('#su-phone').value.trim();
  const province = $('#su-province').value;
  const password = $('#su-pass').value.trim();
  if (!province){ toast("Please choose your province.", "warn"); return; }
  try{
    const u = registerPromoter({name, email, phone, password, province});
    toast(`Welcome ${u.name}! You are signed in.`);
    renderState();
  }catch(err){
    toast(err.message, 'err');
  }
}

function onLogin(e){
  e.preventDefault();
  const email = $('#li-email').value.trim();
  const password = $('#li-pass').value.trim();
  try{
    const u = loginPromoter({email, password});
    toast(`Welcome back ${u.name}!`);
    renderState();
  }catch(err){
    toast(err.message, 'err');
  }
}

function onLogout(){
  clearSession("promoter");
  renderState();
}

/* -------- Campaigns -------- */
function renderAvailable(){
  const db = getDB();
  const session = getSession("promoter");
  const myApps = new Set(db.applications.filter(a => a.promoterId === session.id).map(a => a.campaignId));
  const tbody = $('#avail-tbody');
  tbody.innerHTML = "";
  db.campaigns
    .filter(c => c.status === "open")
    .forEach(c => {
      const applied = myApps.has(c.id);
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${c.title}</strong><div class="small muted">${c.brand}</div></td>
        <td>${c.location}<div class="small muted">${c.date}</div></td>
        <td><button data-apply="${c.id}" ${applied?'disabled':''}>${applied?'Applied':'Apply'}</button></td>
      `;
      tbody.appendChild(tr);
    });
}

function renderMyApps(){
  const db = getDB();
  const session = getSession("promoter");
  const tbody = $('#myapps-tbody');
  const stores = db.stores || [];
  tbody.innerHTML = "";
  db.applications
    .filter(a => a.promoterId === session.id)
    .sort((a,b)=>a.createdAt<b.createdAt?1:-1)
    .forEach(a => {
      const c = db.campaigns.find(c => c.id === a.campaignId);
      const store = stores.find(s => s.id === a.storeId);
      const canCheckIn = a.status === 'approved' && store;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${c?.title||'Campaign deleted'}</strong><div class="small muted">${c?.brand||''}</div></td>
        <td>
          ${c?.location||''}<div class="small muted">${c?.date||''}</div>
          ${store? `<div class="small muted">Store: <button class="secondary small" data-open-checkin data-store="${store.id}" data-campaign="${c?.id||''}">${store.name}, ${store.city}</button></div>`:''}
        </td>
        <td><span class="badge ${a.status==='approved'?'ok':(a.status==='rejected'?'err':'warn')}">${a.status}</span></td>
      `;
      tbody.appendChild(tr);
    });
}

function onTableClick(e){
  const applyId = e.target.getAttribute('data-apply');
  if (applyId){
    const db = getDB();
    const session = getSession("promoter");
    const already = db.applications.find(a => a.campaignId === applyId && a.promoterId === session.id);
    if (already){ toast("You already applied."); return; }
    db.applications.push({ id: uid("app"), campaignId: applyId, promoterId: session.id, status: "applied", storeId: "", createdAt: new Date().toISOString() });
    setDB(db);
    toast("Applied!");
    renderAvailable();
    renderMyApps();
    return;
  }
  if (e.target.hasAttribute('data-open-checkin')){
    const storeId = e.target.getAttribute('data-store');
    const campaignId = e.target.getAttribute('data-campaign');
    openCheckin(storeId, campaignId);
  }
}

/* -------- Check-in logic -------- */
function currentActiveCheckin(){
  const db = getDB();
  const session = getSession("promoter");
  return db.checkins.find(ci => ci.promoterId === session.id && !ci.end) || null;
}

function openCheckin(storeId, campaignId){
  showSection('#section-checkin');
  const db = getDB();
  const store = db.stores.find(s => s.id === storeId);
  const camp = db.campaigns.find(c => c.id === campaignId);
  $('#ci-store').textContent = `${store?.name||''} — ${store?.city||''}`;
  $('#ci-campaign').textContent = `${camp?.title||''}`;
  $('#ci-store').dataset.store = storeId;
  $('#ci-store').dataset.campaign = campaignId;
  syncActiveTimer();
}

function syncActiveTimer(){
  clearInterval(timerInt);
  const ci = currentActiveCheckin();
  const btn = $('#ci-btn');
  const timer = $('#ci-timer');
  if (!$('#section-checkin') || $('#section-checkin').classList.contains('hidden')) return;
  if (ci){
    btn.textContent = "Check Out";
    btn.dataset.mode = "out";
    timer.dataset.start = ci.start;
    tickTimer(); // update immediately
    timerInt = setInterval(tickTimer, 1000);
  }else{
    btn.textContent = "Check In";
    btn.dataset.mode = "in";
    timer.textContent = "00:00:00";
    delete timer.dataset.start;
  }
}

function tickTimer(){
  const timer = $('#ci-timer');
  const start = timer.dataset.start;
  if (!start){ timer.textContent = "00:00:00"; return; }
  const secs = Math.floor((Date.now() - new Date(start).getTime())/1000);
  timer.textContent = formatHMS(secs);
}

function onCheckinClick(){
  const mode = this.dataset.mode;
  const db = getDB();
  const session = getSession("promoter");
  if (mode === "in"){
    // require selected store & approved app
    const storeId = $('#ci-store').dataset.store;
    const campaignId = $('#ci-store').dataset.campaign;
    const hasApproved = db.applications.some(a => a.promoterId===session.id && a.campaignId===campaignId && a.storeId===storeId && a.status==='approved');
    if (!hasApproved){ toast("You need an approved assignment to check in.", "warn"); return; }
    if (currentActiveCheckin()){ toast("You are already checked in.", "warn"); return; }
    const start = new Date();
    const date = start.toISOString().slice(0,10);
    db.checkins.push({ id: uid("ci"), promoterId: session.id, campaignId, storeId, start: start.toISOString(), end: null, seconds: 0, date });
    setDB(db);
    toast("Checked in.");
  }else{
    const ci = currentActiveCheckin();
    if (!ci){ toast("No active check-in.", "warn"); return; }
    ci.end = new Date().toISOString();
    ci.seconds = Math.max(0, Math.floor((new Date(ci.end).getTime() - new Date(ci.start).getTime())/1000));
    setDB(db);
    toast("Checked out.");
  }
  syncActiveTimer();
  renderMyApps();
}

/* -------- Profile -------- */
function loadProfileForm(){
  hydrateProvinceSelects();
  const db = getDB();
  const session = getSession("promoter");
  const u = db.users.find(x => x.id === session.id);
  if (!u) return;
  ensureUserProfileShape(u);
  $('#pf-name').value = u.name || "";
  $('#pf-email').value = u.email || "";
  $('#pf-phone').value = u.phone || "";
  $('#pf-idnum').value = u.profile.idNumber || "";
  $('#pf-line1').value = u.profile.address.line1 || "";
  $('#pf-line2').value = u.profile.address.line2 || "";
  $('#pf-city').value = u.profile.address.city || "";
  $('#pf-postal').value = u.profile.address.postalCode || "";
  $('#pf-country').value = u.profile.address.country || "South Africa";
  $('#pf-province').value = u.profile.address.province || "";
  $('#pf-accholder').value = u.profile.banking.accountHolder || "";
  $('#pf-bankname').value = u.profile.banking.bankName || "";
  $('#pf-iban').value = u.profile.banking.iban || "";
  $('#pf-accnum').value = u.profile.banking.accountNumber || "";
  $('#pf-acctype').value = u.profile.banking.accountType || "";
  $('#pf-branch').value = u.profile.banking.branchCode || "";
  $('#pf-altphone').value = u.profile.contact.altPhone || "";
  $('#pf-emgname').value = u.profile.contact.emergencyName || "";
  $('#pf-emgphone').value = u.profile.contact.emergencyPhone || "";
  $('#kyc-badge').textContent = u.kycVerified ? "Verified" : "Unverified";
  $('#kyc-badge').className = `badge ${u.kycVerified?'ok':'warn'}`;
}

function onSaveProfile(e){
  e.preventDefault();
  const db = getDB();
  const session = getSession("promoter");
  const u = db.users.find(x => x.id === session.id);
  if (!u) return;
  const idNumber = $('#pf-idnum').value.trim();
  if (!idNumber){ toast("ID/Passport number is required.", "warn"); return; }
  u.name = $('#pf-name').value.trim() || u.name;
  u.email = $('#pf-email').value.trim() || u.email;
  u.phone = $('#pf-phone').value.trim();
  u.profile.idNumber = idNumber;
  u.profile.address.line1 = $('#pf-line1').value.trim();
  u.profile.address.line2 = $('#pf-line2').value.trim();
  u.profile.address.city = $('#pf-city').value.trim();
  u.profile.address.postalCode = $('#pf-postal').value.trim();
  u.profile.address.country = $('#pf-country').value.trim() || "South Africa";
  u.profile.address.province = $('#pf-province').value;
  u.profile.banking.accountHolder = $('#pf-accholder').value.trim();
  u.profile.banking.bankName = $('#pf-bankname').value.trim();
  u.profile.banking.iban = $('#pf-iban').value.trim();
  u.profile.banking.accountNumber = $('#pf-accnum').value.trim();
  u.profile.banking.accountType = $('#pf-acctype').value.trim();
  u.profile.banking.branchCode = $('#pf-branch').value.trim();
  u.profile.contact.altPhone = $('#pf-altphone').value.trim();
  u.profile.contact.emergencyName = $('#pf-emgname').value.trim();
  u.profile.contact.emergencyPhone = $('#pf-emgphone').value.trim();
  u.profileUpdatedAt = new Date().toISOString();
  setDB(db);
  toast("Profile saved.");
  loadProfileForm();
}

/* -------- Init bindings -------- */
document.addEventListener('DOMContentLoaded', () => {
  renderState();
  $('#signup-form')?.addEventListener('submit', onSignup);
  $('#login-form')?.addEventListener('submit', onLogin);
  $('#logout-btn')?.addEventListener('click', onLogout);
  $('#avail-tbody')?.addEventListener('click', onTableClick);
  $('#myapps-tbody')?.addEventListener('click', onTableClick);
  $('#profile-form')?.addEventListener('submit', onSaveProfile);
  // drawer
  $('#burger')?.addEventListener('click', ()=>toggleDrawer(true));
  $('#overlay')?.addEventListener('click', ()=>toggleDrawer(false));
  $all('[data-nav]').forEach(a => a.addEventListener('click', (e)=>{
    e.preventDefault();
    showSection(a.getAttribute('href'));
  }));
  // checkin
  $('#ci-btn')?.addEventListener('click', onCheckinClick);
});