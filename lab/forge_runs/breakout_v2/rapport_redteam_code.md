# Rapport red-team CODE — breakout_v2 run 3 (passe corrective)

`FORGE_DISPATCH:s11-redteam-code:breakout_v2-run3-20260731-111149:2`

Posture : auditeur AVEUGLÉ (ne voit pas les justifications du builder), lecture seule, aucun
fichier modifié, aucune exécution. Chaque faille est ancrée sur un `fichier:ligne` relisible par
un oracle non-LLM en aval. Le red-team CRITIQUE, les oracles PROUVENT — je ne tranche pas.

Périmètre effectivement audité : le fix de l'accumulateur (`runtime_loop.gd`, `main.gd`,
`params.gd`), son test inversé (`no_time_catchup.test.gd`), la garde d'assertions
(`tests/run_tests.gd`), les 11 sondes `FORGE_ORACLE` de `07_TESTS/oracle/`, le contrôle négatif
de solvabilité (`negative_control.gd`), la ligne wiremap `runtime.fixed_step_accumulator`, et le
consommateur `product_oracle_godot.py` (pour interpréter la conformité des sondes).

---

## F-A (HIGH) — La ligne `runtime.fixed_step_accumulator` est certifiée IMPLEMENTED mais son `expected_proof` gelé promet EXACTEMENT le comportement que le fix F1 a supprimé

**Angle** : cohérence promesse gelée ↔ comportement livré ↔ constat (`preuve`).

**Faille.** Le champ de PROMESSE `expected_proof.statement` de la ligne
`runtime.fixed_step_accumulator` déclare toujours le comportement de l'ANCIEN cadenceur :

> « Aucun rattrapage : apres une trame artificiellement longue, le nombre de ticks executes dans
> la trame suivante est EXACTEMENT 1 (le retard est absorbe, jamais rejoue en rafale). »
> — `games/breakout_v2/09_WIREMAP/wiremap.json:2277`

Or le fix F1 (mission run 3) fait exactement l'INVERSE : il RATTRAPE, en rejouant jusqu'à
`MAX_TICKS_PAR_FRAME` ticks en rafale dans une même trame. Le code
(`runtime_loop.gd:36-38`, boucle `while acc >= pas and ticks < P.MAX_TICKS_PAR_FRAME`) et le test
inversé (`no_time_catchup.test.gd:29-30` — 2,5 pas → 2 ticks ; `:50-51` — delta énorme → `cap`
ticks) prouvent le rattrapage. La ligne est néanmoins passée à `state: IMPLEMENTED` /
`statut: IMPLEMENTED` (`wiremap.json:2284-2305`) et son `preuve` (`:2304`) décrit la propriété
OPPOSÉE (« rattrapage BORNE … floor(T/pas) ticks »).

Ce n'est pas une falsification du builder : `run_real.py:876-877` interdit de modifier
`expected_proof` (« les modifier pour les faire coïncider avec ton résultat est une
falsification »), et le builder a correctement laissé la promesse intacte. Le problème est plus
grave : la correction mandatée rend la promesse GELÉE **inatteignable**, et la ligne a quand même
été certifiée IMPLEMENTED avec un `preuve` qui atteste une propriété contradictoire. Aucun oracle
ne peut satisfaire « EXACTEMENT 1 tick, aucun rattrapage » sur ce code. Le certificat
`state: IMPLEMENTED` atteste donc la satisfaction d'une promesse que le code viole. Changer la
promesse est une modification de champ gelé = décision wiremap/HumanGate, hors autorité du
builder → **la contradiction doit remonter à Pierre**, pas être absorbée par un `preuve` réécrit.

**Sévérité** : HIGH (contradiction interne d'un artefact structuré signant IMPLEMENTED ; doctrine
« déclaré ≠ exécuté » et « aucune décision dans un constat »).

