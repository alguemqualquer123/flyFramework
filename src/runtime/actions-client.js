// Runtime client das server actions (revalidate no browser dispara revalidação server-side).
export function revalidateTag(tag: string): void {
  fetch("/__fly/revalidate?tag=" + encodeURIComponent(tag), { method: "POST" }).catch(() => {});
}

globalThis.__flyRevalidate = (tag) => {
  fetch("/__fly/revalidate?tag=" + encodeURIComponent(tag), { method: "POST" }).catch(() => {});
};

// Serializa FormData preservando os nomes (arrays para múltiplos valores).
function serializeForm(form) {
  const data = new FormData(form);
  const out = {};
  for (const [k, v] of data.entries()) {
    if (typeof File !== "undefined" && v instanceof File) {
      out[k] = "[file:" + v.name + "]";
      continue;
    }
    if (k in out) {
      if (!Array.isArray(out[k])) out[k] = [out[k]];
      out[k].push(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

// Executa uma server action pelo id, tratando redirect/revalidate. Retorna { ok, result, redirect }.
async function callAction(id, payload) {
  const r = await fetch("/__fly/action/" + id, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify([payload]),
  });
  if (!r.ok) throw new Error("action failed: " + r.status);
  const d = await r.json();
  if (d && d.__redirect) return { ok: true, redirect: d.__redirect };
  if (d && d.__revalidate && d.__revalidate.length) d.__revalidate.forEach((t) => globalThis.__flyRevalidate && globalThis.__flyRevalidate(t));
  return { ok: !d || !d.error, result: d ? d.result : undefined, error: d && d.error };
}

function spaSwap(html) {
  const current = document.getElementById("__fly");
  if (!current) return false;
  const doc = new DOMParser().parseFromString(html, "text/html");
  const incoming = doc.getElementById("__fly");
  if (!incoming) return false;
  current.replaceChildren(...Array.from(incoming.childNodes));
  if (window.__flyMount) window.__flyMount(window.__FLY_DATA__);
  return true;
}

if (typeof document !== "undefined") {
  document.addEventListener("click", (e) => {
    const a = e.target?.closest?.("a[data-fly-link]");
    if (!a) return;
    const href = a.getAttribute("href");
    if (!href || href.startsWith("http") || a.target === "_blank") return;
    e.preventDefault();
    history.pushState({}, "", href);
    import("/__fly/client-nav.js").then((m) => m.navigate(href)).catch(() => (location.href = href));
  });

  // Prefetch real: ao passar o mouse por um Link, busca o partial e guarda em cache para
  // alimentar a navegação SPA.
  const prefetchCache = new Map();
  globalThis.__flyPrefetchCache = prefetchCache;
  let prefetchedHrefs = new Set();
  document.addEventListener("mouseover", (e) => {
    const a = e.target?.closest?.("a[data-fly-link]");
    if (!a || prefetchedHrefs.has(a)) return;
    prefetchedHrefs.add(a);
    const href = a.getAttribute("href") ?? "";
    if (!href || href.startsWith("http") || a.target === "_blank") return;
    fetch(href, { headers: { "fly-partial": "1" } })
      .then((r) => r.text())
      .then((html) => {
        prefetchCache.set(href, html);
        globalThis.__flyPrefetchCache = prefetchCache;
      })
      .catch(() => {});
  }, true);

  // Progressive enhancement para <form data-fly-action="ID"> (gerado por <Form action=...>):
  // intercepta o submit, chama a server action via XHR e faz swap SPA. Sem JS, o POST nativo
  // (action como URL da rota) continua funcionando - formulário progressivo.
  document.addEventListener("submit", (e) => {
    const form = e.target?.closest?.("form[data-fly-action]");
    if (!form) return;
    e.preventDefault();
    // data-fly-action pode ser o id direto OU o nome da action (resolve via __FLY_ACTION_IDS__).
    const ref = form.getAttribute("data-fly-action");
    const ids = globalThis.__FLY_ACTION_IDS__ || {};
    const id = ids[ref] || ref;
    const payload = serializeForm(form);
    const origin = (form.getAttribute("data-fly-redirect") || location.pathname);
    callAction(id, payload)
      .then((res) => {
        if (res.redirect) { location.href = res.redirect; return; }
        if (res.error) { if (form.getAttribute("data-fly-error")) { form.dispatchEvent(new CustomEvent("fly:error", { detail: res.error })); } return; }
        fetch(origin, { headers: { "fly-partial": "1" } })
          .then((r) => r.text())
          .then((html) => { if (!spaSwap(html)) location.reload(); })
          .catch(() => location.reload());
      })
      .catch(() => location.reload());
  });
}
