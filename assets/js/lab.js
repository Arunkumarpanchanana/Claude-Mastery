/* ===== LAB ENGINE ===== */
const LabEngine = (() => {
  function initCopyButtons() {
    document.querySelectorAll('pre:not(.copy-init)').forEach(pre => {
      pre.classList.add('copy-init');
      const btn = document.createElement('button');
      btn.className = 'copy-btn'; btn.textContent = 'Copy';
      btn.addEventListener('click', () => {
        const code = pre.querySelector('code');
        navigator.clipboard.writeText(code ? code.innerText : pre.innerText).then(() => {
          btn.textContent = 'Copied!'; btn.classList.add('copied');
          setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 2000);
        });
      });
      pre.appendChild(btn);
    });
  }
  return { initCopyButtons };
})();
window.LabEngine = LabEngine;
document.addEventListener('DOMContentLoaded', () => LabEngine.initCopyButtons());
