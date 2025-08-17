
const read = (k, fallback) => {
  try { return JSON.parse(localStorage.getItem(k)) ?? fallback; } catch { return fallback; }
};
const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const ensure = (k, initial=[]) => { if (localStorage.getItem(k) === null) write(k, initial); };
ensure('users', []);
ensure('campaigns', []);
ensure('applications', []);
ensure('session', {});

export const db = {
  all: (k) => read(k, []),
  saveAll: (k, arr) => write(k, arr),
  push: (k, obj) => { const arr = read(k, []); arr.push(obj); write(k, arr); return obj; },
  findById: (k, id) => read(k, []).find(x => x.id === id),
  updateById: (k, id, fn) => {
    const arr = read(k, []);
    const idx = arr.findIndex(x => x.id === id);
    if (idx >= 0) { arr[idx] = fn(arr[idx]); write(k, arr); return arr[idx]; }
    return null;
  },
  where: (k, fn) => read(k, []).filter(fn),
  setSession: (obj) => write('session', obj),
  getSession: () => read('session', {}),
  clearSession: () => write('session', {}),
};
