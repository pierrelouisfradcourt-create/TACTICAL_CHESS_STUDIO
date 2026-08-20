# RAPPORT DE DÉCISION — Audit d'allègement et de réalignement de production

Date : 2026-07-27 · Auteur : session Troisième Cerveau (synthèse) · Statut : **PROPOSÉ — chaque
décision appartient à Pierre**. Sources : 3 audits sous contrat rendus le jour même, chacun
contre-vérifié par la supervision sur sources primaires (P7) :
- [A1 — chaîne et classification](AUDIT_ALLEGEMENT_A1_CHAINE_2026-07-27.md)
- [B1 — valeur réelle des tests](AUDIT_ALLEGEMENT_B1_TESTS_2026-07-27.md)
- [C1 — oracle produit et colis Godot](AUDIT_ALLEGEMENT_C1_ORACLE_PRODUIT_2026-07-27.md)

`software_verdict` (complétude de l'audit) : OK · `evidence_verdict: MECHANICAL_VALIDATION_ONLY`
· `claim_verdict: NO_CLAIM_ALLOWED`.

---

## 0. Diagnostic central (une phrase)

L'usine prouve la **mécanique** et ne prouve jamais le **produit** : toutes les preuves
s'arrêtent à la frontière de la présentation, par l'effet cumulé de décisions chacune
raisonnable isolément (e2e sauté au profil standard — ratifié 23-07 · s10d jamais branché ·
captures jamais appelées par un gate · gate mutation aveugle par effet de bord) — si bien
qu'aujourd'hui « verdict vert » et « jeu jouable » n'ont **aucun lien mécanique**. Le playtest
de Pierre du 27-07 est la démonstration au niveau produit du mode de panne documenté du
studio (« déclaré ≠ exécuté », « mécaniquement OK, visuellement mort »).

Preuves d'appui (contre-vérifiées) : mutation 58/61 (95 %) sur la logique vs **0/65** sur les
7 adaptateurs que les tests n'importent jamais · le jeu navigateur n'avait **jamais booté**
avant le 26-07 au soir (2 bugs de chargement, invisibles pour les 50 tests) · `main.gd` Godot
dessine UN état figé et quitte (pas un jeu) · aucun export template/preset Godot sur le poste.

---

## 1. CE QUI DOIT ÊTRE CONSERVÉ

| Élément | Pourquoi (lié au colis) |
|---|---|
| Logique pure `05_SYSTEMS/` + ses ~50 tests comportementaux | Cœur prouvé à 95 % de mutation — c'est la partie de l'usine qui marche. |
| Chaîne porte→contrat→driver→verdict signé→verify_run | Fiabilité de production éprouvée 7× le 26-07 (M1, s10s, V1-V4, pong_r2) ; c'est elle qui a permis CET audit. |
| Télémétrie d'échec (M1) + garde attempts (s10s) + séparation intégrité/verdict (V1) + dépositaire de briques (V4) | Instruments neufs, non commités — sans eux l'usine repart aveugle. |
| `capture_browser.mjs` / `capture_godot.mjs` / `raster.mjs` | **Fonctionnels, ré-exécutés en direct par C1** — ils sont le germe de l'oracle produit ; le défaut n'est pas l'outil, c'est l'absence de gate qui l'appelle. |
| Oracle solvabilité (bot) | À conserver **requalifié** : borne supérieure de performance (latence zéro) — il prouve « gagnable par un bot parfait », jamais « jouable par un humain » (B1). |
| Contrats d'agent + porte + audit HMAC | Le seul mécanisme anti-dérive qui ait tenu toute la journée (2 refus anti-replay corrects). |

## 2. CE QUI DOIT ÊTRE ALLÉGÉ

| Élément | Allègement proposé |
|---|---|
| **Gate mutation — périmètre** | Résout l'arbitrage ③ resté ouvert : mutation restreinte aux catégories `system` (où elle vaut 95 %) ; la couche présentation sort du gate mutation et entre dans l'**oracle produit** (captures + partie auto). C'est l'option C de l'analyse du 26-07 en version minimale : chaque couche jugée par l'instrument qui peut réellement la juger. |
| Critère pixel actuel (« deux captures différentes, non monochromes », `core_requirements.yaml`) | Trop faible pour valider une UX (A1 : c'est la cause racine du constat score/UX). Remplacé par les assertions de l'oracle produit (balle visible, score qui évolue, partie auto 10-30 s). |
| Red-team s11 au profil standard | ~2 $/run, findings jamais pliés dans le verdict (`redteam_advisory: []` alors que le rapport fait 14 Ko). Alléger = soit plier les findings (petit fix), soit le rendre conditionnel aux runs candidats à promotion. |
| Tests d'existence (4 cas identifiés nominativement par B1) | Remplacement par les 3 tests comportementaux chiffrés par B1 — pas de suppression sèche sans remplacement. |
| Double vérité de comptage (state.json vs télémétrie) | Déjà réduit par M1/s10s ; plus rien à construire ici — ne pas rouvrir. |

## 3. CE QUI DOIT ÊTRE SUPPRIMÉ (ou décidé comme tel)

| Élément | Motif |
|---|---|
| **La décision de saut e2e au profil standard** (driver.py:745-762, ratifiée 23-07) | C'est la cause racine commune des 4 constats playtest (A1). La donnée qui manquait alors existe maintenant : le saut a coûté un produit injouable non détecté. À remplacer par l'oracle produit — qui N'est PAS un harnais Playwright par jeu (l'inquiétude légitime de l'époque) mais le branchement des captures existantes + bot de partie auto. |
| Installation Playwright pour cette lane | Hors cible : les captures déterministes existantes + `node:test` suffisent à l'oracle produit v1 (C1). Playwright ne vit que dans llm-lego, l'y laisser. |
| Le « 46 % de mutation » comme chiffre de pilotage | Moyenne de deux populations incomparables (95 % / 0 %) — la règle de variance interdit de piloter sur ce chiffre. Les rapports doivent séparer les deux. |
| Fog périmé de la wiremap Pong (l.107 « Godot non ré-exécutable ») | Faux depuis le 27-07 02:04 (`godot.config.json` créé par la session godot_b0) — à mettre à jour, pas à croire. |

## 4. ÉCARTS WIREMAP ↔ RÉALITÉ

Les 4 constats playtest, tracés (A1, contre-vérifiés) :

| Constat Pierre | Cause | Nature |
|---|---|---|
| Bouton quitter inerte | `exit.mjs` → `window.close()`, ignoré par les navigateurs sur un onglet non ouvert par script ; la preuve wiremap `core.exit` ne teste que le chemin CLI Node (déjà signalé tautologique par le red-team F6) | **Spécifié-mais-faux** |
| Vitesse de balle injouable | `BALL_VX=3` ⇒ service→raquette en ~31 ticks (~0,52 s à 60 fps) ; la wiremap ne porte AUCUN critère de vitesse jouable (seulement anti-tunneling) | **Jamais spécifié** |
| Pas d'adversaire auto | Recherche négative exhaustive : aucune notion de CPU/solo dans tout `games/pong/` ; les « bots » sont des harnais de test internes | **Jamais spécifié** |
| Score/UX non validés | Score dessiné en pips (jamais en chiffres), 0/3 mutants tués sur ce dessin, aucun critère de lisibilité/écran de fin dans la wiremap | **Jamais spécifié + non testé** |
| (transverse) Boucle de partie pas démontrée | Aucune preuve de type « une partie complète se joue » hors bot interne ; e2e sauté au profil standard | **Cause racine commune** |

Écarts additionnels : `game_loop` promis au budget, non déposable tant que le reçu code est
FAIL (connecteur réparé par V4, attend un code vert) · adaptateurs dans `logic_files` par
effet de bord (2 filtres, jamais une décision) · les 2 fixes navigateur du 26-07 au soir
(audio.mjs/exit.mjs) NON COMMITÉS — sans eux, RIEN de ce qui précède n'est même observable ·
`main.gd` = renderer d'état figé : le « C+A » (règles + Godot) est aujourd'hui tenu pour la
CAPTURE, pas pour le JEU.

## 5. CHEMIN MINIMAL VERS UN VRAI COLIS GODOT

Définition falsifiable du colis (C1) : **un dossier/zip reproductible contenant un exécutable
Godot qui, sur une machine vierge, lance Pong jouable — avec sa preuve de livraison (hash du
colis + log de lancement auto + captures d'une partie auto)**.

Le chemin, ordonné — chaque phase a sa preuve de done :

| # | Phase | Contenu | Preuve de done | Coût estimé |
|---|---|---|---|---|
| 0 | **Décisions Pierre** (bloquantes, gratuites) | D-A remplacer le saut e2e par l'oracle produit · D-B périmètre mutation par catégorie (③) · D-C cible du colis V1 (voir fourche ci-dessous) · D-D go téléchargement export templates Godot (~1 Go, action externe) · D-E go passe de SPÉCIFICATION jouabilité | décisions au decision-log | 0 |
| 1 | **Spécification** (le cycle cible commence ici) | La wiremap Pong gagne les lignes manquantes : adversaire auto (1 joueur) · bande de vitesse jouable · quitter fonctionnel (comportement défini par runtime) · score lisible en chiffres · écran de fin/rejouer | wiremap re-gelée, oracle s10s « au gel » vert | ½ j-session |
| 2 | **Production** | Run Forge (pong_r3) sous standard avec les nouvelles lignes + les 2 fixes navigateur commités | verdict signé ; budget vert (game_loop déposable par V4) | 1 run (~15 $) |
| 3 | **Oracle produit branché en gate** | Partie auto 10-30 s + captures + logs, exécutée par le driver (browser d'abord ; Godot via fenêtre GPU du poste — contrainte prouvée) ; assertions : balle visible, déplacement, collisions, score qui évolue, zéro crash | reçu oracle produit signé dans le verdict | 2-4 j-session (C1) |
| 4 | **Runtime Godot réel** | La boucle de jeu tourne DANS Godot (aujourd'hui : renderer figé). Deux voies : porter la logique en GDScript sous parité prouvée (patron card_engine), ou embed JS. **Coordonner avec le chantier parallèle godot_b0 — ne pas dupliquer.** | partie auto jouée dans Godot, capturée | le gros morceau — à chiffrer avec godot_b0 |
| 5 | **Colis + preuve de livraison** | export_presets.cfg + templates (D-D) + build + zip + hash + script de lancement auto | colis ouvert sur machine vierge = jeu jouable | 2-3 j-session (C1) |

**Fourche D-C, à trancher honnêtement** : le colis **navigateur** reproductible (zip statique +
serveur local) est à ~90 % existant — seule la jouabilité (phase 1-2) manque. Le colis
**Godot** exige en plus la phase 4 (runtime réel). Options : (1) colis Godot direct — fidèle à
l'objectif énoncé, plus long ; (2) colis navigateur en V1 comme preuve de boucle fermée, Godot
en V2 porté par godot_b0. La recommandation du troisième cerveau est (2) — fermer la boucle
`spécification → production → build → lancement auto → observation → preuve de livraison` UNE
fois sur le runtime le moins cher, puis la rejouer sur Godot — mais l'objectif est le tien,
pas le mien.

## 6. Audit des tests — réponses aux 3 questions (B1, détail nominatif dans son rapport)

1. **Vraies régressions couvertes** : rebonds/score/fin de partie/anti-tunnel/fuzz 500
   entrées/solvabilité (jeu) · run E2E signé, falsification HMAC, fail-closed sécurité (studio).
2. **Existence seulement** : 4 cas côté jeu (nominatifs dans B1) — peu : la population Pong
   est majoritairement comportementale ; l'échantillon studio (29 % lu, méthode annoncée) est
   dominé par du comportemental, zéro tautologie trouvée.
3. **À remplacer par du comportemental** : 3 remplacements chiffrés + **5 tests manquants**
   rattachés un-à-un aux constats playtest (quitter réel en navigateur · bande de vitesse ·
   partie auto complète · score affiché == score d'état · boot navigateur sans erreur de
   chargement — ce dernier aurait attrapé les 2 bugs du 26-07).

Le vrai problème n'est **pas** un excès de tests inutiles (l'allègement en volume sera
modeste) : c'est un **déficit de tests produit** sur une couche entière. L'allègement porte
sur les gates (mutation hors présentation, critère pixel, e2e-skip), pas sur la masse de tests.

## 7. Ce que cet audit ne prouve pas (skipped_validation consolidé)

Playtest non rejoué manuellement par les agents (les constats Pierre sont pris comme faits
d'exécution — c'est leur statut) · 49/69 fichiers de tests studio non lus (extrapolation
annoncée) · gate mutation non relancé · chiffrage phase 4 dépendant du chantier godot_b0
(session parallèle, état réel non audité en profondeur) · désynchronisation `triaged_survivors`
signalée le 26-07, toujours non investiguée.
