// app.js — telas, navegação e sessões de estudo do languageHub (versão caderno)
(function (LH) {
  const { store, srs, xp, search, ui } = LH;
  const { ICON } = ui;
  const esc = search.escapeHtml;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const view = $("#view");
  const toast = ui.toast;

  const STATUS_LABEL = { new: "Novo", review: "Para revisar", mastered: "Dominado" };
  const KIND_LABEL = { theme: "Tema", flashcard: "Flashcard", "quiz-text": "Quiz de texto", "quiz-audio": "Questão com áudio", "quiz-video": "Quiz de vídeo" };
  const KEYS = ["A", "B", "C", "D"];
  const GOAL = 10; // meta diária de acertos
  const THEME_ICON = { "passive-voice": "swap", "tag-questions": "bubble", "simple-present": "clock", "simple-past": "history", "phrasal-verbs": "puzzle", listening: "headphones", video: "film",
    "present-continuous": "loop", "past-continuous": "rewind", "present-perfect": "checkCircle", future: "forward", modals: "key", conditionals: "branch",
    "relative-pronouns": "link2", "reported-speech": "quote", comparatives: "scale", "gerund-infinitive": "pen", pronouns: "user", quantifiers: "stack",
    prepositions: "pin", connectors: "chain", "false-cognates": "mask", affixes: "plus", "reading-strategies": "book" };

  const state = {
    content: null,
    index: [],
    session: null,
    searchQuery: "",
    homeQuery: "",
    filters: { themes: new Set(), kinds: new Set(), statuses: new Set() },
    rankingPeriod: "week",
  };

  // ---------------- Utilidades ----------------
  const initials = name => name.trim().split(/\s+/).slice(0, 2).map(p => p[0] || "").join("").toUpperCase() || "?";
  const themeById = id => state.content.themes.find(t => t.id === id);
  const skillById = id => (state.content.skills || []).find(k => k.id === id);
  const accentOf = themeId => (themeById(themeId) || {}).accent || "var(--margin)";
  const fmtTime = s => { s = Math.max(0, Math.floor(s || 0)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

  function cardStatus(id) { return srs.status(store.load().srs[id]); }
  function quizStatus(id) {
    const s = store.load().quizStats[id];
    if (!s || !s.attempts) return "new";
    return s.lastCorrect ? "mastered" : "review";
  }
  function itemStatus(it) {
    if (it.kind === "flashcard") return cardStatus(it.id);
    if (it.kind.startsWith("quiz")) return quizStatus(it.id);
    return "new";
  }
  function introducedToday() {
    const t = store.today();
    return Object.values(store.load().srs).filter(s => s.firstSeen && store.today(new Date(s.firstSeen)) === t).length;
  }
  function dailyQueue(cards) {
    return srs.dailyQueue(cards || state.content.flashcards, store.load().srs, Date.now(), introducedToday());
  }
  const statusTag = st => `<span class="status st-${st}">${STATUS_LABEL[st]}</span>`;

  // ---------------- Barra superior e abas ----------------
  function updateChrome(route) {
    const t = xp.totals();
    const streak = store.currentStreak();
    const chipS = $("#chip-streak");
    chipS.innerHTML = `${ICON.flame}<b>${streak}</b><span>${streak === 1 ? "dia" : "dias"}</span>`;
    chipS.classList.toggle("is-off", streak === 0);
    chipS.setAttribute("aria-label", `Ofensiva: ${plural(streak, "dia seguido", "dias seguidos")}`);
    $("#chip-xp").innerHTML = `${ICON.bolt}<b>${t.total}</b><span>XP</span>`;
    $("#chip-xp").setAttribute("aria-label", `${t.total} XP no total`);
    const due = dailyQueue().queue.length;
    const b = $("#badge-due");
    b.hidden = due === 0;
    b.textContent = due;
    $$(".tabs a").forEach(a => a.setAttribute("aria-current", a.dataset.route === route ? "page" : "false"));
  }

  // ---------------- Roteamento ----------------
  const ROUTES = { inicio: renderHome, revisoes: renderReviews, diagnostico: renderDiagnosis, busca: renderSearch, ranking: renderRanking, estudo: renderSession };
  const currentRoute = () => { const r = location.hash.replace("#", ""); return ROUTES[r] ? r : "inicio"; };

  function render() {
    const route = currentRoute();
    if (route !== "estudo") { stopMedia(); state.session = null; }
    if (route === "estudo" && !state.session) { location.hash = "#inicio"; return; }
    updateChrome(route === "estudo" ? "" : route);
    ROUTES[route]();
  }
  window.addEventListener("hashchange", () => { render(); window.scrollTo(0, 0); });

  function startSession(session) {
    stopMedia();
    session.startedAt = Date.now();
    state.session = session;
    if (location.hash === "#estudo") { render(); window.scrollTo(0, 0); }
    else location.hash = "#estudo";
  }
  const exitSession = () => { location.hash = (state.session && state.session.back) || "#inicio"; };

  // ---------------- Início ----------------
  function themeCounts(themeId) {
    const c = { new: 0, review: 0, mastered: 0 };
    state.content.flashcards.filter(f => f.themeId === themeId).forEach(f => c[cardStatus(f.id)]++);
    state.content.quizzes.filter(q => q.themeId === themeId).forEach(q => c[quizStatus(q.id)]++);
    return c;
  }
  function progressBar(c) {
    const total = c.new + c.review + c.mastered || 1;
    return `<div class="bar" role="img" aria-label="${c.mastered} dominados, ${c.review} para revisar, ${c.new} novos">
        <i class="b-mastered" style="width:${(c.mastered / total) * 100}%"></i><i class="b-review" style="width:${(c.review / total) * 100}%"></i></div>
      <div class="legend"><span>Dominado <b>${c.mastered}</b></span><span>Para revisar <b>${c.review}</b></span><span>Novo <b>${c.new}</b></span></div>`;
  }

  // "Começar": revisões do dia; se estiverem em dia, um quiz misto priorizando o que o aluno errou
  function startNow() {
    const q = dailyQueue();
    if (q.queue.length) return startDaily("#inicio");
    const pool = state.content.quizzes.filter(x => x.type !== "video");
    const ranked = shuffle(pool).sort((a, b) => ({ review: 0, new: 1, mastered: 2 }[quizStatus(a.id)] - { review: 0, new: 1, mastered: 2 }[quizStatus(b.id)]));
    startQuiz(ranked.slice(0, 8), "Quiz do dia", "#inicio");
  }

  function renderHome() {
    const q = dailyQueue();
    const t = xp.totals();
    const streak = store.currentStreak();
    const groups = state.content.groups || [{ id: "all", name: "Temas" }];
    const gsel = state.homeGroup || "all";
    const themeCard = th => {
      const c = themeCounts(th.id);
      const nCards = state.content.flashcards.filter(f => f.themeId === th.id).length;
      const nQuiz = state.content.quizzes.filter(x => x.themeId === th.id).length;
      let actions, tags;
      if (th.kind === "video") { actions = `<button class="btn btn-ink" data-act="video" data-theme="${th.id}">${ICON.film}Quiz em vídeo</button>`; tags = [plural(nQuiz, "cena", "cenas")]; }
      else if (th.kind === "audio") { actions = `<button class="btn btn-ink" data-act="audio" data-theme="${th.id}">${ICON.ear}Ouvir e responder</button>`; tags = [plural(nQuiz, "áudio", "áudios")]; }
      else {
        actions = `<button class="btn btn-ink" data-act="cards" data-theme="${th.id}">${ICON.cards}Flashcards</button><button class="btn btn-quiz" data-act="quiz" data-theme="${th.id}">${ICON.quiz}Quiz</button>`;
        tags = [plural(nCards, "card", "cards"), plural(nQuiz, "questão", "questões")];
      }
      const total = c.new + c.review + c.mastered || 1;
      return `<article class="theme" style="--accent:${th.accent || "var(--margin)"}">
        <span class="tape" aria-hidden="true"></span>
        <header class="theme-head">
          <span class="theme-icon" aria-hidden="true">${ICON[THEME_ICON[th.id]] || ICON.cards}</span>
          <div class="theme-name"><h3>${esc(th.name)}</h3><div class="theme-tags">${tags.map(t => `<span>${t}</span>`).join("")}</div></div>
          <span class="theme-pct" title="Itens dominados">${Math.round((c.mastered / total) * 100)}%</span>
        </header>
        <p class="theme-desc">${esc(th.summary)}</p>
        <div class="theme-progress">
          <div class="bar" role="img" aria-label="${c.mastered} dominados, ${c.review} para revisar, ${c.new} novos"><i class="b-mastered" style="width:${(c.mastered / total) * 100}%"></i><i class="b-review" style="width:${(c.review / total) * 100}%"></i></div>
          <dl class="theme-stats"><div class="s-mastered"><dt>Dominado</dt><dd>${c.mastered}</dd></div><div class="s-review"><dt>Revisar</dt><dd>${c.review}</dd></div><div class="s-new"><dt>Novo</dt><dd>${c.new}</dd></div></dl>
        </div>
        <div class="actions ${th.kind === "grammar" ? "two" : ""}">${actions}</div>
      </article>`;
    };
    const visible = groups.filter(g => gsel === "all" || g.id === gsel);
    const themes = visible.map(g => {
      const list = state.content.themes.filter(t => g.id === "all" || t.group === g.id);
      if (!list.length) return "";
      return `<section class="theme-group"><div class="group-title"><h3>${esc(g.name)}</h3><span class="label">${plural(list.length, "tema", "temas")}</span></div>
        <div class="themes">${list.map(themeCard).join("")}</div></section>`;
    }).join("");
    const groupChips = state.content.groups ? `<div class="group-chips" role="group" aria-label="Filtrar temas">
        <button class="fchip" data-group="all" aria-pressed="${gsel === "all"}">Todos</button>
        ${state.content.groups.map(g => `<button class="fchip" data-group="${g.id}" aria-pressed="${gsel === g.id}">${esc(g.name)}</button>`).join("")}</div>` : "";

    view.innerHTML = `
      <section class="home-hero enter">
        <h1>language<b>Hub</b></h1>
        <p>Seu caderno de inglês: flashcards, quizzes, áudio e vídeo.</p>
        <div class="home-search">
          <label class="search" for="busca-home">
            <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
            <input id="busca-home" type="search" placeholder="Procure um tema, palavra ou expressão" value="${esc(state.homeQuery)}" autocomplete="off" aria-controls="quick" aria-autocomplete="list">
          </label>
          <div class="quick" id="quick" hidden></div>
        </div>
        <div class="start-wrap">
          <button class="btn btn-ink btn-start" data-act="start">Começar</button>
          <span class="doodle" aria-hidden="true"><svg viewBox="0 0 84 46"><path d="M80 30 C62 44 40 6 8 22"/><path d="M19 13 L7 22 L20 29"/></svg><span>comece por aqui!</span></span>
        </div>
        <span class="home-sub">${q.queue.length ? `${plural(q.queue.length, "cartão", "cartões")} na revisão de hoje` : "Revisões em dia: o Começar abre um quiz do dia"}</span>
      </section>
      <div class="strip">
        <div class="cell c-tally"><span class="label">Acertos hoje</span><div class="tally">${ui.tally(store.correctToday())}</div></div>
        <div class="cell c-goal ${store.correctToday() >= GOAL ? "done" : ""}"><span class="label">Meta do dia</span>
          <div class="goal"><b>${Math.min(store.correctToday(), GOAL)}/${GOAL}</b>
          <span class="goal-bar" aria-hidden="true"><i style="width:${Math.min(1, store.correctToday() / GOAL) * 100}%"></i></span>
          ${store.correctToday() >= GOAL ? `<span class="goal-ok">${ICON.check}batida!</span>` : ""}</div></div>
        <div class="cell c-fire ${streak ? "" : "is-off"}"><span class="label">Ofensiva</span><div class="stat">${ICON.flame}<b>${streak}</b><span>${streak === 1 ? "dia" : "dias"}</span></div></div>
        <div class="cell c-xp"><span class="label">XP na semana</span><div class="stat">${ICON.bolt}<b>${t.week}</b><span>XP</span></div></div>
      </div>
      <section style="display:flex;flex-direction:column;gap:14px">
        <div class="section-title"><h2>Temas</h2><span class="label">${state.content.themes.length} temas · ${state.content.quizzes.length} questões · ${state.content.flashcards.length} cards</span></div>
        ${groupChips}
        ${themes}
      </section>`;

    const input = $("#busca-home");
    const quick = $("#quick");
    const renderQuick = search.debounce(() => {
      const qy = state.homeQuery.trim();
      if (!qy) { quick.hidden = true; return; }
      const found = search.run(state.index, qy, { themes: new Set(), kinds: new Set(), statuses: new Set() }, itemStatus);
      quick.hidden = false;
      quick.innerHTML = found.length
        ? found.slice(0, 5).map(it => `<button data-item="${it.id}" data-kind="${it.kind}"><span>${search.highlight(it.title, qy)}</span><small>${KIND_LABEL[it.kind]}${it.theme ? ` · ${esc(it.theme)}` : ""}</small></button>`).join("")
          + `<button class="all" data-act="all">Ver ${plural(found.length, "resultado", "resultados")} com filtros</button>`
        : `<p class="empty" style="padding:14px">Nada encontrado para "${esc(qy)}"</p>`;
    }, 160);
    input.addEventListener("input", () => { state.homeQuery = input.value; renderQuick(); });
    input.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); goSearch(input.value); } if (e.key === "Escape") quick.hidden = true; });
    if (state.homeQuery) renderQuick();

    view.onclick = e => {
      const r = e.target.closest("[data-item]");
      if (r) return openItem(r.dataset.kind, r.dataset.item, "#inicio");
      const gb = e.target.closest("[data-group]");
      if (gb) { state.homeGroup = gb.dataset.group; const y = window.scrollY; renderHome(); window.scrollTo(0, y); return; }
      const b = e.target.closest("[data-act]");
      if (!b) { if (!e.target.closest(".home-search")) quick.hidden = true; return; }
      const act = b.dataset.act, th = b.dataset.theme;
      if (act === "start") startNow();
      if (act === "all") goSearch(state.homeQuery);
      if (act === "cards") startThemeCards(th);
      if (act === "quiz" || act === "audio" || act === "video") startQuiz(state.content.quizzes.filter(x => x.themeId === th), themeById(th).name);
    };
  }
  function goSearch(q) {
    state.searchQuery = q;
    $("#busca-global").value = q;
    location.hash = "#busca";
  }

  // ---------------- Revisões do dia ----------------
  function renderReviews() {
    const q = dailyQueue();
    const s = store.load().srs;
    const counts = { new: 0, review: 0, mastered: 0 };
    state.content.flashcards.forEach(c => counts[srs.status(s[c.id])]++);
    const upcoming = state.content.flashcards.filter(c => s[c.id] && s[c.id].due > Date.now()).sort((a, b) => s[a.id].due - s[b.id].due).slice(0, 8);
    view.innerHTML = `
      <div class="section-title"><h1>Revisões do dia</h1><span class="label">Repetição espaçada (SM-2)</span></div>
      <div class="box today-box">
        <span class="big">${q.queue.length}</span>
        <span class="today-sub">${q.queue.length === 1 ? "cartão para hoje" : "cartões para hoje"}: ${q.due.length} vencidos e ${q.fresh.length} novos (até ${srs.NEW_PER_DAY} novos por dia)</span>
        ${q.queue.length ? `<button class="btn btn-ink" data-act="daily">Começar revisão ${ICON.arrow}</button>` : `<span class="muted">Nenhum cartão vencido agora. Que tal um quiz?</span>`}
      </div>
      <div class="box today-box">
        <h2>Seus ${state.content.flashcards.length} flashcards</h2>
        <div style="width:100%">${progressBar(counts)}</div>
        <p class="muted" style="font-size:.9rem">Os vencidos aparecem primeiro, do mais atrasado ao mais difícil. Um cartão fica "Dominado" quando o intervalo chega a ${srs.MASTERED_DAYS} dias.</p>
      </div>
      <div class="box">
        <div style="padding:14px 14px 4px"><h2>Próximas revisões</h2></div>
        <div class="list">${upcoming.map(c => `<div class="list-row"><div><b>${esc(c.front)}</b><small>${esc(themeById(c.themeId).name)} · facilidade ${s[c.id].ef.toFixed(2).replace(".", ",")}</small></div><span class="when">em ${srs.formatInterval(s[c.id])}</span></div>`).join("") || `<p class="empty">Revise alguns cartões para ver a agenda aqui.</p>`}</div>
      </div>`;
    view.onclick = e => { if (e.target.closest('[data-act="daily"]')) startDaily("#revisoes"); };
  }

  // ---------------- Sessão de flashcards ----------------
  const newCardSession = (title, queue, back) => ({ kind: "cards", title, queue, idx: 0, flipped: false, xp: 0, right: 0, tally: { again: 0, hard: 0, good: 0, easy: 0 }, back });
  function startDaily(back) { startSession(newCardSession("Revisões do dia", dailyQueue().queue.slice(), back || "#revisoes")); }
  function startThemeCards(themeId) {
    const cards = state.content.flashcards.filter(f => f.themeId === themeId);
    let queue = dailyQueue(cards).queue;
    let title = themeById(themeId).name;
    if (!queue.length) { queue = shuffle(cards); title += " · treino livre"; }
    startSession(newCardSession(title, queue, "#inicio"));
  }

  function renderSession() {
    const s = state.session;
    if (s.kind === "cards") return renderCards();
    if (s.idx >= s.items.length) return s.mode === "review" ? renderErrorReview() : renderSummary();
    renderQuestion();
  }

  function sessionTop(topic, current, total) {
    return `<div class="session-top">
        <button class="close" data-act="exit" aria-label="Sair da sessão">${ICON.close}</button>
        <span class="topic">${esc(topic)}</span>
        <span class="oval" aria-label="Item ${current} de ${total}">${current}/${total}</span>
      </div>
      <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${current - 1}"><i style="width:${total ? ((current - 1) / total) * 100 : 0}%"></i></div>`;
  }

  function renderCards() {
    const s = state.session;
    if (s.idx >= s.queue.length) return renderCardsSummary();
    const card = s.queue[s.idx];
    const st = store.load().srs[card.id];
    const when = r => srs.formatInterval(srs.schedule(st, r));
    view.innerHTML = `<section class="session">
      ${sessionTop(s.title === themeById(card.themeId).name ? s.title : `${s.title} · ${themeById(card.themeId).name}`, s.idx + 1, s.queue.length)}
      <div class="card-wrap ${s.flipped ? "is-flipped" : "enter"}" id="card" style="--accent:${accentOf(card.themeId)}">
        <div class="card-flip" role="button" tabindex="0" aria-label="Virar cartão">
          <div class="face"><span class="face-label">Pergunta${card.typeAnswer ? `<span class="pill">escreva</span>` : ""}</span><p class="face-text">${esc(card.front)}</p>
            <span class="flip-hint">${card.typeAnswer ? "Escreva abaixo ou toque para virar" : "Toque para virar"} ${ICON.turn}</span></div>
          <div class="face face-back"><span class="face-label">Resposta</span><p class="face-text">${esc(card.back)}</p>
            <span class="typed-slot">${typedNote(s.typed)}</span>
            <span class="flip-hint">Você acertou? Marque abaixo · toque no cartão para voltar à pergunta ${ICON.turn}</span></div>
        </div>
      </div>
      ${card.typeAnswer && !s.flipped ? `<form class="type-row" id="type-form" autocomplete="off">
          <label class="search type-in" for="type-in"><span class="label">R:</span><input id="type-in" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="Sua resposta em inglês ou português" aria-label="Sua resposta"></label>
          <button class="btn btn-ink" type="submit">Conferir ${ICON.check}</button>
        </form>` : ""}
      <div class="judge" id="judge" style="${s.flipped ? "" : "opacity:.45"}">
        <button class="check-btn ${s.typed && s.typed.ok ? "suggest" : ""}" data-grade="good" ${s.flipped ? "" : 'aria-disabled="true"'}><span class="tick">${ICON.check}</span><span>Acertei<small>volta em ${when("good")}</small></span></button>
        <button class="check-btn is-wrong-btn ${s.typed && !s.typed.ok ? "suggest" : ""}" data-grade="again" ${s.flipped ? "" : 'aria-disabled="true"'}><span class="tick">${ICON.cross}</span><span>Errei<small>volta em ${when("again")}</small></span></button>
      </div>
      <div class="grade-more" id="grade-more" ${s.flipped ? "" : "hidden"}>Quer ajustar?
        <button class="link-btn" data-grade="hard">foi difícil (${when("hard")})</button>·
        <button class="link-btn" data-grade="easy">foi fácil (${when("easy")})</button></div>
      <div class="card-foot">
        <div class="tally"><span class="label">Acertos hoje</span>${ui.tally(store.correctToday())}</div>
        <span class="muted" style="font-size:.8rem">Espaço vira e desvira · 1 acertei · 2 errei</span>
      </div>
    </section>`;
    view.onclick = e => {
      if (e.target.closest('[data-act="exit"]')) return exitSession();
      const g = e.target.closest("[data-grade]");
      if (g) { if (!s.flipped) return flipCard(); return gradeCard(g.dataset.grade, g); }
      if (e.target.closest('[data-act="unflip"]')) return unflipCard();
      if (e.target.closest(".card-flip")) return s.flipped ? unflipCard() : flipCard();
    };
    const form = $("#type-form");
    if (form) {
      form.addEventListener("submit", e => {
        e.preventDefault();
        const value = $("#type-in").value.trim();
        if (!value) return $("#type-in").focus();
        s.typed = { value, ok: checkTyped(value, card.typeAnswer) };
        $(".typed-slot").innerHTML = typedNote(s.typed);
        $(s.typed.ok ? '[data-grade="good"]' : '[data-grade="again"]').classList.add("suggest");
        document.activeElement.blur();
        flipCard();
      });
      if (window.matchMedia && matchMedia("(pointer: fine)").matches) $("#type-in").focus();
    }
  }

  // Resposta digitada: sem acento, maiúscula, apóstrofo ou pontuação; vale se a resposta aparecer inteira no que foi escrito
  const normAnswer = t => search.norm(String(t)).replace(/[’‘`´']/g, "").replace(/[-–—]/g, " ").replace(/[.,!?;:…"()]/g, " ").replace(/\s+/g, " ").trim();
  function checkTyped(value, answers) {
    const v = ` ${normAnswer(value)} `;
    return answers.some(a => { const n = normAnswer(a); return n && (v.trim() === n || v.includes(` ${n} `)); });
  }
  function typedNote(t) {
    if (!t) return "";
    return `<span class="typed ${t.ok ? "ok" : "no"}">${t.ok ? ICON.check : ICON.cross}Você escreveu <b>${esc(t.value)}</b>${t.ok ? ": bateu!" : ": compare com a resposta"}</span>`;
  }
  function flipCard() {
    const s = state.session;
    if (!s || s.flipped) return;
    s.flipped = true;
    $("#card").classList.remove("enter");
    $("#card").classList.add("is-flipped");
    $("#judge").style.opacity = 1;
    $$("#judge [aria-disabled]").forEach(b => b.removeAttribute("aria-disabled"));
    $("#grade-more").hidden = false;
    const form = $("#type-form");
    if (form) form.remove();
  }
  // Virou sem querer? Volta para a pergunta (o cartão só é avaliado quando você marca Acertei ou Errei)
  function unflipCard() {
    const s = state.session;
    if (!s || !s.flipped || s.busy) return;
    s.flipped = false;
    s.typed = null;
    // mesma animação de giro, só que ao contrário
    const w = $("#card");
    w.classList.remove("enter", "is-flipped");
    $("#judge").style.opacity = .45;
    $$("#judge .check-btn").forEach(b => { b.setAttribute("aria-disabled", "true"); b.classList.remove("suggest"); });
    $("#grade-more").hidden = true;
    const card = s.queue[s.idx], idx = s.idx;
    // cartões de digitar: depois do giro, a caixa de resposta volta
    if (card.typeAnswer) setTimeout(() => {
      if (state.session !== s || s.idx !== idx || s.flipped) return;
      renderCards();
      const nw = $("#card");
      if (nw) nw.classList.remove("enter");
    }, 560);
    else { const slot = $(".typed-slot"); if (slot) slot.innerHTML = ""; }
  }
  function gradeCard(rating, btn) {
    const s = state.session;
    if (s.busy) return;
    s.busy = true;
    if (btn && btn.classList.contains("check-btn")) btn.insertAdjacentHTML("beforeend", ui.scribble());
    const card = s.queue[s.idx];
    const data = store.load();
    const prev = data.srs[card.id];
    const next = srs.schedule(prev, rating);
    next.firstSeen = prev && prev.firstSeen ? prev.firstSeen : Date.now();
    next.reviews = ((prev && prev.reviews) || 0) + 1;
    data.srs[card.id] = next;
    store.save();
    const gained = xp.award(rating === "again" ? xp.RULES.flashcardAgain : xp.RULES.flashcard, "flashcard");
    s.xp += gained;
    s.tally[rating]++;
    if (rating !== "again") { s.right++; store.addCorrectToday(); }
    else s.queue.splice(Math.min(s.queue.length, s.idx + 4), 0, card); // reaprende na mesma sessão
    toast(`+${gained} XP`);
    setTimeout(() => {
      if (state.session !== s) return;
      s.idx++; s.flipped = false; s.busy = false; s.typed = null;
      updateChrome("");
      renderCards();
    }, 520);
  }
  function renderCardsSummary() {
    const s = state.session;
    const reviewed = s.tally.again + s.tally.hard + s.tally.good + s.tally.easy;
    view.innerHTML = `<section class="session"><div class="box summary enter">
      <span class="label">${esc(s.title)} · fim da rodada</span>
      <span class="big">+${s.xp} XP</span>
      <div class="kpis">
        <div class="kpi"><b>${reviewed}</b><span>revisões</span></div>
        <div class="kpi"><b>${s.right}</b><span>acertei</span></div>
        <div class="kpi"><b>${s.tally.again}</b><span>errei</span></div>
        <div class="kpi"><b>${fmtTime((Date.now() - s.startedAt) / 1000)}</b><span>tempo</span></div>
      </div>
      <p class="message">${s.tally.again === 0 ? "Rodada limpa! Os intervalos aumentaram." : "Os cartões que você errou voltam logo para fixar."}</p>
      <div class="actions-3"><a class="btn btn-ink" href="${s.back}">Concluir</a><a class="btn" href="#revisoes">Ver agenda</a></div>
    </div></section>`;
    view.onclick = null;
  }

  // ---------------- Sessão de quiz (texto, áudio e vídeo) ----------------
  // opts.practice = mini-rodada "Praticar Apenas os Erros": o que errar volta para o fim da fila até acertar
  // Cada rodada embaralha as alternativas; a letra exibida segue a posição e o gabarito acompanha a troca.
  // A cópia guarda a questão original em "base", então "Refazer" e "Praticar os erros" sorteiam de novo.
  function shuffleOptions(q) {
    const base = q.base || q;
    const keys = shuffle(KEYS.filter(k => base.options[k] != null));
    const options = {};
    let answer = base.answer;
    keys.forEach((k, i) => { options[KEYS[i]] = base.options[k]; if (k === base.answer) answer = KEYS[i]; });
    return Object.assign({}, base, { options, answer, base });
  }

  function startQuiz(items, title, back = "#inicio", opts = {}) {
    if (!items.length) return toast("Nenhuma questão aqui ainda");
    items = items.map(shuffleOptions);
    startSession({ kind: "quiz", title, items: items.slice(), original: items.slice(), idx: 0, answers: [], correct: 0, xp: 0,
      errors: [], shownAt: Date.now(), back, practice: !!opts.practice, mode: "play", ridx: 0 });
  }

  let media = null;
  function stopMedia() {
    ui.stopSpeaking();
    if (media) { try { media.pause(); } catch (e) {} media = null; }
  }
  // Áudio e vídeo são baixados inteiros e tocados a partir da memória (blob).
  // Assim tocam igual em qualquer navegador, inclusive no Chrome do Android, que às vezes
  // não toca mídia servida em partes (requisições Range) pela hospedagem.
  const mediaCache = new Map();
  function loadMedia(src) {
    if (!mediaCache.has(src)) {
      const p = fetch(src, { credentials: "same-origin" })
        .then(r => { if (!r.ok) throw new Error(r.status); return r.blob(); })
        .then(b => URL.createObjectURL(b));
      p.catch(() => mediaCache.delete(src));
      mediaCache.set(src, p);
    }
    return mediaCache.get(src);
  }
  function playMp3(src) {
    stopMedia();
    const a = new Audio();
    media = a;
    loadMedia(src).then(url => url, () => src).then(url => {
      if (media !== a) return;
      a.src = url;
      a.play().catch(() => toast("Toque de novo para ouvir o áudio"));
    });
  }

  function optionsHtml(q, ans, interactive) {
    return KEYS.filter(k => q.options[k] != null).map(k => {
      let cls = "", tick = k, mark = "", extra = "";
      if (ans) {
        if (k === q.answer) { cls = "is-right"; tick = ICON.check; mark = "Correta"; if (k === ans.choice) extra = ui.scribble(); }
        else if (k === ans.choice) { cls = "is-wrong"; tick = ICON.cross; mark = "Sua resposta"; extra = ui.scribble(); }
      }
      return `<button class="opt ${cls}" data-opt="${k}" ${ans || !interactive ? "disabled" : ""}><span class="tick">${tick}${extra}</span><span>${esc(q.options[k])}</span>${mark ? `<span class="opt-mark">${mark}</span>` : ""}</button>`;
    }).join("");
  }

  function questionBox(q, ans, n) {
    const label = q.type === "audio" ? "Ouça e responda" : q.type === "video" ? `Cena ${n}` : `Questão ${n}`;
    const listen = q.type === "audio"
      ? `<div class="listen"><button class="btn btn-ink" data-act="speak">${ICON.ear}Ouvir frase</button>
          <span class="speed" role="group" aria-label="Velocidade"><button data-rate="1" aria-pressed="${(state.session.rate || 1) === 1}">normal</button><button data-rate="0.7" aria-pressed="${state.session.rate === 0.7}">devagar</button></span></div>`
      : "";
    const mp3 = q.audio ? `<button class="link-btn" data-act="mp3">${ICON.ear} ouvir</button>`
      : (q.type === "text" && q.tts ? `<button class="link-btn" data-act="speak">${ICON.ear} ouvir</button>` : "");
    const fb = ans ? `<div class="explain ${ans.correct ? "good" : "bad"}">
        <strong>${ans.correct ? "Acertou!" : `Errou. A resposta certa é a ${q.answer}.`}</strong>
        <span>${esc(q.explanation)}</span>
        ${q.transcript ? `<span class="transcript">Transcrição: ${esc(q.transcript)}</span>` : ""}</div>` : "";
    return `<div class="box q-box ${ans ? "" : "enter"}" style="--accent:${accentOf(q.themeId)}">
      <span class="face-label"><span>${label}</span>${mp3}</span>
      <p class="q-prompt">${esc(q.prompt)}</p>
      ${listen}
      <div class="options">${optionsHtml(q, ans, true)}</div>
      ${fb}
    </div>`;
  }

  function quizFoot(s, ans) {
    const left = s.items.length - s.idx;
    const info = s.practice ? `faltam ${left}` : plural(s.correct, "acerto", "acertos");
    const last = s.idx === s.items.length - 1;
    return `<div class="q-foot"><span class="q-info">${info}</span>
      ${ans ? `<button class="btn btn-ink" data-act="next">${last ? "Ver resumo" : "Próxima"} ${ICON.arrow}</button>` : `<span class="muted" style="font-size:.8rem">Atalhos: A a D</span>`}</div>`;
  }

  function renderQuestion() {
    const s = state.session;
    const q = s.items[s.idx];
    const ans = s.current;
    const top = sessionTop(s.title, s.idx + 1, s.items.length);

    if (q.type !== "video") {
      view.innerHTML = `<section class="session">${top}${questionBox(q, ans, s.idx + 1)}${quizFoot(s, ans)}</section>`;
    } else {
      const side = `${questionBox(q, ans, s.idx + 1)}${quizFoot(s, ans)}`;
      if ($("#vid-wrap") && $("#vid-wrap").dataset.qid === q.id + ":" + s.idx) {
        $(".vq-side").innerHTML = side; // mesma cena: só atualiza as alternativas, o vídeo segue tocando
      } else {
        const ready = q.video && q.mediaStatus !== "pending";
        const player = ready
          ? `<div class="player enter" id="vid-wrap" data-qid="${q.id}:${s.idx}">
              <video id="vid" preload="auto" playsinline webkit-playsinline></video>
              <button class="big-play" id="big-play" aria-label="Reproduzir a cena" hidden>${ICON.play}</button>
              <div class="vid-state" id="vid-state">Carregando a cena...</div>
              <div class="controls">
                <button data-v="toggle" id="v-toggle" aria-label="Reproduzir ou pausar">${ICON.play}</button>
                <button data-v="back3" aria-label="Rever os últimos 3 segundos">${ICON.back3}rever 3 s</button>
                <label class="seek"><span id="v-cur">0:00</span><input id="v-seek" type="range" min="0" max="1000" value="0" aria-label="Progresso do vídeo"><span id="v-dur">0:00</span></label>
                <span class="vol"><button data-v="mute" id="v-mute" aria-label="Silenciar">${ICON.vol}</button><input id="v-vol" type="range" min="0" max="1" step="0.05" value="1" aria-label="Volume"></span>
              </div></div>`
          : `<div class="player" id="vid-wrap" data-qid="${q.id}:${s.idx}"><div class="pending-media">
              <span class="label">Cena a gravar</span>
              <span class="expr">"${esc(q.expression || "")}"</span>
              <span class="transcript">Contexto: ${esc(q.transcript || "")}</span>
              ${q.mediaRef ? `<a class="link-btn" href="${esc(q.mediaRef)}" target="_blank" rel="noopener">${ICON.link} buscar cena no PlayPhrase</a>` : ""}
            </div></div>`;
        view.innerHTML = `<section class="vq">${top}${player}<div class="vq-side">${side}</div></section>`;
        if (ready) setupVideo(q.video);
      }
    }

    view.onclick = e => {
      if (e.target.closest('[data-act="exit"]')) return exitSession();
      if (e.target.closest('[data-act="next"]')) return nextQuestion();
      if (e.target.closest('[data-act="mp3"]')) return playMp3(q.audio);
      if (e.target.closest('[data-act="speak"]')) {
        if (!ui.speak(q.tts, s.rate || 1)) toast("Seu navegador não tem voz em inglês. A transcrição aparece após responder.");
        return;
      }
      const r = e.target.closest("[data-rate]");
      if (r) { s.rate = +r.dataset.rate; $$(".speed button").forEach(b => b.setAttribute("aria-pressed", b === r)); ui.speak(q.tts, s.rate); return; }
      const o = e.target.closest("[data-opt]");
      if (o && !o.disabled) answer(o.dataset.opt);
    };
    if (q.type === "audio" && !ans && !s.spoken) { s.spoken = true; ui.speak(q.tts, s.rate || 1); }
  }

  function setupVideo(src) {
    const v = $("#vid");
    stopMedia();
    media = v;
    const big = $("#big-play"), stateEl = $("#vid-state");
    const showState = msg => { if (!stateEl.isConnected) return; stateEl.hidden = !msg; stateEl.innerHTML = msg || ""; };
    let triedDirect = false;
    const tryPlay = () => v.play().catch(() => { if (v.isConnected) big.hidden = false; });
    v.addEventListener("canplay", () => showState(""), { once: true });
    v.addEventListener("error", () => {
      if (!v.isConnected) return;
      if (!triedDirect) { triedDirect = true; v.src = src; v.load(); return; } // segunda tentativa: arquivo direto
      showState(`Não deu para carregar esta cena. <button class="link-btn" id="vid-retry">tentar de novo</button>`);
      const rb = $("#vid-retry");
      if (rb) rb.onclick = () => { mediaCache.delete(src); showState("Carregando a cena..."); triedDirect = false; loadMedia(src).then(u => { v.src = u; tryPlay(); }, () => { v.src = src; }); };
    });
    loadMedia(src).then(url => {
      if (!v.isConnected) return;
      v.src = url;
      tryPlay();
    }, () => { if (v.isConnected) { triedDirect = true; v.src = src; tryPlay(); } });
    big.addEventListener("click", () => { big.hidden = true; v.play().catch(() => {}); });
    v.addEventListener("play", () => { big.hidden = true; });
    v.addEventListener("pause", () => { if (!v.ended) big.hidden = false; });
    v.addEventListener("ended", () => { big.hidden = false; });
    // já deixa a próxima cena baixando
    const s = state.session;
    const nextVid = s && s.items.slice(s.idx + 1).find(x => x.type === "video" && x.video);
    if (nextVid) loadMedia(nextVid.video);
    const vol = $("#v-vol"), seek = $("#v-seek");
    let prevVol = 1;
    const sync = () => {
      if (!v.isConnected) return;
      $("#v-cur").textContent = fmtTime(v.currentTime);
      $("#v-dur").textContent = fmtTime(v.duration);
      if (v.duration) seek.value = Math.round((v.currentTime / v.duration) * 1000);
    };
    const icon = () => { if (v.isConnected) $("#v-toggle").innerHTML = v.paused ? ICON.play : ICON.pause; };
    v.addEventListener("loadedmetadata", sync);
    v.addEventListener("timeupdate", sync);
    ["play", "pause", "ended"].forEach(ev => v.addEventListener(ev, icon));
    v.addEventListener("click", () => (v.paused ? v.play() : v.pause()));
    seek.addEventListener("input", () => { if (v.duration) v.currentTime = (seek.value / 1000) * v.duration; });
    vol.addEventListener("input", () => { v.volume = +vol.value; v.muted = v.volume === 0; $("#v-mute").innerHTML = v.muted ? ICON.mute : ICON.vol; });
    $(".controls").addEventListener("click", e => {
      const b = e.target.closest("[data-v]");
      if (!b) return;
      const a = b.dataset.v;
      if (a === "toggle") v.paused ? v.play() : v.pause();
      if (a === "back3") { v.currentTime = Math.max(0, v.currentTime - 3); v.play(); }
      if (a === "mute") {
        if (v.muted || v.volume === 0) { v.muted = false; v.volume = prevVol || 1; }
        else { prevVol = v.volume; v.muted = true; }
        vol.value = v.muted ? 0 : v.volume;
        b.innerHTML = v.muted ? ICON.mute : ICON.vol;
      }
    });
  }

  function answer(choice) {
    const s = state.session;
    const q = s.items[s.idx];
    if (s.current) return; // uma resposta por questão
    const correct = choice === q.answer;
    const secs = (Date.now() - s.shownAt) / 1000;
    s.current = { choice, correct, secs };
    s.answers.push({ id: q.id, choice, correct, secs });

    const data = store.load();
    const st = data.quizStats[q.id] || { attempts: 0, correct: 0 };
    st.attempts++; if (correct) st.correct++; st.lastCorrect = correct; st.lastAt = Date.now();
    data.quizStats[q.id] = st;
    store.save();

    let gained;
    if (correct) {
      s.correct++;
      store.addCorrectToday();
      gained = xp.award(xp.RULES.quizCorrect, "quiz-correct");
      if (secs <= xp.RULES.speedSeconds) gained += xp.award(xp.RULES.speedBonus, "speed");
      toast(secs <= xp.RULES.speedSeconds ? `+${gained} XP · rápido!` : `+${gained} XP`);
    } else {
      // registro do erro para o resumo e para a revisão
      if (!s.errors.some(e => e.quizId === q.id)) {
        s.errors.push({ quizId: q.id, prompt: q.prompt, selected: choice, correct: q.answer, explanation: q.explanation, q });
      }
      if (s.practice) s.items.push(q); // na prática dos erros, volta para o fim até acertar
      gained = xp.award(xp.RULES.quizWrong, "quiz-wrong");
      toast(`+${gained} XP`);
    }
    s.xp += gained;
    updateChrome("");
    renderQuestion();
  }

  function nextQuestion() {
    const s = state.session;
    s.idx++;
    s.current = null;
    s.spoken = false;
    s.shownAt = Date.now();
    if (s.idx >= s.items.length) { stopMedia(); s.finishedAt = Date.now(); return renderSummary(); }
    renderQuestion();
  }

  // ---------------- Resumo da rodada ----------------
  function feedbackMessage(acc, practice) {
    if (practice) return "Pronto: você acertou todas as questões que tinha errado.";
    if (acc === 1) return "Gabaritou! Nenhum erro nesta rodada.";
    if (acc >= 0.8) return "Mandou muito bem. Dê uma olhada nos poucos erros para fechar o conteúdo.";
    if (acc >= 0.5) return "Bom caminho. Revisar os erros agora ajuda a fixar o que faltou.";
    return "Vale revisar a explicação de cada erro e tentar de novo. Errar aqui faz parte do estudo.";
  }

  function renderSummary() {
    const s = state.session;
    s.mode = "summary";
    const n = s.practice ? s.original.length : s.items.length;
    const firstTry = s.practice ? s.original.length : s.correct;
    const acc = n ? (s.practice ? 1 : s.correct / n) : 0;
    if (!s.bonusChecked) {
      s.bonusChecked = true;
      if (!s.practice && n >= 3 && acc >= xp.RULES.accuracyMin) {
        const b = xp.award(xp.RULES.accuracyBonus, "accuracy");
        s.xp += b; s.accuracyBonus = b;
        toast(`+${b} XP · bônus de precisão`);
        updateChrome("");
      }
    }
    const errs = s.errors.length;
    const time = fmtTime(((s.finishedAt || Date.now()) - s.startedAt) / 1000);
    view.innerHTML = `<section class="session"><div class="box summary enter">
      <span class="label">${esc(s.title)} · resumo da rodada</span>
      <span class="big">${s.practice ? `${firstTry}/${n}` : `${s.correct}/${n}`}</span>
      <div class="kpis">
        <div class="kpi"><b>${Math.round(acc * 100)}%</b><span>de acerto</span></div>
        <div class="kpi"><b>${time}</b><span>tempo total</span></div>
        <div class="kpi"><b>+${s.xp}</b><span>XP ganho</span></div>
        <div class="kpi"><b>${errs}</b><span>${errs === 1 ? "erro" : "erros"}</span></div>
      </div>
      <p class="message">${feedbackMessage(acc, s.practice)}</p>
      ${s.accuracyBonus ? `<p class="muted">Inclui o bônus de precisão (+${s.accuracyBonus} XP).</p>` : ""}
      ${weakOfRound(s)}
      <div class="actions-3">
        <button class="btn btn-ink" data-act="review" ${errs ? "" : "disabled"}>Revisar Erros (${errs})</button>
        <button class="btn" data-act="redo">Refazer Quiz</button>
        <button class="btn" data-act="themes">Voltar aos Temas</button>
      </div>
    </div></section>`;
    view.onclick = e => {
      const b = e.target.closest("[data-act]");
      if (!b || b.disabled) return;
      if (b.dataset.act === "review") { s.mode = "review"; s.ridx = 0; renderErrorReview(); }
      if (b.dataset.act === "redo") startQuiz(s.original, s.title, s.back, { practice: s.practice });
      if (b.dataset.act === "themes") location.hash = "#inicio";
      if (b.dataset.act === "skill") startSkill(b.dataset.skill, s.back);
    };
  }
  // O ponto gramatical que mais apareceu entre os erros da rodada
  function weakOfRound(s) {
    if (s.practice || !s.errors.length) return "";
    const count = {};
    s.errors.forEach(e => { const k = e.q.skill; if (k) count[k] = (count[k] || 0) + 1; });
    const top = Object.keys(count).sort((a, b) => count[b] - count[a])[0];
    const k = top && skillById(top);
    if (!k) return "";
    return `<div class="note-row"><p class="note"><b>Ponto fraco da rodada:</b> ${esc(k.name)}. ${esc(k.tip)}</p>
      <button class="link-btn" data-act="skill" data-skill="${k.id}">treinar só isso</button></div>`;
  }

  // ---------------- Modo de revisão de erros ----------------
  function renderErrorReview() {
    const s = state.session;
    const list = s.errors;
    const e = list[s.ridx];
    view.innerHTML = `<section class="session">
      <div class="session-top">
        <button class="close" data-act="to-summary" aria-label="Voltar ao resumo">${ICON.left}</button>
        <span class="topic">Revisão de erros</span>
        <span class="oval">${s.ridx + 1}/${list.length}</span>
      </div>
      <div class="box q-box enter">
        <span class="face-label"><span>${esc(themeById(e.q.themeId).name)}</span></span>
        <p class="q-prompt">${esc(e.prompt)}</p>
        ${e.q.transcript ? `<span class="transcript">Áudio/cena: ${esc(e.q.transcript)}</span>` : e.q.expression ? `<span class="transcript">Expressão da cena: "${esc(e.q.expression)}"</span>` : ""}
        <div class="options">${optionsHtml(e.q, { choice: e.selected }, false)}</div>
        <div class="explain"><strong>Explicação / Dica</strong><span>${esc(e.explanation)}</span></div>
      </div>
      <div class="review-nav">
        <button class="btn" data-act="prev" ${s.ridx === 0 ? "disabled" : ""}>${ICON.left} Anterior</button>
        <button class="btn" data-act="next-err" ${s.ridx === list.length - 1 ? "disabled" : ""}>Próxima ${ICON.arrow}</button>
      </div>
      <button class="btn btn-ink" data-act="practice">Praticar Apenas os Erros</button>
    </section>`;
    view.onclick = ev => {
      const b = ev.target.closest("[data-act]");
      if (!b || b.disabled) return;
      const a = b.dataset.act;
      if (a === "to-summary") return renderSummary();
      if (a === "prev") { s.ridx--; renderErrorReview(); }
      if (a === "next-err") { s.ridx++; renderErrorReview(); }
      if (a === "practice") startQuiz(list.map(x => x.q), "Praticando os erros", s.back, { practice: true });
    };
  }

  // ---------------- Diagnóstico de pontos fracos ----------------
  // Junta erros de quiz (quizStats) e lapsos de flashcard (SM-2) por ponto gramatical ("skill")
  function skillStats() {
    const data = store.load();
    const map = {};
    (state.content.skills || []).forEach(k => { map[k.id] = Object.assign({}, k, { attempts: 0, errors: 0, quizzes: [], cards: [] }); });
    state.content.quizzes.forEach(q => {
      const m = map[q.skill]; if (!m) return;
      m.quizzes.push(q);
      const st = data.quizStats[q.id];
      if (st) { m.attempts += st.attempts; m.errors += st.attempts - st.correct; }
    });
    state.content.flashcards.forEach(f => {
      const m = map[f.skill]; if (!m) return;
      m.cards.push(f);
      const st = data.srs[f.id];
      if (st) { m.attempts += st.reviews || (st.reps + (st.lapses || 0)) || 1; m.errors += st.lapses || 0; }
    });
    return Object.values(map).map(m => Object.assign(m, { rate: m.attempts ? m.errors / m.attempts : 0 }));
  }

  function startSkill(id, back = "#diagnostico") {
    const k = skillStats().find(x => x.id === id);
    if (!k) return;
    const order = { review: 0, new: 1, mastered: 2 };
    const qs = shuffle(k.quizzes).sort((a, b) => order[quizStatus(a.id)] - order[quizStatus(b.id)]).slice(0, 8);
    if (qs.length) return startQuiz(qs, `Revisando: ${k.name}`, back);
    startSession(newCardSession(`Revisando: ${k.name}`, shuffle(k.cards), back));
  }

  // Calendário estilo GitHub: 16 semanas, uma coluna por semana (seg a dom)
  function heatmap() {
    const byDay = xp.byDay();
    const WEEKS = 16;
    const start = new Date(xp.weekStart());
    start.setDate(start.getDate() - (WEEKS - 1) * 7);
    const todayKey = store.today();
    const months = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
    const level = v => (!v ? 0 : v < 30 ? 1 : v < 80 ? 2 : v < 150 ? 3 : 4);
    let cells = "", heads = "", lastMonth = -1;
    for (let w = 0; w < WEEKS; w++) {
      const first = new Date(start); first.setDate(start.getDate() + w * 7);
      heads += `<span>${first.getMonth() !== lastMonth ? months[first.getMonth()] : ""}</span>`;
      lastMonth = first.getMonth();
      for (let d = 0; d < 7; d++) {
        const day = new Date(first); day.setDate(first.getDate() + d);
        const key = store.today(day);
        const future = key > todayKey;
        const v = byDay[key] || 0;
        const label = `${day.getDate()} de ${months[day.getMonth()]}: ${v ? `${v} XP` : "sem estudo"}`;
        cells += future ? `<i class="hm-future"></i>` : `<i class="hm-${level(v)}${key === todayKey ? " hm-today" : ""}" title="${label}" aria-label="${label}"></i>`;
      }
    }
    // dias estudados e maior sequência
    const days = Object.keys(byDay).filter(k => byDay[k] > 0).sort();
    let best = 0, run = 0, prev = null;
    days.forEach(k => {
      const d = new Date(k + "T12:00:00");
      run = prev && Math.round((d - prev) / store.DAY) === 1 ? run + 1 : 1;
      best = Math.max(best, run); prev = d;
    });
    return { html: `<div class="heat-wrap"><div class="heat-days" aria-hidden="true"><span>seg</span><span></span><span>qua</span><span></span><span>sex</span><span></span><span></span></div>
        <div class="heat-main"><div class="heat-months" aria-hidden="true">${heads}</div><div class="heat" role="img" aria-label="Calendário de estudo das últimas ${WEEKS} semanas">${cells}</div></div></div>
        <div class="heat-legend"><span>menos</span><i class="hm-0"></i><i class="hm-1"></i><i class="hm-2"></i><i class="hm-3"></i><i class="hm-4"></i><span>mais</span></div>`,
      studied: days.length, best };
  }

  function renderDiagnosis() {
    const data = store.load();
    const stats = skillStats();
    const live = state.content.quizzes.map(q => data.quizStats[q.id]).filter(Boolean);
    const qAttempts = live.reduce((a, s) => a + s.attempts, 0);
    const qCorrect = live.reduce((a, s) => a + s.correct, 0);
    const reviews = state.content.flashcards.reduce((a, f) => a + (data.srs[f.id] ? (data.srs[f.id].reviews || 1) : 0), 0);
    const hm = heatmap();
    const weak = stats.filter(k => k.errors > 0).sort((a, b) => b.rate - a.rate || b.errors - a.errors);
    const strong = stats.filter(k => k.attempts >= 3 && k.rate <= 0.15);
    const pct = v => `${Math.round(v * 100)}%`;
    const weakHtml = weak.length ? weak.slice(0, 6).map((k, i) => `
      <article class="weak" style="--accent:${accentOf(k.themeId)}">
        <div class="weak-head"><span class="weak-n">${i + 1}</span>
          <div><h3>${esc(k.name)}</h3><span class="label">${esc(themeById(k.themeId).name)}</span></div>
          <span class="weak-rate" aria-label="Taxa de erro">${pct(k.rate)}<small>de erro</small></span></div>
        <div class="weak-bar" aria-hidden="true"><i style="width:${Math.max(6, k.rate * 100)}%"></i></div>
        <p class="note">${esc(k.tip)}</p>
        <div class="weak-foot"><span class="muted">${plural(k.errors, "erro", "erros")} em ${plural(k.attempts, "tentativa", "tentativas")}</span>
          <button class="btn btn-ink" data-skill="${k.id}">Revisar só isso ${ICON.arrow}</button></div>
      </article>`).join("")
      : `<div class="box empty-note"><p>${qAttempts + reviews ? "Nenhum ponto fraco por enquanto. Continue assim!" : "Ainda não dá para diagnosticar: faça um quiz ou revise alguns flashcards e eu aponto onde você mais erra."}</p>
          ${qAttempts + reviews ? "" : `<button class="btn btn-ink" data-act="start">Começar agora</button>`}</div>`;
    const accRows = state.content.themes.map(th => {
      let a = 0, c = 0;
      state.content.quizzes.filter(q => q.themeId === th.id).forEach(q => { const st = data.quizStats[q.id]; if (st) { a += st.attempts; c += st.correct; } });
      return { th, a, c };
    });
    const tried = accRows.filter(r => r.a).sort((x, y) => x.c / x.a - y.c / y.a);
    const untried = accRows.filter(r => !r.a);
    const themes = (tried.length ? tried.map(({ th, a, c }) => `<div class="th-acc" style="--accent:${th.accent}"><span>${esc(th.name)}</span>
        <div class="th-bar"><i style="width:${(c / a) * 100}%"></i></div><b>${pct(c / a)}</b></div>`).join("")
        : `<p class="muted">Responda alguns quizzes para ver o acerto de cada tema aqui.</p>`)
      + (untried.length && tried.length ? `<p class="untried"><span class="label">Ainda sem respostas</span>${untried.map(r => `<span class="status st-new">${esc(r.th.name)}</span>`).join("")}</p>` : "");

    view.innerHTML = `
      <div class="section-title"><h1>Diagnóstico</h1><span class="label">onde você mais erra e quando estudou</span></div>
      <div class="kpis kpis-4">
        <div class="kpi"><b>${qAttempts ? pct(qCorrect / qAttempts) : "–"}</b><span>acerto nos quizzes</span></div>
        <div class="kpi"><b>${qAttempts}</b><span>respostas de quiz</span></div>
        <div class="kpi"><b>${reviews}</b><span>revisões de cartão</span></div>
        <div class="kpi"><b>${weak.length}</b><span>${weak.length === 1 ? "ponto para revisar" : "pontos para revisar"}</span></div>
      </div>
      <section class="diag-block">
        <div class="sub-title"><h2>Pontos fracos</h2><span class="label">do maior para o menor erro</span></div>
        <div class="weak-list">${weakHtml}</div>
        ${strong.length ? `<p class="strong-line"><span class="label">Mandando bem em</span>${strong.map(k => `<span class="status st-mastered">${esc(k.name)}</span>`).join("")}</p>` : ""}
      </section>
      <section class="box heat-box">
        <div class="sub-title"><h2>Calendário de ofensiva</h2><span class="label">últimas 16 semanas</span></div>
        <div class="heat-row">
          <div class="heat-col">${hm.html}</div>
          <div class="heat-side">
            <div><b>${store.currentStreak()}</b><span>${store.currentStreak() === 1 ? "dia seguido agora" : "dias seguidos agora"}</span></div>
            <div><b>${hm.best}</b><span>recorde de dias seguidos</span></div>
            <div><b>${hm.studied}</b><span>${hm.studied === 1 ? "dia estudado" : "dias estudados"}</span></div>
          </div>
        </div>
      </section>
      <section class="box th-box">
        <div class="sub-title"><h2>Acerto por tema</h2><span class="label">do menor para o maior acerto</span></div>
        ${themes}
      </section>`;
    view.onclick = e => {
      const b = e.target.closest("[data-skill]");
      if (b) return startSkill(b.dataset.skill);
      if (e.target.closest('[data-act="start"]')) startNow();
    };
  }

  // ---------------- Busca ----------------
  const runSearchDebounced = search.debounce(() => { if (currentRoute() === "busca") renderResults(); }, 180);

  function renderSearch() {
    const f = state.filters;
    const chip = (group, value, label) => `<button class="fchip" data-f="${group}" data-v="${value}" aria-pressed="${f[group].has(value)}">${label}</button>`;
    view.innerHTML = `
      <div class="section-title"><h1>Buscar no caderno</h1><span class="label">sem acento, sem maiúscula</span></div>
      <label class="search" for="busca-pagina" style="height:50px">
        <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <input id="busca-pagina" type="search" placeholder="Ex.: participio, give up, piece of cake" value="${esc(state.searchQuery)}" autocomplete="off">
      </label>
      <div class="box filters">
        <div class="fgroup"><span>Tema</span>${state.content.themes.map(t => chip("themes", t.id, esc(t.name))).join("")}</div>
        <div class="fgroup"><span>Tipo</span>${chip("kinds", "flashcard", "Flashcard")}${chip("kinds", "quiz-text", "Quiz de texto")}${chip("kinds", "quiz-audio", "Áudio")}${chip("kinds", "quiz-video", "Vídeo")}</div>
        <div class="fgroup"><span>Status</span>${chip("statuses", "new", "Novo")}${chip("statuses", "review", "Para revisar")}${chip("statuses", "mastered", "Dominado")}</div>
      </div>
      <div id="results"></div>`;
    const input = $("#busca-pagina");
    input.addEventListener("input", () => { state.searchQuery = input.value; $("#busca-global").value = input.value; runSearchDebounced(); });
    view.onclick = e => {
      const c = e.target.closest("[data-f]");
      if (c) {
        const set = state.filters[c.dataset.f];
        set.has(c.dataset.v) ? set.delete(c.dataset.v) : set.add(c.dataset.v);
        c.setAttribute("aria-pressed", set.has(c.dataset.v));
        return renderResults();
      }
      const r = e.target.closest("[data-item]");
      if (r) openItem(r.dataset.kind, r.dataset.item, "#busca");
    };
    renderResults();
    if (document.activeElement !== $("#busca-global")) input.focus();
  }

  function renderResults() {
    const box = $("#results");
    if (!box) return;
    const qy = state.searchQuery.trim();
    const list = search.run(state.index, qy, state.filters, itemStatus);
    const anyFilter = state.filters.themes.size + state.filters.kinds.size + state.filters.statuses.size > 0;
    if (!qy && !anyFilter) { box.innerHTML = `<p class="empty">Escreva algo ou escolha um filtro. A busca olha temas, frente e verso dos flashcards, enunciados, transcrições e expressões.</p>`; return; }
    if (!list.length) { box.innerHTML = `<p class="empty">Nada encontrado${qy ? ` para "${esc(qy)}"` : ""}. Tente outro termo ou tire um filtro.</p>`; return; }
    box.innerHTML = `<p class="label" style="margin-bottom:8px">${plural(list.length, "resultado", "resultados")}</p>
      <div class="results">${list.map(it => `
        <button class="result" data-item="${it.id}" data-kind="${it.kind}">
          <span class="meta"><span class="status kind">${KIND_LABEL[it.kind]}</span>${it.theme ? `<span>${esc(it.theme)}</span>` : ""}${it.kind !== "theme" ? statusTag(itemStatus(it)) : ""}</span>
          <span class="title">${search.highlight(it.title, qy)}</span>
          <span class="body">${search.highlight(it.body, qy)}</span>
        </button>`).join("")}</div>`;
  }

  function openItem(kind, id, back) {
    if (kind === "theme") {
      const th = themeById(id);
      if (th.kind !== "grammar") return startQuiz(state.content.quizzes.filter(q => q.themeId === id), th.name, back);
      return startThemeCards(id);
    }
    if (kind === "flashcard") return startSession(newCardSession("Flashcard", [state.content.flashcards.find(f => f.id === id)], back));
    const q = state.content.quizzes.find(x => x.id === id);
    startQuiz([q], KIND_LABEL[kind], back);
  }

  const globalInput = $("#busca-global");
  globalInput.addEventListener("input", () => {
    state.searchQuery = globalInput.value;
    if (currentRoute() !== "busca") { location.hash = "#busca"; setTimeout(() => globalInput.focus(), 0); }
    else { const p = $("#busca-pagina"); if (p) p.value = globalInput.value; runSearchDebounced(); }
  });
  globalInput.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); if (currentRoute() !== "busca") location.hash = "#busca"; } });

  // ---------------- Ranking ----------------
  function renderRanking() {
    const period = state.rankingPeriod;
    const cloud = LH.cloud;
    const shared = cloud && cloud.isShared();
    const rows = shared ? cloud.leaderboard(period) : xp.leaderboard(period);
    const me = rows.find(r => r.me);
    const top = rows.slice(0, 3);
    const youLabel = r => (r.me && r.name !== "Você" ? " (você)" : "");
    const avatar = r => r.avatarUrl
      ? `<img class="avatar" src="${esc(r.avatarUrl)}" alt="">`
      : `<span class="avatar" style="background:${r.avatarColor}">${esc(initials(r.name))}</span>`;
    const place = (r, cls) => r ? `<div class="place ${cls}">${cls === "p1" ? `<span class="crown" aria-hidden="true">${CROWN}</span>` : ""}${avatar(r)}<span class="name">${esc(r.name)}${youLabel(r)}</span><span class="score">${r.score} XP</span><div class="step">${r.rank}</div></div>` : `<div class="place ${cls}"><div class="step step-empty"></div></div>`;
    const row = r => `<div class="board-row ${r.me ? "is-me" : ""}">
      <span class="pos">${r.rank}º</span>${avatar(r)}
      <span class="who"><b>${esc(r.name)}${youLabel(r)}</b><small><span class="mini-fire">${ICON.flame}${r.streak}</span>${r.example ? '<span class="tag-ex">exemplo</span>' : ""}</small></span>
      <span class="pts">${ICON.bolt}${r.score}</span></div>`;
    const R = xp.RULES;
    let banner;
    if (shared) {
      banner = cloud.readOnly
        ? `<p class="note">Você está vendo o ranking da turma, mas este link não deixa você entrar nele. Peça acesso de colaborador a quem compartilhou.</p>`
        : rows.length <= 1
          ? `<p class="note"><b>Ranking da turma ligado.</b> Por enquanto só você por aqui: quando seus colegas abrirem este mesmo link e estudarem, eles aparecem na lista.</p>`
          : `<p class="live"><span class="dot"></span>Ranking da turma ao vivo · ${plural(rows.length, "aluno", "alunos")}</p>`;
    } else if (cloud && cloud.mode === "loading") banner = `<p class="note">Carregando o ranking da turma...</p>`;
    else banner = `<p class="note">Modo exemplo: os colegas abaixo são fictícios. Abra o app pelo link publicado para ver o ranking real da turma.</p>`;
    const rest = rows.slice(3).filter(r => !r.me);
    view.innerHTML = `
      <div class="section-title"><h1>Ranking</h1>
        <div class="seg" role="group" aria-label="Período"><button data-p="week" aria-pressed="${period === "week"}">Semanal</button><button data-p="all" aria-pressed="${period === "all"}">Geral</button></div></div>
      ${banner}
      <div class="box"><div class="podium">${place(top[1], "p2")}${place(top[0], "p1")}${place(top[2], "p3")}</div></div>
      ${rest.length ? `<div class="box">${rest.map(row).join("")}</div>` : ""}
      ${me && me.rank > 3 ? `<div class="box pinned" aria-label="Sua posição">${row(me)}</div>` : ""}
      <div class="box rules">
        <h2>Como ganhar XP</h2>
        <table>
          <tr><td>Flashcard: Acertei, difícil ou fácil</td><td>+${R.flashcard}</td></tr>
          <tr><td>Flashcard: Errei</td><td>+${R.flashcardAgain}</td></tr>
          <tr><td>Acerto em quiz (texto, áudio ou vídeo)</td><td>+${R.quizCorrect}</td></tr>
          <tr><td>Resposta errada em quiz</td><td>+${R.quizWrong}</td></tr>
          <tr><td>Bônus de velocidade: acerto em até ${R.speedSeconds} s</td><td>+${R.speedBonus}</td></tr>
          <tr><td>Bônus de precisão: ${Math.round(R.accuracyMin * 100)}% ou mais numa rodada de 3+ questões</td><td>+${R.accuracyBonus}</td></tr>
          <tr><td>Ofensiva diária: +10% por dia seguido, até</td><td>×${R.streakMaxMult.toFixed(1).replace(".", ",")}</td></tr>
        </table>
        <p class="muted" style="font-size:.82rem">O Semanal conta desde segunda-feira.${shared ? " Cada aluno grava só o próprio placar; os nomes vêm da conta de cada um." : ""}</p>
      </div>
      ${shared ? "" : `<div class="box rules">
        <h2>Seu nome no ranking</h2>
        <form class="name-edit" id="name-form"><input id="nome-aluno" maxlength="24" value="${esc(store.load().user.name)}" aria-label="Seu nome"><button class="btn btn-ink" type="submit">Salvar</button></form>
      </div>`}`;
    view.onclick = e => { const p = e.target.closest("[data-p]"); if (p) { state.rankingPeriod = p.dataset.p; renderRanking(); } };
    const form = $("#name-form");
    if (form) form.addEventListener("submit", e => {
      e.preventDefault();
      const v = $("#nome-aluno").value.trim();
      if (!v) return toast("Escreva um nome");
      store.load().user.name = v;
      store.save();
      toast("Nome salvo");
      renderRanking();
    });
  }
  const CROWN = '<svg viewBox="0 0 32 20"><path d="M3 17 L5 5 L11 11 L16 3 L21 11 L27 5 L29 17 Z"/></svg>';

  // ---------------- Tutorial do primeiro acesso ----------------
  const TUTORIAL = [
    { title: "Bem-vindo ao seu caderno", body: "O botão <b>Começar</b> abre os cartões que vencem hoje. Se você já estiver em dia, ele abre um quiz do dia com o que você mais erra. Cada acerto vira uma marquinha na folha.",
      art: () => `<div class="tut-art"><span class="btn btn-ink btn-start tut-start">Começar</span>${ui.tally(7)}</div>` },
    { title: "Acertei ou errei?", body: "Vire o cartão, confira a resposta e seja sincero. <b>Acertei</b>: o cartão some por alguns dias. <b>Errei</b>: ele volta em 10 minutos, ainda nesta sessão. Em alguns cartões dá para escrever a resposta antes de virar.",
      art: () => `<div class="tut-art judge"><span class="check-btn"><span class="tick">${ICON.check}</span><span>Acertei<small>volta em 1 d</small></span>${ui.scribble()}</span><span class="check-btn is-wrong-btn"><span class="tick">${ICON.cross}</span><span>Errei<small>volta em 10 min</small></span></span></div>` },
    { title: "Intervalos que crescem", body: "A cada acerto o intervalo aumenta. Com 21 dias o cartão vira <b>Dominado</b>. O <b>Diagnóstico</b> mostra seus pontos fracos e o <b>Ranking</b> compara seu XP com a turma.",
      art: () => `<ol class="tut-line"><li>10 min</li><li>1 d</li><li>6 d</li><li>15 d</li><li class="last">21 d<small>dominado</small></li></ol>` },
  ];
  function showTutorial(step = 0) {
    let ov = $("#tutorial");
    if (!ov) {
      ov = document.createElement("div");
      ov.id = "tutorial";
      ov.className = "overlay";
      ov.setAttribute("role", "dialog");
      ov.setAttribute("aria-modal", "true");
      ov.setAttribute("aria-labelledby", "tut-title");
      document.body.appendChild(ov);
      ov.addEventListener("click", e => {
        const b = e.target.closest("[data-tut]");
        if (e.target === ov) return closeTutorial();
        if (!b) return;
        const a = b.dataset.tut;
        if (a === "skip" || a === "done") closeTutorial();
        if (a === "next") showTutorial(+ov.dataset.step + 1);
        if (a === "prev") showTutorial(+ov.dataset.step - 1);
      });
    }
    const t = TUTORIAL[step];
    ov.dataset.step = step;
    const last = step === TUTORIAL.length - 1;
    ov.innerHTML = `<div class="tut box enter">
      <span class="tape" aria-hidden="true"></span>
      <span class="label">Como funciona · ${step + 1} de ${TUTORIAL.length}</span>
      <h2 id="tut-title">${t.title}</h2>
      ${t.art()}
      <p>${t.body}</p>
      <div class="tut-dots" aria-hidden="true">${TUTORIAL.map((_, i) => `<i class="${i === step ? "on" : ""}"></i>`).join("")}</div>
      <div class="tut-actions">
        ${step ? `<button class="btn" data-tut="prev">${ICON.left} Voltar</button>` : `<button class="link-btn" data-tut="skip">Pular</button>`}
        <button class="btn btn-ink" data-tut="${last ? "done" : "next"}">${last ? "Bora estudar" : "Próximo"} ${ICON.arrow}</button>
      </div>
    </div>`;
    $("[data-tut='next'], [data-tut='done']", ov).focus();
  }
  function closeTutorial() {
    const ov = $("#tutorial");
    if (ov) ov.remove();
    const p = store.load().prefs;
    if (!p.tutorialDone) { p.tutorialDone = true; store.save(); }
  }

  $("#btn-help").addEventListener("click", () => showTutorial(0));

  // ---------------- Atalhos de teclado ----------------
  document.addEventListener("keydown", e => {
    if ($("#tutorial")) { if (e.key === "Escape") closeTutorial(); return; }
    if (currentRoute() !== "estudo" || !state.session) return;
    if (e.target.matches("input, textarea")) return;
    const s = state.session;
    if (e.key === "Escape") return exitSession();
    if (s.kind === "cards" && s.idx < s.queue.length) {
      if (e.key === " ") { e.preventDefault(); s.flipped ? unflipCard() : flipCard(); }
      else if (!s.flipped && e.key === "Enter") { e.preventDefault(); flipCard(); }
      else if (s.flipped && e.key === "1") gradeCard("good", $('[data-grade="good"]'));
      else if (s.flipped && e.key === "2") gradeCard("again", $('[data-grade="again"]'));
    }
    if (s.kind === "quiz" && s.mode === "play" && s.idx < s.items.length) {
      const map = { a: "A", b: "B", c: "C", d: "D", 1: "A", 2: "B", 3: "C", 4: "D" };
      const k = map[e.key.toLowerCase()];
      if (k && !s.current) answer(k);
      else if (e.key === "Enter" && s.current) { e.preventDefault(); nextQuestion(); }
    }
  });

  // ---------------- Inicialização ----------------
  view.innerHTML = `<p class="empty">Abrindo o caderno...</p>`;
  if (window.speechSynthesis) { try { window.speechSynthesis.getVoices(); } catch (e) {} }
  fetch("data/content.json?v=7", { cache: "no-cache" })
    .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(content => {
      state.content = content;
      state.index = search.buildIndex(content);
      render();
      if (!store.load().prefs.tutorialDone) showTutorial(0);
      if (LH.cloud) {
        LH.cloud.subscribe(() => { if (currentRoute() === "ranking") renderRanking(); });
        LH.cloud.init();
      }
    })
    .catch(() => { view.innerHTML = `<p class="empty">Não foi possível carregar os conteúdos. Recarregue a página.</p>`; });
})(window.LH);
