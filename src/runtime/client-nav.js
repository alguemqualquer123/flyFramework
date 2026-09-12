// Navegação SPA: troca o conteúdo de #__fly sem Virtual DOM, com prefetch, view
// transitions e scroll restoration (back/forward preserva posição).
const cache = globalThis.__flyPrefetchCache || new Map();
const scrollMap = new Map();

export async function navigate(href: string): Promise<void> {
  scrollMap.set(window.location.pathname, window.scrollY);
  let html = cache.get(href);
  if (html == null) {
    const res = await fetch(href, { headers: { "fly-partial": "1" } });
    if (!res.ok) { location.href = href; return; }
    html = await res.text();
  }
  await apply(html);
  // Tenta restaurar a posição de scroll se já visitamos este path.
  if (scrollMap.has(href.split("?")[0])) {
    window.scrollTo(0, scrollMap.get(href.split("?")[0]));
  } else {
    window.scrollTo(0, 0);
  }
}

async function apply(html: string): Promise<void> {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const incoming = doc.getElementById("__fly");
  const current = document.getElementById("__fly");
  if (!incoming || !current) { location.href = window.location.pathname; return; }

  // View transitions (Chrome) - anima a troca; fallback para troca imediata.
  if (typeof document.startViewTransition === "function") {
    await document.startViewTransition(() => {
      current.replaceChildren(...Array.from(incoming.childNodes));
    }).finished;
  } else {
    current.replaceChildren(...Array.from(incoming.childNodes));
  }

  if (window.__flyMount) window.__flyMount(window.__FLY_DATA__);
}

// Back/forward: re-usa o cache (ou busca) para não recarregar a página inteira.
if (typeof window !== "undefined" && typeof document !== "undefined") {
  window.addEventListener("popstate", () => {
    const href = location.pathname + location.search;
    navigate(href).catch(() => { location.reload(); });
  });
}
