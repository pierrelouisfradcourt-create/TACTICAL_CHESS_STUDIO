// fx.test.mjs — file de chiffres flottants + journal (purs). Fichier NEUF.
import test from "node:test";
import assert from "node:assert";
import { makeFxState, recordDiff, stepFx, FLOAT_TTL, JOURNAL_MAX } from "./fx.mjs";

const v = (beasts, captures = 0) => ({ beasts, captures });

test("#13 recordDiff dégât : une baisse de PV => 1 float et 1 entrée journal", () => {
  const fx = makeFxState();
  const events = recordDiff(fx, v([{ id: 1, x: 2, y: 3, hp: 10, active: true }]), v([{ id: 1, x: 2, y: 3, hp: 6, active: true }]), 0);
  assert.strictEqual(fx.floats.length, 1);
  assert.strictEqual(fx.floats[0].text, "-4");
  assert.strictEqual(fx.journal.length, 1);
  assert.strictEqual(events.filter((e) => e.kind === "damage").length, 1);
});

test("#14 recordDiff K.O. : active true->false => 1 entrée journal 'K.O.'", () => {
  const fx = makeFxState();
  recordDiff(fx, v([{ id: 1, x: 0, y: 0, hp: 5, active: true }]), v([{ id: 1, x: 0, y: 0, hp: 5, active: false }]), 0);
  assert.strictEqual(fx.journal.length, 1);
  assert.ok(/K\.O\./.test(fx.journal[0]));
});

test("#15 recordDiff capture : captures 0->1 => 1 entrée journal", () => {
  const fx = makeFxState();
  const events = recordDiff(fx, v([{ id: 1, x: 0, y: 0, hp: 5, active: true }], 0), v([{ id: 1, x: 0, y: 0, hp: 5, active: true }], 1), 0);
  assert.strictEqual(events.filter((e) => e.kind === "capture").length, 1);
  assert.ok(/[Cc]apture/.test(fx.journal[fx.journal.length - 1]));
});

test("#16 recordDiff no-op : aucun changement => 0 float, 0 journal", () => {
  const fx = makeFxState();
  const state = v([{ id: 1, x: 0, y: 0, hp: 5, active: true }], 0);
  const events = recordDiff(fx, state, state, 0);
  assert.strictEqual(fx.floats.length, 0);
  assert.strictEqual(fx.journal.length, 0);
  assert.strictEqual(events.length, 0);
});

test("#17 stepFx frontière TTL : âge == TTL conservé, âge > TTL retiré", () => {
  const fx = makeFxState();
  fx.floats.push({ id: 1, text: "-3", x: 0, y: 0, bornAt: 0 });
  assert.strictEqual(stepFx(fx, FLOAT_TTL).length, 1); // âge == TTL : conservé
  assert.strictEqual(stepFx(fx, FLOAT_TTL + 1).length, 0); // âge > TTL : retiré
});

test("#18 journal plafonné : pousser JOURNAL_MAX+1 => length === JOURNAL_MAX, le plus ancien tombe", () => {
  const fx = makeFxState();
  const n = JOURNAL_MAX + 1;
  const prev = v(Array.from({ length: n }, (_, i) => ({ id: i + 1, x: 0, y: 0, hp: 10, active: true })));
  const next = v(Array.from({ length: n }, (_, i) => ({ id: i + 1, x: 0, y: 0, hp: 9, active: true })));
  recordDiff(fx, prev, next, 0);
  assert.strictEqual(fx.journal.length, JOURNAL_MAX);
  // la 1re bête (id 1) est tombée hors du journal
  assert.ok(!fx.journal.some((l) => l.startsWith("bête 1 ")));
});
