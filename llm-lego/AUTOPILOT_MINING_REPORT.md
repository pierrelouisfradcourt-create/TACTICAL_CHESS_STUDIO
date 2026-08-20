# Autopilot.py — Rapport de fouille

> **Note de correction (ajoutée le 2026-07-03, suite à META_AUDIT.md) :**
> Ce rapport centre le gisement de valeur sur `autopilot.py` seul (« LA séquence »,
> « à ne PAS réinventer — à importer »). Des audits ultérieurs
> (`LIBRARY_UX_IMPORT_AUDIT.md`, `ALL_CHAINS_AUDIT.md`) ont montré qu'`autopilot.py`
> n'est **qu'une source parmi (au moins) trois familles distinctes** de chaînes, et
> **pas la plus facile à exploiter** : le même pipeline idée→IMP existe déjà
> semi-structuré dans `lab/chains/prompt_chain_map.json`, et `lab/chains/` est le gros
> du gisement importable. Les citations `autopilot.py:ligne` de ce rapport restent
> exactes — il n'est pas *faux*, il est **sous-dimensionné en périmètre**. Ne pas le
> traiter comme la carte complète du gisement : voir `ALL_CHAINS_AUDIT.md` pour la vue
> élargie. Voir AUDIT_INDEX.md pour le contexte complet de cette tension.

> Passe **extraction de valeur uniquement**. Aucune ligne d'`autopilot.py` modifiée.
> Aucun fichier créé/modifié dans `llm-lego/` hors ce rapport. Citations
> `fichier:ligne` vérifiées de première main. Date : 2026-07-02.

**Note d'emblée sur le chemin :** le fichier existe bien à
`C:\TACTICAL_CHESS_STUDIO\autopilot.py` mais fait **9029 lignes** (pas 7871 comme
annoncé) — il a grossi depuis le dernier audit (dernière modif 2026-06-29). Aucune
ambiguïté sur l'identité du fichier ; c'est le bon monolithe.

---

## Méthode utilisée

1. **Passe de structure (ToC).** `grep "^class "` (2 classes : `Handler` l.7786,
   `ThreadingTCPServer` l.8971) + `grep "^def "` (78 fonctions top-level, listées
   l.154→8977). Constat : ~4875 lignes entre `_get_vision_state` (2911) et
   `class Handler` (7786) sont du **HTML/CSS/JS inline + dicts de config** (le front
   du studio), et le gros de la logique métier est concentré **entre les lignes 30
   et 2911** + les **handlers d'API dans `Handler`** (7786→8971).

2. **Recherche ciblée par mots-clés.** Grep sur : `Tu es|You are|system_prompt|
   role|redteam|reviewer|architecte|décomposeur|arbitre` (prompts/rôles) ;
   `LM_MODEL|temperature|max_tokens|TIMEOUT|:1234|:8765|model=` (config) ;
   `_CHARTER_*|_TOOL_PERMISSION_MATRIX|AUTOLOOP_LANES|_CHAIN_TOOL_MAP` (constantes).

3. **Lecture approfondie (zones denses).** Lues intégralement :
   - Config header (l.27-66), routing LM (l.393-542), lm_call.
   - **Le pipeline idée→IMP** `_run_idea_pipeline` (l.1411-1658) — cœur de la mine.
   - Générateurs de charter (l.1010-1086 Qwen, l.1141-1256 Claude) + constantes
     charter (l.963-1007).
   - Garde-fous (l.832-917) + helpers JSON/needs_human (l.1359-1408).
   - `_ceo_assign_lanes` (l.2580-2658).
   - Prompts serveur CEO/FusionAuditor (l.8540-8579, l.8820-8840) + prompts front
     (l.5557-5558, 5644-5645, 6254).

   **Survolées (scan seul, non lues en détail) :** tout le bloc HTML/JS du front
   (l.2911-7786, hors prompts extraits ci-dessus), les threads d'arrière-plan
   (`_diagnosis_thread` 1867, `_reflection_thread` 2064, `_report_watcher_thread`
   2077, `_provider_health_thread` 2294, `_studio_state_refresh_thread` 2878), le
   terminal WebSocket (l.208-372), et la classe `Handler` au-delà des prompts.

