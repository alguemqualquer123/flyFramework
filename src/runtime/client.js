// Fly client runtime (browser, plain JS ESM).
// Servido como /__fly/client.js e importado pelo código gerado de cada componente.

let currentEffect = null;
const effectStack = [];

// Registro de signals por nome (usado pelo HMR para snapshot/restore).
const _signalRegistry = new Map();

export function __flyRegisterState(name, sig) {
  if (name && sig && typeof sig.get === "function")
    _signalRegistry.set(name, sig);
}

if (typeof window !== "undefined") {
  window.__flySnapshotState = () => {
    const out = {};
    for (const [k, s] of _signalRegistry) {
      try {
        const v = s.peek ? s.peek() : s.get();
        if (typeof v !== "function") out[k] = v;
      } catch {}
    }
    return out;
  };
  window.__flyRestoreState = (data) => {
    if (!data) return;
    for (const [k, v] of Object.entries(data)) {
      const s = _signalRegistry.get(k);
      if (s && typeof s.set === "function") {
        try {
          s.set(v);
        } catch {}
      }
    }
  };
}

export function signal(initial) {
  let value = initial;
  const subs = new Set();
  const get = () => {
    if (currentEffect) subs.add(currentEffect);
    return value;
  };
  const set = (v) => {
    const next = typeof v === "function" ? v(value) : v;
    if (next === value) return;
    value = next;
    for (const e of [...subs]) e.run();
  };
  return { get, set, peek: () => value };
}

export function effect(fn) {
  const e = {
    run() {
      effectStack.push(e);
      currentEffect = e;
      try {
        fn();
      } finally {
        effectStack.pop();
        currentEffect = effectStack[effectStack.length - 1] || null;
      }
    },
  };
  e.run();
  return e;
}

function toNode(child) {
  if (child == null || child === false) return null;
  if (Array.isArray(child)) return child.map(toNode).filter(Boolean);
  if (child instanceof Node) return child;
  return document.createTextNode(String(child));
}

function appendChildren(el, children) {
  for (const c of children) {
    const n = toNode(c);
    if (Array.isArray(n)) n.forEach((x) => x && el.appendChild(x));
    else if (n) el.appendChild(n);
  }
}

export function h(tag, props, ...children) {
  const el = document.createElement(tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (v === true) el.setAttribute(k, "");
      else el.setAttribute(k, String(v));
    }
  }
  appendChildren(el, children);
  return el;
}

export function text(fn) {
  const node = document.createTextNode("");
  effect(() => {
    node.nodeValue = String(fn() ?? "");
  });
  return node;
}

export function hIf(test, build) {
  const anchor = document.createComment("if");
  let mounted = false;
  let nodes = null;
  effect(() => {
    const val = test();
    if (val && !mounted) {
      nodes = build();
      nodes.forEach((n) => anchor.parentNode.insertBefore(n, anchor));
      mounted = true;
    } else if (!val && mounted) {
      nodes.forEach((n) => n.remove());
      mounted = false;
      nodes = null;
    }
  });
  return anchor;
}

export function hFor(items, build) {
  const anchor = document.createComment("for");
  let block = null;
  effect(() => {
    const list = items() || [];
    if (block) block.forEach((n) => n.remove());
    block = [];
    for (const item of list) {
      const nodes = build(item);
      nodes.forEach((n) => {
        anchor.parentNode.insertBefore(n, anchor);
        block.push(n);
      });
    }
  });
  return anchor;
}

export function bindClass(el, name, test) {
  effect(() => {
    el.classList.toggle(name, !!test());
  });
}

export function bindStyle(el, prop, value) {
  effect(() => {
    el.style.setProperty(prop, String(value()));
  });
}

export function bindValue(el, sig) {
  effect(() => {
    if (document.activeElement !== el) el.value = sig.get();
  });
  el.addEventListener("input", () => sig.set(el.value));
}

// Anima a entrada/saída de um elemento (transition:fade|slide|zoom).
const CS =
  typeof document !== "undefined" ? document.createElement("style") : null;
if (CS) {
  CS.textContent =
    ".fly-fade-enter{animation:fly-fade .3s ease}@keyframes fly-fade{from{opacity:0}}." +
    "fly-slide-enter{animation:fly-slide .3s ease}@keyframes fly-slide{from{transform:translateY(8px);opacity:0}}." +
    "fly-zoom-enter{animation:fly-zoom .25s ease}@keyframes fly-zoom{from{transform:scale(.97);opacity:0}}";
  document.head.appendChild(CS);
}

