# FindMe — Front-End Starter (v5)

### New in v5
- **Mobile burger menu (Promoter)** for fast navigation:
  - Available campaigns
  - My applications
  - Store check‑in (new)
  - My profile
- **Store Check‑In with live timer**:
  - When a promoter is **approved and assigned to a store**, they tap the store name in **My applications** to open **Store check‑in**.
  - Check **In/Out** and see a live HH:MM:SS timer.
  - Check‑ins are saved to `localStorage` (`checkins[]`) with start/end and total seconds.
- **Admin store report (CSV)**:
  - On `admin-stores.html`, choose a **store + date**, load the **daily check‑ins**, and **Download CSV**.

> ⚠️ Demo only: still using `localStorage` (no auth tokens, no server). Don’t use with real PII. For production we’ll move to Firebase Auth + Firestore + Storage, with Cloud Functions to generate signed CSV exports.

### Quick test
1. Open `index.html` with VS Code **Live Server**.
2. Admin: create campaign(s), go to **Stores** to add stores.
3. Promoter: sign up → apply.
4. Admin: approve the promoter and assign a store.
5. Promoter: **My applications** → tap the store badge → **Check In**, let timer run → **Check Out**.
6. Admin (Stores): pick **store + date** → **Load** → **Download CSV**.

### File map
- `promoter.html` + `assets/js/promoter.js` — mobile drawer + check‑in workflow.
- `admin-stores.html` + `assets/js/admin-stores.js` — stores CRUD + linking + daily report CSV.
- `admin.html` + `assets/js/admin.js` — campaigns, applications, promoters.
- `assets/js/storage.js` — DB v5 with `checkins[]`.