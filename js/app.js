
const LS={USERS:'findme_users',SESSION:'findme_session',CAMPAIGNS:'findme_campaigns',APPS:'findme_apps',INVITES:'findme_invites',THEME:'findme_theme'};
const load=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??f}catch{ return f}};
const save=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const showMsg=(t,type='success')=>{const m=document.getElementById('msg');if(!m)return;m.className=type;m.textContent=t;setTimeout(()=>{m.textContent='';m.className=''},2400)};
const listUsers=()=>load(LS.USERS,[]), listPromoters=()=>listUsers().filter(u=>u.role==='promoter');
const saveUser=u=>{const a=listUsers();a.push(u);save(LS.USERS,a);return u};
const updateUser=u=>{const a=listUsers(),i=a.findIndex(x=>x.id===u.id); if(i>=0){a[i]=u;save(LS.USERS,a)}};
const getUser=id=>listUsers().find(u=>u.id===id);
const findUserByEmail=e=>listUsers().find(u=>(u.email||'').toLowerCase()===(e||'').toLowerCase());
const setSession=u=>save(LS.SESSION,{id:u.id,role:u.role});
const getSession=()=>{const s=load(LS.SESSION,null);return s?getUser(s.id):null};
const logout=()=>{localStorage.removeItem(LS.SESSION);location.href='login.html'};
const protect=me=>{if(!me) location.href='login.html'};
const listCampaigns=()=>load(LS.CAMPAIGNS,[]), saveCampaign=c=>{const a=listCampaigns();a.push(c);save(LS.CAMPAIGNS,a)};
const getCampaign=id=>listCampaigns().find(c=>c.id===id);
const listApps=()=>load(LS.APPS,[]), applyToCampaign=(cid,pid)=>{const a=listApps(); if(!a.find(x=>x.campaignId===cid&&x.promoterId===pid)){a.push({id:crypto.randomUUID(),campaignId:cid,promoterId:pid,createdAt:Date.now()});save(LS.APPS,a)}};
const listInvites=()=>load(LS.INVITES,[]), getInvite=id=>listInvites().find(i=>i.id===id), invForPromoter=pid=>listInvites().filter(i=>i.promoterId===pid), invForCompany=cid=>listInvites().filter(i=>i.companyId===cid), invForCampaign=cid=>listInvites().filter(i=>i.campaignId===cid);
const sendInvite=(co,pr,cid,message)=>{const a=listInvites(); if(a.find(i=>i.companyId===co&&i.promoterId===pr&&i.campaignId===cid&&i.status==='sent')) return; a.push({id:crypto.randomUUID(),companyId:co,promoterId:pr,campaignId:cid,message,status:'sent',createdAt:Date.now()}); save(LS.INVITES,a)};
const acceptInvite=id=>{const a=listInvites(),i=a.findIndex(x=>x.id===id); if(i>=0){a[i].status='accepted';save(LS.INVITES,a)}};
const declineInvite=id=>{const a=listInvites(),i=a.findIndex(x=>x.id===id); if(i>=0){a[i].status='declined';save(LS.INVITES,a)}};
// Theme + mobile nav
(()=>{ if(load(LS.THEME,'light')==='dark') document.documentElement.classList.add('theme-dark');
  document.addEventListener('click',e=>{
    if(e.target?.id==='navToggle'){ document.querySelector('.nav')?.classList.toggle('open'); }
    if(e.target?.closest('.nav') && e.target.tagName==='A'){ document.querySelector('.nav')?.classList.remove('open'); }
    if(e.target?.id==='themeToggle'){ document.documentElement.classList.toggle('theme-dark'); save(LS.THEME, document.documentElement.classList.contains('theme-dark')?'dark':'light'); }
  });
})();
// Image resize
function resizeImageFile(file, max=900, q=0.9){return new Promise((res,rej)=>{const img=new Image(),r=new FileReader();r.onload=e=>img.src=e.target.result; img.onload=()=>{let w=img.width,h=img.height,s=Math.min(1,max/Math.max(w,h));let nw=Math.round(w*s),nh=Math.round(h*s);const c=document.createElement('canvas');c.width=nw;c.height=nh;c.getContext('2d').drawImage(img,0,0,nw,nh);res(c.toDataURL('image/jpeg',q))}; r.onerror=rej; r.readAsDataURL(file)})}
// Seed demo
(()=>{ if(!listUsers().length){ const co={id:crypto.randomUUID(),role:'company',region:'Gauteng',companyName:'Demo Co',email:'demo@co.com',password:'demo123'}; const p1={id:crypto.randomUUID(),role:'promoter',region:'Gauteng',firstName:'Lebo',surname:'M',idNumber:'0000000000000',email:'lebo@example.com',cvName:'lebo_cv.pdf',password:'demo123',photoFormal:'',ethnicity:'Black',gender:'Female'}; const p2={id:crypto.randomUUID(),role:'promoter',region:'Western Cape',firstName:'Aisha',surname:'Khan',idNumber:'0000000000001',email:'aisha@example.com',cvName:'aisha_cv.pdf',password:'demo123',photoFormal:'',ethnicity:'Indian',gender:'Female'}; save(LS.USERS,[co,p1,p2]); } if(!listCampaigns().length){ const owner=listUsers().find(u=>u.role==='company'); if(owner){ save(LS.CAMPAIGNS,[ {id:crypto.randomUUID(),ownerId:owner.id,title:'Retail Launch',region:'Gauteng',budget:8000,startDate:'2025-09-01',description:'In-store sampling',createdAt:Date.now()}, {id:crypto.randomUUID(),ownerId:owner.id,title:'Campus Drive',region:'KwaZulu-Natal',budget:5000,startDate:'2025-09-10',description:'Campus brand ambassadors',createdAt:Date.now()} ]); } } })();