---

## Prompts trouvés

Tous les prompts « métier » sont **codés en dur** dans le script. Les plus riches :

### A. Les 4 rôles du pipeline idée→IMP (`_run_idea_pipeline`)
| Rôle | Ligne | max_tokens | Texte (incipit) | Pertinence |
|---|---|---|---|---|
| **Architecte solo-dev** | 1430-1436 | 500 | « Tu es architecte solo-dev du Tactical Chess Studio (1 seul développeur)… max 3 étapes, 1 fichier Rust/Python précis. INTERDIT : formation, support, déploiement… » | **Actuelle** — contraintes solo-dev toujours valides |
| **Avocat du diable (red team)** | 1453-1459 | 350 | « Tu es l'avocat du diable d'un studio solo-dev… max 3 risques TECHNIQUES concrets. INTERDIT : critiques organisationnelles… » | **Actuelle** |
| **Arbitre technique (fusion)** | 1477-1485 | 500 | « Tu es arbitre technique solo-dev. Ta mission : réaliser L'IDÉE HUMAINE en intégrant les critiques — pas fusionner deux textes machine… » | **Actuelle** |
| **Décomposeur IMP (extract)** | 1508-1546 | 900 | Prompt long : interdictions absolues, règles de granularité (MAX 4 IMPs, 1 fichier/1 fonction), contraintes stack, 4 domaines, schéma JSON de sortie complet, `claim_verdict` injecté | **Actuelle** — le plus élaboré ; sortie JSON structurée |

Chacun se termine par le garde-fou `_needs_human_prompt` (l.1419-1422) :
« Si l'idée est trop vague… retourne `{"needs_human": true, "reason": "…"}` ».

### B. Générateurs de charter
- **Charter Qwen** — `sys_prompt` l.1047-1052 + `user_prompt` l.1054-1081 : « Tu es
  générateur de charters… COMPLETS et EXÉCUTABLES — zéro contenu générique », avec
  one-shot injecté (`_CHARTER_ONE_SHOT`) et format imposé
  (CONTEXTE/OBJECTIF/SPEC/VALIDATION/RAPPORT FINAL). **Actuelle.**
- **Charter Claude** — `prompt_text` l.1196-1230 : même squelette + conventions
  studio explicites (claim_verdict, séparation des 3 verdicts, HumanGate décide le
  merge) + injection de code existant et d'IMPs CLOSED sur les fichiers. **Actuelle.**
- **Fallback extract Claude** — `_build_extract_prompt_for_claude` l.1397-1407.

### C. Prompts serveur (handlers)
- **CEO IA** — `system` l.8836-8838 + prompt JSON 5-lanes l.8822-8833 : « Tu es le
  CEO IA… analyses l'état du studio sur 5 lanes… retournes uniquement un JSON ».
  **Actuelle.**
- **FusionAuditor** — l.8544-8567 : mode `quick` (3 insights + action) et mode
  complet (4 fusions : IDEAS×LEDGER / ROADMAP×RÉALITÉ / ROI_CASCADE / REDTEAM).
  **Actuelle** mais couplé au front du studio.
- **Charter minimal local** — `_build_minimal_charter_local` l.919 (fallback offline).

### D. Prompts front (dans les strings HTML/JS)
- **Manager opérationnel** — l.5557-5558 : « Tu es le manager opérationnel… Rocky
  (Rust+neural+coach v0), 3 chaînes Kaizen, **Devstral 8t/s**… ».
  ⚠️ mentionne « Devstral » (voir §obsolète).
- **Architecte (priorisation ROI)** — l.5645 (dupliqué l.5665) : « …3 chaînes
  Kaizen, LM Studio local Devstral. **Issues HIGH : NEW-02/03/05**… ».
  ⚠️ refs d'issues **hardcodées et probablement périmées** (voir §obsolète).
- **Manager concis** — l.6254 : « Tu es le manager du Tactical Chess Studio. Sois
  concis. claim_verdict: NO_CLAIM_ALLOWED. »

---

## Rôles / Agents identifiés

