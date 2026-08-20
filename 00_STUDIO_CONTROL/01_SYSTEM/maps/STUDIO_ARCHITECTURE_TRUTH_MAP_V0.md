# Studio Architecture Truth Map — Cible V2 (modèle organisme) · HAVE / WANT / GAP

Status: DOCUMENTED_ONLY
Created at: 2026-07-07 · Mis à jour V2 : 2026-07-08
Source: cartes d'architecture repo + discussion ChatGPT « Réévaluation progressive des plans » (V1 07-07,
étendue V2 07-08 : modèle organisme, Cognitive Resource Manager, World Intelligence Layer, arbitrage council)
Runtime authority: NONE
Agent activation: BLOCKED
Claim posture: NO_CLAIM_ALLOWED
HumanGate: REQUIRED

---

## 0. Objet et non-autorisation

Ce document **remet la vérité au centre** : ce qu'on A (câblé, prouvé), ce qu'on VEUT (organisation cible),
et l'écart. Il recoupe les cartes d'architecture du studio avec la discussion GPT qui, indépendamment, a
re-dérivé la même structure, puis l'a étendue en **modèle organisme** (V2).

**Documentation canonique only.** N'active aucun runtime, agent, dataset, training, benchmark, promotion.
Toute action dérivée exige une tâche HumanGate séparée. Aucun verdict global ready/not-ready.

Preuve de câblage = **oracles réellement exécutés** (kaizen_loop metrics, council_factory_oracle,
council-audit-validate, run-validators), pas de la lecture de doc.

---

## 1. Canonisation — une seule carte active

L'audit interne (`99_ARCHIVE/records/DOCS_ROADMAP_ARCHITECTURE_CONSOLIDATION_AUDIT_V0.md`) réclamait :
« decide ONE active control-plane map; keep legacy package passive ». Tranché ici.

| Lignée | Rôle | Statut |
| --- | --- | --- |
| `01_SYSTEM/maps/STUDIO_AGENTIC_PYRAMID_ARCHITECTURE_V0.md` | Org-chart cible + matrice d'autorité | **ACTIVE — carte de référence** |
| `01_SYSTEM/maps/STUDIO_ARCHITECTURE_TRUTH_MAP_V0.md` (ce fichier) | Vérité câblage + cible V2 organisme | **ACTIVE — annexe vérité** |
| `docs/control-plane/*` (~55 docs) | gouvernance/plomberie | **LEGACY_PASSIVE** — références, plus source de topologie |
| `studio_brain/` (vault) | doctrine vivante + handoff | **VIVANT** — non concurrent |

Toute nouvelle idée d'architecture se classe ici, pas dans une n-ième carte. Copies parasites
(`worktrees/`, `repos/games/studioV2_MIGRATED_HOLD/`) = hors-canon.

---

## 2. Convergence avec la discussion GPT (V1 → V2)

**V1 (07-07)** : GPT re-dérive la pyramide (HumanGate → Governance → CEO → Directeurs/Lanes → Workers →
Memory/Cost partagés → feedback) + ajoute l'**axe vertical d'évolution** (agent→lane→studio→méta + Genome).

**V2 (07-08)** : GPT passe du « modules empilés » à un **organisme numérique** — flux, boucles, régulation.
Ajouts majeurs :
- **Cognitive Resource Manager** = « système circulatoire » (alloue le budget cognitif par tâche×modèle).
- **World Intelligence Layer** (ajout Pierre) : apprendre du monde extérieur (open-source, jeux, papers,
  postmortems) → ingestion → mémoire/pattern library → council.
- **Remontée dynamique / replan** (ajout Pierre) : chaque lane devient un **capteur** émettant
  `strategic_feedback` qui remonte pour réadapter le plan en cours de route.
- **Organizational Learning Loop** : patterns de production → modif workflow → nouveau standard.
- **ECC = Claude Code** = couche Execution + Context (workflow dynamique au niveau tâche, déjà là).
- **Anti-skynet** : GPT converge sur **la doctrine du repo** — boucles multiples MAIS frontières,
  évaluations, retours du monde réel ; exploration→comparaison→proposition→**validation**→intégration ;
  PAS d'auto-modification aveugle.
- **Le problème ouvert de GPT** : empêcher les boucles de se battre (coût↓Claude vs qualité↑Claude vs
  vitesse↑parallèle vs archi↑refactor) → **gouvernance multi-objectifs = un « council » avec arbitrage.**

**Convergence qui compte : l'arbitrage GPT = un council. On a livré `council-audit` (`ebebb59`, 07-08).**
C'est la première brique de l'« Architecture Council comme instance vivante ».

---

## 3. HAVE — ce qui est réellement câblé (vérité 07-08)

Légende : ✅ câblé & prouvé · 🟡 câblé mais dry-run/embryon · 🔴 orphelin/absent.

