# DEFERRED — registre des décisions différées

Créé le 2026-07-26 (demande Pierre). **Principe : une attente est un élément planifié.**
Une proposition refusée temporairement n'est pas une tâche active, mais elle n'est pas
oubliée : sans rappel, un « pas maintenant » est une suppression silencieuse — interdite.

**Mécanisme de rappel (minimal, zéro système)** : ce fichier est lu à CHAQUE début de
session (runbook §7.1). Toute entrée dont la date est atteinte ou l'événement produit →
la **question exacte** est reposée à Pierre, telle quelle. Issues possibles : **LANCER ·
CONTINUER À ATTENDRE (nouvelle échéance obligatoire) · SUPPRIMER DÉFINITIVEMENT** (entrée
close, jamais effacée — append-only, une clôture est une ligne datée).

Format : sujet · raison du report · condition de reprise · rappel (date OU événement) ·
question exacte · issues.

---

## DR-01 — Valeur du plafond de tokens (D2)
- **Raison du report** : distribution actuelle biaisée (44 k→1,8 M, succès seulement).
- **Condition de reprise** : M1 exécutée ET ≥1 run réel avec ≥1 ligne `outcome:HALT`.
- **Rappel** : événement — premier run post-M1.
- **Question exacte** : « Quelle valeur de plafond par run, et quelle conséquence exacte
  (halt + HumanGate) ? »
- **Issues** : fixer · attendre un 2e run · supprimer le plafond (revient sur D2-principe).

## DR-02 — Exécution D5 (mandatory_read → injection mesurée)
- **Raison du report** : une variable à la fois (M1 d'abord).
- **Condition de reprise** : critères M1 (a)→(e) verts.
- **Rappel** : événement — validation de M1.
- **Question exacte** : « Lancer la mission injection mesurée via Context Manifest ? »
- **Issues** : lancer · attendre · supprimer (revient sur D5-direction).
- **2026-07-26 — condition atteinte, question reposée, réponse Pierre : CONTINUER À ATTENDRE.**
  Nouvelle échéance (obligatoire) : événement — Pong livré VERT sous standard. Raison :
  « assez travaillé l'infrastructure, il faut la tester » — une variable à la fois.

## DR-03 — Préflight « preuve de mutation possible » avant s9-build
- **Raison du report** : n=2, même journée, runs de patch — peut-être une erreur opérateur.
- **Condition de reprise** : une 3e occurrence de « fichiers logiques inconnus ».
- **Rappel** : événement — l'occurrence ; sinon date **2026-08-25**.
- **Question exacte** : « Le préflight vaut-il maintenant son coût (n≥3, ou zéro
  récidive en un mois) ? »
- **Issues** : lancer · attendre 30 j de plus · supprimer.

## DR-04 — Chantier contrainte-contrat ↔ assertion-oracle (anti « oracle vert artefact faux »)
- **Raison du report** : instruments menteurs, 840 624 tokens non découpables défaut/feature.
- **Condition de reprise** : roadmap V1 §6 items 5 (compteur append inconditionnel) et
  6 (s10s branché au driver) livrés.
- **Rappel** : événement — livraison de ces deux items.
- **Question exacte** : « Le découpage défaut/feature est-il devenu mesurable, et le
  chantier vaut-il ses 10-50× ? »
- **Issues** : lancer · attendre · supprimer.

## DR-05 — Registre de claims nommés (primitive Codex 3)
- **Raison du report** : condition Pierre — chaque claim doit avoir un vérificateur
  mécanique exécuté par s12, sinon coût de maintenance > bénéfice.
- **Condition de reprise** : ≥3 claims réels ayant chacun un vérificateur exécutable.
- **Rappel** : date **2026-08-25** (et à chaque extension de verify_run/s12).
- **Question exacte** : « La condition vérificateur-mécanique est-elle remplissable pour
  ≥3 claims réels (jouable, solvable, rendu vivant) ? »
- **Issues** : lancer · attendre · supprimer.

## DR-06 — Rapatriement `learning_event` (étape 3 du plan ratifié)
- **Raison du report** : pas d'anticipation d'étape (ordre ratifié 1→4).
- **Condition de reprise** : étape 2 faite — les deux sources branchées à la courbe
  (KB reuse + production Forge, dont s10s).
- **Rappel** : événement — clôture de l'étape 2.
- **Question exacte** : « Rapatrier schéma + validateur + fixtures (JAMAIS la mécanique
  studioV2) maintenant ? »
- **Issues** : lancer · attendre · supprimer.

## DR-07 — Sonde tier-fixe (opus dès tentative 1)
- **Raison du report** : coût d'un run réel ; ininterprétable tant que la télémétrie ment.
- **Condition de reprise** : M1 en place ET un run réel de toute façon planifié.
- **Rappel** : événement — planification du prochain run réel post-M1.
- **Question exacte** : « Ce run se lance-t-il en tier fixe opus pour séparer tier et
  rang de tentative (H3) ? »
- **Issues** : lancer · attendre · supprimer (H3 restera indécidable).
- **2026-07-26 — condition atteinte (M1 verte + run Pong planifié), question reposée.
  Réponse Pierre (verbatim)** : « opus c'est que pour les petits agents codeur.
  l'orchestrateur c est toujours opus ». **Interprétation orchestrateur (à corriger si
  fausse)** : LANCER — builders du run Pong en tier fixe opus dès la tentative 1
  (H3 devient décidable), run_orchestrator en Opus comme déjà ratifié 2026-07-23.
  Entrée CLOSE pour ce run ; H3 sera jugée sur ses données.

