# ADJUDICATION RED-TEAM — protocole E2 (P1.2a) v1 → v2

- **Date** : 2026-07-12
- **Objet** : red-team du protocole `P1_2A_E2_PROTOCOL.md` v1 ET des profils gelés
  (exigence du cadrage ratifié). Deux relecteurs (méthodo F-M*, technique F-T* — avec
  mesures exécutées : cadence réelle répliquée ×2 sur fixture p1, bot de solvabilité
  importé sur copie scratchpad). **18 findings, tous adjugés.**
- **Résultat central : la sonde comptée de v1 est FALSIFIÉE AVANT le run** — le red-team
  a fait exactement son travail. Deux découvertes débordent E2 (disclosure ci-dessous).

## Le bloc central (F-M1 ≡ F-T1, F-T2, F-T3 — SÉRIEUX, adjugés ensemble)

1. **Modèle temporel faux (F-M1/F-T1, CONFIRMÉ par mesure)** : la boucle B démarre après
   la phase A du capteur — **T_pre mesuré ≈ 2,3 s** (balle déjà en vol, `index.html:173`),
   cadence réelle **158 ms/input** (mesurée ×2, bornes [153-183]). ET `analysis.mjs:76-77`
   compte le score ABSOLU (`baseReward = 0` ; le `reward0` calculé est **mort, jamais
   utilisé** — bug capteur latent) → breakout sain : **B2 = 1** (fait publié,
   `p1_probe_clean/…json:212`), pas « input 15 ». La sonde v1 (vx:60/vy:-80) donnerait
   B2 ≈ 21 < 32 → **aucun signal → ÉCHEC (ii) par construction du protocole**.
2. **Solvabilité breakout : VACUEUSE SOUS WINDOWS (F-T2, PROUVÉ)** : garde
   `solvability.mjs:127` (`import.meta.url === file://${argv[1]}`) jamais vraie sous
   Windows → `main()` jamais appelé, sortie vide, exit 0 — **le volet (d) du P0 breakout
   est vert à vide sur ce poste, idem les 5 copies `fixtures/p1/`**.
3. **Si la solvabilité tournait, la sonde v1 serait P0 ROUGE (F-T3, MESURÉ)** : bot
   pristine won=true à 26 752/30 000 pas (marge 11 %) ; balle lente won=false (timeout).
   Toute vitesse plus lente (la correction F-M1) aggrave. Le repli v1 « vitesse
   intermédiaire » va dans le mauvais sens (plus vite = B2 plus petit).

**Conséquence adjugée (le vrai résultat de ce red-team)** : sur breakout, l'espace des
défauts FTUE candidats est **pincé entre deux mâchoires** — un défaut assez gros pour que
B le voie (B2 null / contrôles morts) est attrapé par P0 (solvabilité, R8
`logic.test.mjs:167` qui tue aussi le candidat brickValue=0) ; un défaut assez doux pour
rester P0-vert est invisible pour B (T_pre + score absolu). **L'existence d'un défaut
B-séparable orthogonal à P0 sur breakout n'est PAS acquise.** Le protocole v2 en fait la
question préalable : vérification statique par **simulation déterministe du moteur pur**
(`BreakoutGame` headless — pas le capteur, invariant respecté) sur une grille de bornes
temporelles ; si AUCUN candidat ne passe, **E2 est ANNULÉE pré-run avec conclusion
documentée** (« aucun défaut B-séparable orthogonal à P0 trouvé sur breakout ») — un
résultat valide (règle Pierre 2), pas un échec à maquiller.

