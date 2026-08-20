# Rapport Red-Team du PLAN — card_engine-20260720a (s6)

Mode : CLAUDE-BLIND. Attaquant indépendant, aucun contexte d'auteur. Matériau : artefacts
sur disque (`charter.yaml`, `product_snapshot.md`, `featuremap.json`, `knowledge_packet.json`,
`blueprint.yaml`, `wiremap.json`, `wiremap_frozen.json`) + vérification directe du golden
`llm-lego/experiments/belote-claude/src/**` et `test/**`. Cible = le PLAN (archi + wiremap),
JAMAIS les tests/oracles. Les diffs proposés sont TEXTUELS : le jeu de règles (blueprint/wiremap)
est GELÉ — toute modification est une décision humaine.

Méthode : chaque affirmation du plan (noms de fonction, constantes, ordre RNG, structure des
mains, ordre des joueurs, pickup) a été confrontée au code publié réellement présent sur disque.

---

## Table des failles

| # | Angle | Faille | Gravité |
|---|-------|--------|---------|
| F1 | 1 Parité | La « parité prouvée contre belote-claude » ne couvre que 3 fonctions pures (legalMoves/trickWinner/scoreDeal) ; toute la couche stochastique + orchestration n'a AUCUNE parité golden | HIGH |
| F7 | 3 Frontière | L'oracle de constantes s10b (`32\|82\|162\|152\|250`) est aveugle à la topologie Belote (4 joueurs, 2 équipes, 8 plis) — vérifié par grep du golden | HIGH |
| F6 | 3 Frontière | `core/shoe.pickup` fera fuiter le `% 2` / `[[],[]]` 2-équipes de la Belote dans le core si porté tel quel | HIGH |
| F2 | 1 Parité | Le golden renvoie `{player, card}` et nomme `player` ; le wiremap gèle `{seat}` — la couche de normalisation de parité est non spécifiée (strict = toujours rouge, lâche = théâtre) | MED-HIGH |
| F4 | 2 Tarot | Le stub prouve l'hypothèse nulle d'extensibilité : R15 « démontré » sans exercer un seul pitfall Tarot (specials, ½-points, équipes asymétriques) | MED |
| F5 | 2 Tarot | `assertRulesAdapter`/`assertScoreAdapter` shape-only rendraient le « contrat honoré » creux (présence de méthodes ≠ post-conditions) | MED |
| F8 | 4 WireMap | `scoreDeal` porte 3 features gelées (R8+R12+R9) + réutilisé par `belote_game` — mutation gate diluée là où vit la logique la plus risquée | MED |
| F9 | 4 WireMap | `beloteTeam`/`beloteHolder` (détection R9), `handStrength`, `compareAnnonce`, `eldestOrder`, `chooseMove` : fonctions porteuses SANS ancre gelée → angle mort mutation | MED |
| F3 | 5 Déterminisme | Fragilité d'ordre RNG : redonne consomme une coupe supplémentaire + donneur tourne AVANT le test de redonne — sous-spécifié dans `belote/game` | MED |
| F11 | 5 Déterminisme | « Un seul flux RNG » n'est pas falsifiable par le seul test de replay (le replay passe avec N flux seedés) — trace de flux à hisser au niveau partie | MED |
| F10 | 4 WireMap | Divergence de noms snapshot↔wiremap (`runBidding`→`runAuction`, `{player}`→`{seat}`) à réconcilier pour le mapping parité | LOW-MED |
| F12 | 2 Tarot | `reassignCapture` / `bonusHooks` / `completeDeal`-écart : hooks no-op jamais exécutés en V0 ni par le stub → slots morts non prouvés | LOW-MED |

Compte : **3 HIGH · 6 MED (dont 1 MED-HIGH) · 3 LOW-MED**.

---

## Détail des failles + corrections proposées

### F1 — HIGH — « Parité prouvée » ne couvre que 3 surfaces pures (angle 1)
**Constat vérifié.** Les seules features de parité du wiremap sont `harness_parity_legal_moves`
(R6), `harness_parity_trick_winner` (R7), `harness_parity_deal_score` (R8). Or le charter (l.14-16,
43-48) et le product_snapshot (l.6-8) posent en TÊTE que « la correction de BeloteRules est prouvée
par PARITÉ contre le produit publié ». Toute la couche à risque — `shuffle`/`cut`/`pickup`
(`src/shoe.mjs`, `src/deal.mjs`), la distribution 3-2 + retournée (`src/deal.mjs deal/completeDeal`),
l'enchère (`src/bidding.mjs runBidding`), les annonces (`src/annonces.mjs`), et surtout la
TRAJECTOIRE DE PARTIE (`src/game.mjs playGame`) — n'a AUCUN golden de parité. Sa « correction »
repose uniquement sur des invariants internes + auto-replay (R13/R14), pas sur l'égalité avec le
produit publié. Un CardEngine dont le shuffle, la coupe ou la boucle de partie divergeraient
entièrement de belote-claude passerait tous les tests de parité.
**Correction (bloquante — reformulation OU extension) :**
- Option A (honnête, peu coûteuse) : SCOPER le claim. Le charter/snapshot doivent dire « parité
  prouvée sur {coups légaux, gagnant de pli, décompte de manche} ; les couches donne/enchère/
  annonces/orchestration sont prouvées par invariants internes + auto-replay, PAS par parité ».
