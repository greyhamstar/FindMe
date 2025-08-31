
// LocalStorage helpers
const LS = { get:(k,d)=>{ try{return JSON.parse(localStorage.getItem(k)??JSON.stringify(d));}catch{ return d; } }, set:(k,v)=>localStorage.setItem(k, JSON.stringify(v)), del:(k)=>localStorage.removeItem(k) };
function uid(){ return 'u_' + Math.random().toString(36).slice(2,10); }
function id(){ return 'id_' + Math.random().toString(36).slice(2,10); }
function now(){ return new Date().toISOString(); }
function hash(s){ let h=0; for(let i=0;i<s.length;i++){ h=((h<<5)-h)+s.charCodeAt(i); h|=0; } return String(h); }
function toNumber(x){ const n=Number(x); return isFinite(n)?n:null; }
function haversine(lat1, lon1, lat2, lon2){ const R=6371000, rad=(d)=>d*Math.PI/180; const dLat=rad(lat2-lat1), dLon=rad(lon2-lon1); const a=Math.sin(dLat/2)**2 + Math.cos(rad(lat1))*Math.cos(rad(lat2))*Math.sin(dLon/2)**2; return 2*R*Math.asin(Math.sqrt(a)); }

// Super admin
const SUPER_EMAIL = 'admin@findme.local';
const SUPER_PASSWORD = 'admin123';
const SUPER_USER_OBJ = { id:'super', role:'super', firstName:'Super', surname:'Admin', email: SUPER_EMAIL, region:'All' };

// "DB" via LocalStorage
const DB = {
  users: ()=>LS.get('fm_users', []),               saveUsers:(v)=>LS.set('fm_users', v),
  campaigns: ()=>LS.get('fm_campaigns', []),       saveCampaigns:(v)=>LS.set('fm_campaigns', v),
  invites: ()=>LS.get('fm_invites', []),           saveInvites:(v)=>LS.set('fm_invites', v),
  apps: ()=>LS.get('fm_apps', []),                 saveApps:(v)=>LS.set('fm_apps', v),
  session: ()=>LS.get('fm_session', {}),           saveSession:(v)=>LS.set('fm_session', v),
  privateDoc:(uid)=>LS.get('fm_private_'+uid, {}), savePrivateDoc:(uid,v)=>LS.set('fm_private_'+uid, v),
  photo:(uid)=>LS.get('fm_photo_'+uid, null),      savePhoto:(uid,v)=>LS.set('fm_photo_'+uid, v),
  stores: ()=>LS.get('fm_stores', []),             saveStores:(v)=>LS.set('fm_stores', v),
  storeLinks:()=>LS.get('fm_store_links', []),     saveStoreLinks:(v)=>LS.set('fm_store_links', v),
  checkins: ()=>LS.get('fm_checkins', []),         saveCheckins:(v)=>LS.set('fm_checkins', v),
  shifts: ()=>LS.get('fm_shifts', []),             saveShifts:(v)=>LS.set('fm_shifts', v),
  campTeam: ()=>LS.get('fm_camp_team', []),        saveCampTeam:(v)=>LS.set('fm_camp_team', v),
  campStoreLinks: ()=>LS.get('fm_camp_store_links', []), saveCampStoreLinks:(v)=>LS.set('fm_camp_store_links', v),
};

// Session
export function currentUser(){ const s=DB.session(); if(!s.uid) return null; if(s.uid==='super') return SUPER_USER_OBJ; return DB.users().find(u=>u.id===s.uid)||null; }
export function onAuth(cb){ cb(currentUser()); window.addEventListener('storage', (e)=>{ if(e.key==='fm_session') cb(currentUser()); }); }
export async function signOut(){ DB.saveSession({}); }

