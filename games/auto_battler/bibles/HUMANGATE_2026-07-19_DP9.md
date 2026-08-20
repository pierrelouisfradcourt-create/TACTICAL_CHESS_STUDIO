<!-- GATE HUMAIN — ratification de Pierre, collée en session le 2026-07-19. VERBATIM, JAMAIS RÉÉCRIT. Source autoritaire pour l'ajout de DP-9 dans 03_DECISION_BIBLE.md (document VERROUILLÉ — toute modification y repasse par HumanGate). Contexte : 05_ECONOMY_BIBLE.md (ligne "À enregistrer", §Points de décision) signale que la politique de Bench plein (QE-7, déjà ratifiée gate #3) crée un site de décision automatique du moteur (refus de Buy) qui doit être enregistré sous un DP-n AVANT implémentation, sous peine de violer DEC-1 (site de décision sans DP-n = défaut fail-hard). Aucun DP-9 n'existait avant ce gate. -->

bench plein pas de buy

---

## Traduction en contrat (par l'orchestrateur, à ratifier implicitement par l'exécution)

Ce n'est pas un nouveau choix de design : QE-7 (gate #3, 2026-07-18) avait déjà tranché
« Bench plein → Buy REFUSÉ, aucune destruction automatique ». Ce gate formalise
uniquement l'ENREGISTREMENT du site de décision correspondant, exigé par DEC-1 avant que
le moteur ne l'implémente.

- **Déclencheur** : Input `Buy` reçu pendant la Preparation State, Bench du Player à
  capacité pleine (paramètre déclaré ECO-7, valeur Balance Bible).
- **État lu** : occupation du Bench du Player (nombre d'UnitInstances vs capacité
  déclarée).
- **Sortie** : rejet déterministe de l'Input `Buy` — aucun débit de Gold, aucun débit du
  Pool, aucune Unit détruite (QE-7). L'Input est enregistré au journal comme rejeté
  (INV-4), au même titre qu'un Input hors liste (INV-13) — mais ici l'Input EST dans la
  liste close, seul son EFFET est refusé pour cause d'état (distinct d'INV-13).
- **Ordre total** : binaire, sans ambiguïté — Bench plein (capacité atteinte) → refus ;
  sinon → transaction normale (débit Pool au Buy, QE-2). Aucun ex æquo possible, donc
  aucun recours à la TieBreakChain.
- **Aucune exception ratifiée** (rappel ECO-7) : une exception « l'achat complète un
  Merge » n'existe pas — en ajouter une serait une règle nouvelle, gate séparé.
- **Propriétaire des valeurs** : Economy Bible (schéma du refus) · Balance Bible
  (capacité chiffrée du Bench, ECO-7).
