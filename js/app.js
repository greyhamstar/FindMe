
const LS_KEYS={USERS:'findme_users',SESSION:'findme_session',CAMPAIGNS:'findme_campaigns',APPLICATIONS:'findme_applications',INVITES:'findme_invites'};
function showMsg(text,type='success'){const el=document.getElementById('msg');if(!el)return;el.className=type;el.textContent=text;setTimeout(()=>{el.textContent='';el.className='';},2500);}
function load(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback;}catch(e){return fallback;}}
function save(key,value){localStorage.setItem(key,JSON.stringify(value));}
function saveUser(user){const users=load(LS_KEYS.USERS,[]);users.push(user);save(LS_KEYS.USERS,users);return user;}
function updateUser(user){const users=load(LS_KEYS.USERS,[]);const idx=users.findIndex(u=>u.id===user.id);if(idx>=0){users[idx]=user;save(LS_KEYS.USERS,users);}}
function getUser(id){return load(LS_KEYS.USERS,[]).find(u=>u.id===id);}
function findUserByEmail(email){return load(LS_KEYS.USERS,[]).find(u=>(u.email||'').toLowerCase()===(email||'').toLowerCase());}
function listUsers(){return load(LS_KEYS.USERS,[]);}
function listPromoters(){return listUsers().filter(u=>u.role==='promoter');}
function setSession(user){save(LS_KEYS.SESSION,{id:user.id,role:user.role});}
function getSession(){const s=load(LS_KEYS.SESSION,null);if(!s)return null;return getUser(s.id);}
function logout(){localStorage.removeItem(LS_KEYS.SESSION);window.location.href='login.html';}
function protect(me){if(!me){window.location.href='login.html';}}
function saveCampaign(campaign){const list=load(LS_KEYS.CAMPAIGNS,[]);list.push(campaign);save(LS_KEYS.CAMPAIGNS,list);}
function listCampaigns(){return load(LS_KEYS.CAMPAIGNS,[]);}
function getCampaign(id){return listCampaigns().find(c=>c.id===id);}
function applyToCampaign(campaignId,promoterId){const apps=load(LS_KEYS.APPLICATIONS,[]);if(!apps.find(a=>a.campaignId===campaignId&&a.promoterId===promoterId)){apps.push({id:crypto.randomUUID(),campaignId,promoterId,createdAt:Date.now()});save(LS_KEYS.APPLICATIONS,apps);}}
function listApplications(){return load(LS_KEYS.APPLICATIONS,[]);}
function sendInvite(companyId,promoterId,campaignId,message){const invites=load(LS_KEYS.INVITES,[]);if(invites.find(i=>i.companyId===companyId&&i.promoterId===promoterId&&i.campaignId===campaignId&&i.status==='sent')){return;}invites.push({id:crypto.randomUUID(),companyId,promoterId,campaignId,message,status:'sent',createdAt:Date.now()});save(LS_KEYS.INVITES,invites);}
function listInvites(){return load(LS_KEYS.INVITES,[]);}
function getInvite(id){return listInvites().find(i=>i.id===id);}
function listInvitesForPromoter(promoterId){return listInvites().filter(i=>i.promoterId===promoterId);}
function listInvitesForCompany(companyId){return listInvites().filter(i=>i.companyId===companyId);}
function listInvitesForCampaign(campaignId){return listInvites().filter(i=>i.campaignId===campaignId);}
function acceptInvite(id){const invites=load(LS_KEYS.INVITES,[]);const idx=invites.findIndex(i=>i.id===id);if(idx>=0){invites[idx].status='accepted';save(LS_KEYS.INVITES,invites);}}
function declineInvite(id){const invites=load(LS_KEYS.INVITES,[]);const idx=invites.findIndex(i=>i.id===id);if(idx>=0){invites[idx].status='declined';save(LS_KEYS.INVITES,invites);}}
(function seed(){if(!load(LS_KEYS.USERS,[]).length){const demoCompany={id:crypto.randomUUID(),role:'company',region:'Gauteng',companyName:'Demo Co',email:'demo@co.com',password:'demo123'};const demoPromoter={id:crypto.randomUUID(),role:'promoter',region:'Gauteng',firstName:'Lebo',surname:'M',idNumber:'0000000000000',email:'lebo@example.com',cvName:'lebo_cv.pdf',password:'demo123'};const demoPromoter2={id:crypto.randomUUID(),role:'promoter',region:'Western Cape',firstName:'Aisha',surname:'Khan',idNumber:'0000000000001',email:'aisha@example.com',cvName:'aisha_cv.pdf',password:'demo123'};save(LS_KEYS.USERS,[demoCompany,demoPromoter,demoPromoter2]);}
if(!load(LS_KEYS.CAMPAIGNS,[]).length){const users=load(LS_KEYS.USERS,[]);const owner=users.find(u=>u.role==='company');if(owner){save(LS_KEYS.CAMPAIGNS,[{id:crypto.randomUUID(),ownerId:owner.id,title:'Retail Launch',region:'Gauteng',budget:8000,startDate:'2025-09-01',description:'In-store sampling',createdAt:Date.now()},{id:crypto.randomUUID(),ownerId:owner.id,title:'Campus Drive',region:'KwaZulu-Natal',budget:5000,startDate:'2025-09-10',description:'Campus brand ambassadors',createdAt:Date.now()}]);}}})();