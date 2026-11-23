// search.js — busca global sem acento e sem diferenciar maiúsculas, com destaque do termo
(function (LH) {
  // Remove acentos e passa para minúsculas, mantendo o mesmo comprimento do texto original
  function norm(s) {
    return String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  }
  // Versão que preserva o mapeamento de posições para o highlight
  function normWithMap(s) {
    let out = "", map = [];
    for (let i = 0; i < s.length; i++) {
      const n = s[i].normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
      for (let k = 0; k < n.length; k++) { out += n[k]; map.push(i); }
    }
    return { out, map };
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  // Devolve HTML com <mark> em todas as ocorrências de cada palavra da busca
  function highlight(text, query) {
    const terms = norm(query).split(/\s+/).filter(Boolean);
    if (!terms.length) return escapeHtml(text);
    const { out, map } = normWithMap(text);
    const marks = new Array(text.length).fill(false);
    for (const t of terms) {
      let i = out.indexOf(t);
      while (i !== -1) {
        for (let k = i; k < i + t.length; k++) marks[map[k]] = true;
        i = out.indexOf(t, i + t.length);
      }
    }
    let html = "", open = false;
    for (let i = 0; i < text.length; i++) {
      if (marks[i] && !open) { html += "<mark>"; open = true; }
      if (!marks[i] && open) { html += "</mark>"; open = false; }
      html += escapeHtml(text[i]);
    }
    return html + (open ? "</mark>" : "");
  }

  // Índice: um registro por item pesquisável
  function buildIndex(content) {
    const themeName = Object.fromEntries(content.themes.map(t => [t.id, t.name]));
    const items = [];
    for (const t of content.themes) {
      items.push({ kind: "theme", id: t.id, themeId: t.id, title: t.name, body: t.summary, hay: norm(t.name + " " + t.summary) });
    }
    for (const f of content.flashcards) {
      items.push({ kind: "flashcard", id: f.id, themeId: f.themeId, theme: themeName[f.themeId], title: f.front, body: f.back, hay: norm(f.front + " " + f.back) });
    }
    for (const q of content.quizzes) {
      const opts = Object.values(q.options).join(" ");
      const kind = q.type === "video" ? "quiz-video" : q.type === "audio" ? "quiz-audio" : "quiz-text";
      const extra = [q.expression, q.transcript].filter(Boolean).join(" ");
      const body = q.type === "video" ? (q.expression ? `Expressão: ${q.expression}` : q.explanation) : opts;
      items.push({ kind, id: q.id, themeId: q.themeId, theme: themeName[q.themeId], title: q.prompt, body, hay: norm(q.prompt + " " + opts + " " + extra) });
    }
    return items;
  }

  // filters: { themes:Set, kinds:Set, statuses:Set } — vazio = sem filtro; statusOf(item) devolve new|review|mastered
  function run(index, query, filters, statusOf) {
    const terms = norm(query).split(/\s+/).filter(Boolean);
    return index.filter(it => {
      if (terms.length && !terms.every(t => it.hay.includes(t))) return false;
      if (filters.themes.size && !filters.themes.has(it.themeId)) return false;
      if (filters.kinds.size && !filters.kinds.has(it.kind)) return false;
      if (filters.statuses.size) {
        if (it.kind === "theme") return false;
        if (!filters.statuses.has(statusOf(it))) return false;
      }
      return true;
    });
  }

  function debounce(fn, ms) {
    let t;
    return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  }

  LH.search = { norm, highlight, buildIndex, run, debounce, escapeHtml };
})(window.LH = window.LH || {});
