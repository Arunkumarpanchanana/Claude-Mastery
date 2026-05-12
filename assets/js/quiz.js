/* ===== QUIZ ENGINE — supports both structured and simple formats ===== */
const QuizEngine = (() => {

  // Normalize any quiz question format into a consistent internal structure
  function normalize(q, qi) {
    // Already structured format: {id, type, options:[{id,text,correct}], ...}
    if (q.type && Array.isArray(q.options) && typeof q.options[0] === 'object' && q.options[0].id) {
      return q; // already canonical
    }

    // Simple format: {question, options:['a','b',...], correct: index, explanation}
    const id = q.id || `q${qi+1}`;
    const type = q.type || (q.correctAnswer !== undefined ? 'truefalse' : 'mcq');

    if (type === 'truefalse') {
      return { id, type: 'truefalse', points: 1, question: q.question,
               correctAnswer: q.correctAnswer, explanation: q.explanation || '' };
    }

    // options is array of strings, correct is index (number) or array of indices
    const opts = (q.options || []).map((text, i) => ({
      id: String(i),
      text: String(text),
      correct: Array.isArray(q.correct) ? q.correct.includes(i) : (q.correct === i)
    }));

    const isMulti = Array.isArray(q.correct) && q.correct.length > 1;
    return { id, type: isMulti ? 'multi' : 'mcq', points: isMulti ? 2 : 1,
             question: q.question, options: opts, explanation: q.explanation || '' };
  }

  function init(sessionId, quizData, container) {
    container.innerHTML = '';
    const normalized = quizData.map((q, qi) => normalize(q, qi));

    normalized.forEach((q, qi) => {
      const div = document.createElement('div');
      div.className = 'quiz-question';
      div.innerHTML = `
        <div class="quiz-q-num">Question ${qi+1} of ${normalized.length}</div>
        <div class="quiz-q-text">${q.question}</div>
        <div class="quiz-options" id="opts-${q.id}"></div>
        <div class="quiz-explanation" id="exp-${q.id}">${q.explanation || ''}</div>`;
      container.appendChild(div);

      const optsEl = div.querySelector(`#opts-${q.id}`);

      if (q.type === 'truefalse') {
        [{id:'true',text:'True'},{id:'false',text:'False'}].forEach(opt => buildOption(q, opt, optsEl, 'truefalse'));
      } else {
        q.options.forEach(opt => buildOption(q, opt, optsEl, q.type));
      }
    });

    const submitBtn = document.createElement('button');
    submitBtn.className = 'quiz-submit-btn';
    submitBtn.textContent = 'Submit Answers';
    submitBtn.disabled = true;
    container.appendChild(submitBtn);

    const resultEl = document.createElement('div');
    resultEl.className = 'quiz-result';
    container.appendChild(resultEl);

    container.addEventListener('change', () => {
      submitBtn.disabled = !normalized.every(q => {
        return container.querySelectorAll(`#opts-${q.id} input:checked`).length > 0;
      });
    });

    submitBtn.addEventListener('click', () => {
      let totalPoints = 0, earned = 0;

      normalized.forEach(q => {
        totalPoints += q.points || 1;
        const optsEl = container.querySelector(`#opts-${q.id}`);
        const expEl  = container.querySelector(`#exp-${q.id}`);
        const qEl    = optsEl.closest('.quiz-question');
        optsEl.querySelectorAll('input').forEach(inp => inp.disabled = true);
        expEl.classList.add('visible');

        let correct = false;
        if (q.type === 'truefalse') {
          const sel = optsEl.querySelector('input:checked');
          correct = sel && (sel.value === 'true') === q.correctAnswer;
        } else if (q.type === 'mcq') {
          const sel = optsEl.querySelector('input:checked');
          correct = sel && q.options.find(o => o.id === sel.value)?.correct;
        } else if (q.type === 'multi') {
          const sels = [...optsEl.querySelectorAll('input:checked')].map(i => i.value);
          const correctIds = q.options.filter(o => o.correct).map(o => o.id);
          correct = sels.length === correctIds.length && sels.every(s => correctIds.includes(s));
        }

        if (correct) { earned += q.points || 1; qEl.classList.add('answered-correct'); }
        else { qEl.classList.add('answered-wrong'); }

        optsEl.querySelectorAll('.quiz-option').forEach(opt => {
          const inp = opt.querySelector('input');
          const val = inp?.value;
          const isCorrect = q.type === 'truefalse'
            ? (val === 'true') === q.correctAnswer
            : q.options?.find(o => o.id === val)?.correct;
          if (isCorrect) opt.classList.add('correct');
          else if (inp?.checked) opt.classList.add('wrong');
          opt.classList.add('disabled');
        });
      });

      const score = Math.round((earned / totalPoints) * 100);
      const passed = score >= 70;
      if (passed) Progress.markQuizPassed(sessionId, score);
      submitBtn.style.display = 'none';

      resultEl.className = 'quiz-result visible';
      resultEl.innerHTML = `
        <div class="quiz-score-ring">
          <svg width="100" height="100" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="#e7e5e4" stroke-width="8"/>
            <circle cx="50" cy="50" r="42" fill="none" stroke="${passed?'#16a34a':'#dc2626'}" stroke-width="8"
              stroke-dasharray="${2*Math.PI*42}" stroke-dashoffset="${2*Math.PI*42*(1-score/100)}" stroke-linecap="round"/>
          </svg>
          <div class="quiz-score-text">${score}%</div>
        </div>
        <h3>${passed ? '🎉 Well done!' : '📚 Keep studying'}</h3>
        <p>${passed ? `You scored ${score}% and passed this session.` : `You scored ${score}%. You need 70% to pass. Review the content and try again.`}</p>
        ${passed && window.SESSION_META?.nextPath ? `<a href="${window.SESSION_META.nextPath}" class="quiz-next-btn">Next Session →</a>` : ''}
        <button class="quiz-retry-btn" onclick="location.reload()">↺ Retry Quiz</button>`;

      if (passed) spawnConfetti(resultEl);
    });
  }

  function buildOption(q, opt, container, type) {
    const label = document.createElement('label');
    label.className = 'quiz-option';
    label.innerHTML = `<input type="${type==='multi'?'checkbox':'radio'}" name="q-${q.id}" value="${opt.id}"> ${opt.text}`;
    container.appendChild(label);
  }

  function spawnConfetti(parent) {
    const colors = ['#d97706','#f59e0b','#16a34a','#3b82f6','#e8622a'];
    for (let i = 0; i < 24; i++) {
      const p = document.createElement('div');
      p.className = 'confetti-piece';
      p.style.cssText = `left:${Math.random()*100}%;background:${colors[i%colors.length]};animation-delay:${Math.random()*0.5}s;animation-duration:${0.8+Math.random()*0.6}s;`;
      parent.style.position = 'relative'; parent.style.overflow = 'hidden';
      parent.appendChild(p);
      setTimeout(() => p.remove(), 1500);
    }
  }

  return { init };
})();
window.QuizEngine = QuizEngine;
