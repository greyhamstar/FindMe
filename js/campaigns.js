
import { db } from './storage.js';
import { uid } from './utils.js';

export const Campaigns = {
  create: ({companyId, title, region, date, budget, details}) => {
    const c = { id: uid(), companyId, title, region, date, budget, details, createdAt: new Date().toISOString(), status:'active' };
    db.push('campaigns', c);
    return c;
  },
  forCompany: (companyId) => db.where('campaigns', c => c.companyId === companyId && c.status === 'active'),
  allActive: () => db.where('campaigns', c => c.status === 'active'),
  forRegion: (region) => db.where('campaigns', c => c.region === region && c.status === 'active'),
  get: (id) => db.findById('campaigns', id),

  hasApplied: (campaignId, promoterId) => db.where('applications', a => a.campaignId === campaignId && a.promoterId === promoterId).length > 0,
  apply: ({campaignId, promoterId, note}) => {
    if (Campaigns.hasApplied(campaignId, promoterId)) return null;
    const app = { id: uid(), campaignId, promoterId, note: note ?? '', createdAt: new Date().toISOString(), status:'pending' };
    db.push('applications', app);
    return app;
  },
  applicationsForCompany: (companyId) => {
    const mine = Campaigns.forCompany(companyId).map(c=>c.id);
    return db.where('applications', a => mine.includes(a.campaignId));
  },
  applicationsForCampaign: (campaignId) => db.where('applications', a => a.campaignId === campaignId),
};