**Reproduction (non-LLM, déterministe)** : lire `expected_proof.statement` à
`games/breakout_v2/09_WIREMAP/wiremap.json:2277` — il contient les littéraux « EXACTEMENT 1 » et
« Aucun rattrapage … jamais rejoue en rafale ». Lire `no_time_catchup.test.gd:30` (assert 2 ticks)
et `:51` (assert `cap` ticks). Un comparateur qui détecte, dans un `expected_proof` de ligne
`state==IMPLEMENTED`, le motif « EXACTEMENT 1 / aucun rattrapage » alors qu'un test de la même
ligne asserte `ticks > 1`, lève la contradiction sans jugement.

---

## F-B (MEDIUM) — La « propriété durable » est énoncée SANS condition, mais le plafond la casse ; le test ne couvre que le régime sous-plafond

**Angle** : promesse trop forte vs propriété réellement testée (règle de variance / « promesse
trop forte à requalifier »).

**Faille.** Le commentaire de `runtime_loop.gd:24-26`, l'en-tête de `no_time_catchup.test.gd:1-4`
et le `preuve` wiremap (`:2304`) énoncent la propriété comme **inconditionnelle** :

> « N trames de duree cumulee T produisent floor(T/pas) ticks **quel que soit le decoupage** des
> trames (propriete DURABLE, independante du framerate). »

C'est FAUX dès qu'une trame atteint `MAX_TICKS_PAR_FRAME` : le surplus est jeté
(`runtime_loop.gd:41-42`, `acc = fmod(acc, pas)`), donc l'indépendance au découpage n'existe QUE
sous le plafond. Le test (point 4, `:36-45`) ne vérifie l'indépendance qu'à T = 3 pas avec
`cap = 5` — jamais un cas où le découpage franchit le plafond. La propriété DURABLE testée est
donc plus faible que la propriété DURABLE énoncée. Le plafond anti-spirale est légitime ; c'est
l'ÉNONCÉ inconditionnel qui est trop fort et devrait être requalifié honnêtement (« … quel que
soit le découpage, tant que la durée d'une trame reste sous `MAX_TICKS_PAR_FRAME` pas »).

**Sévérité** : MEDIUM (advisory ; promesse plus large que ce qui est vrai/testé, pas un crash).

**Reproduction (non-LLM)** : `avancer(0.0, pas*10, false)` → 5 ticks (plafonné), reste 0 ;
puis 10 appels successifs `avancer(acc, pas*1.0, false)` en filant `acc` → 10 ticks au total.
Même durée cumulée T = 10 pas, deux découpages, **5 ticks vs 10 ticks** : l'indépendance au
découpage est violée. Aucun test n'asserte ce cas-frontière (grep `MAX_TICKS`/`pas * 10` dans
`no_time_catchup.test.gd` : seul le plafond en une trame est testé, jamais la comparaison
gros-vs-fragments AU-DELÀ du plafond).

---

## F-C (MEDIUM) — Les 6 sondes-adaptateurs enveloppant le harnais peuvent rendre `ok:true` sans avoir exécuté la moindre assertion (pas de garde `passed > 0`)

**Angle** : une sonde peut-elle mentir (ok:true sans rien mesurer) ? contrôle anti-faux-vert.

**Faille.** Six sondes observables délèguent à un test unitaire via le harnais et concluent sur
`var ok: bool = h.failed == 0` — SANS borne inférieure sur `h.passed` :

- `demo_immediate_start.gd:14`, `demo_lives_score.gd:14`, `demo_end_screen.gd:15`,
  `demo_paddle_responsive.gd:15`, `demo_exit_observable.gd:16`, `demo_restart_one_gesture.gd:15`.

Le harnais (`harness.gd:7-8`) démarre à `passed=0, failed=0`. Si le `run(h)` enveloppé n'exécute
AUCUNE assertion (corps vide, `return` précoce, cœur non chargé), alors `failed==0` → `ok==true`
→ `print("FORGE_ORACLE … {\"ok\": true …}")` + `quit(0)`. Le collecteur
`product_oracle_godot.py:269-283` fait confiance à `payload["ok"]` et enregistre `status: OK`.
C'est exactement le faux-vert « ok:true sans avoir rien mesuré ». Notable parce que la garde
existe AILLEURS et manque ICI : `tests/run_tests.gd:57-60` protège la suite unitaire par
`if total != EXPECTED_ASSERTS` (égalité STRICTE, 305), mais les sondes observables court-circuitent
ce runner et n'ont aucune garde équivalente. Latent aujourd'hui (les tests enveloppés assertent
réellement), mais toute future dérive d'un test enveloppé passerait en silence.

**Sévérité** : MEDIUM (advisory, latent ; failure-mode explicitement visé par la mission,
asymétrie avec la garde `EXPECTED_ASSERTS` qui prouve que l'omission est un oubli, pas un choix).

**Reproduction (non-LLM)** : ancre statique — les 6 lignes citées calculent `ok = h.failed == 0`
sans `h.passed`. Falsification exécutable : pointer une de ces sondes sur un `.test.gd` dont
`run(h)` a un corps vide → sortie `FORGE_ORACLE <volet> {"ok":true,"fails":[],"data":{"passed":0,
"failed":0}}`, exit 0, `status:OK` côté collecteur. Un oracle peut asserter, pour toute sonde
enveloppant le harnais, la présence d'une condition `passed > 0` (ou `passed >= N`) : absente ici.

---

## F-D (LOW) — Le collecteur clé le résultat par NOM DE FICHIER, pas par le nom `FORGE_ORACLE` émis : la conformité de nom soignée par le builder n'est pas la contrainte réellement vérifiée

**Angle** : les sondes émettent-elles le volet exact déclaré par la wiremap ? (couplage réel).

**Faille.** La mission ① posait que « le fournisseur … lit leur sortie … le nom de volet émis doit
être EXACTEMENT celui déclaré ». En réalité `product_oracle_godot.py` clé le mapping par
`volet_name = path.stem` (`:228`) — le NOM DE FICHIER — et n'utilise JAMAIS le nom émis, pourtant
extrait dans `parsed["volet_name"]` (`:176`, valeur morte). La découverte se fait sur la présence
littérale du marqueur `FORGE_ORACLE` (`:90`), la clé sur le nom de fichier. Conséquence : le nom
émis dans le `print(...)` est une décoration NON vérifiée par le collecteur ; le couplage qui
compte est `nom-de-fichier == observable_by_player`. Aujourd'hui les deux coïncident (les 11
`stem` == les 11 volets, les 11 noms émis == les 11 `stem`), donc pas de défaut vivant — mais une
divergence future entre nom émis et nom de fichier serait SILENCIEUSE, jamais rouge.

**Sévérité** : LOW (consommateur en amont du diff ; contexte pour interpréter la « conformité de
nom » — informative, pas un défaut livré).

**Reproduction (non-LLM)** : `product_oracle_godot.py:228` (`volet_name = path.stem`) vs `:176`
(`parsed["volet_name"]` calculé puis inutilisé pour la clé). Renommer le nom émis dans un
`print` sans renommer le fichier ne change RIEN au mapping du collecteur : la clé reste le `stem`.

---

## F-E (LOW) — `avancer` n'a aucune garde sur un delta / accumulateur négatif : invariant « accumulateur < un pas hors gel » non tenu côté négatif

**Angle** : robustesse de la fonction pure d'accumulation aux entrées hors domaine.

**Faille.** `runtime_loop.avancer` (`:30-43`) calcule `acc = accumulateur_ms + delta_ms` sans
borne basse. Un `delta_ms` négatif (horloge qui recule, delta corrompu) produit `acc < 0`, la
boucle `while` ne tourne pas, et la fonction renvoie un accumulateur NÉGATIF, qui absorbera du
temps réel légitime aux trames suivantes (retard de démarrage des ticks). L'en-tête promet
« accumulateur : float (reste, < un pas hors gel) » (`:23`) — vrai côté haut (garanti par la
boucle + `fmod`), non tenu côté bas. Non atteignable depuis `main.gd` (`_process` fournit
`delta >= 0`, `:44`), donc pas un défaut vivant ; mais la fonction PURE ne défend pas son
invariant et aucun test ne couvre l'entrée négative.