| Sous-système | Verdict | Preuve |
| --- | --- | --- |
| Ledger Kaizen (264 IMP ; project/theme/blocked_by) | ✅ | `kaizen_loop metrics` exit 0 ; single-writer gardé (IMP-194/205) |
| Council → Factory (`3c5f9de`) | ✅ | `council_factory_oracle` 7/7, 127 tests |
| **Council-audit (`ebebb59`, 07-08)** | ✅ | bouton board → 3 voix Qwen live + synthèse déterministe gated ; `council-audit-validate` 14/14 |
| Cockpit (autopilot :7331 + cockpit_server :8770) | ✅ | 55+ endpoints `/api/*` réels |
| Board interactif projet×lane (`4d4d1a9`) | ✅ | `GET /api/imp-board` read-only ; run-validators 794 checks |
| Mémoire (vault + `/api/memory` + recall nomic + graphe) | ✅ | vue Mémoire + recall sémantique livrés (marathon AI-OS) |
| Control-plane scripts (`scripts/studioV2/control_plane/`, 45) | 🟡 | CLI dry-run/smoke, zéro effet de bord (posture assumée) |
| Agent Genome (profile/scorecard/freeze/strike + `agent_pr_operator`) | 🔴 | schemas+data+code MAIS 0 test ; validateur échoue (`PROJECT_ROOT`) |
| MCP `studio-brain` serveur / `studio-facts` | 🔴 | vault .md + config manuelle ; `studio-facts` inexistant |

**Noyau réel** = ledger + council (×3) + cockpit + board + mémoire. La couche gouvernance (7 directeurs)
reste **posture, pas agents actifs** (modèle solo-dev voulu). Piège « surface affichée > câblée » =
le **Genome**, qui *a l'air* d'un système mais n'est branché nulle part.

---

## 4. WANT — la cible V2 : 6 systèmes d'un organisme + flux bidirectionnels

GPT V2 : 5+1 systèmes qui tournent ensemble, reliés par des **flux** (pas juste Agent A→B).

| Système (V2) | Incarnation repo cible | État |
| --- | --- | --- |
| **Execution + Context (ECC)** | Claude Code + Qwen (LM Studio) + council + `/api/execute` | ✅ câblé |
| **Memory** | vault studio_brain + `/api/memory` + recall nomic + graphe | ✅ câblé |
| **Governance / Council arbitrage** | HumanGate + verdicts + `council-audit` + council→factory | ✅ **notre force** |
| **Resource (Cognitive Resource Manager)** | lane-routing + budget workflow (primitives) → allocateur cognitif | 🟡 embryon |
| **Evolution (axe Y / genome)** | `agent_scorecard`/`freeze`/`strike` → boucle perf→proposition→gate | 🔴 non câblé |
| **World Intelligence Layer** | WebSearch/WebFetch + council externes → recherche→ingestion→patterns | 🔴 nouvelle brique |

**Flux invisibles à afficher** (living graph) : Information · Tokens · Décisions · Confiance · Erreurs.
**Bidirectionnel** : les lanes/IMP ne remontent pas que « fini » mais un `strategic_feedback`
(observation, risk, recommendation, impact) → Planner/Council **réadaptent le plan** (replan dynamique).

Pyramide sous-jacente (inchangée, cf. carte de référence) : Human Founder → Governance Kernel →
CEO/Producer → Project Breakdown → Conseil Directeurs → Spécialistes → Workers → Artifacts → HumanGate.
Pont code↔pyramide = **IMP-047** (multi-agent CEO/Director/Router/Worker, PLANNED/OPEN).

---

## 5. GAP — à quelle distance, par système

| Système | Distance | Nature |
| --- | --- | --- |
| Execution / Memory / **Governance-Council** | **PROCHE** | Colonne vertébrale câblée ; le council d'arbitrage a sa première brique (`council-audit`). |
| Resource (CRM) | **EMBRYON** | Routing par lane existe ; pas d'allocateur cognitif budget×modèle×tâche. À bâtir en **observabilité d'abord**. |
| **Evolution (axe Y)** | **LOIN** — le vrai trou | Genome orphelin ; rien ne boucle perf→proposition→gate. |
| **World Intelligence Layer** | **ABSENT** | Nouvelle brique V2 ; outils web + council existent mais rien ne les câble en boucle de veille. |
| Flux bidirectionnels / living graph | **EN COURS** | Board + cockpit existent ; n'affichent pas encore les flux invisibles ni la remontée capteur. |

**Diagnostic :** on n'est pas loin de l'usine ; on est loin de la *machine qui fait évoluer l'usine* et de
sa *connexion au monde extérieur*. La densité doc de gouvernance masque la petitesse du noyau câblé.

---

## 6. Précision terminologique — Rocky ≠ mémoire

GPT V2 nomme l'organe mémoire « **Rocky Memory** ». **C'est un faux ami dans ce repo.**
- **Rocky** = le **moteur d'échecs Rust** (`src/chess/`), **GELÉ** depuis le pivot 07-06 (aucune session
  d'optimisation moteur sans HumanGate). Ce n'est PAS l'organe mémoire du studio.
- **L'organe mémoire** = **vault `studio_brain/` + `/api/memory` + recall nomic-embed + graphe mémoire**
  (livrés au marathon AI-OS). C'est lui qui joue le rôle « Memory System » de la cible V2.