| Rôle | Où | Fonction apparente |
|---|---|---|
| **architecte solo-dev** | prompt l.1430 | produit une roadmap bornée depuis une idée |
| **avocat du diable / red team** | prompt l.1453 | liste 3 risques techniques |
| **arbitre technique / fusion** | prompt l.1477 | fusionne roadmap+critiques en gardant l'intention |
| **décomposeur IMP / extract** | prompt l.1508 | produit un JSON array d'IMPs |
| **générateur de charters** | `_generate_charter_qwen` l.1010, `_generate_charter_claude` l.1141 | transforme un IMP en charter exécutable |
| **CEO IA / Director** | `/api/ceo-brief` l.8836 ; `_route_model` l.420 | analyse stratégique 5 lanes ; routage dual-modèle |
| **FusionAuditor** | l.8551 | 4 fusions d'audit croisé |
| **Manager opérationnel** (chat front) | l.5557, 6254 | assistant conversationnel studio |
| **worker Claude Code** (exécuteur) | `_generate_charter_claude` via `claude --print` l.1238 | exécution CLI sous-traitée |

Le routage de modèle par rôle est data-driven : `get_model_for_role("director")` /
`("ceo_brain")` (l.36-37, via `control_plane.registry`) + `_route_model` (l.420) →
Director (Qwen2.5-14B) par défaut, CEO (Qwen3.6-27B) pour `ceo_brief`/`fusion_deep`.

---

## Chaînes / séquences d'orchestration

### Chaîne 1 — Pipeline idée→IMP (LA séquence, `_run_idea_pipeline` l.1411-1658)
Séquence **linéaire à 5 étapes**, chacune conditionnée par un garde-fou needs_human :
```
ROADMAP (l.1429) → [needs_human?] → REDTEAM (l.1452) → [needs_human?]
→ FUSION (l.1476) → [needs_human?] → EXTRACT (l.1507, JSON) → [needs_human?]
→ DEDUP (l.1562, SequenceMatcher>0.70) → GHOST-FILE CHECK (l.1600)
→ STAGE (_stage_proposals l.1636 → ROADMAP_PROPOSALS.yaml)
```
À chaque étape : sortie d'une étape = entrée de la suivante (`roadmap` nourrit
`redteam`, les deux nourrissent `fusion`, etc.). C'est **exactement** une Chaîne
llm-lego (nœuds agent en série + branchements de sortie). Correspond au
`prompt_chain_map.json` déjà connu — mais ici c'est **l'implémentation réelle** avec
les prompts exacts, les `max_tokens`, et le staging.

### Chaîne 2 — Génération de charter (`api_generate_charter` l.1258)
```
charter existe ? → oui: lit fichier | non: _generate_charter_claude (l.1141)
  → claude --print (timeout 120s) → si vide/erreur: fallback _generate_charter_qwen (l.1010)
    → si LM indispo: fallback _build_minimal_charter_local (l.919)
```
Cascade de fallback à 3 niveaux (Claude → Qwen → template local). Pattern « escalade
descendante » réutilisable.

### Chaîne 3 — Auto-close depuis rapport (`_report_watcher_thread` l.2077 → `_auto_close_from_report` l.2099)
Un watcher surveille les rapports d'exécution et ferme les IMPs automatiquement.

### Séquences d'arrière-plan (threads)
`_diagnosis_thread` (l.1867, diagnostic services + IMPs bloqués → injecte des idées),
`_reflection_thread` (l.2064, IMPs fermés + coût 24h → rapport), `_provider_health_thread`
(l.2294), `_studio_state_refresh_thread` (l.2878). Orchestration périodique, pas des
chaînes LLM au sens llm-lego.

---

## Règles de garde-fou / validation candidates Oracle

Toutes **non-LLM** (déterministes) — exactement le profil « Oracle » de la doctrine TCS :

