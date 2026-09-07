# MCTS WORLDSCAN-QWEN — Lot B, première joute de désescalade modèle (s2-worldscan)

Repo : `C:\TACTICAL_CHESS_STUDIO`. Aucun fichier de code du dépôt modifié. Aucun
git commit/push. Artefacts sous `lab/forge_evidence/MCTS_WORLDSCAN_QWEN/` uniquement.

## Hypothèse testée

« Sous contrat JSON strict (temp 0), qwen2.5-14b-instruct peut produire l'étape
s2-worldscan au niveau de la référence Claude, jugé par le MÊME oracle. »

## 1. Préflight

`mcp__lmstudio__list_lm_studio_models` → serveur LM Studio répond sur le port 1234,
modèles listés :

```
qwen/qwen2.5-coder-14b
qwen2.5-14b-instruct   <-- cible
qwen/qwen3.6-27b
text-embedding-nomic-embed-text-v1.5
devstral-small-2507
mistral-7b-instruct-v0.3
```

`qwen2.5-14b-instruct` présent. Préflight **PASS**. Aucun fallback claude-blind
tenté (règle respectée). La 1ère génération réussie (HTTP 200, réponse cohérente,
2896 tokens consommés) confirme en plus que le modèle était réellement servable,
pas seulement listé.

## 2. Référence et oracle

- Référence connue-bonne : `lab/forge_runs/pacman/worldscan.json` (produite par
  Claude en V1, run `pacman-20260805-r1`).
