# PROMPT LIBRARY — Tactical Chess Studio

Date : 2026-07-12 · Source : génération Claude Code (session revue règles) · À faire vivre par Pierre.

Bibliothèque de prompts optimisés pour chaque workflow du studio. Chaque prompt est
prêt à coller ; les `<placeholders>` sont à remplir. Convention commune à TOUS les
prompts : lane déclarée, périmètre fichiers explicite, oracle attendu nommé,
verdict final typé (`software_verdict` / `evidence_verdict: MECHANICAL_VALIDATION_ONLY` /
`claim_verdict: NO_CLAIM_ALLOWED`), jamais de commit/push sans go explicite.

---

## 0. Anatomie d'un bon prompt studio

```
[INTENTION]   ce que je veux obtenir, en une phrase
[LANE]        STUDIO | ROCKY_MOTEUR | IA_APPRENTISSAGE | JEUX | FORGE | llm-lego
[PÉRIMÈTRE]   fichiers/dossiers autorisés — et interdits (FORBIDDEN)
[ORACLE]      la commande non-LLM qui prouvera que c'est bon
[GATE]        ce qui reste à Pierre (fun, merge, push, décision)
[FORMAT]      le format de sortie attendu
```

Un prompt sans oracle nommé = du fog assumé → le dire explicitement (« pas d'oracle,
jugement Pierre attendu »).

---

## 1. Démarrage & état des lieux

### 1.1 Ouverture de session
> `/start` puis :
> « Lis `studio_brain/00_CURRENT_CONTEXT.md` et `lab/chains/IMPROVEMENT_LEDGER.yaml`
> (read-only). Donne-moi en 10 lignes max : où on en était, les 3 IMP les plus chauds,
> les gates en attente de ma décision. Aucune action, aucun write. »

### 1.2 Snapshot sprint
> `/sprint-status` — sans argument. Si je veux filtrer :
> « /sprint-status puis isole les IMP `SAFE_AUTO` non bloqués dont les `files:`
> touchent `<dossier>`. Read-only strict. »

### 1.3 Carte de brouillard
> `/fog` — puis, si besoin de décision :
> « Sur la fog map : liste uniquement les éléments FOG qui bloquent `<objectif>`
> et propose pour chacun soit un oracle constructible (S/M/L), soit "gate Pierre". »

### 1.4 Santé services
> `/monitor` — si un critique est DOWN :
> « Affiche la commande de relance, ne relance rien toi-même. »

---

## 2. Cadrage & planification

### 2.1 Plan avant action (obligatoire pour tout travail non trivial)
> `/plan` avec ce gabarit :
> « Objectif : `<une phrase>`. Lane : `<lane>`. Contraintes : ne pas toucher
> `<zones>`. Décompose en étapes · fichiers · oracle par étape · taille S/M/L.
> Identifie chaque gate Pierre. Affiche le plan et ATTENDS mon go — n'écris rien. »

### 2.2 Estimation seule
> `/estimate` :
> « Estime `<tâche>` : sous-tâches, S(<50k)/M(<100k)/L(<200k), oracle dispo ou fog,
> caps proposés. Pas d'implémentation. »

### 2.3 Brainstorm cadré
> `/brainstorm` :
> « Type de jeu / thème : `<contexte>`. Contraintes stack : `<Rust/Godot/web/…>`.
> Donne 3-5 concepts, chacun avec : mécanique cœur en 2 lignes, oracle disponible
> (comment un bot prouve que ça marche ET que c'est gagnable — solvabilité), effort S/M/L.
> Termine par ton favori "ancrable ET ambitieux". Le choix final = ma gate. »

### 2.4 Anti-creep en cours de sprint
> `/scope-check` :
> « Compare ce qui a été fait cette session au scope validé dans `<GDD/plan>`.
> Tout hors-scope → stoppe et liste. Verdict OK (dans le scope) / FAIL (hors scope → gate). »

### 2.5 Sprint depuis le ledger
> `/sprint-plan` :
> « Construis le sprint depuis le ledger : SAFE_AUTO + AUDIT_REQUIRED, DAG sans
> bloqueur, caps 200k/8 itérations par tâche. Fog → gate. Affiche et attends mon go. »

---

## 3. Implémentation par lane

### 3.1 Lane ROCKY_MOTEUR (Rust)
> « Lane ROCKY_MOTEUR. Objectif : `<changement>` dans `src/chess/<module>`.
> Interdits : autopilot.py, tests/, bench/, tout unwrap() sans `// SAFETY:`,
> panic!() en prod, magic numbers. Répétition = Zobrist, jamais to_fen().
> Debug derrière TCS_DEBUG uniquement. TDD : écris le test d'abord (hors tests/
> protégés — nouveaux tests dans le module), puis l'impl. Oracle :
> `cargo build --release && cargo test`. Montre la sortie brute. Verdict typé. »

