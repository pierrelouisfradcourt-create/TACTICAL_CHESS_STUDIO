# knowledge_base/learning_curve.jsonl — la courbe d'apprentissage du studio

> **Pourquoi ce fichier vit ici et pas dans `lab/forge_evidence/`** — le plan le logeait
> initialement là-bas. C'était une erreur d'emplacement : `lab/forge_evidence/` est ignoré
> en bloc par `.gitignore`, parce qu'il contient les preuves **d'un run**, délibérément
> jetables. La courbe d'apprentissage est exactement l'inverse : elle est **cumulative**,
> elle survit aux runs, et elle est le livrable réel du curriculum. Elle appartient donc
> à la connaissance durable du studio, qui est versionnée.

## learning_curve.jsonl

Une ligne JSON par brique forgée, ajoutée par `scripts/forge/learning_metrics.mjs`
(`recordLearning`). Chaque ligne porte trois métriques :

- `reuse_ratio` — mesuré par `scripts/forge/reuse_ratio.mjs` (combien de la logique du
  jeu vient de `knowledge_base/` plutôt que d'être écrite de zéro).
- `oracle_iterations` — nombre de passes d'oracle nécessaires avant le vert (rouge → correction
  → rouge → correction → ... → vert). Compte les passes réellement exécutées, pas une estimation.
- `joust_delta` — écart mesuré face à une implémentation dérivée de l'état de l'art dans une
  joute (`/joust`), ou `null` si aucune comparaison n'a eu lieu. Quand `joust_delta` est `null`,
  la ligne porte `no_comparison: true` : c'est un fait à consigner, pas une erreur à masquer.

### Limite obligatoire (spec §10) — à lire avant toute lecture de ce fichier

**Sur une seule mécanique, ces trois nombres n'ont aucune valeur statistique.** Ils
établissent une ligne de base et prouvent que l'instrumentation enregistre réellement —
rien de plus. Une série d'un seul point ne permet de déduire ni tendance, ni progrès,
ni régression. **Aucune conclusion sur l'apprentissage de la Forge n'est tirée à l'étape 0**,
et aucune ne doit être écrite tant que la courbe ne comporte pas plusieurs briques
indépendantes forgées dans des conditions comparables.

La première ligne (`sys-grid-nav-m01`) est cette ligne de base : elle prouve que
`buildRecord`/`recordLearning` fonctionnent et que la mesure a été prise honnêtement
(voir `.superpowers/sdd/task-12-report.md` pour le détail de son calcul), pas que la
Forge « apprend ».
