# REVUE CRITIQUE — AGENTS.md, agents, skills, règles : contradictions

Date : 2026-07-12 · Source : Claude Code, lecture exhaustive de CLAUDE.md, AGENTS.md,
`.claude/rules/*` (4), `.claude/agents/*` (15), `.claude/skills/*` (35), mémoire auto.
`claim_verdict: NO_CLAIM_ALLOWED` — ce document constate, il ne tranche pas ; chaque
correction proposée = gate Pierre.

---

## Synthèse

Le corpus de règles est globalement cohérent sur le noyau dur (verdicts séparés,
HumanGate, zones FORBIDDEN, jamais push sans go). Les contradictions se concentrent
sur **4 zones** : (1) la propriété de `tests/`, (2) AGENTS.md qui date d'un autre
harnais (Codex/GPT) et contredit ponctuellement CLAUDE.md, (3) l'édition du ledger
(trois règles différentes selon le fichier), (4) le vocabulaire de verdict, ratifié
UNIQUE mais violé par 7 skills. S'y ajoutent des références fantômes (skills citant
des choses qui n'existent pas) et trois fichiers « MEMORY.md » concurrents.

**14 findings : 4 P0 · 6 P1 · 4 P2.**

---

## P0 — Contradictions directes (deux règles inconciliables)

### C1 — Qui a le droit de modifier `tests/` ?
| Source | Règle |
|---|---|
| `.claude/rules/tests.md` | « ZONE PROTÉGÉE — aucun agent ne modifie ces fichiers. Toute modification passe par une gate Pierre explicite. » |
| `.claude/agents/qa-tester.md` | `domain: tests/` + « Bug reproductible → fix » — sans mention de gate |
| `.claude/agents/qa-lead.md` | « NE MODIFIE PAS tests/ (zone protégée) sans gate Pierre » |
| `.claude/agents/producteur-dur.md` | `tests/` dans `forbidden_paths` |

**Conflit** : qa-tester a pour domaine déclaré une zone que la règle projet interdit
à tout agent. Un agent obéissant à sa fiche violerait la rule.
**Proposition** : requalifier le domain de qa-tester en « exécution des suites +
rédaction de NOUVEAUX tests hors zone protégée, toute édition d'un test existant =
gate », ou retirer `tests/` de son domain.

### C2 — AGENTS.md : doctrine d'un autre harnais, en conflit ponctuel avec CLAUDE.md
- `AGENTS.md:1-3` : « TacticalChessPureLab », exécuteur **Codex**, critique **GPT** —
  le studio tourne sur Claude Code + Qwen + Gemini. Le document fait pourtant
  autorité implicite (les skills `/fog` et `/joust` le citent).
- `AGENTS.md:46` : « The human may explicitly request **one push to `main` per day**
  for backup » vs `CLAUDE.md` : « Push = gate Pierre explicite dans la conversation »
  et branche principale = **master** (pas main). Deux protocoles de push, deux noms
  de branche.
- `AGENTS.md:69` : « Never claim Elo, strength… » vs `ai-programmer.md:9`
  (« Oracle : ELO hybride > heuristique +20 ») et `/league` entier. La nuance
  réelle (mesurer un delta signé ≠ « claim » de force) n'est écrite nulle part —
  un agent strict pourrait refuser de rapporter un ELO.
**Proposition** : soit réécrire AGENTS.md comme doctrine Claude-Code (vocabulaire,
branche master, nuance ELO-oracle-vs-claim), soit le rétrograder explicitement en
archive (`docs/archive/`) et transférer les 3 sections encore vivantes
(Source Anchoring, Reporting Discipline, Guardrails dataset) dans CLAUDE.md.

### C3 — Trois règles d'édition du ledger
| Source | Règle |
|---|---|
| `CLAUDE.md` (section Jamais) | « Modifier IMPROVEMENT_LEDGER.yaml via l'outil kaizen_loop.py **de préférence**. Exception : création/clôture en session active sur go explicite Pierre. » |
| `/imp-readiness` (hard rules) | « **Ne jamais** modifier le ledger manuellement — utiliser kaizen_loop.py ou gate Pierre. » |
| `/council` (Phase 4) | « Passer SAFE_AUTO : **modifier le ledger** `lane: SAFE_AUTO` après go explicite » — édition à la main, kaizen_loop non mentionné. |
| `/gate` (hard rules) | « IMPROVEMENT_LEDGER.yaml n'est pas édité à la main ici (passe par kaizen_loop.py). » |

