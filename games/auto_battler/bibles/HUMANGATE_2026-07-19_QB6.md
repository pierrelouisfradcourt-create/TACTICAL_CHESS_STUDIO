<!-- GATE HUMAIN — ratification de Pierre, collée en session le 2026-07-19. VERBATIM, JAMAIS RÉÉCRIT (règle studio). Source autoritaire pour l'intégration de QB-6 (anéantissement mutuel au même Tick) dans 04_COMBAT_BIBLE.md. Question posée par le corpus : les DEUX camps sans Unit vivante au même Tick (T10, cas 2) — quelle résolution ? -->

QB-6 match nul pas de perte de pv

---

## Traduction en contrat (par l'orchestrateur, à ratifier implicitement par l'exécution)

- **Déclencheur** : phase T10, cas (2) — les DEUX camps sans Unit vivante (Health > 0) au même Tick, AVANT `tick_limit`.
- **Résolution ratifiée** : Match nul (DRAW). Aucun des deux Players ne perd de `Life` sur ce round (ni l'un ni l'autre — symétrique, pas de vainqueur, pas de perdant).
- **Distinction avec DP-7** : reste un fork séparé de la résolution d'égalité au `tick_limit` (DP-7 produit toujours un vainqueur unique via la TieBreakChain, cf. §DP-7 — ne consomme jamais `rng_state`). QB-6 est l'anéantissement mutuel AVANT `tick_limit` : aucun vainqueur, aucune perte de Life, cas structurellement distinct.
- **Point non couvert par ce verbatim, à remonter séparément si besoin** : le nom/valeur exacte du champ `resolution_kind` du payload `CombatResult`/Event Victory pour ce cas (ex. `"draw"` ou `"mutual_annihilation"`) — c'est un détail structurel *(dérivé)*, pas une question de design ; proposé `"draw"` par cohérence avec le vocabulaire « match nul », à confirmer à l'intégration DSL/Technical si un nom différent est préférable.