**Sévérité** : LOW (advisory ; inatteignable en runtime Godot, invariant de fonction pure non
gardé).

**Reproduction (non-LLM)** : `avancer(0.0, -100.0, false)` → `{"ticks": 0, "accumulateur":
-100.0}` (accumulateur négatif). Aucun `h.eq`/`h.ok` de `no_time_catchup.test.gd` ne couvre un
delta négatif (grep : deltas testés tous ≥ 0).

---

## Ce qui a été vérifié et tient (non des failles — contexte pour l'adjudication)

- **Plafond de rattrapage = constante nommée** : `params.MAX_TICKS_PAR_FRAME` (`params.gd:82`),
  citée par `runtime_loop.gd:36` et le test `:14`. Pas de littéral dispersé. ✔ (angle « plafond
  nommé » — conforme).
- **Reste conservé entre trames** : `avancer` renvoie `acc` (`:43`) ; `main.gd:44-45` réinjecte
  `_acc = r["accumulateur"]` d'une trame à l'autre. ✔ Le point 4 du test (`:36-46`) vérifie la
  conservation cross-appel en filant `acc`.
- **EXPECTED_ASSERTS ajusté honnêtement** : `run_tests.gd:23` passe à 305, décomposé
  274 + 25 + 6 (`:21-22`) ; le test inversé compte bien 14 assertions (8 → 14, +6). Garde par
  égalité STRICTE `!=` (`:58`), non un `>=`. ✔ Ajustement légitime, non un relâchement.
- **Contrôle négatif de solvabilité présent et STRICT** : `negative_control.gd:38-43` exige
  `interception > centre` ET `interception > naif` (strict) ET `interception == SEEDS`. Pas de
  `>=` tautologique. ✔ (NB : cette sonde émet `ORACLE negative_control:`, PAS `FORGE_ORACLE` —
  elle n'est donc PAS découverte par `product_oracle_godot.py` ; consommée par la voie
  solvabilité, cohérent avec `proof.negative_control_bot`.)
- **Épsilon** : aucun épsilon introduit sur une égalité stricte. `paddle_deflection_three_points`
  et `wall_reflection_strict` restent en égalité flottante exacte « aucun epsilon »
  (`paddle_deflection_three_points.test.gd:3,25`). Les seuls `snappedf` (`demo_rebound_
  variability.gd:21-22`, 0.001 / 0.01) QUANTIFIENT pour COMPTER des valeurs distinctes — ils
  rendent la preuve de variance PLUS stricte (fusion de valeurs proches), jamais plus laxiste. ✔
- **11 volets déclarés = 11 sondes présentes, noms alignés** : les `stem` couvrent exactement
  les 11 volets `observable_by_player` cités par la mission ; les noms émis coïncident (grep
  `FORGE_ORACLE` sur `07_TESTS/oracle/`). ✔ (sous la réserve F-D sur le couplage réel).

---

## Verdicts (séparés)

