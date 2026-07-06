/* ================= ETS 토익 단어장 · app.js =================
   VOCAB (words.js) 를 사용해 홈 / 단어목록 / 퀴즈 / 결과 화면을 그린다.
   프레임워크 없이 순수 JS. 상태(state)를 바꾸고 render()로 다시 그린다.
=============================================================== */

const SET_SIZE = 10;           // 한 세트당 문제 수
const OPTION_COUNT = 4;        // 4지선다

/* ---------- 1. 데이터 준비 ---------- */
// 뜻 문자열 정리: 줄바꿈 → " / ", 공백 정리
function tidy(ko) {
  return ko.replace(/\s*\n\s*/g, ' / ').replace(/\s{2,}/g, ' ').trim();
}
// HTML 이스케이프
function esc(s) {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// 각 Day 를 가공: allWords(전체), sets(10개씩 묶음)
const DAYS = VOCAB.days.map(d => {
  const groups = d.groups.map((g, gi) => ({
    label: g.label,
    gi,
    words: g.words.map(w => ({
      id: `d${d.day}g${gi}n${w.n}`,
      day: d.day, gi, n: w.n,
      en: w.en.trim(),
      ko: tidy(w.ko),
    })),
  }));
  const allWords = groups.flatMap(g => g.words);
  const sets = [];
  for (let i = 0; i < allWords.length; i += SET_SIZE) sets.push(allWords.slice(i, i + SET_SIZE));
  return { day: d.day, title: d.title, groups, allWords, sets };
});
const TOTAL_WORDS = DAYS.reduce((s, d) => s + d.allWords.length, 0);

/* ---------- 2. 진척도 저장(localStorage) ---------- */
const STORE_KEY = 'ets_toeic_v1';
let progress = load();
function load() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || { mastered: {}, sets: {} }; }
  catch { return { mastered: {}, sets: {} }; }
}
function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(progress)); } catch {} }
function masterWord(id) { if (!progress.mastered[id]) { progress.mastered[id] = 1; save(); } }
function dayMastered(d) { return d.allWords.filter(w => progress.mastered[w.id]).length; }
function masteredTotal() { return Object.keys(progress.mastered).length; }

/* ---------- 3. 유틸 ---------- */
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ---------- 4. 상태 & 라우팅 ---------- */
let state = { view: 'home' };
const app = document.getElementById('app');

function go(next) { state = next; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); }

function render() {
  document.body.classList.toggle('hide-ko', !!state.hideKo);
  if (state.view === 'home') app.innerHTML = viewHome();
  else if (state.view === 'day') app.innerHTML = viewDay();
  else if (state.view === 'quiz') app.innerHTML = viewQuiz();
  else if (state.view === 'result') app.innerHTML = viewResult();
  wire();
}

/* ---------- 5. 홈 화면 ---------- */
function viewHome() {
  const mastered = masteredTotal();
  const pct = Math.round((mastered / TOTAL_WORDS) * 100);
  const cards = DAYS.map(d => {
    const m = dayMastered(d), t = d.allWords.length;
    const p = Math.round((m / t) * 100);
    return `
      <button class="day-card ${m === t ? 'done' : ''}" data-day="${d.day}">
        <div class="num">DAY ${String(d.day).padStart(2, '0')}</div>
        <div class="title">${esc(d.title)}</div>
        <div class="meta"><span>단어 ${t}개 · ${d.sets.length}세트</span><span>${m}/${t}</span></div>
        <div class="mini-bar"><i style="width:${p}%"></i></div>
      </button>`;
  }).join('');

  return `
    <section class="hero fade-in">
      <span class="badge">🎯 TOEIC 900 프로젝트</span>
      <h1>ETS 토익 단어장</h1>
      <p>영어 단어를 보고 뜻을 맞히는 4지선다 퀴즈 · Day 1–30 · 총 ${TOTAL_WORDS.toLocaleString()}개</p>
      <div class="overall">
        <div class="row"><span>전체 학습 진척도</span><span><b>${mastered.toLocaleString()}</b> / ${TOTAL_WORDS.toLocaleString()}</span></div>
        <div class="bar"><i style="width:${pct}%"></i></div>
      </div>
    </section>
    <div class="section-title">DAY 선택</div>
    <div class="day-grid fade-in">${cards}</div>`;
}

