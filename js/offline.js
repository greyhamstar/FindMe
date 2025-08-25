
// offline.js — LocalStorage backend for FindMe v5.3
const LS = {
  get(k, def){ try{ return JSON.parse(localStorage.getItem(k) ?? JSON.stringify(def)); }catch{ return def; } },
  set(k, v){ localStorage.setItem(k, JSON.stringify(v)); },
  del(k){ localStorage.removeItem(k); }
};
function uid(){ return 'u_' + Math.random().toString(36).slice(2,10); }
function id(){ return 'id_' + Math.random().toString(36).slice(2,10); }
function now(){ return new Date().toISOString(); }
function hash(s){ let h=0; for(let i=0;i<s.length;i++){ h=((h<<5)-h)+s.charCodeAt(i); h|=0; } return String(h); }


// ===== SUPER USER (edit these two to lock access to yourself) =====
const SUPER_EMAIL = 'admin@findme.local';
const SUPER_PASSWORD = 'admin123';
const SUPER_USER_OBJ = { id:'super', role:'super', firstName:'Super', surname:'Admin', email: SUPER_EMAIL, region:'All' };
// =================================================================

const DB = {
  users: ()=>LS.get('fm_users', []),
  saveUsers: (arr)=>LS.set('fm_users', arr),
  campaigns: ()=>LS.get('fm_campaigns', []),
  saveCampaigns: (arr)=>LS.set('fm_campaigns', arr),
  invites: ()=>LS.get('fm_invites', []),
  saveInvites: (arr)=>LS.set('fm_invites', arr),
  apps: ()=>LS.get('fm_apps', []),
  saveApps: (arr)=>LS.set('fm_apps', arr),
  session: ()=>LS.get('fm_session', {}),
  saveSession: (obj)=>LS.set('fm_session', obj),
  privateDoc: (uid)=>LS.get('fm_private_'+uid, {}),
  savePrivateDoc: (uid, obj)=>LS.set('fm_private_'+uid, obj),
  photo: (uid)=>LS.get('fm_photo_'+uid, null),
  savePhoto: (uid, dataUrl)=>LS.set('fm_photo_'+uid, dataUrl),
};

export function showMsg(t,type='success'){
  const m=document.getElementById('msg'); if(!m) return;
  m.className=type; m.textContent=t; setTimeout(()=>{ m.textContent=''; m.className=''; }, 2400);
}

export function currentUser(){
  const s=DB.session(); if(!s.uid) return null;
  if(s.uid==='super') return SUPER_USER_OBJ; return DB.users().find(u=>u.id===s.uid) || null;
}
export function onAuth(cb){ cb(currentUser()); window.addEventListener('storage', (e)=>{ if(e.key==='fm_session'){ cb(currentUser()); } }); }
export async function signOut(){ DB.saveSession({}); }

export async function signUpPromoter({email,password,region,firstName,surname,idNumber,cvName,ethnicity,gender}){
  const users=DB.users(); if(users.some(u=>u.email.toLowerCase()===email.toLowerCase())) throw new Error('Email already exists.');
  const u={ id: uid(), role:'promoter', region, firstName, surname, idNumber, email, cvName, ethnicity, gender, createdAt: now(), passwordHash: hash(password) };
  users.push(u); DB.saveUsers(users); DB.saveSession({uid: u.id}); return u;
}
export async function signUpCompany({email,password,region,companyName}){
  const users=DB.users(); if(users.some(u=>u.email.toLowerCase()===email.toLowerCase())) throw new Error('Email already exists.');
  const u={ id: uid(), role:'company', region, companyName, email, createdAt: now(), passwordHash: hash(password) };
  users.push(u); DB.saveUsers(users); DB.saveSession({uid: u.id}); return u;
}
export async function signIn(email,password){
  if(email===SUPER_EMAIL && password===SUPER_PASSWORD){ DB.saveSession({uid:'super'}); return SUPER_USER_OBJ; }
  const users=DB.users();
  const u=users.find(x=>x.email.toLowerCase()===email.toLowerCase());
  if(!u || u.passwordHash!==hash(password)) throw new Error('Invalid email or password.');
  DB.saveSession({uid: u.id}); return u;
}

