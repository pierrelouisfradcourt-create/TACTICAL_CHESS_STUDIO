// gate-decision-validate.mjs — IMP-261. Tout sur fichiers TEMP + closeFn mock : le VRAI ledger/log jamais touché.
// (A) unit runGateDecision/handleGateDecision ; (B) garde loopback ; (C) serveur: XFF ne contourne pas le garde.
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync, openSync, closeSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHmac } from "node:crypto";

let pass = 0, fail = 0; const check = (n, ok) => { (ok ? pass++ : fail++); console.log(`  ${ok ? "✅" : "❌"} ${n}`); };
const { runGateDecision, handleGateDecision, isLoopbackAddr, nextDecisionId } = await import("./gate-decision.mjs");

const TMP = mkdtempSync(path.join(tmpdir(), "gate-"));
const logPath = path.join(TMP, "HUMANGATE_DECISION_LOG.yaml");
const lockPath = path.join(TMP, ".gate.lock");
writeFileSync(logPath, "decisions:\n  - decision_id: HGD-001\n    verdict: APPROVED\n", "utf-8");
const nowIso = () => "2026-07-09T10:00:00.000Z";
let closeCalls = [];
const closeFn = (imp, opts) => { closeCalls.push({ imp, ...opts }); return { ok: true, stdout: "closed" }; };
const deps = () => ({ logPath, lockPath, key: "testkey", closeFn, nowIso });

// (B) garde loopback
check("isLoopbackAddr rejette IP non-locale", isLoopbackAddr("8.8.8.8") === false);
check("isLoopbackAddr accepte 127.0.0.1 / ::1", isLoopbackAddr("127.0.0.1") && isLoopbackAddr("::1"));

// requête non-locale rejetée AVANT toute logique métier
closeCalls = []; const before = readFileSync(logPath, "utf-8");
const nonLocal = handleGateDecision({ remoteAddress: "8.8.8.8", body: JSON.stringify({ imp: "IMP-9", decision: "MERGE", reason: "x" }) }, deps());
check("requête non-locale → 403 avant logique métier", nonLocal.status === 403 && closeCalls.length === 0 && readFileSync(logPath, "utf-8") === before);

// (A) REJECT/FREEZE = decision-log seul, closeFn jamais appelé
closeCalls = [];
const rej = runGateDecision({ imp: "IMP-9", decision: "REJECT", reason: "pas pertinent" }, deps());
check("REJECT → ok, closeFn NON appelé, bloc REJECTED", rej.ok && rej.closed === false && closeCalls.length === 0 && /verdict: REJECTED/.test(readFileSync(logPath, "utf-8")));
const frz = runGateDecision({ imp: "IMP-9", decision: "FREEZE", reason: "info manquante" }, deps());
check("FREEZE → FROZEN, statut ledger inchangé", frz.ok && closeCalls.length === 0 && /verdict: FROZEN/.test(readFileSync(logPath, "utf-8")));

// MERGE sans oracle → close --ratify souverain
closeCalls = [];
const mNo = runGateDecision({ imp: "IMP-9", decision: "MERGE", reason: "ratifié" }, deps());
check("MERGE sans oracle → closeFn(--ratify), closed", mNo.ok && mNo.closed && closeCalls.length === 1 && closeCalls[0].ratify === true);

// MERGE avec oracle HMAC INVALIDE → 403, pas de close
closeCalls = [];
const rep = path.join(TMP, "r.json"); writeFileSync(rep, '{"verdict":"PASS"}', "utf-8");
writeFileSync(rep + ".hmac", "HMAC-SHA256(r.json)= deadbeef\n", "utf-8");
const mBad = runGateDecision({ imp: "IMP-9", decision: "MERGE", reason: "x", oracleReport: { report: rep, hmac: rep + ".hmac" } }, deps());
check("MERGE oracle HMAC invalide → 403, closeFn NON appelé", mBad.status === 403 && closeCalls.length === 0);

// MERGE avec oracle HMAC VALIDE → close (sans ratify)
closeCalls = [];
const good = createHmac("sha256", "testkey").update(readFileSync(rep)).digest("hex");
writeFileSync(rep + ".hmac", `HMAC-SHA256(r.json)= ${good}\n`, "utf-8");
const mOk = runGateDecision({ imp: "IMP-9", decision: "MERGE", reason: "oracle vert", oracleReport: { report: rep, hmac: rep + ".hmac" } }, deps());
check("MERGE oracle HMAC OK → closeFn(ratify:false)", mOk.ok && closeCalls.length === 1 && closeCalls[0].ratify === false);

// verrou tenu → 409, aucune écriture
closeCalls = []; const held = openSync(lockPath, "wx"); const b2 = readFileSync(logPath, "utf-8");
const locked = runGateDecision({ imp: "IMP-9", decision: "REJECT", reason: "x" }, deps());
check("verrou tenu → 409, aucune écriture", locked.status === 409 && readFileSync(logPath, "utf-8") === b2);
closeSync(held);

check("nextDecisionId incrémente", nextDecisionId("decision_id: HGD-004\ndecision_id: HGD-007") === "HGD-008");
try { rmSync(TMP, { recursive: true, force: true }); } catch {}

// (C) serveur : X-Forwarded-For ne contourne pas le garde (pair réel = 127.0.0.1 → passe le garde, s'arrête sur 400 raison)
const BASE = process.env["BASE"] ?? "http://localhost:3000";
try {
  const r = await fetch(`${BASE}/api/gate-decision`, { method: "POST",
    headers: { "Content-Type": "application/json", "X-Forwarded-For": "8.8.8.8" },
    body: JSON.stringify({ imp: "IMP-NOPE", decision: "REJECT" }) }); // pas de reason → 400 (logique atteinte)
  check("XFF spoofé ne force PAS un 403 (garde = socket, pas en-tête) → 400 raison", r.status === 400);
} catch (e) { check(`serveur exception: ${String((e && e.message) || e)}`, false); }

console.log(`\n  gate-decision-validate: ${fail === 0 ? `✅ ${pass}/${pass} PASS` : `❌ ${fail} FAIL`}`);
process.exit(fail === 0 ? 0 : 1);