### 3.2 Lane IA_APPRENTISSAGE (Python/ML)
> « Lane IA_APPRENTISSAGE. Objectif : `<changement>` dans `ml/` ou `lab/`.
> venv : `.venv312\Scripts\python.exe`. Type hints obligatoires sur fonctions
> publiques, logging (jamais print), encoding='utf-8' sur tout open(), chemins
> repo-relatifs. SearchTraceSchema = 7 scalaires normalisés [0,1].
> Oracle : `.venv312\Scripts\python.exe -m pytest <cible> -v`. Verdict typé. »

### 3.3 Lane STUDIO (autopilot.py)
> « Lane STUDIO. Objectif : `<changement>` DANS autopilot.py uniquement (fichier
> unique ~5200 lignes, Flask + HTML inline dans les strings Python). Aucun nouveau
> fichier, jamais src/. Modèle LM : Qwen2.5-14B port 1234 — jamais Qwen3.6 pour du
> JSON. Chaque bouton ajouté : route backend + état loading + erreur affichée.
> Oracle : lancer le serveur + curl de la route + réponse attendue. Verdict typé. »

### 3.4 Lane JEUX (prototype Python)
> « Lane JEUX. Objectif : `<changement>` dans `lab/chess_fantasy/`. Ne pas toucher src/.
> Oracle : `.venv312\Scripts\python.exe -m pytest lab/chess_fantasy/tests/ -v`.
> Bug reproductible = fix auto ; feel/fun = liste-moi les points à juger. Verdict typé. »

### 3.5 Checklist pré-implémentation (à coller avec tout prompt d'implémentation)
> « Avant de coder : (1) liste les comportements évidents du composant
> (cf. CLAUDE.md — terminal/bouton/form/websocket/endpoint/parser/…),
> (2) dis ce qui casse en premier et protège-le AVANT le happy path,
> (3) dis comment tu prouveras que ça marche (oracle ou étapes de test manuel
> ordonnées avec résultat attendu). »

---

## 4. Vérification & oracles

### 4.1 Gate oracle complet (avant tout merge)
> `/smoke-check` — sans argument. Rappel : un seul FAIL = stop, HMAC vérifié
> avant d'y croire, merge éligible ≠ merge (ratification = `/gate`).

### 4.2 Verdict signé sur un domaine
> `/verdict` :
> « Domaine : `<engine|elo|tactique|ml>`. Lance l'oracle du domaine, vérifie le HMAC,
> émets les trois verdicts séparés. FAIL ou HMAC KO → stop, pas de gate. »

### 4.3 Match ELO
> `/league` :
> « Games : `<20 rapide | 50+ stable>`. Rapporte le panel + delta hybride−heuristique
> vs cible +20. Un seul run signé fait foi — pas de re-roll pour un meilleur chiffre. »

### 4.4 Recalibration hebdo
> `/reanchor` — rappel : bench rouge → STOP sans mise à jour MEMORY ;
> ancre PASS→FAIL = escalade avant écriture.

### 4.5 Preuve d'exécution (anti-« j'ai implémenté X »)
> « Tu affirmes que `<X>` fonctionne. Montre la preuve d'EXÉCUTION : commande lancée,
> sortie brute, exit code. La preuve d'existence (le code est là) ne compte pas. »

---

## 5. Revues

### 5.1 Revue de code avant merge
> `/code-review` :
> « Branche : `<branche>`. Diff `git diff master...HEAD`. Points durs : unwrap()
> injustifié, panic!() prod, magic numbers, couverture des nouveaux cas limites,
> cargo test/pytest verts. Verdict OK / FAIL (changer) / BLOCKED (gate). »

### 5.2 Revue design avant implémentation
> `/design-review` :
> « Doc : `<chemin>`. Sépare ce qui est vérifiable par oracle de ce qui est jugement
> (fun = moi). Risques : scope creep, dette, dépendances. Verdict OK / FAIL / BLOCKED. »

### 5.3 Revue architecture (produit un ADR)
> `/architecture-review` :
> « Décision : `<quoi>`. Documente quoi/pourquoi/alternatives, impact modules,
> risque régression. Irréversible → council + gate. ADR dans docs/adr/. »

### 5.4 Équilibrage gameplay
> `/balance-check` :
> « Système : `<combat/éco/…>`. Mesurable d'abord : dégâts, coûts, probabilités,
> invariants (pas de stratégie dominante — prouve-le ou dis que tu ne peux pas).
> Le feeling reste ma gate. »

### 5.5 Playtest
> `/playtest` :
> « Build + une partie complète loggée. Bugs reproductibles → fix. Feel/UX → liste
> numérotée de points à trancher par moi, avec ta recommandation par point. »

---

## 6. Gates & décisions

### 6.1 Readiness d'un IMP avant pickup
> `/imp-readiness IMP-<XXX>` — aucun agent ne démarre sans READY.

### 6.2 Council multi-modèles (AUDIT_REQUIRED)
> `/council IMP-<XXX>` — rappel : jamais de changement de lane sans mon go ;
> le council ne merge rien.

