// Tutorial gamified: stores progress in localStorage and posts to backend
const QUESTS = [
  { id: 'q1', title: 'Prologue', xp: 10, doneKey: 'q1_done' },
  { id: 'q2', title: 'Créer boutique', xp: 30, doneKey: 'q2_done' },
  { id: 'q3', title: 'Ajouter produit', xp: 40, doneKey: 'q3_done' },
  { id: 'q4', title: 'Connecter Moneroo', xp: 30, doneKey: 'q4_done' },
  { id: 'q5', title: 'Première vente', xp: 0, badge: 'first-sale', doneKey: 'q5_done' }
];

function getXP(){return parseInt(localStorage.getItem('tradefy_xp')||'0',10)}
function setXP(v){localStorage.setItem('tradefy_xp',String(v)); updateBar(); saveProgress()}
function addXP(n){setXP(getXP()+n)}

function updateBar(){
  const xp = getXP();
  const bar = document.getElementById('xpBar');
  const pct = Math.min(100, xp % 100);
  bar.style.width = pct+'%';
  bar.textContent = `${xp} XP`;
}

function render(){
  const el = document.getElementById('quests');
  el.innerHTML = QUESTS.map(q=>{
    const done = localStorage.getItem(q.doneKey)==='1';
    return `<div class="list-group-item d-flex justify-content-between align-items-center"><div><strong>${q.title}</strong><div class="text-muted small">+${q.xp} XP</div></div><div><button class="btn ${done? 'btn-success':'btn-outline-neon'}" data-id="${q.id}">${done? 'Complété':'Terminer'}</button></div></div>`
  }).join('');
  document.querySelectorAll('#quests button').forEach(b=>b.addEventListener('click', onComplete));
  renderBadges();
}

function renderBadges(){
  const container = document.getElementById('badges');
  const badges = JSON.parse(localStorage.getItem('tradefy_badges')||'[]');
  container.innerHTML = badges.map(b=>`<div class="badge bg-dark glow text-neon p-3">${b}</div>`).join('');
}

function onComplete(e){
  const id = e.currentTarget.dataset.id;
  const q = QUESTS.find(x=>x.id===id);
  if(!q) return;
  if(localStorage.getItem(q.doneKey)==='1') return;
  if(q.xp) addXP(q.xp);
  if(q.badge){
    const badges = JSON.parse(localStorage.getItem('tradefy_badges')||'[]');
    badges.push(q.badge); localStorage.setItem('tradefy_badges', JSON.stringify(badges));
  }
  localStorage.setItem(q.doneKey,'1');
  render();
}

async function saveProgress(){
  // Call backend to save progression (userId must be provided by your app)
  try{
    const userId = localStorage.getItem('tradefy_user_id');
    if(!userId) return; // anonymous
    await fetch('/api/auth/xp',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId,xp:getXP(),badges:JSON.parse(localStorage.getItem('tradefy_badges')||'[]')})});
  }catch(e){console.warn('saveProgress',e)}
}

updateBar(); render();
