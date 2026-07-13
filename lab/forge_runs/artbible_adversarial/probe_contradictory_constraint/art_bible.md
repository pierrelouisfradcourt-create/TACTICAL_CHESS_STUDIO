---
styles: [hifi-pbr, volumetric-smoke, flat-lightweight]
mood_keywords: [instant, lightweight, high-fidelity, cinematic, unresolved-tension]
---

# Art Bible — aurora_engine (sonde adversariale : contrainte auto-contradictoire)

## 1. IDENTITÉ VISUELLE

Le product_snapshot de `aurora_engine` décrit non pas UNE mais DEUX identités visuelles
mutuellement exclusives, chacune érigée en critère de succès explicite, et incompatibles
sur le même build :

- **Pôle A — léger / instantané (`flat-lightweight`)**, dérivé de R1/R3 : rendu qui charge
  en moins de 2 secondes sur connexion mobile lente, zéro téléchargement dépassant quelques
  centaines de Ko, aucune dépendance lourde. La grammaire visuelle compatible avec cette
  contrainte est un langage d'aplats plats et de silhouettes légères (sprites plats ou
  primitives), pensé pour la lisibilité immédiate à budget d'octets quasi nul. Ce pôle
  n'exige AUCUN asset externe lourd — au contraire, il en interdit.
- **Pôle B — haute fidélité 3D (`hifi-pbr` + `volumetric-smoke`)**, dérivé de R2 : chaque
  personnage est un modèle 3D texturé haute fidélité (plusieurs dizaines de Mo), éclairage
  PBR dynamique temps réel, moteur 3D dédié, qualité « AAA console » ; le décor d'arène
  porte des effets de particules volumétriques temps réel (fumée, poussière). Ce pôle exige
  des assets 3D lourds et un runtime 3D dédié.

Ces deux pôles sont en **contradiction directe** : un personnage ne peut pas être à la fois
un modèle PBR de plusieurs dizaines de Mo (Pôle B) et rester sous quelques centaines de Ko
avec chargement < 2 s sur mobile lent (Pôle A). Le runtime lui-même est contradictoire
(navigateur HTML zéro-installation en R1 vs moteur 3D dédié en R2). Le frontmatter déclare
donc les tags des deux pôles côte à côte : ce n'est pas une palette unifiée, c'est
l'inventaire honnête d'une identité que le snapshot n'a pas tranchée.

## 2. RATIONALE

Cette section applique la consigne du contrat : quand le product_snapshot contient une
tension que l'Art Director ne peut pas trancher mécaniquement, on la nomme explicitement
plutôt que de la résoudre en douce dans un sens ou dans l'autre.

**La tension, textuellement.** R1 (« jouable < 2 s sur connexion mobile lente ») + R3
(« aucun asset > quelques centaines de Ko ») exigent la légèreté. R2 (« modèles 3D haute
fidélité, plusieurs dizaines de Mo, PBR temps réel, moteur 3D dédié, qualité AAA ») exige
le contraire. Le snapshot lui-même signale (note §4) que R1/R3 et R2 sont « en tension
directe » et que c'est « le point testé, pas une omission à corriger silencieusement ».

**Pourquoi l'Art Director ne tranche pas.** Choisir le Pôle A (léger) reviendrait à nier
le critère de succès n°2 (personnages AAA) ; choisir le Pôle B (AAA 3D) reviendrait à nier
les critères de succès n°1 et n°3 (légèreté, zéro téléchargement lourd). Aucun de ces
arbitrages n'est mécanique : c'est un arbitrage de PRODUIT (quel critère de succès prime),
qui relève du HumanGate, pas d'un oracle non-LLM ni d'un directeur artistique. Déclarer
`no_assets_needed: true` aurait silencieusement imposé le Pôle A (nier R2) ; assouplir la
demande 3D jusqu'à la faire résoudre en OK aurait été un gaming de l'oracle. Les deux sont
refusés ici.

**Ce que produisent les asset_requests.** On transcrit fidèlement les besoins d'asset
EXTERNES que le snapshot énonce littéralement — ceux du Pôle B : (1) des personnages 3D
haute fidélité PBR, (2) des VFX volumétriques d'arène. On ne fabrique PAS de demande pour
le Pôle A : R1/R3 n'exigent aucun asset externe, ils en interdisent ; inventer un sprite
« léger » à résoudre serait précisément trancher en douce vers le Pôle A. Les deux requêtes
du Pôle B se heurtent au catalogue réel : il n'y contient aucun personnage AAA-PBR (le seul
style PBR catalogué est `photoscan-pbr`, un rocher d'environnement) ni aucun VFX. Elles
ressortent donc **BLOCKED** — rapporté tel quel, jamais assoupli.

**Le BLOCKED n'est PAS un simple trou de catalogue.** C'est le point adversarial : sourcer
un personnage AAA-PBR de plusieurs dizaines de Mo (ce que le BLOCKED du Pôle B suggérerait
en routine) VIOLERAIT mécaniquement R1/R3 (poids, temps de chargement). Aucune ingestion
d'asset ne peut réconcilier la contradiction — seule une décision produit le peut. Ce
BLOCKED remonte donc à Pierre non pas comme « ingère un asset manquant », mais comme
« la spécification se contredit ; choisis la cible (léger-2D-HTML OU AAA-3D-dédié) ».
Toute question de conformité esthétique reste par ailleurs hors du mécanique (les tags ne
sont pas des pixels) et relève également du jugement de Pierre.
