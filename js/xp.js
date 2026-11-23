// xp.js — regras de pontuação e ranking
(function (LH) {
  const RULES = {
    flashcard: 10,        // cartão revisado (Difícil, Bom ou Fácil)
    flashcardAgain: 4,    // cartão revisado com "Errei"
    quizCorrect: 20,      // acerto em quiz (texto ou vídeo)
    quizWrong: 2,         // participação
    speedBonus: 5,        // acerto em até 10 s
    speedSeconds: 10,
    accuracyBonus: 25,    // sessão de quiz com 80% ou mais de acertos (mín. 3 questões)
    accuracyMin: 0.8,
    streakStep: 0.1,      // +10% por dia de ofensiva a partir do 2º dia
    streakMaxMult: 1.5,
  };

  function multiplier(streak) {
    return Math.min(RULES.streakMaxMult, 1 + RULES.streakStep * Math.max(0, streak - 1));
  }

  // Registra XP já com o multiplicador de ofensiva e devolve o valor ganho
  function award(base, reason) {
    const data = LH.store.load();
    const streak = LH.store.touchStreak();
    const xp = Math.round(base * multiplier(streak));
    data.xpLog.push({ t: Date.now(), xp, reason });
    LH.store.save();
    if (LH.cloud) LH.cloud.schedulePush();
    return xp;
  }

  // XP por dia (AAAA-MM-DD), base do calendário de ofensiva
  function byDay() {
    const map = {};
    for (const e of LH.store.load().xpLog) { const d = LH.store.today(new Date(e.t)); map[d] = (map[d] || 0) + e.xp; }
    return map;
  }

  function weekStart(now = new Date()) {
    const d = new Date(now);
    const dow = (d.getDay() + 6) % 7; // segunda = 0
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - dow);
    return d.getTime();
  }

  function totals() {
    const log = LH.store.load().xpLog;
    const ws = weekStart();
    let total = 0, week = 0;
    for (const e of log) { total += e.xp; if (e.t >= ws) week += e.xp; }
    return { total, week };
  }

  // Alunos de exemplo do protótipo (marcados como exemplo no ranking)
  const EXAMPLES = [
    { userId: "ex-1", name: "Ana Clara", avatarColor: "#C2410C", xpWeek: 640, xpTotal: 4120, streak: 9 },
    { userId: "ex-2", name: "Lucas M.", avatarColor: "#1D4ED8", xpWeek: 515, xpTotal: 3890, streak: 4 },
    { userId: "ex-3", name: "Beatriz S.", avatarColor: "#7C3AED", xpWeek: 470, xpTotal: 5210, streak: 12 },
    { userId: "ex-4", name: "Rafael T.", avatarColor: "#047857", xpWeek: 330, xpTotal: 2240, streak: 3 },
    { userId: "ex-5", name: "Júlia P.", avatarColor: "#B45309", xpWeek: 280, xpTotal: 1980, streak: 2 },
    { userId: "ex-6", name: "Gabriel R.", avatarColor: "#BE123C", xpWeek: 190, xpTotal: 2760, streak: 1 },
    { userId: "ex-7", name: "Marina L.", avatarColor: "#0369A1", xpWeek: 120, xpTotal: 940, streak: 1 },
    { userId: "ex-8", name: "Thiago F.", avatarColor: "#4D7C0F", xpWeek: 60, xpTotal: 610, streak: 0 },
  ].map(e => Object.assign({ example: true }, e));

  function leaderboard(period) {
    const data = LH.store.load();
    const t = totals();
    const me = { userId: "me", name: data.user.name, avatarColor: data.user.avatarColor, xpWeek: t.week, xpTotal: t.total, streak: LH.store.currentStreak(), me: true };
    const key = period === "week" ? "xpWeek" : "xpTotal";
    const rows = EXAMPLES.concat([me]).sort((a, b) => b[key] - a[key] || (a.me ? -1 : b.me ? 1 : 0));
    rows.forEach((r, i) => { r.rank = i + 1; r.score = r[key]; });
    return rows;
  }

  LH.xp = { RULES, multiplier, award, totals, leaderboard, weekStart, byDay };
})(window.LH = window.LH || {});