/* ---------- 6. Day 화면 (목록 / 퀴즈 탭) ---------- */
function viewDay() {
  const d = DAYS[state.day - 1];
  const tab = state.tab || 'list';
  return `
    <div class="topbar fade-in">
      <button class="back" data-act="home">←</button>
      <div class="info">
        <h2>DAY ${d.day}</h2>
        <div class="sub">${esc(d.title)} · 단어 ${d.allWords.length}개</div>
      </div>
    </div>
    <div class="tabs fade-in">
      <button class="tab ${tab === 'list' ? 'active' : ''}" data-tab="list">📖 단어 목록</button>
      <button class="tab ${tab === 'quiz' ? 'active' : ''}" data-tab="quiz">📝 뜻 맞히기 퀴즈</button>
    </div>
    <div class="tab-body fade-in">${tab === 'list' ? viewList(d) : viewSetIntro(d)}</div>`;
}

// 단어 목록
function viewList(d) {
  const q = (state.search || '').toLowerCase();
  const groupsHtml = d.groups.map(g => {
    const words = g.words.filter(w => !q || w.en.toLowerCase().includes(q) || w.ko.toLowerCase().includes(q));
    if (!words.length) return '';
    const cards = words.map(w => {
      const m = /^(phr|v|n|a|ad|adv|prep|conj|pron|int)\.\s*/i.exec(w.ko);
      const pos = m ? m[0].trim() : '';
      const meaning = m ? w.ko.slice(m[0].length) : w.ko;
      return `
        <div class="word-card ${progress.mastered[w.id] ? 'mastered' : ''}">
          <div class="en"><span class="idx">${w.n}</span>${esc(w.en)}${pos ? `<span class="pos">${esc(pos)}</span>` : ''}</div>
          <div class="ko" data-reveal>${esc(meaning)}</div>
        </div>`;
    }).join('');
    return `
      <div class="group-label"><span class="dot"></span><h3>${esc(g.label)}</h3><span class="count">${words.length}개</span></div>
      <div class="word-grid">${cards}</div>`;
  }).join('');

  return `
    <div class="list-toolbar">
      <div class="search">🔎<input id="search" placeholder="영어 또는 한국어로 검색..." value="${esc(state.search || '')}" /></div>
      <button class="btn btn-ghost" data-act="toggle-ko">${state.hideKo ? '👁 뜻 보이기' : '🙈 뜻 가리고 셀프테스트'}</button>
    </div>
    ${groupsHtml || '<div class="empty-note">검색 결과가 없어요.</div>'}`;
}

/* ---------- 7. 퀴즈 세트 선택 ---------- */
function viewSetIntro(d) {
  const cards = d.sets.map((set, i) => {
    const key = `${d.day}-${i}`;
    const best = progress.sets[key];
    const from = i * SET_SIZE + 1, to = i * SET_SIZE + set.length;
    return `
      <button class="set-card" data-set="${i}">
        <div class="s-num">세트 ${i + 1}</div>
        <div class="s-range">${from}–${to}번 · ${set.length}문제</div>
        <div class="s-score ${best == null ? 'empty' : ''}">${best == null ? '미완료' : `최고 ${best}%`}</div>
      </button>`;
  }).join('');
  return `
    <div class="quiz-intro">
      <p>영어 단어를 보고 알맞은 <b>한국어 뜻</b>을 고르세요. 한 세트는 ${SET_SIZE}문제예요.</p>
      <div class="set-grid">${cards}</div>
      <div class="set-actions">
        <button class="btn btn-primary" data-set="0">▶ 세트 1부터 시작</button>
        <button class="btn btn-ghost" data-act="quiz-all">🎲 전체 ${d.allWords.length}문제 랜덤</button>
      </div>
    </div>`;
}

/* ---------- 8. 퀴즈 생성 ---------- */
// 주어진 단어들로 문제 배열 생성. pool 에서 오답 보기 추출.
function buildQuestions(words, pool) {
  return words.map(w => {
    const used = new Set([w.ko]);
    const distractors = [];
    // 같은 그룹(품사군)에서 먼저 뽑아 보기를 비슷하게 → 더 헷갈리게(학습 효과↑)
    const sameGroup = shuffle(pool.filter(c => c.gi === w.gi));
    const others = shuffle(pool.filter(c => c.gi !== w.gi));
    for (const cand of [...sameGroup, ...others]) {
      if (distractors.length >= OPTION_COUNT - 1) break;
      if (used.has(cand.ko)) continue;   // 같은 뜻(동의어) 중복 방지
      used.add(cand.ko);
      distractors.push(cand.ko);
    }
    const options = shuffle([w.ko, ...distractors]);
    return { word: w, options, answer: w.ko };
  });
}

function startQuiz(day, setIdx, words, label) {
  Sound.unlock();
  const d = DAYS[day - 1];
  const questions = buildQuestions(words, d.allWords);
  go({
    view: 'quiz', day, setIdx, label,
    questions, cur: 0, correct: 0, wrong: [], answered: false, picked: null,
    tab: 'quiz',
  });
}