// Users
export async function updateUserDoc(uid, data){
  const users=DB.users(); const i=users.findIndex(u=>u.id===uid); if(i<0) throw new Error('User not found');
  users[i] = { ...users[i], ...data, updatedAt: now() }; DB.saveUsers(users);
}
export async function getUserDoc(uid){ if(uid==='super') return {...SUPER_USER_OBJ}; const u=DB.users().find(u=>u.id===uid); return u ? ({...u}) : null; }
export async function listPromoters(){ return DB.users().filter(u=>u.role==='promoter'); }

// Private doc + photos
export async function getUserPrivate(uid){ return DB.privateDoc(uid) || null; }
export async function updateUserPrivate(uid, data){ const cur=DB.privateDoc(uid) || {}; DB.savePrivateDoc(uid, {...cur, ...data, updatedAt: now(), createdAt: cur.createdAt || now()}); }
export async function uploadFormalPhoto(uid, dataUrl){ DB.savePhoto(uid, dataUrl); await updateUserDoc(uid, { photoFormal: dataUrl }); return dataUrl; }

// Campaigns
export async function postCampaign({ownerId,title,region,budget,startDate,description}){
  const list=DB.campaigns(); const c={ id:id(), ownerId, title, region, budget:Number(budget||0), startDate, description, createdAt: now() };
  list.unshift(c); DB.saveCampaigns(list); return c.id;
}
export async function listCampaignsByRegion(region){ return DB.campaigns().filter(c=>c.region===region).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)); }
export async function listCampaignsByOwner(ownerId){ return DB.campaigns().filter(c=>c.ownerId===ownerId).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)); }

// Applications
export async function applyToCampaign({campaignId, promoterId}){
  const apps=DB.apps();
  const key=`${campaignId}_${promoterId}`;
  let found=apps.find(a=>a.id===key);
  if(!found){
    found={ id:key, campaignId, promoterId, status:'pending', createdAt: now() };
    apps.push(found);
  } else {
    found.updatedAt = now();
  }
  DB.saveApps(apps);
}
function getUserById(id){ return DB.users().find(u=>u.id===id) || null; }
function getCampaignById(id){ return DB.campaigns().find(c=>c.id===id) || null; }
export async function listApplicationsForOwner(ownerId){
  const apps=DB.apps().filter(a=>{ const c=getCampaignById(a.campaignId); return c && c.ownerId===ownerId; });
  return apps.map(a=>({ ...a, status:a.status||'pending', promoter:getUserById(a.promoterId), campaign:getCampaignById(a.campaignId) }))
             .sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
}
export async function listApplicationsForPromoter(promoterId){
  const apps=DB.apps().filter(a=>a.promoterId===promoterId);
  return apps.map(a=>({ ...a, status:a.status||'pending', campaign:getCampaignById(a.campaignId) }))
             .sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
}
export async function updateApplicationStatus(id, status){
  const apps=DB.apps(); const i=apps.findIndex(x=>x.id===id);
  if(i>=0){ apps[i].status=status; apps[i].updatedAt=now(); DB.saveApps(apps); }
}

// Invites
export async function sendInvite({companyId,promoterId,campaignId,message}){
  const inv=DB.invites();
  const key=`${companyId}_${promoterId}_${campaignId}`;
  const item = inv.find(x=>x.id===key);
  if(item){ item.message=message; item.status='sent'; item.updatedAt=now(); }
  else inv.push({ id:key, companyId, promoterId, campaignId, message, status:'sent', createdAt: now() });
  DB.saveInvites(inv);
}
export async function updateInviteStatus(id,status){
  const inv=DB.invites(); const i=inv.findIndex(x=>x.id===id); if(i>=0){ inv[i].status=status; inv[i].updatedAt=now(); DB.saveInvites(inv); }
}
export async function invitesForPromoter(promoterId){
  return DB.invites().filter(i=>i.promoterId===promoterId).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
}
export async function invitesForCompany(companyId){
  return DB.invites().filter(i=>i.companyId===companyId).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
}

export async function listCompanies(){ return DB.users().filter(u=>u.role==='company'); }
