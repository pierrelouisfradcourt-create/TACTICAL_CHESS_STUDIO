# Findings de conception — sonde Tower Defense (résultats expérimentaux, PAS de la dette technique)

Date : 2026-08-29 · Source : audit de la conception s0 (revues indépendantes game-designer + systems-designer,
confrontées au charter par l'orchestrateur) · Statut : **OBSERVATIONS RATIFIÉES COMME RÉSULTATS D'EXPÉRIENCE
(décision Pierre 2026-08-29 : aucune correction de design dans ce run — corriger détruirait l'expérience
« laisse s0 concevoir librement et regarde ce qu'il produit »)**.

Expérience : s0 (Opus, contrat s0-contrat) a reçu genre + objectif expérimental + contraintes techniques +
observabilité, et AUCUN dimensionnement. Tout le bloc `conception:` du charter est de lui.

## Findings (conservés tels quels, non corrigés)

1. **Frost sans prédateur.** Aucun ennemi ne résiste au ralentissement → risque de duo dominant Gun+Frost.
   Angle mort méthodologique associé : le critère S10 ne teste la non-dominance qu'en **mono-tour**, jamais
   en duo — le test qui détecterait cette dominance n'existe pas dans les critères écrits par s0 lui-même.
2. **Parité anti-armure survendue.** Gun L3 percée ≈ 0,144-0,169 DPS/or contre Brute vs 0,09 pour Cannon
   (+60 à +90 %). Les « deux chemins gagnants en concurrence directe » ne sont pas à parité sur l'axe armure ;
   Cannon ne se justifie que par le splash.
3. **Scaling « +60 % de dégâts par niveau » ambigu** (linéaire 13,2 vs composé 15,36 pour Gun L3, écart ~16 %)
   → les « valeurs exactes figées en test doré » exigées par le charter sont non calculables en l'état.
   Finding de spécification — pas corrigé dans s0.
4. **`lives` de départ absent du charter** → S8/S9 (solvabilité positive/négative) invérifiables même en
   théorie ; le fog correspondant (FOG-6 manquant) n'a pas été vu par s0. Le builder a inventé `lives = 20`
   seul — ceci est un **défaut de production** (chaîne de build), traité séparément des findings de design.

Observations secondaires : la « boucle partie » est un cadre de score, pas une boucle (3 boucles décisionnelles
réelles + 1 conteneur) · le « plafond 30 » du bonus de tempo = exactement 2×15 s — un plafond qui ne mord
jamais · le bot naïf est proche d'un homme de paille (la preuve forte est S11, deux voies gagnantes) · la
divergence prouvée par 8 bots scriptés est construite, pas découverte.

Points forts confirmés (les deux revues convergent) : armure soustractive plate (favorise mécaniquement les
gros coups, évite le spam-annule-armure) · capacité débloquée au L3 (empêche « upgrader » d'être un calcul
trivial) · composition de vagues fixe comprise comme différence hasard/décision · hors_scope motivé (pas de
vente = placement irréversible) · murs V4 (armure) et V6 (vitesse) arithmétiquement plausibles comme points
de rupture distincts.

## Le méta-enseignement (le résultat le plus important du run)

> Quand on donne de la liberté au concepteur, il produit une structure raisonnable. Mais quand le même
> concepteur définit AUSSI les instruments qui doivent prouver la qualité de son système, **ses angles morts
> deviennent des angles morts de la preuve** (Frost sans prédateur → S10 mono-tour incapable de le voir).

Piste d'évolution Forge notée (décision future, non engagée) : séparer « s0 conçoit librement » de
« red-team/systems-designer casse les hypothèses de s0 » au lieu de laisser s0 écrire toute la vérité de son jeu.

---
claim_verdict: NO_CLAIM_ALLOWED (jugements de design advisory ; les calculs cités sont arithmétiques, vérifiables sur le charter)
