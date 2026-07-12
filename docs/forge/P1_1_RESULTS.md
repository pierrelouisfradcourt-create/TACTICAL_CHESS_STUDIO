# RÉSULTATS — expérience P1.1 « sondes à défauts injectés »

- **Date d'exécution** : 2026-07-12
- **Protocole** : `P1_1_PROTOCOL.md` v2 (ratifié Pierre) — exécuté phases A→D sans déviation ; annexe d'adjudication `P1_1_REDTEAM_ADJUDICATION.md`
- **Verdict calculé mécaniquement (règles §5/§6 figées avant run)** :

```
experiment_outcome: SUCCESS
détections attendues : 4/4   (critère : ≥3/4)
faux positifs (périmètre A1/A2/A3/A5, 5 sondes) : 0   (critère : 0)
P0 vert prouvé : 5/5 (phase B, logs conservés)
gels re-vérifiés en phase D : capteur OK (3/3) · sondes INTACTES (65 fichiers, 0 divergence)
```

**Ce que l'expérience démontre (formulation ratifiée Pierre 2026-07-12)** : *au moins une famille de métriques mécaniques (A1/A2/A3/A5) est capable de détecter des défauts synthétiques connus, orthogonaux à P0, sur Breakout, sans faux positif observé dans cette expérience.* Rien de plus — et c'est déjà une affirmation solide.

Ce que cela ne démontre PAS (reconnu §8) : la généralisation à d'autres genres, la détection de défauts subtils, l'exhaustivité, l'absence de faux positifs à grande échelle.

Conséquence sur le gate de réouverture P1 : **le blocage méthodologique est levé** (il existe désormais une preuve expérimentale initiale là où il n'y en avait aucune) — la poursuite de P1 est justifiée. Décision d'ouverture : **prise par Pierre le 2026-07-12** — non parce que P1 est « validé », mais parce que le blocage est levé.

## Table attendu-vs-observé

| Sonde | Défaut (diff authentifié) | P0 | Attendu | Observé | Prédiction statique (phase A) |
|---|---|---|---|---|---|
| S1 `_probe_contrast` | HUD `#3a3a46` (2 décl. CSS) | PASS¹ | A1 sur ≥1 des 4 IDs HUD | **DÉTECTÉ** — les 4 IDs à **1.81** (<4.5) | 1.815 — exacte |
| S2 `_probe_tiny_target` | `#restart` padding 2/8, font 11 | PASS | A2 | **DÉTECTÉ** — min(w,h)=**16** (<24) | ~17.2 — cohérente |
| S3 `_probe_invisible` | 3 littéraux briques → `#101018` (bordure incluse) | PASS | A3 | **DÉTECTÉ** — densité **0.961** (>0.92) | 0.956 — modèle calibré confirmé |
| S4 `_probe_overflow` | `#stage` 1400px | PASS | A5 | **DÉTECTÉ** — débordement **250 px** (>0) | ~532 — voir note² |
| S5 `_probe_clean` | AUCUN | PASS | aucun signal périmètre | **0 signal périmètre** | 0 — exacte |

¹ S1 : premier run P0 rouge (e2e « paddle n'a pas bougé ») → **re-run technique documenté** (§4) : cause prouvée environnementale — défaut CSS-only sans chemin causal vers l'input, ET contrôle breakout ORIGINAL passé à l'instant même (`p0_controle_breakout_original.log`) → flake de démarrage à froid chromium. Re-run : PASS. Un seul re-run, consigné dans `p0__probe_contrast.log`.
² A5 mesuré 250 vs ~532 estimé : l'estimation ignorait le clamp de mise en page réel (scrollbar/flex). Sans incidence — le seuil est `>0`, la détection est franche.

Hors périmètre, documentaire (exclusions décidées AVANT le run, §5) : **A6 a tiré sur les 5 sondes** (0.0005 — y compris la sonde-contrôle, confirmant une fois de plus son invalidation P1) ; `A1_contrast:#overlayTitle` = `metric_unavailable` sur les 5 (élément masqué à la mesure — identique au jeu sain, compté à part).

## Preuves (toutes sous `lab/forge_sensors/`)

- `_p11_evidence/sha_capteur_pre_phaseA.txt` / `sha_capteur_post_phaseA.txt` — gel 2 temps ; `sensor.mjs`/`analysis.mjs` **inchangés de bout en bout** ; `collect.mjs` : `sha_post` re-vérifié OK en phase D.
- `_p11_evidence/diff_collect_phaseA.patch` — l'unique modification de code (98 lignes = 5 entrées CONFIGS), **authentifiée** : la version pré-phase-A reconstruite par retrait du bloc redonne exactement `sha_pre`. Tests cœur : 19/19 inchangés.
- `_p11_evidence/diffs_sondes_phaseA.txt` — diffs minimaux par sonde (2-3 lignes chacun, S5 vierge).
- `_p11_evidence/verifs_statiques_phaseA.txt` — cibles vérifiées par calcul pur (jamais le capteur).
- `_p11_evidence/p0__probe_*.log` + `p0_controle_breakout_original.log` — phase B séquentielle, exit 0 ×5.
- `_p11_evidence/sha_sondes_fin_phaseB.txt` — scellé des 65 fichiers de sondes (hors `e2e-shots/`, artefacts de sortie de phase B) ; **0 divergence** en phase D.
- `_probe_*/visual_mechanical.json` — les 5 rapports bruts (seed 1234 enregistrée, séquences rejouables).
- `_p11_evidence/depouille.mjs` + `depouille_sortie.txt` — dépouilleur déterministe (règles §5/§6 transcrites, zéro paramètre libre), rejouable.

## Ce que ce résultat prouve — et ne prouve pas (limites du protocole, reconduites)

- **Prouvé** : le capteur mécanique détecte des défauts **synthétiques et grossiers** de lisibilité orthogonaux à P0, sans bruit, reproductiblement. La base mécanique fournit un signal utile — la question expérimentale de la tranche P1 (restée ouverte après la falsification) est tranchée POSITIVEMENT pour la sous-base lisibilité.
- **Non prouvé** : la détection de défauts *subtils* sur de *vrais* jeux forgés ; la généralisation hors breakout/mono-genre ; tout ce qui touche au fun (FTUE genre-conscient = toujours ouvert, hors périmètre) ; A6 reste invalidée.

## Décisions en attente (Pierre)

1. **Ouverture P1** (le gate de réouverture est satisfait — c'est désormais une décision, plus un obstacle méthodologique). Candidat design doc : `s10d-oracle-visual` couche déterministe advisory, nourrie par ces 4 familles.
2. **Sort des sondes** `games/_probe_*` (jetables par contrat — suppression, ou conservation comme fixtures de non-régression du capteur ?) et des 5 entrées CONFIGS associées dans `collect.mjs` (liées aux sondes).
3. Commit/push de l'ensemble (chantier P0 + capteur + docs + évidences) — rien n'est commité.

## Rapport de charter

```
software_verdict: (aucun — expérience advisory, aucun verdict Forge produit ni modifié)
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED
advisory_only: true
experiment_outcome: SUCCESS (calculé mécaniquement, critères §6 branche nominale)
```
