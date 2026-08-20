# Audit interne — vers des micro-briques (fragments réutilisables)

> Tâche d'audit uniquement, aucun code écrit. Objectif : préparer la décision
> d'extraire mémoire/skill/plugin/rôle/objectif/garde-fou/modèle comme micro-briques
> réutilisables, au lieu de champs texte enfouis dans chaque fiche Agent.
> Date : 2026-07-02. Citations `fichier:ligne` à l'appui.

---

## 0. TL;DR

1. **Dans les données stockées aujourd'hui, la répétition est nulle — parce que les
   champs sont VIDES.** Les 5 fiches agent seedées ont `memoire/skill/plugin/objectif/
   gardeFou/modele = ""` (les 6 champs LLM), et `role` = l'`agent_id` (5 valeurs
   distinctes). Aucune fiche utilisateur supplémentaire n'existe. Il n'y a donc pas
   encore de matière empirique à dédupliquer.
2. **Le signal de répétition existe quand même — dans `ROLE_PRESETS`** (`builder.html:180-192`),
   la table de pré-remplissage des rôles Council. Là, `model` se répète déjà
   (« Claude Opus » ×2, deux variantes « qwen2.5-14b… ») et `temperature` massivement
   (0.2 ×4, 0.3 ×2, 0.4 ×2). C'est la meilleure preuve de ce qui se répétera une fois
   les fiches remplies.
3. **`ROLE_PRESETS` + `withRole()` EST déjà le pattern d'assemblage à réutiliser** — un
   preset applique {model, temperature, top_p, max_tokens} sur `node.data` ; une
   micro-brique ferait pareil au grain d'UN champ. Ne pas réinventer.
4. **Champ à granulariser en premier : `modèle`** (le plus répété, ensemble quasi-fermé,
   partagé par construction entre agents).
5. **Schéma : `kind: "fragment"` minimal `{text, fieldType}` suffit** — pas besoin d'un
   7ᵉ schéma riche.

---

## 1. État des données — combien de valeurs distinctes, quelle répétition ?

### 1.1 Les 5 fiches agent (seed `lab/agent_registry` → `library/agent-*-001.json`)

| Champ | Valeurs distinctes (5 fiches) | Répétition ? |
|---|---|---|
| `role` | 5 : `code`, `docs`, `producer`, `qa`, `review` | Aucune (1 par fiche, = agent_id) |
| `memoire` | 1 : `""` | 5× vide |
| `skill` | 1 : `""` | 5× vide |
| `plugin` | 1 : `""` | 5× vide |
| `objectif` | 1 : `""` | 5× vide |
| `gardeFou` | 1 : `""` | 5× vide |
| `modele` | 1 : `""` | 5× vide |

Source : `library/agent-code-001.json` … `agent-review-001.json` (payload) ; et le seed
qui laisse ces champs vides — `demo-server.ts` `seedLibraryIfEmpty()` (`payload.memoire=""`
… `modele=""`, `temperature/top_p/max_tokens=null`), le `role` recevant l'`agent_id`
(`demo-server.ts` seed, `payload.role: agentId`). Confirmé par lecture directe des 5 JSON.

**Constat honnête : 6 des 7 champs sont vides partout → 0 répétition mesurable.** La
`agent_registry` d'origine ne contient AUCUN de ces 7 champs LLM (elle porte de la
gouvernance : `role` descriptif, `autonomy_level`, `permissions`, `allowed_surfaces`,
`forbidden_surfaces` — `lab/agent_registry/code.agent.json:1-27`). Les 6 champs LLM ont
été *inventés* côté builder (`LLM_FIELDS`, `builder.html:473`) et laissés à remplir à la
main. Personne ne les a remplis → pas de données à auditer.

> Le champ descriptif `role` de l'`agent_registry` (« Bounded implementation from approved
> task packets », etc. — 5 valeurs distinctes) n'a PAS été mappé dans les fiches (le
> `payload.role` = slug `agent_id`). C'est de la matière « objectif/rôle » perdue,
> récupérable via `sourceRef`.

### 1.2 Le vrai signal : `ROLE_PRESETS` (`builder.html:180-192`)

C'est la seule table où des valeurs de ces champs coexistent réellement, donc où la
répétition est observable :

- **`model`** (`builder.html:182-191`) — 9 rôles, valeurs :
  `Claude Opus` **×2** (`claude-planner`, `claude-reviewer`), plus deux quasi-doublons
  sémantiques `qwen2.5-14b (:1234)` et `qwen2.5-14b-instruct`. → **le champ le plus
  répété**, et l'ensemble est petit et quasi-fermé (Claude / Qwen / Gemini / outils).
- **`temperature`** — `0.2` ×4, `0.3` ×2, `0.4` ×2 (`builder.html:182-191`). Répétition
  massive, mais `temperature` est un paramètre numérique, PAS l'un des 7 champs texte visés.
- Les autres champs (memoire/skill/plugin/objectif/gardeFou) n'ont pas d'équivalent dans
  ROLE_PRESETS → aucune preuve de répétition, mais aussi aucune preuve du contraire.

---

## 2. `ROLE_PRESETS` — pattern déjà présent, à réutiliser ?

