# WFL-02 — coup A1 : prisme → panel ×5 (SANS fusion) — protocole (2026-07-13)

Gabarit rempli selon `docs/forge/WORKFLOW_LAB_PROTOCOL.md` §4, avant toute lecture de
résultat. Scope volontairement restreint à **coup A1** (produire les 5 regards) —
**coup A2** (les recombiner) reste hors scope, cf. `docs/forge/PRISM_SCOPING.md` §4.

- **Supposition (prior, CITÉ)** : `STUDIO_MASTER_SCHEMA.html` détail A/E — « coup A · prisme
  → panel ×5, prior : bilans tri-IA · n=0 ». `PRISM_SCOPING.md` §2 : hypothèse NON vérifiée
  que 5 agents-visions (CEO·GD·Front·Back·Joueur) divergent réellement en priorités sur un
  même charter — c'est justement ce que ce protocole mesure, pas ce qu'il suppose acquis.
- **Coup (le diff, UNE variable)** : s1 = 1 agent (aujourd'hui, `s1-prisme.yaml`) → s1 =
  panel de 5 agents-visions **isolés** (chacun ne voit QUE le charter, jamais les 4 autres
  sorties, jamais le contrôle), chacun produisant son propre
  `product_snapshot_<lens>.md` au même format que le contrat actuel. **Aucune fusion** —
  c'est la seule variable testée ici.
- **Point de fork** : juste après s0 (charter) — s1 EST l'étape testée, donc aucun cache
  en aval n'est possible (cf. `PRISM_SCOPING.md` §3 : contrairement à WFL-01/coup B, ce
  coup est le plus en amont possible).
- **Input commun** : `shared/charter.yaml` — copie sha256-identique du charter breakout de
  WFL-01 (`05d22ea3…`), réutilisé pour comparabilité de coût avec `cost_robustness.md`.
- **Branches** : CONTRÔLE (1 agent, fidèle au contrat `s1-prisme.yaml` réel) · VARIANTE
  (panel de 5 : CEO, Game Designer, Front, Back, Joueur).
- **Répétitions** : N=1 pour cette instanciation (établir d'abord la faisabilité
  structurelle) — N≥2 nécessaire avant toute conclusion ferme, comme pour WFL-01.
- **Panel + pondérations (FIGÉS AVANT le run)** :
  1. Conformité structurelle — oracle déterministe non-LLM (`check_prisme.mjs`) : 4
     sections présentes et non vides, aucun marqueur de placeholder (« à définir »,
     « TBD », « ??? »), `regles_observables` non vide. Pass/fail par artefact.
  2. Volume produit — proxy de coût (mots, lignes), comme `WFL-01/cost_robustness.md`.
  3. Divergence de contenu entre les 5 lenses — mesure DESCRIPTIVE (quelles règles
     observables chaque lens priorise/omet), **pas un jugement de qualité** : sert à
     documenter empiriquement l'ampleur du problème de recombinaison (PRISM_SCOPING.md
     §2), pas à le résoudre.
- **Critère de succès/échec (déclaré AVANT lecture)** : succès structurel = 6/6 artefacts
  (1 contrôle + 5 lenses) passent l'oracle de conformité. Un échec structurel sur un lens
  n'invalide pas les autres (indépendants par construction — pas de fusion).
- **INVALIDE si** : toute tentative de fusion automatique des 5 sorties pendant ce
  protocole (ce serait le coup A2, une variable différente) ; toute lecture croisée entre
  lenses ou avec le contrôle pendant l'écriture (romprait l'isolation testée).
- **Dépouillement** : mécanique (oracle + comptage brut) — zéro jugement de « quelle vision
  est la meilleure ».
- **Conclusion LIMITÉE attendue** : ceci établira (ou non) que 5 agents-visions isolés
  produisent chacun un artefact structurellement valide à partir du même charter, et
  documentera objectivement s'ils divergent en contenu. Ceci NE prouvera PAS que le studio
  sait quoi faire de ces 5 sorties (A2, non traité), ni qu'un panel est « meilleur » qu'un
  seul agent au sens du panel §3 complet de WFL-01 (coût réel, robustesse processus réelle
  — toujours non mesurables sans passer par le driver, cf. `cost_robustness.md` §0).

```
software_verdict: (aucun — protocole, avant exécution)
evidence_verdict: MECHANICAL_VALIDATION_ONLY (à produire)
claim_verdict: NO_CLAIM_ALLOWED
```
