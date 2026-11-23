// store.js — progresso persistente do aluno (localStorage, com fallback em memória)
(function (LH) {
  const KEY = "languagehub:v1";
  const DAY = 86400000;

  function today(d = new Date()) {
    const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  }

  function blank() {
    return {
      user: { id: "me", name: "Você", avatarColor: "#2E6A45", createdAt: Date.now() },
      srs: {},          // { [flashcardId]: SrsState }
      quizStats: {},    // { [quizId]: QuizStat }
      xpLog: [],        // [ XpEvent ]
      streak: { count: 0, lastDay: null },
      daily: { day: null, correct: 0 }, // acertos do dia (marquinhas de ACERTOS HOJE)
      prefs: { lastRankingPeriod: "week", tutorialDone: false, font: "hand" },
    };
  }

  let mem = null;
  let canPersist = true;

  function load() {
    if (mem) return mem;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) { const parsed = JSON.parse(raw); mem = Object.assign(blank(), parsed); mem.prefs = Object.assign(blank().prefs, parsed.prefs || {}); }
      else mem = blank();
    } catch (e) {
      canPersist = false;
      mem = blank();
    }
    return mem;
  }

  function save() {
    if (!canPersist) return;
    try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) { canPersist = false; }
  }

  // Ofensiva: conta dias seguidos com pelo menos uma atividade
  function touchStreak() {
    const s = load().streak;
    const t = today();
    if (s.lastDay === t) return s.count;
    const ontem = today(new Date(Date.now() - DAY));
    s.count = s.lastDay === ontem ? s.count + 1 : 1;
    s.lastDay = t;
    save();
    return s.count;
  }

  function currentStreak() {
    const s = load().streak;
    if (!s.lastDay) return 0;
    const t = today(), ontem = today(new Date(Date.now() - DAY));
    return s.lastDay === t || s.lastDay === ontem ? s.count : 0;
  }

  function correctToday() {
    const d = load().daily || {};
    return d.day === today() ? d.correct : 0;
  }
  function addCorrectToday() {
    const data = load();
    if (!data.daily || data.daily.day !== today()) data.daily = { day: today(), correct: 0 };
    data.daily.correct++;
    save();
    return data.daily.correct;
  }

  function reset() {
    mem = blank();
    save();
  }

  LH.store = { load, save, touchStreak, currentStreak, correctToday, addCorrectToday, reset, today, DAY, get persistent() { return canPersist; } };
})(window.LH = window.LH || {});