- **software_verdict: FAIL** — pour la seule ligne `runtime.fixed_step_accumulator` : contradiction
  DÉTERMINISTE et relisible par un oracle non-LLM entre son `expected_proof` gelé
  (`wiremap.json:2277`, « EXACTEMENT 1 / aucun rattrapage ») et le comportement certifié
  IMPLEMENTED (`no_time_catchup.test.gd:30,51`, `runtime_loop.gd:36-42`). Appuyé par une ancre
  statique, donc énonçable. (Red-team advisory : ce FAIL est un signal, l'oracle signé tranche.)
- **evidence_verdict: MECHANICAL_VALIDATION_ONLY** — toutes les failles ci-dessus sont ancrées sur
  des `fichier:ligne` ou des appels de fonction pure reproductibles par un oracle non-LLM ; aucune
  n'exige de jugement pour être constatée.
- **claim_verdict: NO_CLAIM_ALLOWED** — red-team advisory : je ne certifie ni le jeu ni le verdict
  signé. La RÉSOLUTION de F-A (re-ratifier `expected_proof` pour autoriser le rattrapage borné,
  OU revenir sur le fix) est une décision de champ gelé = **HumanGate Pierre**, pas un oracle.
  Fog remonté ci-dessous.

### Fog → HumanGate (jugement, pas oracle)
- **fog-1 (F-A)** : le point dur du charter (« pas de temps fixe ») autorise-t-il un rattrapage
  borné en rafale, ou exige-t-il le « 1 tick, retard absorbé » de l'`expected_proof` actuel ? Les
  DEUX ne peuvent être vrais. Trancher la promesse gelée avant de clore la ligne.
- **fog-2 (F-B)** : accepter la requalification de la propriété durable en « … tant que la trame
  reste sous MAX_TICKS_PAR_FRAME pas », ou exiger un test du cas-frontière au-delà du plafond ?
- **fog-3 (F-C)** : imposer une garde `passed > 0` aux sondes-adaptateurs (aligner sur la garde
  `EXPECTED_ASSERTS` de la suite), ou l'accepter comme risque latent documenté ?

---

## SKIPPED_VALIDATION

- **item** : preuve byte-à-byte que la simulation pure `05_SYSTEMS/**` est INCHANGÉE par le run 3.
  **périmètre** : `games/breakout_v2/05_SYSTEMS/`. **statut** : non fait (partiel). **raison** :
  `git diff` refusé dans cet environnement (permission Bash `cd`/`git` déniée) ; je n'ai pas pu
  comparer l'arbre run2→run3. Lecture statique : le fix vit en `06_RUNTIME` (`runtime_loop.gd`,
  `main.gd`, tous deux `system.adapter`), aucun fichier lu ne touche `05_SYSTEMS`. À confirmer par
  l'oracle de mutation (`categories_mutables: [system]` couvre `05_SYSTEMS`) et un diff réel.
- **item** : exécution réelle des 11 sondes `FORGE_ORACLE` et de `run_tests.gd`. **périmètre** :
  `07_TESTS/oracle/**`, `tests/run_tests.gd`. **statut** : non fait. **raison** : contrat red-team
  `run: aucun` + binaire Godot ABSENT de ce poste (`product_oracle_godot.py:28-29`,
  `godot.config.json` pointe un chemin inexistant). Mes constats de sonde sont STATIQUES (ancres
  `fichier:ligne`), à confirmer par le collecteur avec un binaire Godot réel.
- **item** : vérification que l'`expected_proof` d'AUTRES lignes que `runtime.fixed_step_accumulator`
  n'a pas été altéré. **périmètre** : les ~40 autres lignes de `wiremap.json`. **statut** : partiel.
  **raison** : audit ciblé sur le périmètre du fix run 3 ; sans diff je n'ai pas balayé toutes les
  lignes. La garde no-falsify de `run_real.py:876` devrait le couvrir mécaniquement.

---

