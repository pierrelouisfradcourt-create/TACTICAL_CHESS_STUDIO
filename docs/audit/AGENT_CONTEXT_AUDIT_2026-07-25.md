# Agent Context Audit

- **Date** : 2026-07-25 · **Source** : mission Pierre « Audit contexte agents avant run Forge » (lecture seule)
- **Méthode** : 3 explorations Sonnet parallèles (Bootstrap, Runtime/Traces, Mémoire/Bricolage), chaque claim
  porteur contre-vérifié par l'orchestrateur par observation directe. Sépare FAIT OBSERVÉ / INFÉRENCE / UNKNOWN.
- **Complète** : docs/audit/FORGE_AUDIT_BRANCHEMENTS_2026-07-24.md (post-patch R1-R4).

## Cartographie actuelle

Deux régimes de bootstrap coexistent :

**Chemin DRIVER** (5/21 runs) — `claude -p` headless assemblé mécaniquement (run_real.py:504-521) :
```
Agent ← [1] payload.prompt (contract.py:_render_prompt : role, objectif, scopes, gardeFou,
             oracles, output_contract, LISTE mandatory_read, RESTITUTION_RULE, marqueur R2)
       ← [2] tâche concrète (default_task_by_step / CLI)
       ← [3] ARTEFACTS AMONT : CONTENU réel injecté (_UPSTREAM_BY_STEP, 15k chars max,
             omission SILENCIEUSE si absent — run_real.py:436)
       ← [4] PRÉ-MORTEM : contenu injecté (premortem ← error_journal, driver.py:308)
       ← [5] marqueur re-apposé (run_real.py:520 — DOUBLON avec [1] depuis R2)
Outils réels = _STEP_TOOLS (3 étapes seulement) ; MCP coupé (--strict-mcp-config) ;
_STEP_DISALLOWED bloque git/NotebookEdit/Write sur 4 globs.
```

**Chemin PROSE** (16/21 runs, dominant) — Fable écrit l'appel Task à la main en suivant skill.md :
pas de gabarit exécuté, pas d'artefacts amont ni pré-mortem systématiques, outils hérités du parent
(`.claude/settings.local.json` : **494 allow / 0 deny**, dont `git add/commit`), aucun équivalent de
`_STEP_DISALLOWED`. Bootstrap non reproductible, non tracé.

## Bootstrap Context

- **Injecté réellement** (CONNECTÉ) : role/objectif/scopes/gardeFou/success_criteria/tests_oracles/
  output_contract/final_report/RESTITUTION_RULE (contract.py:165-180), marqueur (182-183), artefacts
  amont + pré-mortem (chemin driver uniquement).
- **Consigne sans force** (PARTIEL) : `mandatory_read` = liste de chemins en texte, contenu jamais
  injecté ; `permissions` = texte narratif sans effet mécanique.
- **Validé mais jamais rendu** (DOCUMENTÉ_ONLY) : `capability_role`, `exigences_cognitives`, `memoire`
  (3 champs Critiques du SCHEMA), `delegation_context`. `parent_agent` : jamais codé (MANQUANT).
- **Impossibilité mécanique** : _STEP_TOOLS ne donne Read qu'à s9-build, s11, s2.5-artbible — les
  étapes s0→s6 n'ont AUCUN outil : elles ne peuvent pas honorer leur mandatory_read (run_real.py:151-164).
- **Contrat de contexte** : NON au sens exécuté — le schéma le déclare, le rendu ne le fait pas.
- **Version du contexte** : NON — dispatch_audit signe {run_id, etape, capability_role, model, provider,
  allowed_tools, ts}, ni prompt ni hash ; artifact_sha256 = hash de la SORTIE ; le pré-mortem injecté
  dépend d'un journal qui continue de changer ⇒ prompt exact d'un run passé non reconstituible.

## Runtime Context

- **Wiremap** : FOURNIE (contenu injecté) pour s9-build et s11 (_UPSTREAM_BY_STEP) ; absente ⇒ omission
  silencieuse, le run continue. Vérifiée après coup par check_wiremap (existence fichier + nom de fonction
  dans le code réel — static_oracles.py:262-303) et check_feature_set_frozen (non-dérive du set de règles
  vs gel post-s5). C'est un test d'**isomorphisme nominal** wiremap↔code — ni preuve de lecture, ni
  correction sémantique.
- **« Qu'a réellement lu cet agent ? » : le système ne sait PAS répondre.** `claude -p --output-format json`
  ne capture aucun transcript d'outils (run_real.py:256, grep stream-json/verbose vide). On sait ce qui a
  été SERVI (prompt driver) ou CITÉ (knowledge_trace = citations auto-déclarées, recoupées par sous-chaîne),
  jamais ce qui a été LU. shmup_slice : MANQUANT. card_engine : PARTIEL tirant vers MANQUANT.
- **search_log.jsonl** : global, sans run_id, best-effort — et **les 5 requêtes de toute son histoire ont
  matchCount: 0** : la recherche KB n'a jamais retourné un seul résultat. Le capteur « search consulté »
  peut être vert avec une bibliothèque qui n'a jamais rien fourni.
- **Bornage lecture** : rien n'empêche mécaniquement un agent de lire CLAUDE.md, studio_brain/, memory/,
  les anciens runs (deny = 7 règles : git destructif + .env). Bornes réelles : MCP coupé + 4 globs
  d'écriture + git interdits — chemin driver uniquement.

## Persistent Memory

- **Un seul canal mémoire→prompt fermé** : error_journal → premortem (contenu inliné, driver).
- **N'atteignent JAMAIS un prompt mécaniquement** : ADR, ledger, décisions Pierre
  (pending_review_decisions), studio_brain/, PROJECT_BIBLE (mort-vivant : cité par s0-contrat.yaml:26,
  fichier inexistant, fonction jamais appelée, s0 sans outil Read).
- **Séparation des 3 couches** : respectée de fait — mais par famine (la mémoire n'entre pas), pas par design.
- Canaux implicites non versionnés : CLAUDE.md auto-chargé (cwd=repo, INFÉRENCE harness),
  settings.local.json hérité (FAIT), memory/ (UNKNOWN harness), roles.yaml éditable entre runs
  (modèle final signé, raison du changement non tracée).

## Écarts trouvés

| # | Problème | Preuve | Risque | Solution proposée |
|---|---|---|---|---|
| E1 | `mandatory_read` = consigne ; s0→s6 sans outil Read | contract.py:177-179 ; run_real.py:151-164 | L'agent conclut sans les sources « obligatoires » ; l'obligation est une illusion | Injecter le CONTENU (étendre _UPSTREAM_BY_STEP) ou accorder Read + trace |
| E2 | Prompt non versionné, non reconstituible | dispatch.py:105-113 (pas de champ prompt/hash) ; pré-mortem mouvant | Impossible de rejuger un run passé ; bootstrap invérifiable | `prompt_sha256` + copie du prompt dans artifacts/, signés au dispatch |
| E3 | Aucune trace de lecture réelle | run_real.py:256 (json only) ; knowledge_trace auto-déclaré | « Qu'a lu l'agent » sans réponse ; théâtre de citation possible | Capture transcript (stream-json) ou à défaut run_id dans search_log |
| E4 | Contrat/prompt modifiables après validation sans détection | HMAC ne signe ni contrat ni prompt (dispatch.py:116-132 ; hook_guard.py:24-53) | Édition post-validation invisible ; assumé ADR-002 §7 mais réel | `contract_sha256` dans DispatchRecord, re-vérifié par le hook |
| E5 | R2 corrigé 1 point sur 3 : doublon marqueur + skill.md périmé | run_real.py:520 ; skill.md:82 ; test « 1 seul marqueur » ne teste que payload.prompt | Nettoyage futur d'un des deux canaux ⇒ hook désarmé silencieusement | Décision : retirer run_real.py:520 OU le documenter filet ; MAJ skill.md |
| E6 | Régime prose dominant = le moins protégé | 16/21 runs ; settings.local.json 494 allow/0 deny (git commit inclus) ; pas de _STEP_DISALLOWED sur Task | Sous-agent prose peut committer ; bootstrap improvisé non tracé | Arbitrage doctrine driver (Option A, déjà en attente §5 audit 24/07) |
| E7 | Double vérité outils : allowed_tools signé (vide) vs _STEP_TOOLS réel | contract.py:187-193 ; run_real.py:195-199 (F1d auto-documenté) | L'audit signé atteste la mauvaise source | Signer les outils réels (plan contrat, gate Pierre) |
| E8 | Clé HMAC auto-régénérée en silence, non versionnée | verdict.py:54-62 ; .forge_key git-ignoré | Clé perdue ⇒ signatures passées invérifiables sans alerte | Fail-fast à la vérification si clé absente + alerte à la génération |

## Audit de préparation du run Forge (checklist §6)

- [x] contexte initial identifié — chemin driver cartographié ; chemin prose identifié comme non reproductible
- [~] sources obligatoires connues — listées, mais non injectées et illisibles pour s0→s6 (E1)
- [x] wiremap validée — injectée s9/s11, oracles s10c actifs (isomorphisme nominal ; limites documentées)
- [x] docs canoniques identifiées — vérification exhaustive : AUCUNE référence morte dans contrats/skill
- [x] mémoire séparée du contexte — séparation effective (par famine ; seul premortem entre)
- [ ] traces disponibles — « servi/cité » oui, « lu » non (E3)
- [x] dérives connues — E1→E8 documentées ici + audit 24/07

## Statut par surface

- **Kernel** : TESTED — porte/verdict/hook testés ; limite structurelle : l'intégrité du CONTENU (contrat, prompt) n'est pas signée (E4)
- **Workflow** : IMPLEMENTED (chemin driver) — le régime prose dominant reste DOCUMENTED_ONLY (gabarit narratif, non exécuté)
- **Mémoire** : PASSIVE — un seul canal vivant (premortem) ; décisions/ADR/bible n'atteignent jamais un prompt
- **Agent Context** : DOCUMENTED_ONLY — le contrat de contexte déclaré (SCHEMA 17 champs, mandatory_read) n'est pas ce qui s'exécute
- **Wiremap** : IMPLEMENTED — fournie + vérifiée (nominal) ; omission silencieuse si absente
- **Documentation** : IMPLEMENTED — références vivantes (0 lien mort) ; exception : skill.md:82 périmé depuis R2 (E5)

## Verdict final

```
software_verdict: OK
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED
```

*Aucun verdict global « prêt/pas prêt » (consigne mission). Les rapports bruts des 3 sous-agents ne sont pas
recopiés (doctrine contexte propre) ; tout claim intégré a été contre-vérifié ou porte sa preuve fichier:ligne.*
