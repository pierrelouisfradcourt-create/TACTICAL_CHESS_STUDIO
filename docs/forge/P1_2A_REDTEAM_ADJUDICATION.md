# ADJUDICATION RED-TEAM — cadrage P1.2a « ftue-profile-eval » (ex-S10E) v2 → v3

- **Date** : 2026-07-12
- **Objet** : red-team du cadrage `S10E_CONTRACT_PROPOSAL.md` v2 (amendée Pierre),
  exécuté sur GO Pierre. Deux relecteurs indépendants (méthodologie F-M*, technique F-T*)
  — **16 findings, tous adjugés**. Le document corrigé : `P1_2A_FTUE_PROFILE_PROPOSAL.md`
  (v3 — renommé, cf. F-T7).
- **Gate suivant** : ratification Pierre du cadrage v3 (aucun protocole ni implémentation avant).

## Le nœud (F-M1 + F-M2 + F-M3 — SÉRIEUX, confirmés ensemble)

En v2, le même expérimentateur écrit le profil ET les sondes, alors que les valeurs B
saines des DEUX prototypes sont déjà publiées (`lab/forge_sensors/*/visual_mechanical.json`,
commit `3ac10cc`) : un SUCCESS était **constructible par co-écriture** (horizons encadrant
les mesures saines connues, défauts les dépassant) — et la sonde « contrôle exotique »,
négation littérale d'un datum du profil, ne testait que la plomberie. L'hypothèse n'était
pas falsifiable. C'est l'analogue exact du F-M1 de s10d, non reconduit.

**Corrections v3** (structure du cadrage, détail au protocole) :
1. préexistence des rapports sains DÉCLARÉE ;
2. profil dérivé et justifié ligne à ligne depuis la spec/design du prototype, **gelé
   AVANT la conception des sondes, sans consultation des rapports existants**
   (attestation d'ordre dans l'évidence) + **red-team dédié du profil** avant run
   (substitut au double-rédacteur, studio solo) ;
3. **≥1 sonde à défaut par prototype NON-inverse-littéral** d'un datum du profil
   (défaut de level-design/équilibrage — le défaut vit dans le jeu, pas dans le seuil) ;
4. les **deux échecs informatifs** énoncés au cadrage : (i) une sonde SAINE tire sous un
   profil honnêtement dérivé (le mode d'échec de P1) ; (ii) un défaut non-littéral n'est
   pas séparé.

## Autres sérieux

| # | Titre | Disposition | Correction v3 |
|---|---|---|---|
| F-M4 | Case arcade-sain absente (3/4 cases) ; « et/ou » = liste ouverte | **CONFIRMÉ** | Structure **fermée à 4 cases minimum** (défaut/sain × arcade/tactique), « et/ou » supprimé ; contenu exact figé au protocole |
| F-M5 / F-T1 | « Capteur figé, zéro diff » contradictoire avec E2 : toute sonde exige une entrée `CONFIGS` DANS `collect.mjs` (`:28-178`, précédent P1.1) | **CONFIRMÉ** | Gel **2 temps P1.1 reconduit** : `sensor.mjs`/`analysis.mjs` sha figés bout en bout ; `collect.mjs` = diff **additif CONFIGS uniquement**, consigné, `sha_post` = référence. « Zéro diff » retiré (F-M7) |
| F-M6 | « Hash canonique B inclus » contredit la micro-variance B actée (adjudication s10d, P1) | **CONFIRMÉ** | Hash côté B = **outcomes 3-états du profile_eval + `run.input_sequence`** (stables), JAMAIS les valeurs mesurées brutes ; chiffrage au protocole |
| F-T2 | « B émises brutes / HORS évaluation » : faux — B1/B2/B3 sont jugées à seuils fixes dans chaque rapport (`collect.mjs:334-345`) ; risque de DEUX verdicts B contradictoires | **CONFIRMÉ** | Reformulé : outcomes B du capteur = **documentaires genre-aveugles**, hors périmètre non-régression (`check.mjs:10`) ; le dépouilleur E2 les **IGNORE** (statut A6) ; l'évaluation faisant foi = profile_eval |
| F-T5 | L'alphabet du profil ne peut pas piloter le stimulus (alphabet câblé par config, `collect.mjs:40,159-160`) | **CONFIRMÉ** | Alphabet du profil = **descriptif**, vérifié mécaniquement ≡ `CONFIGS[jeu].input.alphabet` ET `run.input_sequence ⊆ alphabet` ; divergence = INVALIDE |
| F-T7 | Nom `s10e-player-test` pour un incrément SANS player (M4 = player agent, `FORGE_2_DESIGN.md:161-168`) ; contrat player ratifiable sans capacité player prouvée | **CONFIRMÉ** | Incrément renommé **P1.2a « ftue-profile-eval »** ; `s10e-player-test` **réservé** au vrai M4 (futur, hors périmètre) ; nom du futur contrat post-E2 = décision Pierre à la ratification (recommandation : `s10d-ftue-profile.yaml`, annexe sœur de s10d-oracle-visual) ; MAJ design §8 à la ratification |

## Mineurs

| # | Titre | Disposition | Correction v3 |
|---|---|---|---|
| F-M7 | « Non-régression triviale (zéro diff) » survend | **CONFIRMÉ** | « diff borné aux données CONFIGS, consigné et vérifié ; fixtures/p1 exit 0 aux bornes » |
| F-M8 | Unicité du profil non explicitée | **CONFIRMÉ** | « UN profil par prototype, identique pour toutes ses sondes, gelé avant construction » |
| F-M9 / F-T6 | Source des copies menagerie non pinnée ; worktree destructible référencé | **CONFIRMÉ** | Sondes E2 dans le **repo principal** `fixtures/e2/` (modèle `fixtures/p1/`), provenance = sha du commit source consigné, ports dédiés réservés |
| F-T3 | « B1-B4 » : seules 3 observations existent ; `steps_to_first_delta` niché dans `raw.ftue` de B2 (`collect.mjs:335`) ; pas de B4 | **CONFIRMÉ** | §1 corrigé : ids réels B1/B2/B3 + champ niché ; chemin de lecture à figer au protocole |
| F-T4 | La trace pas-à-pas n'est pas persistée (`collect.mjs:325-333`) : pas de métrique nouvelle sans re-run | **CONFIRMÉ** | Profils v0 **bornés aux 4 scalaires existants** — aucune métrique nouvelle en P1.2a |

## Prémisses vérifiées exactes (relecteur technique)

Les mesures B existent, pures et déterministes (`analysis.mjs:70-95`) · seuils fixes
genre-aveugles réels (le diagnostic §1 est fondé) · rejouabilité (seed + `input_sequence`
persistées) · `profile_eval.mjs` faisable en aval SANS relancer le jeu pour les 4 scalaires ·
sondes « contrôle exotique » et « récompense inatteignable » faisables sans changer le
stimulus (B2 null → `signal_detected` déjà géré `collect.mjs:388-394`) · menagerie déjà
pilotable (config clic 64 cellules) · doctrine respectée (aucun LLM, aucun gating, zone
tests intacte, 3 états reconduits).

## Bilan

16 findings : **16 confirmés (dont 2 partiellement terminologiques) → corrigés en v3** ;
0 écarté sans preuve. Le cadrage v2 était architecturalement sain (séparation
capteur/évaluation faisable sur le rapport actuel) mais expérimentalement piégé
(circularité) et porteur de 3 prémisses fausses. La v3 corrige la structure ; les seuils,
sondes et profils exacts restent à figer au protocole E2 (après ratification du cadrage).

```
software_verdict: (aucun — adjudication documentaire)
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED
```