| Garde-fou | Ligne | Ce qu'il vérifie | → Oracle |
|---|---|---|---|
| `_check_needs_human` | 1375 | l'LM a-t-il signalé `needs_human:true` → stoppe la chaîne | Oracle « needs_human gate » |
| `_check_lane_guard` | 832 | lane ∈ {FORBIDDEN, HUMAN_REQUIRED} → blocage exécution serveur | Oracle/HumanGate « lane guard » |
| `_check_tool_permission` / `verify_tool_permission_matrix` | 843 / 857 | l'outil de la chaîne a un ALLOW dans `tool_permission_matrix` | Oracle « permission matrix » |
| `_check_smoke_level` | 863 | AUDIT_REQUIRED → `cargo check` doit passer (timeout 60s) avant autoloop | Oracle « smoke gate » (exécute un vrai check) |
| dedup titres | 1562-1597 | `SequenceMatcher > 0.70` vs IMPs CLOSED → exclut les doublons, journalise | Oracle « anti-doublon » |
| ghost-file check | 1599-1626 | fichiers cités par EXTRACT existent-ils dans le repo (`rglob`) ou la matrice | Oracle « fichiers réels » |
| `_extract_json_array` | 1359 | premier `[` qui parse en liste de dicts (tolère la prose Qwen) | parseur robuste (utilitaire) |

`_check_smoke_level` est notable : c'est un Oracle qui **exécute** `cargo check` — un
oracle non-LLM au sens strict de la doctrine (preuve mécanique).

---

## Paramètres / configuration récurrents

| Paramètre | Valeur | Lieux (signal de répétition) |
|---|---|---|
| **temperature** | `0.4` codée en dur | `lm_call` l.520 ET `lm_stream_to` l.621 (répété, jamais paramétrable per-call) |
| **modèles** | `LM_MODEL`=qwen2.5-14b (director), `LM_MODEL_CEO`=qwen3.6-27b (ceo_brain) | l.36-37, ré-exposés l.594-595, 2262-2263, 2854-2855, 8273-8292 |
| **endpoint LM** | `http://localhost:1234` + `/api/v1/chat` & `/v1/chat/completions` | l.35, 524-527 |
| **timeout LM** | `300s` (urlopen) | l.537 ; côté front `COUNCIL_TIMEOUT_MS=600000` l.4654 |
| **injection contexte système** | `04_STUDIO.md[:2000]` préfixé à tout system prompt | `build_system_prompt` l.393-406 |
| **claim_verdict** | `NO_CLAIM_ALLOWED` injecté partout | `_CLAIM_VERDICT` l.65, ré-injecté dans ~tous les prompts |
| **max_tokens par rôle** | roadmap 500 / redteam 350 / fusion 500 / extract 900 / charter 1500 / ceo 1200 | l.1437-1547, 1083, 8840 |
| **lanes** | `SAFE_AUTO/AUDIT_REQUIRED/HUMAN_REQUIRED/FORBIDDEN` | omniprésent |
| **stack-map par domaine** | `_CHARTER_STACK_MAP` (studio/rocky_moteur/ia_apprentissage/jeux) | l.963-968 |
| **validation par lane** | `_CHARTER_VALIDATION_BY_LANE` | l.970-975 |

Le trio `temperature 0.4 + modèle routé + build_system_prompt(04_STUDIO.md)` est le
« profil d'appel LM » répété partout → candidat évident à une brique de config
réutilisable.

---

## Ce qui est mort / obsolète (signalé, non creusé)

- **« Devstral »** — nickname du LM local dans plusieurs prompts/UI (l.5558, 5645,
  3483) alors que le modèle réel est **Qwen2.5-14B** (`get_model_for_role`). Nom
  historique périmé, pas un modèle réellement chargé.
- **« Issues HIGH : NEW-02/03/05 »** hardcodées dans le prompt architecte (l.5645 et
  son doublon l.5665) — refs d'issues figées, quasi-certainement périmées.
- **« autopilot.py (~5200 lignes) »** dans `_CHARTER_STACK_MAP` (l.964) — le fichier
  fait 9029 lignes. Indice de prompt obsolète (mineur, cosmétique).
- **Doublon de prompt** architecte l.5645 ≡ l.5665 (copié-collé).
- **Incohérence de routage** (signalée, non jugée) : le commentaire EXTRACT dit
  « model=CEO » (l.1499/1414) mais l'appel l.1507 ne passe pas `model=` et le mot
  « décomposeur » ne matche aucun mot-clé CEO/fusion dans `_infer_task_type`
  (l.410-417) → route en pratique vers Director (Qwen2.5). À vérifier si on
  reconstruit, pas à corriger ici.