- Option B (couverture réelle) : ajouter au corpus `harness/goldens/` au moins un golden de
  TRAJECTOIRE — `playGame({seed:S})` de belote-claude sérialisé (hands donne 1, atout, preneur,
  suite des `winner`, score final) — et un `harness_parity_game_trajectory` qui l'égale champ à
  champ. C'est le seul golden qui attrape une divergence de shuffle/cut/pickup/boucle.
- Ajouter aussi des goldens de parité pour `runBidding` (R5) et `resolveAnnonces` (R10/R11), aujourd'hui
  prouvés seulement par fixtures auto-écrites côté CardEngine.

### F7 — HIGH — L'oracle de constantes s10b est aveugle à la topologie (angle 3)
**Constat vérifié par grep du golden.** L'invariant blueprint (l.462-464, 494) déclare le core
content-agnostic « vérifiable par grep (oracle s10b) », mais la liste de grep est
`32|82|162|152|250|barèmes`. Or TOUTE la structure Belote vit dans des motifs ABSENTS de cette liste :

```
src/rules.mjs:5    export const teamOf = (p) => p % 2;         // 2 équipes
src/rules.mjs:6    export const partnerOf = (p) => (p + 2) % 4; // partenaire = +2, 4 joueurs
src/deal.mjs:30    return [1, 2, 3, 0].map((o) => (dealer + o) % 4);
src/game.mjs:33    for (let i = 0; i < 4; i++) {                // 4 sièges par pli
src/game.mjs:34    const p = (leader + i) % 4;
src/game.mjs:85    dealer = (dealer + 1) % 4;
src/game.mjs:87    pickup(d.tricks, d.taker % 2);
src/shoe.mjs:29    const piles = [[], []];                      // 2 équipes en dur
src/shoe.mjs:31    const team = t.winner % 2;
```

Aucun de `% 2`, `% 4`, `(p+2)%4`, `[[], []]`, `p < 4`, `i < 8` n'est capté par
`32|82|162|152|250`. Donc « core content-agnostic, seatCount/trickCount lus de l'adaptateur, aucun
4 ni 8 en dur » (invariants_archi l.507, 524) est une garantie **sans oracle** : elle repose sur la
discipline du builder + revue humaine, PAS sur le gate déterministe annoncé. `core/trickplay`
peut hard-coder `% 4` / `< 8` et l'oracle s10b restera vert.
**Correction (bloquante) :** ajouter à l'oracle s10b un grep STRUCTUREL scopé `games/card_engine/core/**` :
motifs `%\s*2`, `%\s*4`, `\[\[\s*\]\s*,\s*\[\s*\]\]`, `<\s*4\b`, `<\s*8\b`, `\+\s*2\)\s*%`, littéraux
`seatCount`/`trickCount`/`teamCount` assignés à une constante. (Le 4/8 est légitime AILLEURS ; le
grep doit rester scopé `core/**`.) Sans ce gate, l'invariant-phare du plan est déclaratif.

### F6 — HIGH — `core/shoe.pickup` fera fuiter la structure 2-équipes (angle 3)
**Constat vérifié.** Le golden `pickup(tricks, takerTeam)` (`src/shoe.mjs` l.28-36) est
intrinsèquement 2-équipes / 4-joueurs : `piles = [[], []]`, `team = t.winner % 2`,
`piles[takerTeam].concat(piles[defTeam])`. Le blueprint place pickup dans **core/shoe** (l.138-153)
« recomposition paramétrique par ordre d'équipes ». Si le builder porte le golden tel quel, le
`% 2` et le `[[],[]]` 2-équipes atterrissent dans le core — et par F7 l'oracle ne le voit pas.
**Correction (bloquante) :** figer dans le blueprint la signature générique de pickup :
`pickup(tricks, { teamOf, teamOrder })` où `teamOf`/`teamOrder` sont FOURNIS par l'adaptateur ;
piles dimensionnées par `teamOrder.length` (jamais `[[],[]]`) ; l'ordre préneur-puis-défense
`teamOrder` vient de belote/game, pas du core. Alternative plus sûre : déplacer pickup HORS du
core vers `adapters/belote/` (c'est une convention de ramassage Belote, pas un substrat générique)
— à trancher en HumanGate car cela touche le blueprint gelé.

### F2 — MED-HIGH — Divergence de forme golden vs wiremap gelé (angle 1)
**Constat vérifié.** Le golden `trickWinner` (`src/rules.mjs` l.13-20) renvoie l'ENTRÉE complète
`{player, card}` (via `pool.reduce`), et tout le golden nomme le siège `player`. Le wiremap gèle
`trickWinner(trick, contract) -> { seat }` (blueprint l.510, wiremap `belote_rules_trick_winner`).
Donc : (a) champ renommé `player`→`seat`, (b) forme réduite `{player,card}`→`{seat}`. Le harnais
`harness_parity_trick_winner` doit NORMALISER (`golden.player` ↔ `ce.seat`, extraire `.player` de
l'entrée) — couche non spécifiée nulle part. Un `deepEqual` naïf serait TOUJOURS faux (formes
différentes) ⇒ goldens infalsifiables/rouges ; une comparaison lâche `== ` sur un seul entier peut
masquer des erreurs. De plus product_snapshot (l.148) et featuremap (l.49, 209, 309) disent encore
`{player}` alors que le wiremap gèle `{seat}` : incohérence interne snapshot↔wiremap.
**Correction (bloquante) :** spécifier explicitement dans `harness/parity` la fonction de
normalisation (mapping `player`↔`seat`, projection entrée→siège) et l'asserter comme bijection ;
réconcilier featuremap/snapshot sur `seat`. Sans cela, la parité R7 est soit théâtre soit toujours rouge.

### F4 — MED — Le stub prouve l'hypothèse nulle d'extensibilité (angle 2)
**Constat.** R15 est « démontré » par `stub/minimal` : un jeu « carte haute » trivial, paquet/
seatCount ≠ Belote, qui charge et satisfait les deux contrats. Mais AUCUN des 8 faits Tarot du
knowledge_packet n'est stressé : pas de `specials[]` (Excuse), pas de `cardValue` fractionnaire
(½-points), pas de `teamOf → null` (attaquant-vs-défenseurs), pas de `kitty`/`completeDeal`-écart.
Le stub trivial peut satisfaire les validateurs sans exercer un seul slot d'anticipation Tarot ⇒
R15 = théâtre d'extensibilité (le « au moins un point d'extension » du charter l.61-63 est rempli
par le slot le plus creux possible).
**Correction (recommandée, non bloquante si F5 corrigée) :** exiger que `stub/minimal` exerce au
moins 2 slots réels : (a) un `deckSpec.specials[]` non vide (une carte hors suit×rank qui CHARGE),
(b) une topologie non-2-équipes (`teamOf` renvoyant `null` ou 3 camps). Ainsi les slots specials +
équipes-asymétriques sont EXÉCUTÉS, pas seulement déclarés dans un typedef.

### F5 — MED — Validateurs de contrat shape-only = « contrat honoré » creux (angle 2)
**Constat.** `belote_index_satisfies_contracts` et `stub_minimal_non_belote_adapter` reposent sur
`assertRulesAdapter`/`assertScoreAdapter`. Si ces validateurs ne vérifient que la PRÉSENCE et
l'arité des méthodes, « le contrat est réellement honoré, pas seulement déclaré » (wiremap l.36) est
faux : n'importe quel objet aux bons noms passe.
**Correction (bloquante pour la crédibilité de R15) :** figer que les `assert*Adapter` vérifient des
POST-CONDITIONS comportementales sur un cas-sonde : `trickWinner` renvoie exactement un `seat ∈
[0, seatCount)` ; `legalMoves ⊆ hand` et non vide sur une entame ; `scoreDeal` renvoie
`pointsByTeam` de longueur = nb d'équipes. Contrat = comportement vérifié, pas signature.

