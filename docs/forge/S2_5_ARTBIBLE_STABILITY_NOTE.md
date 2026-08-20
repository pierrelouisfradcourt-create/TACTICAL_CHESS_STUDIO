# s2.5-artbible — note de stabilité (2 runs réels)

> **Date** : 2026-07-14
> **Statut** : sonde qualitative, **n=2** — pas une claim statistique. Conforme à la
> discipline du studio (sonde-contrôle avant conclusion, jamais de tuning post-hoc).
> `claim_verdict: NO_CLAIM_ALLOWED`.

## Contexte

Demande Pierre : ajouter un deuxième smoke réel avec une entrée différente, vérifier
que l'agent produit une bible différente mais toujours conforme, mesurer la stabilité
du contrat. Deux runs réels du contrat `scripts/forge/contracts/s2.5-artbible.yaml`
(`claude -p`, Opus, hors ForgeDriver — cf. note "INTÉGRATION CHAÎNE" du contrat).

Le run #2 n'a pas été choisi au hasard : `breakout` déclare explicitement dans son
`product_snapshot.md` (§1, §3) un rendu **100% primitives canvas, zéro asset externe**
— une contrainte que le prompt du run #2 ne mentionne PAS (pour ne pas biaiser
l'agent). Ce run teste donc la branche `no_assets_needed: true` du schéma, jamais
exercée par le run #1 — un test de **fidélité** à la source, pas juste "un autre jeu".

## Comparatif

| | Run #1 | Run #2 |
|---|---|---|
| `run_id` | `artbible_smoke-20260714` | `artbible_smoke2-20260714` |
| Entrée réelle | `lab/forge_runs/collect_runner/product_snapshot.md` (runner à sprites) | `lab/forge_runs/breakout/product_snapshot.md` (primitives canvas uniquement) |
| Modèle | claude-opus-4-8 | claude-opus-4-8 |
| Coût réel | 1.24 USD | 0.95 USD |
| Durée réelle | 173 s | 120 s |
| Tokens | 10 403 | 6 044 |
| `frontmatter.styles` | `[flat-arcade, flat-ui]` | `[flat-primitive, hud-flat]` |
| `no_assets_needed` | `false` | `true` |
| `requests` | 6 (3 sprite, 3 icon) | 0 |
| `check_artbible.mjs` (vérif. indépendante) | `pass:true`, 0 finding | `pass:true`, 0 finding |
| Resolution advisory vs catalogue réel | 0 OK / 6 BLOCKED | 0/0/0 (branche skip, correcte) |

Preuves : [lab/forge_runs/artbible_smoke/](../../lab/forge_runs/artbible_smoke/),
[lab/forge_runs/artbible_smoke_2/](../../lab/forge_runs/artbible_smoke_2/) (art_bible.md,
asset_requests.json, reçu `claude -p` complet).

## Observations

1. **Conformité structurelle 2/2**, vérifiée indépendamment (pas le self-report de
   l'agent — `check_artbible.mjs` relancé par l'humain/l'orchestrateur sur les deux
   livraisons). Le format de sortie (frontmatter + 2 sections + schéma JSON) tient sur
   deux entrées de nature différente (jeu à sprites vs jeu à primitives).
2. **Le contenu diffère réellement et correctement**, pas un gabarit recopié : le
   run #1 cite R7/R8 (collecte/collision) du snapshot collect_runner ; le run #2 cite
   R8/R13/R16 (score par brique, victoire par comptage, overlay) du snapshot breakout —
   chaque rationale s'ancre sur les règles du BON produit.
3. **La branche `no_assets_needed: true` est correctement déclenchée** sur le cas où
   c'est objectivement la bonne réponse, sans que le prompt ne le suggère — l'agent a
   lu la contrainte "aucun asset externe" dans le product_snapshot lui-même. Signal
   positif contre le gaming réflexe du schéma (pas de remplissage artificiel de
   `requests` juste parce que le champ existe).
4. **Coût/durée varient de façon plausible** avec la complexité de la tâche (run #2,
   sans requêtes à énumérer, est ~30% moins cher et plus rapide) — cohérent, pas un
   signe d'instabilité.
5. **Style non réutilisé par erreur** : run #2 n'a pas repris `flat-arcade`/`flat-ui`
   du run #1 malgré un contexte de session partagé au niveau du repo (aucune fuite de
   contexte entre les deux appels `claude -p`, chacun en contexte vierge).

## Limite (honnête, non corrigée)

**n=2** ne permet aucune inférence statistique sur le taux de conformité réel du
contrat — seulement une absence d'échec observée sur 2 échantillons choisis pour
couvrir les deux branches du schéma (`no_assets_needed` true/false). Une mesure de
stabilité au sens fort (taux de pass sur un échantillon significatif, variance du
style entre runs sur la MÊME entrée) resterait à faire si le contrat est promu dans
`dispatch.py` PROFILES.