**Conflit** : `/council` autorise ce que `/imp-readiness` interdit absolument. Et la
phrase de CLAUDE.md est grammaticalement cassée (un « de préférence » sous un titre
« Jamais » : on ne sait pas si l'édition manuelle est interdite ou tolérée).
**Proposition** : une seule règle, écrite une fois dans CLAUDE.md : « Toute écriture
ledger passe par kaizen_loop.py. Exception unique : go explicite Pierre en session,
consigné. » — puis aligner `/council` (Phase 4 : via kaizen_loop ou go consigné).

### C4 — `/tick` : la hard rule ne correspond pas à la procédure
- Hard rule de `/tick` : « Oracle **studio_meta rouge** → ne jamais lancer l'autoloop. »
- Mais la Phase 1 de `/tick` ne vérifie que **exit ≠ 0** de studio_meta.py — pas le
  champ `global_verdict`. Or `/autoloop` Phase 0 fait foi sur `global_verdict: FAIL`
  (état connu : FAIL depuis 2026-06-27, delta ELO 10 < 20). Résultat : `/tick` lance
  systématiquement un autoloop qui hard-stoppe aussitôt — comportement incohérent
  avec sa propre hard rule.
- Phase 1.5 de `/tick` : « bench lichess rouge → **continuer le tick** (la phase
  autoloop n'est pas bloquée par un bench rouge) » — en tension avec la doctrine
  fail-closed de `/autoloop` (« un oracle qu'on ne peut pas lire est rouge »).
- `/tick` Phase 3 délègue à « `/imp-auto --unattended` » — **skill inexistante**
  (seul `/autoloop` existe).
**Proposition** : Phase 1 de `/tick` lit `global_verdict` (pas seulement l'exit code) ;
supprimer la référence `/imp-auto` ; expliciter quelle famille d'oracles (studio_meta
oui, lichess non ?) conditionne la nuit.

---

## P1 — Incohérences de doctrine (pas de danger immédiat, mais dérive)

### C5 — Vocabulaire de verdict : ratifié UNIQUE, violé par 7 skills
Décision ratifiée (mémoire `verdict_vocabulary`, contre-audit attaque 3) :
vocabulaire **UNIQUE OK/FAIL/BLOCKED**. Or :
| Skill | Vocabulaire réel |
|---|---|
| `/design-review` | [COHÉRENT] / [RISQUE] / [BLOQUER] |
| `/code-review` | [APPROUVER] / [CHANGER] / [BLOQUER] |
| `/architecture-review` | [PROCÉDER] / [MODIFIER] / [GATE PIERRE] |
| `/scope-check` | [DANS LE SCOPE] / [HORS SCOPE] |
| `/balance-check` | [ÉQUILIBRÉ] / [DÉSÉQUILIBRE] / [FEELING] |
| `/gate-check` | [PRÊT] / [GATES MANQUANTES] |
| `/tech-debt` | [CRITIQUE] / [ÉLEVÉ] / [BAS] |
| `/imp-readiness` | READY / NEEDS_WORK / BLOCKED (assumé, documenté) |

Le `PASS/FAIL` des JSON d'oracle est une couche machine distincte — acceptable si
on l'écrit quelque part. Les 7 skills courtes, elles, violent la décision ratifiée.
**Proposition** : mapper chaque skill sur OK/FAIL/BLOCKED (le détail passe en
`raison:`), une ligne de doctrine dans CLAUDE.md : « OK/FAIL/BLOCKED = agents ;
PASS/FAIL = champ JSON des oracles ; READY/NEEDS_WORK/BLOCKED = readiness IMP. »

### C6 — Deux racines Godot + un chemin canon divergent
- `gameplay-programmer.md` : `domain: assets/godot/` ; les 4 specialists Godot :
  `domain: games/chess_tcg/`. Deux racines pour le même moteur, sans lien documenté.
- La mémoire (`chess_tcg_canon_home`) situe le canon dans `repos/games/ChessTCG/` —
  troisième chemin, casse différente.
**Proposition** : trancher LE chemin Godot canonique, corriger les 5 fiches agents,
noter les chemins morts.

### C7 — Trois « mémoires » concurrentes
CLAUDE.md (règles de session) définit 3 référents : `memory/MEMORY.md` (machine),
`studio_brain/00_CURRENT_CONTEXT.md` (handoff), `studio_brain/` (doctrine). Mais
6 skills (`/start`, `/audit-daily`, `/reanchor`, `/tick`, `/gate`, `/autoloop`)
lisent/écrivent **`studio/openclaw-workspace/MEMORY.md`** et `DREAMS.md` — un
quatrième référent, hérité d'OpenClaw, absent du tableau canonique (ni retenu,
ni retiré).
**Proposition** : soit inscrire `studio/openclaw-workspace/{MEMORY,DREAMS}.md` dans
le tableau des référents de CLAUDE.md (rôle : télémétrie oracles + journal gates),
soit migrer ces écritures vers studio_brain/ et retirer le workspace OpenClaw.

### C8 — Deux chemins pour le même oracle
`/smoke-check` : « toujours préférer le wrapper `./scripts/run_oracle.sh` (ingestion
backbone) ». Mais `/reanchor` et `/tick` Phase 1.5 lancent `./bench/lichess_eval.sh`
en direct — donc sans ingestion backbone. Même oracle, deux chemins, télémétrie
incomplète selon la porte d'entrée.
**Proposition** : `run_oracle.sh lichess_eval` partout ; le bench direct réservé au
debug, dit explicitement.

### C9 — Références fantômes dans les skills
- `/joust` : « Caps studio : 200k tokens · 8 itérations **(AGENTS.md)** » — AGENTS.md
  ne contient aucun cap. La vraie source est `/sprint-plan`/`/estimate`.
- `/fog` Phase 3 : « Référence : table Domaine→Oracle d'**AGENTS.md** » — cette table
  n'existe pas dans AGENTS.md.
- `/joust` cite l'agent « `producteur_routine` (Qwen) » — aucun agent de ce nom dans
  `.claude/agents/`.
- `/tick` cite `/imp-auto` (cf. C4).
**Proposition** : corriger les 4 citations ; règle d'hygiène : une skill ne cite un
document que si la section citée existe (checkable par `/audit-daily`).

### C10 — « Jamais utiliser API Anthropic externe » vs openclaw-install
`CLAUDE.md` (Jamais) : « Utiliser API Anthropic externe ». Mais
`/openclaw-install` (Étape 3) requiert `ANTHROPIC_API_KEY=...` dans `~/.openclaw/.env`.
Si la règle vaut studio-wide, la skill installe une violation ; si OpenClaw est une
exception ratifiée, elle n'est écrite nulle part.
**Proposition** : préciser la règle (« …depuis les agents Claude Code du repo ;
OpenClaw hors périmètre » ou retirer la clé de la skill).

---

## P2 — Hygiène / dette documentaire

### C11 — Doctrine de verdict absente de la moitié des agents
6 agents « exécutants » (producteur-dur, engine/ai/gameplay-programmer,
performance-analyst, qa-tester) n'ont ni verdict typé ni NO_CLAIM_ALLOWED, alors que
les 9 autres l'ont. Un rapport d'exécutant n'est pas contraint au format que `/gate`
attend en entrée. → Ajouter le bloc verdict aux 6 fiches.

### C12 — Modèles épinglés en dur dans les fiches agents
`model: claude-sonnet-4-6` / `haiku-4-5` dans 15 fiches, alors que la doctrine Forge
(ADR-002) fait résoudre le modèle par le **registry** + escalade haiku→sonnet→opus.
Deux mécanismes de résolution de modèle coexistent. → Décider : registry partout,
ou fiches = défaut hors-Forge (l'écrire).

### C13 — `/monitor` ne connaît pas tous les services
Liste : 8765/8766/7331/1234. Manque `cockpit_server.py` FastAPI **:8770** (IMP-210,
installé 2026-06-29). Un monitor incomplet donne un faux « studio opérationnel ».
→ Ajouter la ligne 8770 (non-critique).

### C14 — Nommage Qwen incohérent
`CLAUDE.md` : « Qwen2.5-14B » (lane STUDIO) ; `/council` : « Qwen 2.5-Coder-14b » ;
mémoire forge : « qwen2.5-14b-instruct ». S'il y a réellement deux variantes
(instruct vs coder) selon l'usage, l'écrire ; sinon unifier. La règle « Qwen3.6
INTERDIT pour JSON » n'est portée que par CLAUDE.md — la propager aux skills qui
appellent LM Studio (`/council`, `/forge`).

---

## Recouvrements notables (pas des contradictions, à surveiller)

- **4 agents sur `games/chess_tcg/`** (godot-specialist, gdscript-specialist,
  technical-artist, shader-specialist) sans découpage de sous-dossiers → risque de
  collision ; godot-specialist vs godot-gdscript-specialist quasi jumeaux.
- **3 agents sur `design/`** (game-designer, systems-designer, creative-director) —
  hiérarchie implicite (creative tranche) mais périmètres non écrits.
- `/smoke-check` ⊃ `/verdict` ⊃ `/league` : emboîtement volontaire — OK, mais le
  documenter dans la table de routing éviterait les doubles lancements.
- Copies périmées : `.claude/worktrees/forge-menagerie-tactics/**` duplique agents,
  rules et skills — toute correction ici doit ignorer ces copies (elles divergeront).

---

## Plan de correction proposé (ordre suggéré, chaque item = gate Pierre)

1. **C1** : réécrire la fiche qa-tester (1 fichier).
2. **C3** : une règle ledger unique dans CLAUDE.md + aligner `/council` (2 fichiers).
3. **C4 + C9** : corriger `/tick` (global_verdict, /imp-auto) et les citations
   fantômes de `/joust` et `/fog` (3 fichiers).
4. **C2** : décision de fond — réécrire ou archiver AGENTS.md.
5. **C5** : normaliser les 7 skills sur OK/FAIL/BLOCKED + 1 ligne de doctrine.
6. **C6, C7, C8, C10** : décisions de chemins (Godot, mémoires, oracle, OpenClaw).
7. **C11–C14** : hygiène des fiches et de `/monitor`.

---

software_verdict : OK        (lecture exhaustive effectuée, findings sourcés fichier:section)
evidence_verdict : MECHANICAL_VALIDATION_ONLY
claim_verdict    : NO_CLAIM_ALLOWED