**Oui, sans réserve.** `ROLE_PRESETS` (`builder.html:180`) est une table `role → {model,
temperature, top_p, max_tokens, color}`, et `withRole(data, role)` (`builder.html:197`)
applique le preset choisi sur un `node.data` (écrit model/temp/top_p/max_tokens, préserve
le reste). C'est **exactement** le mécanisme « piocher une valeur pré-existante → remplir
les champs », mais au grain d'un *bundle de rôle*.

Une micro-brique ferait la même chose au grain d'UN champ :
- `ROLE_PRESETS` = preset multi-champs (bundle) ; `withRole` = « appliquer le bundle ».
- Fragment `kind:"fragment"` = preset mono-champ ; « appliquer le fragment » = écrire son
  `text` dans le champ ciblé.

→ **Réutiliser le pattern `withRole` (pick → patch data), pas en réinventer un.** L'éditeur
Agent utilise déjà ce pattern via le dropdown `agent-role` (`builder.html`, inspecteur agent).
Les micro-briques en sont la version fine.

Le kind `prompt` (Passe 2) montre aussi le pattern « pioche OU texte libre » côté catégorie
via `<datalist>` (`lib-cat-dl`) : input libre + suggestions. Les fragments pourraient
combiner les deux (dropdown de fragments + saisie libre).

---

## 3. Recommandations

### 3.1 Ordre de granularisation

1. **`modèle` d'abord.** C'est le champ le plus répété (preuve : ROLE_PRESETS), l'ensemble
   est petit et quasi-fermé (une poignée de modèles réutilisés partout), et par nature
   plusieurs agents partagent le même modèle. Extraire `modèle` en fragments élimine la
   ressaisie et les fautes de frappe (« Claude Opus » vs « claude-opus » vs « Claude-Opus »
   — déjà 2 orthographes de Qwen dans ROLE_PRESETS).
2. **`garde-fou` et `rôle` ensuite** — champs de gouvernance/cadre, susceptibles d'être
   partagés (« ne jamais merger », « pas d'auto-claim »… cf. la doctrine
   `forbidden_surfaces` de l'agent_registry, `code.agent.json:19-26`).
3. **`objectif`** (récupérable en partie du `role` descriptif de l'agent_registry).
4. **`memoire` / `skill` / `plugin`** en dernier — plus bespoke, moins de répétition attendue.

### 3.2 Schéma de la micro-brique

**`kind: "fragment"` avec `payload {text, fieldType}` suffit** — pas de 7ᵉ schéma riche.
```json
{ "id":"fragment-modele-opus", "kind":"fragment", "name":"Claude Opus", "maturity":"draft",
  "badge":"demo", "payload": { "text":"claude-opus", "fieldType":"modele" }, "created":"…", "updated":"…" }
```
- `fieldType ∈ {"memoire","skill","plugin","role","objectif","gardeFou","modele"}` — aligne
  exactement sur `LLM_FIELDS` (`builder.html:473`) / `LIB_LLM_FIELDS` (`builder.html:353`).
- L'enveloppe générique (Passe 1) accueille ce kind sans migration (déjà prouvé 6×). Le
  store, le filtre multi-kind, la duplication marchent tels quels.
- Un fragment n'a AUCUNE mécanique propre (comme Goal) — c'est du texte typé réutilisable.

### 3.3 Mécanisme d'assemblage minimal (prochaine passe)

Dans l'éditeur Agent, pour chacun des 7 champs : un affordance **« piocher un fragment ▾
OU texte libre »**, calqué sur deux patterns déjà présents :
- soit un `<datalist>` (comme `lib-cat-dl`, Passe 2) : input texte libre + suggestions
  issues des fragments `fieldType===ce champ` ;
- soit un petit dropdown « fragment » à côté du champ (comme le dropdown goal par jalon,
  Passe 5) qui, à la sélection, écrit `fragment.text` dans le champ (= `withRole` au grain fin).

Le `<datalist>` est le plus léger et le plus « pioche OU tape » — recommandé pour la v1.
Sens inverse (bouton « extraire ce champ comme fragment ») : nice-to-have, hors v1.

---

## 4. Tension / honnêteté

Le bénéfice « immédiat » annoncé (dédupliquer des valeurs répétées) **n'est pas encore
matérialisé dans les données** : les 6 champs LLM sont vides partout, donc 0 doublon réel
aujourd'hui. La valeur de la granularisation est **prospective** (ROLE_PRESETS + le domaine
la rendent quasi-certaine dès que les fiches seront remplies), pas rétrospective. Deux
lectures possibles :

- **Pour** : mettre les fragments en place AVANT que les fiches se remplissent évite la
  dette (pas de ressaisie, orthographe canonique dès le départ). `modèle` justifie à lui
  seul l'effort minimal (`kind:"fragment"` + datalist).
- **Contre / prudence** : sans un seul agent réellement configuré, on optimise une
  répétition théorique. Un jalon raisonnable : granulariser **uniquement `modèle`** en v1
  (le seul avec une preuve de répétition via ROLE_PRESETS), observer l'usage, puis étendre.

Recommandation : **v1 = fragments `modèle` seulement, via `<datalist>` dans l'éditeur Agent**,
en réutilisant le pattern `withRole`/datalist. Étendre aux 6 autres champs seulement si
l'usage montre de la répétition réelle.

---

*Fin de l'audit — aucune modification de code.*
*software_verdict: N/A (audit) · evidence_verdict: MECHANICAL_VALIDATION_ONLY · claim_verdict: NO_CLAIM_ALLOWED*
