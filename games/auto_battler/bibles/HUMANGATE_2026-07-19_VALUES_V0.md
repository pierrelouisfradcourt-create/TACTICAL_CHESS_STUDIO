<!-- GATE HUMAIN — ratification de Pierre, collée en session le 2026-07-19. Décisions données en réponse directe aux questions posées par l'orchestrateur (AskUserQuestion), pas un pavé collé — verbatim des réponses conservé ci-dessous, jamais réécrit dans son sens. Source autoritaire pour params.v0.mjs et pour l'intégration future dans 02_CORE_RULES.md / 04_COMBAT_BIBLE.md (Paramètres). -->

## Réponses de Pierre (verbatim, 2026-07-19)

- **Board (dimensions/orientation, propriétaire Core Rules)** : « 8x8, symétrique (miroir) »
- **Retombée du Mana après Cast (propriétaire Combat Bible)** : « Retombe à zéro (Recommandé) » — confirme la proposition déjà écrite dans le corpus (`04_COMBAT_BIBLE.md`, Flux T9).
- **`tick_limit` (existence actée QB-14, valeur propriétaire Balance)** : « fait des calculs, regardes les standard battleground/tft » — Pierre délègue explicitement le calcul à une recherche sourcée, PAS un choix de design arbitraire de l'orchestrateur.

## Calcul délégué — `tick_limit` (sourcé, à confirmer)

**Recherche** (WebSearch, 2026-07-19) : Teamfight Tactics plafonne un Combat à **40 secondes réelles** (30 s de combat normal + 15 s de « URF Overtime » qui accélère le rythme en fin de combat pour forcer une issue) — [Teamfight Tactics (game) — League of Legends Wiki](https://leagueoflegends.fandom.com/wiki/Teamfight_Tactics_(game)). L'Attack Speed de base des unités TFT tourne le plus souvent autour de 0,6–0,8 attaque/seconde hors buffs — [Attack Speed — TFT | League of Legends Wiki](https://wiki.leagueoflegends.com/en-us/TFT:Attack_Speed).

**Traduction en `tick_limit`** — hypothèse explicite, pas une équivalence prouvée : le Tick de ce moteur est un pas de simulation discret (P1, `État(t)+Entrées(t)=État(t+1)`), sans durée réelle assignée — le temps réel par Tick est un choix RENDERER (P2), hors du moteur. En posant l'hypothèse de travail *1 Tick ≈ 1 fenêtre d'action globale ≈ ~0,8 s équivalent-TFT* (ordre de grandeur de l'attaque de base), 40 s ÷ 0,8 s ≈ **50 Ticks**.

**Valeur v0 proposée** : `tick_limit = 50`. **Statut : PROVISOIRE**, comme tout `params.v0.mjs` — l'hypothèse de correspondance Tick↔temps réel n'est PAS validée par un playtest, c'est un point de départ calibrable par Balance dès les premières simulations (P7 : Simulation Bible produit la connaissance advisory pour ajuster ce genre de valeur). Aucun claim de justesse.

## Traduction en contrat (par l'orchestrateur)

- `BOARD_WIDTH = 8`, `BOARD_HEIGHT = 8`, orientation symétrique miroir (chaque Player occupe une moitié) — propriétaire Core Rules.
- `MANA_FALLOFF_AFTER_CAST = "zero"` (retombe entièrement à zéro après un Cast) — propriétaire Combat Bible.
- `TICK_LIMIT = 50` — propriétaire Balance Bible, calcul sourcé TFT ci-dessus, **provisoire**.
- Ces trois valeurs vivent dans `games/auto_battler/params.v0.mjs`, marqué provisoire, **non importé par aucun code moteur existant** (engine-core reste content-agnostic, P11 — ces valeurs ne concernent que les incréments futurs Preparation/Combat).