export function bindTransition(el, type) {
  const cls = "fly-" + (type || "fade") + "-enter";
  el.classList.add(cls);
  el.addEventListener("animationend", () => el.classList.remove(cls), {
    once: true,
  });
}

export function mountRoot(target, build) {
  target.innerHTML = "";
  const node = build();
  target.appendChild(node);
  const cbs = _mountCbs.splice(0);
  for (const cb of cbs) {
    try {
      cb();
    } catch (_e) {}
  }
  return () => {
    for (const cb of _destroyCbs.splice(0)) {
      try {
        cb();
      } catch (_e) {}
    }
  };
}

// ---------- API estilo Svelte ----------
export function derived(fn) {
  const d = signal(undefined);
  effect(() => {
    d.set(fn());
  });
  return d;
}

export function writable(initial) {
  const s = signal(initial);
  s.subscribe = (cb) => {
    cb(s.peek());
    const e = effect(() => cb(s.get()));
    return () => e;
  };
  s.update = (fn) => s.set(fn(s.peek()));
  return s;
}

export function readable(initial, start) {
  const s = signal(initial);
  let started = false;
  s.subscribe = (cb) => {
    if (start && !started) {
      started = true;
      start(s.set);
    }
    cb(s.peek());
    const e = effect(() => cb(s.get()));
    return () => e;
  };
  return s;
}

export function get(store) {
  if (store && typeof store.get === "function") return store.get();
  if (store && typeof store.peek === "function") return store.peek();
  return store;
}

export function tick() {
  return new Promise((r) => setTimeout(r, 0));
}

const _mountCbs = [];
const _destroyCbs = [];

export function onMount(fn) {
  _mountCbs.push(fn);
}
export function onDestroy(fn) {
  _destroyCbs.push(fn);
}
export function props() {
  return globalThis.__flyProps || {};
}

// ---------- Partial hydration (islands) ----------
const _islands = new Map();
let _islandDispatchStarted = false;

export function mountIsland(id, type, build) {
  const anchor = document.createComment("island:" + id);
  _islands.set(id, { type, build, anchor, mounted: false });
  return anchor;
}

function mountIslandNow(reg) {
  if (reg.mounted) return;
  reg.mounted = true;
  const node = reg.build();
  if (Array.isArray(node))
    node.forEach((n) => n && reg.anchor.parentNode.insertBefore(n, reg.anchor));
  else if (node && node.nodeType)
    reg.anchor.parentNode.insertBefore(node, reg.anchor);
  const tpl = document.querySelector(
    `template[data-fly-isl="${reg.anchor.data.split(":")[1]}"]`,
  );
  if (tpl && tpl.parentNode) tpl.remove();
}

export function dispatchIslands() {
  if (_islandDispatchStarted) return;
  _islandDispatchStarted = true;
  for (const reg of [..._islands.values()]) {
    if (reg.type === "load") {
      mountIslandNow(reg);
    } else if (reg.type === "visible") {
      if (typeof IntersectionObserver === "undefined") {
        mountIslandNow(reg);
        continue;
      }
      const ob = new IntersectionObserver(
        (entries) => {
          for (const en of entries) {
            if (en.isIntersecting) {
              mountIslandNow(reg);
              ob.disconnect();
            }
          }
        },
        { rootMargin: "200px" },
      );
      ob.observe(reg.anchor);
    } else if (reg.type === "idle") {
      if (typeof requestIdleCallback !== "undefined")
        requestIdleCallback(() => mountIslandNow(reg));
      else window.addEventListener("load", () => mountIslandNow(reg));
    }
  }
}

// ---------- Suspense ----------
export function mountSuspense(build) {
  // Retorna um array [anchor, ...conteúdo] que é achatado pelo mountRoot no lugar certo.
  const anchor = document.createComment("suspense");
  const nodes = build();
  return [anchor, ...nodes];
}

