# Forge Improvement Report — Run n°1 (shmup_slice)

> Date : 2026-07-15 · Auteur : Fable 5, directeur de production Forge · Run supervisé :
> `shmup_slice-20260714a` (profil full, 13 étapes, 1er run full réel de l'histoire de la
> Forge) · Sources : télémétrie `lab/forge_evidence/`, state/verdict on-disk, oracle
> re-exécuté à la main, audit baseline (workflow 5+1 agents) + preuves fichier:ligne.
> `claim_verdict: NO_CLAIM_ALLOWED`.

---

## Verdict exécutif

**La Forge a produit un jeu qui marche. Elle a aussi failli à le reconnaître.**

Pour la première fois, la chaîne complète (s0→s12) a tourné de bout en bout avec de vrais
agents et a généré un jeu **jouable, prouvé solvable et vert à l'e2e** — dans un genre
(shmup temps réel, 3 maps, 3 boss, tir ennemi) qu'elle n'avait **jamais** su produire.
C'est un saut de capacité réel.

Mais son **verdict officiel est `BLOCKED`** — un **faux négatif** : un bug d'infrastructure
(timeout Windows non appliqué) a laissé le build tourner 2h15, puis l'a **jeté comme un
"timeout"**, détruisant un travail réussi. Le cœur génératif fonctionne ; la couche
opérationnelle n'est pas de qualité production.

**Décision : AMÉLIORER AVANT PROCHAIN RUN.** Un seul verrou dur à lever (le timeout) ;
le reste de la chaîne est validé, pas à refondre.

