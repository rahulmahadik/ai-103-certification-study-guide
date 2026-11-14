/**
 * practice-quiz.js — no-login section quiz (one question at a time).
 * Study or Pace mode. Previous / Next. Review: short why, then concept.
 */
(function () {
  const root = document.getElementById('quiz-root');
  if (!root) return;

  const dataUrl = root.dataset.src;
  const SECONDS_PER_ITEM = 120;

  const state = {
    section: null,
    mode: 'study',
    answers: {},
    index: 0,
    phase: 'quiz', // quiz | review
    remaining: 0,
    timerId: null,
  };

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (k === 'className') node.className = v;
        else if (k === 'text') node.textContent = v;
        else if (k.startsWith('on') && typeof v === 'function') {
          node.addEventListener(k.slice(2).toLowerCase(), v);
        } else if (v !== null && v !== undefined) node.setAttribute(k, v);
      }
    }
    for (const child of children || []) {
      if (child == null) continue;
      node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    }
    return node;
  }

  function stopTimer() {
    if (state.timerId) {
      clearInterval(state.timerId);
      state.timerId = null;
    }
  }

  function formatTime(sec) {
    const m = Math.floor(Math.max(0, sec) / 60);
    const s = Math.max(0, sec) % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  function items() {
    return state.section?.items || [];
  }

  function current() {
    return items()[state.index] || null;
  }

  function score() {
    let correct = 0;
    for (const item of items()) {
      if (state.answers[item.id] === item.answer) correct++;
    }
    return { correct, total: items().length };
  }

  function answeredCount() {
    return items().filter((it) => state.answers[it.id]).length;
  }

  function render() {
    root.replaceChildren();
    if (!state.section) {
      root.appendChild(el('p', { text: 'Loading…' }));
      return;
    }
    if (!items().length) {
      root.appendChild(el('p', { className: 'pq-note', text: 'No questions in this section yet.' }));
      return;
    }

    if (state.phase === 'quiz') {
      root.appendChild(renderChrome());
      root.appendChild(renderQuestion());
      root.appendChild(renderNav());
    } else {
      root.appendChild(renderReviewChrome());
      root.appendChild(renderReviewCard());
      root.appendChild(renderReviewNav());
    }
  }

  function renderChrome() {
    const wrap = el('div', { className: 'pq-setup' });
    wrap.appendChild(
      el('p', {
        className: 'pq-lede',
        text: `${state.section.skillArea} · ${items().length} questions · one at a time · no sign-in`,
      })
    );

    const modes = el('div', { className: 'pq-modes', role: 'group', 'aria-label': 'Quiz mode' });
    modes.appendChild(modeButton('study', 'Study — no timer'));
    modes.appendChild(
      modeButton(
        'pace',
        `Pace — about ${formatTime(items().length * SECONDS_PER_ITEM)} total`
      )
    );
    wrap.appendChild(modes);

    if (state.mode === 'pace') {
      wrap.appendChild(
        el('p', {
          className: 'pq-timer',
          id: 'pq-timer',
          text: `Time left: ${formatTime(state.remaining)}`,
          'aria-live': 'polite',
        })
      );
    }

    wrap.appendChild(
      el('p', {
        className: 'pq-progress',
        text: `Question ${state.index + 1} of ${items().length} · answered ${answeredCount()}`,
      })
    );
    return wrap;
  }

  function modeButton(mode, label) {
    return el(
      'button',
      {
        type: 'button',
        className: `pq-mode${state.mode === mode ? ' on' : ''}`,
        onClick: () => {
          state.mode = mode;
          if (mode === 'pace') startPaceTimer();
          else stopTimer();
          render();
        },
      },
      [label]
    );
  }

  function startPaceTimer() {
    stopTimer();
    if (!state.remaining) state.remaining = items().length * SECONDS_PER_ITEM;
    state.timerId = setInterval(() => {
      state.remaining -= 1;
      const clock = document.getElementById('pq-timer');
      if (clock) clock.textContent = `Time left: ${formatTime(state.remaining)}`;
      if (state.remaining <= 0) {
        stopTimer();
        goReview();
      }
    }, 1000);
  }

  function renderQuestion() {
    const item = current();
    const card = el('div', { className: 'pq-item pq-focus', id: `q-${item.id}` });
    card.appendChild(el('p', { className: 'pq-stem', text: item.stem }));

    const opts = el('div', {
      className: 'pq-options',
      role: 'radiogroup',
      'aria-label': `Question ${state.index + 1}`,
    });

    for (const opt of item.options) {
      const id = `${item.id}-${opt.id}`;
      const label = el('label', { className: 'pq-option', for: id });
      label.appendChild(
        el('input', {
          type: 'radio',
          name: item.id,
          id,
          value: opt.id,
          checked: state.answers[item.id] === opt.id ? 'checked' : null,
          onChange: () => {
            state.answers[item.id] = opt.id;
            render();
          },
        })
      );
      label.appendChild(el('span', { className: 'pq-opt-letter', text: opt.id }));
      label.appendChild(el('span', { className: 'pq-opt-text', text: opt.text }));
      opts.appendChild(label);
    }
    card.appendChild(opts);
    return card;
  }

  function renderNav() {
    const bar = el('div', { className: 'pq-nav' });
    const atStart = state.index === 0;
    const atEnd = state.index === items().length - 1;
    const unanswered = items().length - answeredCount();

    bar.appendChild(
      el(
        'button',
        {
          type: 'button',
          className: 'pq-nav-btn',
          disabled: atStart ? 'disabled' : null,
          onClick: () => {
            if (state.index > 0) {
              state.index -= 1;
              render();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          },
        },
        ['← Previous']
      )
    );

    bar.appendChild(
      el(
        'button',
        {
          type: 'button',
          className: 'pq-nav-btn pq-nav-primary',
          disabled: atEnd ? 'disabled' : null,
          onClick: () => {
            if (state.index < items().length - 1) {
              state.index += 1;
              render();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          },
        },
        ['Next →']
      )
    );

    bar.appendChild(
      el(
        'button',
        {
          type: 'button',
          className: 'pq-submit',
          onClick: () => {
            if (unanswered > 0) {
              const ok = window.confirm(
                `${unanswered} question${unanswered === 1 ? '' : 's'} still unanswered. Submit anyway?`
              );
              if (!ok) return;
            }
            goReview();
          },
        },
        ['Submit and review']
      )
    );
    return bar;
  }

  function goReview() {
    stopTimer();
    state.phase = 'review';
    state.index = 0;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    render();
  }

  function renderReviewChrome() {
    const { correct, total } = score();
    const wrap = el('div', { className: 'pq-setup' });
    wrap.appendChild(el('h2', { text: `Review — ${correct} of ${total} correct` }));
    wrap.appendChild(
      el('p', {
        className: 'pq-note',
        text: 'This is practice only — not a Microsoft scaled score of 700. Correct answers show a short why first, then the concept.',
      })
    );
    wrap.appendChild(
      el('p', {
        className: 'pq-progress',
        text: `Review ${state.index + 1} of ${items().length}`,
      })
    );
    return wrap;
  }

  function renderReviewCard() {
    const item = current();
    const picked = state.answers[item.id] || null;
    const ok = picked === item.answer;
    const card = el('div', { className: `pq-item pq-focus ${ok ? 'ok' : 'bad'}` });

    card.appendChild(el('p', { className: 'pq-stem', text: item.stem }));
    card.appendChild(
      el('p', {
        className: 'pq-result',
        text: ok
          ? `Your answer ${picked} is correct.`
          : `Your answer ${picked || '(blank)'} — correct is ${item.answer}.`,
      })
    );

    for (const opt of item.options) {
      const isKey = opt.id === item.answer;
      const isPick = opt.id === picked;
      const box = el('div', {
        className: `pq-explain${isKey ? ' key' : ''}${isPick && !isKey ? ' pick' : ''}`,
      });
      box.appendChild(el('p', { className: 'pq-explain-head', text: `${opt.id}. ${opt.text}` }));
      box.appendChild(el('p', { text: opt.why }));
      if (isKey && item.concept) {
        box.appendChild(el('p', { className: 'pq-concept-label', text: 'About this concept' }));
        box.appendChild(el('p', { className: 'pq-concept', text: item.concept }));
      }
      card.appendChild(box);
    }

    if (item.learnUrl) {
      card.appendChild(
        el('p', { className: 'pq-learn' }, [
          el('a', { href: item.learnUrl, target: '_blank', rel: 'noopener' }, [
            'Microsoft Learn source ↗',
          ]),
        ])
      );
    }
    return card;
  }

  function renderReviewNav() {
    const bar = el('div', { className: 'pq-nav' });
    const atStart = state.index === 0;
    const atEnd = state.index === items().length - 1;

    bar.appendChild(
      el(
        'button',
        {
          type: 'button',
          className: 'pq-nav-btn',
          disabled: atStart ? 'disabled' : null,
          onClick: () => {
            if (state.index > 0) {
              state.index -= 1;
              render();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          },
        },
        ['← Previous']
      )
    );

    if (!atEnd) {
      bar.appendChild(
        el(
          'button',
          {
            type: 'button',
            className: 'pq-nav-btn pq-nav-primary',
            onClick: () => {
              state.index += 1;
              render();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            },
          },
          ['Next →']
        )
      );
    } else {
      bar.appendChild(
        el(
          'button',
          {
            type: 'button',
            className: 'pq-submit',
            onClick: () => {
              state.phase = 'quiz';
              state.index = 0;
              state.answers = {};
              state.remaining = 0;
              if (state.mode === 'pace') startPaceTimer();
              render();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            },
          },
          ['Try section again']
        )
      );
    }
    return bar;
  }

  fetch(dataUrl)
    .then((r) => {
      if (!r.ok) throw new Error(`Could not load ${dataUrl}`);
      return r.json();
    })
    .then((data) => {
      state.section = data;
      render();
    })
    .catch((err) => {
      root.replaceChildren(
        el('p', { className: 'pq-note', text: `Could not load this quiz. ${err.message}` })
      );
    });
})();