Sonde comptée v2 (candidat unique + repli, sous réserve de la simulation) :
**E2-SA-D′ « récompense inatteignable naïvement par level-design »** (briques confinées
en colonne extrême, 1 bloc modifié dans `level.mjs`) — gagnable par bot informé
(solvabilité verte, probablement plus RAPIDE), R8 intact, contrôles intacts, non-inverse-
littéral ; séparation portée par **B2 = null → `signal_si_null`** (robuste à TOUTE
l'incertitude temporelle). Fragilité géométrique (un rebond chanceux marque tôt) →
tranchée par la simulation de phase A, repli = variante géométrique, un seul redesign.

## Autres dispositions

| # | Finding | Sév. | Disposition → v2 |
|---|---|---|---|
| F-M2 | Attestation d'exposition incomplète : le fait quantitatif publié « B2 sain = 1 » (P1_MECHANICAL_RESULTS:30) contredisait la dérivation v1 — la confrontation l'aurait attrapé | S | **CONFIRMÉ** — §2 v2 : liste TOUTE exposition (qualitative ET quantitative) des docs parents + test de cohérence obligatoire du modèle contre ces faits |
| F-M3 | Hash ×2 divergent : aucun verdict prévu (ni SUCCÈS ni ÉCHEC ni INVALIDE) | S | **CONFIRMÉ** — INVALIDE technique, UN re-run, sinon retour Pierre ; le design B2=null élimine structurellement la bascule frontière |
| F-M4 | Comptage SA-D/SA-C = restriction de l'hypothèse ratifiée (case tactique infalsifiable), pré-enregistrée donc honnête mais à faire acter | S | **CONFIRMÉ** — phrase explicite en tête des critères : « la ratification de ce protocole vaut restriction de l'hypothèse à la séparation arcade ; la case tactique devient déclarative » — **c'est à Pierre de l'acter** |
| F-M5 | ST-C : contraste deux-couches inexploité (outcomes B capteur tirent sur tactique sain, profile_eval non) | m | **CONFIRMÉ** — livrable documentaire pré-enregistré de ST-C |
| F-M6 | Signal sous scalaire `non_discriminant` = bug de la couche, pas dans INVALIDE | m | **CONFIRMÉ** — ajouté à la liste INVALIDE fermée |
| F-M7 | « 4/4 »/« les 4 sondes » cassent sur branche d'abandon ; fallback sans objet pour les copies conformes | m | **CONFIRMÉ** — « sondes retenues » partout + branche contrôle-rouge dédiée (env prouvé → re-run ; sinon retour Pierre) |
| F-M8 / F-T8 | Dérivation tactique : le bon invariant est min(dist) > move+range (fulgor : 6 > 5, **marge d'UNE case**) — la vacuité TIENT mais la justification chiffrée était fausse | m | **CONFIRMÉ** — §3.2 réécrit (move+range, marge 1 consignée : tout tuning bestiaire la casserait) |
| F-M9 / F-T7 | E2-ST-D mal spécifiée : `#objective` statique déjà vide, texte injecté au runtime (`index.html:202`) | m | **CONFIRMÉ** — diff = neutralisation de la ligne template (1 ligne JS) ; P0-vert CONFIRMÉ par le relecteur (e2e lit `window.__objective`, jamais le texte du div) |
| F-M10 | Règle Pierre 1 « à refaire » : contamination du re-run non traitée | m | **CONFIRMÉ** — §0 v2 : expérience refaite = nouvelles sondes + nouvelle dérivation red-teamée + attestation étendue aux résultats E2 |
| F-T4 | Défaut vitesse : ne vivait que sur le 1er service (`loseLife`/`nextLevel` re-servent en dur) | m | **SANS OBJET en v2** (sonde vitesse abandonnée) — consigné comme piège pour tout futur défaut cinétique |
| F-T5 | Copies breakout sous `fixtures/e2/` : le `run-oracle.mjs` du jeu casse (résolution `../../`) ; les fixtures p1 portent la variante `../../../` | S | **CONFIRMÉ** — copies breakout = variante run-oracle p1 (divergence unique consignée) ; menagerie OK (recherche ascendante) |
| F-T6 | Repli ST-D « retrait #legend » : P0-rouge garanti (`e2e-ux.mjs:41-45` asserte ≥5 items) | m | **CONFIRMÉ** — repli remplacé (`#help`/`#roster`, non assertés) |
| — | Ports | — | 4640-4643 libres (inventaire complet) ; e2e des copies gardent leurs ports en dur → phase B strictement séquentielle (déjà prévue) |

**Ce qui tient (les deux relecteurs)** : invariants §1, gel 2 temps, `first_delta ≤ 3`
robuste, marges B1/B3 arcade réelles, vérification alphabet exacte, chemin de lecture
`raw.ftue` vérifié sur fixture, copie menagerie autonome (server.mjs zéro dépendance,
aucune ressource externe), bornes fixtures/p1 insensibles aux outcomes B, hash sur
outcomes, §8 sans sur-claim, aucun test breakout n'asserte les vitesses initiales.

## Disclosure hors périmètre E2 (à porter à Pierre — gates séparés)

1. **`games/breakout/solvability.mjs:127` + les 5 copies `fixtures/p1/`** : le volet
   solvabilité ne s'est JAMAIS exécuté sous Windows (garde `file://` vs backslashes).
   Tous les « P0 vert » breakout passés sur ce poste (P1.1, fixtures, E1 s10d) portaient
   un volet (d) vert à vide. La solvabilité pristine EST verte quand on l'exécute
   (prouvé au red-team : won=true, 26 752 pas) — aucun résultat passé n'est renversé,
   mais la garantie était plus faible qu'affichée. Correctif trivial (garde
   `pathToFileURL`), **hors E2, gate séparé**.
2. **`scripts/quality_sensor/analysis.mjs:76-77`** : `reward0` mort, `baseReward = 0` —
   B2 mesure le score absolu, aveugle à tout ce qui précède la boucle. Corriger = toucher
   le capteur gelé → **incrément séparé si souhaité** ; en attendant, v2 documente B2
   comme absolu et fait porter la séparation par `null`.

```
software_verdict: (aucun — adjudication documentaire ; mesures des relecteurs citées)
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED
```
