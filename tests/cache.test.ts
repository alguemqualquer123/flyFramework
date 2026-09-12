import { test } from "node:test";
import assert from "node:assert/strict";
import { dataCache } from "../src/cache/data.ts";
import { routeCache } from "../src/cache/route.ts";
import { revalidateTag } from "../src/cache/revalidate.ts";

test("dataCache: TTL expira", async () => {
  let calls = 0;
  const get = () =>
    dataCache.fetch(
      "k1",
      () => {
        calls++;
        return calls;
      },
      { ttl: 1 },
    );
  assert.equal(await get(), 1);
  assert.equal(await get(), 1); // hit
  assert.equal(calls, 1);
  await new Promise((r) => setTimeout(r, 1100));
  assert.equal(await get(), 2); // expirou
});

test("dataCache: revalidateTag invalida", async () => {
  let calls = 0;
  const get = () =>
    dataCache.fetch(
      "k2",
      () => {
        calls++;
        return calls;
      },
      { tags: ["t"] },
    );
  assert.equal(await get(), 1);
  assert.equal(await get(), 1);
  revalidateTag("t");
  assert.equal(await get(), 2);
});

test("routeCache: armazena e serve", () => {
  routeCache.set("r1", { body: "<html>", status: 200, headers: {} }, 0);
  const e = routeCache.get("r1");
  assert.ok(e);
  assert.equal(e!.body, "<html>");
  routeCache.revalidate("r1");
  assert.equal(routeCache.get("r1"), undefined);
});

test("dataCache: get/has funcionam", async () => {
  dataCache.set("k3", { ok: true }, { ttl: 60 });
  assert.equal(dataCache.has("k3"), true);
  assert.deepEqual(dataCache.get("k3"), { ok: true });
});
