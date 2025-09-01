(function(w){
  const LS={get:(k,d=null)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}},set:(k,v)=>localStorage.setItem(k,JSON.stringify(v))};
  const id=()=>Math.random().toString(36).slice(2)+Date.now().toString(36);
  const now=()=>new Date().toISOString();
  const DB={
    users:()=>LS.get('fm_users',[]), saveUsers:v=>LS.set('fm_users',v),
    session:()=>LS.get('fm_session',{}), saveSession:v=>LS.set('fm_session',v),
    stores:()=>LS.get('fm_stores',[]), saveStores:v=>LS.set('fm_stores',v),
    campaigns:()=>LS.get('fm_campaigns',[]), saveCampaigns:v=>LS.set('fm_campaigns',v),
    links:()=>LS.get('fm_links',[]), saveLinks:v=>LS.set('fm_links',v),
    shifts:()=>LS.get('fm_shifts',[]), saveShifts:v=>LS.set('fm_shifts',v),
  };
  function seed(){
    if(DB.users().length) return;
    const company={id:id(),role:'company',email:'demo@brand.local',password:'demo123',companyName:'Demo Brand'};
    const promoter={id:id(),role:'promoter',email:'promoter@demo.local',password:'demo123',firstName:'Alex',surname:'Mokoena'};
    const superU={id:id(),role:'super',email:'admin@findme.local',password:'admin123'};
    DB.saveUsers([company,promoter,superU]);
    const stores=[
      {id:id(),ownerId:company.id,name:'Mall of Africa',region:'Midrand',lat:-26.0135,lng:28.1048,geoRadius:150},
      {id:id(),ownerId:company.id,name:'Sandton City',region:'Sandton',lat:-26.1065,lng:28.0567,geoRadius:150},
    ]; DB.saveStores(stores);
    const campaigns=[{id:id(),ownerId:company.id,title:'Energy Drink Launch',ratePerHour:80,geoRadius:150,status:'active'}]; DB.saveCampaigns(campaigns);
    DB.saveLinks([{id:id(),campaignId:campaigns[0].id,storeId:stores[0].id,promoterId:promoter.id,createdAt:now()}]);
  }
  function __reset(){ Object.keys(localStorage).filter(k=>/^fm_/.test(k)).forEach(k=>localStorage.removeItem(k)); seed(); }
  function signIn({email,password}){ const u=DB.users().find(x=>x.email===email&&x.password===password); if(!u) throw new Error('Invalid credentials'); DB.saveSession({uid:u.id,ts:now()}); return u; }
  function currentUser(){ const s=DB.session(); return DB.users().find(x=>x.id===s.uid)||null; }
  function onAuth(){
    const u=currentUser();
    const hide=['navPromoters','navStores','navPost','navSuper','navCreate'];
    if(u && u.role==='promoter'){ hide.forEach(id=>{ const el=document.getElementById(id); if(el) el.style.display='none'; }); }
    if(u){ const el=document.getElementById('navCreate'); if(el) el.style.display='none'; }
    const navUser=document.getElementById('navUser'); if(navUser) navUser.textContent = u ? (u.email) : 'Not signed in';
    const navReset=document.getElementById('navReset'); if(navReset){ navReset.onclick=function(){ __reset(); alert('Demo data reset'); location.reload(); }; }
    return u;
  }
  // data access
  const listLinksForPromoter=(pid)=>DB.links().filter(l=>l.promoterId===pid);
  const storeById=(idv)=>DB.stores().find(s=>s.id===idv)||null;
  const campaignById=(idv)=>DB.campaigns().find(c=>c.id===idv)||null;
  function startShift({promoterId,storeId,campaignId,startLoc=null}){ const arr=DB.shifts(); const rec={id:id(),promoterId,storeId,campaignId,startAt:now(),endAt:null}; if(startLoc) rec.startLoc=startLoc; arr.push(rec); DB.saveShifts(arr); localStorage.setItem('fm_lastShiftId', rec.id); return rec; }
  function endShift({shiftId,endLoc=null}){ const arr=DB.shifts(); const s=arr.find(x=>x.id===shiftId); if(!s) throw new Error('No active shift'); s.endAt=now(); if(endLoc) s.endLoc=endLoc; DB.saveShifts(arr); return s; }
  // expose
  w.FM={seed,__reset,signIn,currentUser,onAuth,listLinksForPromoter,storeById,campaignById,startShift,endShift};
  // auto-seed + URL reset
  if(/\breset=1\b/.test(location.search)){ __reset(); }
  seed();
})(window);
// Utilities
window.toast=function(msg, ok){ ok = (ok===undefined)?true:!!ok; const el=document.getElementById('toast'); if(!el) return; el.textContent=msg; el.style.background=ok?'#111':'#b00'; el.classList.add('show'); setTimeout(()=>el.classList.remove('show'),1600); };
(function(){ // burger
  var nav=document.getElementById('mainNav'),btn=document.getElementById('navToggle');
  if(!nav||!btn) return;
  function toggle(){ var open=nav.classList.toggle('open'); btn.setAttribute('aria-expanded', open?'true':'false'); }
  function close(){ nav.classList.remove('open'); btn.setAttribute('aria-expanded','false'); }
  if(!btn.dataset.bnd){ btn.dataset.bnd='1'; btn.addEventListener('click', toggle); }
  var items=nav.querySelector('.nav-items');
  if(items && !items.dataset.bnd){ items.dataset.bnd='1'; items.addEventListener('click', function(e){ if(e.target.tagName==='A'||(e.target.closest&&e.target.closest('a'))){ close(); } }); }
})();