→ Une session future ne doit **jamais rebrancher Rocky** en croyant implémenter la mémoire. Le mapping
correct : *GPT « Rocky Memory » = vault + `/api/memory` du repo*.

---

## 7. Doctrine — évolution gated, jamais auto-mutante (GPT V2 y converge)

GPT V1 décrivait des agents qui **se mutent seuls** + une org qui crée des départements automatiquement.
GPT V2 **corrige de lui-même** : anti-skynet = boucles multiples **avec frontières, évaluations, retours du
monde réel** ; exploration→comparaison→proposition→**validation**→intégration ; pas d'auto-modification aveugle.

**Invariant du repo (non négociable)** : toute évolution / allocation cognitive / changement de règle =
**proposition gated par oracle non-LLM + HMAC + HumanGate** (`/verdict` + `/gate`). Jamais d'auto-mutation.
Le « Accept/Reject par benchmark » de GPT s'incarne en oracle+gate. `council-audit` respecte déjà ce contrat
(lecture seule, HumanGate conceptuel, aucune écriture ledger/gate-log). La connexion au monde (World Layer)
empêche l'optimisation en boîte fermée — c'est l'autre moitié de l'anti-skynet.

---

## 8. Principe de gate — quand HumanGate est requis

Décision ratifiée avec Pierre (2026-07-08) : **plus de gate systématique à chaque transition de phase.**
HumanGate uniquement quand une sortie devient une **action irréversible** ou un **arbitrage subjectif**.
**Jamais** sur la construction, les tests, ou l'affichage read-only.

| Phase | Gate ? | Raison |
| --- | --- | --- |
| **0** — carte cible | **non** | c'est de la doc |
| **1** — council vivant / arbitrage multi-objectifs | **conditionnel** | construire/tester l'arbitrage = non ; le moment où le verdict déclencherait une **action réelle** = oui |
| **2** — lanes = capteurs | **non** | affichage read-only |
| **3** — Cognitive Resource Manager v0 | **non** | observabilité, pas d'allocation |
| **4** — Organizational Learning Loop | **oui** | adopter un nouveau standard qui change le comportement futur = un choix, pas un fait vérifiable |
| **5** — World Intelligence Layer | **non** | lecture seule / citation ; gate seulement si un pattern externe **motive une décision de design** derrière |
| **6** — Evolution System | **oui, non-négociable** | accepter/rejeter une mutation d'agent reste la signature de Pierre, jamais automatique |

**Règle générale** : `gate = action réelle ∨ arbitrage subjectif` ; `pas de gate = construction ∨ tests ∨
affichage read-only`. Cohérent avec `council-audit` (livré 07-08) : construire + afficher le verdict = **sans
gate** ; le gate n'apparaîtrait que si ce verdict déclenchait une écriture ou une action.

---

## 9. Backlog des phases vers la cible (NON PLANIFIÉ — pas la prochaine action)

> Séquençage de référence uniquement. Aucune de ces phases n'est engagée. Chacune = brique gated + oracle,
> **observabilité avant autonomie**, chantier « usine/studio » **parallèle** à Belote/TCG (ne les bloque pas).

- **Phase 0 (FAITE)** — Canoniser la cible V2 = ce document.
- **Phase 1** — Council vivant : étendre `council-audit` vers un arbitrage multi-objectifs (coût/qualité/
  vitesse/archi) → recommandation → HumanGate. Le linchpin de GPT, sur notre point fort.
- **Phase 2** — Lanes = capteurs : `strategic_feedback` structuré remonté au board (read-only d'abord).
- **Phase 3** — Cognitive Resource Manager v0 : **observabilité** coût/tokens par tâche×modèle (allocation
  reste gated). Pas d'allocateur autonome.
- **Phase 4** — Organizational Learning Loop v0 : patterns d'échec → `PreventiveRuleProposal` → HumanGate.
- **Phase 5** — World Intelligence Layer v0 : recherche web ciblée → knowledge packet **cité** pour le council.
- **Phase 6** — Evolution System (dernier, le plus dur) : `agent_scorecard` lecture-seule sur le ledger, puis
  propositions de version d'agent (mutation → oracle/HMAC/HumanGate). Jamais d'auto-mutation.
- **Transverse** — living graph des flux invisibles (Information/Tokens/Décisions/Confiance/Erreurs).

---

## 10. Verdicts

```yaml
software_verdict: DOCUMENTED_ONLY   # carte cible ; aucun runtime touché
evidence_verdict: MECHANICAL_VALIDATION_ONLY   # oracles exécutés (kaizen/council/council-audit/run-validators)
claim_verdict: NO_CLAIM_ALLOWED
no_global_ready_verdict: true
```

## 11. Non-autorisation

N'autorise pas : activation runtime/agent, training, dataset, benchmark-as-proof, promotion modèle, câblage
du Genome, création de lanes, Cognitive Resource Manager actif, World Layer actif, commit auto, push, PR.
Chaque phase du §8 exige une tâche HumanGate explicite séparée.
