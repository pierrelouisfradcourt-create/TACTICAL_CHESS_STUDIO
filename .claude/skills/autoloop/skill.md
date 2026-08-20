---
name: autoloop
description: Boucle Kaizen native Claude Code — sélectionne les IMP OPEN+SAFE_AUTO non bloqués, lance kaizen_autoloop.py --imp-id par IMP, hard-stop sur oracle rouge (studio_meta global_verdict FAIL), consigne chaque résultat dans DREAMS.md. SAFE_AUTO uniquement, cap 3, jamais de git write.
---

# /autoloop [--unattended] [--max N] [--imp-id IMP-XXX] [--dry-run]

Boucle d'exécution autonome du studio. Implémentation **native Claude Code** —
aucun pointeur vers OpenClaw. Le skill orchestre l'outil réel
`lab/chains/kaizen_autoloop.py` (qui enchaîne charter → exécution → validation →
close → metrics → ingest backbone), encadré par un **gate oracle non-LLM** en
entrée et en sortie.

> Doctrine : *Oracles (non-LLM) + Pierre = seuls DÉCIDE. L'autoloop RECOMMANDE et
> exécute le borné ; il ne ratifie rien* (AGENTS.md, CLAUDE.md).
> Un oracle rouge **arrête tout** — fail-closed.

Args (tous optionnels) :
- `--unattended` : pas de question intermédiaire ; un échec ou un rouge stoppe la boucle.
- `--max N` : nombre max d'IMP traités dans ce run (défaut **3** — cap nuit doctrine `tick`).
- `--imp-id IMP-XXX` : cible un seul IMP au lieu de la sélection automatique.
- `--dry-run` : génère les charters, n'exécute pas, n'écrit pas dans le ledger ni DREAMS.

Outils (`.venv312\Scripts\python.exe` = venv du repo) :
- Ledger  : `lab/chains/IMPROVEMENT_LEDGER.yaml` (lecture seule ici)
- Exec    : `lab/chains/kaizen_autoloop.py --imp-id <id> --lane SAFE_AUTO`
- Oracle  : `scripts/studio_meta.py` → `lab/reports/studio_meta_latest.json` (`global_verdict`)
- Journal : `studio/openclaw-workspace/DREAMS.md` (append-only)

---

## Phase 0 — Gate oracle d'entrée (hard-stop AVANT toute action)

Rafraîchir puis lire l'oracle consolidé du studio :

```powershell
.venv312\Scripts\python.exe scripts\studio_meta.py
```

Lire `lab/reports/studio_meta_latest.json` → champ `global_verdict`.

| `global_verdict` | Action |
|---|---|
| `PASS` | Continuer en Phase 1 |
| `FAIL` (ou blockers durs) | **HARD-STOP** — n'exécuter aucun IMP, n'écrire ni ledger ni DREAMS. Rapporter le verdict + les `blockers`. |
| fichier illisible / script en erreur | **HARD-STOP fail-closed** — un oracle qu'on ne peut pas lire est traité comme rouge. |

