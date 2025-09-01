const DB_KEY = "FINDME_DB_V5";
const PREV_KEYS = ["FINDME_DB_V4","FINDME_DB_V3","FINDME_DB_V2","FINDME_DB_V1"];

function seedDB(){
  if (localStorage.getItem(DB_KEY)) return;
  for (const k of PREV_KEYS){
    const raw = localStorage.getItem(k);
    if (!raw) continue;
    try{
      const old = JSON.parse(raw);
      (old.users||[]).forEach(ensureUserProfileShape);
      old.stores = old.stores || [];
      old.applications = (old.applications||[]).map(a => ({...a, storeId: a.storeId || ""}));
      old.checkins = old.checkins || [];
      localStorage.setItem(DB_KEY, JSON.stringify(old));
      return;
    }catch{}
  }
  const now = new Date().toISOString();
  const db = {
    admins: [{ id: "adm-1", email: "admin@findme.dev", password: "admin123", name: "FindMe Admin", createdAt: now }],
    users: [],
    campaigns: [
      { id: "cmp-1", title: "Beverage Launch", brand: "Heineken", location: "Cape Town", date: "2025-09-10", pay: 800, slots: 4, status: "open", createdAt: now }
    ],
    stores: [
      { id: "str-1", name: "Canal Walk", province: "Western Cape", city: "Cape Town", address: "Century Blvd" }
    ],
    applications: [],
    checkins: [], // {id, promoterId, campaignId, storeId, start, end, seconds, date}
    sessions: {}
  };
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function getDB(){
  seedDB();
  let db;
  try{ db = JSON.parse(localStorage.getItem(DB_KEY)) || {}; } catch { db = {}; }
  (db.users||[]).forEach(ensureUserProfileShape);
  db.stores = db.stores || [];
  db.applications = (db.applications||[]).map(a => ({...a, storeId: a.storeId || ""}));
  db.checkins = db.checkins || [];
  return db;
}

function setDB(db){ localStorage.setItem(DB_KEY, JSON.stringify(db)); }

function ensureUserProfileShape(u){
  u.role = u.role || "promoter";
  u.phone = u.phone || "";
  u.profile = u.profile || {};
  u.profile.idNumber = u.profile.idNumber || "";
  u.profile.contact = u.profile.contact || { altPhone:"", emergencyName:"", emergencyPhone:"" };
  u.profile.address = u.profile.address || { line1:"", line2:"", city:"", postalCode:"", country:"South Africa", province:"" };
  if (!u.profile.address.country) u.profile.address.country = "South Africa";
  u.profile.address.province = u.profile.address.province || "";
  u.profile.banking = u.profile.banking || { accountHolder:"", bankName:"", accountNumber:"", iban:"", branchCode:"", accountType:"" };
  u.profile.documents = u.profile.documents || { cv: null };
  if (typeof u.kycVerified === "undefined") u.kycVerified = false;
}

function uid(prefix="id"){ return `${prefix}-${Math.random().toString(36).slice(2,10)}-${Date.now().toString(36)}`; }

export { getDB, setDB, uid, ensureUserProfileShape };