- Contrat : `scripts/forge/contracts/s2-worldscan.yaml` — `output_contract` copié
  **verbatim** dans le prompt Qwen (aucun format concurrent inventé, leçon de
  l'incident s1/s3 du run V1).
- Oracle dédié trouvé : `scripts/forge/check_worldscan.mjs` (mode fichier, v0.3).
  Ce n'est **pas** une étape sans juge — un oracle mécanique existe et est
  directement exécutable sur un fichier JSON isolé.
- Contrôle préalable (règle « un oracle qui recale le producteur connu-bon se
  mesure lui-même ») : l'oracle a été exécuté sur la référence Claude AVANT le
  test Qwen.

```
node scripts/forge/check_worldscan.mjs lab/forge_runs/pacman/worldscan.json
VERDICT WORLDSCAN: OK
  stats: 2 jeu(x) / 16 source(s) / 2 objectif(s)/mode(s) / 0 media(s) local(aux)
```

La référence est acceptée. L'oracle ne se recale pas lui-même.

**Constat non demandé mais notable** : `lab/forge_runs/pacman/worldscan.yaml`,
co-localisé avec `worldscan.json`, suit un schéma totalement différent et plus
riche (`player_objectives`, `victory_conditions`, `systems`, `ghost_states`,
`ghost_targeting`, `maze`, `comparable_games`, `incertitudes`...) qui ne
correspond PAS à l'`output_contract` du contrat s2-worldscan.yaml. Seul
`worldscan.json` (schéma `games[]`/`advisory`) est ce que `check_worldscan.mjs`
valide et ce que ce test reproduit. Fait constaté, non expliqué par ce run.

## 3. Proposition Qwen — protocole

Prompt construit strictement depuis le contrat (`role`, `objectif`, `gardeFou`,
`output_contract` verbatim) + contexte projet (reference_jeu et objectif du
charter `pacman-20260805-r1`, verbatim). Prompt exact : `prompt_exact.txt`.

3 générations indépendantes, `qwen2.5-14b-instruct`, `temperature=0`,
`max_tokens=6000`, mêmes system/user prompts, aucun outil (pas de WebSearch/
WebFetch côté Qwen — le modèle répond de mémoire, comme prévu par le protocole
de mesure de rappel).

Extraction du JSON : même règle que `run_real.py::extract_json_payload` (dernier
bloc fenced ` ```json ` valide en objet) — script `extract_json.py` (scratchpad,
non versionné), pas un parsing improvisé.

Sorties brutes : `qwen_gen1_raw.md`, `qwen_gen2_raw.md`, `qwen_gen3_raw.md`.
JSON extraits : `qwen_gen{1,2,3}_worldscan.json`.

## 4. Verdicts par génération (même oracle que la référence)

| Génération | Oracle `check_worldscan.mjs` | Tokens (prompt/completion/total) | Anomalie factuelle |
|---|---|---|---|
| gen1 | **OK** (2 jeux / 6 sources / 2 objectifs) | 1086 / 1810 / 2896 | `has_win_state=false` pour Pac-Man — **incorrect** (Pac-Man a un état de victoire connu et documenté par la référence Claude elle-même : vider le labyrinthe) |
| gen2 | **OK** (2 jeux / 6 sources / 2 objectifs) | 1087 / 1742 / 2829 | `has_win_state=true`, cohérent |
| gen3 | **OK** (2 jeux / 6 sources / 2 objectifs) | 1087 / 1874 / 2961 | `has_win_state=true`, cohérent |

**3/3 PASS structurel au même oracle.** L'oracle ne juge que la FORME (schéma,
seuils minimums, URLs bien formées) — il ne détecte PAS que gen1 contredit un
fait de jeu bien établi : `has_win_state=false` + `victory_condition=null` est
une combinaison structurellement valide même quand elle est fausse.

## 5. Mesures

### Conformité schéma
3/3 générations conformes à l'`output_contract`. 0 champ manquant, 0 champ
excédentaire, dans les 3 cas.

### Stabilité inter-générations
Le **schéma** est stable à 100 % (2 jeux, 3 sources/jeu, 1 objectif/jeu, 4 clés
`loops`, `advisory:true` dans les 3 générations). Le **contenu** ne l'est pas :
0/3 paires bit-à-bit identiques. Divergences concrètes :

- `has_win_state` (Pac-Man) : gen1=`false` (faux) vs gen2/gen3=`true` — même
  prompt, même température 0, réponse **contradictoire** d'une génération à
  l'autre sur un champ gate en aval (c'est précisément le champ que la réparation
  v0.2 du contrat visait à sécuriser, cf. incident tetris solvabilité).
- URL vidéo Pac-Man (même source revendiquée « Pac-Man Gameplay ») :
  `04sJGfVZKdA` (gen1, gen2) puis `04aW5nXrjgk` (gen3).
- URL vidéo Ms. Pac-Man : `5cQZvzr6n8A` (gen1) puis `5cQZJzr6v8M` (gen2, gen3).
- 3e source Ms. Pac-Man : gen1/gen2 citent GameFAQs (2 URLs différentes entre
  elles), gen3 cite IGN — même le **type de site** cité change.
- Texte des `loops` : formulations différentes sur les 3 générations, sauf
  gen1==gen2 mot pour mot sur les 4 clés Pac-Man — alors que leur `has_win_state`
  diverge. Incohérence interne : narration identique, conclusion structurée
  opposée.

**Comparaison à la calibration antérieure** (mémoire studio,
`qwen_worker_calibration` : stabilité 1,00 sur un JSON simple) : cette stabilité
**ne se reproduit pas** au niveau du contenu sur un schéma plus riche comme
worldscan — seul le schéma reste stable à 100 %.

### Citations (échantillon de 5, recoupement interne uniquement — pas de web)

| Source | Stabilité inter-génération | Verdict |
|---|---|---|
| Wikipedia Pac-Man | identique dans les 3 générations | plausible / vraisemblablement genuine |
| Wikipedia Ms. Pac-Man | identique dans les 3 générations | plausible / vraisemblablement genuine |
| Vidéo YouTube "Pac-Man Gameplay" | 2 IDs différents sur 3 tirages | **suspect** — dérive sous température 0 = signature de confabulation |
| Vidéo YouTube "Ms. Pac-Man Gameplay" | 2 IDs différents sur 3 tirages | **suspect** — même signature |
| Article Pac-Man/Ms. Pac-Man | 3 URLs différentes, site différent (IGN vs GameFAQs) | **suspect** — dérive de site ET d'URL |

2/5 plausibles (Wikipedia, stables), 3/5 suspectes (vidéo + article, instables
sous répétition à température 0 identique). 0/5 vérifiées positivement (aucun
accès web utilisé, hors périmètre imposé par le protocole). Cohérent avec la
leçon studio antérieure : Qwen échoue au rappel de sources précises, ici même
sous contrat JSON strict.

### Coût tokens

Qwen : 2896 / 2829 / 2961 tokens par génération (moyenne 2895, total 3
générations = 8686). Référence Claude V1 fournie par la commande de fabrication :
74 713 tokens (non recalculée indépendamment dans cette session).

Ratio brut ≈ 25,8× moins de tokens par génération Qwen. **Limite de la
comparaison** : ce test Qwen est un appel de complétion direct, sans outillage
(pas de WebSearch/WebFetch, pas de boucle agentique, pas de relecture des
`mandatory_read`). Le chiffre Claude de référence couvre vraisemblablement un
run agentique complet avec outils — le ratio n'est **pas** une mesure de coût à
périmètre équivalent, seulement un comptage brut de tokens de complétion.

## 6. Critère de promotion évalué (pas décidé — évalué)

Énoncé : « Qwen PASS au même oracle sur 3/3 générations avec 0 citation
inventée. »

- Volet oracle : **REMPLI** — 3/3 PASS structurel au même oracle que la référence.
- Volet citations : **NON REMPLI** — 3/5 citations échantillonnées montrent une
  signature de dérive/invention sous répétition à température 0 identique.

**Verdict global : critère NON ATTEINT.**

## 7. Qu'est-ce qui manque pour autoriser la désescalade de s2 ?

Trois manques distincts, à ne pas confondre :

1. **Manque à l'oracle, pas au modèle** : `check_worldscan.mjs` ne vérifie que
   la forme. Il ne peut pas détecter qu'une génération (gen1) contredit un fait
   de jeu bien établi (`has_win_state=false` pour Pac-Man). Un oracle qui juge
   uniquement la forme ne peut jamais servir seul de garde pour une désescalade
   de contenu factuel — il faudrait un second contrôle (croisement avec une
   source de vérité, ou a minima une vérification de cohérence interne entre
   narration texte et bloc JSON terminal, ce que gen1 viole explicitement).
2. **Manque au modèle sur le rappel de sources** : sous contrat JSON strict et
   température 0, Qwen reste instable sur les identifiants de sources vidéo/
   article précis (URLs qui dérivent d'un tirage à l'autre pour une même source
   revendiquée) — la garde du contrat strict n'a PAS neutralisé la faiblesse de
   rappel déjà mesurée en format libre. Les seules citations stables sont les
   URLs Wikipedia canoniques, vraisemblablement très sur-représentées dans les
   données d'entraînement.
3. **Manque à la mesure elle-même, pas au résultat** : le ratio de coût token
   (~26×) n'est pas comparable terme à terme au chiffre de référence Claude
   (périmètres différents — complétion nue vs run agentique outillé). Toute
   décision de désescalade basée sur le coût demanderait une mesure Claude au
   même périmètre (un seul appel de complétion, mêmes prompts, sans outils).

Aucun de ces trois manques n'est un verdict de rejet définitif du modèle Qwen
pour s2 — ce sont des conditions précises et falsifiables à remplir avant une
prochaine joute : (a) un contrôle de cohérence narration/JSON en plus du
contrôle de forme, (b) soit une contrainte de citation vérifiable (ex. liste
fermée de sources pré-validées) soit l'acceptation que Qwen ne peut pas être
utilisé pour l'étape sans étape de vérification de citation en aval, (c) une
mesure de coût Claude au même périmètre que ce test avant toute comparaison
chiffrée.

## Verdict

software_verdict: OK
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED
