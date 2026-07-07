/* ================= ETS 토익 단어장 · app.js =================
   VOCAB(words.js)로 홈 / 단어목록 / 퀴즈 / 결과 화면을 그린다.
   프레임워크 없이 순수 JS. state 를 바꾸고 render()로 다시 그린다.
   - 진척도(마스터) 기능 제거 → 대신 '즐겨찾기(★)'로 복습
   - 한 세트 20문제, 순서 랜덤, 이전/다음 이동 가능
=============================================================== */

const SET_SIZE = 20;           // 한 세트당 문제 수
const OPTION_COUNT = 4;        // 4지선다

/* ---------- 1. 데이터 준비 ---------- */
function tidy(ko) { return ko.replace(/\s*\n\s*/g, ' / ').replace(/\s{2,}/g, ' ').trim(); }
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

const DAYS = VOCAB.days.map(d => {
  const groups = d.groups.map((g, gi) => ({
    label: g.label, gi,
    words: g.words.map(w => ({
      id: `d${d.day}g${gi}n${w.n}`,
      day: d.day, gi, n: w.n,
      en: w.en.trim(), ko: tidy(w.ko),
    })),
  }));
  const allWords = groups.flatMap(g => g.words);
  const sets = [];
  for (let i = 0; i < allWords.length; i += SET_SIZE) sets.push(allWords.slice(i, i + SET_SIZE));
  return { day: d.day, title: d.title, groups, allWords, sets };
});
const TOTAL_WORDS = DAYS.reduce((s, d) => s + d.allWords.length, 0);
const WORD_BY_ID = {};
DAYS.forEach(d => d.allWords.forEach(w => { WORD_BY_ID[w.id] = w; }));

/* ---------- 2. 즐겨찾기 저장(localStorage) ---------- */
try { localStorage.removeItem('ets_toeic_v1'); } catch {}   // 옛 진척도 기록 삭제
const FAV_KEY = 'ets_favorites';
let favSet = loadFav();
function loadFav() { try { return new Set(JSON.parse(localStorage.getItem(FAV_KEY)) || []); } catch { return new Set(); } }
function saveFav() { try { localStorage.setItem(FAV_KEY, JSON.stringify([...favSet])); } catch {} }
function isFav(id) { return favSet.has(id); }
function toggleFav(id) { favSet.has(id) ? favSet.delete(id) : favSet.add(id); saveFav(); }
function favWords() { return [...favSet].map(id => WORD_BY_ID[id]).filter(Boolean); }

/* ---------- 3. 유틸 ---------- */
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function favBtn(id) {
  return `<button class="fav ${isFav(id) ? 'on' : ''}" data-fav="${id}" title="즐겨찾기" aria-label="즐겨찾기">${isFav(id) ? '★' : '☆'}</button>`;
}
function topTop() { window.scrollTo({ top: 0, behavior: 'smooth' }); }

/* ---------- 4. 상태 & 라우팅 ---------- */
let state = { view: 'home' };
const app = document.getElementById('app');

