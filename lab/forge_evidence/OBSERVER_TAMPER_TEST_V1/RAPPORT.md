# P4 — SIGNED = signature vérifiée (Forge Observer, INV-2)

Date : 2026-08-07. Périmètre : `scripts/observer/**` uniquement (aucun fichier `scripts/forge/**` modifié).

## Problème mesuré (avant)

`proof=SIGNED` dans Observer signifiait uniquement « le champ `hmac` existe dans
l'enregistrement source » — 0 `import hmac` dans tout `scripts/observer/`. Un
enregistrement forgé avec un `hmac` bidon était étiqueté `SIGNED` au même titre
qu'un enregistrement authentique.

## Correction

1. **Réutilisation, pas duplication** — `scripts/observer/signature.py` (nouveau)
   importe `forge.verdict._verify_mapping` / `_read_key` / `DEFAULT_KEY_FILE`
   (les fonctions de vérification qui existent déjà côté Forge — `scripts/forge/verdict.py`,
   `audit.py`, `context_manifest.py`, `reasoning_observability.py`, `tool_observability.py`
   partagent tous la même convention d'enveloppe : dict plat + champ `hmac`, signé
   sur `json.dumps(corps_sans_hmac, sort_keys=True)`). Import paresseux et non fatal :
   si `forge.verdict` est indisponible, tout est classé `UNVERIFIABLE`, jamais `VERIFIED`.
   Aucune génération de clé côté Observer (chemin de vérification seulement).
2. **Taxonomie honnête, additive** (`scripts/observer/events.py`) : `PROOF_SIGNED`
   redéfini comme « HMAC présent ET vérifié » (plus seulement présent) ; deux
   nouveaux niveaux `PROOF_SIGNED_UNVERIFIABLE` (hmac présent, clé absente —
   Observer ne peut pas trancher) et `PROOF_SIGNED_INVALID` (hmac présent, clé
   lisible, signature qui NE correspond PAS). Vocabulaire de `proof` existant
   conservé, rien de parallèle inventé.
3. **Adaptateurs** (`scripts/observer/adapters/forge_run.py`,
   `scripts/observer/adapters/forge_evidence.py`) : chaque point d'émission
   `proof=SIGNED` (verdict agrégé + oracles imbriqués + métriques de detail,
   manifestes de contexte, reasoning_observability, tool_observability,
   dispatch_audit.jsonl) appelle désormais `observer.signature.verify_envelope`
   sur l'enveloppe RÉELLEMENT lue sur disque et classe l'événement en
   conséquence. Un statut `INVALID` produit systématiquement un `Event(kind="drift.detected",
   severity="high", drift_kind="signature_invalid")` — jamais une exception levée,
   le signal reste visible pour HumanGate sans casser la reconstruction.

## FILES_CHANGED

- `scripts/observer/signature.py` (nouveau, ~115 lignes) — point d'appel unique
- `scripts/observer/events.py:38-58` — vocabulaire `proof` étendu
- `scripts/observer/adapters/forge_run.py:42-95,393-476,500-544(detail metrics),587-720` —
  vérification + drift sur verdict.signed/oracle.result/test.result/solvability.result/
  dispatch.context_manifest/dispatch.reasoning/dispatch.tools
- `scripts/observer/adapters/forge_evidence.py:41-70,168-216` — vérification + drift
  sur dispatch.prepared/dispatch.executed (dispatch_audit.jsonl)
- `lab/forge_evidence/OBSERVER_TAMPER_TEST_V1/` (ce dossier, nouveau) — banc de preuve

Aucun fichier `scripts/forge/**` touché. Aucun test existant modifié.

## ORACLE / TESTS

1. `python scripts/observer/selftest.py --project pacman` puis `--project breakout_v2`
   → `status: OK` sur les 3 adaptateurs, `invariants` tous `PASS`
   (`kinds_valid`, `no_duplicate_event_id`, `denied_attempts_empty`, `source_path_nonempty`).
2. `python scripts/observer/cli.py --project pacman` et `--project breakout_v2`
   → non-régression, aucun crash (sorties ci-dessous).
3. Tamper-test dédié : `lab/forge_evidence/OBSERVER_TAMPER_TEST_V1/run_tamper_test.py`
   (ce dossier — banc en sandbox, fichiers réels jamais touchés).

## PROOF (sorties réelles)

### selftest (pacman, dernière exécution)

```
projet       : pacman
adaptateur forge_run     : OK — 87 evenements, 10 sources
adaptateur forge_evidence: OK — 98 evenements, 10 sources
adaptateur transcripts   : OK — 4439 evenements, 833 sources
```
invariants (les 3 adaptateurs) : `kinds_valid=PASS`, `no_duplicate_event_id=PASS`,
`denied_attempts_empty=PASS`, `source_path_nonempty=PASS`.

### selftest (breakout_v2, dernière exécution)

