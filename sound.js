/* ================= 효과음 (Web Audio) =================
   오디오 파일 없이 코드로 소리를 만든다 → 오프라인 OK, 용량 0.
   모바일은 '사용자가 화면을 터치한 뒤'에만 소리가 나므로(브라우저 정책),
   AudioContext 를 첫 터치 때 만들고 깨운다(resume).
======================================================= */
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
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // 한 음(오실레이터) 재생. 부드러운 엔벨로프로 '딱' 소리 방지.
  function tone(freq, startAt, dur, type = 'sine', vol = 0.2) {
    const c = ac(); if (!c) return;
    const t0 = c.currentTime + startAt;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.03);
  }

  return {
    get enabled() { return enabled; },
    // 첫 상호작용 때 오디오 깨우기(모바일 정책 대응)
    unlock() { if (enabled) ac(); },
    toggle() {
      enabled = !enabled;
      try { localStorage.setItem('ets_sound', JSON.stringify(enabled)); } catch {}
      if (enabled) { ac(); tone(880, 0, 0.08, 'triangle', 0.15); } // 켤 때 짧은 확인음
      return enabled;
    },
    correct() { if (!enabled) return; tone(660, 0, 0.13, 'triangle', 0.22); tone(990, 0.085, 0.18, 'triangle', 0.22); },
    wrong()   { if (!enabled) return; tone(220, 0, 0.16, 'square', 0.14); tone(165, 0.11, 0.22, 'square', 0.14); },
    finish()  { if (!enabled) return; [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.1, 0.28, 'triangle', 0.2)); },
    click()   { if (!enabled) return; tone(520, 0, 0.05, 'sine', 0.07); },
  };
})();
