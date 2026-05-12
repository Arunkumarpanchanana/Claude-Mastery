/* ===== QUIZ ENGINE — handles all 3 question formats ===== */
const QuizEngine = (() => {

  /*
   * FORMAT A (Beginner): options are objects with {text, correct} — may have no 'id'
   *   { id:'q1', type:'mcq', question:'...', options:[{text:'A',correct:false},{text:'B',correct:true}], explanation:'...' }
   *
   * FORMAT B (Intermediate/Advanced): options are plain strings, correct is a number index
   *   { question:'...', options:['A','B','C'], correct:1, explanation:'...' }
   *
   * FORMAT C (truefalse): correctAnswer is boolean
   *   { id:'q3', type:'truefalse', question:'...', correctAnswer:false, explanation:'...' }
   */
  function normalize(q, qi) {
    const id = q.id || `q${qi + 1}`;

    // FORMAT C — true/false
    if (q.type === 'truefalse' || q.correctAnswer !== undefined) {
      return {
        id,
        type: 'truefalse',
        points: q.points || 1,
        question: q.question,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation || ''
      };
    }

    // FORMAT A — options are objects with {text, correct}
    if (Array.isArray(q.options) && q.options.length > 0 && typeof q.options[0] === 'object') {
      const opts = q.options.map((o, i) => ({
        id: o.id || String(i),
        text: o.text,
        correct: !!o.correct
      }));
      const multiCorrect = opts.filter(o => o.correct).length > 1;
      return {
        id,
        type: q.type || (multiCorrect ? 'multi' : 'mcq'),
        points: q.points || (multiCorrect ? 2 : 1),
        question: q.question,
        options: opts,
        explanation: q.explanation || ''
      };
    }

    // FORMAT B — options are plain strings, correct is index (number) or array
    if (Array.isArray(q.options) && typeof q.options[0] === 'string') {
      const correctIndices = Array.isArray(q.correct) ? q.correct : [q.correct];
      const opts = q.options.map((text, i) => ({
        id: String(i),
        text,
        correct: correctIndices.includes(i)
      }));
      const isMulti = correctIndices.length > 1;
      return {
        id,
        type: isMulti ? 'multi' : 'mcq',
        points: isMulti ? 2 : 1,
        question: q.question,
        options: opts,
        explanation: q.explanation || ''
      };
    }

    // Fallback — return as-is
    return { id, type: 'mcq', points: 1, question: q.question || 'Question', options: [], explanation: '' };
  }

  function init(sessionId, quizData, container) {
    container.innerHTML = '';
    const questions = quizData.map((q, qi) => normalize(q, qi));

    questions.forEach((q, qi) => {
      const div = document.createElement('div');
      div.className = 'quiz-question';
      div.innerHTML = `
        <div class="quiz-q-num">Question ${qi + 1} of ${questions.length}</div>
        <div class="quiz-q-text">${q.question}</div>
        <div class="quiz-options" id="opts-${q.id}"></div>
        <div class="quiz-explanation" id="exp-${q.id}">${q.explanation}</div>`;
      container.appendChild(div);

      const optsEl = div.querySelector(`#opts-${q.id}`);

      if (q.type === 'truefalse') {
        [{ id: 'true', text: 'True' }, { id: 'false', text: 'False' }].forEach(opt =>
          buildOption(q, opt, optsEl, 'radio')
        );
      } else {
        q.options.forEach(opt =>
          buildOption(q, opt, optsEl, q.type === 'multi' ? 'checkbox' : 'radio')
        );
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

    // Enable submit only when all questions answered
    container.addEventListener('change', () => {
      submitBtn.disabled = !questions.every(q =>
        container.querySelectorAll(`#opts-${q.id} input:checked`).length > 0
      );
    });

    submitBtn.addEventListener('click', () => {
      let totalPoints = 0, earned = 0;

      questions.forEach(q => {
        totalPoints += q.points || 1;
        const optsEl = container.querySelector(`#opts-${q.id}`);
        const expEl  = container.querySelector(`#exp-${q.id}`);
        const qEl    = optsEl.closest('.quiz-question');

        // Disable all inputs
        optsEl.querySelectorAll('input').forEach(inp => inp.disabled = true);
        expEl.classList.add('visible');

        // Check correctness
        let correct = false;
        if (q.type === 'truefalse') {
          const sel = optsEl.querySelector('input:checked');
          correct = sel && (sel.value === 'true') === q.correctAnswer;
        } else if (q.type === 'mcq') {
          const sel = optsEl.querySelector('input:checked');
          correct = sel && q.options.find(o => o.id === sel.value)?.correct === true;
        } else if (q.type === 'multi') {
          const sels = [...optsEl.querySelectorAll('input:checked')].map(i => i.value);
          const correctIds = q.options.filter(o => o.correct).map(o => o.id);
          correct = sels.length === correctIds.length && sels.every(s => correctIds.includes(s));
        }

        if (correct) { earned += q.points || 1; qEl.classList.add('answered-correct'); }
        else { qEl.classList.add('answered-wrong'); }

        // Highlight correct/wrong options
        optsEl.querySelectorAll('.quiz-option').forEach(optEl => {
          const inp = optEl.querySelector('input');
          if (!inp) return;
          const val = inp.value;
          const isCorrect = q.type === 'truefalse'
            ? (val === 'true') === q.correctAnswer
            : q.options?.find(o => o.id === val)?.correct === true;
          if (isCorrect) optEl.classList.add('correct');
          else if (inp.checked) optEl.classList.add('wrong');
          optEl.classList.add('disabled');
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
            <circle cx="50" cy="50" r="42" fill="none" stroke="${passed ? '#16a34a' : '#dc2626'}" stroke-width="8"
              stroke-dasharray="${2 * Math.PI * 42}" stroke-dashoffset="${2 * Math.PI * 42 * (1 - score / 100)}" stroke-linecap="round"/>
          </svg>
          <div class="quiz-score-text">${score}%</div>
        </div>
        <h3>${passed ? '🎉 Well done!' : '📚 Keep studying'}</h3>
        <p>${passed
          ? `You scored ${score}% and passed this session.`
          : `You scored ${score}%. You need 70% to pass. Review the content and try again.`}</p>
        ${passed && window.SESSION_META?.nextPath
          ? `<a href="${window.SESSION_META.nextPath}" class="quiz-next-btn">Next Session →</a>`
          : ''}
        <button class="quiz-retry-btn" onclick="location.reload()">↺ Retry Quiz</button>`;

      if (passed) spawnConfetti(resultEl);
    });
  }

  function buildOption(q, opt, container, inputType) {
    const label = document.createElement('label');
    label.className = 'quiz-option';
    label.innerHTML = `<input type="${inputType}" name="q-${q.id}" value="${opt.id}"> ${opt.text}`;
    container.appendChild(label);
  }

  function spawnConfetti(parent) {
    const colors = ['#d97706', '#f59e0b', '#16a34a', '#3b82f6', '#e8622a'];
    for (let i = 0; i < 24; i++) {
      const p = document.createElement('div');
      p.className = 'confetti-piece';
      p.style.cssText = `left:${Math.random() * 100}%;background:${colors[i % colors.length]};animation-delay:${Math.random() * 0.5}s;animation-duration:${0.8 + Math.random() * 0.6}s;`;
      parent.style.position = 'relative';
      parent.style.overflow = 'hidden';
      parent.appendChild(p);
      setTimeout(() => p.remove(), 1500);
    }
  }

  return { init };
})();
window.QuizEngine = QuizEngine;
