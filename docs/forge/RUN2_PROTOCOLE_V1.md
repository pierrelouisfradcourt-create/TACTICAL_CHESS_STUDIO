# RUN 2 — PROTOCOLE V1 (RATIFIÉ) — amendements issus de la paire pilote

Date : 2026-08-30 · Statut : **RATIFIÉ Pierre 2026-08-30** (sas de pré-enregistrement clos — A1-A7 outillés, grammaire D v2 ratifiée avec budget 72000). Base : `RUN2_PILOTE_PROTOCOLE_V0.md` (inchangé, archive du pilote) + les 5 observations
de `lab/forge_runs/p1_beta/ANALYSE_PAIRE_M1M7_20260830.md`. Périmètre : LE PROTOCOLE uniquement —
le moteur n'est amendé que par le sas R3/freeze déjà clos (C1/C2/C3, commit 6e5e7da).

## A1 — Validité de paire : charter matérialisé exigé (observation n°4)

Un bras dont s0 ne matérialise pas `charter.yaml` (fence ```yaml absent, reçu `written:false`)
est déclaré **invalide pour la paire AVANT de continuer** : contrôle protocolaire post-s0
obligatoire (lecture du reçu `yaml_check`) ; si absent → re-spawn s0 immédiat (ré-exécution
réelle) AVANT toute étape aval. On ne découvre plus à l'analyse qu'un bras n'a pas de charter.

## A2 — Masquage V2 (observation n°5a) — OUTILLÉ

Le masquage par mots-interdits ligne à ligne est REMPLACÉ par l'outil `forge.m7_masking`
(suppression de BLOCS structurés + `verify_masking` MÉCANIQUE : **aucune ligne portant une
valeur numérique de gameplay ne peut disparaître** sans exception justifiée au rapport ; la CLI
refuse — exit 1 — un masquage en violation). Cas de non-régression encodé en test : la ligne
`gain_clic: 1` du pilote SURVIT au masquage V2. Les artefacts de masquage restent consignés.

## A3 — M7 en deux temps (observation n°5b)

- **M7(a) « envie de jouer »** : posée sur les artefacts POST-conception masqués
  (gm_worldscan + product_snapshot) — les deux bras y ont un jeu concret ; l'asymétrie
  constitutive du charter délégant disparaît.
- **`product_snapshot.md` = artefact EXIGIBLE des DEUX bras** : produit par le matérialiseur
  de s1-prisme (`_MARKDOWN_BY_STEP`, mécanisme existant). Condition de VALIDITÉ de paire :
  les deux bras franchissent le freeze et matérialisent leur product_snapshot — un bras qui
  ne l'atteint pas rend M7(a) impossible et la paire INVALIDE pour M7(a) (constat du pilote :
  D1 arrêté avant s1 n'en avait pas).
- **M7(b) « ratifiable tel quel »** : reste posée sur les charters s0 (elle juge l'instrument).
- Caveat d'auto-préférence : consigné d'office quand le juge est aussi le ratifieur de la
  grammaire imposée du bras D.

## A4 — Attribution d'origine des défauts (observation n°5c)

Les comptes M1/M1'/M4 restent produits en aveugle, puis, à l'attribution, chaque défaut est
classé par ORIGINE : `{entrée imposée (grammaire ratifiée), s0, aval}` — la grille mesure sans
égard pour l'auteur (le pilote a détecté 3 défauts réels de la grammaire ratifiée : mapping
coûts↔améliorations absent · tick_rate jamais fixé · R-entier vs production 0.1/s sans règle
d'arrondi). Corollaire MATÉRIALISÉ : la grammaire corrigée existe —
`lab/forge_briefs/p1_alpha/structure_imposee_v2.yaml` (mapping explicite des 6
améliorations avec coûts/disponibilité/dépendance · `tick_ms: 100` + `budget_ticks_mesure: 72000` (ratifié)
· comptabilité en milli-R ENTIERS rendant l'invariant exact par construction · disponibilité des
améliorations de clic précisée). **Ses valeurs exigent la ratification Pierre au
pré-enregistrement** — la V1 du pilote (`structure_imposee.yaml`) reste archive inchangée.

## A5 — Checklist de pré-enregistrement des grandeurs de mesure (convergence inter-lentilles)

Toute grandeur citée par un critère de succès/démo (ex. « budget de ticks fixe ») doit être,
au pré-enregistrement : soit CHIFFRÉE, soit EXPLICITEMENT déléguée avec destinataire nommé.
Une grandeur orpheline (citée, ni chiffrée ni déléguée) = brief refusé au sas. (Cas L1 :
« budget de ticks » cité par 3 critères, orphelin — pointé par les deux revues.)

## A6 — M2 raffinée (mesure du pilote)

M2 distingue désormais deux comptes : **M2a** grandeurs inventées SILENCIEUSEMENT (le `lives=20`
du TD) et **M2b** grandeurs inventées sous DÉLÉGATION EXPLICITE du charter (le cas L1 : 8 valeurs,
délégation par design). Seul M2a est un défaut ; M2b mesure l'ampleur de la délégation. La trace
complète `gm_worldscan → code` des valeurs M2b entre au périmètre de la revue mécanique.

## A7 — Prérequis de paire BLOQUANTS (outillé)

Les gardes du sas R3/freeze (C1 cible déclarée · C2 micro-re-déclaration · C3
`modification_locus`/`aucune_requise`) sont des prérequis **BLOQUANTS** : **si l'une des trois
protections n'est pas disponible ET validée, la paire NE PEUT PAS démarrer.** Enforcement
mécanique : `python -m forge.pair_preflight --run-tests` (vérifie la présence réelle des trois
mécanismes dans le code ET exécute leurs suites dédiées ; exit ≠ 0 = lancement de paire interdit)
— à exécuter et joindre au dossier de paire AVANT tout lancement, au même titre que
`check_project_brief`.

## Inchangé (V0)

Variable unique (auteur de la structure) · slugs neutres + tirage scellé · lancement parallèle
strict, même HEAD · tripwire de contamination (avec enquête sur tout hit unique) · définitions
M1-M6 de la spec · aucune conclusion sous n<2 paires · NO_CLAIM_ALLOWED.

claim_verdict: NO_CLAIM_ALLOWED
