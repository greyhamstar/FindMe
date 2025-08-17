
# FindMe! MVP (LocalStorage Demo)

This is a **clean**, minimal set of core HTML/JS files to launch the FindMe! MVP quickly.  
It uses `localStorage` for data so you can run it by just opening the HTML files (or with a simple static server).

## Pages
- `login.html` — Email/password login
- `signup.html` — Create account as **Company** or **Promoter** (promoters select province)
- `promoter_profile.html` — Promoter completes profile (region, skills, availability)
- `promoter_dashboard.html` — Promoters see **campaigns filtered by their region** and can **Apply**
- `company_dashboard.html` — Companies see **Active Campaigns** + a **Show/Hide** button
- `post_campaign.html` — Companies create campaigns
- `applications.html` — Companies view applications (optionally by `?campaignId=...`)

## Data Model (stored in localStorage)
- `users[]` — `{ id, role, name, email, password, region?, skills?, availability? }`
- `campaigns[]` — `{ id, companyId, title, region, date, budget, details, status }`
- `applications[]` — `{ id, campaignId, promoterId, note, status }`
- `session` — `{ userId }`

> Passwords are **base64-encoded only** (for demo). For production, switch to a real backend (Firebase/Supabase) and secure auth.

## Quick Start
Open `index.html` (or directly `login.html`) in your browser.
- Create a company account → post a campaign.
- Create a promoter account → complete profile → see region-filtered campaigns → Apply.
- Company can open **Active Campaigns** and **View Applications**.

## Notes
- 9 SA provinces are preloaded for region selection.
- After posting a campaign, you’re redirected to **Company Dashboard** where it appears instantly.
- The **Active Campaigns** button on the dashboard toggles visibility of running campaigns.
