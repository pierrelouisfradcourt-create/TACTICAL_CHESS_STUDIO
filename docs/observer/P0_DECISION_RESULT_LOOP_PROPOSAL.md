# P0-2 — Decision Result Loop : proposition

*2026-08-02 · PROPOSED — propose-only strict, historique intact, prospectif uniquement*
*Fait d'appui : 39 décisions sur 49 sans aucune trace de résultat (mesuré par
l'Evidence Engine — le decision-log et les DR n'ont structurellement pas de champ résultat).*

## La boucle à fermer

```
Décision → Action → Résultat observé → Preuve → Lesson candidate
```

C'est le symétrique aval de Lessons→KB : l'amont apprend désormais (leçons →
catalogue, ratifié), l'aval décide sans jamais boucler. Une Forge qui apprend de
ses décisions exige que chaque décision NOUVELLE porte, dès sa naissance, ce qui
permettra de la juger.

## Le mécanisme (trois pièces, deux existent déjà)

1. **Format v2** — EXISTE : `observer.decision.v2` (8 champs : objectif, raison,
   source, action, resultat_attendu, resultat_observe, preuve, lesson_creee) +
   gabarit commenté + `lab/reports/observer/breakout_v2/DECISION_FORMAT_PROPOSED.md`.
   Règle dure : `resultat_attendu` obligatoire À LA DÉCISION (une décision sans
   critère de jugement est rejetée du format, comme une tâche planning sans
   preuve de fin) ; `resultat_observe`/`preuve`/`lesson_creee` remplis PLUS TARD.

2. **Détection et relance** — EXISTE : l'Evidence Engine distingue déjà v1_legacy
   / v2 dans le decision-log (détection par motifs « Résultat attendu : » etc.)
   et compte les « v2 sans resultat_observe depuis > 7 jours » (aujourd'hui 0,
   mécanique prouvée à vide). La cellule Accueil « À décider » peut porter le
   même compteur — une décision sans résultat devient VISIBLE, c'est l'objectif.

3. **Adoption par /gate** — MANQUE, et c'est l'objet de cette proposition :
   le skill `/gate` écrirait les futures entrées du decision-log au format v2
   (mêmes sections, champs résultat initialisés à `EN_ATTENTE` + date de revue).
   C'est une modification d'un skill studio → **ta ratification**. Alternative
   zéro-outillage : tu adoptes le gabarit à la main dans tes prochaines entrées ;
   l'Evidence Engine les détectera sans aucune modification nulle part.

## Contraintes tenues

- Historique : les 49 entrées existantes restent v1_legacy, jamais réécrites,
  jamais « complétées » rétroactivement — un résultat reconstruit après coup
  serait une fiction de plus, pas une preuve.
- La fermeture de boucle vers Lessons : quand `resultat_observe` contredit
  `resultat_attendu`, la ligne devient candidate naturelle à une leçon —
  l'Evidence Engine peut la SIGNALER (liste « écarts attendu/observé ») ; la
  création de la leçon reste le geste humain existant (candidate → validated).

## Consommateur · preuve · mesure de succès (règle des briques)

- Consommateurs : vue Evidence + Accueil (compteur), pré-mortem (via les leçons
  issues des écarts), toi (revue des décisions dues).
- Preuve d'existence : première entrée v2 réelle détectée par la moisson.
- Mesure de succès : le ratio « décisions sans résultat » DES NOUVELLES
  décisions tend vers 0 ; le stock legacy 39/49 reste constant et étiqueté —
  il mesure l'avant, pas un échec de la boucle.

**Arbitrage demandé** : adoption manuelle du gabarit / modification du skill
/gate (gate séparée) / les deux.