// Auth
export async function signUpPromoter({email,password,region,firstName,surname,idNumber,ethnicity,gender}){
  const users=DB.users(); if(users.some(u=>u.email.toLowerCase()===email.toLowerCase())) throw new Error('Email already exists.');
  const u={ id: uid(), role:'promoter', region, firstName, surname, idNumber, email, ethnicity, gender, createdAt: now(), passwordHash: hash(password) };
  users.push(u); DB.saveUsers(users); DB.saveSession({uid: u.id}); return u;
}
export async function signUpCompany({email,password,region,companyName}){
  const users=DB.users(); if(users.some(u=>u.email.toLowerCase()===email.toLowerCase())) throw new Error('Email already exists.');
  const u={ id: uid(), role:'company', region, companyName, email, createdAt: now(), passwordHash: hash(password) };
  users.push(u); DB.saveUsers(users); DB.saveSession({uid: u.id}); return u;
}
export async function signIn(email,password){
  if(email===SUPER_EMAIL && password===SUPER_PASSWORD){ DB.saveSession({uid:'super'}); return SUPER_USER_OBJ; }
  const u=DB.users().find(x=>x.email.toLowerCase()===email.toLowerCase());
  if(!u || u.passwordHash!==hash(password)) throw new Error('Invalid email or password.');
  DB.saveSession({uid: u.id}); return u;
}

// Users
export async function updateUserDoc(uid, data){ const users=DB.users(); const i=users.findIndex(u=>u.id===uid); if(i<0) throw new Error('User not found'); users[i]={...users[i], ...data, updatedAt: now()}; DB.saveUsers(users); }
export async function getUserDoc(uid){ if(uid==='super') return {...SUPER_USER_OBJ}; const u=DB.users().find(u=>u.id===uid); return u?({...u}):null; }
export async function listPromoters(){ return DB.users().filter(u=>u.role==='promoter'); }
export async function getUserPrivate(uid){ return DB.privateDoc(uid) || {}; }
export async function updateUserPrivate(uid, data){ const cur=DB.privateDoc(uid)||{}; DB.savePrivateDoc(uid,{...cur,...data, updatedAt: now(), createdAt: cur.createdAt||now()}); }
export async function uploadFormalPhoto(uid, dataUrl){ DB.savePhoto(uid,dataUrl); await updateUserDoc(uid,{ photoFormal:dataUrl }); return dataUrl; }
export async function uploadCv(uid, name, dataUrl){ const rec = { name, dataUrl, uploadedAt: now() }; localStorage.setItem('fm_cv_'+uid, JSON.stringify(rec)); const users=DB.users(); const i=users.findIndex(u=>u.id===uid); if(i>=0){ users[i].cvName=name; DB.saveUsers(users);} return rec; }

// Campaigns & Applications
export async function postCampaign({ownerId,title,region,budget,startDate,endDate,description}){
  const list=DB.campaigns(); const c={ id:id(), ownerId, title, region, budget:Number(budget||0), startDate, endDate, description, createdAt: now() }; list.unshift(c); DB.saveCampaigns(list); return c.id;
}
export async function listCampaignsByRegion(region){ return DB.campaigns().filter(c=>c.region===region).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)); }
export async function listCampaignsByOwner(ownerId){ return DB.campaigns().filter(c=>c.ownerId===ownerId).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)); }
export async function getCampaignById(campaignId){ return DB.campaigns().find(c=>c.id===campaignId)||null; }
export async function deleteCampaign(ownerId, campaignId){ const camps=DB.campaigns(); const i=camps.findIndex(c=>c.id===campaignId && c.ownerId===ownerId); if(i>=0){ camps.splice(i,1); DB.saveCampaigns(camps); } DB.saveApps(DB.apps().filter(a=>a.campaignId!==campaignId)); DB.saveInvites(DB.invites().filter(i=>i.campaignId!==campaignId)); DB.saveCampTeam(DB.campTeam().filter(t=>t.campaignId!==campaignId)); }

export async function applyToCampaign({campaignId, promoterId}){
  const apps=DB.apps(); const key=`${campaignId}_${promoterId}`;
  let found=apps.find(a=>a.id===key);
  if(!found){ found={ id:key, campaignId, promoterId, status:'pending', createdAt: now() }; apps.push(found); }
  else { found.updatedAt = now(); }
  DB.saveApps(apps);
}
export async function listApplicationsForOwner(ownerId){
  const apps=DB.apps().filter(a=>{ const c=DB.campaigns().find(x=>x.id===a.campaignId); return c && c.ownerId===ownerId; });
  return apps.map(a=>({ ...a, status:a.status||'pending', promoter:DB.users().find(u=>u.id===a.promoterId), campaign:DB.campaigns().find(c=>c.id===a.campaignId) })).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
}
export async function listApplicationsForPromoter(promoterId){
  const apps=DB.apps().filter(a=>a.promoterId===promoterId);
  return apps.map(a=>({ ...a, status:a.status||'pending', campaign:DB.campaigns().find(c=>c.id===a.campaignId) })).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
}
export async function updateApplicationStatus(id, status){
  const apps=DB.apps(); const i=apps.findIndex(x=>x.id===id);
  if(i>=0){
    apps[i].status=status; apps[i].updatedAt=now(); DB.saveApps(apps);
    // auto add to team on accept
    if(status==='accepted'){
      const a=apps[i]; const camp=DB.campaigns().find(c=>c.id===a.campaignId);
      if(camp){ const team=DB.campTeam(); const tid=`${a.campaignId}_${a.promoterId}`;
        if(!team.find(t=>t.id===tid)){ team.push({ id:tid, campaignId:a.campaignId, promoterId:a.promoterId, byOwnerId:camp.ownerId, createdAt: now() }); DB.saveCampTeam(team); }
      }
    }
  }
}

// Invites
export async function sendInvite({companyId,promoterId,campaignId,message}){
  const inv=DB.invites(); const key=`${companyId}_${promoterId}_${campaignId}`;
  const item = inv.find(x=>x.id===key);
  if(item){ item.message=message; item.status='sent'; item.updatedAt=now(); }
  else inv.push({ id:key, companyId, promoterId, campaignId, message, status:'sent', createdAt: now() });
  DB.saveInvites(inv);
}
export async function updateInviteStatus(id,status){
  const inv=DB.invites(); const i=inv.findIndex(x=>x.id===id); if(i>=0){ inv[i].status=status; inv[i].updatedAt=now(); DB.saveInvites(inv); }
}
export async function invitesForPromoter(promoterId){ return DB.invites().filter(i=>i.promoterId===promoterId).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)); }
export async function invitesForCompany(companyId){ return DB.invites().filter(i=>i.companyId===companyId).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)); }

// Stores & Check-ins
export async function addStore({ownerId,name,code,region,address,lat,lng}){
  const list=DB.stores(); const s={ id:id(), ownerId, name:name?.trim(), code:code?.trim(), region, address:address?.trim(), lat:toNumber(lat), lng:toNumber(lng), createdAt: now() };
  list.unshift(s); DB.saveStores(list); return s.id;
}
export async function listStoresByOwner(ownerId){ return DB.stores().filter(s=>s.ownerId===ownerId).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)); }
export async function getStore(storeId){ return DB.stores().find(s=>s.id===storeId)||null; }
export async function deleteStore(ownerId, storeId){
  const stores=DB.stores(); const i=stores.findIndex(s=>s.id===storeId && s.ownerId===ownerId);
  if(i>=0){ stores.splice(i,1); DB.saveStores(stores); }
  const links=DB.storeLinks(); DB.saveStoreLinks(links.filter(l=>l.storeId!==storeId));
  const ch=DB.checkins(); DB.saveCheckins(ch.filter(c=>c.storeId!==storeId));
}

export async function assignPromoterToStore({ownerId, storeId, promoterId}){
  const links=DB.storeLinks(); const id=`${storeId}_${promoterId}`;
  if(!links.find(x=>x.id===id)){ links.push({ id, ownerId, storeId, promoterId, createdAt: now() }); DB.saveStoreLinks(links); }
  return id;
}
export async function unassignPromoterFromStore(id){
  const links=DB.storeLinks(); const i=links.findIndex(x=>x.id===id); if(i>=0){ links.splice(i,1); DB.saveStoreLinks(links); }
}
export async function listStoreAssignments(storeId){ return DB.storeLinks().filter(l=>l.storeId===storeId).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)); }
export async function listStoresForPromoter(promoterId){
  const ids = DB.storeLinks().filter(l=>l.promoterId===promoterId).map(l=>l.storeId);
  return DB.stores().filter(s=>ids.includes(s.id));
}
export async function checkInAtStore({storeId, promoterId, lat, lng, radiusMeters=200}){
  const s=await getStore(storeId); if(!s) throw new Error('Store not found');
  const d=(s.lat!=null && s.lng!=null && lat!=null && lng!=null)?Math.round(haversine(s.lat,s.lng,lat,lng)):null;
  const ok=(d!=null)?(d<=radiusMeters):false;
  const list=DB.checkins(); const rec={ id:`${storeId}_${promoterId}_${Date.now()}`, storeId, promoterId, lat, lng, distanceMeters:d, withinRadius:ok, radiusMeters, when:now() };
  list.push(rec); DB.saveCheckins(list); return rec;
}
export async function listCheckinsForStore(storeId){ return DB.checkins().filter(c=>c.storeId===storeId).sort((a,b)=>new Date(b.when)-new Date(a.when)); }

// Shifts (clock-in/clock-out with timer)
export async function getActiveShift(promoterId){
  const list = DB.shifts();
  return list.find(s=>s.promoterId===promoterId && !s.end) || null;
}
export async function startShiftAtStore({storeId, promoterId, lat, lng, radiusMeters=200}){
  const active = await getActiveShift(promoterId);
  if(active) throw new Error('You already have an active shift.');
  try { await checkInAtStore({storeId, promoterId, lat, lng, radiusMeters}); } catch(e){ /* noop */ }
  const shifts = DB.shifts();
  const s = { id:`${storeId}_${promoterId}_${Date.now()}`, storeId, promoterId, start: now(), end: null };
  shifts.push(s); DB.saveShifts(shifts); return s;
}
export async function endShift({promoterId}){
  const shifts = DB.shifts();
  const idx = shifts.findIndex(s=>s.promoterId===promoterId && !s.end);
  if(idx<0) throw new Error('No active shift.');
  shifts[idx].end = now(); DB.saveShifts(shifts); return shifts[idx];
}
export function shiftElapsedMs(shift){
  const start = new Date(shift.start).getTime();
  const end = shift.end ? new Date(shift.end).getTime() : Date.now();
  return Math.max(0, end - start);
}

// Campaign team lists (manual assignment + promoter view)
export async function assignToCampaign({campaignId, promoterId, byOwnerId}){
  const team=DB.campTeam(); const id=`${campaignId}_${promoterId}`;
  if(!team.find(t=>t.id===id)){
    team.push({ id, campaignId, promoterId, byOwnerId, createdAt: now() });
    DB.saveCampTeam(team);
  }
  return id;
}
export async function unassignFromCampaign(id){
  const team=DB.campTeam(); const i=team.findIndex(t=>t.id===id);
  if(i>=0){ team.splice(i,1); DB.saveCampTeam(team); }
}
export async function listCampaignTeam(campaignId){
  return DB.campTeam().filter(t=>t.campaignId===campaignId).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
}
export async function listCampaignsForPromoter(promoterId){
  const ids = DB.campTeam().filter(t=>t.promoterId===promoterId).map(t=>t.campaignId);
  return DB.campaigns().filter(c=>ids.includes(c.id)).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
}