### 6.3 Joute deux modèles
> `/joust` :
> « Tâche : `<énoncé unique>`. Compétiteurs : `<A>` vs `<B>`. Oracle choisi AVANT :
> `<commande>`. Même scope, mêmes caps (200k/8). L'oracle tranche ; ambigu ou
> double FAIL → moi. »

### 6.4 HumanGate (ratification)
> `/gate` :
> « Objet : `<IMP/HGD>`. Monte le dossier : oracle, HMAC, verdicts, fichiers,
> zones FORBIDDEN touchées. Propose MERGE seulement si pré-conditions dures OK.
> Attends ma décision — MERGE/REJECT/FREEZE — puis consigne dans DREAMS.md (append). »

### 6.5 Checklist gates de phase
> `/gate-check` — avant de déclarer une phase franchie.

---

## 7. Nuit & maintenance

### 7.1 Tick du soir
> `/tick` — bilan fog/coût/cycles + maintenance hebdo + autoloop conditionnel.
> Rappel dur : studio_meta rouge (exit ≠ 0 OU global_verdict FAIL) → pas d'autoloop.

### 7.2 Autoloop manuel encadré
> `/autoloop --max <N> [--dry-run]` :
> « SAFE_AUTO uniquement, hors FORBIDDEN, hard-stop premier rouge, DREAMS append,
> jamais de git write. Commence par --dry-run si je n'ai pas confirmé la file. »

### 7.3 Audit quotidien
> `/audit-daily` — lecture seule ; alerte sécurité = escalade immédiate.

### 7.4 Veille externe sur un IMP
> `/world-scan IMP-<XXX>` — packet advisory-only, cité, jamais injecté au council.

---

## 8. Forge (génération de jeux)

### 8.1 Forge greenfield
> `/forge <concept de jeu en 1-3 phrases : boucle cœur, condition de victoire, contrainte>`
> Rappels au prompt : profil `full` (13 étapes), dry-run dispatch d'abord, oracle jeu =
> e2e Playwright click-through + solvabilité (un bot DOIT gagner) + gate mutation
> 100%-ou-triage. Verdict signé → ma gate, worktree non mergé.

### 8.2 Forge patch (quotidien)
> `/forge --patch <fix sur projet existant : symptôme + fichier suspecté>`
> Profil `patch` = s9-build → s10a-oracle → s11-redteam → s12-verdict ;
> oracles non applicables = reçus SKIPPED signés, jamais de faux OK.

### 8.3 Forge review (critique de plan)
> `/forge --review <chemin ou collage du plan>` — s6-redteam-plan seul, pas de verdict signé.

---

## 9. Méta-prompts transverses

### 9.1 Bug (systematic debugging + TDD)
> « Bug : `<symptôme exact + repro>`. AVANT tout fix : reproduis, formule 2-3 hypothèses,
> instrumente pour trancher (pas de fix au jugé). Puis test qui échoue → fix minimal →
> test vert → oracle de lane. Si le fix est structurel : stoppe et propose une gate. »

### 9.2 Feature multi-agents
> `/team-feature` :
> « Feature : `<desc>`. Domaines : `<combat/ui/audio/…>`. Un agent par domaine,
> worktrees isolés, caps 200k/8. Tous verts → propose le merge groupé (ma gate).
> Un rouge → stoppe CE domaine seulement, rapporte. »

### 9.3 Hotfix
> `/hotfix` :
> « Bug urgent : `<desc>`. Reproduis → test AVANT le fix → corrige dans
> worktrees/hotfix/ → oracle vert. Structurel → gate. L'urgence ne supprime pas l'oracle. »

### 9.4 Release
> `/release` :
> « Cible : `<Rocky|jeu>`. 100% tests verts + ELO match (Rocky) ou build (jeu) +
> changelog depuis dernier tag. Tag + push UNIQUEMENT sur ma ratification explicite. »

### 9.5 Dette technique
> `/tech-debt` — grep unwrap/panic/TODO/FIXME + clippy -D warnings + fonctions trop longues.

### 9.6 Fin de session (handoff)
> « Fin de session. Mets à jour `studio_brain/00_CURRENT_CONTEXT.md` (<100 lignes) :
> date, en cours, décisions ratifiées uniquement, prochaine étape, impasses.
> Faits durables nouveaux → mémoire auto. IMP touché → entrée ledger via kaizen_loop.
> Rien d'autre. »

---

## 10. Garde-fous à coller en préfixe de n'importe quel prompt sensible

> « Rappels contractuels : pas de commit/push sans mon go explicite dans CETTE
> conversation ; zones FORBIDDEN intouchables (tests/ eval/ oracle/ bench/ puzzles/
> .github/) ; ledger via kaizen_loop.py ; verdicts séparés software/evidence/claim ;
> claim_verdict: NO_CLAIM_ALLOWED ; si tu ne peux pas prouver, dis "fog" et arrête-toi. »
