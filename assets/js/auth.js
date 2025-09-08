
import { getDB, setDB, uid, ensureUserProfileShape } from './storage.js';
function setSession(role, payload){ const db=getDB(); db.sessions=db.sessions||{}; db.sessions[role]=payload; setDB(db); }
function getSession(role){ const db=getDB(); return db.sessions?db.sessions[role]:null; }
function clearSession(role){ const db=getDB(); if(db.sessions) delete db.sessions[role]; setDB(db); }
function registerPromoter({name,email,phone,password,province}){
  const db=getDB();
  if (db.users.find(u=>u.email.toLowerCase()===email.toLowerCase())) throw new Error("Email already registered.");
  const user={ id:uid('usr'), role:'promoter', name, email, phone, password, createdAt:new Date().toISOString(),
    profile:{ idNumber:"", address:{ line1:"", line2:"", city:"", postalCode:"", country:"South Africa", province:province||"" },
      contact:{ altPhone:"", emergencyName:"", emergencyPhone:"" },
      banking:{ accountHolder:"", bankName:"", accountNumber:"", iban:"", branchCode:"", accountType:"" },
      documents:{ cv:null } }, kycVerified:false };
  db.users.push(user); setDB(db); setSession('promoter', { id:user.id, name:user.name, email:user.email }); return user;
}
function loginPromoter({email,password}){
  const db=getDB(); const u=db.users.find(x=>x.email.toLowerCase()===email.toLowerCase() && x.password===password);
  if (!u) throw new Error("Invalid credentials."); ensureUserProfileShape(u); setSession('promoter', { id:u.id, name:u.name, email:u.email }); return u;
}
function loginAdmin({email,password}){
  const db=getDB(); const adm=db.admins.find(x=>x.email.toLowerCase()===email.toLowerCase() && x.password===password);
  if (!adm) throw new Error("Invalid admin credentials."); setSession('admin', { id:adm.id, name:adm.name, email:adm.email }); return adm;
}
export { registerPromoter, loginPromoter, loginAdmin, getSession, clearSession };
