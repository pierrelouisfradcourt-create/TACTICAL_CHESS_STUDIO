// gate-decision.mjs — IMP-261 : logique du gate câblé. Le board DÉCLENCHE une décision HumanGate ;
// il n'écrit JAMAIS le ledger lui-même. MERGE => kaizen_loop close (seul écrivain sanctionné) ;
// REJECT/FREEZE => append HUMANGATE_DECISION_LOG.yaml seul (statut ledger inchangé — choix Pierre).
// Effets injectés (closeFn, horloge) → testable sur fichiers TEMP, aucun accès au vrai ledger.
import { existsSync, readFileSync, writeFileSync, openSync, closeSync, unlinkSync } from "node:fs";
import { createHmac } from "node:crypto";

// Garde réseau applicative (défense DERRIÈRE le bind 127.0.0.1). Pair TCP réel, pas un en-tête spoofable.
const LOOPBACK = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1", "localhost"]);
export function isLoopbackAddr(addr) {
  return typeof addr === "string" && LOOPBACK.has(addr);
}

// HMAC : recompute sur les bytes du rapport, compare au dernier champ du sidecar .hmac (format openssl dgst).
export function verifyHmac(reportPath, hmacPath, key) {
  if (!key) return { ok: false, reason: "STUDIO_HMAC_KEY absente → non signé" };
  if (!existsSync(reportPath) || !existsSync(hmacPath)) return { ok: false, reason: "rapport ou sidecar .hmac absent" };
  const expected = createHmac("sha256", key).update(readFileSync(reportPath)).digest("hex");
  const actual = readFileSync(hmacPath, "utf-8").trim().split(/\s+/).pop(); // "HMAC-SHA256(file)= <hex>"
  return actual === expected ? { ok: true } : { ok: false, reason: "HMAC ne correspond pas — rapport altéré/clé différente" };
}

// id incrémental HGD-NNN à partir du texte du log existant.
export function nextDecisionId(logText) {
  let max = 0;
  for (const m of String(logText).matchAll(/decision_id:\s*HGD-(\d+)/g)) max = Math.max(max, Number(m[1]));
  return `HGD-${String(max + 1).padStart(3, "0")}`;
}

// Bloc YAML de décision au format existant (indent 2 sous `decisions:`). Append-only en fin de fichier.
export function composeDecisionBlock({ id, imp, decision, reason, verdictRef, evidence, tsIso }) {
  const verdict = decision === "MERGE" ? "APPROVED" : decision === "REJECT" ? "REJECTED" : "FROZEN";
  const category = decision === "MERGE" ? "improvement_close" : decision === "REJECT" ? "improvement_reject" : "improvement_freeze";
  const q = (s) => JSON.stringify(String(s == null ? "" : s));
  const ev = (evidence && evidence.length ? evidence : ["(aucune)"]).map((e) => `      - ${q(e)}`);
  if (verdictRef) ev.push(`      - ${q("council: " + verdictRef)}`);
  return "\n" + [
    `  - decision_id: ${id}`,
    `    title: ${q(`${imp} — ${decision} depuis board (gate câblé, IMP-261)`)}`,
    `    category: ${category}`,
    `    zone: llm-lego`,
    `    surface: board_ux`,
    `    source_state:`,
    `      decided: ${q(tsIso)}`,
    `    verdict: ${verdict}`,
    `    evidence_refs:`,
    ...ev,
    `    reason: ${q(reason)}`,
    `    approved_by: HumanGate`,
    `    approved_at: ${q(tsIso.slice(0, 10))}`,
    `    claim_verdict: NO_CLAIM_ALLOWED`,
  ].join("\n") + "\n";
}

export function appendDecision(logPath, block) {
  const prev = existsSync(logPath) ? readFileSync(logPath, "utf-8") : "";
  writeFileSync(logPath, prev + (prev.endsWith("\n") || !prev ? "" : "\n") + block, "utf-8");
}

// Verrou board-side (O_EXCL) : sérialise le read-modify-write du log + le close. Ce N'EST PAS le bail
// ledger IMP-252 (Python, OPEN) — c'est une garde board honnête, périmètre local, jamais surjouée.
export function withGateLock(lockPath, fn) {
  let fd;
  try { fd = openSync(lockPath, "wx"); }
  catch { return { ok: false, status: 409, error: "décision gate déjà en cours (verrou tenu)" }; }
  try { return fn(); }
  finally { try { closeSync(fd); } catch {} try { unlinkSync(lockPath); } catch {} }
}

// Orchestrateur. deps: { logPath, lockPath, key, closeFn(imp,{ratify,session}), nowIso() }.
// N'écrit JAMAIS le ledger : seul closeFn (= kaizen_loop) le fait, et uniquement pour MERGE.
export function runGateDecision(input, deps) {
  const { imp, decision, reason, verdictRef, oracleReport } = input || {};
  const { logPath, lockPath, key, closeFn, nowIso } = deps;
  if (!/^IMP-[A-Za-z0-9]+$/.test(imp || "")) return { ok: false, status: 400, error: "imp invalide" };
  if (!["MERGE", "REJECT", "FREEZE"].includes(decision)) return { ok: false, status: 400, error: "decision invalide" };
  if (!reason || !String(reason).trim()) return { ok: false, status: 400, error: "raison requise" };

  return withGateLock(lockPath, () => {
    const tsIso = nowIso();
    let evidence, closed = false;
    if (decision === "MERGE") {
      const session = `board-gate-${tsIso.slice(0, 10)}`;
      if (oracleReport && oracleReport.report) {
        const v = verifyHmac(oracleReport.report, oracleReport.hmac, key);
        if (!v.ok) return { ok: false, status: 403, error: `MERGE refusé — oracle non prouvé : ${v.reason}` };
        evidence = [`oracle SIGNÉ OK: ${oracleReport.report}`];
        const r = closeFn(imp, { ratify: false, session });
        if (!r.ok) return { ok: false, status: 200, error: `kaizen_loop close a refusé: ${r.stderr || r.error}` };
      } else {
        // Aucun oracle automatisé (IMP UI/gameplay) → ratification souveraine Pierre, evidence UNSIGNED.
        evidence = ["evidence_verdict: UNSIGNED — ratification souveraine (aucun oracle automatisé)"];
        const r = closeFn(imp, { ratify: true, session });
        if (!r.ok) return { ok: false, status: 200, error: `kaizen_loop close --ratify a refusé: ${r.stderr || r.error}` };
      }
      closed = true;
    } else {
      evidence = [`${decision} consigné — statut ledger INCHANGÉ (decision-log seul, choix Pierre)`];
    }
    const id = nextDecisionId(existsSync(logPath) ? readFileSync(logPath, "utf-8") : "");
    appendDecision(logPath, composeDecisionBlock({ id, imp, decision, reason, verdictRef, evidence, tsIso }));
    return { ok: true, status: 200, decisionId: id, closed, evidence };
  });
}

// Point d'entrée HTTP : garde loopback AVANT toute logique métier, puis parse, puis runGateDecision.
export function handleGateDecision({ remoteAddress, body }, deps) {
  if (!isLoopbackAddr(remoteAddress)) return { ok: false, status: 403, error: "gate-decision est loopback-only (origine non-locale rejetée)" };
  let input;
  try { input = typeof body === "string" ? JSON.parse(body || "{}") : (body || {}); }
  catch { return { ok: false, status: 400, error: "JSON invalide" }; }
  return runGateDecision(input, deps);
}
