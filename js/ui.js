// ui.js — peças visuais reutilizáveis: ícones, círculo rabiscado, marquinhas de contagem, voz e avisos
(function (LH) {
  const ICON = {
    flame: '<svg class="ico-fire" viewBox="0 0 24 24"><defs><linearGradient id="fireg" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#FF4B00"/><stop offset=".55" stop-color="#FF9600"/><stop offset="1" stop-color="#FFC800"/></linearGradient></defs><path fill="url(#fireg)" stroke="none" d="M12 2.5c.6 3.6 5.6 5.4 5.6 10.6A5.6 5.6 0 0 1 6.4 13.4c0-2.9 1.6-4.6 2.8-5.6.1 2.2 1.1 3.3 2.4 3.4-.9-3.3.1-6.3.4-8.7z"/><path fill="#FFE28A" stroke="none" d="M12 21a2.6 2.6 0 0 1-2.6-2.6c0-1.6 1.2-2.4 1.9-3.2.2 1 .9 1.6 1.6 1.6 0-.8.4-1.6.9-2.2.6.9 1.4 2 1.4 3.6A2.9 2.9 0 0 1 12 21z"/></svg>',
    bolt: '<svg class="ico-xp" viewBox="0 0 24 24"><path fill="currentColor" stroke="none" d="M13.6 2 4.8 13.4h6.1L9.6 22l9.6-12.2h-6.3z"/></svg>',
    swap: '<svg viewBox="0 0 24 24"><path d="M4 8h14l-4-4M20 16H6l4 4"/></svg>',
    bubble: '<svg viewBox="0 0 24 24"><path d="M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-7l-4 4v-4H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/><path d="M10.2 9a1.9 1.9 0 1 1 2.6 1.8c-.5.2-.8.6-.8 1.1M12 13.8h.01"/></svg>',
    clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
    history: '<svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.6"/><path d="M4 4v4.6h4.6M12 8v4.2l3 1.8"/></svg>',
    puzzle: '<svg viewBox="0 0 24 24"><path d="M9 4h4v2a2 2 0 1 0 4 0V4h3v6h-2a2 2 0 1 0 0 4h2v6h-6v-2a2 2 0 1 0-4 0v2H4v-6h2a2 2 0 1 0 0-4H4V4z"/></svg>',
    loop: '<svg viewBox="0 0 24 24"><path d="M17 2l3 3-3 3"/><path d="M4 11V9a4 4 0 0 1 4-4h12M7 22l-3-3 3-3"/><path d="M20 13v2a4 4 0 0 1-4 4H4"/></svg>',
    rewind: '<svg viewBox="0 0 24 24"><path d="M11 19 3 12l8-7zM21 19l-8-7 8-7z"/></svg>',
    checkCircle: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="m8.5 12.5 2.5 2.5 5-5.5"/></svg>',
    forward: '<svg viewBox="0 0 24 24"><path d="M4 12h13M12 6l6 6-6 6"/><path d="M20 5v14"/></svg>',
    key: '<svg viewBox="0 0 24 24"><circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M16 7l3 3M18 5l2 2"/></svg>',
    branch: '<svg viewBox="0 0 24 24"><circle cx="6" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="8" r="2"/><path d="M6 7v10M18 10c0 4-6 3-12 7"/></svg>',
    link2: '<svg viewBox="0 0 24 24"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>',
    quote: '<svg viewBox="0 0 24 24"><path d="M5 18c2-1 3-3 3-6H5V6h6v6c0 4-2 6-5 7zM14 18c2-1 3-3 3-6h-3V6h6v6c0 4-2 6-5 7z"/></svg>',
    scale: '<svg viewBox="0 0 24 24"><path d="M12 4v16M7 20h10M5 7h14M5 7l-3 6a3 3 0 0 0 6 0zM19 7l-3 6a3 3 0 0 0 6 0z"/></svg>',
    pen: '<svg viewBox="0 0 24 24"><path d="M15 4l5 5L9 20H4v-5z"/><path d="m13 6 5 5"/></svg>',
    user: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
    stack: '<svg viewBox="0 0 24 24"><path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/></svg>',
    pin: '<svg viewBox="0 0 24 24"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
    chain: '<svg viewBox="0 0 24 24"><rect x="2.5" y="8" width="10" height="8" rx="4"/><rect x="11.5" y="8" width="10" height="8" rx="4"/></svg>',
    mask: '<svg viewBox="0 0 24 24"><path d="M3 6c3 1 6 1 9 0 3 1 6 1 9 0v5c0 5-4 8-9 8s-9-3-9-8z"/><path d="M8 11h2M14 11h2M9 15c2 1.5 4 1.5 6 0"/></svg>',
    plus: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 8v8M8 12h8"/></svg>',
    book: '<svg viewBox="0 0 24 24"><path d="M3 5c3-1 6-1 9 1 3-2 6-2 9-1v14c-3-1-6-1-9 1-3-2-6-2-9-1z"/><path d="M12 6v14"/></svg>',
    headphones: '<svg viewBox="0 0 24 24"><path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3.5" y="14" width="4" height="6" rx="1.5"/><rect x="16.5" y="14" width="4" height="6" rx="1.5"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7"/></svg>',
    cross: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    turn: '<svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-2.4-5.7"/><path d="M20 4v4h-4"/></svg>',
    play: '<svg viewBox="0 0 24 24"><path d="M7 5v14l12-7z" fill="currentColor"/></svg>',
    pause: '<svg viewBox="0 0 24 24"><path d="M8 5v14M16 5v14"/></svg>',
    back3: '<svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4h4"/></svg>',
    vol: '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12"/></svg>',
    mute: '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="m17 9 5 6M22 9l-5 6"/></svg>',
    ear: '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6"/></svg>',
    arrow: '<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    left: '<svg viewBox="0 0 24 24"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>',
    cards: '<svg viewBox="0 0 24 24"><rect x="4" y="6" width="13" height="14" rx="2"/><path d="M8 3h10a2 2 0 0 1 2 2v12"/></svg>',
    quiz: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17h.01"/></svg>',
    film: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m10 9 5 3-5 3z"/></svg>',
    link: '<svg viewBox="0 0 24 24"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
  };

  // Oval rabiscado à mão (o "círculo" do mockup em volta da opção escolhida)
  function scribble() {
    const r = Math.random();
    const d = r < 0.5
      ? "M18,34 C12,10 176,4 191,24 C204,44 52,58 16,42 C2,34 26,13 74,9"
      : "M22,30 C20,8 184,8 192,28 C198,48 34,56 12,38 C4,28 40,12 90,10";
    return `<svg class="scribble" viewBox="0 0 206 60" preserveAspectRatio="none" aria-hidden="true"><path d="${d}" vector-effect="non-scaling-stroke"/></svg>`;
  }

  // Marquinhas de contagem: grupos de 5 (||||/)
  function tally(n) {
    if (!n) return `<span class="tally-none">nenhum ainda</span>`;
    const groups = [];
    let left = n;
    while (left > 0) { groups.push(Math.min(5, left)); left -= 5; }
    const shown = groups.slice(0, 6);
    const svg = shown.map(g => {
      const lines = [];
      for (let i = 0; i < Math.min(4, g); i++) {
        const x = 4 + i * 7;
        lines.push(`<path d="M${x} ${3 + (i % 2)} L${x + (i % 2 ? 1 : -1)} 27"/>`);
      }
      if (g === 5) lines.push('<path d="M0 22 L30 6"/>');
      return `<svg viewBox="0 0 32 30" style="width:${g === 5 ? 32 : 4 + Math.min(4, g) * 7}px" aria-hidden="true">${lines.join("")}</svg>`;
    }).join("");
    const extra = groups.length > 6 ? `<span class="tally-more">+${n - 30}</span>` : "";
    return `<span class="row" style="gap:10px" role="img" aria-label="${n} acertos">${svg}${extra}</span>`;
  }

  // Voz em inglês para as questões de áudio: usa a voz do Claude quando o app roda publicado
  // (capacidade "tts") e, fora dali, a voz do próprio navegador.
  let claudeVoice = null;
  (async () => {
    for (let i = 0; i < 8 && !(window.claude && window.claude.use); i++) await new Promise(r => setTimeout(r, 250));
    try { if (window.claude && window.claude.use) claudeVoice = await window.claude.use("tts"); } catch (e) {}
  })();
  function speak(text, rate = 1) {
    if (claudeVoice) {
      try { claudeVoice.stop(); } catch (e) {}
      claudeVoice.speak(text, { language: "en", rate: Math.max(0.7, rate) }).catch(err => {
        if (err && (err.code === "not_granted" || err.code === "unavailable")) claudeVoice = null;
        if (err && err.code !== "viewer_stopped" && err.code !== "interrupted") browserSpeak(text, rate);
      });
      return true;
    }
    return browserSpeak(text, rate);
  }
  function browserSpeak(text, rate) {
    const synth = window.speechSynthesis;
    if (!synth || typeof SpeechSynthesisUtterance === "undefined") return false;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = rate;
    const voices = synth.getVoices();
    const v = voices.find(v => /en[-_]US/i.test(v.lang)) || voices.find(v => /^en/i.test(v.lang));
    if (v) u.voice = v;
    synth.speak(u);
    return true;
  }
  function stopSpeaking() {
    try { if (claudeVoice) claudeVoice.stop(); } catch (e) {}
    try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) {}
  }

  function toast(msg) {
    const t = document.createElement("div");
    t.className = "toast";
    t.textContent = msg;
    const box = document.getElementById("toasts");
    while (box.children.length >= 2) box.firstChild.remove(); // no máximo 2 avisos na tela
    box.appendChild(t);
    setTimeout(() => t.remove(), 2300);
  }

  LH.ui = { ICON, scribble, tally, speak, stopSpeaking, toast };
})(window.LH = window.LH || {});
