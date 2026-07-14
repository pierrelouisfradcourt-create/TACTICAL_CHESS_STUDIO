# s2.5-artbible — gate 4 (ADR-002), red-team Qwen indépendant

> **Date** : 2026-07-14
> **Statut** : gate 4 réel exécuté (3 appels `qwen2.5-14b-instruct` via LM Studio,
> aucun stub). `claim_verdict: NO_CLAIM_ALLOWED`.

## Contexte et incident technique

Contrat : `scripts/forge/contracts/redteam-artdirector.yaml` (miroir de
`s6-redteam-plan.yaml`, `capability_role: redteam_reviewer` → résout vers Qwen,
jamais Claude, cf. ADR-002 gate 1/4). Dispatché via `prepare_dispatch` +
`forge.runtime.route_step` (a résolu `runner=qwen` réellement, LM Studio confirmé
up) + `forge.runtime.run_qwen_step` (le mécanisme déjà câblé du repo, aucun
nouveau client HTTP écrit).

**1re tentative (échouée, root-caused avant retry)** : un appel unique embarquant
les 5 fichiers du `mandatory_read` (contrat + `check_artbible.mjs` +
`asset_request.mjs` + `ASSET_CONTRACT_V0.md` + `S2_5_ARTBIBLE_ADVERSARIAL_NOTE.md`,
~13 660 tokens) a échoué : `run_qwen_step` a rapporté `call_failed` (le message
réel est délibérément masqué par `council.py`, cf. `CouncilCallError`, pour ne
jamais fuiter de secret/URL). Reproduction directe de l'appel HTTP brut :
`{"error":"The number of tokens to keep from the initial prompt is greater than
the context length (n_keep: 13660 >= n_ctx: 8192)"}`. **Cause confirmée** : le
modèle Qwen2.5-14B chargé dans LM Studio a un `n_ctx=8192` — un paramètre de
chargement du modèle, non reconfigurable via l'API. Non corrigé côté LM Studio
(hors périmètre) ; contourné en découpant l'audit en **3 appels réels distincts**,
chacun sous la limite.

## Les 3 passes réelles

| Passe | Matériel embarqué | Durée réelle |
|---|---|---|
| A — contrat + oracle | `s2.5-artbible.yaml` + `check_artbible.mjs` | 9.2 s |
| B — résolveur + schéma | `asset_request.mjs` + `ASSET_CONTRACT_V0.md` | 7.6 s |
| C — adjudication | `S2_5_ARTBIBLE_ADVERSARIAL_NOTE.md` seule | 6.7 s |

Preuves : `lab/forge_runs/artbible_redteam/pass_{a,b,c}_*_receipt.json` (réponse
brute LM Studio) + `pass_{a,b,c}_*_rapport.md` (texte produit par Qwen).

## Adjudication (Claude vérifie chaque finding contre le code réel — pas d'acceptation à l'aveugle)

Le gate 4 doctrinal dit que Qwen critique les décisions, jamais un oracle. En
miroir, cette adjudication vérifie que Qwen lui-même n'affirme pas plus que ce
que le code montre — un red-team n'est pas au-dessus de la vérification.

### Pass A — contrat + `check_artbible.mjs`

| # | Finding Qwen | Verdict adjudication | Raison |
|---|---|---|---|
| A1 | Frontmatter valide mais contenu textuel non vérifié au-delà de la longueur minimale | **CONFIRMÉ, correction REJETÉE** | Réel : `check_artbible.mjs` ne vérifie que `MIN_SECTION_CHARS` + placeholders, jamais la cohérence sémantique. Mais la correction proposée par Qwen ("vérifier que le contenu est cohérent avec les styles déclarés") EXIGERAIT un LLM-as-judge sur du texte libre — exactement ce que la doctrine du studio interdit (`gardeFou` du contrat : "aucun LLM-as-judge sur l'esthétique/le contenu"). Limite assumée, pas un bug. |
| A2 | Un style déclaré dans le frontmatter peut n'être utilisé par aucune `asset_request` | **CONFIRMÉ, correction REJETÉE (preuve empirique contraire)** | Réel : `checkAssetRequestsShape` ne vérifie que `request.style ⊆ frontmatter.styles`, jamais l'inverse. Mais **la sonde adversariale #2** (`probe_contradictory_constraint`, déjà vérifiée réelle) démontre que ce comportement est **désirable** : `flat-lightweight` était déclaré sans être utilisé, précisément pour documenter honnêtement une tension non résolue (cf. `art_bible.md` de cette sonde). Rendre ce cas `FAIL` casserait un comportement déjà prouvé correct in vivo. Rejeté avec preuve, pas par principe. |
| A3 | Une request peut citer un style absent du frontmatter et passer la validation | **RÉFUTÉ (déjà implémenté)** | Faux : `check_artbible.mjs::checkAssetRequestsShape` vérifie déjà `bibleStyles.includes(req.style)` ligne par ligne (testé par `check_artbible.test.mjs::"style non declare dans la bible => finding"`). Qwen a mal lu ou halluciné cette lacune. |

