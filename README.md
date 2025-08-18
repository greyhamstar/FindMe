
# FindMe! — Full Firebase Project (Approvals + Email + Verification)

Features:
- Promoter **signup** with full name, surname, SA ID, region, email, password, **CV upload** (Firebase Storage).
- Promoter **profile update** with CV replace.
- Company: post campaigns → see **Applications** with promoter details + **Approve/Decline**.
- **Email verification** (send + resend), **password reset**.
- Cloud Functions + **SendGrid** to email promoters on status changes.
- Strong **Firestore** & **Storage** rules.

## Setup
1) Firebase Console → enable **Authentication (Email/Password)**, **Firestore**, **Storage**.
2) Paste your config into `js/firebase.js` (replace placeholders).
3) Firestore → **Rules** → paste `firestore.rules` → **Publish**.
4) Storage → **Rules** → paste `storage.rules` → **Publish**.
5) Serve locally from a web server (not file://), e.g.:
   ```bash
   python -m http.server 8000
   ```
   Open http://localhost:8000

## Cloud Functions (email notifications)
1) Create a SendGrid API key and verify your sender email (or change `from:` in `functions/index.js`).
2) Deploy functions:
   ```bash
   cd functions
   npm install
   # Set key (either env var or functions config)
   export SENDGRID_API_KEY='SG.xxxxxxxx'   # macOS/Linux
   # Windows PowerShell: $Env:SENDGRID_API_KEY='SG.xxxxxxxx'
   # or: firebase functions:config:set sendgrid.key="SG.xxxxxxxx"
   firebase deploy --only functions
   ```

## Flow
- **Company** signs up (role=company) → post campaign.
- **Promoter** signs up (role=promoter) with info + CV → verify email → login → apply.
- **Company** opens **Applications** → Approve/Decline → promoter gets an email.

## Notes
- API keys shown in `js/firebase.js` are placeholders — replace with your exact Web config.
- Storage CV uploads are limited to ≤ 10MB and allowed for the owner only; any logged-in user can **read** CVs.
- Firestore rules restrict creating campaigns to **companies**, and allow only companies to update application **status**.