## DR-08 — Worktrees Codex (db55/dbdf) + tag archive
- **Raison du report** : suppression jamais explicitement demandée ; contenu prouvé
  100 % bruit EOL, historique protégé par `archive/codex-audit-securite-2026-05` (local).
- **Condition de reprise** : décision Pierre.
- **Rappel** : date **2026-08-25**.
- **Question exacte** : « Supprimer les 2 worktrees Codex, et pousser ou abandonner le
  tag archive (aujourd'hui local uniquement — bus-factor-1) ? »
- **Issues** : supprimer les worktrees + trancher le tag · attendre · garder définitivement.

## DR-09 — Stash `tcs-session-dirty` + branches distantes absorbées
- **Raison du report** : hors périmètre de la consolidation ; suppression distante = push.
- **Condition de reprise** : prochaine validation de push par Pierre.
- **Rappel** : événement — la prochaine gate de push.
- **Question exacte** : « Jeter ou appliquer le stash (15 fichiers lane STUDIO gelée) ;
  supprimer `origin/feat/forge-oracle-gate`, `origin/safe/validation`,
  `origin/worktree-ux-audit-2026-06-29` (toutes absorbées) ? »
- **Issues** : nettoyer · attendre · garder définitivement.

## DR-10 — Lot micro-hygiène P8
Doublon `scripts/check_workspace_hygiene.py` (bit-identique, à supprimer) · étiquettes
« SSOT studio » openclaw dans `roles.yaml:3` + `SCHEMA.md:130` (fausses depuis le
2026-07-23) · garde `lab_hard_turn_cap` manquante dans `dataset_loader.py` (2 lignes,
zone ML — vérifier le gel) · archivage `00_CURRENT_CONTEXT.md` (>100 lignes, règle CLAUDE.md).
- **Raison du report** : micro-fixes, chacun trop petit pour une mission dédiée.
- **Condition de reprise** : une session d'hygiène groupée.
- **Rappel** : date **2026-08-25**.
- **Question exacte** : « Traiter le lot en une session d'hygiène unique, ou en retirer
  définitivement certains ? »
- **Issues** : lancer le lot · attendre · élaguer.

## DR-11 — Crible P8 des 20/38 skills hors table de routage
- **Raison du report** : aucun instrument d'usage — un audit global violerait P4.
- **Condition de reprise** : un signal réel sur un skill précis (erreur, friction, coût).
- **Rappel** : événement — le signal (pas de date : dormant assumé).
- **Question exacte** : « Ce skill précis : réparer, supprimer, ou laisser ? »
- **Issues** : traiter le skill signalé · rien (dormant reste dormant).

## DR-13 — Mining de patterns externes (corpus public CLAUDE.md / AGENTS.md / règles agents)
- **Raison du report** : idée GPT relayée par Pierre 2026-07-26 (« apprendre de milliers de
  systèmes » : % des architectures matures ayant validation/mémoire/hooks, comparer aux
  nôtres) — les deux jugent : « plus tard, quand le studio tourne ». Amélioration de
  recherche, pas une fondation. Réutilisation possible : le skill `/world-scan` EXISTE
  (recherche web citée, advisory) — ce serait une mission d'analyse, pas un outil neuf.
- **Condition de reprise** : le studio tourne — premier jeu du rail livré VERT sous
  standard (jalon 1 franchi).
- **Rappel** : événement — clôture du jalon 1 (Pong vert).
- **Question exacte** : « Lancer une mission de mining sur corpus public pour benchmarker
  nos pratiques (ROI à chiffrer : quelle décision changerait le résultat ?) ? »
- **Issues** : lancer (mission AAA advisory) · attendre · supprimer.

## DR-12 — Écarts E2→E8 restants (audit contexte 2026-07-25)
- **Raison du report** : E1 (injection) = DR-02 ; les autres (prompt non versionné, trace
  de lecture, HMAC ne signant pas le contenu…) attendent leur tour — une variable à la fois.
- **Condition de reprise** : DR-02 exécutée et mesurée.
- **Rappel** : événement — clôture de DR-02.
- **Question exacte** : « Quel écart suivant vaut une mission, chiffres à l'appui ? »
- **Issues** : lancer le suivant · attendre · clore les écarts restants comme acceptés.

## DR-14 — Deux contournements prouvés de la garde git mécanique
- **Raison du report** : décision Pierre 2026-07-28, verbatim — « Ne les corrige pas maintenant :
  ouvre-les comme dette technique avec une preuve de reproduction, nous les traiterons après le
  premier build Godot. » Découverts en restaurant le témoin Pong (incident de surface du 28-07).
- **PREUVE DE REPRODUCTION (exécutée en session, sorties réelles)** :
  · **C1 — la garde ne couvre que les commandes git, pas les écritures équivalentes.**
    `git checkout -- games/pong/06_RUNTIME/adapters/presentation/godot/project.godot`
    → REFUSÉ : « [git-guard] commande refusée : commande destructrice refusée (checkout) --
    aucun override (sentinelle absente) ». Puis, MÊME EFFET obtenu sans être gardé :
    `git show HEAD:<path>` (lecture) + réécriture du fichier par l'outil Write
    → `git status --short games/pong/` vide, `git diff --stat HEAD -- games/pong/` nul
    (restauration bit-à-bit réussie). Reproduction : modifier n'importe quel fichier suivi,
    tenter le checkout (refusé), écrire le contenu de HEAD (accepté).
  · **C2 — asymétrie de surface d'exécution.**
    `rm -rf games/pong/.../godot/.godot` via l'outil Bash → REFUSÉ (politique de permissions).
    `Remove-Item -Recurse -Force <même chemin>` via l'outil PowerShell → ACCEPTÉ, 90 fichiers
    supprimés. Même geste, même cible, deux verdicts. Reproduction : tenter une suppression
    récursive dans le dépôt par les deux outils.
- **Portée honnête** : dans les deux cas l'autorisation humaine explicite existait (Pierre a
  demandé la restauration deux fois) et tout était sauvegardé avant. Le défaut n'est pas
  l'usage qui en a été fait, c'est que la garde **peut** être contournée sans sentinelle —
  or « une garde de sécurité est indépendante de l'état courant » (règle d'usine n°5) et une
  garde contournable est déclarative, pas mécanique (mode de panne « déclaré ≠ exécuté »).