### F8 — MED — `scoreDeal` concentre 3 features gelées (angle 4)
**Constat vérifié.** Trois features du wiremap frozen pointent la MÊME fonction `scoreDeal` :
`belote_scoring_deal_score` (R8), `belote_scoring_base162_invariant` (R12),
`belote_scoring_belote_rebelote` (R9) ; `belote_game_coherent_score` la réutilise. La logique la
plus dense en bugs (seuil 82, capot 250, dedans, belote +20 conditionnée) est donc portée par UNE
ancre. Si le mutation gate compte par fonction, 3 features gelées s'effondrent en 1 signal —
dilution exactement au pire endroit (pitfall #1 du knowledge_packet : 81 vs 82).
**Correction (recommandée) :** garantir que le mutation gate est calculé PAR ASSERTION-FEATURE (R8,
R9, R12 chacune sa preuve discriminante) et non par fonction ; ou scinder `scoreDeal` en
sous-fonctions ancrables (`computeBase`, `evaluateContract`, `applyBelote`).

### F9 — MED — Fonctions porteuses sans ancre gelée (angle 4)
**Constat vérifié.** Le golden calcule la détection belote-rebelote (R9) dans
`rules.beloteTeam`/`beloteHolder` (`src/rules.mjs` l.63-78), HORS de `scoreDeal`, passée en
argument `beloteTeamIdx`. Or le wiremap n'ancre AUCUNE feature sur `beloteTeam`/`beloteHolder`. De
même sans ancre : `handStrength` (heuristique d'enchère `src/bidding.mjs`), `eldestOrder`
(`src/deal.mjs`, ordre des joueurs — load-bearing pour deal ET annonces), `compareAnnonce`/
`sequences`/`carres` (`src/annonces.mjs`), et le tie-break de `chooseMove` (solver). Si le mutation
gate ne cible que les fonctions gelées, ces fonctions sont mutation-aveugles.
**Correction (recommandée) :** ancrer explicitement `beloteTeam` (détection R9) comme feature du
wiremap OU documenter qu'elle est couverte par la fixture R9 de `scoreDeal` avec preuve de
détection R+D indépendante du siège ; s'assurer que le mutation gate couvre `eldestOrder` et
`compareAnnonce` (portées par R11/R10) et le tie-break déterministe du solver (portée par R13).

### F3 — MED — Fragilité d'ordre RNG à la redonne (angle 5)
**Constat vérifié.** `src/game.mjs playGame` (l.82-90) : à CHAQUE tour de boucle `cut(deckCourant,
rng)` consomme une coupe ; sur redonne, `dealer = (dealer+1)%4` est appliqué AVANT le test
`if (d.redeal) continue`, et le tour suivant RE-COUPE (une redonne consomme donc une coupe
supplémentaire + fait tourner le donneur). Ces quirks de séquencement sont précisément ce que le
split core/rng + core/shoe + belote/game peut casser. Le blueprint `belote/game` dit seulement
« compose » (l.282-288) sans figer : redonne-consomme-une-coupe, donneur-tourne-sur-redonne,
coupe-avant-chaque-donne. Un golden de trajectoire (F1 option B) avec au moins une redonne
attraperait une divergence ; sinon, R13 (auto-replay) passera même avec un séquencement faux mais
déterministe.
**Correction (recommandée) :** figer dans la responsabilité de `belote/game` la séquence exacte
(coupe avant chaque donne y compris redonne ; donneur tourne à chaque tour ; pickup uniquement si
`!redeal`) ; couvrir par un golden de trajectoire incluant une redonne seedée.

### F11 — MED — « Un seul flux RNG » non falsifiable par le replay (angle 5)
**Constat.** `core_rng_single_seeded_stream` prétend « un unique flux par partie … vérifié par
traçage du flux », mais le test de niveau est le replay (deux `playGame({seed})` deep-equal). Or le
replay PASSE avec n'importe quel nombre de flux SEEDÉS — il ne discrimine pas « un seul flux ». La
propriété « un seul flux » est une propriété de PARTIE (total des `rng()` consommés = tirages du
shuffle Fisher-Yates + une coupe par donne), pas une propriété unitaire de `core/rng`.
**Correction (recommandée) :** hisser la trace de flux au niveau `belote/game` : instrumenter `rng`
et asserter `nbAppels === (deck.length-1) + nbDonnes` (shuffle FY = len-1 tirages, +1 par coupe).
C'est le seul test qui falsifie l'introduction d'un flux caché.

### F10 — LOW-MED — Divergence de noms snapshot↔wiremap (angle 4)
**Constat vérifié.** product_snapshot/featuremap citent les noms du golden (`runBidding`,
`playTrick/playDeal`, `{player}`) ; le wiremap gèle des noms neufs (`runAuction`, `playTricks`,
`resolveTrick`, `createBeloteAdapter`, `{seat}`). Le builder suit le wiremap (gelé), donc le
harnais de parité doit mapper golden→CardEngine sur des noms différents. Drift documentaire à
réconcilier pour éviter qu'un builder ou un relecteur confonde l'ancre.
**Correction (cosmétique) :** note de correspondance golden↔wiremap dans le blueprint (déjà amorcée
l.525) étendue aux noms de fonction et au champ `player`/`seat`.

### F12 — LOW-MED — Hooks d'anticipation no-op jamais exécutés (angle 2)
**Constat.** `core_trick_reassign_capture_hook` (reassignCapture) est no-op chez Belote et le stub
trivial ne l'exercera pas ; `bonusHooks` terminaux (poignées/Petit) ne sont jamais appelés en V0 ;
`completeDeal`-comme-écart n'est prouvé que dans sa forme Belote (complément). Ces slots restent
« présents mais jamais exécutés » — le no-op est testé (capture inchangée), ce qui est honnête, mais
ne prouve pas que le hook PORTE une capture quand un adaptateur le fournit.
**Correction (recommandée, chevauche F4) :** faire exercer `reassignCapture` par le stub avec un
adaptateur de test qui réattribue une capture triviale (zéro code Tarot), prouvant que le point
d'accroche EXÉCUTE réellement, pas seulement qu'il est absent-donc-no-op.

---

## Les 3 plus graves (une ligne chacune)

1. **F1+F7** — « core content-agnostic + parité prouvée » sur-promet : le grep s10b ne voit pas la
   topologie 4/8/2-équipes (prouvé par grep du golden) et la parité ne couvre que 3 fonctions pures —
   toute la couche shoe/deal/enchère/partie n'a ni parité golden ni gate de constantes structurelles.
2. **F6** — `core/shoe.pickup` fera fuiter le `% 2` / `[[],[]]` 2-équipes de la Belote dans le core
   si porté tel quel, sans injection de `teamOf`, et l'oracle de constantes ne l'attrapera pas.
3. **F2** — le golden renvoie `{player, card}` et nomme `player` ; le wiremap gèle `{seat}` — la
   normalisation de parité est non spécifiée : comparaison stricte = toujours rouge, lâche = théâtre.

---

## Verdict

**GO-SI-CORRIGÉ.**

Corrections BLOQUANTES avant s7+ (aucune ne modifie une RÈGLE — ce sont des durcissements de gate,
de signature générique et de formulation de claim ; à ratifier en HumanGate car blueprint/wiremap gelés) :

- **[F7]** Étendre l'oracle s10b d'un grep STRUCTUREL scopé `core/**` (`% 2`, `% 4`, `[[],[]]`,
  `< 4`, `< 8`, `(p+2)%`, littéraux seatCount/teamCount/trickCount) — sinon l'invariant-phare est déclaratif.
- **[F6]** Figer la signature générique de `pickup` (`teamOf`/`teamOrder` injectés, piles
  dimensionnées par `teamOrder.length`) OU déplacer pickup hors du core vers `adapters/belote/`.
- **[F2]** Spécifier et asserter la couche de normalisation `player`↔`seat` / `{player,card}`→`seat`
  dans `harness/parity` ; réconcilier featuremap/snapshot sur `seat`.
- **[F1]** Soit SCOPER le claim « parité » aux 3 surfaces couvertes (charter + snapshot), soit
  ajouter un golden de TRAJECTOIRE de partie (+ enchère + annonces) — le seul qui attrape une
  divergence shuffle/cut/pickup/boucle.
- **[F5]** Figer que `assert*Adapter` vérifient des POST-CONDITIONS comportementales, pas la seule
  présence de méthodes — sinon R15 « contrat honoré » est creux.

Corrections RECOMMANDÉES (non bloquantes) : F8 (mutation gate par assertion-feature sur `scoreDeal`),
F9 (ancrer `beloteTeam` + couvrir `eldestOrder`/`compareAnnonce`/tie-break solver), F3 (figer la
séquence redonne/coupe/donneur + golden avec redonne), F11 (trace de flux au niveau partie),
F4/F12 (stub qui exerce specials + teamOf→null + reassignCapture réel), F10 (note de correspondance
de noms).

Aucune faille n'a été cherchée dans les tests/oracles eux-mêmes (hors périmètre). Les failles
portent exclusivement sur le PLAN : archi (blueprint) et câblage (wiremap), confrontés au golden réel.

---

software_verdict: OK  (plan cohérent et implémentable sous réserve des 5 corrections bloquantes ci-dessus ; verdict de plan, pas de code exécuté)
evidence_verdict: MECHANICAL_VALIDATION_ONLY  (lecture des artefacts + grep/lecture directe du golden belote-claude ; aucune exécution de test CardEngine — le code n'existe pas encore)
claim_verdict: NO_CLAIM_ALLOWED