```
projet       : breakout_v2
adaptateur forge_run     : OK — 277 evenements, 49 sources
adaptateur forge_evidence: OK — 77 evenements, 10 sources
adaptateur transcripts   : OK — 4146 evenements, 814 sources
```
invariants (les 3 adaptateurs) : tous `PASS` (identique à pacman).

### cli.py --project pacman

```
evenements   : 4624
runs         : 9
drift        : 106
sources lues : 853
```
`counts.by_proof` = `{"MECHANICAL": 4481, "SIGNED": 75, "SELF_DECLARED": 68}`
— les 75 `SIGNED` sont désormais des vérifications HMAC réelles (verdict.json ×2,
oracle.result ×6, dispatch.prepared ×38, dispatch.executed ×19, dispatch.context_manifest
×2, dispatch.reasoning ×3, dispatch.tools ×3, test.result ×1, solvability.result ×1).
`signature_invalid` dans le drift : **0** (sur 106 drift au total, tous d'un autre type
préexistant — provenance run_id, tools non déclarés, etc.).

### cli.py --project breakout_v2

```
evenements   : 4500
runs         : 6
drift        : 70
sources lues : 873
```
`counts.by_proof` = `{"MECHANICAL": 4310, "SIGNED": 131, "SELF_DECLARED": 59}`
— 131 `SIGNED` vérifiés (verdict.json ×3, oracle.result ×12, dispatch.prepared ×23,
dispatch.executed ×21, dispatch.context_manifest ×30, dispatch.reasoning ×21,
dispatch.tools ×21). `signature_invalid` : **0**.

### Tamper-test (`resultats.json`, ce dossier)

```json
{
  "key_present": true,
  "bench": {
    "a_authentique": "VERIFIED",
    "b_hmac_invente": "INVALID",
    "c_payload_modifie_hmac_origine": "INVALID",
    "d_hmac_mauvaise_cle": "INVALID"
  },
  "tamper_detection": { "detected": 3, "total_tampered": 3, "target": ">=2/3", "pass": true },
  "authentic_classified_verified": true,
  "corpus_false_positive_check": { "false_positive_count": 0, "target": 0, "pass": true }
}
```

- (a) copie authentique d'un `verdict.json` réel (pacman) → `VERIFIED` (comme attendu,
  confirme que la vérification ne casse pas les enregistrements légitimes).
- (b) `hmac` inventé (`"0"*64`) → `INVALID` (détecté).
- (c) payload falsifié (`software_verdict`/`decision` réécrits vers un OK forcé),
  `hmac` d'origine conservé tel quel → `INVALID` (détecté — c'est le cas le plus
  dangereux : un attaquant qui copie un vieux hmac valide sur un nouveau contenu).
- (d) `hmac` recalculé avec une mauvaise clé → `INVALID` (détecté).
- **3/3 falsifications détectées** (cible ≥2/3 — dépassée).
- **0 faux positif** sur les 87 événements du corpus pacman complet reconstruit
  par `forge_run.collect()` (cible bloquante 0 — atteinte).

## RISKS

- La vérification ne couvre que les enveloppes qui suivent la convention
  `{...corps..., "hmac": ...}` (les 6 points d'émission Forge identifiés). Un futur
  format de signature différent devra ajouter son propre appel à
  `verify_envelope` — rien n'alerte automatiquement si un nouvel émetteur signé
  apparaît sans passer par cette fonction.
- Les reçus d'oracle individuels DANS `verdict.json` (`oracles.<id>`) n'ont pas
  leur propre HMAC séparé — leur intégrité est garantie transitivement par la
  vérification de l'enveloppe `verdict.json` entière (le champ `oracles` fait
  partie du corps signé de l'agrégat). C'est le comportement correct côté Forge
  (`build_aggregate_verdict` ne signe pas les reçus séparément dans le fichier
  final) — documenté dans `forge_run.py::_collect_one_verdict`, pas un défaut
  introduit ici.
- Si `scripts/forge/.forge_key` venait à disparaître du poste d'exécution
  d'Observer, TOUS les `SIGNED` retomberaient à `SIGNED_UNVERIFIABLE` (comportement
  voulu, testé implicitement par le garde `rule_available()`/`key_available()` —
  non exercé ici faute de pouvoir supprimer la clé réelle sans risque).

## NEXT

- Étendre la même vérification à `mutation_receipt.json` si ce format porte un
  jour un `hmac` (mesuré : aucun HMAC dans ce format actuellement — `proof`
  reste `MECHANICAL`, correct tel quel).
- `correlate.py::build_coverage` traite déjà `PROOF_SIGNED` comme preuve « dure » ;
  aucun changement nécessaire car les deux nouveaux niveaux (`SIGNED_UNVERIFIABLE`,
  `SIGNED_INVALID`) n'y sont pas comptés (vérifié par lecture du code, non modifié).

---
software_verdict: OK
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED
