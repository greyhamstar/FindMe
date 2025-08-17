
export const REGIONS_SA = ["Eastern Cape","Free State","Gauteng","KwaZulu-Natal","Limpopo","Mpumalanga","Northern Cape","North West","Western Cape"];
export const formatDate = (iso) => { const d = new Date(iso); return d.toLocaleDateString([], {year:'numeric', month:'short', day:'2-digit'}); };
export const showToast = (msg) => { const t = document.createElement('div'); t.className='toast'; t.textContent=msg; document.body.appendChild(t); setTimeout(()=>t.remove(),2800); };
export const validSouthAfricaID = (id) => /^[0-9]{13}$/.test(id);