- Les threads d'arrière-plan et le terminal WebSocket n'ont **pas** été audités pour
  obsolescence (survolés seulement) — ne pas conclure qu'ils sont vivants ou morts.

---

## Recommandation — top 5 pépites

1. **Le pipeline idée→IMP complet → `kind: "chain"`** (+ 4 `kind:"prompt"` + 4
   `kind:"agent"` + garde-fous en `kind:"oracle"`). *Valeur max.* C'est un système
   d'orchestration **réel, testé en production, années de calibrage** (IMP-089 tags
   partout). Les 4 prompts (l.1430/1453/1477/1508) sont directement des briques
   Prompt ; les 4 rôles des briques Agent ; le needs_human un Oracle. La Chaîne
   `roadmap→redteam→fusion→extract→stage` est le graphe. À ne PAS réinventer — à
   importer.
2. **Les 4 prompts de rôle solo-dev → `kind:"prompt"` ×4.** Même isolés de la
   chaîne, ce sont des prompts bien cadrés (contraintes solo-dev, interdictions,
   formats de sortie) réutilisables sur n'importe quel nœud agent. Le décomposeur
   (l.1508) inclut un schéma JSON de sortie complet — pépite pour un nœud à sortie
   structurée.
3. **Le générateur de charter → `kind:"agent"` + `kind:"prompt"`** avec ses annexes
   `_CHARTER_ONE_SHOT` (l.977, exemple one-shot), `_CHARTER_STACK_MAP` (l.963,
   contexte par lane) et `_CHARTER_VALIDATION_BY_LANE` (l.970). Un « agent qui
   transforme un IMP en charter exécutable » + sa config. Le one-shot est
   directement le corpus d'un prompt few-shot.
4. **La suite de garde-fous non-LLM → `kind:"oracle"` ×5-6.** `_check_needs_human`,
   `_check_lane_guard`, `_check_smoke_level` (exécute `cargo check`), dedup
   SequenceMatcher, ghost-file check. Ce sont des **oracles déterministes** — le
   type exact que la doctrine TCS réclame (preuve mécanique, pas LLM). Le smoke gate
   et le ghost-file check sont les plus originaux.
5. **Le profil d'appel LM (routage + config) → brique de config / `kind:"agent"`
   preset.** `_route_model` + `_infer_task_type` (dual-modèle Director/CEO) +
   `build_system_prompt` (injection `04_STUDIO.md[:2000]`) + temperature 0.4 +
   endpoints. C'est la « fiche modèle » réutilisable qui manque aujourd'hui aux
   fiches Agent (champ `modele`/`temperature` vides — cf. MICRO_BRICKS_AUDIT).

---

## Ce qui mériterait une passe de construction séparée

- **Reconstruire le pipeline idée→IMP comme Chaîne first-class dans llm-lego.**
  C'est un **système cohérent complet**, pas une brique isolée : 4 agents en série +
  4 prompts attachés + un Oracle needs_human répété à chaque étape + un staging
  final. Il existe déjà à deux endroits (implémentation `autopilot.py:1411` et carte
  `prompt_chain_map.json`) — le porter dans le builder donnerait le **premier
  exemple de Chaîne TCS-réelle** (là où « Council gate v1 » couvre le gate). Passe
  de construction dédiée recommandée, avec seed des 4 prompts et des 4 agents.
- **Le sous-système de génération de charter** (Chaîne 2 : cascade Claude→Qwen→local
  + one-shot + stack-map + validation-by-lane). Deuxième système cohérent, autonome,
  qui mérite sa propre passe (Agent « charter-generator » + Prompt few-shot +
  config par lane).
- **La cascade de fallback** (Claude→Qwen→template) est un **pattern d'orchestration
  générique** (escalade descendante sur échec/timeout) qu'on pourrait vouloir
  modéliser dans le moteur llm-lego — mais ça, c'est une question moteur, à évaluer
  séparément, pas une brique.

---

*Fin de la fouille — `autopilot.py` non modifié ; aucun code écrit dans `llm-lego/`.*
*software_verdict: OK (rapport produit) · evidence_verdict: MECHANICAL_VALIDATION_ONLY
(citations vérifiées ; zones survolées explicitement signalées) · claim_verdict: NO_CLAIM_ALLOWED*
