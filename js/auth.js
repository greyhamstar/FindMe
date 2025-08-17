
import { db } from './storage.js';
import { uid, showToast } from './utils.js';

const encode = (s) => btoa(unescape(encodeURIComponent(s))); // demo only

export const Auth = {
  signUp: ({role, name, email, password, region}) => {
    const users = db.all('users');
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error('Email already registered');
    }
    const user = {
      id: uid(),
      role, name, email: email.trim(),
      password: encode(password.trim()),
      region: role === 'promoter' ? region : null,
      skills: role === 'promoter' ? [] : undefined,
      availability: role === 'promoter' ? '' : undefined,
      createdAt: new Date().toISOString()
    };
    db.push('users', user);
    db.setSession({ userId: user.id });
    return user;
  },
  logIn: ({email, password}) => {
    const users = db.all('users');
    const u = users.find(x => x.email.toLowerCase() === email.toLowerCase());
    if (!u || u.password !== encode(password)) throw new Error('Invalid credentials');
    db.setSession({ userId: u.id });
    return u;
  },
  currentUser: () => {
    const s = db.getSession();
    if (!s.userId) return null;
    return db.findById('users', s.userId);
  },
  logout: () => db.clearSession(),
  requireAuth: () => {
    const me = Auth.currentUser();
    if (!me) { location.href = 'login.html'; }
    return me;
  },
  isProfileComplete: (u) => {
    if (u.role === 'promoter') {
      return !!u.region && Array.isArray(u.skills) && u.skills.length > 0 && u.availability?.length > 0;
    }
    return true;
  }
};

export const redirectByRole = (u) => {
  if (u.role === 'company') location.href = 'company_dashboard.html';
  else if (u.role === 'promoter') {
    if (!Auth.isProfileComplete(u)) location.href = 'promoter_profile.html';
    else location.href = 'promoter_dashboard.html';
  }
};

export const ensureNav = () => {
  const me = Auth.currentUser();
  const root = document.querySelector('#nav');
  if (!root) return;
  root.innerHTML = `
    <div class="nav">
      <div class="brand">FindMe<span style="color:#22c55e">!</span></div>
      <div class="right">
        ${me ? `<span class="small">Hi, ${me.name ?? me.email}</span>` : ''}
        ${me && me.role === 'company' ? `<a class="btn" href="post_campaign.html">Post Campaign</a>` : ''}
        ${me && me.role === 'company' ? `<a class="btn secondary" href="company_dashboard.html">Active Campaigns</a>` : ''}
        ${me && me.role === 'promoter' ? `<a class="btn secondary" href="promoter_dashboard.html">Available Campaigns</a>` : ''}
        ${me ? `<button class="btn danger" id="logoutBtn">Logout</button>` : ''}
      </div>
    </div>
  `;
  const btn = document.querySelector('#logoutBtn');
  if (btn) btn.addEventListener('click', ()=> { Auth.logout(); showToast('Logged out'); setTimeout(()=> location.href='login.html', 400); });
};
