# CHARTER IMP-087 — Audit & Dossier chaîne de prompts idée→IMP
# Lane : SAFE_AUTO
# Fichiers autorisés : lecture seule
# claim_verdict: NO_CLAIM_ALLOWED

## CONTEXTE
Le pipeline idée→IMP produit 9 IMPs bavards (formation, support,
déploiement) sur un projet SOLO-DEV. La chaîne de prompts n a pas
de rôles explicites, pas de contexte studio injecté, et plusieurs
zones d ombre. Ce charter produit la carte + le dossier de référence
pour calibrer la machine à 0 zones d ombre.

## LIVRABLE 1 — TABLE SYNTHÈSE

Pour chaque étape du pipeline _run_idea_pipeline() lire le code
réel (autopilot.py) et documenter :
| Étape | Modèle réel | Casquette actuelle | Contexte injecté | Éphémère ? |
Remplir depuis le code, pas depuis des suppositions.

## LIVRABLE 2 — CARTE ASCII DE LA CHAÎNE

Schéma exact : chaque étape, ce qui est transmis, les zones d ombre.
  [Idée : title + desc]
    ▼ ÉTAPE 1 — ROADMAP (Modèle: ?) (Casquette: ?)
      Reçoit / Prompt réel / Voit / Transmet / Perdu
    ▼ ÉTAPE 2 — REDTEAM ...
    ▼ ÉTAPE N — LEDGER
Marquer chaque trou avec : ZONE D OMBRE

## LIVRABLE 3 — DOSSIER : FICHE PAR POSTE

Pour chaque étape actuelle ET les postes recommandés :
  POSTE N — [NOM]
  Rôle actuel     : générique / ingénieur / auditeur
  Rôle cible      : casquette précise recommandée
  Modèle actuel   : Qwen2.5-14B / autre
  Modèle cible    : idem ou changer ?
  Température     : actuelle → recommandée
  Max tokens      : actuel → recommandé
  Contexte reçu   : ce qu il voit aujourd hui
  Contexte manq.  : ce qu il devrait voir
  Prompt actuel   : extrait réel du code
  Prompt cible    : version améliorée avec rôle + contraintes solo-dev
  Sortie actuelle : format
  Sortie cible    : format idéal
  Persisté ?      : oui (où) / non (perdu)
  Zone d ombre    : ce qu il ne voit pas

## LIVRABLE 4 — CALIBRATION GRANULARITÉ

Problème : "Mode éphémère" → 9 IMPs dont :
  "Former les utilisateurs" — absurde pour solo-dev
  "Support utilisateur"     — absurde pour solo-dev
  "Déployer en production"  — hors scope studio

1. Quel prompt exact a produit ces IMPs ?
2. Quelles contraintes solo-dev manquent dans le prompt extract ?
3. Proposer le PROMPT EXTRACT CIBLE complet qui :
   - Interdit : formation, support, déploiement, chef de projet
   - Force : max 4 IMPs par idée
   - Force : chaque IMP = 1 fichier ou 1 fonction précise
   - Force : contexte studio solo-dev (1 dev, pas d équipe)
   - Inclut garde-fous stack (Rust/Python/LM Studio/Claude Code)

## LIVRABLE 5 — TON ANALYSE, CLAUDE CODE

1. Cette chaîne raisonne-t-elle ou enchaîne-t-elle des appels creux ?
   Combien d étapes ajoutent vraiment de la valeur ?
2. Quels rôles manquent ? Proposer architecture de casquettes :
   ex : Architecte → Avocat du diable → Arbitre → Découpeur
3. Mode éphémère : qu est-ce qui devrait être persisté ?
   FUSION_LOG existe mais est-il relu par les étapes suivantes ?
4. Top 3 améliorations prioritaires pour IMPs exploitables, sans bruit.
5. Si tu refaisais la chaîne depuis zéro pour un studio solo-dev
   avec Qwen2.5-14B, quelles seraient les 3-5 étapes et leurs rôles ?

## RAPPORT FINAL
Structure : table synthèse / carte ASCII / dossier fiches /
prompt extract cible complet / analyse + top 3 + architecture idéale.
NE PAS IMPLÉMENTER — cartographie + dossier + reco uniquement.
Ce document devient la référence pour calibrer la chaîne.

software_verdict: OK
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED
