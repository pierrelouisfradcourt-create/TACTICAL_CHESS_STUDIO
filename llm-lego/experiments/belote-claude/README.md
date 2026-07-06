# Belote (Claude) — artefact expérimental

Jeu de **Belote classique** fonctionnel (4 joueurs, 2 équipes, 32 cartes), écrit en
JavaScript pur (Node ≥ 22, aucune dépendance). Produit PAR le système llm-lego dans le
cadre d'un « laboratoire de méthode » — **ne fait pas partie du moteur du builder**
(`src/` du builder reste intact).

## Lancer

```bash
node --test                 # 30 tests (cartes, deal, règles, scoring, enchère, moteur)
node cli.mjs --seed 3 --target 501            # partie auto-jouée, résumé lisible
node cli.mjs --seed 7 --target 301 --verbose  # + détail pli par pli
```

## Ce qui est implémenté

- Jeu de 32 cartes, barèmes atout / non-atout, ordre de force (invariant 162 testé).
- Distribution belote en deux temps (5 cartes + retournée + complément à 8).
- Enchère 2 tours (prise de la retournée / couleur libre) avec IA heuristique.
- **Toutes les obligations de jeu** : fournir, monter à l'atout, couper / surcouper
  l'adversaire, liberté si le partenaire est maître.
- Décompte complet : points cartes, **dix de der**, **belote-rebelote (+20)**, contrat
  (chute sous 82 → défense encaisse 162), **capot (250)**.
- Partie complète jusqu'à une cible (501 par défaut), déterministe par `seed`.

## Ce qui est volontairement HORS périmètre

Voir `JOURNAL_ERREURS.md` (E5, E6) : annonces (tierce/cinquante/carré) non implémentées ;
mode humain interactif non fourni (auto-play IA uniquement). Choix documentés.

## Structure

```
src/cards.mjs      cartes, barèmes, ordres de force
src/deal.mjs       mélange déterministe + distribution 2 temps
src/rules.mjs      coups légaux (obligations) + gagnant de pli + belote
src/scoring.mjs    décompte d'une donne (contrat / belote / der / capot)
src/bidding.mjs    enchère (choix preneur + atout)
src/game.mjs       moteur : pli / donne / partie + IA légale
cli.mjs            partie jouable en ligne de commande
test/*.test.mjs    30 tests node:test
tools/wm-feed.mjs  alimentateur EN DIRECT du Wire Map "belote" (méthode)
```
