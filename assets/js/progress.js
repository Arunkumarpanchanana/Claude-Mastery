/* ===== PROGRESS TRACKING ===== */
const Progress = (() => {
  const KEY = 'claude_mastery_progress';
  const TOTAL = 51;

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || { version:1, sessions:{} }; }
    catch(e) { return { version:1, sessions:{} }; }
  }
  function save(data) { localStorage.setItem(KEY, JSON.stringify(data)); }

  return {
    markViewed(id) {
      const d = load(); d.sessions[id] = d.sessions[id] || {};
      d.sessions[id].viewed = true; save(d);
    },
    markQuizPassed(id, score) {
      const d = load(); d.sessions[id] = d.sessions[id] || {};
      d.sessions[id].quizPassed = true; d.sessions[id].quizScore = score;
      d.sessions[id].attempts = (d.sessions[id].attempts || 0) + 1; save(d);
    },
    getSession(id) { return load().sessions[id] || {}; },
    getCompletedCount() { const d = load(); return Object.values(d.sessions).filter(s => s.quizPassed).length; },
    getCompletionPercent() { return Math.round((this.getCompletedCount() / TOTAL) * 100); },
    getAllProgress() { return load(); },
    reset() { localStorage.removeItem(KEY); location.reload(); }
  };
})();
window.Progress = Progress;
