import { test } from "node:test";
import assert from "node:assert/strict";
import { signal, derived, effect, writable, readable, get, tick, onMount, onDestroy } from "../src/runtime/client.js";

test("signal: get/set e notificação de efeito", () => {
  const count = signal(0);
  let seen = -1;
  effect(() => { seen = count.get(); });
  assert.equal(seen, 0);
  count.set(5);
  assert.equal(seen, 5);
});

test("signal: updater funcional e peek", () => {
  const s = signal(1);
  s.set((v) => v + 10);
  assert.equal(s.get(), 11);
  assert.equal(s.peek(), 11);
});

test("derived: recomputa quando dependência muda", () => {
  const a = signal(2);
  const b = signal(3);
  const sum = derived(() => a.get() + b.get());
  assert.equal(sum.get(), 5);
  a.set(10);
  assert.equal(sum.get(), 13);
});

test("writable: subscribe/get/update", () => {
  const w = writable("x");
  const log: string[] = [];
  w.subscribe((v) => log.push(v));
  assert.equal(log[0], "x");
  w.set("y");
  assert.equal(get(w), "y");
  w.update((v) => v + "!");
  assert.equal(log[log.length - 1], "y!");
});

test("readable: start é chamado no primeiro subscribe", () => {
  let started = false;
  const r = readable(0, () => { started = true; });
  assert.equal(started, false);
  r.subscribe(() => {});
  assert.equal(started, true);
  assert.equal(get(r), 0);
});

test("effect: para de reagir após remoção de dependência", () => {
  const a = signal(1);
  const toggle = signal(true);
  let n = 0;
  effect(() => { if (toggle.get()) n = a.get(); });
  assert.equal(n, 1);
  a.set(2);
  assert.equal(n, 2);
  toggle.set(false);
  a.set(9); // não deve reagir
  assert.equal(n, 2);
});

test("tick resolve na próxima microtask", async () => {
  await tick();
  assert.ok(true);
});
