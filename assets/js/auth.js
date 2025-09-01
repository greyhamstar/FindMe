import { getDB, setDB, uid, ensureUserProfileShape } from './storage.js';

function setSession(role, payload){
  const db = getDB();
  db.sessions = db.sessions || {};
  db.sessions[role] = payload;
  setDB(db);
}

function getSession(role){
  const db = getDB();
  return db.sessions ? db.sessions[role] : null;
}

function clearSession(role){
  const db = getDB();
  if (db.sessions) delete db.sessions[role];
  setDB(db);
}

function registerPromoter({name, email, phone, password, province}){
  const db = getDB();
  if (db.users.find(u => u.email.toLowerCase() === email.toLowerCase())){
    throw new Error("Email already registered.");
  }
  const user = {
    id: uid("usr"),
    role: "promoter",
    name, email, phone, password,
    createdAt: new Date().toISOString(),
    profile: {
      idNumber: "",
      contact: { altPhone:"", emergencyName:"", emergencyPhone:"" },
      address: { line1:"", line2:"", city:"", postalCode:"", country:"South Africa", province: province || "" },
      banking: { accountHolder:"", bankName:"", accountNumber:"", iban:"", branchCode:"", accountType:"" },
      documents: { cv: null }
    },
    kycVerified: false
  };
  db.users.push(user);
  setDB(db);
  setSession("promoter", { id: user.id, name: user.name, email: user.email });
  return user;
}

function loginPromoter({email, password}){
  const db = getDB();
  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
  if (!user) throw new Error("Invalid credentials.");
  ensureUserProfileShape(user);
  setSession("promoter", { id: user.id, name: user.name, email: user.email });
  return user;
}

function loginAdmin({email, password}){
  const db = getDB();
  const admin = db.admins.find(a => a.email.toLowerCase() === email.toLowerCase() && a.password === password);
  if (!admin) throw new Error("Invalid admin credentials.");
  setSession("admin", { id: admin.id, name: admin.name, email: admin.email });
  return admin;
}

export { registerPromoter, loginPromoter, loginAdmin, getSession, clearSession };