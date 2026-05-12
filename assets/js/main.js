/* ===== MAIN SITE CONTROLLER ===== */
document.addEventListener('DOMContentLoaded', () => {
  loadComponent('nav-placeholder', '/Claude-Mastery/components/nav.html', initNav);
  loadComponent('footer-placeholder', '/Claude-Mastery/components/footer.html', null);
  updateProgressPill();
});

async function loadComponent(placeholderId, url, callback) {
  const el = document.getElementById(placeholderId);
  if (!el) return;
  try {
    const res = await fetch(url);
    if (!res.ok) return;
    el.innerHTML = await res.text();
    if (callback) callback();
  } catch(e) { console.warn(`Could not load: ${url}`, e); }
}

function initNav() {
  const path = window.location.pathname;
  document.querySelectorAll('.nav-links a').forEach(link => {
    const href = link.getAttribute('href');
    if (!href) return;
    const isActive = path === href || (href !== '/Claude-Mastery/' && path.startsWith(href));
    link.classList.toggle('active', isActive);
  });
  const toggle = document.getElementById('mobile-menu-toggle');
  const menu   = document.getElementById('mobile-menu');
  if (toggle && menu) toggle.addEventListener('click', () => menu.classList.toggle('open'));
  updateProgressPill();
}

function updateProgressPill() {
  if (!window.Progress) return;
  const count = Progress.getCompletedCount();
  document.querySelectorAll('.nav-progress-count').forEach(p => { p.textContent = `${count}/51 completed`; });
}

document.addEventListener('click', e => {
  const link = e.target.closest('a[href^="#"]');
  if (!link) return;
  const id = link.getAttribute('href').slice(1);
  const target = document.getElementById(id);
  if (target) { e.preventDefault(); target.scrollIntoView({ behavior:'smooth', block:'start' }); }
});

window.loadComponent = loadComponent;
