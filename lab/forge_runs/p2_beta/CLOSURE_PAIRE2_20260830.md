# Clôture PAIRE 2 (p2_alpha=D2 · p2_beta=L2) — décisions Pierre 2026-08-30

Première paire VALIDE : deux chaînes 18/18, deux verdicts signés AUTHENTIQUES (verify_run), les
deux HumanGates ACCEPTÉS. Protocole : RUN2_PROTOCOLE_V1.md (ratifié). HEAD des lancements :
619b29c, parallèle strict, tirage scellé (lab/forge_briefs/PAIRE2_SEALED_assignment.json).

## HumanGates

- **D2 ACCEPTÉ** (verbatim Pierre) : « la contrainte normative 1.12 a traversé le worldscan ;
  le build contient 1.12 ×3 / 1.15 ×0 ; les coûts de base sont présents ; solvabilité/runtime
  et s11 franchis ; le théâtre initial a été attrapé puis corrigé par une vraie reprise gatée. »
- **L2 ACCEPTÉ** (décision antérieure conservée) : « expérimentalement valide, mais non conforme
  au Brief sur l'interdit numérique » — finding #6 conservé, jamais « la chaîne ne fonctionne pas ».

## Évidence préservée (JAMAIS nettoyée — décision Pierre explicite)

- **Historique D2** : HALT théâtre (prise VALIDE — justification pointant du contenu
  pré-existant) → infidélité ×1.15 vs 1.12 détectée → ronde re-jouée gatée (design_intent.md,
  faits bornés) → worldscan conforme (1.12 ×15 ; 1.15 requalifiés contexte externe sourcé) →
  freeze franchie → chaîne complète. + 1 rc=1 transitoire repris à s3.
- **Historique L2** : HALT R1-étendu (micro-re-déclaration C2 déclenchée mais tuée par rc=1
  transitoire — spawns HALTED puis OK tous deux tracés) → reprise → C2 exercée avec succès
  (première fois) → chaîne complète.
- **Finding #6 (L2)** : l'interdit CC-numérique du Brief est violé (économie = canon Cookie
  Clicker : ×1.15, 1100/8, 12000/47, worldscan citant CC) — interdit actuellement inapplicable /
  non gardé par un oracle. L2 conformité Brief = BLOCKED ; validité expérimentale = TESTED.
- **Asymétrie assets** : D2 = 0 resolved / 13 blocked-justifiés (gate légalement passée, jeu
  livré sans assets produits) vs L2 = 11 resolved / 2 blocked. **Mesure pour la grille, pas un
  verdict préalable** (décision Pierre).
- **Convergence ×1.15 des deux GM** (avant correction D2) : **hypothèse « attracteur
  canonique »** — signal, PAS une causalité démontrée (décision Pierre ; question ouverte :
  copie du canon vs saillance induite par notre représentation du genre).
- **Coûts** : D2 = 20 appels / 885 522 tokens · L2 = 18 appels / 828 348 tokens (~1,71 M la paire).

## Statuts (classement Pierre, verbatim)

| Surface | Statut |
|---|---|
| D2 chaîne / fidélité grammaire→build / HumanGate | TESTED |
| L2 chaîne / authenticité | TESTED |
| L2 conformité Brief | BLOCKED — finding #6 |
| Paire 2 | TESTED |
| M1-M7 sur paire 2 | UNKNOWN — analyse à produire (GO donné, protocole V1) |
| Conclusion comparative L/D | BLOCKED — une seule paire valide (règle ≥2 paires) |

claim_verdict: NO_CLAIM_ALLOWED

---

# ADDENDUM — REQUALIFICATION L2 (Pierre, 2026-09-01, finding n°7 établi)

**L2 = exécution authentique, mais expérimentalement INVALIDE pour le bras L2 tel que spécifié.**
L'entrée normative consommée par la chaîne était le MAUVAIS objet : `charter.yaml` matérialisé =
bloc RETURN LINEAGE (le « dernier bloc yaml » de s0), le vrai charter (1er bloc, l.5-80 de
l'artefact s0) jamais transmis ; `check_charter = FAIL` enregistré et resté advisory. Le
HUMANGATE_READY reste une preuve de fonctionnement de la chaîne sur son entrée effectivement
matérialisée — il ne certifie plus la validité de l'expérience L2 prévue.

Statuts L2 requalifiés (Pierre, verbatim) : exécution 18/18 TESTED · authenticité TESTED ·
HumanGate mécanique TESTED · expérience L2 conforme au charter prévu **BLOCKED** · M1 initial X
**BLOCKED** · M2a initial L2 **BLOCKED** · finding n°7 TESTED · données runtime L2 **PASSIVE**
pour la comparaison L/D. **La paire 2 n'est PAS encore la première paire valide** : D2 valide ·
L2 run authentique mais invalide expérimentalement · paire comparative BLOCKED.

Findings structurels enregistrés (AUCUN hotfix — défauts laissés observables) :
- **n°7** : la matérialisation autorise un bloc YAML valide mais sémantiquement faux à devenir
  charter.yaml ; yaml_check=FAIL advisory. Futur sas : check_charter FAIL = BLOQUANT avant
  consommation + suppression de l'ambiguïté « dernier bloc valide ».
- **n°8** : la grandeur « tick » n'est pas gardée au niveau où elle devient métrique comparative
  (D2 tick_ms=100 sourcé ; L2 boucle 16 ms non sourcée → 72000 ticks = ~2 h vs ~19 min).
- Faute d'exécution consignée (orchestrateur) : le contrôle A1 a vérifié l'existence du fichier,
  pas le reçu yaml_check que le protocole exigeait de lire.

**RÈGLE VERROUILLÉE (Pierre, 2026-09-01, verbatim)** : « Un verdict de chaîne ne peut jamais
promouvoir à lui seul une expérience en "valide". L'identité et la validité de l'input normatif
consommé doivent être établies indépendamment du verdict aval. »

Réparation ANALYTIQUE autorisée (jamais du run) : revues X ré-exécutées sur le vrai charter
extrait (`m7_blind_v2/L2_charter_vrai_extrait.yaml`, extraction déterministe l.6-79) + M2a-L2
recalculé avec cette source ; anciennes X-revues CONSERVÉES comme évidence du finding n°7.
M7 : BLOQUÉ jusqu'à consolidation (ordre : X-vrai → M2a corrigé → consolidation → M7(a) →
M7(b) → descellement → attribution).