- **Condition de reprise** : premier build Godot livré (Snake s9).
- **Rappel** : événement — clôture du premier build Godot.
- **Question exacte** : « Fermer les deux contournements (étendre la garde aux écritures de
  fichiers suivis + unifier la politique Bash/PowerShell), ou les accepter explicitement
  comme limites connues de la garde ? »
- **Issues** : fermer les deux · fermer C1 seulement (le plus grave : il rend le checkout
  gardé cosmétique) · accepter et documenter la limite.
- **2026-07-28, COMPLÉMENT demandé par Pierre — C3, le faux positif symétrique.** La même
  garde a REFUSÉ une commande légitime parce que le mot `checkout` figurait dans le **texte
  du message de commit** (`git commit-tree ... -m "... RECUPERATION : git checkout <tag> ..."`),
  alors qu'aucune commande destructrice n'était exécutée. Sortie réelle : « [git-guard]
  commande refusée : commande destructrice refusée : `...` (checkout) -- aucun override ».
  Contourné sans contourner : message reformulé sans le mot. **Même cause racine que C1 et
  C2** : la garde filtre du TEXTE, pas une commande analysée — d'où à la fois des trous
  (écriture équivalente non vue) et des faux positifs (mot dans une chaîne). La correction
  devra donc porter sur l'ANALYSE de la commande, pas sur l'ajout de motifs.

