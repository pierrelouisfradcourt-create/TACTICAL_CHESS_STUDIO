# Gabarit commun des bibles système — Auto Battler

**Date** : 2026-07-18 · **Source** : session Pierre × Claude · **Statut** : RATIFIÉ
Toutes les bibles système (2 à 12) suivent EXACTEMENT cette structure, dans cet ordre.
Une section sans contenu reste présente avec la mention « Néant — <raison> ».

```text
# Objectif
Ce que cette bible gouverne, en quelques lignes. Ce qu'elle ne gouverne PAS (renvois).

# Invariants
Les propriétés toujours vraies, numérotées (INV-1, INV-2…). Chacune doit être falsifiable.

# Concepts
Les notions introduites par ce système. Chaque terme renvoie à 00_VOCABULARY.md.

# Paramètres
Valeurs de référence et bornes (nom, valeur, unité, propriétaire de la décision).

# Points de décision
Chaque choix automatique du système, avec son ordre total (renvoi Decision Bible).

# Flux
Les séquences (diagrammes texte). Ordre d'exécution figé.

# Événements
Les événements émis vers l'Event Log (nom, payload, quand). Vocabulaire fermé.

# Oracle Hooks
Comment vérifier mécaniquement chaque invariant (consommé par la Oracle Bible).

# Simulation Hooks
Quelles métriques ce système expose aux campagnes (consommé par la Simulation Bible).

# DSL Hooks
Ce que le DSL est AUTORISÉ à modifier dans ce système. Tout le reste est fermé.

# Human Notes
Jugement, intentions, feel — ce qui relève de Pierre et pas d'un oracle.
```