> État connu au câblage (2026-06-27) : `global_verdict = FAIL`
> (`elo delta 10 < 20`, surface `inference` BLOCKED). **Tant que l'ELO reste rouge,
> l'autoloop refuse de démarrer — c'est le comportement attendu** (doctrine `tick` :
> *studio_meta rouge → ne jamais lancer l'autoloop*).

---

## Phase 1 — Lire le ledger

Charger `lab/chains/IMPROVEMENT_LEDGER.yaml`. Aucune écriture dans cette phase.

---

## Phase 2 — Sélectionner les candidats

Filtrer les improvements retenus (mêmes critères que `scripts/director.py`,
déterministe) :

1. `status: OPEN`
2. `lane: SAFE_AUTO` — **jamais** AUDIT_REQUIRED / HUMAN_REQUIRED / FORBIDDEN
3. `blocked_by: []` — ou tous les bloqueurs déjà `CLOSED`
4. **aucun** `files:` dans une zone FORBIDDEN : `tests/ eval/ oracle/ bench/ puzzles/ .github/`

Trier : **impact décroissant** (HIGH > MEDIUM > LOW) puis **effort croissant**
(quick wins d'abord), puis `id` stable. Conserver au plus `--max N` (défaut 3).

- Si `--imp-id IMP-XXX` est fourni : la liste = ce seul IMP. `kaizen_autoloop.py`
  re-valide qu'il est actionnable et **refuse** sinon (introuvable / fermé /
  bloqué / mauvaise lane) — ne pas contourner ce refus.
- Si la liste est **vide** : afficher « aucun IMP éligible (OPEN · SAFE_AUTO ·
  non bloqué · hors FORBIDDEN) », ne rien écrire, fin propre.

Afficher la liste sélectionnée (id, impact/effort, titre) avant de lancer.
En mode interactif (sans `--unattended`), demander le go ; en `--unattended`, enchaîner.

---

## Phase 3 — Exécuter IMP par IMP (boucle, cap N)

Pour **chaque** IMP retenu, dans l'ordre :

### 3a. Lancer l'exécuteur réel

```powershell
.venv312\Scripts\python.exe lab\chains\kaizen_autoloop.py --imp-id IMP-XXX --lane SAFE_AUTO
```

(`--dry-run` ajouté si le run global est en dry-run.)

`kaizen_autoloop.py` gère en interne : génération du charter, exécution
(Claude Code en sous-processus), `validate_report`, `close` dans le ledger via
`kaizen_loop.py`, metrics, archive golden, ingest backbone. **Le ledger n'est
jamais édité à la main par ce skill.**

### 3b. Lire le résultat

- **SUCCESS** : la sortie contient `[OK] IMP-XXX ferme dans le ledger.` et aucun
  signal d'échec (`[X]`, `BLOCKED`, `TIMEOUT`, `FAIL`).
- **ÉCHEC** : tout le reste (rapport ambigu refusé, BLOCKED, TIMEOUT, CLI
  indisponible). L'IMP reste `OPEN` — HumanGate requis.

### 3c. Gate oracle de sortie (hard-stop rouge)

Re-rafraîchir l'oracle : `studio_meta.py`, relire `global_verdict`.

- `PASS` → continuer.
- bascule vers `FAIL` → **régression introduite** : **HARD-STOP** immédiat de la
  boucle. Consigner (3d) puis stopper — ne traiter aucun IMP suivant.

### 3d. Consigner le résultat dans DREAMS.md

Cible : `studio/openclaw-workspace/DREAMS.md`. **Append-only, jamais réécrire**,
encodage `utf-8`. Créer l'en-tête si le fichier est absent (cf. skill `gate`).

Ajouter une entrée **de type exécution** — distincte d'une ratification Pierre :

```markdown
## <YYYY-MM-DD> — autoloop exec IMP-XXX : <titre>
- décision   : AUTO-EXEC (RECOMMANDE) — ratification Pierre requise
- oracle     : <PASS|FAIL> · studio_meta global_verdict avant=<…> après=<…> · HMAC : —
- exécution  : <CLOSED dans le ledger | ÉCHEC — IMP laissé OPEN>
- fichiers   : <files de l'IMP>
- raison     : autoloop SAFE_AUTO — <oracle vert avant+après | hard-stop sur rouge>
- ratifié par: — (en attente HumanGate /gate)
- claim_verdict: NO_CLAIM_ALLOWED
```

> Pourquoi `AUTO-EXEC` et non `RATIFIÉ` : DREAMS.md est le journal souverain des
> gates de Pierre. L'autoloop y inscrit une **trace d'exécution opposable**, mais
> seul `/gate` + sign-off Pierre écrit `RATIFIÉ`. On préserve la doctrine du gate
> tout en gardant DREAMS comme mémoire unique des décisions du studio.

### 3e. Condition d'arrêt

Stopper la boucle (et ne pas traiter les IMP restants) dès que :
- un IMP **échoue** (3b ÉCHEC), ou
- l'oracle de sortie passe **rouge** (3c), ou
- le cap `--max N` est atteint, ou
- la liste est épuisée.

---

## Phase 4 — Rapport final

```
AUTOLOOP — bilan run <date>
─────────────────────────────────────────────
oracle entrée : <PASS|FAIL>
traités       : <k>/<N>  ·  fermés : <ids>  ·  échec : <id|—>
hard-stop     : <non | oracle rouge sur IMP-XXX | échec IMP-XXX>
DREAMS.md     : <k> entrée(s) ajoutée(s)
─────────────────────────────────────────────
suivi : <HumanGate /gate sur les IMP fermés | rollback IMP échoué | rien>
```

Les IMP fermés par l'autoloop restent `AUTO-EXEC` : ils attendent une **gate
Pierre** (`/gate`) pour devenir `RATIFIÉ`. L'autoloop ne merge ni ne push jamais.

---

## Hard rules

- **Oracle rouge = stop.** `global_verdict FAIL` (entrée OU sortie), ou oracle
  illisible, interdit/arrête l'exécution. Fail-closed, sans exception.
- **SAFE_AUTO uniquement.** AUDIT_REQUIRED → `/council`. HUMAN_REQUIRED / FORBIDDEN
  → STOP. Aucun fichier en zone FORBIDDEN (`tests/ eval/ oracle/ bench/ puzzles/ .github/`).
- **Ledger jamais édité à la main** — la clôture passe par `kaizen_autoloop.py`
  → `kaizen_loop.py close`.
- **DREAMS append-only** — l'entrée autoloop est un `AUTO-EXEC` (RECOMMANDE),
  jamais un `RATIFIÉ`. Seul `/gate` + Pierre ratifie.
- **Jamais de `git commit` / `push`** depuis ce skill.
- **Cap N** (défaut 3). Premier échec ou premier rouge → arrêt de la boucle.
- `claim_verdict: NO_CLAIM_ALLOWED` sur toute trace produite.

## Cas d'erreur

| Situation | Action |
|---|---|
| `studio_meta.py` en erreur / json illisible | Oracle rouge fail-closed — HARD-STOP, rien d'écrit |
| `global_verdict FAIL` à l'entrée | HARD-STOP, rapporter blockers, ne rien exécuter |
| Aucun IMP éligible | Rapport « liste vide », fin propre, rien d'écrit |
| `--imp-id` non actionnable | `kaizen_autoloop.py` refuse (`[X] … Arret.`) — relayer, ne pas forcer |
| `kaizen_autoloop` : Claude Code CLI indisponible | Traité comme ÉCHEC, IMP laissé OPEN, stop |
| Oracle bascule rouge après un IMP | Régression : HARD-STOP, consigner, suivi rollback |
| `DREAMS.md` absent | Le créer avec l'en-tête (cf. `/gate`) puis append |
