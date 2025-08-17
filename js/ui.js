
import { formatDate, showToast } from './utils.js';

export const UI = {
  campaignCard: (c, {showRegion=true, showApply=false, applied=false}={}) => `
    <div class="card">
      <div class="kicker">Campaign • ${formatDate(c.date)}</div>
      <h3>${c.title}</h3>
      ${showRegion ? `<div class="badge">${c.region}</div>` : ''}
      <p style="min-height:48px">${c.details ?? ''}</p>
      <div class="row" style="align-items:center; justify-content:space-between">
        <span class="small">Budget: R ${Number(c.budget||0).toLocaleString()}</span>
        ${showApply ? `<button class="btn" data-apply="${c.id}" ${applied?'disabled':''}>${applied?'Applied':'Apply'}</button>` : ''}
      </div>
    </div>
  `,
  empty: (msg) => `<div class="empty">${msg}</div>`,
  toast: showToast,
};
