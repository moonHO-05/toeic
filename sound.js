/* ================= 효과음 (Web Audio) =================
   오디오 파일 없이 코드로 소리를 만든다 → 오프라인 OK, 용량 0.

   [효과음이 '가끔' 안 나던 이유 & 해결]
   브라우저는 오디오를 자주 'suspended(정지)'로 둔다. 정지 상태에서
   소리를 예약하면 그 소리가 누락된다. 그래서 재생 전에 반드시
   resume()으로 깨운 뒤(=running) 예약하고, 사용자의 첫 터치/클릭에서도
   미리 깨워 둔다.
====================================================== */
const Sound = (() => {
  let ctx = null;
  let enabled = true;
  try { const v = localStorage.getItem('ets_sound'); if (v !== null) enabled = JSON.parse(v); } catch {}

  function ac() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    return ctx;
  }

  // 한 음을 지정 시각(at)에 예약. 부드러운 엔벨로프로 '딱' 소리 방지.
  function scheduleTone(c, freq, at, dur, type, vol) {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, at);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(vol, at + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    osc.connect(g).connect(c.destination);
    osc.start(at);
    osc.stop(at + dur + 0.03);
  }

  // seq: [freq, startOffset, dur, type, vol] 배열들
  function play(seq) {
    if (!enabled) return;
    const c = ac(); if (!c) return;
    const run = () => {
      const base = c.currentTime + 0.02;       // 살짝 여유(과거 예약 방지)
      for (const t of seq) scheduleTone(c, t[0], base + t[1], t[2], t[3], t[4]);
    };
    if (c.state === 'running') run();
    else c.resume().then(run).catch(() => {});  // 정지면 깨운 뒤 재생 → 누락 방지
  }

  return {
    get enabled() { return enabled; },
    // 사용자 제스처에서 오디오 미리 깨우기
    unlock() { if (!enabled) return; const c = ac(); if (c && c.state !== 'running') c.resume().catch(() => {}); },
    toggle() {
      enabled = !enabled;
      try { localStorage.setItem('ets_sound', JSON.stringify(enabled)); } catch {}
      if (enabled) play([[880, 0, 0.09, 'triangle', 0.15]]); // 켤 때 확인음
      return enabled;
    },
    correct() { play([[660, 0, 0.13, 'triangle', 0.22], [990, 0.085, 0.18, 'triangle', 0.22]]); },
    wrong()   { play([[220, 0, 0.16, 'square', 0.14], [165, 0.11, 0.22, 'square', 0.14]]); },
    finish()  { play([[523, 0, 0.28, 'triangle', 0.2], [659, 0.1, 0.28, 'triangle', 0.2], [784, 0.2, 0.28, 'triangle', 0.2], [1046, 0.3, 0.34, 'triangle', 0.2]]); },
    click()   { play([[520, 0, 0.05, 'sine', 0.07]]); },
  };
})();

// 첫 상호작용마다 오디오를 깨워 둔다(모바일 정책 + 소리 누락 방지)
['pointerdown', 'touchstart', 'keydown', 'click'].forEach(ev =>
  window.addEventListener(ev, () => Sound.unlock(), { passive: true }));