**Le double résultat (Mission 0) est atteint :**
- **Jeu** : substantiellement livré (existe, jouable, solvable ; tests faibles + pas d'art).
- **Apprentissage Forge** : c'est le livrable le plus précieux du run — la découverte que
  le mécanisme de timeout est doublement défaillant (ne borne pas le coût **et** détruit le
  travail réussi) vaut, pour l'avenir de la machine, plus que le jeu lui-même.

---

## 1. Analyse du produit généré

**Ce qui existe** : `games/shmup_slice/`, ~2611 lignes `.mjs`, architecture propre en 6 modules
(`logic/ data/ input render bot main`) avec séparation logique-pure ↔ rendu réellement tenue.

**Qualité gameplay (vérifiée par oracle re-exécuté, JALON=B)** :
| Volet | Résultat | Preuve |
|---|---|---|
| logic tests | ✅ PASS | assertions strictes collisions/score/vies/HP |
| property tests | ✅ PASS | invariants multi-seeds |
| **solvabilité bout-en-bout** | ✅ **PASS** | bot bat map1→boss1→map2→boss2→map3→boss3 |
| **e2e Playwright** | ✅ **PASS** | map1 jouée (score 700), 3 boss hp→0, WON, restart, LOST |
| mutation | ⚠️ **70,5 %** | 79/112 tués, **33 survivants** |
| reuse_ratio | 0.000 | aucune brique KB réutilisée |

**Cohérence technique** : bonne. Déterminisme seedé respecté, `step(DT)` découplé du rendu,
patterns en données, hooks `window.__game`/`__game_debug` conformes au PLAYABLE_CONTRACT.
Le jeu tourne (`node server.mjs`).

**Défauts observés** :
1. **Tests faibles (mutation 70,5 %)** — 33 mutants survivent : le comportement n'est pas
   verrouillé. C'est le vrai défaut qualité. Sous doctrine, ce n'est PAS un clean-pass —
   au mieux `WITH_OBJECTION`. Le gate mutation l'aurait légitimement renvoyé en escalade
   Opus si le run n'avait pas halté avant.
2. **Zéro identité visuelle** — primitives canvas seules (l'Art Director est hors profil
   full par décision antérieure) ; très loin de l'inspiration Pop'n TwinBee. Assumé.
3. **Réutilisation nulle** — tout écrit de zéro ; la KB n'avait aucune brique shmup
   (confirmé baseline), donc la discipline "SEARCH d'abord" n'a rien rapporté ce run.
4. **UX non jugée** — la difficulté des 3 boss ("assez durs mais battables") n'a aucune
   calibration mécanique ; elle relève du playtest humain (fog Pierre), non fait.

**Bilan produit** : un vertical slice **fonctionnel** et **honnêtement prouvé jouable**,
mais **pas fini au sens qualité** (tests à durcir, art absent). Utilisable comme socle,
pas comme livrable final.

---

## 2. Analyse de la chaîne Forge

**Chiffres réels du run** (télémétrie) :
- Planification s0→s6 : ~30 min, ~80k tokens, propre (chaque étape 200-320s, 11-21k tok).
- s9 haiku ×2 (pool best-of-2) : ~22 min, **$1,53**, **2 échecs honnêtes**.
- s9 sonnet : **~2h15**, **coût NON tracé** (timeout → jamais enregistré), a produit le jeu.
- Wall-clock total : **215 min (3h35)** créé→halt.

**Étapes efficaces (ont créé de la valeur)** :
- **s0→s6** : parfait premier passage. Contrat, Prisme (panel ×6), World-scan, Décompo,
  Archi, WireMap, red-team plan Qwen — enchaînés sans casse, artefacts réels sur disque.
- **Chaînage d'artefacts (F4)** + **matérialisation validée (F2)** : ont tenu en réel.
- **Pool + escalade** : ont fonctionné **exactement comme conçu** — 2 échecs haiku honnêtes
  → escalade Sonnet ; et le **model_override est réellement honoré** (fix P1 validé en vivo,
  Sonnet a effectivement tourné, plus le no-op silencieux d'avant).
- **Gardes oracle** : la garde solvabilité (P2) et le gate e2e ont **refusé** les builds
  haiku cassés — **zéro faux vert**. C'est la doctrine anti-`survival_arena` qui tient.

**Étapes faibles / goulots** :
- **Timeout (le goulot fatal)** : `--step-timeout 1800` inopérant sous Windows (petit-fils
  `claude.exe` non tué, deadlock `subprocess.communicate`). Le build a mangé 2h15 (×4,5 le
  budget) **puis** a été jeté. **Coût non borné ET travail réussi détruit.**
- **Perte du travail réussi** : le driver traite un timeout comme un échec sec et n'inspecte
  jamais l'état on-disk produit — un build vert peut être annulé sans que rien ne le rattrape.
- **Observabilité trouée** : le build coûteux (Sonnet 2h15) n'est **ni dans la télémétrie ni
  dans builder_runs** (jeté avant enregistrement). Le seul coût visible ($1,53) est celui des
  échecs — le run paraît 30× moins cher qu'il ne l'a été.
- **Panel Prisme (s1) invisible en coût** : 6 appels, `tok=0` en télémétrie (chemin séparé).

**Appels inutiles / doublons** : aucun doublon d'agent. Les 2 essais haiku ne sont pas
"inutiles" (le pool best-of-N est un choix assumé) mais haiku était clairement sous-taillé
pour ce genre → un pool best-of-2 sur un tier trop faible = ~22 min et $1,53 brûlés avant
l'escalade inévitable. Signal : **démarrer un jeu de ce calibre plus haut dans l'échelle.**

**Manque d'automatisation** :
- **Interventions humaines (question Mission 0)** : le **jeu** n'a demandé **aucune**
  intervention créative humaine — la chaîne l'a conçu et bâti seule depuis un charter.
  MAIS la **machine** a exigé une lourde ingénierie de pré-vol (P1-P3 + F1-F5 + R1-R5 =
  3 workflows d'agents + mes vérifications) avant de pouvoir tourner. La Forge n'est
  **pas "press play"** : elle a réclamé un directeur pour la rendre greenfield-capable.
  Bonne nouvelle : l'essentiel de cette prep est **permanent** (amorti sur les runs
  futurs) — sauf le timeout, encore ouvert.
- Pas de câblage Art Director dans un run greenfield d'un seul tenant.
- Nettoyage d'artefacts (`.mutbak` résiduel) non automatisé.

---

## 3. Backlog d'amélioration Forge

### FIR-01 — Timeout `claude -p` non appliqué (petit-fils Windows non tué)
- **Problème** : `subprocess.run(timeout=)` tue le wrapper npm mais pas le `claude.exe`
  petit-fils, qui garde les pipes ouverts → `communicate()` bloque, le budget 30 min est
  ignoré (2h15 observées), puis l'appel est faussement compté "timeout".
- **Preuve** : `run_real.py:180` `timeout=timeout_s` ; process `claude.exe` PID 4216756
  vivant de 17:37 à ~19:53 ; log `driver HALTED: ... claude -p timeout (1800s)` ;
  state 133 min stale pendant l'appel.
- **Impact** : coût non borné + faux BLOCKED systématique sur tout build long. **Sabote
  chaque run futur à l'identique.**
- **Priorité** : **P0 (bloquant tout prochain run).**
- **Coût** : moyen — tuer l'arbre de processus (`taskkill /T` / `psutil` récursif) au timeout,
  ou lancer `claude -p` dans un job Windows tué en cascade ; + test d'intégration.
- **Surface** : `scripts/forge/run_real.py` (`_claude_call_raw`).

### FIR-02 — Un build réussi jeté par un timeout non inspecté
- **Problème** : le driver traite un timeout comme échec sec ; il n'inspecte jamais
  l'artefact produit sur disque. Un build vert peut être annulé et re-dépensé.
- **Preuve** : `games/shmup_slice/` PASSE l'oracle 4/4 alors que le verdict est BLOCKED.
- **Impact** : destruction de travail réussi + re-dépense (Opus aurait refait 2h15).
- **Priorité** : **P0** (couplée à FIR-01 : même si le timeout est corrigé, un build interrompu
  légitime devrait pouvoir être re-jugé plutôt que jeté).
- **Coût** : faible-moyen — sur timeout d'une étape jeu, lancer l'oracle sur l'état on-disk
  avant de conclure ; si vert, HALTED→re-juger, pas BLOCKED sec.
- **Surface** : `driver.py` (traitement `ok:False` d'une étape build de jeu).

### FIR-03 — Observabilité aveugle au coût du travail jeté
- **Problème** : un appel qui timeout n'écrit ni télémétrie ni builder_run → le run coûteux
  est invisible ; le coût affiché ($1,53) est 30× sous la réalité.
- **Preuve** : télémétrie shmup = seulement 2 lignes haiku ; le build Sonnet 2h15 absent.
- **Impact** : budget et post-mortem faussés ; on ne peut pas piloter un coût qu'on ne voit pas.
- **Priorité** : **P1.**
- **Coût** : faible — enregistrer tentative + durée + tokens partiels **même** sur timeout/échec.
- **Surface** : `run_real.py` / `studio_link.record_telemetry`.

### FIR-04 — Démarrage de tier inadapté au calibre du jeu
- **Problème** : builder haiku par défaut ; pour un shmup 3×3, 2 essais haiku ($1,53, 22 min)
  échouent avant l'escalade inévitable vers Sonnet.
- **Preuve** : builder_runs — haiku retry 0 et 1 tous deux FAIL ; Sonnet a réussi.
- **Impact** : temps + coût brûlés en pure perte sur un tier structurellement trop faible.
- **Priorité** : **P2.**
- **Coût** : faible — heuristique de tier initial selon la complexité du charter (nb features
  WireMap, "jeu temps réel multi-niveaux" → démarrer Sonnet), ou pool_size=1 quand le tier
  est manifestement sous-taillé.
- **Surface** : `escalate.py` / choix du tier initial dans l'orchestration.

### FIR-05 — Gate mutation non atteint faute d'avoir fini le run (tests jeu faibles)
- **Problème** : le jeu produit est à 70,5 % mutation (33 survivants) ; le gate aurait dû
  renvoyer s9 en escalade "durcis tes tests" — mais le run a halté avant.
- **Preuve** : mutation lancée à la main = 79/112 ; gate mutation câblé mais jamais évalué (s10a PENDING).
- **Impact** : sans FIR-01/02, la boucle qualité "tests forts" ne se ferme jamais.
- **Priorité** : **P1** (dépend de FIR-01/02 pour être exerçable).
- **Coût** : nul (déjà câblé) — se débloque mécaniquement quand le run va au bout.
- **Surface** : chaîne (dépendance), pas un correctif propre.

### FIR-06 — Art Director hors chaîne greenfield
- **Problème** : `s2.5-artbible` est un profil dédié ; un run full ne produit ni art bible ni
  asset_requests → jeu sans identité visuelle, sans détection mécanique du manque.
- **Preuve** : `dispatch.py` DEDICATED_PROFILE_STEPS ; jeu produit = primitives canvas.
- **Impact** : plafond de qualité visuelle ; écart fort vs référence du genre.
- **Priorité** : **P2** (décision de design, pas un bug).
- **Coût** : moyen — soit séquencer artbible→build dans l'orchestration, soit l'intégrer au
  profil full (décision HumanGate, cf. baseline).
- **Surface** : `dispatch.py` PROFILES + orchestration.

### FIR-07 — reuse_ratio scanne les mauvais fichiers
- **Problème** : la mesure ne scanne que `input.mjs`/`render.mjs`, rate `logic/*.mjs` (le vrai
  cœur logique) → ratio 0.000 peu informatif.
- **Preuve** : sortie oracle "Fichiers de logique produit scannés (2) : input.mjs, render.mjs".
- **Impact** : la métrique de réutilisation est aveugle sur les fichiers qui comptent (advisory).
- **Priorité** : **P3.**
- **Coût** : faible — aligner la découverte de fichiers logiques sur la WireMap.
- **Surface** : `scripts/forge/reuse_ratio.mjs`.

### FIR-08 — Micro-défauts de harnais jeu (message + résidu)
- **Problème** : (a) message solvabilité contradictoire ("did not reach level 2. Reached
  level 2") ; (b) `step.mjs.mutbak` résiduel non nettoyé après mutation interrompue.
- **Preuve** : sortie solvability.mjs ; `ls games/shmup_slice/logic/step.mjs.mutbak`.
- **Impact** : diagnostic confus + hygiène ; non bloquant.
- **Priorité** : **P3.**
- **Coût** : trivial.
- **Surface** : template solvabilité / `mutation.py` (finally de restauration + purge).

---

## 4. Décision

### **AMÉLIORER AVANT PROCHAIN RUN.**

**Pourquoi pas CONTINUER** : FIR-01 sabote **chaque** run futur à l'identique (coût non borné +
faux BLOCKED). Relancer sans le corriger, c'est re-brûler des heures pour re-jeter le résultat.

**Pourquoi pas BLOQUER POUR REFACTOR** : la chaîne **fonctionne fondamentalement**. s0→s6, le
chaînage d'artefacts, le pool, l'escalade réellement honorée, les gardes anti-faux-vert : tout
est **validé en conditions réelles**. Ce n'est pas une refonte qu'il faut, c'est un correctif
ciblé (le processus de spawn) + deux garde-fous.

**Chemin critique avant le prochain run (P0 obligatoires)** :
1. **FIR-01** — tuer l'arbre de processus au timeout (le seul verrou dur).
2. **FIR-02** — inspecter l'artefact on-disk avant de conclure BLOCKED sur un timeout jeu.

**Puis, sans re-tout-refaire** : le jeu shmup existe déjà et passe l'oracle. Une fois FIR-01/02
posés, une **reprise** (le driver sait reprendre sans rejouer s0→s6) ou un simple **re-jugement**
du build on-disk ferme le run proprement — et le gate mutation (FIR-05) renverra alors
légitimement s9 durcir ses tests (70,5 %→objectif 100%/triage). Coût marginal faible :
l'essentiel du travail est payé.

**Ce qui reste à Pierre (HumanGate, aucune exécutée par la Forge)** : ratifier ce diagnostic ;
décider si l'Art Director entre au prochain run (FIR-06) ; playtester le "feel" des 3 boss ;
autoriser le commit du jeu + des correctifs harnais. La Forge **propose**, ne promeut rien seule.

```
software_verdict: BLOCKED   (verdict de chaîne = faux négatif, cause infra FIR-01)
evidence_verdict: MECHANICAL_VALIDATION_ONLY   (oracle 4/4 vert re-vérifié à la main ; mutation 70,5%)
claim_verdict: NO_CLAIM_ALLOWED
```
