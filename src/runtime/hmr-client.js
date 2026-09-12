// Client do HMR (browser): ouve /__fly/hmr via EventSource.
// Primeiro tenta hot-swap (troca só o HTML do #__fly + CSS, sem reload,
// preservando signals e scroll). Se falhar, recarrega preservando estado
// via sessionStorage.
(function () {
  if (typeof window === "undefined" || typeof EventSource === "undefined")
    return;
  if (window.__flyHmrOn) return;
  window.__flyHmrOn = true;

  function snapshot() {
    try {
      const signals = window.__flySnapshotState
        ? window.__flySnapshotState()
        : {};
      const forms = {};
      document.querySelectorAll("input, textarea, select").forEach((el) => {
        if (el.name || el.id) forms[el.name || el.id] = el.value;
      });
      sessionStorage.setItem(
        "__fly_hmr",
        JSON.stringify({
          signals,
          forms,
          scrollX: window.scrollX,
          scrollY: window.scrollY,
          url: location.href,
        }),
      );
    } catch {}
  }

  function restore() {
    try {
      const raw = sessionStorage.getItem("__fly_hmr");
      if (!raw) return;
      sessionStorage.removeItem("__fly_hmr");
      const data = JSON.parse(raw);
      if (data.url && new URL(data.url).pathname !== location.pathname) return;
      if (data.signals && window.__flyRestoreState) {
        setTimeout(() => {
          try {
            window.__flyRestoreState(data.signals);
          } catch {}
          try {
            for (const [k, v] of Object.entries(data.forms || {})) {
              const el = document.querySelector(`[name="${k}"]`);
              if (el) el.value = v;
            }
          } catch {}
          window.scrollTo(data.scrollX || 0, data.scrollY || 0);
        }, 50);
      } else {
        window.scrollTo(data.scrollX || 0, data.scrollY || 0);
      }
    } catch {}
  }

  restore();

  function bustCss() {
    try {
      document
        .querySelectorAll('link[href*="/__fly/styles.css"]')
        .forEach((link) => {
          const url = new URL(link.href);
          url.searchParams.set("__hmr", String(Date.now()));
          link.href = url.toString();
        });
    } catch {}
  }

  // Troca só o conteúdo: busca o HTML fresco e substitui o #__fly.
  // Devolve true se conseguiu (sem reload), false pra cair no reload.
  async function hotSwap() {
    const sx = window.scrollX;
    const sy = window.scrollY;
    const signals = window.__flySnapshotState
      ? window.__flySnapshotState()
      : null;
    const res = await fetch(location.href, {
      headers: { "x-fly-nostream": "1" },
    });
    if (!res.ok) return false;
    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    const fresh = doc.getElementById("__fly");
    const target = document.getElementById("__fly");
    if (!fresh || !target) return false;
    target.innerHTML = fresh.innerHTML;
    bustCss();
    if (signals && window.__flyRestoreState) {
      try {
        window.__flyRestoreState(signals);
      } catch {}
    }
    if (window.__flyMount && window.__FLY_DATA__) {
      try {
        const title = doc.querySelector("title");
        if (title) document.title = title.textContent;
      } catch {}
    }
    window.scrollTo(sx, sy);
    return true;
  }

  let fails = 0;
  function connect() {
    const es = new EventSource("/__fly/hmr");
    es.onmessage = async () => {
      try {
        if (await hotSwap()) return;
      } catch {}
      snapshot();
      location.reload();
    };
    es.onerror = () => {
      es.close();
      fails++;
      setTimeout(connect, Math.min(1000 * fails, 5000));
    };
  }
  if (location.protocol.startsWith("http")) connect();
})();