// ---------- Await / streaming por componente ----------
// promiseFn: () => Promise | valor; render: (data) => Node[]; fallback: html string.
export function mountAwait(promiseFn, render, fallback) {
  const anchor = document.createComment("await");
  const frag = document.createDocumentFragment();
  frag.appendChild(anchor);
  let settled = false;
  const showFallback = () => {
    if (settled) return;
    const tmp = document.createElement("template");
    tmp.innerHTML = String(fallback ?? "");
    const n = tmp.content.cloneNode(true);
    anchor.parentNode?.insertBefore(n, anchor.nextSibling);
    return n;
  };
  let fallbackNodes = [];
  const markFallback = () => {
    let n = anchor.nextSibling;
    while (n && !(n.nodeType === 8 && n.nodeValue === "/await")) {
      const next = n.nextSibling;
      fallbackNodes.push(n);
      n = next;
      if (!n) break;
    }
  };
  try {
    const p = promiseFn();
    if (p && typeof p.then === "function") {
      queueMicrotask(() => {
        if (!settled && anchor.parentNode) showFallback();
      });
      p.then(
        (data) => {
          settled = true;
          for (const n of fallbackNodes) n.remove();
          fallbackNodes = [];
          const nodes = render(data);
          const list = Array.isArray(nodes) ? nodes : [nodes];
          if (anchor.parentNode) {
            for (const x of list) {
              if (!x) continue;
              if (Array.isArray(x))
                x.forEach(
                  (y) =>
                    y && anchor.parentNode.insertBefore(y, anchor.nextSibling),
                );
              else if (x.nodeType)
                anchor.parentNode.insertBefore(x, anchor.nextSibling);
            }
          }
        },
        () => {
          settled = true;
        },
      );
    } else {
      const nodes = render(p);
      const list = Array.isArray(nodes) ? nodes : [nodes];
      const end = document.createComment("/await");
      frag.appendChild(end);
      for (const x of list) {
        if (!x) continue;
        if (Array.isArray(x)) x.forEach((y) => y && frag.insertBefore(y, end));
        else if (x.nodeType) frag.insertBefore(x, end);
      }
      return frag;
    }
  } catch {
    // erro síncrono: só fallback
  }
  const end = document.createComment("/await");
  frag.appendChild(end);
  queueMicrotask(markFallback);
  return frag;
}

// ---------- Drag & drop (helpers nativos) ----------
// moveItem: novo array com o item na posição from movido para to (imutável).
export function moveItem(list, from, to) {
  if (!Array.isArray(list)) return list;
  if (from === to) return list.slice();
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

// draggable: marca o elemento como arrastável e registra os dados de arraste.
export function draggable(el, data) {
  el.draggable = true;
  el.addEventListener("dragstart", (e) => {
    el.dataset.flyDnd = "1";
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
    }
    e.detail = e.detail || {};
    e.target.__flyDragData = data;
  });
  return el;
}

// dropTarget: converte o elemento em alvo de drop; chama onDrop(dados, el, event).
export function dropTarget(el, onDrop) {
  const allow = (e) => {
    if (e.preventDefault) e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
  };
  el.addEventListener("dragover", allow);
  el.addEventListener("drop", (e) => {
    allow(e);
    const src = e.target;
    let data = src && src.__flyDragData;
    if (data === undefined && e.dataTransfer) {
      try {
        const raw = e.dataTransfer.getData("application/json");
        if (raw) data = JSON.parse(raw);
      } catch {}
    }
    if (typeof onDrop === "function") onDrop(data, el, e);
  });
  return el;
}

// bindDragReorder: monta uma lista reordenável por arraste. Espera itens com
// [data-dnd-item]; chama opt.onReorder(arrayNovo, {from, to}) quando o usuário solta.
export function bindDragReorder(container, opt) {
  const cb = opt.onReorder || (() => {});
  container.addEventListener("dragstart", (e) => {
    const item = e.target.closest("[data-dnd-item]");
    if (!item) return;
    const items = [...container.querySelectorAll("[data-dnd-item]")];
    const from = items.indexOf(item);
    draggable(item, { from, item });
    item.classList.add("fly-dragging");
  });
  container.addEventListener("dragend", (e) => {
    const item = e.target.closest("[data-dnd-item]");
    if (item) item.classList.remove("fly-dragging");
  });
  container.addEventListener("dragover", (e) => {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
  });
  container.addEventListener("drop", (e) => {
    e.preventDefault();
    const items = [...container.querySelectorAll("[data-dnd-item]")];
    const src = e.target.closest("[data-dnd-item]");
    if (!src) return;
    const from = items.findIndex((it) => it === e.target.__flyDragData?.item);
    const to = items.indexOf(src);
    if (from === -1) return;
    const list = opt.getList
      ? opt.getList()
      : items.map((it) => it.__flyDragData?.item);
    cb(moveItem(list, from, to), { from, to });
  });
  return container;
}
