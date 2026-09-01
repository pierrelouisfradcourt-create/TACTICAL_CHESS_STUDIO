# Analyse PAIRE 2 — CONSOLIDATION M1-M6 (2026-09-01) — M7 en attente de gate

Protocole : RUN2_PROTOCOLE_V1.md (ratifié). Réparation analytique exécutée sous les conditions
Pierre (2026-09-01) : extraction déterministe du vrai charter L2, masquage V2 vérifié (0
violation), mêmes prompts/relecteurs, AUCUNE modification du run. **On répare l'analyse, pas
l'expérience passée.**

## Les 5 séparations obligatoires (Pierre, verbatim)

1. **Anciennes revues X** (sur le charter mal matérialisé) → ÉVIDENCE du finding n°7,
   conservées, jamais écrasées. Valeur probante : les deux lentilles ont indépendamment détecté
   « ce n'est pas un charter » (7/7 invérifiable, validateur non exécuté, 8 feuilles ≠ 7).
2. **Nouvelles revues X** (sur `m7_blind_v2/L2_charter_vrai_extrait.yaml`, masqué V2) →
   mesures M1 RÉPARÉES : TESTED (arbitrage Pierre).
3. **Ancien M2a-L2** (source = faux charter) → INVALIDE/CONTAMINÉ, conservé comme trace.
4. **Nouveau M2a-L2** (source = vrai charter + game_master) → MESURE OFFICIELLE,
   contre-vérifiée par sondage (victoryTarget 5.0e6 : 0 occurrence amont ; base_cost 15 tracé
   gm:810).
5. **Le run L2 lui-même** → authentique mais **expérimentalement invalide** (requalification
   Pierre 2026-09-01, addendum au CLOSURE) — la réparation analytique ne le répare PAS.

## Grille consolidée M1-M6 (aucun claim L/D — paire comparative BLOCKED)

| Métrique | D2 (p2_alpha) | L2 (p2_beta, vrai charter) |
|---|---|---|
| M1 GD : trous design / preuve | 9 / — | 7 / 5 |
| M1' SD : défauts numériques | 14 | 14 |
| M2a | 0 | **20 constantes non sourcées par le charter ou game_master au point de décision mesuré** (l attribution d origine vient après — comptes d abord) |
| M2b déléguées-tracées | 6 | 4 |
| M3 fidélité | 9/9 fidèle, 0 divergence | **1/1 sur les contraintes effectivement fixées par le vrai charter L2** (unique grandeur : tickBudget 72000, borne de mesure — ratio NON comparable au 9/9 de D2) |
| M5 fogs présents / manquants | 3 (est.) / 6 | 4 / 5 |
| M6 boucles réelles / hors-scope défendables | — / 6 | 3 / 4 |

Convergences INTRA-BRAS (observations, jamais comparatives — règle Pierre) :
- D2 : la table des 6 améliorations référencée mais non incluse au charter (2 lentilles).
- L2 : critères non falsifiables par qualificatifs non chiffrés — « immédiat », « courte »,
  « compétent », « variance non triviale » (2 lentilles) ; ambiguïté ticks↔ms retrouvée
  indépendamment (rejoint le finding n°8).

## Contamination résiduelle : AUCUNE nouvelle détectée

La consolidation n'a pas révélé d'autre mesure contaminée par le finding n°7 : les revues Y
(D2) portaient sur le vrai charter D2 ; la mécanique D2 est indépendante ; M2b/mini-M3 L2
recalculés sur la bonne source. Restes contaminés = uniquement les éléments listés en (1) et
(3), conservés comme évidence.

## Statuts (arbitrage Pierre 2026-09-01)

| Surface | Statut |
|---|---|
| M1 X (nouvelles revues) | TESTED |
| M2a-L2 (recalcul) | TESTED — mesure officielle, contre-vérifiée par sondage |
| M2/M3 D2 | TESTED |
| M7 | **SAUTÉ définitivement pour cette paire** (décision Pierre 2026-09-01 — aveugle rompu) ; historique : l'aveugle est ROMPU (descellement prématuré par l'orchestrateur lors du diagnostic du finding n°7, consigné) : toute exécution M7 sera non-aveugle déclarée ou sautée, à la gate |
| Paire comparative L/D | BLOCKED |
| Findings 7-8 | observations du système expérimental — AUCUNE correction moteur/protocole dans cette paire |

claim_verdict: NO_CLAIM_ALLOWED

---

# ATTRIBUTION D'ORIGINE (2026-09-01, GO Pierre — comptes d'abord, attribution ensuite)

Classes : {GM, grammaire, protocole, oracle, pipeline, design} + {orchestrateur} (fautes
d'exécution du protocole, consignées sans complaisance). Une entrée = un défaut compté ou un
finding. AUCUNE lecture comparative L/D.

| Défaut / finding | Origine | Justification |
|---|---|---|
| Finding n°7 — charter.yaml = bloc RETURN LINEAGE, chaîne aval alimentée par le mauvais objet | **pipeline + oracle** | règle « dernier bloc yaml valide » (pipeline de matérialisation) × check_charter=FAIL resté advisory (oracle non gatant) |
| Contrôle A1 exécuté en existence-seule (reçu yaml_check non lu) | **orchestrateur** | le protocole exigeait la lecture du reçu ; faute d'exécution, pas de protocole |
| Descellement M7 prématuré (aveugle rompu) | **orchestrateur** | diagnostic d'urgence du finding 7 ; écart de procédure consigné |
| Finding n°8 — tick de mesure non gardé (L2 boucle 16 ms vs 100 ms spécifié) | **protocole + pipeline** | la constante de mesure était écrite au Brief mais gardée par aucun oracle ; le builder aval a fixé son propre pas sans trace |
| D2 : ×1.15 initial au worldscan (corrigé sous ronde gatée) | **GM** (+ hypothèse **grammaire-attracteur**, non causale) | déviation de l'agent vs structure ratifiée ; la convergence des 2 GM vers 1.15 reste une HYPOTHÈSE |
| D2 : théâtre — justification pointant du contenu pré-existant | **GM** | claim de modification non réalisé ; la garde a fonctionné |
| D2 charter : table des 6 améliorations référencée non incluse (défaut dominant, 2 lentilles) | **design** (rédaction s0-D2) | la grammaire la fournissait ; le charter a référencé au lieu d'inclure |
| D2 : 0/13 assets resolved (tous blocked-justifiés) | **design + pipeline** (mesure, pas verdict) | choix du builder D2, légal à la gate ; ampleur = donnée de grille |
| Grammaire v1 : 3 défauts (mapping absent, tick non fixé, R-entier vs 0.1) — corrigés en v2 | **grammaire** | défauts de l'entrée imposée, détectés par la revue (pilote) et fermés au pré-enregistrement |
| L2 : 20 constantes non sourcées au point de décision mesuré | **design (builder aval) + GM** (sous-spécification : game_master n'a fixé que 4 grandeurs) | le vrai charter déléguait explicitement ; la chaîne de provenance N2 s'est arrêtée au GM |
| L2 : qualificatifs non chiffrés (« immédiat », « courte », « compétent ») | **design** (rédaction s0-L2) | critères non falsifiables écrits par l'agent |
| L2 : « variance non triviale » sans seuil | **protocole** | formulation héritée du Brief/du protocole, non opérationnalisée par lui |
| L2 : finding #6 (économie = canon Cookie Clicker malgré l'interdit) | **design + protocole + oracle** | valeurs choisies par la chaîne ; interdit écrit au Brief mais gardé par aucun oracle ; hypothèse attracteur (non causale) |
| Ambiguïté ticks↔ms dans les charters (2 lentilles, 2 bras) | **protocole** | la sémantique du tick appartenait au protocole, jamais définie de façon opposable |

Synthèse d'attribution (comptage grossier, indicatif) : protocole/oracle/pipeline portent la
majorité des findings STRUCTURELS (7, 8, A1, #6-garde) ; les agents (GM/design) portent les
défauts de CONTENU (théâtre, table manquante, qualificatifs, 1.15 initial) ; la grammaire et
l'orchestrateur portent chacun leur part nommée. Le système expérimental s'est révélé plus
souvent en cause que les modèles — constat d'attribution, PAS une conclusion comparative.

claim_verdict: NO_CLAIM_ALLOWED (verrou maintenu APRÈS attribution — décision Pierre)
