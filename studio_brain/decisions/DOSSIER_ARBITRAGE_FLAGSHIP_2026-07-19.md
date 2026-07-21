# Dossier d'arbitrage — flagship produit (2026-07-19)

- **Statut : EN COURS DE RÉSOLUTION PAR L'ACTION (retour Pierre 2026-07-19)** — verbatim : « la belote je suis en train de la mettre sur render dans une autre session et l'autobattler également dans une 3e session ». Direction de fait alignée Option 1 (Belote publie la première, auto battler actif) ; les deux mises en ligne se font dans des sessions parallèles, hors de ce chat. Formalisation du §5 optionnelle, laissée à Pierre.
- Ce document n'exécute rien.
- Auteur : orchestrateur Fable, session stratégie productivité/entreprise.
- Pourquoi trancher : **deux directions produit ratifiées coexistent** — le pivot 2026-07-05/06 (« Belote = produit 1, Tarot = produit 2 ») et l'architecture auto battler ratifiée 2026-07-18 (16 bibles, incréments i1/i2 forgés et mergés). Aucun des deux n'a été explicitement priorisé par rapport à l'autre. La dispersion est le coût silencieux.

## 1. Faits vérifiés (état réel du repo, contrôlé ce jour)

### Ligne auto battler (`games/auto_battler/`)
- 19 bibles (11 doctrine + 8 comptes-rendus HumanGate, dont RENDERER ratifié 2026-07-19).
- Moteur headless 17 modules (engine déterministe seed-first, replay, economy, shop, bench, merge…). **Pas encore d'UI jouable.**
- **92/92 tests verts** (relancés ce jour par sous-agent, node v24) ; mutation 92.9 % (91/98) au dernier incrément.
- Runs Forge i1 et i2 : `software_verdict: OK`, `decision: HUMANGATE_READY_WITH_OBJECTION`, mergés sur ratification Pierre (`e72a0e4`, `bccbef9`). i2.5 en cours (featuremap posée, pas de verdict).
- Discipline de preuve : la plus forte du studio (contrats, oracles, red-team, verdicts signés).