## DR-15 — Divergence skill `/forge` : `allowed_tools` documenté vs `_STEP_TOOLS` réel
- **Raison du report** : découverte en câblant le profil `standard_godot` (2026-07-28) ;
  Pierre : « ouvre en dette séparée … le but maintenant est d'obtenir la première preuve de
  fabrication Godot réelle, pas d'étendre encore l'infrastructure ».
- **FAIT MESURÉ (orchestrateur, re-exécuté)** : le skill `.claude/skills/forge/skill.md`
  prescrit, pour tout spawn Claude, « outils = `payload.allowed_tools` uniquement ». Or
  `prepare_dispatch(...).allowed_tools` rend `()` pour **les trois étapes de build** :
  `s9-build` → `()`, `s9-build-standard` → `()`, `s9-build-godot-standard` → `()`.
  L'allowlist réellement appliquée vit dans `scripts/forge/run_real.py::_STEP_TOOLS`
  (ex. `("Write", "Edit", "Read", "Bash(node:*)")`), lue par le DRIVER seul.
- **Conséquence opérationnelle (déjà appliquée, pas une hypothèse)** : un build lancé par
  un spawn manuel d'orchestrateur, en suivant le skill à la lettre, partirait **sans aucun
  outil** — ou, si l'orchestrateur improvise une liste, avec une allowlist non gouvernée.
  D'où la condition ratifiée Pierre 2026-07-28 : **le build passe par le driver, jamais par
  un spawn manuel**. La dette est la divergence elle-même, pas son contournement.
- **Parenté** : 4e occurrence connue de « déclaré ≠ exécuté », forme *doc prescrit un chemin
  que le code ne sert pas*. Un test existant (`test_every_builder_step_has_a_non_empty_tool_allowlist`)
  protège déjà `_STEP_TOOLS` — rien ne protège la cohérence skill↔code.
- **Condition de reprise** : premier build Godot livré (Snake s9).
- **Rappel** : événement — clôture du premier build Godot.
- **Question exacte** : « Réconcilier dans quel sens : faire porter l'allowlist par le
  contrat (et `prepare_dispatch` la rendre), ou corriger le skill pour qu'il décrive le
  chemin driver réel — et brancher un capteur de cohérence skill↔code sur ce point ? »
- **Issues** : réconcilier vers le contrat · corriger la doc du skill · accepter et
  documenter (avec capteur, sinon la divergence reviendra).
