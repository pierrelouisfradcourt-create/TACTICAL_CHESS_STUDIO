# EVIDENCE_GIT_POLICY_PROPOSAL_V1

*2026-08-04. **Proposition, aucune modification.** `.gitignore` n'a pas été touché. La
décision appartient à Pierre.*

---

## Le fait mesuré

```
57 references vers lab/forge_evidence/ depuis des fichiers VERSIONNES
   (mutation_registry.json · capabilities.json · agent_recipes.json · root_problems.json)

   dont fichiers absents du disque      : 0
   dont fichiers presents MAIS ignores  : 57
```

Et la conséquence, simulée sans rien supprimer — chaîne de décision exécutée depuis une
racine ne contenant pas `lab/forge_evidence/` :

```
SUR UN CLONE FRAIS DU TAG forge-v2 :
  mutations acceptees executables : 0 / 13
  blockers : evidence_missing ×13 · recipe_missing ×9
```

**Le tag `forge-v2` ne se relance pas.** Ni `execution_binding`, ni `candidate_selector`,
ni `agent_factory` ne trouvent une seule preuve : tout est déclaré `evidence_missing`, ce
qui est le comportement correct — les fichiers ne sont réellement pas là.

Ce n'est pas un bug : c'est le mode de panne que cette lane documente depuis des mois, pris
à l'envers. D'habitude : *une preuve sans lecteur n'existe pas*. Ici : **un lecteur
versionné qui pointe vers une preuve non versionnée.**

## Deux natures de fichiers, aujourd'hui confondues sous une seule règle

| | contenu | volume | croissance |
|---|---|---|---|
| **Preuves d'expérience** — 14 dossiers nommés | `before.json`, `after.json`, `oracle_before/after.json`, `measured_metrics.json`, `execution_trace.json`, `reproduce.command` | 122 fichiers, ~480 Ko | **figée** — une expérience close ne rebouge plus |
| **Flux d'exploitation** — racine du dossier | `dispatch_audit.jsonl` (239 Ko), `forge_telemetry.jsonl`, `repair_results.jsonl`, `runtime_drift.jsonl`, `oracle_*.log` | 13 fichiers, ~460 Ko | **append-only, sans fin** — grossit à chaque run |

`.gitignore:162` traite les deux pareil. Les 57 références pointent **uniquement** vers la
première catégorie.

---

## Option A — statu quo, preuves externes

`lab/forge_evidence/` reste ignoré en entier.

**Pour** — aucun changement, le dépôt ne grossit pas, les journaux append-only ne polluent
jamais l'historique.
**Contre** — le tag `forge-v2` est **inexécutable** hors de cette machine, et les 57
références des registres sont mortes pour quiconque n'a pas ce disque. Les trois MATCH ne
sont pas re-vérifiables par un tiers.
**Ce qu'il faut alors assumer** : les registres versionnés décrivent un système dont la
preuve vit ailleurs. Il faudrait le dire dans `CLAUDE.md`, sinon le prochain qui clone
croira à un dépôt cassé.

## Option B — espace de release versionné

Créer `lab/forge_release/<tag>/` **suivi par git**, où l'on copie les preuves au moment de
poser un tag.

**Pour** — le tag devient auto-portant et re-vérifiable ; les journaux restent ignorés.
**Contre** — **duplication** : la même preuve existe à deux chemins, et les 57 références
continuent de pointer vers le chemin ignoré. Il faudrait soit réécrire les références à
chaque release, soit accepter deux vérités — exactement le doublon `proven_chains` /
`agent_recipes` qu'on a résolu il y a deux heures.

## Option C — versionner les bundles critiques *(recommandée)*

Dé-ignorer **uniquement ce qui est référencé par un fichier versionné**, garder les flux
ignorés :

```gitignore
lab/forge_evidence/*
!lab/forge_evidence/*/          # les dossiers d'experience : suivis
lab/forge_evidence/*.jsonl      # journaux append-only : ignores
lab/forge_evidence/*.log
```

**Pour** — les 57 références deviennent valides dans le dépôt ; le tag redevient
exécutable ; aucune duplication ; les journaux qui grossissent sans fin restent dehors.
**Coût mesuré** : ~480 Ko, 122 fichiers, tous en JSON figé.
**Contre** — chaque nouvelle expérience ajoute des fichiers au dépôt. À la cadence
observée (14 dossiers en ~3 semaines), c'est de l'ordre de 0,5 Mo par mois — mais rien ne
garantit que cette cadence tienne.
**Règle qui rendrait l'option sûre** : un dossier de preuve n'entre dans le dépôt que s'il
est **référencé** par un registre. Vérifiable mécaniquement, et c'est déjà le critère qui
donne les 57.

---

## Ce que je recommande, et pourquoi

**Option C.** La raison n'est pas le volume, c'est la cohérence : un registre versionné qui
cite un fichier ignoré crée une référence que le dépôt ne peut pas honorer. La Forge passe
son temps à refuser ce type d'écart chez les autres — `evidence_missing` est un blocker
qu'elle sait nommer. Le laisser dans sa propre politique de dépôt serait un deux-poids.

L'Option A reste défendable **à une condition** : l'écrire noir sur blanc, pour que
« 0/13 exécutable sur un clone frais » soit un fait connu et non une découverte.

## Décision demandée

☐ **Option A** — statu quo, + mention explicite dans `CLAUDE.md`
☐ **Option B** — espace de release copié au tag
☐ **Option C** — dé-ignorer les dossiers d'expérience, garder les journaux ignorés *(recommandée)*
☐ **Autre**

Tant qu'aucune case n'est cochée, `.gitignore` reste tel quel et le tag `forge-v2` conserve
la propriété mesurée ci-dessus.
