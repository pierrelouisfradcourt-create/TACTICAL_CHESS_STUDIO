# UX_PLAN — builder.html (6 items UX)

- **Handles (état actuel)** : 4 par nœud (top/bottom/left/right), ancrés en CSS aux bords
  de la div (`left/right:-8px`, top/bottom à `50%`), `onMouseDown=startDraw` fait déjà
  `stopPropagation`. MAIS `portFor()` (ancres SVG) utilise des dims FIXES
  (`NODE_W=172/NODE_H=70`, note 180/112) → un resize décalerait les edges des handles.
- **Inspecteur (structure)** : switch par `type` — panneau `agent` (role/model/temp/top_p/
  max_tokens, couvre gate v1 ET looped), panneau `note` (text), et un **catch-all JSON**
  pour tout le reste → `router` tombe dans le blob JSON générique (= bug Item 3).
- **Palette (structure)** : `.map` plat sur `NODE_TYPES` (llm/tool/agent/router/note),
  chaque bouton = `addNode(type)`. Pas de sous-menu, pas de subgraph.
- **Approche par item** :
  - **1 Resize** : `dimsOf(n)` lit `n.width/n.height` (fallback défauts) → utilisé par
    `portFor` (SVG) ET par le style inline de la div (les handles CSS suivent seuls).
    Poignée coin bas-droit (toujours visible, `stopPropagation`), état `resizing`,
    min 160×80, snap appliqué. Layout nœud → flex colonne pour que le body remplisse.
  - **2 Titre note inline** : ajoute `data.title` (défaut affiché), header = `<span>`
    éditable (dbl-clic / clic si sélectionné → `<input>` autofocus+select, Enter/blur
    commit, Escape annule, `mousedown` input `stopPropagation`). Champ titre aussi dans
    l'inspecteur note (même `data.title`) → synchro.
  - **3 Inspecteur router** : nouveau panneau `router` (path, defaultRoute, liste des
    edges sortants + condition éditable). Panneau agent gardé (affiche déjà le groupe
    v1/cible ; j'ajoute un badge groupe pour distinguer gate v1 vs looped).
  - **4 Palette structurée** : boutons explicites ordonnés. `LLM ▸` ouvre un dropdown
    (agent → mémoire/skill/plugin/rôle/objectif/garde-fou/modèle), chaque item pose un
    nœud LLM `data.outputKey=<champ>` + prompt suggéré. `Council ▸` ouvre un dropdown
    (Gate v1 — RÉEL / Looped — CIBLE, badges couleur distincts) → `addSubgraph(nodes,edges)`
    (ids remappés uniques, offset). Fermeture au clic extérieur.
  - **5 Midpoint handle (minimale)** : cercle au milieu de chaque edge, drag → stocke
    `edge.controlPoint={x,y}` ; `anchorsFor` utilise une quadratique `M p1 Q cp p2` si
    `controlPoint` défini, sinon calcul auto actuel. (Version avancée insertion nœud =
    non faite, documentée.)
  - **6 Handles visibilité/sécurité** : 6a — nœud dont un handle latéral tombe au bord du
    canvas (mesure `canvasW`) → handle grisé (opacity .2, non-interactif) + hint statut
    « nœud partiellement hors-canvas ». 6b — tous les handles (dont top/bottom) font déjà
    `stopPropagation` ; edge top→bottom → `from`/`to` non-null (vérifié+testé). 6c — resize
    ne change pas les ids → pas d'edge orphelin ; delete nettoie déjà.
- **Régression critique à garder verte** : double-run search/chat (routing réel).