function go(next) { state = next; render(); topTop(); }
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
  const favN = favWords().length;
  const cards = DAYS.map(d => `
    <button class="day-card" data-day="${d.day}">
      <div class="num">DAY ${String(d.day).padStart(2, '0')}</div>
      <div class="title">${esc(d.title)}</div>
      <div class="meta"><span>단어 ${d.allWords.length}개</span><span>${d.sets.length}세트</span></div>
    </button>`).join('');

  const favBanner = favN ? `
    <button class="fav-banner fade-in" data-act="quiz-fav">
      <span class="fb-left">
        <span class="fb-star">★</span>
        <span class="fb-txt"><span class="fb-title">즐겨찾기 복습</span>
        <span class="fb-sub">별표한 단어 ${favN}개를 모아 퀴즈</span></span>
      </span>
      <span class="fb-go">▶</span>
    </button>` : '';

  return `
    <section class="hero fade-in">
      <span class="badge">🎯 TOEIC 900 프로젝트</span>
      <h1>ETS 토익 단어장</h1>
      <p>영어 단어를 보고 뜻을 맞히는 4지선다 퀴즈 · Day 1–30 · 총 ${TOTAL_WORDS.toLocaleString()}개</p>
    </section>
    ${favBanner}
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
  const favOnly = !!state.favOnly;
  const groupsHtml = d.groups.map(g => {
    let words = g.words.filter(w => !q || w.en.toLowerCase().includes(q) || w.ko.toLowerCase().includes(q));
    if (favOnly) words = words.filter(w => isFav(w.id));
    if (!words.length) return '';
    const cards = words.map(w => {
      const m = /^(phr|v|n|a|ad|adv|prep|conj|pron|int)\.\s*/i.exec(w.ko);
      const pos = m ? m[0].trim() : '';
      const meaning = m ? w.ko.slice(m[0].length) : w.ko;
      return `
        <div class="word-card">
          ${favBtn(w.id)}
          <div class="en"><span class="idx">${w.n}</span>${esc(w.en)}${pos ? `<span class="pos">${esc(pos)}</span>` : ''}</div>
          <div class="ko" data-reveal>${esc(meaning)}</div>
        </div>`;
    }).join('');
    return `
      <div class="group-label"><span class="dot"></span><h3>${esc(g.label)}</h3><span class="count">${words.length}개</span></div>
      <div class="word-grid">${cards}</div>`;
  }).join('');

  const emptyMsg = favOnly ? '이 Day에 즐겨찾기한 단어가 없어요. 단어의 ☆를 눌러 담아보세요.' : '검색 결과가 없어요.';
  return `
    <div class="list-toolbar">
      <div class="search">🔎<input id="search" placeholder="영어 또는 한국어로 검색..." value="${esc(state.search || '')}" /></div>
      <button class="btn btn-ghost ${favOnly ? 'active-ghost' : ''}" data-act="toggle-favonly">${favOnly ? '★ 즐겨찾기만' : '☆ 즐겨찾기만'}</button>
      <button class="btn btn-ghost" data-act="toggle-ko">${state.hideKo ? '👁 뜻 보이기' : '🙈 뜻 가리기'}</button>
    </div>
    ${groupsHtml || `<div class="empty-note">${emptyMsg}</div>`}`;
}

/* ---------- 7. 퀴즈 세트 선택 ---------- */
function viewSetIntro(d) {
  const cards = d.sets.map((set, i) => {
    const from = i * SET_SIZE + 1, to = i * SET_SIZE + set.length;
    return `
      <button class="set-card" data-set="${i}">
        <div class="s-num">세트 ${i + 1}</div>
        <div class="s-range">${from}–${to}번 · ${set.length}문제</div>
      </button>`;
  }).join('');
  return `
    <div class="quiz-intro">
      <p>영어 단어를 보고 알맞은 <b>한국어 뜻</b>을 고르세요. 한 세트 ${SET_SIZE}문제, <b>순서는 매번 랜덤</b>이에요.</p>
      <div class="set-grid">${cards}</div>
      <div class="set-actions">
        <button class="btn btn-primary" data-set="0">▶ 세트 1부터 시작</button>
        <button class="btn btn-ghost" data-act="quiz-all">🎲 전체 ${d.allWords.length}문제 랜덤</button>
      </div>
    </div>`;
}

/* ---------- 8. 퀴즈 생성 ---------- */
// 각 단어의 '자기 Day' 안에서, 같은 그룹(품사군) 우선으로 오답 보기 추출
function buildQuestions(words) {
  return words.map(w => {
    const pool = DAYS[w.day - 1].allWords;
    const used = new Set([w.ko]);
    const distractors = [];
    const sameGroup = shuffle(pool.filter(c => c.gi === w.gi && c.ko !== w.ko));
    const others = shuffle(pool.filter(c => c.gi !== w.gi && c.ko !== w.ko));
    for (const cand of [...sameGroup, ...others]) {
      if (distractors.length >= OPTION_COUNT - 1) break;
      if (used.has(cand.ko)) continue;   // 같은 뜻(동의어) 중복 방지
      used.add(cand.ko); distractors.push(cand.ko);
    }
    return { word: w, options: shuffle([w.ko, ...distractors]), answer: w.ko };
  });
}

// day: 세트/전체는 해당 Day 번호, 즐겨찾기 복습은 null
function startQuiz(day, setIdx, words, label) {
  if (!words || !words.length) { go({ view: 'home' }); return; }
  Sound.unlock();
  const questions = buildQuestions(shuffle(words));  // ← 순서 랜덤
  go({ view: 'quiz', day, setIdx, label, questions, answers: [], cur: 0, tab: 'quiz' });
}

/* ---------- 9. 퀴즈 진행 화면 ---------- */
function viewQuiz() {
  const s = state, total = s.questions.length, q = s.questions[s.cur];
  const a = s.answers[s.cur];              // 이 문제의 답(있으면 이미 푼 것)
  const answered = !!a;
  const correctCount = s.answers.filter(x => x && x.correct).length;
  const answeredCount = s.answers.filter(Boolean).length;
  const pct = Math.round((answeredCount / total) * 100);

  const opts = q.options.map((opt, i) => {
    let cls = '', mark = '';
    if (answered) {
      if (opt === q.answer) { cls = 'correct'; mark = '✓'; }
      else if (opt === a.picked) { cls = 'wrong'; mark = '✕'; }
    }
    return `
      <button class="option ${cls}" data-opt="${i}" ${answered ? 'disabled' : ''}>
        <span class="key">${i + 1}</span><span class="opt-text">${esc(opt)}</span><span class="mark">${mark}</span>
      </button>`;
  }).join('');

  const last = s.cur === total - 1;
  const title = s.day ? `DAY ${s.day} · ${esc(s.label)}` : esc(s.label);
  const prevBtn = `<button class="btn btn-ghost" data-act="prev" ${s.cur === 0 ? 'disabled' : ''}>← 이전</button>`;
  const rightBtn = answered
    ? `<button class="btn btn-primary" data-act="next">${last ? '결과 보기 →' : '다음 →'}</button>`
    : `<span class="q-hint-key">보기를 선택하세요</span>`;
  const feedback = answered
    ? `<div class="q-feedback ${a.correct ? 'ok' : 'no'}">${a.correct ? '정답이에요! 🎉' : '아쉬워요, 다시 기억해요'}</div>` : '';

  return `
    <div class="quiz-wrap fade-in">
      <div class="topbar" style="margin-bottom:18px">
        <button class="back" data-act="back-intro">←</button>
        <div class="info"><h2>${title}</h2><div class="sub">뜻 맞히기 퀴즈</div></div>
      </div>
      <div class="quiz-head">
        <span class="q-count">${s.cur + 1} <span style="color:var(--muted)">/ ${total}</span></span>
        <span class="q-right">
          <span class="q-score">정답 <b>${correctCount}</b></span>
          <button class="sound-btn" data-act="toggle-sound" title="효과음 켜기/끄기">${Sound.enabled ? '🔊' : '🔇'}</button>
        </span>
      </div>
      <div class="q-progress"><i style="width:${pct}%"></i></div>
      <div class="q-card">
        ${favBtn(q.word.id)}
        <div class="q-label">이 단어의 뜻은?</div>
        <div class="q-word">${esc(q.word.en)}</div>
        <div class="q-hint">${answered ? esc(q.word.en) + ' = ' + esc(q.answer) : '&nbsp;'}</div>
      </div>
      <div class="options">${opts}</div>
      ${feedback}
      <div class="q-foot">${prevBtn}${rightBtn}</div>
    </div>`;
}

function answer(i) {
  if (state.answers[state.cur]) return;          // 이미 푼 문제는 잠금
  const q = state.questions[state.cur];
  const picked = q.options[i];
  const correct = picked === q.answer;
  state.answers[state.cur] = { picked, correct };
  correct ? Sound.correct() : Sound.wrong();
  render();
}
function prev() { if (state.cur > 0) { state.cur--; render(); topTop(); } }
function next() {
  if (!state.answers[state.cur]) return;         // 안 풀었으면 못 넘어감
  if (state.cur < state.questions.length - 1) { state.cur++; render(); topTop(); }
  else finishQuiz();
}

function finishQuiz() {
  const total = state.questions.length;
  const correct = state.answers.filter(a => a && a.correct).length;
  const wrong = [];
  state.questions.forEach((q, i) => {
    const a = state.answers[i];
    if (a && !a.correct) wrong.push({ en: q.word.en, ko: q.answer, your: a.picked, id: q.word.id });
  });
  Sound.finish();
  go({ view: 'result', day: state.day, setIdx: state.setIdx, label: state.label,
       correct, total, pct: Math.round((correct / total) * 100), wrong, tab: 'quiz' });
}

/* ---------- 10. 결과 화면 ---------- */
function viewResult() {
  const s = state;
  const R = 78, C = 2 * Math.PI * R, off = C * (1 - s.pct / 100);
  const msg = s.pct === 100 ? '완벽해요! 🏆' : s.pct >= 80 ? '훌륭해요! 💪' : s.pct >= 60 ? '좋아요, 조금만 더! 📈' : '반복이 답이에요, 화이팅! 🔥';
  const color = s.pct >= 80 ? 'var(--good)' : s.pct >= 60 ? 'var(--gold)' : 'var(--bad)';
  const hasNext = s.setIdx != null && DAYS[s.day - 1] && s.setIdx < DAYS[s.day - 1].sets.length - 1;
  const rsub = s.day ? `DAY ${s.day} · ${esc(s.label)}` : esc(s.label);

  const review = s.wrong.length ? `
    <div class="review">
      <h3>틀린 단어 ${s.wrong.length}개 · ☆ 를 눌러 즐겨찾기에 담아 복습하세요</h3>
      ${s.wrong.map(w => `
        <div class="review-item">
          ${favBtn(w.id)}
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
      <div class="r-sub">${rsub}</div>
      <div class="r-actions">
        <button class="btn btn-primary" data-act="retry">🔁 다시 풀기</button>
        ${hasNext ? `<button class="btn btn-primary" data-act="next-set">▶ 다음 세트</button>` : ''}
        <button class="btn btn-ghost" data-act="back-intro">${s.day ? '세트 목록' : '홈으로'}</button>
        <button class="btn btn-ghost" data-act="home">홈으로</button>
      </div>
      ${review}
    </div>`;
}

/* ---------- 11. 이벤트 연결 ---------- */
function wire() {
  app.querySelectorAll('[data-day]').forEach(el =>
    el.onclick = () => go({ view: 'day', day: +el.dataset.day, tab: 'list' }));

  app.querySelectorAll('[data-act]').forEach(el => el.onclick = () => handleAct(el.dataset.act));

  app.querySelectorAll('[data-tab]').forEach(el =>
    el.onclick = () => { state.tab = el.dataset.tab; render(); });

  app.querySelectorAll('[data-set]').forEach(el =>
    el.onclick = () => { const i = +el.dataset.set; startQuiz(state.day, i, DAYS[state.day - 1].sets[i], `세트 ${i + 1}`); });

  app.querySelectorAll('[data-opt]').forEach(el =>
    el.onclick = () => answer(+el.dataset.opt));

  // 즐겨찾기 토글(스크롤 위치 유지)
  app.querySelectorAll('[data-fav]').forEach(el =>
    el.onclick = (e) => { e.stopPropagation(); const y = window.scrollY; toggleFav(el.dataset.fav); render(); window.scrollTo(0, y); });

  const search = app.querySelector('#search');
  if (search) search.oninput = () => { state.search = search.value; renderListOnly(); };

  app.querySelectorAll('.word-card .ko[data-reveal]').forEach(el =>
    el.onclick = () => { if (state.hideKo) el.classList.toggle('reveal'); });
}

// 검색 시 목록만 갱신(입력 포커스 유지)
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
  const d = state.day ? DAYS[state.day - 1] : null;
  switch (act) {
    case 'home': go({ view: 'home' }); break;
    case 'toggle-sound': Sound.toggle(); render(); break;
    case 'toggle-ko': state.hideKo = !state.hideKo; render(); break;
    case 'toggle-favonly': state.favOnly = !state.favOnly; render(); break;
    case 'quiz-all': startQuiz(state.day, null, d.allWords, '전체 랜덤'); break;
    case 'quiz-fav': startQuiz(null, null, favWords(), '⭐ 즐겨찾기 복습'); break;
    case 'prev': prev(); break;
    case 'next': next(); break;
    case 'back-intro': state.day ? go({ view: 'day', day: state.day, tab: 'quiz' }) : go({ view: 'home' }); break;
    case 'retry':
      if (state.setIdx != null) startQuiz(state.day, state.setIdx, d.sets[state.setIdx], state.label);
      else if (state.day != null) startQuiz(state.day, null, d.allWords, '전체 랜덤');
      else startQuiz(null, null, favWords(), '⭐ 즐겨찾기 복습');
      break;
    case 'next-set': { const i = state.setIdx + 1; startQuiz(state.day, i, d.sets[i], `세트 ${i + 1}`); break; }
  }
}

/* ---------- 12. 키보드 단축키 ---------- */
document.addEventListener('keydown', e => {
  if (state.view !== 'quiz') return;
  const answered = !!state.answers[state.cur];
  if (['1', '2', '3', '4'].includes(e.key)) {
    const idx = +e.key - 1, q = state.questions[state.cur];
    if (!answered && idx < q.options.length) answer(idx);
  } else if ((e.key === 'Enter' || e.key === ' ') && answered) { e.preventDefault(); next(); }
  else if (e.key === 'ArrowRight' && answered) { next(); }
  else if (e.key === 'ArrowLeft') { prev(); }
});

/* ---------- 시작 ---------- */
render();
