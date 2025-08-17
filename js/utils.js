
export const REGIONS_SA = [
  "Eastern Cape","Free State","Gauteng","KwaZulu-Natal","Limpopo",
  "Mpumalanga","Northern Cape","North West","Western Cape"
];
export const qs = (sel, root=document) => root.querySelector(sel);
export const qsa = (sel, root=document) => Array.from(root.querySelectorAll(sel));
export const uid = () => `${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
export const getParam = (name) => new URLSearchParams(location.search).get(name);
export const formatDate = (iso) => {
  const d = new Date(iso); return d.toLocaleDateString([], {year:'numeric', month:'short', day:'2-digit'});
}
export const showToast = (msg) => {
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(()=> t.remove(), 2800);
};