/* ---------- 9. 퀴즈 진행 화면 ---------- */
function viewQuiz() {
  const s = state;
  const total = s.questions.length;
  const q = s.questions[s.cur];
  const pct = Math.round((s.cur / total) * 100);

  const opts = q.options.map((opt, i) => {
    let cls = '';
    if (s.answered) {
      if (opt === q.answer) cls = 'correct';
      else if (opt === s.picked) cls = 'wrong';
    }
    const mark = s.answered ? (opt === q.answer ? '✓' : (opt === s.picked ? '✕' : '')) : '';
    return `
      <button class="option ${cls}" data-opt="${i}" ${s.answered ? 'disabled' : ''}>
        <span class="key">${i + 1}</span>
        <span class="opt-text">${esc(opt)}</span>
        <span class="mark">${mark}</span>
      </button>`;
  }).join('');

  const last = s.cur === total - 1;
  let foot = '';
  if (s.answered) {
    const ok = s.picked === q.answer;
    foot = `
      <span class="q-feedback ${ok ? 'ok' : 'no'}">${ok ? '정답이에요! 🎉' : '아쉬워요, 다시 기억해요'}</span>
      <button class="btn btn-primary" data-act="next">${last ? '결과 보기 →' : '다음 문제 →'}</button>`;
  } else {
    foot = `<span class="q-hint-key">숫자키 1–4 로도 선택할 수 있어요</span><span></span>`;
  }

  return `
    <div class="quiz-wrap fade-in">
      <div class="topbar" style="margin-bottom:18px">
        <button class="back" data-act="back-intro">←</button>
        <div class="info"><h2>DAY ${s.day} · ${esc(s.label)}</h2><div class="sub">뜻 맞히기 퀴즈</div></div>
      </div>
      <div class="quiz-head">
        <span class="q-count">${s.cur + 1} <span style="color:var(--muted)">/ ${total}</span></span>
        <span class="q-right">
          <span class="q-score">정답 <b>${s.correct}</b></span>
          <button class="sound-btn" data-act="toggle-sound" title="효과음 켜기/끄기">${Sound.enabled ? '🔊' : '🔇'}</button>
        </span>
      </div>
      <div class="q-progress"><i style="width:${pct}%"></i></div>
      <div class="q-card">
        <div class="q-label">이 단어의 뜻은?</div>
        <div class="q-word">${esc(q.word.en)}</div>
        <div class="q-hint">${s.answered ? esc(q.word.en) + ' = ' + esc(q.answer) : '&nbsp;'}</div>
      </div>
      <div class="options">${opts}</div>
      <div class="q-foot">${foot}</div>
    </div>`;
}

function answer(i) {
  if (state.answered) return;
  const q = state.questions[state.cur];
  const picked = q.options[i];
  state.answered = true;
  state.picked = picked;
  if (picked === q.answer) { state.correct++; masterWord(q.word.id); Sound.correct(); }
  else { state.wrong.push({ en: q.word.en, ko: q.answer, your: picked }); Sound.wrong(); }
  render();
}