```json
{"findings": [{"angle": "coherence promesse gelee vs comportement livre", "faille": "La ligne runtime.fixed_step_accumulator est certifiee state=IMPLEMENTED mais son expected_proof gele (wiremap.json:2277) promet 'EXACTEMENT 1 tick / aucun rattrapage / jamais rejoue en rafale' — exactement le comportement que le fix F1 a supprime au profit d'un rattrapage borne (jusqu'a MAX_TICKS_PAR_FRAME ticks). Le preuve (wiremap.json:2304) atteste la propriete OPPOSEE. La promesse gelee est devenue inatteignable et la ligne a quand meme ete certifiee ; changer la promesse = decision HumanGate, hors autorite du builder.", "severite": "HIGH", "reproduction": "Lire wiremap.json:2277 (litteraux 'EXACTEMENT 1' et 'Aucun rattrapage ... jamais rejoue en rafale') ; lire no_time_catchup.test.gd:30 (assert 2 ticks) et :51 (assert cap ticks) et runtime_loop.gd:36-38 (boucle while jusqu'a MAX_TICKS_PAR_FRAME). Contradiction deterministe entre expected_proof et test d'une meme ligne IMPLEMENTED."}, {"angle": "promesse trop forte vs propriete reellement testee", "faille": "La propriete durable est enoncee sans condition ('floor(T/pas) ticks quel que soit le decoupage des trames') dans runtime_loop.gd:24-26, no_time_catchup.test.gd:1-4 et wiremap preuve:2304, mais le plafond MAX_TICKS_PAR_FRAME jette le surplus (runtime_loop.gd:41-42), donc l'independance au decoupage n'existe que sous le plafond. Le test (point 4) ne couvre que le regime sous-plafond (T=3 pas, cap=5).", "severite": "MEDIUM", "reproduction": "avancer(0.0, pas*10, false) -> 5 ticks ; puis 10x avancer(acc, pas*1.0, false) en filant acc -> 10 ticks. Meme T=10 pas, deux decoupages, 5 vs 10 ticks : independance au decoupage violee. Aucun test n'asserte ce cas au-dela du plafond."}, {"angle": "sonde peut-elle mentir (ok:true sans rien mesurer)", "faille": "Six sondes observables enveloppant le harnais concluent sur ok = h.failed == 0 sans garde h.passed > 0 (demo_immediate_start.gd:14, demo_lives_score.gd:14, demo_end_screen.gd:15, demo_paddle_responsive.gd:15, demo_exit_observable.gd:16, demo_restart_one_gesture.gd:15). Un run(h) enveloppe qui n'asserte rien (corps vide, return precoce, coeur non charge) donne failed==0 -> ok:true -> status OK cote product_oracle_godot.py:269-283. La suite unitaire a la garde stricte EXPECTED_ASSERTS (run_tests.gd:57-60) ; les sondes ne l'ont pas.", "severite": "MEDIUM", "reproduction": "Ancre statique : les 6 lignes calculent ok=h.failed==0 sans h.passed. Pointer une sonde sur un .test.gd a run(h) vide -> FORGE_ORACLE <volet> {\"ok\":true,\"fails\":[],\"data\":{\"passed\":0,\"failed\":0}}, exit 0, status OK. Verifier la presence d'une condition passed>0 : absente."}, {"angle": "les sondes emettent-elles le volet exact declare (couplage reel)", "faille": "product_oracle_godot.py cle le resultat par nom de FICHIER (path.stem, :228) et n'utilise jamais le nom FORGE_ORACLE emis (parsed['volet_name'] extrait :176 puis inutilise). Le nom emis soigne par le builder est une decoration non verifiee par le collecteur ; le couplage reel est nom-de-fichier==observable_by_player. Coincident aujourd'hui, mais une divergence future serait silencieuse.", "severite": "LOW", "reproduction": "product_oracle_godot.py:228 (volet_name = path.stem) vs :176 (parsed['volet_name'] calcule puis non utilise pour la cle). Renommer le nom emis d'un print sans renommer le fichier ne change pas le mapping du collecteur."}, {"angle": "robustesse de la fonction pure d'accumulation aux entrees hors domaine", "faille": "runtime_loop.avancer (:30-43) calcule acc = accumulateur_ms + delta_ms sans borne basse ; un delta negatif produit un accumulateur negatif qui absorbera du temps reel legitime aux trames suivantes. L'en-tete promet 'accumulateur < un pas hors gel' (:23), non tenu cote bas. Inatteignable depuis main.gd (_process delta>=0) mais l'invariant de la fonction pure n'est pas garde et aucun test ne couvre l'entree negative.", "severite": "LOW", "reproduction": "avancer(0.0, -100.0, false) -> {\"ticks\":0,\"accumulateur\":-100.0} (accumulateur negatif). Aucun assert de no_time_catchup.test.gd ne couvre un delta negatif."}]}
```
