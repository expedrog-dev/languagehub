// cloud.js — ranking compartilhado da turma.
// Quando o app roda publicado no Claude, cada aluno grava só o próprio placar em leaderboard/<id>
// e todo mundo lê a coleção ao vivo. Fora dali (arquivo local, zip), o ranking volta para o modo exemplo.
(function (LH) {
  const cloud = {
    mode: "local",      // local | loading | shared | error
    rows: [],           // [{ id, xpTotal, xpWeek, weekStart, streak, updatedAt }]
    myId: null,
    profiles: {},
    listeners: new Set(),
  };
  let db = null, user = null, timer = null, inFlight = false, lastSent = "";

  const notify = () => cloud.listeners.forEach(fn => { try { fn(); } catch (e) {} });
  cloud.subscribe = fn => { cloud.listeners.add(fn); return () => cloud.listeners.delete(fn); };

  async function waitForClaude() {
    for (let i = 0; i < 8; i++) {
      if (window.claude && typeof window.claude.use === "function") return true;
      await new Promise(r => setTimeout(r, 250));
    }
    return false;
  }

  async function init() {
    if (!(await waitForClaude())) return;
    try {
      const [d, u] = await Promise.all([window.claude.use("db"), window.claude.use("user")]);
      if (!d || !u) return;
      const id = await u.id();
      if (!id) return;
      db = d; user = u; cloud.myId = id;
      cloud.mode = "loading";
      notify();
      const loading = setTimeout(() => { if (cloud.mode === "loading") { cloud.mode = "error"; notify(); } }, 10000);
      // assinatura única da coleção inteira (a turma é pequena)
      db.collection("leaderboard").onSnapshot(snap => {
        clearTimeout(loading);
        cloud.mode = "shared";
        cloud.rows = snap.docs.map(doc => Object.assign({ id: doc.id }, doc.data() || {}));
        resolveNames();
        notify();
      }, () => { clearTimeout(loading); cloud.mode = "error"; notify(); });
      schedulePush(0);
    } catch (e) { cloud.mode = "local"; }
  }

  async function resolveNames() {
    const ids = cloud.rows.map(r => r.id);
    if (!ids.length || !user) return;
    try { cloud.profiles = await user.profiles(ids); notify(); } catch (e) {}
  }

  function snapshot() {
    const t = LH.xp.totals();
    return { xpTotal: t.total, xpWeek: t.week, weekStart: LH.xp.weekStart(), streak: LH.store.currentStreak() };
  }

  // Grava o placar com debounce, uma escrita por vez e só quando algo mudou
  function schedulePush(delay = 1500) {
    if (!db) return;
    clearTimeout(timer);
    timer = setTimeout(push, delay);
  }
  async function push() {
    if (!db || !cloud.myId) return;
    if (inFlight) return schedulePush(800);
    const data = snapshot();
    const key = JSON.stringify(data);
    if (key === lastSent) return;
    inFlight = true;
    try {
      await db.doc("leaderboard/" + cloud.myId).set(Object.assign({ updatedAt: Date.now() }, data));
      lastSent = key;
    } catch (e) {
      // sem permissão de escrita (ex.: link só de visualização): o aluno vê o ranking, mas não entra nele
      cloud.readOnly = true;
      notify();
    } finally { inFlight = false; }
  }

  // Linhas no formato do ranking local, com nomes resolvidos na hora de desenhar
  function leaderboard(period) {
    const ws = LH.xp.weekStart();
    const mine = snapshot();
    const byId = new Map(cloud.rows.map(r => [r.id, r]));
    if (cloud.myId && !cloud.readOnly) byId.set(cloud.myId, Object.assign({ id: cloud.myId }, byId.get(cloud.myId) || {}, mine));
    const rows = Array.from(byId.values()).map(r => {
      const p = cloud.profiles[r.id] || {};
      const week = (r.weekStart || 0) >= ws ? (r.xpWeek || 0) : 0;
      return {
        userId: r.id, me: r.id === cloud.myId,
        name: r.id === cloud.myId ? (p.name || "Você") : (p.name || "Colega"),
        avatarUrl: p.avatarUrl || "", avatarColor: p.color || "#4F6556",
        xpWeek: week, xpTotal: r.xpTotal || 0, streak: r.streak || 0,
      };
    });
    const key = period === "week" ? "xpWeek" : "xpTotal";
    rows.sort((a, b) => b[key] - a[key] || (a.me ? -1 : b.me ? 1 : 0));
    rows.forEach((r, i) => { r.rank = i + 1; r.score = r[key]; });
    return rows;
  }

  cloud.init = init;
  cloud.schedulePush = schedulePush;
  cloud.leaderboard = leaderboard;
  cloud.isShared = () => cloud.mode === "shared";
  LH.cloud = cloud;
})(window.LH = window.LH || {});
