// Theme toggle connected to localStorage
document.addEventListener('DOMContentLoaded', ()=>{
  const body = document.body;
  const toggle = document.getElementById('themeToggle');
  const pref = localStorage.getItem('theme') || 'dark';
  if(pref === 'light') body.classList.add('theme-light');
  toggle && toggle.addEventListener('click', ()=>{
    body.classList.toggle('theme-light');
    localStorage.setItem('theme', body.classList.contains('theme-light') ? 'light' : 'dark');
  });
});

// Simple product list loader for index (example)
async function loadFeatured(){
  try{
    const res = await fetch('/api/products');
    const j = await res.json();
    const container = document.getElementById('products');
    if(!container) return;
    container.innerHTML = j.products.slice(0,6).map(p=>`<div class="col-md-4"><div class="card card-neon h-100"><img src="${p.images?.[0]||'assets/images/poster1.jpg'}" class="card-img-top"/><div class="card-body"><h5 class="card-title">${p.title}</h5><p class="card-text text-muted">$${p.price}</p><div class="d-flex justify-content-between align-items-center"><div class="rating">⭐ ${p._avgRating||'—'}</div><div><a href="product.html?id=${p._id}" class="btn btn-sm btn-primary">Voir</a></div></div></div></div></div>`).join('');
  }catch(e){console.warn('loadFeatured',e)}
}
loadFeatured();