### Ligne Belote (`llm-lego/experiments/belote-claude/`)
- Jeu complet Belote 4j/32 cartes, zéro dépendance, ~30 tests (8 fichiers), **UI HTML jouable + serveur dédié + e2e**.
- **PWA déjà en place** : `manifest.webmanifest` + `sw.js` vérifiés présents.
- **Spec produit ÉCRITE** : `docs/superpowers/specs/2026-07-06-belote-bloc2-parcours-joueur-design.md` — axes « IA à niveaux, défi-par-lien, PWA » (l.17-18), architecture seed-first partagée par lien. (Correction d'un constat antérieur : la spec du pivot existe bel et bien — elle vit hors de studio_brain, d'où l'angle mort.)
- Discipline de preuve : construite AVANT la Forge (méthode llm-lego lab) — tests réels mais pas de verdict signé, pas de mutation, vit dans `experiments/`.

### Jeux arcade déjà forgés (moteur « volume » potentiel)
| Jeu | Verdict (vérifié) | Publiable statique |
|---|---|---|
| survival_arena | **OK / HUMANGATE_READY (propre)** — seul vert propre du parc | oui (index.html autonome) |
| shmup_slice | OK / WITH_OBJECTION (+ patch2 OK) | oui — mais playtest Pierre : « visuellement mort » |
| kb_tactics | OK / WITH_OBJECTION | oui (ESM, exige un hébergeur HTTP, ce que tout hébergeur statique fournit) |
| menagerie_tactics | verdict signé OK (mémoire) | **bloqué : worktree non mergé** |
| collect_runner | FAIL / BLOCKED | non |

⚠️ Caveat transverse (leçon documentée 2× dans la mémoire studio) : **verdict propre ≠ jeu bon** — survival_arena a historiquement été « vert mais injouable » avant la garde de solvabilité, et l'oracle ne mesure toujours pas le feel. Tout candidat à publication passe par un playtest Pierre avant upload.

## 2. Options

### Option 1 — Auto battler flagship · Belote premier produit publié (RECOMMANDÉE)
- Auto battler = produit commercial de l'année, construit via la Forge (chaque incrément nourrit knowledge_base + le devlog).
- Belote = **chemin le plus court vers un premier artefact public réel** (UI + PWA + spec déjà là) : adoption dans la discipline Forge (run d'adoption type kb_tactics : import, oracles, mutation, verdict signé) puis profil release.
- Arcade forgés = pilotes du profil release (survival_arena en premier), pas des produits.
- \+ : aucun travail existant jeté ; les deux ratifications de Pierre restent honorées, ordonnées au lieu de concurrentes.
- − : deux lignes vivantes = WIP à discipliner (le re-triage ledger fait ce ménage) ; Tarot reste différé.

### Option 2 — Belote flagship · auto battler ralenti
- \+ : distance minimale au marché (PWA prête), marché FR réel, moteur de plis réutilisable pour Tarot.
- − : contredit le momentum et l'investissement Forge de juillet (16 bibles, 2 incréments mergés) ; genre moins porteur commercialement que l'auto battler ; l'auto battler retomberait dans le purgatoire « déclaré non exécuté ».

### Option 3 — Auto battler seul · Belote gelée
- \+ : focus maximal, une seule ligne.
- − : repousse le premier artefact public de plusieurs mois (l'auto battler n'a pas d'UI) ; jette le seul produit quasi publiable ; le KPI « builds publiés » reste à zéro longtemps — exactement le problème diagnostiqué.

## 3. Recommandation motivée

**Option 1.** Elle est la seule qui fait démarrer le KPI de sortie (builds publiés/mois) **maintenant** sans sacrifier le flagship : Belote publie la première, l'auto battler reste l'objectif commercial construit proprement, les arcades servent de banc d'essai au profil release. Les trois moteurs de l'entreprise (volume/distribution · méthode/devlog · flagship) démarrent en parallèle avec un WIP borné par le re-triage.

## 4. Conséquences opérationnelles si Option 1 ratifiée

1. IMP-248/251 (seed Belote) restent KEEP (cf. LEDGER_TRIAGE_PROPOSAL) ; IMP-254/255/260 (chess_tcg, leviathan) gelés.
2. Belote : run Forge d'adoption `experiments/ → games/belote/` (profil increment, oracles + mutation + verdict signé) avant toute release.
3. S13/S14 (profil release, cf. docs/forge/S13_RELEASE_PROPOSAL.md) : pilote = survival_arena, après playtest Pierre.
4. Auto battler : cap sur i3 Combat (débloqué par i2 economy mergé) puis premier renderer (gate déjà ratifiée).
5. Tarot : différé explicitement (aucun travail avant release Belote v1).

## 5. Décision (à remplir par Pierre)

```
## Decision
- decision_id: FLAGSHIP-2026-07-19
- date:
- actor: Pierre (HumanGate)
- scope: priorisation produit studio — flagship + premier publié
- option_retenue:            # 1 / 2 / 3 / autre (préciser)
- sort_de_belote:            # adoption Forge / statu quo experiments / gel
- sort_des_arcades:          # pilotes release / gel
- validation_required: relecture des 2 dossiers liés (triage ledger, S13 release)
- post_action_verification: triage exécuté via kaizen_loop + entrée decision-log
- expiry:
- rollback: FROZEN réversibles ; adoption Belote = run Forge annulable avant merge
- notes:

## Final Verdicts
- software_verdict: N/A (décision produit, pas de code)
- evidence_verdict: MECHANICAL_VALIDATION_ONLY (faits §1 vérifiés sur le repo ce jour)
- claim_verdict: NO_CLAIM_ALLOWED
```

---
Dossiers liés : `docs/audit/LEDGER_TRIAGE_PROPOSAL_2026-07-19.md` · `docs/forge/S13_RELEASE_PROPOSAL.md`.