// Link promoter to specific (campaign, store)
export async function linkPromoterToCampaignStore({campaignId, storeId, promoterId}){
  if(!campaignId||!storeId||!promoterId) throw new Error('campaignId, storeId, promoterId required');
  await assignToCampaign({campaignId, promoterId});
  await assignPromoterToStore({storeId, promoterId});
  const links = DB.campStoreLinks();
  const exists = links.some(l=>l.campaignId===campaignId && l.storeId===storeId && l.promoterId===promoterId);
  if(!exists){
    links.push({ id: id(), campaignId, storeId, promoterId, createdAt: now() });
    DB.saveCampStoreLinks(links);
  }
  return true;
}
export async function unlinkPromoterFromCampaignStore(id){
  const links = DB.campStoreLinks();
  const i = links.findIndex(l=>l.id===id);
  if(i>=0){ links.splice(i,1); DB.saveCampStoreLinks(links); }
}
export async function listCampaignStoreAssignmentsForPromoter(promoterId){
  const links = DB.campStoreLinks().filter(l=>l.promoterId===promoterId);
  const stores = DB.stores(); const camps = DB.campaigns();
  return links.map(l=>({ id:l.id, store: stores.find(s=>s.id===l.storeId)||null, campaign: camps.find(c=>c.id===l.campaignId)||null }));
}
export async function listCampaignStoreLinksByOwner(ownerId){
  const links = DB.campStoreLinks();
  const stores = DB.stores().filter(s=>s.ownerId===ownerId);
  const camps = DB.campaigns().filter(c=>c.ownerId===ownerId);
  const promoters = DB.users().filter(u=>u.role==='promoter');
  const storeById = Object.fromEntries(stores.map(s=>[s.id,s]));
  const campById = Object.fromEntries(camps.map(c=>[c.id,c]));
  const promById = Object.fromEntries(promoters.map(p=>[p.id,p]));
  return links
    .filter(l => storeById[l.storeId] && campById[l.campaignId])
    .map(l => ({ id:l.id, store:storeById[l.storeId], campaign:campById[l.campaignId], promoter: promById[l.promoterId] || null }));
}


export async function listShiftsForPromoter(promoterId, {from=null, to=null}={}){
  const all = (DB.shifts ? DB.shifts() : []).filter(s=>s.promoterId===promoterId);
  // normalize to timestamps
  const fms = from ? (new Date(from)).getTime() : null;
  const tms = to ? (new Date(to)).getTime() : null;
  return all.filter(s=>{
    const start = new Date(s.startAt||s.start||s.startTime||0).getTime();
    if(fms && start < fms) return false;
    if(tms && start > tms) return false;
    return true;
  }).sort((a,b)=> (new Date(b.startAt||b.start||0)) - (new Date(a.startAt||a.start||0)));
}

export function shiftDurationHours(shift){
  const st = new Date(shift.startAt||shift.start||shift.startTime||0).getTime();
  const et = new Date(shift.endAt||shift.end||shift.endTime||0).getTime();
  if(!st || !et || et<st) return 0;
  return (et - st) / 3600000;
}

// --- Invites API ---
export async function createInvite({ownerId, promoterId, campaignId=null, storeId=null}){
  if(!ownerId||!promoterId) throw new Error('ownerId and promoterId are required');
  const inv = { id:id(), ownerId, promoterId, campaignId:campaignId||null, storeId:storeId||null, status:'pending', createdAt:now() };
  const invs = DB.invites(); invs.push(inv); DB.saveInvites(invs);
  return inv;
}
export async function listInvitesForPromoter(promoterId){
  return DB.invites().filter(i=>i.promoterId===promoterId).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
}
export async function listInvitesByOwner(ownerId){
  return DB.invites().filter(i=>i.ownerId===ownerId).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
}
export async function respondToInvite({inviteId, action}){
  const invs = DB.invites(); const i = invs.find(x=>x.id===inviteId); if(!i) throw new Error('Invite not found');
  if(i.status!=='pending') return i;
  if(action==='accept'){
    i.status='accepted'; i.acceptedAt=now(); DB.saveInvites(invs);
    // if campaign/store specified, link exact pair; otherwise just join campaign if provided
    if(i.campaignId && i.storeId){ try{ await linkPromoterToCampaignStore({campaignId:i.campaignId, storeId:i.storeId, promoterId:i.promoterId}); }catch(e){} }
    else if(i.campaignId){ try{ await assignToCampaign({campaignId:i.campaignId, promoterId:i.promoterId}); }catch(e){} }
    return i;
  }else if(action==='decline'){
    i.status='declined'; i.declinedAt=now(); DB.saveInvites(invs); return i;
  }else{
    throw new Error('Unknown action');
  }
}
export async function revokeInvite(inviteId){
  const invs = DB.invites(); const i = invs.findIndex(x=>x.id===inviteId); if(i<0) return;
  invs[i].status='revoked'; invs[i].revokedAt=now(); DB.saveInvites(invs);
}
