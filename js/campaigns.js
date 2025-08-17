
import { db } from './firebase.js';
import { collection, addDoc, query, where, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export const Campaigns = {
  create: async ({companyId, title, region, date, budget, details}) => {
    const c = { companyId, title, region, date, budget, details, status:'active', createdAt: new Date().toISOString() };
    const ref = await addDoc(collection(db, 'campaigns'), c);
    return { id: ref.id, ...c };
  },
  forCompany: async (companyId) => {
    const qy = query(collection(db, 'campaigns'), where('companyId','==',companyId), where('status','==','active'));
    const snap = await getDocs(qy); return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },
  forRegion: async (region) => {
    const qy = query(collection(db, 'campaigns'), where('region','==',region), where('status','==','active'));
    const snap = await getDocs(qy); return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },
  get: async (id) => { const s = await getDoc(doc(db,'campaigns', id)); return s.exists()? { id, ...s.data() }: null; }
};

export const Applications = {
  create: async ({campaignId, promoterId, note}) => {
    const curr = await Applications.forPromoterCampaign({campaignId, promoterId}); if (curr.length) return null;
    const a = { campaignId, promoterId, note: note||'', status:'pending', createdAt: new Date().toISOString() };
    const ref = await addDoc(collection(db, 'applications'), a);
    return { id: ref.id, ...a };
  },
  forPromoterCampaign: async ({campaignId, promoterId}) => {
    const qy = query(collection(db, 'applications'), where('campaignId','==',campaignId), where('promoterId','==',promoterId));
    const snap = await getDocs(qy); return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },
  forCompany: async (companyId) => {
    const camps = await Campaigns.forCompany(companyId); const ids = new Set(camps.map(c=>c.id));
    const snap = await getDocs(collection(db, 'applications'));
    return snap.docs.map(d=>({ id: d.id, ...d.data() })).filter(a => ids.has(a.campaignId));
  },
  forCampaign: async (campaignId) => {
    const qy = query(collection(db, 'applications'), where('campaignId','==',campaignId));
    const snap = await getDocs(qy); return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }
};