### Pass B — `asset_request.mjs`

| # | Finding Qwen | Verdict adjudication | Raison |
|---|---|---|---|
| B1 | `max_size_kb` non vérifié quand `entry.size_kb` est `null` (contournement silencieux) | **CONFIRMÉ — CORRIGÉ** | Réel, vérifié dans le code (`passesConstraints`, `asset_request.mjs:123-124` avant fix) : une contrainte de taille déclarée passait silencieusement sur une entrée sans taille connue (typiquement un asset 3D manifest-only). **Corrigé** : `entry.size_kb === null` échoue désormais explicitement la contrainte plutôt que de la contourner. Test de régression ajouté (`asset_request.test.mjs`). 121 tests node + 306 pytest verts ; les 5 runs réels déjà produits (aucun n'utilisait `max_size_kb` non-null) donnent des résultats **identiques** avant/après — non-régression confirmée sur preuve, pas seulement sur les tests synthétiques. |
| B2 | `usage_referenced` retournerait `true` même hors tier `validated` | **RÉFUTÉ (déjà implémenté)** | Faux : le code (`asset_request.mjs:186`) vérifie déjà `entry.tier === 'validated' && usage_examples.length > 0` dans une seule expression booléenne. Qwen a affirmé une lacune inexistante — un exemple concret de pourquoi un red-team ne remplace jamais une vérification factuelle du code cité. |

### Pass C — critique de l'adjudication (`S2_5_ARTBIBLE_ADVERSARIAL_NOTE.md`)

| # | Finding Qwen | Verdict adjudication |
|---|---|---|
| C1 | La phrase "les 3 hypothèses de risque sont levées... 0 échec structurel, 0 fabrication" sur-affirme une robustesse face à un **adversaire véritablement malveillant** ; les 3 sondes testent un agent coopératif face à des cas difficiles, pas une tentative active de tromper l'oracle | **CONFIRMÉ, déjà partiellement reconnu — recommandation resserrée** | La note portait déjà une limite explicite ("ces 3 sondes testent la fidélité d'un agent NON-adversarial... pas la résistance à un agent qui mentirait délibérément"), mais la section "Recommandation" disait ensuite "raisonnablement justifié" sans pondérer suffisamment ce même caveat — une incohérence de ton que Qwen a eu raison de pointer. **Ce document resserre la recommandation** (cf. §Recommandation ci-dessous) plutôt que de laisser les deux sections se contredire. |

## Bilan des findings

- **5 findings soumis**, 2 confirmés-et-corrigés/rejetés-avec-preuve (A2, B1),
  1 confirmé-mais-hors-doctrine (A1), 2 réfutés comme factuellement faux (A3, B2),
  1 critique méta valide sur le ton de la note précédente (C1).
- **1 correction mécanique réelle appliquée** : `asset_request.mjs` (bypass
  `max_size_kb`/`size_kb:null`), testée, non-régressive sur les 5 runs réels
  existants.
- **Taux de findings factuellement faux : 2/5 (40%)** — un rappel concret que
  la sortie d'un red-team LLM doit elle-même être vérifiée contre le code, pas
  acceptée comme une autorité.

## Recommandation (resserrée suite à C1)

Le contrat et l'oracle ont maintenant traversé : 2 runs réels non-adversariaux,
3 sondes adversariales contrôlées, et un gate 4 indépendant qui a trouvé et fait
corriger un vrai bug mécanique. C'est un dossier solide pour un câblage dans
`dispatch.py` PROFILES — **mais** le point C1 reste vrai et non résolu : aucune
des vérifications faites à ce jour ne simule un agent **actively adversarial**
(un builder qui chercherait délibérément à tromper l'oracle, pas seulement à
bien faire face à un cas difficile). Recommandation : le câblage peut être
autorisé sur la base du dossier actuel **si** Pierre juge ce risque résiduel
acceptable pour une première mise en chaîne (le contrat reste, de toute façon,
un maillon parmi d'autres avec HumanGate terminal en aval) ; sinon, une 4e sonde
avec un agent explicitement instruit à *chercher à tromper l'oracle* fermerait
ce dernier point avant câblage. Décision = gate Pierre, pas une conclusion que
cet agent s'autorise à trancher seul.
