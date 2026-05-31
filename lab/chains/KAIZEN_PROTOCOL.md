# KAIZEN PROTOCOL — Amélioration Continue

Status: DOCUMENTED_ONLY  
Owner: HumanGate (Pierre)  
Claim posture: NO_CLAIM_ALLOWED  
Scope: boucle d'amélioration continue du studio (méta-process, pas runtime jeu)

---

## 1. Principe

Au lieu d'audits one-shot oubliés à chaque session, le studio tient une **mémoire d'améliorations** qui :

- se souvient de ce qui reste à faire (`IMPROVEMENT_LEDGER.yaml`)
- priorise automatiquement par ROI (impact / effort)
- propose toujours **la prochaine action bornée**
- mesure le progrès session après session
- respecte les lanes, HumanGate, et NO_CLAIM_ALLOWED

C'est le **slow path** de l'architecture Rocky appliqué au développement lui-même :

```
Telemetry/Audits -> Analyse -> Curriculum (ledger) -> HumanGate -> Amélioration bornée -> Feedback/Memory
```

---

## 2. Les 3 briques

| Brique | Rôle | Mutation ? |
|--------|------|-----------|
| `IMPROVEMENT_LEDGER.yaml` | SSOT des améliorations trackées (gaps, chantiers, bugs) | Non (sauf via kaizen close/add) |
| `kaizen_loop.py` | Moteur : recall / propose / close / add / metrics | Read-only sauf close/add |
| `KAIZEN_PROTOCOL.md` | Ce doc : le rituel | Non |

**Connexion aux chaînes existantes** :
- `doc_hygiene_chain.py` produit l'audit → ses gaps alimentent le ledger (kaizen add)
- `run_chain.py` v4 consulte le ledger avant chaque chaîne (memory-aware, opt1 de Charter B)
- `CHAIN_HISTORY.jsonl` reste le log brut ; le ledger est la vue curatée actionnable

---

## 3. La boucle Kaizen

```
   +-----------------------------------------------------------+
   |  1. RECALL    kaizen_loop.py recall                       |
   |               -> où on en était, état du backlog          |
   |                                                            |
   |  2. AUDIT     doc_hygiene_chain.py --audit                |
   |               -> état actuel du repo, nouveaux gaps        |
   |                                                            |
   |  3. CAPTURE   kaizen_loop.py add (pour chaque gap nouveau) |
   |               -> les gaps deviennent des items trackés     |
   |                                                            |
   |  4. PROPOSE   kaizen_loop.py propose [--lane X]           |
   |               -> la prochaine action bornée (ROI max)      |
   |                                                            |
   |  5. HUMANGATE Pierre approuve l'item à traiter             |
   |               -> 1 seul item, lane respectée               |
   |                                                            |
   |  6. EXECUTE   Claude Code (borné aux files de l'item)      |
   |               -> diff + smoke level approprié              |
   |                                                            |
   |  7. RE-AUDIT  doc_hygiene_chain.py --audit                |
   |               -> vérifie que l'amélioration tient          |
   |                                                            |
   |  8. CLOSE     kaizen_loop.py close IMP-XXX                 |
   |               -> ferme l'item, débloque ses dépendances    |
   |                                                            |
   |  9. METRICS   kaizen_loop.py metrics                       |
   |               -> progrès mesuré (closed %, coverage)       |
   +-----------------------------------------------------------+
```

Une session = un ou plusieurs tours de boucle. La boucle ne ferme jamais un item sans re-audit (étape 7).

---

## 4. Rituel de session (5 minutes au démarrage)

```powershell
# Toujours commencer par se souvenir
.\.venv312\Scripts\python.exe lab\chains\kaizen_loop.py recall

# Voir la prochaine action recommandée
.\.venv312\Scripts\python.exe lab\chains\kaizen_loop.py propose

# Filtrer si tu veux rester sur du sans-risque
.\.venv312\Scripts\python.exe lab\chains\kaizen_loop.py propose --lane SAFE_AUTO
```

À la fin de session :

```powershell
# Fermer les items traités
.\.venv312\Scripts\python.exe lab\chains\kaizen_loop.py close IMP-001

# Capturer les nouveaux gaps découverts
.\.venv312\Scripts\python.exe lab\chains\kaizen_loop.py add --title "..." --impact HIGH --effort SMALL --lane SAFE_AUTO

# Mesurer le progrès
.\.venv312\Scripts\python.exe lab\chains\kaizen_loop.py metrics
```

---

## 5. Règles de priorisation (ROI)

ROI = impact / effort. Plus haut = prioritaire.

```
impact:  LOW=1   MEDIUM=3  HIGH=5   CRITICAL=8
effort:  TRIVIAL=1  SMALL=2  MEDIUM=5  LARGE=10  XLARGE=20
```

Exemple seedé : IMP-001 (HIGH/TRIVIAL) = ROI 5.0 = le meilleur premier coup.

**Un item n'est actionnable que si** :
- son status est OPEN
- tous ses `blocked_by` sont CLOSED

`propose` ne montre que les actionnables. Les bloqués attendent leurs dépendances.

---

## 6. Discipline des lanes (rappel)

| Lane | Smoke | HumanGate | Auto-merge ? |
|------|-------|-----------|--------------|
| SAFE_AUTO | LEVEL_0 | après smoke | oui si smoke vert |
| AUDIT_REQUIRED | LEVEL_1 | requis | non, review |
| HUMAN_REQUIRED | LEVEL_2 | requis | non, manuel |
| FORBIDDEN | BLOCKED | strict | jamais |

Le ledger porte la lane de chaque item. `kaizen propose` indique si HumanGate est requis. **Un item FORBIDDEN (ex: dataset rebuild) ne s'automatise jamais** — il reste visible mais bloqué.

---

## 7. Intégration multi-lanes parallèles

Quand IMP-003 (conflict matrix checker) sera fermé, la boucle Kaizen pourra proposer **un batch de lanes parallèles** :

```
1. kaizen propose                  -> liste N items actionnables
2. Sélectionner N items à scopes DISJOINTS (vérifier files)
3. lane_conflict_checker.py         -> CLEAR ou CONFLICT
4. Si CLEAR : générer N prompts Claude Code bornés
5. Lancer N worktrees en parallèle
6. Re-audit + smoke par lane
7. kaizen close pour chaque lane mergée
8. metrics
```

Le ledger devient alors le **plan source** des lanes : chaque item a déjà ses `files`, sa `lane`, son ROI. Le conflict checker lit ces `files` pour garantir la disjonction.

---

## 8. Mesure du progrès

`kaizen metrics` suit :
- **closed %** du backlog (vélocité)
- **spec_coverage_pct** (combien des 9 specs UX implémentées)
- **backlog actionnable par lane** (où concentrer l'effort)
- **delta closed** depuis la dernière session (progression réelle)

Le `metrics_history` du ledger garde un snapshot par session pour voir la courbe dans le temps.

---

## 9. Non-autorisations

Ce protocole n'autorise pas :
- exécution autonome (HumanGate sur chaque EXECUTE)
- fermeture d'item sans re-audit
- automation des lanes FORBIDDEN
- claim de strength/Elo/promotion/scientific
- commit/push/merge sans validation Pierre

```text
software_verdict: KAIZEN_CONTINUOUS_IMPROVEMENT_LOOP_ADDED
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED
```