function next() {
  if (state.cur < state.questions.length - 1) { state.cur++; state.answered = false; state.picked = null; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  else finishQuiz();
}

function finishQuiz() {
  const total = state.questions.length;
  const pct = Math.round((state.correct / total) * 100);
  if (state.setIdx != null) {
    const key = `${state.day}-${state.setIdx}`;
    if (progress.sets[key] == null || pct > progress.sets[key]) { progress.sets[key] = pct; save(); }
  }
  Sound.finish();
  go({ view: 'result', day: state.day, setIdx: state.setIdx, label: state.label, correct: state.correct, total, pct, wrong: state.wrong, tab: 'quiz' });
}

/* ---------- 10. 결과 화면 ---------- */
function viewResult() {
  const s = state;
  const R = 78, C = 2 * Math.PI * R;
  const off = C * (1 - s.pct / 100);
  const msg = s.pct === 100 ? '완벽해요! 🏆' : s.pct >= 80 ? '훌륭해요! 💪' : s.pct >= 60 ? '좋아요, 조금만 더! 📈' : '반복이 답이에요, 화이팅! 🔥';
  const color = s.pct >= 80 ? 'var(--good)' : s.pct >= 60 ? 'var(--gold)' : 'var(--bad)';

  const d = DAYS[s.day - 1];
  const hasNext = s.setIdx != null && s.setIdx < d.sets.length - 1;

  const review = s.wrong.length ? `
    <div class="review">
      <h3>틀린 단어 ${s.wrong.length}개 · 다시 확인해요</h3>
      ${s.wrong.map(w => `
        <div class="review-item">
          <div class="rw-en">${esc(w.en)}</div>
          <div class="rw-ko">✓ ${esc(w.ko)}</div>
          <div class="rw-your">✕ 내 선택: ${esc(w.your)}</div>
        </div>`).join('')}
    </div>` : `<div class="review"><h3 style="color:var(--good)">전부 맞혔어요! 🎉 오답이 없습니다.</h3></div>`;

  return `
    <div class="result fade-in">
      <div class="score-ring">
        <svg width="170" height="170">
          <circle cx="85" cy="85" r="${R}" stroke="rgba(255,255,255,.12)" stroke-width="14" fill="none" />
          <circle cx="85" cy="85" r="${R}" stroke="${color}" stroke-width="14" fill="none"
            stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${off}" />
        </svg>
        <div class="pct"><b>${s.pct}%</b><span>${s.correct} / ${s.total}</span></div>
      </div>
      <h2>${msg}</h2>
      <div class="r-sub">DAY ${s.day} · ${esc(s.label)}</div>
      <div class="r-actions">
        <button class="btn btn-primary" data-act="retry">🔁 다시 풀기</button>
        ${hasNext ? `<button class="btn btn-primary" data-act="next-set">▶ 다음 세트</button>` : ''}
        <button class="btn btn-ghost" data-act="back-intro">세트 목록</button>
        <button class="btn btn-ghost" data-act="home">홈으로</button>
      </div>
      ${review}
    </div>`;
}

/* ---------- 11. 이벤트 연결 ---------- */
function wire() {
  // 홈: Day 카드
  app.querySelectorAll('[data-day]').forEach(el =>
    el.onclick = () => go({ view: 'day', day: +el.dataset.day, tab: 'list' }));

  // 뒤로/홈/탭 등 액션
  app.querySelectorAll('[data-act]').forEach(el => {
    el.onclick = () => handleAct(el.dataset.act);
  });

  // Day 탭
  app.querySelectorAll('[data-tab]').forEach(el =>
    el.onclick = () => { state.tab = el.dataset.tab; render(); });

  // 세트 선택 / 시작
  app.querySelectorAll('[data-set]').forEach(el =>
    el.onclick = () => {
      const d = DAYS[state.day - 1];
      const i = +el.dataset.set;
      startQuiz(state.day, i, d.sets[i], `세트 ${i + 1}`);
    });

  // 퀴즈 보기
  app.querySelectorAll('[data-opt]').forEach(el =>
    el.onclick = () => answer(+el.dataset.opt));

  // 검색 입력
  const search = app.querySelector('#search');
  if (search) {
    search.oninput = () => { state.search = search.value; renderListOnly(); };
  }

  // 뜻 가림 상태에서 개별 카드 클릭 → 잠깐 보이기
  app.querySelectorAll('.word-card .ko[data-reveal]').forEach(el =>
    el.onclick = () => { if (state.hideKo) el.classList.toggle('reveal'); });
}

// 목록 탭에서 검색 시 전체 리렌더 대신 목록만 갱신(포커스 유지)
function renderListOnly() {
  const d = DAYS[state.day - 1];
  const body = app.querySelector('.tab-body');
  if (!body) return render();
  const search = app.querySelector('#search');
  const pos = search ? search.selectionStart : null;
  body.innerHTML = viewList(d);
  wire();
  const s2 = app.querySelector('#search');
  if (s2) { s2.focus(); if (pos != null) s2.setSelectionRange(pos, pos); }
}

function handleAct(act) {
  const d = DAYS[state.day - 1];
  switch (act) {
    case 'home': go({ view: 'home' }); break;
    case 'toggle-sound': Sound.toggle(); render(); break;
    case 'toggle-ko': state.hideKo = !state.hideKo; render(); break;
    case 'quiz-all': startQuiz(state.day, null, shuffle(d.allWords), '전체 랜덤'); break;
    case 'next': next(); break;
    case 'back-intro': go({ view: 'day', day: state.day, tab: 'quiz' }); break;
    case 'retry':
      if (state.setIdx != null) startQuiz(state.day, state.setIdx, d.sets[state.setIdx], state.label);
      else startQuiz(state.day, null, shuffle(d.allWords), '전체 랜덤');
      break;
    case 'next-set': {
      const i = state.setIdx + 1;
      startQuiz(state.day, i, d.sets[i], `세트 ${i + 1}`);
      break;
    }
  }
}

/* ---------- 12. 키보드 단축키 ---------- */
document.addEventListener('keydown', e => {
  if (state.view !== 'quiz') return;
  if (['1', '2', '3', '4'].includes(e.key)) {
    const idx = +e.key - 1;
    const q = state.questions[state.cur];
    if (!state.answered && idx < q.options.length) answer(idx);
  } else if ((e.key === 'Enter' || e.key === ' ') && state.answered) {
    e.preventDefault(); next();
  }
});

/* ---------- 시작 ---------- */
render();
