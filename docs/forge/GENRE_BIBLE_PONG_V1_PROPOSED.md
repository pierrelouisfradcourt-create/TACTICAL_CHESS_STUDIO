---
genre_tags: ["arcade", "sports-1v1", "temps-reel", "reflexe", "session-courte"]
mood_keywords: ["reactif", "lisible", "rejouable", "juste"]
status: PROPOSED
scope: pong
schema_version: 1
---

# GENRE BIBLE — Pong (v1, PROPOSED)

Date : 2026-07-27 · Mission : `scripts/forge/contracts/p1-lignes-wiremap-et-genre-bible.yaml`
(action 3) · Statut : **PROPOSED**, première Genre Bible du studio. Aucune promotion vers
`knowledge_base/**` n'a été faite (décision Pierre, hors périmètre de cette mission).

`claim_verdict: NO_CLAIM_ALLOWED` · `evidence_verdict: MECHANICAL_VALIDATION_ONLY`.

**Patron répliqué** : `scripts/forge/contracts/s2.5-artbible.yaml` (Art Bible), le seul patron de
bible éprouvé du studio. Correspondance de structure :

| Art Bible | Genre Bible (ce document) |
|---|---|
| frontmatter `{styles[], mood_keywords[]}` | frontmatter `{genre_tags[], mood_keywords[]}` (adapté — pas de clé `styles` prescrite par un oracle de genre, qui n'existe pas encore, cf. §4) |
| `## 1. IDENTITÉ VISUELLE` | `## 1. IDENTITÉ DE GENRE` |
| `## 2. RATIONALE` | `## 2. RATIONALE` |
| `## 3. BESOINS VISUELS` (bloc JSON `visual_requirements`) | `## 3. RÈGLES DE GENRE` (bloc JSON `genre_rules` + `hypotheses`) |
| couverture besoin↔requête (`check_artbible.mjs`) | couverture règle↔ligne wiremap (§4 — **mécanisme décrit, oracle non écrit**, cf. garde-fou) |
| statistique advisory de résolution | statistique advisory de sourçage (§5) |

---

## 1. IDENTITÉ DE GENRE

Pong (référence historique : Atari, 1972) est un jeu d'arcade sportif 1 contre 1, en temps réel,
à base de réflexe : deux raquettes verticales, une balle qui rebondit, un score qui tranche.
La session est courte (quelques minutes), le geste est simple (un axe de déplacement), et
l'intérêt tient entièrement à la lisibilité immédiate de l'état (où est la balle, qui mène,
qui a gagné) et à un rythme qui laisse le temps de réagir sans devenir mou.

## 2. RATIONALE

Cette bible existe parce que le studio a mesuré, sur ce projet précis, l'écart entre « mécanique
prouvée » et « expérience jouable » (cf. `docs/forge/PROPOSITION_LIGNES_JOUABILITE_PONG.md`,
`lab/reports/error_journal/playtest.jsonl`) : un Pong dont l'oracle mécanique est vert peut être
injouable (vitesse), invalidable en solo (pas d'IA), et illisible (pips, pas d'écran de fin).
Le rôle de cette bible est de porter, **avec leur provenance**, les règles de genre qui
permettent de distinguer une mécanique correcte d'une expérience conforme au genre visé — pour
que la prochaine ligne de wiremap qui cite `play.playable_speed` ou `play.solo_opponent` ait une
source à citer plutôt qu'un chiffre sorti de nulle part.

## 3. RÈGLES DE GENRE

Discipline appliquée (garde-fou de mission) : chaque règle porte `{source, date, confiance}` ou
est déplacée dans `hypotheses` si elle ne peut pas être sourcée honnêtement. Aucune référence,
étude ou citation n'a été inventée pour ce document.

```json
{
  "genre_rules": [
    {
      "id": "genre.pong.two_paddles_vertical",
      "statement": "Deux raquettes deplacables verticalement, bornees par le haut et le bas de l'aire de jeu.",
      "applies_to_wiremap_line": "play.paddle",
      "source": "Reference deja portee par games/pong/09_WIREMAP/wiremap.json, ligne play.paddle (source_role: charter) : 'Pong (Atari, 1972) : deux raquettes deplacables verticalement...' -- reprise ici, pas une nouvelle recherche.",
      "date": "reference non datee a la ligne ; jeu original de 1972, notoriete publique",
      "confiance": "haute"
    },
    {
      "id": "genre.pong.continuous_ball_rebound",
      "statement": "Une balle en mouvement continu, rebondissant sur les bords horizontaux et sur les raquettes, sans jamais traverser.",
      "applies_to_wiremap_line": "play.ball",
      "source": "Reference deja portee par wiremap.json, ligne play.ball (source_role: charter).",
      "date": "reference non datee a la ligne ; jeu original de 1972, notoriete publique",
      "confiance": "haute"
    },
    {
      "id": "genre.pong.score_visible_on_exit",
      "statement": "Un point est marque quand la balle sort du cote adverse ; le score est affiche de facon lisible par le joueur.",
      "applies_to_wiremap_line": "play.score",
      "source": "Reference deja portee par wiremap.json, ligne play.score (source_role: charter). Le mot 'affiche' y figurait deja mais sans preuve observable -- cf. WIREMAP_PONG_V2_PROPOSITION_FINALE.md 2.2, c'est exactement le trou que cette regle documente.",
      "date": "reference non datee a la ligne ; jeu original de 1972, notoriete publique",
      "confiance": "haute"
    },
    {
      "id": "genre.pong.solo_mode_expected",
      "statement": "Un jeu 1v1 doit exposer un mode ou un seul joueur humain peut valider/pratiquer le jeu contre un adversaire automatique, distinct de tout bot de test interne.",
      "applies_to_wiremap_line": "play.solo_opponent",
      "source": "Observation directe de playtest, Pierre, run_id playtest-2026-07-27 (lab/reports/error_journal/playtest.jsonl, entree 3).",
      "date": "2026-07-27",
      "confiance": "moyenne (observation directe et datee, mais echantillon n=1 session de playtest, pas une enquete de genre externe)"
    },
    {
      "id": "genre.pong.readable_score_and_end_state",
      "statement": "L'etat decisif (score, victoire/defaite) doit etre lisible par un joueur en un coup d'oeil : chiffres plutot que pips seuls, etat final explicite, relance offerte.",
      "applies_to_wiremap_line": "play.score / core.end_condition / core.restart",
      "source": "Observation directe de playtest, Pierre, run_id playtest-2026-07-27 (lab/reports/error_journal/playtest.jsonl, entree 4).",
      "date": "2026-07-27",
      "confiance": "moyenne (observation directe et datee, echantillon n=1)"
    },
    {
      "id": "genre.pong.playable_speed_range",
      "statement": "La vitesse de service doit laisser un temps d'anticipation mesurable (cible actuelle : ball_crossing_time entre 1.0s et 1.5s) permettant plusieurs echanges.",
      "applies_to_wiremap_line": "play.playable_speed",
      "source": "Decision de Pierre, 2026-07-27 (contrat p1-lignes-wiremap-et-genre-bible.yaml + proposition intermediaire) -- PAS une reference de genre externe. A etayer par un World Scan non fait dans cette mission (hors perimetre : cette mission est redaction, pas recherche).",
      "date": "2026-07-27",
      "confiance": "faible -- valeur de design assumee, non encore verifiee contre des references externes (voir remarque garde-fou en fin de document)"
    }
  ],
  "hypotheses": [
    {
      "id": "hyp.pong.human_reaction_time",
      "statement": "Le temps de reaction visuo-moteur humain typique se compte en dizaines/centaines de millisecondes, ce qui motive une bande de vitesse jouable plutot qu'un seuil arbitraire.",
      "rationale": "Connaissance generale non sourcee precisement dans cette mission (pas de recherche externe effectuee) -- HYPOTHESE, a verifier par World Scan si on veut la citer comme fait plutot que comme intuition de design.",
      "confiance": "hypothese non verifiee ici"
    },
    {
      "id": "hyp.pong.rally_length_preference",
      "statement": "Les joueurs de Pong preferent des echanges qui durent plusieurs allers-retours plutot qu'un point immediat.",
      "rationale": "Plausible et coherent avec le rationale de play.playable_speed, mais aucune source (etude, forum, wiki) n'a ete consultee dans cette mission pour l'etayer -- HYPOTHESE.",
      "confiance": "hypothese non verifiee ici"
    }
  ]
}
```

### 3.1 Provenance corrigée — formats imposés par Pierre (2026-07-27)

Correction demandée par Pierre sur la règle `genre.pong.playable_speed_range` (le texte libre
`source`/`date`/`confiance` du bloc JSON ci-dessus restait imprécis) : les deux formats suivants,
appliqués au caractère près, en remplacent la provenance normative.

Provenance générale (toute règle sourcée par décision plutôt que par référence de genre externe) :

```yaml
source:
  type: decision
  author: Pierre
  date: 2026-07-27
  status: HYPOTHESE_A_VALIDER
  validation: World Scan
```

Bloc spécifique à la valeur de vitesse jouable :

```yaml
playable_speed_range:
  value: "1.0-1.5s"
  status: HYPOTHESE
  provenance: "décision Pierre 2026-07-27"
  validation_required: "World Scan"
```

Ces deux blocs sont la provenance de référence pour `genre.pong.playable_speed_range` à partir de
cette version du document. Le champ `source` en texte libre du bloc JSON du §3 est conservé tel
quel (aucun oracle ne lit `genre_rules` aujourd'hui, cf. §4 — le convertir en objet casserait
l'homogénéité du tableau sans bénéfice mécanique), mais il doit être lu comme une paraphrase de
ces deux blocs normatifs, pas comme une provenance concurrente. Règle rappelée : aucune référence
de genre n'a été inventée ici ; cette règle reste marquée `HYPOTHESE` tant qu'un World Scan ne l'a
pas étayée.

## 4. COUVERTURE — mécanisme décrit, PAS ENCORE OUTILLÉ

Sur le patron `check_artbible.mjs` (couverture besoin visuel ↔ requête d'asset), la couverture
attendue ici serait : **chaque `genre_rules[].id` doit être cité par `applies_to_wiremap_line`
sur une ligne réellement présente dans `wiremap.json`, ou explicitement écarté dans
`discarded[]`** — jamais silencieusement ignoré. Table de couverture actuelle (vérifiée à la
main, pas par un script — aucun `check_genrebible.mjs` n'existe, cf. garde-fou de mission
`out_of_scope: scripts/forge/**`) :

| `genre_rules[].id` | Ligne wiremap citée | Existe dans `wiremap.json` aujourd'hui ? |
|---|---|---|
| `genre.pong.two_paddles_vertical` | `play.paddle` | Oui (IMPLEMENTED) |
| `genre.pong.continuous_ball_rebound` | `play.ball` | Oui (IMPLEMENTED) |
| `genre.pong.score_visible_on_exit` | `play.score` | Oui — proposée REQUIRED dans `WIREMAP_PONG_V2_PROPOSITION_FINALE.md` §2.2 |
| `genre.pong.solo_mode_expected` | `play.solo_opponent` | Proposée (nouvelle, §1.1 du même document) |
| `genre.pong.readable_score_and_end_state` | `play.score`/`core.end_condition`/`core.restart` | Proposées (§2.2/2.3/2.4) |
| `genre.pong.playable_speed_range` | `play.playable_speed` | Proposée (nouvelle, §1.2) |

**6/6 règles sont couvertes** par une ligne de wiremap existante ou proposée dans le document
compagnon — aucune règle orpheline. Ceci est une vérification manuelle documentée, pas un
verdict d'oracle : `evidence_verdict: MECHANICAL_VALIDATION_ONLY` s'applique à la validation JSON
(§5), pas à cette table de couverture qui reste une lecture croisée humaine.

**Ce qu'il manque pour que ce soit réellement outillé** (signalé, non fait — hors périmètre) : un
`check_genrebible.mjs` qui (a) valide la forme du bloc `genre_rules`/`hypotheses` (b) vérifie que
chaque `applies_to_wiremap_line` désigne une ligne réelle de la wiremap du jeu ciblé (c) sépare
`FAIL` (forme invalide) de `BLOCKED` (règle non couverte) de `OK`, à l'image de
`check_artbible.mjs`. Ce script n'existe pas ; l'écrire est une modification de
`scripts/forge/**`, explicitement hors périmètre de cette mission de rédaction.

## 5. STATISTIQUE ADVISORY (séparée de tout pass/fail)

- Règles sourcées avec `{source, date, confiance}` renseignés : **6 / 6**.
- Dont provenance *externe au studio* (référence de genre indépendante, pas une décision interne
  ni une observation de cette seule session) : **3 / 6** (`two_paddles_vertical`,
  `continuous_ball_rebound`, `score_visible_on_exit` — et ce sont en réalité des références déjà
  présentes dans le dépôt, pas une recherche nouvelle de cette mission).
- Dont provenance = observation de playtest (n=1, datée, mais interne au studio) : **2 / 6**
  (`solo_mode_expected`, `readable_score_and_end_state`).
- Dont provenance = décision de design assumée, non étayée par une source externe : **1 / 6**
  (`playable_speed_range` — voir remarque §6).
- Hypothèses explicitement marquées, non intégrées comme règles : **2** (`human_reaction_time`,
  `rally_length_preference`).
- Règles couvertes par une ligne de wiremap (existante ou proposée) : **6 / 6** (§4).

Cette statistique est **advisory** : elle ne bloque ni n'autorise rien mécaniquement (aucun
oracle ne la lit aujourd'hui) — elle sert à ce que Pierre voie d'un coup d'œil la solidité réelle
du sourçage avant de ratifier.

## 6. Remarque sur la provenance auto-référentielle (garde-fou de mission, point 3)

L'exemple imposé par Pierre pour `play.playable_speed` porte `source: "Genre Bible Pong"`. Une
fois cette bible écrite, une ligne de wiremap qui citerait `source: "Genre Bible Pong"` pointerait
vers **ce document-ci** — qui, pour la règle `playable_speed_range`, ne cite lui-même aucune
source externe, seulement « décision de Pierre 2026-07-27 ». La chaîne de provenance se
refermerait donc sur elle-même : bible → wiremap → bible, sans jamais toucher une référence
indépendante. Ce n'est pas nécessairement un problème définitif (une décision de design assumée
et datée EST une provenance légitime, au sens où on sait qui a décidé et quand — ce n'est
simplement pas une preuve de genre externe) ; mais je le signale explicitement plutôt que de le
masquer derrière la formule de l'exemple. **Proposition, non tranchée** : soit (a) Pierre confirme
que « décision de Pierre, datée » est une provenance suffisante pour cette règle précise et
l'auto-référence n'a pas besoin d'être résorbée, soit (b) un World Scan futur remplace
`playable_speed_range.source` par une référence de genre externe réelle, et la bible cesse d'être
partiellement auto-référentielle sur ce point.

**Mise à jour (mission `q1-application-decisions-pierre`, 2026-07-27)** : Pierre a tranché le
format de la provenance (§3.1, deux blocs YAML exacts) sans trancher (a)/(b) ci-dessus — les deux
blocs marquent explicitement `status: HYPOTHESE_A_VALIDER` / `status: HYPOTHESE` et
`validation`/`validation_required: World Scan`, ce qui revient à choisir (b) en différé : la
provenance reste une décision assumée jusqu'à ce qu'un World Scan la remplace ou la confirme.
L'auto-référence décrite ci-dessus n'est donc pas résorbée par cette mission — seule sa forme est
maintenant normalisée.

---

## Décision attendue (gate)

Ratifies-tu (a) la structure de cette Genre Bible (patron Art Bible adapté, §0 tableau de
correspondance), (b) les 6 règles de genre et leur provenance telle que déclarée (§3/§5), (c) le
traitement de la remarque auto-référentielle (§6 — trancher (a) ou (b), ou laisser en l'état) ?
