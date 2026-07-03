# Vault Usage Guide — Studio Brain
#meta #reference

> Mode d'emploi de ce vault Obsidian.
> Règle principale : ce vault est la **mémoire actable** du studio, pas une archive.
> Date de dernière révision : 2026-06-28

---

## Structure des dossiers

```
studio_brain/
├── 000_HOME.md          ← MOC racine (Map of Content) — point d'entrée unique
├── doctrine/            ← Principes immuables du studio (HumanGate, IA-invisible, etc.)
├── decisions/           ← Registre chronologique des décisions irréversibles
├── gamedesign/          ← Règles de game design empiriques + templates (CERFA)
├── meta/                ← Ce guide + conventions du vault lui-même
├── projects/            ← Une note par jeu actif (état, roadmap, métriques)
├── reference/           ← Sources de vérité + données marché (liens vers le repo)
├── state/               ← Snapshots datés de l'état réel du studio
└── workflow/            ← Boucles opérationnelles + catalog des skills
```

---

## Taxonomie des tags

| Tag | Usage |
|---|---|
| `#project` | Notes spécifiques à un jeu (projects/) |
| `#decision` | Décisions irréversibles HumanGate |
| `#doctrine` | Principes directeurs et règles absolues |
| `#gamedesign` | Règles de design, CERFA, leçons |
| `#reference` | Données, sources, liens vers le repo |
| `#workflow` | Boucles, skills, processus |
| `#state` | Snapshots d'état datés |
| `#meta` | Notes sur le vault lui-même |
| `#moc` | Map of Content (index de navigation) |

> Toujours au moins un tag par note. Combiner si pertinent (ex: `#reference #workflow`).

---

## Convention wikilinks + MOC

- Tout lien interne : `[[chemin/relatif/depuis/vault-root|Titre Affiché]]`
- Exemple : `[[workflow/skills-catalog|Skills Catalog]]`
- Le MOC racine `000_HOME.md` liste toutes les notes de premier niveau
- Chaque note se lie à ses voisines pertinentes dans une section `## Liens` en bas
- **Ne pas créer de note orpheline** (non référencée depuis 000_HOME ou une note liée)

---

## Convention prior / observed / validated

Pour les règles causales dans `gamedesign/lessons.md` :

| Statut | Signification |
|---|---|
| `prior` | Règle empruntée (recherche externe, post-mortem) — pas encore vérifiée sur nos jeux |
| `observed` | Vue sur un de nos jeux (playtest, télémétrie) — evidence_n > 0 |
| `validated` | Confirmée sur ≥ 2 titres ou N sessions avec données cohérentes |
| `invalidated` | Infirmée par les données réelles — **ne pas effacer, marquer + raison** |

Format standard pour chaque règle :
```
**Statut** : `prior|observed|validated|invalidated`
**evidence_n** : 0 (nombre de jeux internes où ça a été mesuré)
**Métrique delta** : (si connue)
```

---

## Cadence de mise à jour

**Tâche planifiée : dimanche 18h** (tâche scheduled dans la session Cowork)

Revue hebdomadaire en ~15 min :
1. `projects/snake-survivor-genesis.md` — phase, métriques WL/ventes, verdict playtest
2. `decisions/decision-log.md` — toute décision HumanGate de la semaine
3. `gamedesign/lessons.md` — promouvoir un prior en observed si session de jeu
4. `state/` — créer un snapshot si l'état change significativement
5. `000_HOME.md` — mettre à jour le dashboard rapide (phase, WL, prochaine étape)
6. `reference/sources-of-truth.md` — mettre à jour si un nouveau fichier source créé

---

## Règles de rédaction

- **Notes atomiques** : une note = un sujet. Pas de fourre-tout.
- **Distillé, pas brut** : jamais coller un LLM output verbatim. Extraire, reformuler, valider.
- **Actable** : chaque note doit répondre à "donc, qu'est-ce qu'on fait ?" ou "où lire ça ?"
- **Pas de duplication** : si l'info est dans le repo, mettre un lien vers le fichier — pas copier.
- **Longueur** : notes courtes préférées. Si > 200 lignes, découper.

---

## DON'Ts absolus

- **Jamais** modifier `IMPROVEMENT_LEDGER.yaml` depuis ce vault — passer par `kaizen_loop.py`
- **Jamais** supprimer `golden_examples.jsonl`
- **Jamais** stocker un output LLM brut comme un fait (toujours labelliser comme "prior" non validé)
- **Jamais** git commit/push depuis le vault sans demande explicite Pierre
- **Jamais** marquer une note comme source de vérité si l'oracle est dans le repo (pointer vers le repo)
- **Ne pas créer** des stubs vides — mieux vaut une note courte utile qu'un placeholder

---

## Liens
- [[../000_HOME|Home MOC]]
- [[../workflow/studio-operating-flow|Studio Operating Flow]]
- [[../reference/sources-of-truth|Sources de Vérité]]
