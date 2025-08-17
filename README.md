
# FindMe! — Firebase (Promoter Profile Updates + Full Signup)
- **Signup** collects promoter name, surname, SA ID, region, email, password, and **CV upload**.
- **Promoter Profile** lets users update name, surname, SA ID, region, availability, skills, and **replace CV**.
- Companies viewing **Applications** see full info + **View CV** button.

## Setup
1) Firebase project → enable **Auth (Email/Password)**, **Firestore**, **Storage**.
2) Paste your config into `js/firebase.js`.
3) Firestore Rules → `firestore.rules`; Storage Rules → `storage.rules`.
4) Serve locally (VS Code Live Server or `python -m http.server`) and open `index.html`.
