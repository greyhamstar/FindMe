
import { auth, db, storage } from './firebase.js';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { showToast } from './utils.js';

export const Auth = {
  onChange: (cb) => onAuthStateChanged(auth, cb),
  currentUser: () => auth.currentUser,
  logout: async () => { await signOut(auth); },

  // Signup supports promoter extras incl. CV
  signUp: async ({role, name, surname, idNumber, email, password, region, cvFile}) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const displayName = role === 'promoter' ? `${name} ${surname||''}`.trim() : name;
    if (displayName) { await updateProfile(cred.user, { displayName }); }

    let cvUrl = null;
    if (role === 'promoter' && cvFile) {
      const safe = cvFile.name.replace(/[^a-zA-Z0-9._-]/g,'_');
      const r = ref(storage, `cvs/${cred.user.uid}/${Date.now()}_${safe}`);
      const snap = await uploadBytes(r, cvFile);
      cvUrl = await getDownloadURL(snap.ref);
    }

    const userDoc = {
      uid: cred.user.uid, role, name: name || null, surname: surname || null, idNumber: idNumber || null,
      email, region: role==='promoter'? region : null, skills: role==='promoter'? [] : undefined,
      availability: role==='promoter'? '' : undefined, cvUrl: cvUrl || null, createdAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'users', cred.user.uid), userDoc);
    return cred.user;
  },

  logIn: async ({email, password}) => (await signInWithEmailAndPassword(auth, email, password)).user,

  getProfile: async (uid) => {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? snap.data() : null;
  }
};

export const ensureNav = (user) => {
  const root = document.querySelector('#nav'); if (!root) return;
  root.innerHTML = `
    <div class="nav">
      <div class="brand">FindMe<span style="color:#22c55e">!</span></div>
      <div class="right">
        ${user ? `<span class="small">Hi, ${user.displayName || user.email}</span>` : ''}
        ${user ? `<button class="btn danger" id="logoutBtn">Logout</button>` : ''}
      </div>
    </div>`;
  root.querySelector('#logoutBtn')?.addEventListener('click', async ()=>{ await Auth.logout(); showToast('Logged out'); location.href='login.html'; });
};
