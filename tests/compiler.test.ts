import { test } from "node:test";
import assert from "node:assert/strict";
import { compile } from "../src/compiler/index.ts";
import { parseTemplate } from "../src/compiler/parser.ts";
import { analyzeScript } from "../src/compiler/analyzer.ts";

test("SSR renderiza interpolação e estado", () => {
  const c = compile(`<script>let nome = $state("Fly")</script><h1>Olá {nome}</h1>`);
  const out = c.render({ params: {}, request: new Request("http://x/"), url: new URL("http://x/"), cache: {} });
  return out.then((o) => assert.match(o.html, /<h1>Olá Fly<\/h1>/));
});

test("SSR condicional (if)", () => {
  const c = compile(`<script>let ok = $state(true)</script><p if={ok}>sim</p><p if={!ok}>não</p>`);
  return c.render({ params: {}, request: new Request("http://x/"), url: new URL("http://x/"), cache: {} }).then((o) => {
    assert.match(o.html, /<p>sim<\/p>/);
    assert.doesNotMatch(o.html, /<p>não<\/p>/);
  });
});

test("SSR loop (for)", () => {
  const c = compile(`<ul><li for={n of [1,2,3]}>#{n}</li></ul>`);
  return c.render({ params: {}, request: new Request("http://x/"), url: new URL("http://x/"), cache: {} }).then((o) => {
    assert.match(o.html, /<li>#1<\/li><li>#2<\/li><li>#3<\/li>/);
  });
});

test("client gera signals reativos (get/set)", () => {
  const c = compile(`<script>let count = $state(0)</script><button on:click={count++}>{count}</button>`);
  assert.match(c.clientCode, /signal\(0\)/);
  assert.match(c.clientCode, /count\.set\(count\.get\(\)\+1\)/);
  assert.match(c.clientCode, /count\.get\(\)/);
});

test("loader roda no server e alimenta template", () => {
  const c = compile(`<script>
    export async function loader() { return { v: 42 } }
  </script><p>{data.v}</p>`);
  return c.render({ params: {}, request: new Request("http://x/"), url: new URL("http://x/"), cache: {} }).then((o) => {
    assert.match(o.html, /<p>42<\/p>/);
  });
});

test("meta gera SEO", () => {
  const c = compile(`<script>
    export function meta() { return { title: "X", description: "Y" } }
  </script><div>ok</div>`);
  return c.render({ params: {}, request: new Request("http://x/"), url: new URL("http://x/"), cache: {} }).then((o) => {
    assert.ok(o.meta);
    assert.equal(o.meta!({ data: {}, params: {} }).title, "X");
  });
});

test("escapa HTML em interpolações", () => {
  const c = compile(`<script>let x = $state("<b>")</script><p>{x}</p>`);
  return c.render({ params: {}, request: new Request("http://x/"), url: new URL("http://x/"), cache: {} }).then((o) => {
    assert.match(o.html, /&lt;b&gt;/);
  });
});

test("parser: atributo com > dentro de expressão", () => {
  const ast = parseTemplate(`<p class:active={count > 3}>x</p>`);
  assert.equal(ast.length, 1);
  assert.equal(ast[0].type, "element");
});

test("analyzer detecta estado reativo", () => {
  const a = analyzeScript(`let a = $state(1); let b = 2;`);
  assert.deepEqual(a.stateVars, ["a"]);
  // $state vira signal no codegen, não no analyzer
  const c = compile(`<script>let a = $state(1)</script><p>{a}</p>`);
  assert.match(c.clientCode, /signal\(1\)/);
});

test("analyzer detecta $derived e stores", () => {
  const a = analyzeScript(`let d = $derived(() => 1); let w = writable(0); let r = readable(0);`);
  assert.deepEqual(a.derivedVars, ["d"]);
  assert.deepEqual(a.storeVars, ["w", "r"]);
});

test("client gera $derived e writable reativos", () => {
  const c = compile(`<script>
    let count = $state(0)
    let double = $derived(() => count * 2)
    let store = writable(5)
  </script><p>{double} {store}</p>`);
  assert.match(c.clientCode, /derived\(/);
  assert.match(c.clientCode, /writable\(5\)/);
  assert.match(c.clientCode, /double\.get\(\)/);
  assert.match(c.clientCode, /store\.get\(\)/);
});

test("SSR: $derived e $state viram valores planos", () => {
  const c = compile(`<script>
    let count = $state(2)
    let double = $derived(() => count * 2)
  </script><p>{double}</p>`);
  return c.render({ params: {}, request: new Request("http://x/"), url: new URL("http://x/"), cache: {} }).then((o) => {
    assert.match(o.html, /<p>4<\/p>/);
  });
});

test("SSR: onMount/writable são no-ops no server", () => {
  const c = compile(`<script>
    let s = writable(7)
    onMount(() => {})
  </script><p>{s}</p>`);
  return c.render({ params: {}, request: new Request("http://x/"), url: new URL("http://x/"), cache: {} }).then((o) => {
    assert.match(o.html, /<p>7<\/p>/);
  });
});

