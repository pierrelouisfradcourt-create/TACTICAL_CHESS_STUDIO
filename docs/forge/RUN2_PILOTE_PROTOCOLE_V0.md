# RUN 2 — PAIRE PILOTE L/D — PROTOCOLE V0 (pré-enregistré)

Date : 2026-08-30 · Statut : décisions ratifiées Pierre 2026-08-30 (sas RUN 2 pilote) ·
Référence normative : `docs/forge/FORGE_DESIGN_FREEDOM_SPEC_V0.md` §design expérimental
(paires appariées, métriques M1-M7 — CITÉES, jamais recopiées ici).
**Aucun run n'est lancé par ce document — GO L1/D1 = sas distinct.**

## 1. Déclaration de portée (verrouillée)

UNE paire, déclarée **PILOTE** : elle vérifie que Libre vs Dirigé est **mesurable** avec la
chaîne actuelle (Briefs, contaminations, métriques, comparabilité). Elle ne prétend PAS
répondre à la question expérimentale complète — le critère de lecture de la spec exige ≥2
paires. Sortie du pilote : « protocole tient → paire 2 » ou « problème → sas correctif ».

## 2. La variable manipulée — UNE seule

**L'auteur de la structure** (boucles, ressources, actions, progression, déblocages, économie,
dimensionnement, fin). Distinction verrouillée par Pierre : D1 est dirigé par une **grammaire
structurelle proposée par Fable et ratifiée par Pierre** — ce n'est pas une « conception par
Pierre » au sens créatif ; la variable est l'auteur de la structure, **pas l'auteur de
l'univers**. Thème, personnages, DA, assets : **libres dans les DEUX bras.**

## 3. Les bras (tirage au sort effectué au sas, secrets.choice, 2026-08-30)

| Slug (neutre, non-signifiant — leçon contamination `chain_probe`) | Bras | Structure |
|---|---|---|
| `p1_alpha` | **D1 (dirigé)** | `lab/forge_briefs/p1_alpha/structure_imposee.yaml` (NORMATIF, valeurs détaillées ratifiées) |
| `p1_beta` | **L1 (libre)** | inventée par la chaîne |

Commun aux deux Briefs : genre incremental/clicker (fixé Pierre) · Cookie Clicker = grammaire
de genre jamais copie · fin observable requise · socle N1 · N1-N4+N7-N9 · mêmes critères de
chaîne (verdict signé, s11 indépendant, gates fiches 2/3/5) · profil `full_content` · même
`--step-timeout` · même HEAD git.

## 4. Dé-contamination (leçons RUN 1/TD, pré-enregistrées)

1. **Isolement L←D** : le Brief L1 interdit toute consultation de `p1_alpha/**`.
   **Tripwire mécanique post-hoc** : recherche des valeurs signatures de D1 dans TOUTES les
   sorties de L1 (charter, gm_worldscan, code) — valeurs signatures : `1.12`, `1100`, `12000`,
   `47`, `150000`, `30000`, `200000`, `1000000` (composite : ≥2 hits distinctifs = contamination
   présumée → enquête ; confirmée → **paire invalidée**). Les valeurs banales (100, 1000) ne
   déclenchent pas seules.
2. **Symétrie d'apprentissage** : lancement **PARALLÈLE STRICT** des deux runs (les deux
   pré-mortems lisent le MÊME état de leçons avant qu'aucun des deux ne promeuve les siennes).
   Jamais de séquentiel — sinon le 2e bras hérite des leçons du 1er.
3. **Même HEAD git** pour les deux lancements (enregistré au GO ; HEAD du sas : `3feb0e1`).
4. **Contamination assumée et symétrique** : la KB/les leçons du studio portent les patterns
   clicker de Kitten Clicker — reçue également par les deux bras, déclarée ici, pas découverte.
5. Slugs alpha/beta sans sémantique de jeu (le worldscan de `chain_probe` avait dérivé sur le slug).

## 5. Grille M1-M7 (figée AVANT tout run — pré-enregistrement de la spec)

Définitions : spec §métriques d'issue (M1 trous structurels · M2 quantités inventées en aval ·
M3 fidélité charter→build · M4 couverture preuve↔revendication · M5 qualité des fogs ·
M6 richesse décisionnelle · M7 jugement humain en aveugle). Opérationnalisation pilote :
- M1/M4/M5/M6 : revues par agents à **contexte propre** n'ayant vu ni les runs ni la section
  protocole de la spec (garde-fou de la spec) — un game-designer + un systems-designer par bras,
  même prompt pour les deux bras.
- M2/M3 : dénombrement par revue mécanique post-hoc (diff charter↔code ; N6 non mécanisée —
  mesure par revue, jamais présentée comme gate).
- M7 : Pierre lit les deux charters, **provenance masquée, étiquettes A/B mélangées par tirage
  enregistré**, et classe (envie de jouer · ratifiable tel quel). Donnée, pas oracle (FOG-4).
- Règle de variance (2026-07-21) : toute métrique à variance nulle sur la paire est requalifiée
  honnêtement, jamais présentée comme signal.

## 6. Budget et exécution (pour le GO, sas distinct)

Estimation : ~2 × 750k tokens (référence RUN 1). Pré-requis au GO : LM Studio UP (s11 des deux
bras) · oracles enregistrés (`p1_alpha`, `p1_beta`) · `games/p1_{alpha,beta}/` créés · Briefs
PASS `check_project_brief` (vérifié au sas). Lancements parallèles, mêmes flags.

claim_verdict: NO_CLAIM_ALLOWED
