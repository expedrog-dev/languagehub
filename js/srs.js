// srs.js — repetição espaçada baseada no SM-2
// Notas de autoavaliação → qualidade SM-2: Errei = 1, Difícil = 3, Bom = 4, Fácil = 5
(function (LH) {
  const MIN = 60000, DAY = 86400000;
  const QUALITY = { again: 1, hard: 3, good: 4, easy: 5 };
  const RELEARN_MS = 10 * MIN;   // "Errei" volta na mesma sessão / em 10 min
  const MASTERED_DAYS = 21;      // intervalo a partir do qual o cartão conta como dominado
  const NEW_PER_DAY = 10;

  function fresh() {
    return { ef: 2.5, reps: 0, interval: 0, due: 0, lapses: 0, lastReview: null, lastRating: null };
  }

  // Calcula o próximo estado SEM salvar (usado também para a prévia dos botões)
  function schedule(state, rating, now = Date.now()) {
    const s = Object.assign(fresh(), state || {});
    const q = QUALITY[rating];
    let interval;

    if (q < 3) {
      // errou: zera a sequência e reaprende logo
      s.reps = 0;
      s.lapses += 1;
      interval = 0;
    } else if (s.reps === 0) {
      interval = rating === "easy" ? 4 : 1;
      s.reps = 1;
    } else if (s.reps === 1) {
      interval = rating === "hard" ? 3 : rating === "good" ? 6 : 8;
      s.reps = 2;
    } else {
      const base = Math.max(1, s.interval);
      if (rating === "hard") interval = Math.max(base + 1, Math.round(base * 1.2));
      else if (rating === "good") interval = Math.round(base * s.ef);
      else interval = Math.round(base * s.ef * 1.3);
      s.reps += 1;
    }

    // Atualização do fator de facilidade (fórmula original do SM-2)
    s.ef = Math.max(1.3, +(s.ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))).toFixed(3));
    s.interval = interval;
    s.due = interval === 0 ? now + RELEARN_MS : now + interval * DAY;
    s.lastReview = now;
    s.lastRating = rating;
    return s;
  }

  function formatInterval(next, now = Date.now()) {
    const ms = next.due - now;
    if (ms < 60 * MIN) return `${Math.max(1, Math.round(ms / MIN))} min`;
    const d = Math.round(ms / DAY);
    if (d < 30) return `${d} d`;
    const m = Math.round(d / 30);
    if (m < 12) return `${m} m`;
    return `${(d / 365).toFixed(1).replace(".", ",")} a`;
  }

  // Novo | Para revisar | Dominado
  function status(state) {
    if (!state || !state.lastReview) return "new";
    if (state.interval >= MASTERED_DAYS && state.due > Date.now()) return "mastered";
    return "review";
  }

  // Fila de "Revisões do Dia": vencidos primeiro (mais atrasados antes), depois novos até o limite diário
  function dailyQueue(cards, srsMap, now = Date.now(), introducedToday = 0) {
    const due = [], fresh = [];
    for (const c of cards) {
      const st = srsMap[c.id];
      if (!st || !st.lastReview) fresh.push(c);
      else if (st.due <= now) due.push(c);
    }
    due.sort((a, b) => {
      const sa = srsMap[a.id], sb = srsMap[b.id];
      return sa.due - sb.due || sa.ef - sb.ef; // mais atrasado e mais difícil primeiro
    });
    const limit = Math.max(0, NEW_PER_DAY - introducedToday);
    return { due, fresh: fresh.slice(0, limit), queue: due.concat(fresh.slice(0, limit)) };
  }

  LH.srs = { schedule, formatInterval, status, dailyQueue, fresh, RELEARN_MS, NEW_PER_DAY, MASTERED_DAYS };
})(window.LH = window.LH || {});
