---
styles: [flat-top-down]
mood_keywords: [arcade, lisible, immédiat, coloré, énergique, réactif]
---

# Art Bible — Collect Runner (s2.5)

## 1. IDENTITÉ VISUELLE

La direction artistique de Collect Runner vise une lisibilité arcade immédiate,
au service de la boucle de collecte et d'évitement. La palette est vive et
saturée, contrastée, pensée pour que chaque élément interactif se détache
instantanément du fond. Les formes sont simples, nettes, sans détail superflu :
le joueur doit lire la scène en une fraction de seconde pendant que le niveau
défile. Le style retenu est **flat-top-down** — des sprites plats, aux aplats de
couleur francs, sans ombrage complexe ni rendu volumétrique, cohérents entre eux
et faciles à instancier sur un canvas 2D web. Le mood est énergique et réactif :
chaque pièce ramassée et chaque obstacle évité doit produire un retour visuel
clair et satisfaisant. L'ensemble compose une identité arcade rétro-moderne,
homogène, où rien ne parasite la lecture de la trajectoire.

## 2. RATIONALE

Ce parti pris découle directement du product_snapshot : un jeu 2D web (canvas
HTML5), arcade, où le joueur gère sa trajectoire (gauche/droite/saut) pendant que
le niveau défile automatiquement. La lisibilité prime sur le réalisme : la
sanction au contact d'un obstacle doit être « claire et immédiate » (snapshot,
section Ressent), donc les éléments doivent être distinguables au premier coup
d'œil — d'où les aplats francs et le fort contraste. Le style **flat-top-down**
donne des sprites légers (aplats, pas de PBR), parfaitement adaptés à un runtime
`html`/canvas et à une génération de niveaux seedée où de nombreux éléments sont
instanciés. Le mood arcade renforce la satisfaction immédiate de la collecte
(compteur qui monte) et la tension courte de chaque approche d'obstacle.
L'ensemble des surfaces visuelles du jeu — personnage, pièces, obstacles, décor —
est couvert par les demandes d'asset ci-dessous, toutes ancrées sur ce style
unique pour garantir la cohérence visuelle globale.
